import { AsyncPipe, CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  BackgroundModel,
  BackgroundState,
  SetBackgroundColor,
  SetBackgroundOpacity,
  SetBackgroundTexture,
} from '../../../services/background.state';
import { PexelsImage, PexelsService } from '../../../../shared/services/pexels.service';

@Component({
  selector: 'maker-tags-background-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AsyncPipe,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzSliderModule,
    NzSpinModule,
  ],
  templateUrl: './background-panel.component.html',
  styleUrl: './background-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgroundPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sentinel') sentinelRef!: ElementRef<HTMLDivElement>;

  readonly background$: Observable<BackgroundModel>;
  readonly customColors$: Observable<string[]>;

  textures: PexelsImage[] = [];
  loadingTextures = false;
  loadingMore = false;
  hasMore = true;
  currentSearchQuery = 'texture';
  currentPage = 1;
  selectedTexture: PexelsImage | null = null;

  readonly predefinedColors = ['#FFFFFF', '#F3EFE6', '#D4A574', '#1F1F1F', '#E8F4F8', '#5B8BBE'];
  readonly swatchColors = ['#7B68EE', '#FF69B4', '#FF6347', '#FF8C00', '#DAA520', '#8B4513'];

  private observer: IntersectionObserver | null = null;

  constructor(
    private readonly store: Store,
    private readonly unsplash: PexelsService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.background$ = this.store.select(BackgroundState.currentBackground);
    this.customColors$ = this.store.select(BackgroundState.customColors);
  }

  ngOnInit(): void {
    const keyword = this.extractArtKeyword();
    if (keyword) {
      this.currentSearchQuery = keyword;
      this.searchBackgrounds(keyword);
    } else {
      this.loadTrendingBackgrounds();
    }
  }

  private extractArtKeyword(): string | null {
    const doc = this.store.selectSnapshot((s: any) => s?.ArtDocState?.item);
    const category = (doc?.categorie as string | undefined)?.trim();
    if (!category || category === 'general') return null;
    return `background pattern`;
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  // ── Intersection observer ──────────────────────────────────────────────────

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !this.loadingMore && !this.loadingTextures && this.hasMore) {
          this.loadMoreTextures();
        }
      },
      { threshold: 0.1 },
    );

    if (this.sentinelRef?.nativeElement) {
      this.observer.observe(this.sentinelRef.nativeElement);
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  selectColor(color: string): void {
    this.store.dispatch(new SetBackgroundColor(color));
  }

  onCustomColorInput(value: string): void {
    this.store.dispatch(new SetBackgroundColor(value));
  }

  searchBackgrounds(query: string): void {
    const term = (query || '').trim();
    if (!term) return;

    this.loadingTextures = true;
    this.currentSearchQuery = term;
    this.currentPage = 1;
    this.textures = [];
    this.hasMore = true;
    this.cdr.markForCheck();

    this.unsplash
      .searchBackgrounds(term, this.currentPage)
      .pipe(finalize(() => { this.loadingTextures = false; this.cdr.markForCheck(); }))
      .subscribe((images) => {
        this.textures = images;
        this.hasMore = images.length > 0;
        this.cdr.markForCheck();
      });
  }

  loadTrendingBackgrounds(): void {
    this.loadingTextures = true;
    this.currentPage = 1;
    this.textures = [];
    this.hasMore = true;
    this.cdr.markForCheck();

    this.unsplash
      .getTrendingBackgrounds(this.currentPage)
      .pipe(finalize(() => { this.loadingTextures = false; this.cdr.markForCheck(); }))
      .subscribe((images) => {
        this.textures = images;
        this.hasMore = images.length > 0;
        this.cdr.markForCheck();
      });
  }

  loadMoreTextures(): void {
    if (this.loadingMore || !this.hasMore) return;
    this.loadingMore = true;
    this.currentPage += 1;
    this.cdr.markForCheck();

    this.unsplash
      .searchBackgrounds(this.currentSearchQuery, this.currentPage)
      .pipe(finalize(() => { this.loadingMore = false; this.cdr.markForCheck(); }))
      .subscribe((images) => {
        if (images.length === 0) {
          this.hasMore = false;
        } else {
          this.textures = [...this.textures, ...images];
        }
        this.cdr.markForCheck();
      });
  }

  selectTexture(image: PexelsImage): void {
    this.selectedTexture = image;
    this.store.dispatch(new SetBackgroundTexture(image.urls.regular));
  }

  onOpacityChange(value: number): void {
    this.store.dispatch(new SetBackgroundOpacity(value / 100));
  }

  textureAttribution(image: PexelsImage): string {
    return `Photo by ${image.photographer} on Pexels`;
  }

  trackTexture(_index: number, image: PexelsImage): string {
    return image.id;
  }
}
