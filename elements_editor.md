# Elements Panel — Plan d'implémentation (style Zazzle)

## Référence visuelle (Zazzle)

Le panel "Décorer" de Zazzle fonctionne en **deux vues** :

**Vue principale (Home)**
- Barre de recherche globale en haut
- Section "Formes dynamiques" : rangée de formes de base (carré, cercle, triangle…)
- Pour chaque catégorie d'assets :
  - Titre de catégorie + bouton **"See more →"**
  - Une rangée horizontale de ~4 aperçus (preview strip)
- Clic "See more" → bascule vers la vue catégorie

**Vue catégorie (Drill-down)**
- Flèche retour ← + titre de la catégorie
- Barre de recherche filtrée sur cette catégorie
- Grille pleine d'images (toutes les images de la catégorie)

---

## Architecture existante à réutiliser

| Élément | Fichier | Notes |
|---|---|---|
| **Data source** | `ArtDocsService.getImagesByCategotiries()` | Retourne tous les assets depuis `assets_images` table Supabase, avec champ `categorie` et `source` (URL) |
| **Placement canvas** | `author.component.ts:addImage()` | Gère image raster via `FabricImage.fromURL` ET SVG via `loadSVGFromURL` + `util.groupSVGElements` — à copier dans le nouveau service |
| **Routing panel** | `contextual-panel.component.ts` | `TOOL_TO_COMPONENT` map, `ToolId = 'elements'` déjà défini dans `editor-shell.state.ts` |
| **CanvasProviderService** | `canvas-provider.service.ts` | Accès au canvas Fabric live |
| **CanvasHistoryService** | `canvas-history.service.ts` | Pour `push('object:added')` après ajout |
| **Ancien composant** | `add-elements.component.ts` | Utilise `CanvasUtilsService.setAddElementEvent()` — **ne pas réutiliser** ce mécanisme, brancher directement sur `CanvasProviderService` |

---

## Ce qui doit être créé

### Nouveau composant : `elements-panel`

```
src/app/modules/author/components/panels/elements-panel/
  elements-panel.component.ts
  elements-panel.component.html
  elements-panel.component.scss
```

**Ne pas modifier** `add-elements.component.ts` — créer un composant neuf dans `panels/`.

---

## Modèle de données

```ts
interface AssetItem {
  id: string;
  source: string;      // URL de l'image/SVG dans Supabase Storage
  categorie: string;   // ex: 'graphique', 'sticker', 'arrow', 'texte', 'models'
  type: string;        // 'svg' | 'image' — détermine comment l'ajouter au canvas
  name?: string;       // optionnel, pour l'aria-label
}

interface CategoryGroup {
  categorie: string;
  items: AssetItem[];
}
```

