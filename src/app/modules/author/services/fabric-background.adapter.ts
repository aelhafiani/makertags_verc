import { Injectable } from '@angular/core';
import { Canvas, FabricImage, FabricObject } from 'fabric';
import { BackgroundModel } from './background.state';

type AnyFabricObj = FabricObject & {
  isArtContour?: boolean;
  lockedBackground?: boolean;
  isTextureOverlay?: boolean;
  fill?: unknown;
  stroke?: unknown;
  _objects?: AnyFabricObj[];
};

/**
 * When a form layer exists, the canvas background is rendered at this reduced
 * opacity so the form boundary stays visible even on very dark colours.
 */
const CANVAS_BG_OPACITY_FACTOR = 0.35;

@Injectable({ providedIn: 'root' })
export class FabricBackgroundAdapter {

  applyBackground(canvas: Canvas, background: BackgroundModel): void {
    // Remove any texture overlay left from a previous texture application
    this.removeTextureOverlay(canvas);

    const form = this.findFormLayer(canvas);

    // ── Solid colour ─────────────────────────────────────────────────────────
    if (background.type === 'color') {
      canvas.backgroundImage = undefined;

      if (form) {
        // Canvas at reduced opacity  ──  form fill at full opacity
        canvas.backgroundColor = this.hexToRgba(
          background.value,
          background.opacity * CANVAS_BG_OPACITY_FACTOR,
        );
        this.syncFormLayerColor(form, background.value, background.opacity);
      } else {
        canvas.backgroundColor = this.hexToRgba(background.value, background.opacity);
      }

      canvas.requestRenderAll();
      return;
    }

    // ── Texture ──────────────────────────────────────────────────────────────
    if (background.type === 'texture') {
      if (form) {
        this.applyTextureWithForm(canvas, background.value, background.opacity, form);
      } else {
        this.applyTexturePlain(canvas, background.value, background.opacity);
      }
      return;
    }

    canvas.requestRenderAll();
  }

  // ── Texture helpers ─────────────────────────────────────────────────────────

  /**
   * No form layer present → single background image, full opacity (original behaviour).
   */
  private applyTexturePlain(canvas: Canvas, url: string, opacity: number): void {
    FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
      .then((image) => {
        this.scaleToCanvas(image, canvas);
        image.set({ selectable: false, evented: false, opacity });
        canvas.backgroundImage = image;
        canvas.requestRenderAll();
      })
      .catch(() => {});
  }

  /**
   * Form layer present:
   *   1. Canvas background = texture at 35 % opacity  (outside the form)
   *   2. FabricImage overlay = texture at full opacity, clipPath = form shape
   *      (inside the form) — so the form boundary is always visible.
   */
  private applyTextureWithForm(
    canvas: Canvas,
    url: string,
    opacity: number,
    form: AnyFabricObj,
  ): void {
    Promise.all([
      FabricImage.fromURL(url, { crossOrigin: 'anonymous' }),
      FabricImage.fromURL(url, { crossOrigin: 'anonymous' }),
      (form as FabricObject).clone(),
    ])
      .then(([bgImage, overlayImage, formClip]) => {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const imgW = bgImage.width  || w;
        const imgH = bgImage.height || h;
        const scale = Math.max(w / imgW, h / imgH);
        const left  = (w - imgW * scale) / 2;
        const top   = (h - imgH * scale) / 2;

        // 1 ── Faded background (canvas-level)
        bgImage.set({
          left, top,
          originX: 'left', originY: 'top',
          selectable: false, evented: false,
          opacity: opacity * CANVAS_BG_OPACITY_FACTOR,
          scaleX: scale, scaleY: scale,
        });
        canvas.backgroundImage = bgImage;

        // 2 ── Full-opacity overlay clipped to the form shape
        (formClip as FabricObject).set({ absolutePositioned: true });

        overlayImage.set({
          left, top,
          originX: 'left', originY: 'top',
          selectable: false, evented: false,
          opacity,
          scaleX: scale, scaleY: scale,
          clipPath: formClip as FabricObject,
        });
        (overlayImage as AnyFabricObj).isTextureOverlay = true;

        // Patch toObject so the overlay is excluded from canvas.toJSON()
        (overlayImage as AnyFabricObj).toObject = () => ({});

        canvas.add(overlayImage);

        // Place the overlay just above the form layer
        const formIdx = canvas.getObjects().indexOf(form as FabricObject);
        canvas.moveObjectTo(overlayImage, formIdx + 1);

        canvas.requestRenderAll();
      })
      .catch(() => {});
  }

