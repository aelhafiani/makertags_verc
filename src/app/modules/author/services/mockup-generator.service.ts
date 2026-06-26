import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Canvas, IText } from 'fabric';
import { environment } from '../../../../environments/environment';

export type MockupRatio = '9:16' | '2:3' | '4:5' | '1:1';
export type MockupType = 'gift-tag' | 'cut-die-card';

export interface MockupRequest {
  ratio: MockupRatio;
  occasion: string;
  title: string;
  subtitle: string;
  canvasImageBase64: string;
  mockupType?: MockupType;
  openedCardBase64?: string;
}

export interface MockupResult {
  imageUrl: string;
  prompt: string;
}

const FAL_KEY = '4ba42982-2aca-430b-a72f-5739c44ec0d7:6588bc1f6aaa9ae97dc25b67561fedfb';

const IMAGE_SIZES: Record<string, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '2:3':  { width: 1000, height: 1500 },
  '4:5':  { width: 1000, height: 1250 },
  '1:1':  { width: 1024, height: 1024 },
};

const BACKGROUND_STYLES = (occasionPart: string) => [
  `bright airy room scene with multiple stacked ${occasionPart}gifts in the background, warm bokeh fairy lights, light wooden shelf, pastel gift boxes, natural daylight flooding through a nearby window`,
  `clean white marble surface, single beautifully wrapped ${occasionPart}gift with pink satin ribbon and bow, soft window light from the side, blurred white curtain background, minimal and elegant`,
  `rustic chic scene on a light linen surface, ${occasionPart}gift wrapped in cream paper with raffia twine bow, fresh eucalyptus and dried flowers around, wicker basket blurred in background, warm natural light`,
  `bright feminine shelfie scene, ${occasionPart}gift on a white marble table, pink roses and peonies bouquet blurred behind, gold accents, multiple wrapped gifts in background, bright airy high-key lighting`,
  `cozy bright living room, ${occasionPart}gifts stacked on a white table, soft pink and beige wrapped presents, fairy lights bokeh in background, fresh flowers, flooded with soft natural light`,
];

@Injectable({ providedIn: 'root' })
export class MockupGeneratorService {
  constructor(private readonly http: HttpClient) {}

  async generate(req: MockupRequest): Promise<MockupResult> {
    if (!environment.production) {
      return this.generateDirect(req);
    }
    return this.generateViaQueue(req);
  }

  /** Production path: submit to Netlify → queue → poll until done */
  private async generateViaQueue(req: MockupRequest): Promise<MockupResult> {
    // Step 1: submit job
    const submission = await firstValueFrom(
      this.http.post<{ requestId: string; statusUrl: string; responseUrl: string; prompt: string }>(
        '/.netlify/functions/generateMockup',
        req
      )
    );

    const { statusUrl, responseUrl, prompt } = submission;
    if (!statusUrl) throw new Error('No statusUrl returned from queue submission');

    // Step 2: poll until COMPLETED or FAILED (max 120s, every 3s)
    const maxAttempts = 40;
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(3000);

      const pollUrl = `/.netlify/functions/pollMockup?statusUrl=${encodeURIComponent(statusUrl)}`
        + (responseUrl ? `&responseUrl=${encodeURIComponent(responseUrl)}` : '');

      const poll = await firstValueFrom(
        this.http.get<{ status: string; imageUrl?: string; error?: string }>(pollUrl)
      );

      if (poll.status === 'COMPLETED') {
        if (!poll.imageUrl) throw new Error('No image returned');
        return { imageUrl: poll.imageUrl, prompt };
      }

      if (poll.status === 'FAILED') {
        throw new Error(poll.error ?? 'Mockup generation failed');
      }
      // IN_QUEUE or IN_PROGRESS → continue polling
    }

