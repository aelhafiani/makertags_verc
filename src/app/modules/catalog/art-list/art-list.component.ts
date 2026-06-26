import { Component,  inject,  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzCardModule } from 'ng-zorro-antd/card';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Observable, of } from 'rxjs';
import { NzFormModule } from 'ng-zorro-antd/form';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MetaService } from '../../shared/services/meta.service';
import { ArtDocsService } from '../../shared/services/art-docs.service';
import { CategoriesService, Category } from '../../shared/services/categories.service';
import { AuthService } from '../../shared/services/auth.service';
import { TranslateContentPipe } from '../../shared/pipes/translate-content.pipe';
import { TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';



@Component({
  selector: 'maker-tags-art-list',
  standalone: true, 
  imports: [CommonModule, NzLayoutModule, NzCardModule, RouterModule, NzSelectModule, ReactiveFormsModule, NzFormModule, TranslateContentPipe],
  templateUrl: './art-list.component.html',
  styleUrl: './art-list.component.css',
})
export class ArtListComponent implements OnInit  {
  private transloco = inject(TranslocoService);
  activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  sanitizer = inject(DomSanitizer);
  filterForm: FormGroup  = new FormGroup({});
  arts:any;
  artsList:any[] = []
  masonryInstance: any;
  // Define categories as an array of objects with label and value
    categories: Category[] = [];
  // Sizes array
  sizes = [
    { label: 'All', value: null },
    { label: 'Business Card Size', value: '2 x 3.5' },
    { label: 'Square', value: '2 x 2' },
    { label: 'Rectangular', value: '1.75 x 3.75' },
    { label: 'Rec Smaller than Business Card Size', value: '2 x 3' },
  ];
    private getSafeDescription(description: string): SafeHtml {
    const short = description?.slice(0, 100) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(short);
  }
  constructor(
    private artDocsService:ArtDocsService,
    private fb: FormBuilder,  
    private router:Router, 
    private activeRoute:ActivatedRoute,
    private metaService:MetaService,
    private categoriesService:CategoriesService,
    private authService:AuthService
  ){
    const artLists = this.activeRoute.snapshot.data['artList'];
 
    this.setArts(artLists);
  }

  ngOnInit():void{
    this.loadCategories();
    this.metaService.updateMeta('GIft Tags Art List', 'Art List', 'https://tagprintly.com/assets/images/logo-text.png', 'art, list, tags');
  // this.getArtsList()
  this.filterForm = this.fb.group({
    category: [null],
    size: [null],
    popular: [null],
  });

    // Trigger filtering whenever the form changes
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300), // Wait for 300ms before applying the filter
        distinctUntilChanged() // Prevent duplicate consecutive triggers
      )
      .subscribe((filters) => {
        this.artDocsService.getFilteredArts(filters).subscribe((arts) => {
          this.arts = arts;
        })
       });
}

  setArts(rawArts: any[]) {
    this.arts = rawArts.map(art => ({
      ...art,
      safeDescription: this.getSafeDescription(art.description)
    }));
  }

  visible = false;
    async loadCategories() { 
      this.categories = await this.categoriesService.getVisibleCategories();
  }
  open(): void {
    this.visible = true;
  }

  close(): void {
    this.visible = false;
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
  
    const id = art.firestore_id ? art.firestore_id : art.id;
    this.router.navigate(['/',art.categorie, cleanedTitle,id]);
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