Les données viennent directement de `ArtDocsService.getImagesByCategotiries()` — grouper par `categorie` avec `lodash.groupBy` (déjà utilisé dans l'ancien composant).

---

## Structure du composant

### États internes

```ts
// Vue active
view: 'home' | 'category' = 'home';

// Données
allGroups: CategoryGroup[] = [];       // toutes les catégories
activeGroup: CategoryGroup | null = null; // catégorie en cours de drill-down

// Recherche
searchQuery = '';

// UI
loading = true;
```

### Formes de base (statiques, pas de Supabase)

```ts
readonly basicShapes = [
  { type: 'rect',     label: 'Rectangle', icon: 'border' },
  { type: 'rect-r',   label: 'Rounded',   icon: 'border' },
  { type: 'circle',   label: 'Circle',    icon: 'border' },
  { type: 'triangle', label: 'Triangle',  icon: 'border' },
  { type: 'line',     label: 'Line',      icon: 'line' },
];
```

Ces formes sont ajoutées au canvas via Fabric directement (Rect, Circle, Triangle, Line) — pas via Supabase.

---

## Vue principale (Home)

### Template structure

```
<section class="elements-panel">

  <!-- Search bar -->
  <input type="search" placeholder="Search elements..." [(ngModel)]="searchQuery" />

  <!-- Basic shapes strip -->
  <div class="section-header"><h4>Shapes</h4></div>
  <div class="shapes-strip">
    <button *ngFor="let shape of basicShapes" (click)="addShape(shape.type)">
      <span nz-icon [nzType]="shape.icon"></span>
    </button>
  </div>

  <!-- Category strips (when NOT searching) -->
  <ng-container *ngIf="!searchQuery">
    <div *ngFor="let group of allGroups" class="category-section">
      <div class="section-header">
        <h4>{{ group.categorie | titlecase }}</h4>
        <button (click)="openCategory(group)">See more →</button>
      </div>
      <div class="preview-strip">
        <img *ngFor="let item of group.items | slice:0:4"
             [src]="item.source"
             (click)="addAsset(item)"
             loading="lazy" />
      </div>
    </div>
  </ng-container>

  <!-- Search results (when searching) -->
  <ng-container *ngIf="searchQuery">
    <div class="search-results-grid">
      <img *ngFor="let item of filteredItems"
           [src]="item.source"
           (click)="addAsset(item)"
           loading="lazy" />
    </div>
  </ng-container>

</section>
```

### Computed: `filteredItems`

```ts
get filteredItems(): AssetItem[] {
  if (!this.searchQuery.trim()) return [];
  const q = this.searchQuery.toLowerCase();
  return this.allGroups
    .flatMap(g => g.items)
    .filter(item =>
      item.categorie.toLowerCase().includes(q) ||
      (item.name ?? '').toLowerCase().includes(q)
    );
}
```

---

## Vue catégorie (Drill-down)

### Activation

```ts
openCategory(group: CategoryGroup): void {
  this.activeGroup = group;
  this.view = 'category';
  this.searchQuery = '';
}

goBack(): void {
  this.view = 'home';
  this.activeGroup = null;
  this.searchQuery = '';
}
```

### Template structure

```
<section class="elements-panel">

  <!-- Header with back button -->
  <div class="category-header">
    <button (click)="goBack()">← Back</button>
    <h3>{{ activeGroup.categorie | titlecase }}</h3>
  </div>

  <!-- Search within category -->
  <input type="search" placeholder="Search in {{ activeGroup.categorie }}..."
         [(ngModel)]="searchQuery" />

  <!-- Full grid -->
  <div class="assets-grid">
    <img *ngFor="let item of categoryFilteredItems"
         [src]="item.source"
         (click)="addAsset(item)"
         loading="lazy" />
  </div>

</section>
```

### Computed: `categoryFilteredItems`

```ts
get categoryFilteredItems(): AssetItem[] {
  const items = this.activeGroup?.items ?? [];
  if (!this.searchQuery.trim()) return items;
  const q = this.searchQuery.toLowerCase();
  return items.filter(item =>
    (item.name ?? '').toLowerCase().includes(q)
  );
}
```

---

## Placement sur le canvas

### Logique à reproduire depuis `author.component.ts:addImage()`

```ts
async addAsset(item: AssetItem): Promise<void> {
  const canvas = this.canvasProvider.canvas;
  if (!canvas) return;

  if (item.type === 'svg') {
    // SVG : loadSVGFromURL + groupSVGElements
    const { objects, options } = await loadSVGFromURL(item.source);
    const validObjects = objects.filter((o): o is FabricObject => o !== null);
    const group = util.groupSVGElements(validObjects, options);
    this.centerAndScale(group, canvas);
    canvas.add(group);
  } else {
    // Raster image
    const img = await FabricImage.fromURL(item.source, { crossOrigin: 'anonymous' });
    this.centerAndScale(img, canvas);
    canvas.add(img);
  }

  canvas.requestRenderAll();
  this.history.push('object:added');
}

private centerAndScale(obj: FabricObject, canvas: Canvas): void {
  // Scale down to max 40% of canvas width, preserve ratio
  const maxW = canvas.getWidth() * 0.4;
  const scale = obj.width > maxW ? maxW / obj.width : 1;
  obj.set({
    scaleX: scale,
    scaleY: scale,
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: 'center',
    originY: 'center',
    id: nanoid(),
  });
}
```

### Formes de base via Fabric API (pas Supabase)

```ts
addShape(type: string): void {
  const canvas = this.canvasProvider.canvas;
  if (!canvas) return;

  const cx = canvas.getWidth() / 2;
  const cy = canvas.getHeight() / 2;
  const commonProps = { left: cx, top: cy, originX: 'center', originY: 'center',
                        fill: '#cccccc', id: nanoid() };

  let shape: FabricObject;
  switch (type) {
    case 'rect':   shape = new Rect({ ...commonProps, width: 120, height: 80 }); break;
    case 'rect-r': shape = new Rect({ ...commonProps, width: 120, height: 80, rx: 16, ry: 16 }); break;
    case 'circle': shape = new Circle({ ...commonProps, radius: 60 }); break;
    case 'triangle': shape = new Triangle({ ...commonProps, width: 100, height: 100 }); break;
    case 'line':   shape = new Line([cx-60, cy, cx+60, cy], { stroke: '#333', strokeWidth: 2, id: nanoid() }); break;
    default: return;
  }

  canvas.add(shape);
  canvas.setActiveObject(shape);
  canvas.requestRenderAll();
  this.history.push('object:added');
}
```

---

## Injection

```ts
constructor(
  private readonly artDocsService: ArtDocsService,
  private readonly canvasProvider: CanvasProviderService,
  private readonly history: CanvasHistoryService,
  private readonly cdr: ChangeDetectorRef,
) {}
```

---

## Intégration dans le routing des panels

Dans `contextual-panel.component.ts`, ajouter :

```ts
import { ElementsPanelComponent } from '../../panels/elements-panel/elements-panel.component';

const TOOL_TO_COMPONENT: Partial<Record<ToolId, Type<unknown>>> = {
  // ...existants...
  elements: ElementsPanelComponent,
};
```

Et ajouter `ElementsPanelComponent` dans `imports: []` du composant.

---

## Styles CSS (éléments clés)

```scss
// Home view
.preview-strip {
  display: flex;
  gap: 8px;
  overflow-x: hidden;  // pas de scroll horizontal — on montre 4 items max

  img {
    width: 64px;
    height: 64px;
    object-fit: contain;
    border-radius: 8px;
    cursor: pointer;
    background: #f3f4f6;
    padding: 4px;
    &:hover { background: #dbeafe; }
  }
}

// Category view
.assets-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: contain;
    border-radius: 8px;
    cursor: pointer;
    background: #f3f4f6;
    padding: 6px;
    &:hover { background: #dbeafe; }
  }
}

// Shapes strip
.shapes-strip {
  display: flex;
  gap: 10px;

  button {
    width: 52px;
    height: 52px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #f9fafb;
    cursor: pointer;
    &:hover { border-color: #93c5fd; background: #eff6ff; }
  }
}
```

---

## Ordre d'implémentation

1. Créer `elements-panel.component.ts/html/scss` avec structure vide
2. Brancher `ArtDocsService.getImagesByCategotiries()` → grouper → afficher vue home
3. Implémenter les formes de base (statiques)
4. Implémenter `addAsset()` pour images et SVG via `CanvasProviderService`
5. Implémenter `addShape()` via Fabric API directe
6. Implémenter drill-down (openCategory / goBack)
7. Implémenter la recherche (home globale + catégorie locale)
8. Brancher dans `contextual-panel.component.ts`
9. Styles

---

## Points d'attention

- **SVG vs image** : le champ `type` dans `assets_images` détermine la méthode d'ajout. Si `type` manque, détecter via l'extension de `source` (`.svg` → SVG, sinon raster).
- **Filtre `models`** : dans l'ancien composant, la catégorie `models` était cachée aux non-admins. Reproduire ce comportement via `AuthService.isAdmin$`.
- **`nanoid()`** : assigner un `id` à chaque objet Fabric ajouté pour que le panel Layers puisse l'identifier.
- **ChangeDetectionStrategy.OnPush** : utiliser `cdr.markForCheck()` après chargement async.
- **Pas de `CanvasUtilsService`** : l'ancien composant utilisait `setAddElementEvent` (event bus). Dans le nouveau, appeler directement `CanvasProviderService.canvas` — plus simple, plus traçable.
