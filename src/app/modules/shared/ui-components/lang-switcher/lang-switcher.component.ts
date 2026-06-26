import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

@Component({
  selector: 'maker-tags-lang-switcher',
  standalone: true,
  imports: [CommonModule, NzDropDownModule, NzMenuModule],
  templateUrl: './lang-switcher.component.html',
  styleUrl: './lang-switcher.component.scss',
})
export class LangSwitcherComponent {
  private transloco = inject(TranslocoService);
  private platformId = inject(PLATFORM_ID);

  readonly languages = LANGUAGES;
  activeLang = signal(this.transloco.getActiveLang());

  setLang(code: string) {
    this.transloco.setActiveLang(code);
    this.activeLang.set(code);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lang', code);
    }
  }

  get activeLanguage() {
    return LANGUAGES.find(l => l.code === this.activeLang()) ?? LANGUAGES[0];
  }
}
