# Background Panel — MakerTags Editor

## Overview
Implémente un panneau de gestion de les arrière-plans (background) dans l'éditeur, similaire à Zazzle. Permet aux utilisateurs de :
- Chercher et appliquer des textures depuis Unsplash
- Sélectionner des couleurs prédéfinies ou custom
- Gérer une palette de swatches personnalisés
- Appliquer dégradés et motifs

---

## Architecture

### Composant Principal
**Location**: `src/app/modules/author/components/panels/add-text-panel/background-panel.component.ts`
*(NOTE: Renommer le dossier `add-text-panel` → `background-panel` ou créer `background-panel/`)*

### Services
- **`UnsplashService`** — Requêtes images Unsplash (caching, pagination)
- **`BackgroundStateService`** — NGXS sub-state pour background (couleur, texture, gradient)
- **`FabricBackgroundAdapter`** — Applique les changements sur `fabric.Canvas`

---

## API Unsplash Integration

### Configuration
```typescript
// environment.ts
export const environment = {
  unsplash: {
    accessKey: 'YOUR_UNSPLASH_ACCESS_KEY',
    baseUrl: 'https://api.unsplash.com',
    defaultQuery: 'texture',
    resultsPerPage: 12,
    cacheDuration: 3600000 // 1 hour
  }
};
```

### UnsplashService
```typescript
// src/app/shared/services/unsplash.service.ts

@Injectable({ providedIn: 'root' })
export class UnsplashService {
  private readonly httpClient = inject(HttpClient);
  private readonly config = inject(ENVIRONMENT);
  private cache = new Map<string, UnsplashResponse>();

  searchBackgrounds(
    query: string = 'texture',
    page: number = 1,
    perPage: number = 12
  ): Observable<UnsplashImage[]> {
    const cacheKey = `${query}:${page}`;

    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!.results);
    }

    return this.httpClient.get<UnsplashResponse>(
      `${this.config.unsplash.baseUrl}/search/photos`,
      {
        params: {
          query,
          page: page.toString(),
          per_page: perPage.toString(),
          client_id: this.config.unsplash.accessKey,
          orientation: 'landscape'
        }
      }
    ).pipe(
      tap(response => this.cache.set(cacheKey, response)),
      map(response => response.results),
      catchError(() => of([]))
    );
  }

  getTrendingBackgrounds(page: number = 1): Observable<UnsplashImage[]> {
    return this.searchBackgrounds('texture wave abstract marble', page);
  }

  // Clear cache après période expiration
  private clearExpiredCache(): void {
    // TODO: Implémenter avec timestamps
  }
}

export interface UnsplashImage {
  id: string;
  urls: {
    thumb: string;    // 200×200
    regular: string;  // ~1080×720
    full: string;     // ~7680×5120
  };
  user: {
    name: string;
    username: string;
  };
  links: {
    download: string; // Lien pour créditer
  };
}
```

---

## State Management (NGXS)

### BackgroundState
```typescript
// src/app/modules/author/state/background.state.ts

export interface BackgroundModel {
  type: 'color' | 'texture' | 'gradient';
  value: string; // hex color, image URL, ou gradient def
  opacity: number; // 0-1
  pattern?: 'solid' | 'tile' | 'scale';
  customColors: string[]; // Historique custom colors
  swatches: Swatch[]; // Palettes sauvegardées
}

export interface Swatch {
  id: string;
  name: string;
  colors: string[];
}

@State<BackgroundModel>({
  name: 'background',
  defaults: {
    type: 'color',
    value: '#FFFFFF',
    opacity: 1,
    customColors: [],
    swatches: [
      { id: 'default1', name: 'Warm', colors: ['#F3EFE6', '#D4A574', '#1F1F1F'] },
      { id: 'default2', name: 'Cool', colors: ['#E8F4F8', '#5B8BBE', '#1F1F1F'] }
    ]
  }
})
@Injectable()
export class BackgroundState {

  @Selector()
  static currentBackground(state: BackgroundModel) {
    return state;
  }

  @Selector()
  static customColors(state: BackgroundModel) {
    return state.customColors;
  }

  @Action(SetBackgroundColor)
  setColor(ctx: StateContext<BackgroundModel>, action: SetBackgroundColor) {
    const state = ctx.getState();
    ctx.patchState({
      type: 'color',
      value: action.color,
      customColors: [action.color, ...state.customColors].slice(0, 10)
    });
  }

  @Action(SetBackgroundTexture)
  setTexture(ctx: StateContext<BackgroundModel>, action: SetBackgroundTexture) {
    ctx.patchState({
      type: 'texture',
      value: action.imageUrl
    });
  }

  @Action(SetBackgroundOpacity)
  setOpacity(ctx: StateContext<BackgroundModel>, action: SetBackgroundOpacity) {
    ctx.patchState({ opacity: action.opacity });
  }
}

export class SetBackgroundColor { static readonly type = '[Background] Set Color'; constructor(public color: string) {} }
export class SetBackgroundTexture { static readonly type = '[Background] Set Texture'; constructor(public imageUrl: string) {} }
export class SetBackgroundOpacity { static readonly type = '[Background] Set Opacity'; constructor(public opacity: number) {} }
```

