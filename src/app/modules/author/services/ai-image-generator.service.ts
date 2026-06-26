import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const FAL_KEY = '4ba42982-2aca-430b-a72f-5739c44ec0d7:6588bc1f6aaa9ae97dc25b67561fedfb';
const IMAGE_SIZE = { width: 1024, height: 1024 };

export interface AiImageContext {
  title?: string;
  description?: string;
  category?: string;
}

@Injectable({ providedIn: 'root' })
export class AiImageGeneratorService {
  constructor(private readonly http: HttpClient) {}

  buildPrompt(ctx: AiImageContext): string {
    const theme = ctx.category?.trim()
      || ctx.title?.split(' ').slice(0, 4).join(' ')
      || 'floral decorative';

    return `Beautiful ${theme} themed decorative clipart element, watercolor illustration style, detailed and vibrant, isolated on plain white background, no text, no words, no letters, no labels, purely visual graphic element suitable for adding to a design.`;
  }

  async generateImages(prompt: string): Promise<string[]> {
    const rawUrls = await this.generateWithFlux(
      prompt.includes('white background') ? prompt : `${prompt}, plain white background`
    );
    const transparentUrls = await Promise.all(rawUrls.map((url) => this.removeBackground(url)));
    return transparentUrls;
  }

  private async generateWithFlux(prompt: string): Promise<string[]> {
    const queueRes = await firstValueFrom(
      this.http.post<{ request_id: string; status_url: string; response_url: string }>(
        'https://queue.fal.run/fal-ai/flux/schnell',
        {
          prompt,
          negative_prompt: 'text, words, letters, typography, watermark, label, card, tag, paper, frame, border',
          image_size: IMAGE_SIZE,
          num_inference_steps: 4,
          num_images: 4,
          enable_safety_checker: true,
        },
        { headers: new HttpHeaders({ Authorization: `Key ${FAL_KEY}` }) }
      )
    );

    const { status_url, response_url } = queueRes;
    if (!status_url) throw new Error('No status_url returned from fal.ai');

    for (let i = 0; i < 30; i++) {
      await this.sleep(2000);

      const poll = await fetch(`${status_url}?logs=0`, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      if (!poll.ok) throw new Error(`Poll failed: ${poll.status}`);
      const data = await poll.json();

      if (data.status === 'COMPLETED') {
        const outUrl = response_url ?? status_url.replace('/status', '');
        const outRes = await fetch(outUrl, { headers: { Authorization: `Key ${FAL_KEY}` } });
        const outData = await outRes.json();
        const images: string[] = (
          outData?.images ?? outData?.output?.images ?? []
        )
          .map((img: { url?: string }) => img.url)
          .filter(Boolean);
        if (images.length === 0) throw new Error('No images in fal.ai response');
        return images;
      }

      if (data.status === 'FAILED') {
        throw new Error(data.error ?? 'Image generation failed');
      }
    }

    throw new Error('Image generation timed out after 60s');
  }

  private async removeBackground(imageUrl: string): Promise<string> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ image: { url: string } }>(
          'https://fal.run/fal-ai/imageutils/rembg',
          { image_url: imageUrl },
          { headers: new HttpHeaders({ Authorization: `Key ${FAL_KEY}` }) }
        )
      );
      return res?.image?.url ?? imageUrl;
    } catch {
      return imageUrl;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