    throw new Error('Mockup generation timed out after 120s');
  }

  /** Dev path: call fal.ai directly using queue API */
  private async generateDirect(req: MockupRequest): Promise<MockupResult> {
    const imageSize = IMAGE_SIZES[req.ratio] ?? IMAGE_SIZES['2:3'];

    // Upload canvas image (closed card)
    let tagImageUrl: string | null = null;
    if (req.canvasImageBase64) {
      const initiateRes = await firstValueFrom(
        this.http.post<{ upload_url: string; file_url: string }>(
          'https://rest.alpha.fal.ai/storage/upload/initiate',
          { file_name: 'tag.png', content_type: 'image/png' },
          { headers: new HttpHeaders({ Authorization: `Key ${FAL_KEY}` }) }
        )
      );
      if (initiateRes?.upload_url) {
        const base64 = req.canvasImageBase64.replace(/^data:image\/\w+;base64,/, '');
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        await fetch(initiateRes.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/png' },
          body: bytes,
        });
        tagImageUrl = initiateRes.file_url;
      }
    }

    // Upload opened card photo (cut-die-card only)
    let openedCardUrl: string | null = null;
    if (req.mockupType === 'cut-die-card' && req.openedCardBase64) {
      const ext = req.openedCardBase64.startsWith('data:image/jpeg') ? 'jpg' : 'png';
      const contentType = ext === 'jpg' ? 'image/jpeg' : 'image/png';
      const initiateRes = await firstValueFrom(
        this.http.post<{ upload_url: string; file_url: string }>(
          'https://rest.alpha.fal.ai/storage/upload/initiate',
          { file_name: `opened-card.${ext}`, content_type: contentType },
          { headers: new HttpHeaders({ Authorization: `Key ${FAL_KEY}` }) }
        )
      );
      if (initiateRes?.upload_url) {
        const base64 = req.openedCardBase64.replace(/^data:image\/\w+;base64,/, '');
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        await fetch(initiateRes.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: bytes,
        });
        openedCardUrl = initiateRes.file_url;
      }
    }

    const occasionPart = req.occasion ? `${req.occasion} ` : '';

    let prompt: string;
    if (req.mockupType === 'cut-die-card') {
      if (tagImageUrl && openedCardUrl) {
        prompt = `Create an ultra realistic die-cut greeting card product image using the TWO uploaded reference images only.\n\nThe first image shows the OPENED (unfolded/flat) version of the card — this is the card design as it appears when fully open.\nThe second image shows the CLOSED (folded) version of the same card — this is how the card looks when folded shut.\n\nGenerate a premium product mockup that perfectly recreates both states of the card.\nReproduce the exact same artwork, colors, typography, illustrations, and layout from the uploaded references without any modification.\nDo NOT invent, replace, or add any design elements that are not visible in the uploaded images.\n\nThe mockup should show both states naturally — one hand holding the card open showing its full interior design, and the same card closed showing the folded exterior — demonstrating the folding mechanism.\n\nUse realistic hands holding the card naturally.\nSoft neutral background (beige fabric or white surface).\nLuxury stationery photography style.\nNatural lighting, realistic paper texture, soft shadows, and clean elegant composition.\n\nCritical rules:\n* Copy the design EXACTLY from the uploaded images. Do not redesign or reimagine anything.\n* The opened state must match image 1 exactly.\n* The closed state must match image 2 exactly.\n* Vertical 9:16 TikTok/Reels composition.\n* Ultra detailed realistic product mockup aesthetic.`;
      } else if (tagImageUrl) {
        prompt = `Create an ultra realistic die-cut greeting card product image using the uploaded reference image.\n\nThe uploaded image shows the OPENED (unfolded/flat) version of the card — the full interior design.\n\nGenerate a premium product mockup showing the card in both its opened and closed states.\nReproduce the exact same artwork, colors, typography, and illustrations from the uploaded reference without any modification.\nDo NOT invent or add any design elements that are not in the uploaded image.\n\nUse realistic hands holding the card naturally.\nSoft neutral background (beige fabric or white surface).\nLuxury stationery photography style.\nNatural lighting, realistic paper texture, soft shadows, and clean elegant composition.\n\nCritical rules:\n* Copy the design EXACTLY from the uploaded image.\n* Do not redesign, reimagine, or add anything.\n* Vertical 9:16 TikTok/Reels composition.\n* Ultra detailed realistic product mockup aesthetic.`;
      } else {
        prompt = `A clean simple product photo of a die-cut greeting card. Two states shown: one opened (flat, showing the full interior design) and one closed (folded exterior). Hands holding the card naturally. Soft neutral background. Luxury stationery photography style. Natural lighting, realistic paper texture, soft shadows. Vertical 9:16 composition. Ultra detailed realistic product mockup aesthetic.`;
      }
    } else {
      const styles = BACKGROUND_STYLES(occasionPart);
      const chosenBg = styles[Math.floor(Math.random() * styles.length)];
      prompt = tagImageUrl
        ? `Place this exact gift tag design — preserve every detail of its artwork, colors, text, and shape without any modification — realistically in the foreground of a lifestyle photo. Attach it with natural twine or a satin ribbon to a beautifully wrapped gift. Scene: ${chosenBg}. The wrapping paper must be light pastel — soft white, cream, blush pink or light floral pattern, NOT dark kraft brown. Bright airy soft pastel palette, high-key natural lighting, Pinterest lifestyle photography, photorealistic, shallow depth of field. The tag in the output must look IDENTICAL to the input tag image.`
        : `A bright airy Pinterest-style ${occasionPart}gift wrap scene. ${chosenBg}. Photorealistic, high-key lighting, shallow depth of field.`;
    }

    const imageUrls = [tagImageUrl, openedCardUrl].filter(Boolean) as string[];
    const payload = imageUrls.length
      ? { image_urls: imageUrls, prompt, image_size: imageSize, num_images: 1 }
      : { prompt, image_size: imageSize, num_inference_steps: 4, num_images: 1 };

    const queueEndpoint = 'https://queue.fal.run/fal-ai/nano-banana-2/edit';

    // Submit to queue
    const queueRes = await firstValueFrom(
      this.http.post<{ request_id: string; status_url: string; response_url: string }>(queueEndpoint, payload, {
        headers: new HttpHeaders({ Authorization: `Key ${FAL_KEY}` }),
      })
    );

    const statusUrl = queueRes.status_url;
    const responseUrl = queueRes.response_url;
    if (!statusUrl) throw new Error('No status_url returned from fal.ai queue');

    // Poll until done
    const maxAttempts = 40;
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(3000);

      const pollRes = await fetch(`${statusUrl}?logs=0`, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      if (!pollRes.ok) throw new Error(`Poll failed: ${pollRes.status} ${await pollRes.text()}`);
      const data = await pollRes.json();

      if (data.status === 'COMPLETED') {
        // Fetch actual output from response_url
        const outUrl = responseUrl ?? statusUrl.replace('/status', '');
        const outRes = await fetch(outUrl, { headers: { Authorization: `Key ${FAL_KEY}` } });
        const outData = await outRes.json();
        const imageUrl = outData?.images?.[0]?.url ?? outData?.output?.images?.[0]?.url ?? '';
        if (!imageUrl) throw new Error(`No image in response: ${JSON.stringify(outData)}`);
        return { imageUrl, prompt };
      }

      if (data.status === 'FAILED') {
        throw new Error(data.error ?? 'Generation failed');
      }
    }

    throw new Error('Mockup generation timed out after 120s');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  exportCanvasToBase64(canvas: Canvas): string {
    try {
      return canvas.toDataURL({ format: 'png', multiplier: 1 });
    } catch (e) {
      console.warn('[mockup] toDataURL failed (tainted canvas?), exporting without cross-origin images:', e);
      // Re-render with only non-tainted objects isn't possible; return empty string
      // so the mockup is generated without the tag overlay
      return '';
    }
  }

  extractTextsFromCanvas(canvas: Canvas): { title: string; subtitle: string } {
    const texts = canvas
      .getObjects()
      .filter((o) => o.type === 'i-text' || o.type === 'textbox')
      .map((o) => ((o as IText).text ?? '').trim())
      .filter(Boolean);

    return {
      title: texts[0] ?? '',
      subtitle: texts[1] ?? '',
    };
  }
}
