const PDFDocument = require('pdfkit');
const SVGtoPDF   = require('svg-to-pdfkit');
const fontkit    = require('fontkit');
const sharp      = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAPER_FORMATS = {
  'A4-L': { w: 842,  h: 595  },
  'A4-P': { w: 595,  h: 842  },
  'A3-L': { w: 1191, h: 842  },
  'A3-P': { w: 842,  h: 1191 },
  'LT-L': { w: 792,  h: 612  },
  'LT-P': { w: 612,  h: 792  },
  'A5-L': { w: 595,  h: 420  },
  'A5-P': { w: 420,  h: 595  },
};

const CROP_MARGIN = 24;
const CROP_GAP    = 3;
const CROP_LEN    = 14;
const CROP_THICK  = 0.5;

// ── CMYK black for crop marks ─────────────────────────────────────────────────
function cmykBlack(doc) {
  try { doc.fillColor([0, 0, 0, 100]).strokeColor([0, 0, 0, 100]); }
  catch { doc.fillColor('black').strokeColor('black'); }
}

// ── Strip wrapping quotes from a font-family value ────────────────────────────
function normalizeFontFamily(raw) {
  return (raw ?? '').trim().replace(/^['"]|['"]$/g, '').trim();
}

// ── Fetch a font buffer from Google Fonts (WOFF2/TTF, latin subset) ───────────
const MODERN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchGoogleFontBuffer(family, weight = '400', style = 'normal') {
  try {
    const css2Url =
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}` +
      `:${style === 'italic' ? 'ital,' : ''}wght@${style === 'italic' ? '1,' : ''}${weight}&display=swap`;

    const css = await fetch(css2Url, { headers: { 'User-Agent': MODERN_UA } }).then(r => r.text());

    // Google Fonts returns one @font-face per unicode subset (WOFF2).
    // fontkit 2.x supports WOFF2 natively. Pick the /* latin */ block (last = latin).
    const urlRe = /url\(([^)]+\.(?:woff2?|ttf|otf)[^)]*)\)/gi;
    const urls  = [];
    let um;
    while ((um = urlRe.exec(css)) !== null) urls.push(um[1].replace(/['"]/g, ''));
    if (!urls.length) return null;

    // Prefer the URL that appears after the /* latin */ comment
    const latinIdx = css.lastIndexOf('/* latin */');
    let chosenUrl  = urls[urls.length - 1];
    if (latinIdx !== -1) {
      const m = css.slice(latinIdx).match(/url\(([^)]+\.(?:woff2?|ttf|otf)[^)]*)\)/i);
      if (m) chosenUrl = m[1].replace(/['"]/g, '');
    }

    const buf = await fetch(chosenUrl).then(r => r.arrayBuffer());
    return Buffer.from(buf);
  } catch {
    return null;
  }
}

// ── Extract all font families used in an SVG ──────────────────────────────────
function extractFontUsages(svgString) {
  const usages   = new Map();
  const GENERICS = new Set(['sans-serif','serif','monospace','cursive','fantasy','inherit','none','']);

  const addFamily = (raw) => {
    const name = normalizeFontFamily(raw);
    if (!name || GENERICS.has(name)) return;
    if (!usages.has(name)) usages.set(name, new Set());
  };

  const attrRe  = /font-family="([^"]*)"/g;
  const styleRe = /font-family\s*:\s*([^;'"<>]+)/g;
  let m;
  while ((m = attrRe.exec(svgString))  !== null) addFamily(m[1]);
  while ((m = styleRe.exec(svgString)) !== null) addFamily(m[1]);

  const hasBold   = /font-weight=['"]?(?:bold|700|800|900)['"]?/gi.test(svgString);
  const hasItalic = /font-style=['"]?italic['"]?/gi.test(svgString);
  for (const [, variants] of usages) {
    variants.add({ weight: '400', style: 'normal' });
    if (hasBold)   variants.add({ weight: '700', style: 'normal' });
    if (hasItalic) variants.add({ weight: '400', style: 'italic' });
  }
  return usages;
}

// ── Convert SVG <text> elements to <path> glyphs using fontkit ───────────────
// Each Fabric.js text object becomes pure vector paths — no font needed by SVGtoPDF.
function svgTextToPaths(svgString, fontBuffers) {
  const gRe = /(<g\s[^>]*transform="([^"]*)"[^>]*>)\s*(<text[\s\S]*?<\/text>)\s*(<\/g>)/g;

  return svgString.replace(gRe, (fullMatch, gOpen, _transform, textEl, gClose) => {
    const attr   = (n) => textEl.match(new RegExp(`\\b${n}="([^"]*)"`))?.[ 1] ?? null;
    const styleV = (p) => textEl.match(new RegExp(`\\b${p}\\s*:\\s*([^;'"<>]+)`))?.[ 1]?.trim() ?? null;

    const family     = normalizeFontFamily(attr('font-family') ?? '');
    const fontSize   = parseFloat(attr('font-size') ?? '12');
    const fontWeight = attr('font-weight') ?? 'normal';
    const fontStyle  = attr('font-style')  ?? 'normal';
    const fillRaw    = styleV('fill') ?? attr('fill') ?? 'rgb(0,0,0)';

    // Resolve fill to hex
    let fill = '#000000';
    if (fillRaw && fillRaw !== 'none') {
      const rgbM = fillRaw.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
      if (rgbM) fill = `#${(+rgbM[1]).toString(16).padStart(2,'0')}${(+rgbM[2]).toString(16).padStart(2,'0')}${(+rgbM[3]).toString(16).padStart(2,'0')}`;
      else if (fillRaw.startsWith('#')) fill = fillRaw;
    }

    // Find font buffer
    const isBold   = fontWeight === 'bold' || fontWeight === '700';
    const isItalic = fontStyle  === 'italic';
    const key = isBold ? `${family}-Bold` : isItalic ? `${family}-Italic` : family;
    const buf = fontBuffers[key] ?? fontBuffers[family];
    if (!buf) return fullMatch;

    let font;
    try {
      const raw = fontkit.create(buf);
      font = raw.fonts ? raw.fonts[0] : raw; // unwrap TTC collections
    } catch { return fullMatch; }

    // Generate one <path> element per tspan
    const paths   = [];
    const tspanRe = /<tspan([^>]*)>([\s\S]*?)<\/tspan>/g;
    let ts;
    while ((ts = tspanRe.exec(textEl)) !== null) {
      const ta      = ts[1];
      const content = ts[2].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").trim();
      if (!content) continue;

      const tX = parseFloat(ta.match(/\bx="([^"]*)"/)?.[1] ?? '0');
      const tY = parseFloat(ta.match(/\by="([^"]*)"/)?.[1] ?? '0');

      try {
        const run   = font.layout(content);
        const scale = fontSize / font.unitsPerEm;
        let cursorX = tX;

        for (const glyph of run.glyphs) {
          const d = glyph.path.toSVG();
          if (glyph.id !== 0 && d && d.length > 4) {
            // fontkit uses y-up; SVG uses y-down → negate y scale, translate to baseline
            paths.push(`<path d="${d}" transform="matrix(${scale},0,0,${-scale},${cursorX},${tY})" fill="${fill}"/>`);
          }
          cursorX += (glyph.advanceWidth ?? 0) * scale;
        }
      } catch { return fullMatch; }
    }

    return paths.length ? `${gOpen}\n${paths.join('\n')}\n${gClose}` : fullMatch;
  });
}

