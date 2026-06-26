import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ENVIRONMENTS } from '../../../core/app.tokens';

@Injectable({ providedIn: 'root' })
export class AiDesignGeneratorService {
  constructor(
    private readonly http: HttpClient,
    @Inject(ENVIRONMENTS) private readonly env: any,
  ) {}

  async generateFromInspiration(
    imageBase64: string,
    canvasWidth: number,
    canvasHeight: number,
    shapeModelName: string | null = null,
  ): Promise<any> {
    const url = `${this.env.hostServer}/.netlify/functions/generateDesignFromInspiration`;
    const result = await firstValueFrom(
      this.http.post<{ fabricJson: any }>(url, {
        imageBase64,
        canvasWidth,
        canvasHeight,
        shapeModelName,
      }),
    );
    return result.fabricJson;
  }
}
