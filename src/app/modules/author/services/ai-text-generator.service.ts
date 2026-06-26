import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const FAL_KEY = '4ba42982-2aca-430b-a72f-5739c44ec0d7:6588bc1f6aaa9ae97dc25b67561fedfb';

export interface AiTextContext {
  title?: string;
  description?: string;
  category?: string;
}

export interface ArtDocMetaContext {
  title?: string;
  category?: string;
  size?: string;
}

export interface ArtDocMetaResult {
  title: string;
  description: string;
  tags: string[];
}

@Injectable({ providedIn: 'root' })
export class AiTextGeneratorService {
  constructor(private readonly http: HttpClient) {}

  async generateSuggestions(ctx: AiTextContext): Promise<string[]> {
    const parts: string[] = [];
    if (ctx.title) parts.push(`Title: "${ctx.title}"`);
    if (ctx.description) parts.push(`Description: "${ctx.description}"`);
    if (ctx.category) parts.push(`Category: "${ctx.category}"`);

    const contextStr = parts.length > 0
      ? parts.join('\n')
      : 'General creative gift tag or greeting card';

    const prompt = `You are a creative copywriter specializing in gift tags, greeting cards, and product labels.

Context about this design:
${contextStr}

Generate exactly 6 short text suggestions suitable for printing on this card or label.
Rules:
- Each suggestion is 1 to 4 lines maximum
- Each should feel complete and print-ready
- Vary the tone: some heartfelt, some elegant, some playful
- Separate each suggestion with "---" on its own line
- Return ONLY the suggestions separated by "---". No numbering, no explanations.`;

    const res = await firstValueFrom(
      this.http.post<{ output: string }>(
        'https://fal.run/fal-ai/any-llm',
        { model: 'google/gemini-2.0-flash-001', prompt },
        { headers: new HttpHeaders({ Authorization: `Key ${FAL_KEY}` }) }
      )
    );

    return (res?.output ?? '')
      .split(/\n?---\n?/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
      .slice(0, 6);
  }

  async generateArtDocMeta(ctx: ArtDocMetaContext): Promise<ArtDocMetaResult> {
    const parts: string[] = [];
    if (ctx.title)    parts.push(`Current title: "${ctx.title}"`);
    if (ctx.category) parts.push(`Category: "${ctx.category}"`);
    if (ctx.size)     parts.push(`Product size/type: "${ctx.size}"`);

    const contextStr = parts.length > 0
      ? parts.join('\n')
      : 'General creative gift tag or greeting card design';

    const prompt = `You are an SEO copywriter for an Etsy/Pinterest printable design shop specializing in gift tags, greeting cards, and cut-die cards.

Context:
${contextStr}

Return ONLY the following JSON object. Every string value MUST be enclosed in double quotes. No unquoted values allowed.

{
  "title": "your product title here max 10 words",
  "description": "<p>First paragraph here.</p><p>Second paragraph here.</p><p>Third paragraph here.</p>",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
}

Rules:
- title: keyword-rich, human, max 10 words, NO quotes inside the value
- description: HTML string with exactly 2-3 <p> tags, warm tone, mention printing/gifting, all on one line
- tags: exactly 10 lowercase tags of 1-3 words each, no #
- Return ONLY the JSON object. No markdown fences, no explanations, no extra text.`;

    const res = await firstValueFrom(
      this.http.post<{ output: string }>(
        'https://fal.run/fal-ai/any-llm',
        { model: 'google/gemini-2.0-flash-001', prompt },
        { headers: new HttpHeaders({ Authorization: `Key ${FAL_KEY}` }) }
      )
    );

    const raw = (res?.output ?? '').replace(/```json\n?|```/g, '').trim();
    try {
      const parsed = JSON.parse(raw);
      const description = Array.isArray(parsed.description)
        ? parsed.description.join('')
        : (parsed.description ?? '');
      return {
        title: parsed.title ?? '',
        description,
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
      };
    } catch {
      return this.fallbackExtract(raw);
    }
  }

  private fallbackExtract(raw: string): ArtDocMetaResult {
    const titleMatch = raw.match(/"title"\s*:\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const descriptionMatch = raw.match(/"description"\s*:\s*"([\s\S]*?)(?:",\s*"tags"|"\s*})/);
    let description = descriptionMatch ? descriptionMatch[1].trim() : '';
    if (!description) {
      const paragraphs = raw.match(/<p>[\s\S]*?<\/p>/g) ?? [];
      description = paragraphs.join('');
    }

    const tagsMatch = raw.match(/"tags"\s*:\s*\[([^\]]+)\]/);
    const tags: string[] = tagsMatch
      ? tagsMatch[1].match(/"([^"]+)"/g)?.map(t => t.replace(/"/g, '').trim()) ?? []
      : [];

    if (!title && !description) {
      console.error('[AI] fallback extraction also failed, raw was:', raw);
      throw new Error('AI response could not be parsed');
    }
    return { title, description, tags: tags.slice(0, 10) };
  }
}
