import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { CanvasUtilsService } from '../../../../shared/canvas/canvas.utils.service';
import { ArtFacadeService } from '../../../../shared/services/new-art.facade';
import { IArtPage } from '../../../../shared/domaine/entities/art';

const FONTS: { key: string; label: string; category: string }[] = [
  // Sans-serif
  { key: 'Inter', label: 'Inter', category: 'Sans' },
  { key: 'Montserrat', label: 'Montserrat', category: 'Sans' },
  { key: 'Poppins', label: 'Poppins', category: 'Sans' },
  { key: 'Raleway', label: 'Raleway', category: 'Sans' },
  { key: 'Lato', label: 'Lato', category: 'Sans' },
  { key: 'Nunito', label: 'Nunito', category: 'Sans' },
  { key: 'Josefin Sans', label: 'Josefin Sans', category: 'Sans' },
  { key: 'Oswald', label: 'Oswald', category: 'Sans' },
  { key: 'Bebas Neue', label: 'Bebas Neue', category: 'Sans' },
  // Serif
  { key: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { key: 'Lora', label: 'Lora', category: 'Serif' },
  { key: 'Merriweather', label: 'Merriweather', category: 'Serif' },
  { key: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'Serif' },
  { key: 'Georgia', label: 'Georgia', category: 'Serif' },
  // Décoratif
  { key: 'Dancing Script', label: 'Dancing Script', category: 'Déco' },
  { key: 'Pacifico', label: 'Pacifico', category: 'Déco' },
  { key: 'Abril Fatface', label: 'Abril Fatface', category: 'Déco' },
  { key: 'Courier New', label: 'Courier New', category: 'Déco' },
  // Féminin / Mode
  { key: 'Belleza', label: 'Belleza', category: 'Mode' },
  { key: 'Elsie', label: 'Elsie', category: 'Mode' },
  { key: 'Yeseva One', label: 'Yeseva One', category: 'Mode' },
  { key: 'Simonetta', label: 'Simonetta', category: 'Mode' },
  { key: 'Madimi One', label: 'Madimi One', category: 'Mode' },
];

// Google Fonts ne sont pas chargées localement (Georgia et Courier New sont des polices système)
const GOOGLE_FONTS = FONTS.filter(f => f.key !== 'Georgia' && f.key !== 'Courier New');

@Component({
  selector: 'maker-tags-font-family-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './font-family-editor.component.html',
  styleUrl: './font-family-editor.component.scss',
})
export class FontFamilyEditorComponent {
  constructor(
    private canvasService: CanvasUtilsService,
    private artFacade: ArtFacadeService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  currentArt!: IArtPage;
  fonts = FONTS;
  categories = [...new Set(FONTS.map(f => f.category))];

  ngOnInit(): void {
    this.loadGoogleFonts();
  }

  private loadGoogleFonts(): void {
    const linkId = 'google-fonts-editor';
    if (this.document.getElementById(linkId)) return;

    const families = GOOGLE_FONTS.map(f => f.key.replace(/ /g, '+')).join('&family=');
    const href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;

    const link = this.document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = href;
    this.document.head.appendChild(link);
  }

  fontsByCategory(category: string) {
    return this.fonts.filter(f => f.category === category);
  }

  changeFont(font: string) {
    this.canvasService.setEditorEvent({ name: 'fontFamily', value: font });
  }
}
