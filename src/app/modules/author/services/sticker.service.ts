import { Injectable } from '@angular/core';

export type StickerOutlineColor = 'white' | 'black' | 'double';

export interface StickerOptions {
  /** Outline width in pixels (relative to natural image size). Default 16. */
  outlineWidth?: number;
  /** Explicit white ring width (used by createDoubleSticker). Overrides outlineWidth ratio. */
  whiteWidth?: number;
  /** Explicit black ring width (used by createDoubleSticker). Overrides outlineWidth ratio. */
  blackWidth?: number;
  /** Number of radial steps for the dilation pass. Higher = smoother. Default 32. */
  steps?: number;
}

/**
 * Generates a sticker PNG (data URL) from an image URL by adding a solid-color
 * outline around the non-transparent pixels of the source image.
 *
 * Technique: draw the source image at N positions along a circle of radius
 * `outlineWidth`, color the union of those positions with the chosen color
 * (source-in composite), then draw the original on top (source-over).
 * This is GPU-friendly and runs in < 5 ms for typical sticker sizes.
 */
@Injectable({ providedIn: 'root' })
export class StickerService {
  /**
   * Create a sticker from an image URL.
   * @returns a PNG data URL with the outline applied.
   */
  createSticker(
    imageUrl: string,
    outlineColor: StickerOutlineColor,
    options: StickerOptions = {},
  ): Promise<string> {
    const { outlineWidth = 16, steps = 36 } = options;

    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const pad = outlineWidth + 2; // extra safety padding

        const canvas = document.createElement('canvas');
        canvas.width = w + pad * 2;
        canvas.height = h + pad * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get 2D context'));
          return;
        }

        // ── Pass 1: build the "dilated" shape ────────────────────────────────
        // Draw the image at N evenly-spaced positions around a circle of radius
        // `outlineWidth`. The union of all these draws forms a thickened blob.
        for (let i = 0; i < steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const dx = Math.cos(angle) * outlineWidth;
          const dy = Math.sin(angle) * outlineWidth;
          ctx.drawImage(img, pad + dx, pad + dy);
        }

        // ── Pass 2: flood the dilated shape with the outline color ───────────
        // source-in: only paint where there are already opaque pixels (the blob)
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = outlineColor === 'white' ? '#ffffff' : '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ── Pass 3: draw original image centered on top ──────────────────────
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, pad, pad);

        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => reject(new Error('Failed to load image for sticker creation'));
      img.src = imageUrl;
    });
  }

  /**
   * Generate both white and black sticker variants simultaneously.
   */
  async createBothStickers(
    imageUrl: string,
    options: StickerOptions = {},
  ): Promise<{ white: string; black: string }> {
    const [white, black] = await Promise.all([
      this.createSticker(imageUrl, 'white', options),
      this.createSticker(imageUrl, 'black', options),
    ]);
    return { white, black };
  }

  /**
   * Classic double-border sticker: white outline close to the image,
   * then a thinner black outline around that white ring.
   *
   * Pass 1: white outline on original → intermediate canvas
   * Pass 2: black outline on intermediate → final canvas
   */
  async createDoubleSticker(
    imageUrl: string,
    options: StickerOptions = {},
  ): Promise<string> {
    const { outlineWidth = 16, steps = 36 } = options;
    const innerWidth = options.whiteWidth ?? Math.round(outlineWidth * 0.75);
    const outerWidth = options.blackWidth ?? Math.round(outlineWidth * 0.45);

    // Step 1: white inner outline
    const withWhite = await this.createSticker(imageUrl, 'white', {
      outlineWidth: innerWidth,
      steps,
    });

    // Step 2: black outer outline around the white result
    return this.createSticker(withWhite, 'black', {
      outlineWidth: outerWidth,
      steps,
    });
  }
}