  private removeTextureOverlay(canvas: Canvas): void {
    const overlay = (canvas.getObjects() as AnyFabricObj[]).find(
      (o) => o.isTextureOverlay,
    );
    if (overlay) canvas.remove(overlay);
  }

  private scaleToCanvas(image: FabricImage, canvas: Canvas): void {
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const imgW = image.width  || w;
    const imgH = image.height || h;
    const scale = Math.max(w / imgW, h / imgH);
    image.set({
      originX: 'left', originY: 'top',
      scaleX: scale,
      scaleY: scale,
      left: (w - imgW * scale) / 2,
      top:  (h - imgH * scale) / 2,
    });
  }

  // ── Colour form-layer sync ──────────────────────────────────────────────────

  private syncFormLayerColor(form: AnyFabricObj, hex: string, opacity: number): void {
    const fill = this.hexToRgba(hex, opacity);
    const strokeColor = this.isColorDark(hex) ? '#ffffff' : '#333333';
    this.applyFillToForm(form, fill, strokeColor);
  }

  private findFormLayer(canvas: Canvas): AnyFabricObj | null {
    const objects = canvas.getObjects() as AnyFabricObj[];
    return (
      objects.find((o) => o.isArtContour)     ??
      objects.find((o) => o.lockedBackground)  ??
      null
    );
  }

  private applyFillToForm(obj: AnyFabricObj, fill: string, stroke: string | null): void {
    const applyToOne = (o: AnyFabricObj) => {
      if (this.hasVisibleFill(o.fill))                          o.set({ fill });
      if (stroke !== null && this.hasVisibleStroke(o.stroke))   o.set({ stroke });
    };

    const children = obj._objects;
    if (children?.length) {
      children.forEach(applyToOne);
      obj.set({ fill });
      if (stroke !== null && this.hasVisibleStroke(obj.stroke)) obj.set({ stroke });
    } else {
      applyToOne(obj);
    }
  }

  // ── Visibility helpers ──────────────────────────────────────────────────────

  private hasVisibleFill(fill: unknown): boolean {
    if (!fill || fill === 'none' || fill === 'transparent' || fill === '') return false;
    if (typeof fill === 'string') {
      const m = fill.match(/rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*([\d.]+))?\)/);
      if (m && parseFloat(m[1] ?? '1') === 0) return false;
    }
    return true;
  }

  private hasVisibleStroke(stroke: unknown): boolean {
    return !(!stroke || stroke === 'none' || stroke === 'transparent' || stroke === '');
  }

  // ── Colour helpers ──────────────────────────────────────────────────────────

  private isColorDark(hex: string): boolean {
    const n = normalizeHexColor(hex);
    const r = parseInt(n.slice(1, 3), 16);
    const g = parseInt(n.slice(3, 5), 16);
    const b = parseInt(n.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  }

  private hexToRgba(hex: string, alpha = 1): string {
    const n = normalizeHexColor(hex);
    const r = parseInt(n.slice(1, 3), 16);
    const g = parseInt(n.slice(3, 5), 16);
    const b = parseInt(n.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

function normalizeHexColor(value: string): string {
  const input = (value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(input)) return input;
  if (/^[0-9a-fA-F]{6}$/.test(input)) return `#${input}`;
  return '#FFFFFF';
}