---

## UI Component

### BackgroundPanelComponent
```typescript
// src/app/modules/author/components/panels/background-panel/background-panel.component.ts

@Component({
  selector: 'app-background-panel',
  templateUrl: './background-panel.component.html',
  styleUrls: ['./background-panel.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NzInputModule,
    NzColorPickerModule,
    NzSliderModule,
    NzSpinModule,
    NzMenuModule,
    FormsModule
  ]
})
export class BackgroundPanelComponent implements OnInit {
  private store = inject(Store);
  private unsplash = inject(UnsplashService);

  // State
  background$ = this.store.select(BackgroundState.currentBackground);
  customColors$ = this.store.select(BackgroundState.customColors);

  textures$: Observable<UnsplashImage[]>;
  loadingTextures = false;
  currentSearchQuery = 'texture';
  currentPage = 1;

  // UI
  expanded = {
    customColor: false,
    swatches: false,
    backgrounds: false
  };

  @ViewChild('colorPickerRef') colorPicker: any;

  ngOnInit() {
    this.loadTrendingBackgrounds();
  }

  // ===== COULEUR =====
  selectColor(color: string) {
    this.store.dispatch(new SetBackgroundColor(color));
  }

  onColorChange(color: string) {
    this.selectColor(color);
  }

  addCustomColor(color: string) {
    this.selectColor(color);
  }

  // ===== TEXTURES =====
  searchBackgrounds(query: string) {
    if (!query.trim()) return;
    this.loadingTextures = true;
    this.currentSearchQuery = query;
    this.currentPage = 1;

    this.textures$ = this.unsplash.searchBackgrounds(query).pipe(
      finalize(() => this.loadingTextures = false)
    );
  }

  loadTrendingBackgrounds() {
    this.loadingTextures = true;
    this.textures$ = this.unsplash.getTrendingBackgrounds().pipe(
      finalize(() => this.loadingTextures = false)
    );
  }

  selectTexture(image: UnsplashImage) {
    this.store.dispatch(new SetBackgroundTexture(image.urls.regular));
  }

  loadMoreTextures() {
    this.currentPage++;
    this.unsplash.searchBackgrounds(this.currentSearchQuery, this.currentPage).subscribe(
      images => {
        this.textures$ = combineLatest([this.textures$, of(images)]).pipe(
          map(([prev, next]) => [...prev, ...next])
        );
      }
    );
  }

  // ===== OPACITÉ =====
  onOpacityChange(opacity: number) {
    this.store.dispatch(new SetBackgroundOpacity(opacity / 100));
  }
}
```

### Template
```html
<!-- background-panel.component.html -->

<div class="background-panel" *ngLet="background$ | async as bg">

  <!-- Search Bar -->
  <div class="search-section">
    <nz-input-group nzSearch nzSize="large" [nzAddOnAfter]="searchBtn">
      <input
        type="text"
        nz-input
        placeholder="Search for backgrounds"
        (keyup.enter)="searchBackgrounds($event.target.value)"
        [value]="currentSearchQuery"
      />
    </nz-input-group>
    <ng-template #searchBtn>
      <button nz-button nzType="primary" nzSearch>
        <span nz-icon nzType="search"></span>
      </button>
    </ng-template>
  </div>

  <!-- Predefined Colors -->
  <div class="color-swatches">
    <button
      *ngFor="let color of ['#FFFFFF', '#F3EFE6', '#D4A574', '#1F1F1F']"
      class="color-button"
      [style.backgroundColor]="color"
      [class.active]="bg.type === 'color' && bg.value === color"
      (click)="selectColor(color)"
      nz-tooltip
      [nzTitle]="color"
    ></button>
  </div>

  <!-- Custom Color -->
  <div class="custom-color-section">
    <div class="section-header" (click)="expanded.customColor = !expanded.customColor">
      <span>Custom color</span>
      <span class="chevron" [class.open]="expanded.customColor">›</span>
    </div>

    <div *ngIf="expanded.customColor" class="content">
      <nz-color-picker
        [(ngModel)]="bg.value"
        (ngModelChange)="onColorChange($event)"
        [nzSize]="'large'"
      ></nz-color-picker>
      <div class="hex-input">
        <input
          type="text"
          nz-input
          [(ngModel)]="bg.value"
          (ngModelChange)="onColorChange($event)"
          placeholder="#F3EFE6"
        />
      </div>
    </div>
  </div>

  <!-- Swatches / Palettes -->
  <div class="swatches-section">
    <div class="section-header" (click)="expanded.swatches = !expanded.swatches">
      <span>Available colors</span>
      <span class="chevron" [class.open]="expanded.swatches">›</span>
    </div>

    <div *ngIf="expanded.swatches" class="content">
      <div class="swatch-grid">
        <button
          *ngFor="let color of ['#7B68EE', '#FF69B4', '#FF6347', '#FF8C00', '#DAA520', '#8B4513']"
          class="color-button"
          [style.backgroundColor]="color"
          [class.active]="bg.type === 'color' && bg.value === color"
          (click)="selectColor(color)"
        ></button>
      </div>
    </div>
  </div>

  <!-- Textures from Unsplash -->
  <div class="backgrounds-section">
    <div class="section-header" (click)="expanded.backgrounds = !expanded.backgrounds">
      <span>Textures & Patterns</span>
      <span class="chevron" [class.open]="expanded.backgrounds">›</span>
    </div>

    <div *ngIf="expanded.backgrounds" class="content">
      <nz-spin [nzSimple]="true" [nzSpinning]="loadingTextures">
        <div class="texture-grid">
          <div
            *ngFor="let texture of textures$ | async"
            class="texture-thumbnail"
            [class.active]="bg.type === 'texture' && bg.value === texture.urls.regular"
            (click)="selectTexture(texture)"
            [style.backgroundImage]="'url(' + texture.urls.thumb + ')'"
            nz-tooltip
            [nzTitle]="texture.user.name"
          ></div>
        </div>

        <button
          *ngIf="(textures$ | async)?.length"
          nz-button
          nzBlock
          nzType="link"
          (click)="loadMoreTextures()"
        >
          Load More
        </button>
      </nz-spin>
    </div>
  </div>

  <!-- Opacity Slider -->
  <div class="opacity-section" *ngIf="bg.type !== 'color'">
    <label>Opacity</label>
    <nz-slider
      [(ngModel)]="bg.opacity"
      (ngModelChange)="onOpacityChange($event)"
      [nzMin]="0"
      [nzMax]="100"
      [nzStep]="1"
    ></nz-slider>
  </div>

</div>
```