// ── Inline external images in SVG as base64 PNG data URIs ────────────────────
// Keeps images inside the SVG (preserving z-order and clipPath masks).
// Converts to PNG via sharp for PDFKit compatibility.
async function inlineExternalImages(svgString) {
  const hrefRe = /((?:xlink:href|href)=")(https?:\/\/[^"]+)(")/gi;

  const urls = new Set();
  let m;
  while ((m = hrefRe.exec(svgString)) !== null) urls.add(m[2]);
  hrefRe.lastIndex = 0;

  if (!urls.size) return svgString;

  const cache = {};
  await Promise.all([...urls].map(async (url) => {
    try {
      const res        = await fetch(url);
      const raw        = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') ?? '';
      const isSvg      = contentType.includes('svg') || /\.svg(\?|$)/i.test(url);

      if (isSvg) {
        // Keep SVG as vector — do NOT rasterize
        cache[url] = `data:image/svg+xml;base64,${raw.toString('base64')}`;
      } else {
        // Raster formats (JPEG, PNG, WebP…) → PNG for PDFKit compatibility
        const png = await sharp(raw).png().toBuffer();
        cache[url] = `data:image/png;base64,${png.toString('base64')}`;
      }
      console.log('[PDF] image inlined as', isSvg ? 'svg' : 'png', url.slice(0, 60));
    } catch (e) {
      console.error('[PDF] image inline failed:', url.slice(0, 80), e.message);
    }
  }));

  return svgString.replace(hrefRe, (_, before, url, after) =>
    cache[url] ? `${before}${cache[url]}${after}` : `${before}${url}${after}`
  );
}

