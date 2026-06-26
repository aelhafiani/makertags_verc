// src/app/services/pdf-generation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
const fontkit = require('@pdf-lib/fontkit');

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnyCnameRecord } from 'dns';

interface FabricObject {
  type: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  fill?: string;
  text?: string;
  fontSize?: number;
  src?: string;
  objects?: FabricObject[];
}

interface FabricJson {
  width?: number;
  height?: number;
  objects: FabricObject[];
}

@Injectable({
  providedIn: 'root'
})
export class PdfGenerationService {

  constructor(private http: HttpClient) {}
  private fontMap: { [key: string]: string } = {
    'Anton': 'https://firebasestorage.googleapis.com/v0/b/artmaker-8a799.appspot.com/o/fonts%2FAnton-Regular.ttf?alt=media&token=6b007548-889b-465e-9723-ae7f1c91cf67',
    'CustomFont2': 'https://path/to/custom-font2.ttf',
    'AntonLoal':'../../assets/fonts/Anton-Regular.ttf'
    // Add more font mappings as needed
  };
  private hexToRgb(hex: string): [number, number, number] {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r / 255, g / 255, b / 255];
  }

  private async drawObject(page: any, object: any, pdfDoc: PDFDocument): Promise<void> {
    switch (object.type) {
      case 'rect':
        const [r, g, b] = this.hexToRgb(object.fill || '#000000');
        page.drawRectangle({
          x: object.left || 0,
          y: page.getHeight() - (object.top || 0) - (object.height || 100),
          width: object?.width || 100,
          height: object?.height || 100,
          color: rgb(r, g, b),
        });
        break;
      case 'i-text':
        
        const [textR, textG, textB] = this.hexToRgb(object.fill || '#000000');
        const fontUrl = this.fontMap['AntonLoal'];
        console.log('fontUrl', fontUrl)
       
        const customFont = await this.loadCustomFont(fontUrl);
        console.log('customFont', customFont)
        await pdfDoc.embedFont(customFont);

        page.drawText(object.text || '', {
          x: object.left || 0,
          y: object.top || 0,
          size: object.fontSize || 24,
          font: customFont,
          color: rgb(textR, textG, textB),
        });
        break;
      case 'image':
        const imageUrl = object.src || '';
        const response = await this.http.get(imageUrl, { responseType: 'arraybuffer' }).toPromise();
        const imageBytes = new Uint8Array(response as any);

        let pdfImage;
        if (object.src?.endsWith('.png')) {
          pdfImage = await pdfDoc.embedPng(imageBytes);
        } else if (object.src?.endsWith('.jpg') || object.src?.endsWith('.jpeg')) {
          pdfImage = await pdfDoc.embedJpg(imageBytes);
        }

        page.drawImage(pdfImage, {
          x: object.left || 0,
          y: page.getHeight() - (object.top || 0) - (object.height || 100),
          width: object?.width || 100,
          height: object?.height || 100,
        });
        break;
    }
  }
// Function to embed custom font into PDF document
async loadCustomFont(fontUrl: string) {
  const response = await fetch(fontUrl);
  const fontBuffer = await response.arrayBuffer();
  return fontBuffer;
}

// async embedCustomFont(pdfDoc: any, fontBuffer: any) {
//   const font = fontkit.create(fontBuffer);
//   pdfDoc.registerFontkit(fontkit);
//   return await pdfDoc.embedFont(font);
// }
  public async generatePdfFromFabricJson(fabricJson: FabricJson): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const page = pdfDoc.addPage([fabricJson?.width || 800, fabricJson?.height || 600]);

    for (const object of fabricJson.objects) {
      if (object.type === 'group' && object.objects) {
        for (const childObject of object.objects) {
          await this.drawObject(page, childObject, pdfDoc);
        }
      } else {
        await this.drawObject(page, object, pdfDoc);
      }
    }

    return await pdfDoc.save();
  }
}