### Styles
```scss
// background-panel.component.scss

.background-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  max-width: 320px;

  .search-section {
    margin-bottom: 8px;
  }

  .color-swatches {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 8px;

    .color-button {
      width: 100%;
      aspect-ratio: 1;
      border: 2px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: scale(1.05);
      }

      &.active {
        border-color: #1890ff;
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
      }
    }
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
    cursor: pointer;
    padding: 8px 0;
    user-select: none;

    .chevron {
      display: inline-block;
      transition: transform 0.2s;
      font-size: 18px;

      &.open {
        transform: rotate(90deg);
      }
    }
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
  }

  .custom-color-section,
  .swatches-section,
  .backgrounds-section {
    border-top: 1px solid #f0f0f0;
    padding-top: 12px;
  }

  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;

    .color-button {
      width: 100%;
      aspect-ratio: 1;
      border: 2px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: scale(1.1);
      }

      &.active {
        border-color: #1890ff;
      }
    }
  }

  .texture-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;

    .texture-thumbnail {
      aspect-ratio: 1;
      background-size: cover;
      background-position: center;
      border: 2px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: scale(1.05);
      }

      &.active {
        border-color: #1890ff;
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
      }
    }
  }

  .opacity-section {
    border-top: 1px solid #f0f0f0;
    padding-top: 12px;

    label {
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.65);
    }
  }
}
```

---

## FabricBackgroundAdapter

```typescript
// src/app/shared/services/fabric-background.adapter.ts

@Injectable({ providedIn: 'root' })
export class FabricBackgroundAdapter {

  applyBackground(canvas: fabric.Canvas, background: BackgroundModel) {
    switch (background.type) {
      case 'color':
        canvas.setBackgroundColor(
          this.hexToRgb(background.value, background.opacity),
          () => canvas.renderAll()
        );
        break;

      case 'texture':
        fabric.Image.fromURL(background.value, (img) => {
          img.scaleToWidth(canvas.width!);
          canvas.setBackgroundImage(img, () => canvas.renderAll());
        });
        break;
    }
  }

  private hexToRgb(hex: string, alpha: number = 1): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
```

---

## Integration with EditorShellComponent

```typescript
// src/app/modules/author/components/shell/editor-shell.component.ts

export class EditorShellComponent implements OnInit {
  private store = inject(Store);
  private fabricAdapter = inject(FabricBackgroundAdapter);

  ngOnInit() {
    // Écouter les changements de background NGXS
    this.store.select(BackgroundState.currentBackground).subscribe(bg => {
      this.fabricAdapter.applyBackground(this.fabricCanvas, bg);
    });
  }
}
```

---

## Credits & Attribution (Unsplash)

Chaque image doit inclure une attribution Unsplash. Format recommandé :
```
Photo by [Name] on Unsplash
```

Ajouter un footer ou modal pour attribution si stockage local ou export.

---

## TODO / Next Steps

- [ ] Tester intégration Unsplash (rate limits, caching)
- [ ] Ajouter support gradients (`linear-gradient`, `radial-gradient`)
- [ ] Sauvegarder swatches personalisés en localStorage / Supabase
- [ ] Implémenter patterns CSS (chevrons, damier, pointillés, etc.)
- [ ] Animation smooth lors du changement de background
- [ ] Support HEIC/WEBP pour unsplash search
- [ ] Optimiser performance (lazy load texture grid)