// ── Main handler ──────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://tagprintly.com',
  'https://makertags.netlify.app',
  'http://localhost:4200',
  'http://localhost:8888',
]);

exports.handler = async (event, context) => {
  const requestOrigin = event.headers?.origin ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : 'https://app.gifttags.com';
  const headers = {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const body = JSON.parse(event.body);
    const { uid, svgUrl, dataURL, savePaper, size, canvasWidth, canvasHeight, marks, paperFormat } = body;
    let { svgData } = body;

    await supabase.auth.admin.getUserById(uid);

    // If the client uploaded the SVG to storage and sent a URL, fetch it here
    // to avoid Netlify's 6 MB request body limit for large canvases
    if (!svgData && svgUrl) {
      const res = await fetch(svgUrl);
      if (!res.ok) throw new Error(`Failed to fetch SVG from storage: ${res.status}`);
      svgData = await res.text();
    }

    const fmt    = PAPER_FORMATS[paperFormat] ?? PAPER_FORMATS['A4-L'];
    const PAGE_W = fmt.w;
    const PAGE_H = fmt.h;

    const svgNatW = Number((svgData?.match(/<svg[^>]*\s+width="(\d+\.?\d*)"/)?.[1])  ?? canvasWidth  ?? 200);
    const svgNatH = Number((svgData?.match(/<svg[^>]*\s+height="(\d+\.?\d*)"/)?.[1]) ?? canvasHeight ?? 400);

    const sizeParts = size ? size.split(/[^0-9.]+/).map(Number).filter(n => n > 0) : [];
    let trimW, trimH;
    if (sizeParts.length >= 2) {
      // size is in inches — convert to PDF points (1 inch = 72 pt)
      trimW = sizeParts[0] * 72;
      trimH = sizeParts[1] * 72;
    } else {
      // Fabric.js SVG is in 72-dpi canvas units = PDF points, no conversion needed
      trimW = svgNatW;
      trimH = svgNatH;
    }

    const availW     = PAGE_W - 2 * CROP_MARGIN;
    const availH     = PAGE_H - 2 * CROP_MARGIN;
    const positions  = savePaper
      ? packPositions(trimW, trimH, availW, availH)
      : [[CROP_MARGIN + (availW - trimW) / 2, CROP_MARGIN + (availH - trimH) / 2]];

    const pdfBytes = await new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({
        size: [PAGE_W, PAGE_H],
        autoFirstPage: true,
        margin: 0,
        info: { Producer: 'MakerTags PDF Engine', Creator: 'MakerTags' },
      });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (svgData) {
        // ── Vector path ───────────────────────────────────────────────────────
        // Fetch fonts for every family found in the SVG
        const fontBuffers = {};
        const fontUsages  = extractFontUsages(svgData);
        await Promise.all(
          [...fontUsages.entries()].flatMap(([family, variants]) =>
            [...variants].map(async ({ weight, style }) => {
              const suffix  = weight === '700' ? '-Bold' : style === 'italic' ? '-Italic' : '';
              const fontKey = `${family}${suffix}`;
              if (fontBuffers[fontKey]) return;
              const buf = await fetchGoogleFontBuffer(family, weight, style);
              if (buf) fontBuffers[fontKey] = buf;
            })
          )
        );

        // Inline external images as base64 PNG data URIs (preserves z-order + clipPath)
        const svgInlined   = await inlineExternalImages(svgData);

        // Convert <text> → <path> glyphs
        const svgWithPaths = svgTextToPaths(svgInlined, fontBuffers);
        const scaledSvg    = svgWithPaths
          .replace(/<\?xml[^?]*\?>\s*/gi, '')
          .replace(/<!DOCTYPE[^>[\]]*(\[[^\]]*\])?\s*>\s*/gi, '')
          .replace(/(<svg[^>]*\s)width="[^"]*"/,  `$1width="${trimW}"`)
          .replace(/(<svg[^>]*\s)height="[^"]*"/, `$1height="${trimH}"`);

        positions.forEach(([x, y]) => {
          const pdfkitY = PAGE_H - y - trimH;
          doc.save();
          doc.rect(x, pdfkitY, trimW, trimH).clip();
          try { SVGtoPDF(doc, scaledSvg, x, pdfkitY, { assumePt: true, precision: 3 }); }
          catch (e) { console.error('[PDF] SVGtoPDF error:', e.message); }
          doc.restore();
          if (marks) drawCropMarks(doc, x, y, trimW, trimH, PAGE_H);
        });

      } else {
        // ── Raster fallback (PNG export) ──────────────────────────────────────
        const imageBytes = await fetch(dataURL).then(r => r.arrayBuffer());
        positions.forEach(([x, y]) => {
          const pdfkitY = PAGE_H - y - trimH;
          doc.save();
          doc.rect(x, pdfkitY, trimW, trimH).clip();
          doc.image(Buffer.from(imageBytes), x, pdfkitY, { width: trimW, height: trimH });
          doc.restore();
          if (marks) drawCropMarks(doc, x, y, trimW, trimH, PAGE_H);
        });
      }

      doc.end();
    });

    const fileName = `pdfs-export-${uid}/${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('pdfs-export')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('pdfs-export').getPublicUrl(fileName);
    return { statusCode: 200, headers, body: JSON.stringify({ url: publicUrl }) };

  } catch (error) {
    console.error('Error generating PDF:', error);
    return { statusCode: 500, headers, body: 'Error generating PDF' };
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function packPositions(imgW, imgH, availW, availH) {
  const cols = Math.floor(availW / imgW);
  const rows = Math.floor(availH / imgH);
  if (cols === 0 || rows === 0) return [[CROP_MARGIN, CROP_MARGIN]];
  const positions = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      positions.push([CROP_MARGIN + c * imgW, CROP_MARGIN + r * imgH]);
  return positions;
}

function drawCropMarks(doc, x, y, w, h, PAGE_H) {
  const x1 = x,     y1pk = PAGE_H - y - h;
  const x2 = x + w, y2pk = PAGE_H - y;
  const g = CROP_GAP, l = CROP_LEN, t = CROP_THICK;

  doc.save().lineWidth(t);
  cmykBlack(doc);

  const line = (sx, sy, ex, ey) => doc.moveTo(sx, sy).lineTo(ex, ey).stroke();
  line(x1 - g - l, y1pk, x1 - g, y1pk);  line(x1, y1pk - g - l, x1, y1pk - g);
  line(x2 + g, y1pk, x2 + g + l, y1pk);  line(x2, y1pk - g - l, x2, y1pk - g);
  line(x1 - g - l, y2pk, x1 - g, y2pk);  line(x1, y2pk + g, x1, y2pk + g + l);
  line(x2 + g, y2pk, x2 + g + l, y2pk);  line(x2, y2pk + g, x2, y2pk + g + l);

  doc.restore();
}
