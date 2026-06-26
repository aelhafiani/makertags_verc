import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzCardModule } from 'ng-zorro-antd/card';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MetaService } from '../../shared/services/meta.service';
import { AuthService } from '../../shared/services/auth.service';
import { OptimizeImagePipe } from '../../shared/pipes/optimize-image.pipe';
import { TranslateContentPipe } from '../../shared/pipes/translate-content.pipe';
import { SanitizeHtmlPipe } from '../../shared/pipes/htmlSanitizer/htmlSanitizer.pipe';
import { TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'maker-tags-list-by-category',
  standalone: true,
  imports: [CommonModule, NzLayoutModule, NzCardModule, RouterModule, OptimizeImagePipe, TranslateContentPipe, SanitizeHtmlPipe],
  templateUrl: './list-by-category.component.html',
  styleUrl: './list-by-category.component.css',
})

export class ListByCategoryComponent {
  private sanitizer = inject(DomSanitizer);
  private transloco = inject(TranslocoService);

  activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  selecytedCategory:any;
  showFullDescription = false;
  isLoading = false;
  logo = 'https://firebasestorage.googleapis.com/v0/b/artmaker-8a799.appspot.com/o/assets%2Flogo-text.png?alt=media&token=00723a63-5996-4074-aced-9c5c71e68294'

  private getSafeDescription(description: string, truncate: boolean = true): SafeHtml {
    const text = truncate ? (description?.slice(0, 150) ?? '') : (description ?? '');
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }

  arts:any;
  metaService = inject(MetaService);
  constructor(private activeRoute:ActivatedRoute, private router: Router, private authService:AuthService) {
     const artLists = this.activeRoute.snapshot.data['artList'];
     this.setArts(artLists);

     // Charger la catégorie depuis le resolver (déjà chargée avant le composant)
     this.selecytedCategory = this.activeRoute.snapshot.data['categoryData'];
  }

 async ngOnInit(): Promise<void> {
    try {
      // Mettre à jour les meta tags avec la catégorie chargée par le resolver
      this.metaService.updateMeta(
        this.selecytedCategory?.title , 
        this.selecytedCategory?.description,
        this.logo, 
         'art, list, tags'+ (this.selecytedCategory ? `, ${this.selecytedCategory.label}` : ''))
    } catch (error) {
      console.error('Erreur lors de la mise à jour des meta tags:', error);
    }
  }
  
  setArts(rawArts: any[]) {
    this.arts = rawArts.map(art => ({
      ...art,
      safeDescription: this.getSafeDescription(art.description, true),
      fullDescription: this.getSafeDescription(art.description, false)
    }));
  }
  
  toggleFullDescription(): void {
    this.showFullDescription = !this.showFullDescription;
  }
  goTodetail(art: any): void {
    const cleanedTitle = art.title
    .replace(/\u2013/g, '-')           // EN dash → hyphen
    .replace(/&/g, 'and')              // & → "and"
    .replace(/[^\w\s-]/g, '')          // Remove all non-word/space/dash chars
    .replace(/\s+/g, '-')              // Spaces → dashes
    .replace(/-+/g, '-')               // Collapse multiple dashes → one dash
    .toLowerCase()
    .trim();
  
     this.router.navigate(['/', this.selecytedCategory.value ,cleanedTitle, art.id]);
  }

    async goToCreator(artId: string) {
  // 1️⃣ Assure la session guest
  const isAuth = await this.authService.isLoggedInAsync();
  if (!isAuth) {
    await this.authService.checkOrCreateUserAndStoreSession();
  }

  // 2️⃣ Navigation après que l'utilisateur est prêt
  this.router.navigate(['/creator', artId]);
}
}
