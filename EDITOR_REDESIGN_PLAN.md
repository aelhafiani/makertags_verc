# TagPrintly — Plan de Redesign de l'Éditeur (Dashboard Angular)

> **Objectif** : Transformer l'éditeur Angular actuel (bottom-tabs) en une expérience proche de Zazzle — sidebar gauche, panels contextuels, toolbar flottante, et nouvelle feature "Personalize your design" auto-générée depuis `fields_config`.

---

## Table des matières

1. [Analyse de l'existant](#1-analyse-de-lexistant)
2. [Vision cible — inspirée de Zazzle](#2-vision-cible--inspirée-de-zazzle)
3. [Architecture des composants Angular](#3-architecture-des-composants-angular)
4. [Chantier 1 — Layout global](#4-chantier-1--layout-global)
5. [Chantier 2 — Sidebar gauche](#5-chantier-2--sidebar-gauche)
6. [Chantier 3 — Panel Edit / Personalize (NOUVELLE FEATURE)](#6-chantier-3--panel-edit--personalize-nouvelle-feature)
7. [Chantier 4 — Panel Text (Add Text)](#7-chantier-4--panel-text-add-text)
8. [Chantier 5 — Panel Image (Add Image)](#8-chantier-5--panel-image-add-image)
9. [Chantier 6 — Panel Background](#9-chantier-6--panel-background)
10. [Chantier 7 — Panel Elements](#10-chantier-7--panel-elements)
11. [Chantier 8 — Panel Icons](#11-chantier-8--panel-icons)
12. [Chantier 9 — Panel Layers](#12-chantier-9--panel-layers)
13. [Chantier 10 — Toolbar contextuelle flottante](#13-chantier-10--toolbar-contextuelle-flottante)
14. [Chantier 11 — Topbar redesign](#14-chantier-11--topbar-redesign)
15. [Tokens de design & SCSS](#15-tokens-de-design--scss)
16. [Ordre d'implémentation & estimations](#16-ordre-dimplémentation--estimations)
17. [Phase 2 — Mobile responsive](#17-phase-2--mobile-responsive)

---

## 1. Analyse de l'existant

### Structure actuelle

```
EditorComponent
├── Topbar : Logo | Save Art (bleu) | Share (jaune) | Actions ▾ | Avatar
├── Canvas zone : fond gris #636363, tag centré, dashed border
└── Bottom toolbar (4 onglets fixes) :
    ├── Text (icône T)
    ├── Elements (icône ⊞)
    ├── Marque (icône tampon)
    └── Import (icône upload)
```

### Problèmes identifiés

- **Pas de panel "Personalize"** — l'utilisateur ne peut pas éditer facilement les champs texte du template depuis un formulaire dédié (feature clé de Zazzle).
- **Bottom-tabs** — pattern mobile/web-app, pas adapté à un éditeur de création desktop qui a besoin de plus d'espace horizontal.
- **Pas de toolbar contextuelle** — quand on sélectionne un objet Fabric.js, aucune toolbar flottante n'apparaît pour éditer font/couleur/taille directement.
- **Pas de panel Layers** visible dans l'onglet actuel.
- **Pas de panel Background** avec color picker dans la version actuelle.
- **Pas de panel Icons** séparé.

### Ce qui fonctionne déjà (à conserver)

- Canvas Fabric.js fonctionnel avec objets décoratifs et champs éditables.
- Séparation `svg_template` (décoratif) / `fields_config` (éditables) déjà en place.
- Import depuis Fabric.js JSON opérationnel.
- Preview mobile simulée déjà présente.

---

## 2. Vision cible — inspirée de Zazzle

### Layout desktop (≥1024px)

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOPBAR  [Logo] [Titre template] [●Saved] [Design|Options|Review]   │
│                          [Undo][Redo]  [Preview]  [Next: Design Back]│
├────────┬──────────────┬────────────────────────────┬────────────────┤
│        │              │                            │                │
│ SIDE   │   PANEL      │        CANVAS              │   MINI         │
│ BAR    │  CONTEXTUEL  │    (fond gris neutre)      │  PREVIEW       │
│ 72px   │   260px      │                            │   Front/Back   │
│        │              │   [tag centré]             │   140px        │
│ Edit   │  s'ouvre     │                            │                │
│ Text   │  selon outil │   Toolbar flottante        │                │
│ Image  │  actif       │   au-dessus sélection      │                │
│ Bckgnd │              │                            │                │
│ Elems  │  animation   │                            │                │
│ Icons  │  slide-in    │                            │                │
│ Layers │  260ms ease  │                            │                │
│        │              │                            │                │
└────────┴──────────────┴────────────────────────────┴────────────────┘
│  BOTTOMBAR (optionnel) : Zoom - 100% + | ⚙ | ? | ⬆ | ⬜          │
└─────────────────────────────────────────────────────────────────────┘
```

### Principes UX à respecter

1. **Un seul panel ouvert à la fois** — cliquer sur un autre outil ferme le panel actuel et ouvre le nouveau.
2. **La toolbar contextuelle flotte** au-dessus de l'objet sélectionné — elle n'occupe pas de place permanente.
3. **Le panel Edit** est l'entrée principale — il s'ouvre par défaut au chargement du template.
4. **Le canvas est toujours visible** — les panels et sidebars ne doivent jamais couvrir le canvas.
5. **Le mini-preview Front/Back** (colonne droite) reste visible en permanence.

---

## 3. Architecture des composants Angular

### Arborescence cible

```
src/app/editor/
├── editor.component.ts            ← composant racine (layout shell)
├── editor.component.html
├── editor.component.scss
│
├── topbar/
│   └── editor-topbar.component.ts
│
├── sidebar/
│   └── editor-sidebar.component.ts      ← 7 icônes verticales
│
├── panels/
│   ├── panel-host.component.ts          ← wrapper + animation slide-in
│   ├── panel-edit.component.ts          ← Personalize your design ← NEW
│   ├── panel-text.component.ts          ← Add Text
│   ├── panel-image.component.ts         ← Add Image
│   ├── panel-background.component.ts    ← Background + color picker
│   ├── panel-elements.component.ts      ← Elements grid
│   ├── panel-icons.component.ts         ← Icons search
│   └── panel-layers.component.ts        ← Layers list + drag
│
├── canvas/
│   ├── editor-canvas.component.ts       ← Fabric.js canvas wrapper
│   └── contextual-toolbar.component.ts  ← toolbar flottante ← NEW
│
├── mini-preview/
│   └── mini-preview.component.ts        ← Front/Back thumbnails
│
├── services/
│   ├── editor-state.service.ts          ← état global (outil actif, sélection)
│   ├── fabric-canvas.service.ts         ← API Fabric.js
│   └── fields.service.ts                ← lecture/écriture fields_config
│
└── models/
    ├── editor-tool.enum.ts
    ├── field-config.model.ts
    └── canvas-object.model.ts
```

### Service d'état — EditorStateService

```typescript
// editor-tool.enum.ts
export enum EditorTool {
  EDIT = 'edit',        // Personalize
  TEXT = 'text',
  IMAGE = 'image',
  BACKGROUND = 'background',
  ELEMENTS = 'elements',
  ICONS = 'icons',
  LAYERS = 'layers',
}

// editor-state.service.ts
interface EditorState {
  activeTool: EditorTool;
  selectedObjectId: string | null;
  selectedObjectType: 'text' | 'image' | 'shape' | null;
  isPanelOpen: boolean;
  zoom: number;
  isDirty: boolean;
}
```

---

## 4. Chantier 1 — Layout global

### Objectif

Remplacer le layout `bottom-tabs` par un layout CSS Grid à 4 colonnes.

### HTML — editor.component.html

```html
<div class="editor-shell">
  <app-editor-topbar class="editor-topbar" />

  <div class="editor-body">
    <app-editor-sidebar class="editor-sidebar" />

    <app-panel-host class="editor-panel"
      [activeTool]="state.activeTool"
      [@panelSlide]="state.isPanelOpen" />

    <app-editor-canvas class="editor-canvas" />

    <app-mini-preview class="editor-mini-preview" />
  </div>

  <div class="editor-bottombar">
    <!-- zoom controls -->
  </div>
</div>
```

### SCSS — editor.component.scss

```scss
.editor-shell {
  display: grid;
  grid-template-rows: 56px 1fr 44px;
  grid-template-columns: 1fr;
  height: 100vh;
  overflow: hidden;
  background: #f0f0f0;
}

.editor-topbar {
  grid-row: 1;
  grid-column: 1;
  z-index: 100;
}

.editor-body {
  grid-row: 2;
  display: grid;
  grid-template-columns: 72px auto 1fr 140px;
  overflow: hidden;
}

.editor-sidebar   { grid-column: 1; }
.editor-panel     { grid-column: 2; width: 0; overflow: hidden; transition: width 260ms ease; }
.editor-panel.open { width: 260px; }
.editor-canvas    { grid-column: 3; position: relative; }
.editor-mini-preview { grid-column: 4; }

.editor-bottombar {
  grid-row: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
}
```

### Animation Angular — panel slide-in

```typescript
// panel-host.component.ts
import { trigger, state, style, animate, transition } from '@angular/animations';

animations: [
  trigger('panelSlide', [
    state('closed', style({ width: '0', opacity: 0 })),
    state('open',   style({ width: '260px', opacity: 1 })),
    transition('closed <=> open', animate('260ms cubic-bezier(0.4, 0, 0.2, 1)')),
  ])
]
```

---

## 5. Chantier 2 — Sidebar gauche

### Objectif

Remplacer les 4 onglets du bas par 7 icônes verticales à gauche.

### Structure

```html
<!-- editor-sidebar.component.html -->
<nav class="sidebar">
  <button class="sidebar-item"
    *ngFor="let tool of tools"
    [class.active]="activeTool === tool.id"
    (click)="selectTool(tool.id)"
    [title]="tool.label">
    <span class="sidebar-icon" [innerHTML]="tool.icon"></span>
    <span class="sidebar-label">{{ tool.label }}</span>
  </button>
</nav>
```

### Définition des 7 outils

```typescript
const TOOLS = [
  { id: EditorTool.EDIT,       label: 'Edit',       icon: '<svg>…pencil…</svg>' },
  { id: EditorTool.TEXT,       label: 'Add Text',   icon: '<svg>…T…</svg>' },
  { id: EditorTool.IMAGE,      label: 'Add Image',  icon: '<svg>…image…</svg>' },
  { id: EditorTool.BACKGROUND, label: 'Background', icon: '<svg>…bg…</svg>' },
  { id: EditorTool.ELEMENTS,   label: 'Elements',   icon: '<svg>…shapes…</svg>' },
  { id: EditorTool.ICONS,      label: 'Icons',      icon: '<svg>…star…</svg>' },
  { id: EditorTool.LAYERS,     label: 'Layers',     icon: '<svg>…layers…</svg>' },
];
```

### SCSS sidebar

```scss
.sidebar {
  width: 72px;
  height: 100%;
  background: white;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 2px;
}

.sidebar-item {
  width: 64px;
  height: 64px;
  border: none;
  background: transparent;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: #666;
  transition: background 150ms, color 150ms;

  &:hover   { background: #f5f5f5; color: #333; }
  &.active  { background: #EEF2FF; color: #4F46E5; }  // indigo accent
}

.sidebar-icon  { font-size: 22px; line-height: 1; }
.sidebar-label { font-size: 10px; font-weight: 500; }
```

---

## 6. Chantier 3 — Panel Edit / Personalize (NOUVELLE FEATURE)

> C'est le chantier le plus important. Il n'existe pas du tout dans l'app actuelle.

### Objectif

Générer automatiquement un formulaire depuis `fields_config` JSONB pour que l'utilisateur édite ses textes sans toucher directement au canvas — exactement comme le panel "Personalize your design" de Zazzle.

### Modèle de données

```typescript
// field-config.model.ts
export interface FieldConfig {
  field_id: string;     // ex: "title", "subtitle", "recipient_name"
  label?: string;       // ex: "Your name" (optionnel, sinon on utilise field_id)
  default_value: string;
  zone: {
    x: number; y: number; width: number; height: number;
  };
  style: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
  };
  multiline?: boolean;  // textarea vs input
  max_length?: number;
}
```

### Comportement

1. Au chargement du template → `FieldsService.loadFields(templateId)` → retourne `FieldConfig[]`.
2. Le panel Edit affiche chaque field comme : Label (=`field.label || field.field_id`) + Input (ou Textarea si `multiline: true`), pré-rempli avec `field.default_value`.
3. L'utilisateur modifie → state local `formValues: Record<string, string>`.
4. Bouton "Apply changes" → `FabricCanvasService.updateTextField(field_id, newValue)` pour chaque field modifié.
5. Le canvas met à jour l'objet IText/Textbox correspondant en temps réel.

### Template HTML

```html
<!-- panel-edit.component.html -->
<div class="panel">
  <div class="panel-header">
    <h2 class="panel-title">Personalize your design</h2>
    <button class="panel-close" (click)="close()">✕</button>
  </div>

  <p class="panel-subtitle">Edit the text fields below to customize your tag.</p>

  <div class="panel-section">
    <h3 class="section-label">Front</h3>

    <div class="field-group"
      *ngFor="let field of frontFields"
      [formGroup]="form">

      <label class="field-label">{{ field.label || field.field_id }}</label>

      <textarea
        *ngIf="field.multiline"
        class="field-input"
        [formControlName]="field.field_id"
        [maxlength]="field.max_length || 200"
        rows="2">
      </textarea>

      <input
        *ngIf="!field.multiline"
        class="field-input"
        type="text"
        [formControlName]="field.field_id"
        [maxlength]="field.max_length || 100"
      />
    </div>
  </div>

  <!-- Section Back (si template double face) -->
  <div class="panel-section" *ngIf="backFields.length">
    <h3 class="section-label">Back</h3>
    <!-- même pattern -->
  </div>

  <div class="panel-footer">
    <button class="btn-apply" (click)="applyChanges()">Apply changes</button>
    <p class="panel-hint">Or click an element on the canvas to edit it directly.</p>
  </div>
</div>
```

### Service — updateTextField

```typescript
// fabric-canvas.service.ts (méthode à ajouter)
updateTextField(fieldId: string, value: string): void {
  const obj = this.canvas.getObjects().find(
    (o: any) => o.fieldId === fieldId && (o.type === 'i-text' || o.type === 'textbox')
  );
  if (obj) {
    (obj as fabric.IText).set('text', value);
    this.canvas.renderAll();
  }
}
```

### SCSS panel

```scss
.panel {
  width: 260px;
  height: 100%;
  background: white;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 8px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.panel-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  padding: 4px;
  border-radius: 4px;
  &:hover { background: #f5f5f5; }
}

.panel-subtitle {
  font-size: 13px;
  color: #666;
  padding: 0 16px 12px;
  margin: 0;
}

.panel-section {
  padding: 0 16px;
  flex: 1;
  overflow-y: auto;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: #555;
  text-transform: capitalize;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a1a;
  background: white;
  resize: none;
  transition: border-color 150ms;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #4F46E5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
}

.panel-footer {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.btn-apply {
  width: 100%;
  padding: 11px;
  background: #4F46E5;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms;

  &:hover { background: #4338CA; }
}

.panel-hint {
  font-size: 12px;
  color: #888;
  text-align: center;
  margin: 10px 0 0;
}
```

---

## 7. Chantier 4 — Panel Text (Add Text)

### Objectif

Permettre d'ajouter un nouveau champ texte libre sur le canvas (hors fields_config), avec un accès rapide aux styles.

### Fonctionnalités

- Bouton principal "Add a text box" → ouvre une mini-modale inline "Add your text / Your text here / Cancel | Submit".
- Liste des champs texte existants (IText/Textbox présents dans le canvas) avec possibilité de cliquer pour sélectionner.
- Accès rapide : section "Quick styles" avec 3-4 presets typographiques (Heading, Subheading, Body, Cursive).

### Template HTML (structure)

```html
<div class="panel">
  <div class="panel-header">
    <h2>Add text to your design</h2>
    <button class="panel-close" (click)="close()">✕</button>
  </div>

  <div class="panel-section">
    <p class="panel-subtitle">Add additional text to your design</p>
    <button class="btn-primary full-width" (click)="openAddTextModal()">
      <span class="icon">T</span> Add a text box
    </button>
  </div>

  <div class="panel-section">
    <h3 class="section-label">Quick styles</h3>
    <div class="text-style-list">
      <button class="text-style-item" *ngFor="let style of textStyles"
        (click)="addStyledText(style)">
        <span [style.font-family]="style.fontFamily"
              [style.font-size.px]="style.previewSize">
          {{ style.label }}
        </span>
      </button>
    </div>
  </div>

  <!-- Modal inline -->
  <div class="inline-modal" *ngIf="showAddModal">
    <p class="modal-label">Add your text</p>
    <input type="text" class="field-input" [(ngModel)]="newTextValue"
      placeholder="Your text here" (keydown.enter)="submitText()" />
    <div class="modal-actions">
      <button class="btn-ghost" (click)="cancelAddText()">Cancel</button>
      <button class="btn-primary" (click)="submitText()"
        [disabled]="!newTextValue">Submit</button>
    </div>
  </div>
</div>
```

---

## 8. Chantier 5 — Panel Image (Add Image)

### Objectif

Permettre à l'utilisateur d'uploader et placer une image sur le canvas.

### Fonctionnalités

- Upload depuis ordinateur (file input accept="image/*").
- Upload depuis mobile (QR code ou lien partagé — Phase 2).
- Galerie des images déjà uploadées dans la session.
- Drag & drop sur le canvas.

### Template HTML (structure)

```html
<div class="panel">
  <div class="panel-header">
    <h2>Add images to your design</h2>
    <button class="panel-close" (click)="close()">✕</button>
  </div>

  <div class="panel-section">
    <p class="panel-subtitle">
      Add your images to personalize this design.
      <a href="#" (click)="signIn()">Sign in</a> to access your library.
    </p>
    <hr class="divider" />

    <button class="upload-btn" (click)="uploadFromComputer()">
      <span class="upload-icon">⬆</span> Upload from computer
    </button>

    <button class="upload-btn secondary" (click)="uploadFromPhone()">
      <span class="upload-icon">📱</span> Upload from your phone
    </button>
  </div>

  <!-- Galerie images récentes -->
  <div class="panel-section" *ngIf="recentImages.length">
    <h3 class="section-label">Recent uploads</h3>
    <div class="image-grid">
      <div class="image-thumb" *ngFor="let img of recentImages"
        (click)="placeImage(img)" draggable="true">
        <img [src]="img.thumbnailUrl" [alt]="img.name" />
      </div>
    </div>
  </div>

  <input #fileInput type="file" accept="image/*" hidden
    (change)="onFileSelected($event)" />
</div>
```

---

## 9. Chantier 6 — Panel Background

### Objectif

Permettre de changer le fond du canvas avec upload image ou color picker.

### Fonctionnalités identiques à Zazzle

- Upload background image.
- Color picker avec : couleur actuelle + bouton "Remove", palette originale du template, couleurs récentes, input hex custom, grille de swatches.

### Template HTML (structure)

```html
<div class="panel">
  <div class="panel-header">
    <h2>Background</h2>
    <button class="panel-close" (click)="close()">✕</button>
  </div>

  <div class="panel-section scrollable">
    <!-- Searchbar -->
    <div class="search-row">
      <input type="text" placeholder="Search for backgrounds"
        [(ngModel)]="backgroundQuery" class="field-input" />
    </div>

    <!-- Background Image -->
    <div class="collapsible-section">
      <div class="section-header" (click)="toggle('bgImage')">
        <h3>Background Image</h3>
        <span>{{ sections.bgImage ? '▲' : '▼' }}</span>
      </div>
      <div *ngIf="sections.bgImage" class="section-content">
        <div class="upload-row">
          <button class="icon-btn" (click)="uploadBgImage()">⬆</button>
          <button class="upload-btn" (click)="uploadBgImage()">Upload Image</button>
        </div>
      </div>
    </div>

    <!-- Background Color -->
    <div class="collapsible-section">
      <h3>Background color</h3>
      <div class="color-preview-row">
        <div class="color-swatch-lg" [style.background]="currentBgColor"></div>
        <button class="btn-ghost-sm" (click)="removeBgColor()">Remove</button>
      </div>
    </div>

    <!-- Original color palette -->
    <div class="collapsible-section">
      <h3>Original color palette</h3>
      <div class="swatch-row">
        <button class="color-swatch-sm" *ngFor="let c of originalPalette"
          [style.background]="c" (click)="setBgColor(c)">
        </button>
      </div>
    </div>

    <!-- Recent colors -->
    <div class="collapsible-section" *ngIf="recentColors.length">
      <h3>Recent colors</h3>
      <div class="swatch-row">
        <button class="color-swatch-sm" *ngFor="let c of recentColors"
          [style.background]="c" (click)="setBgColor(c)">
        </button>
      </div>
    </div>

    <!-- Custom color -->
    <div class="collapsible-section">
      <h3>Custom color</h3>
      <div class="custom-color-row">
        <input type="color" [value]="customColor" (input)="onColorInput($event)" />
        <input type="text" class="field-input hex-input"
          [(ngModel)]="customColor" placeholder="#FFFFFF"
          (change)="setBgColor(customColor)" />
      </div>
    </div>

    <!-- Swatches grid -->
    <div class="collapsible-section">
      <h3>Swatches</h3>
      <div class="swatch-grid">
        <button class="color-swatch-sm" *ngFor="let c of colorSwatches"
          [style.background]="c" (click)="setBgColor(c)">
        </button>
      </div>
    </div>
  </div>
</div>
```

---

## 10. Chantier 7 — Panel Elements

### Objectif

Permettre d'ajouter des formes, graphiques, et éléments décoratifs sur le canvas.

### Fonctionnalités identiques à Zazzle

- Searchbar "Search for elements".
- Section "Dynamic Shapes" — 4 formes de base (carré, arrondi, cercle, triangle) → clic → ajoute sur canvas.
- Section "Graphics" — grid 2 colonnes avec thumbnails + "See more".
- Section "Text" — presets de styles texte stylisés.
- Section "Borders/Lines" — lignes decoratives.
- Section "Shapes" — shapes supplémentaires.

### Structure HTML (squelette)

```html
<div class="panel">
  <div class="panel-header">
    <h2>Elements</h2>
    <button class="panel-close" (click)="close()">✕</button>
  </div>

  <div class="search-row">
    <input type="text" placeholder="Search for elements"
      [(ngModel)]="query" class="field-input" />
  </div>

  <!-- Dynamic Shapes -->
  <div class="element-section">
    <h3>Dynamic Shapes</h3>
    <div class="shapes-row">
      <button class="shape-btn" *ngFor="let s of dynamicShapes"
        (click)="addShape(s)" [title]="s.name">
        <svg viewBox="0 0 40 40" width="36" height="36">
          <ng-container [ngSwitch]="s.type">
            <rect *ngSwitchCase="'rect'" x="4" y="4" width="32" height="32" fill="#ccc"/>
            <rect *ngSwitchCase="'rounded'" x="4" y="4" width="32" height="32" rx="8" fill="#ccc"/>
            <circle *ngSwitchCase="'circle'" cx="20" cy="20" r="16" fill="#ccc"/>
            <polygon *ngSwitchCase="'triangle'" points="20,4 36,36 4,36" fill="#ccc"/>
          </ng-container>
        </svg>
      </button>
    </div>
  </div>

  <!-- Graphics -->
  <div class="element-section">
    <div class="section-header-row">
      <h3>Graphics</h3>
      <button class="see-more-btn" (click)="openGraphicsModal()">See more</button>
    </div>
    <div class="element-grid">
      <button class="element-thumb" *ngFor="let g of graphics.slice(0,4)"
        (click)="addGraphic(g)">
        <img [src]="g.thumbnail" [alt]="g.name" />
      </button>
    </div>
  </div>

  <!-- ... autres sections identiques -->
</div>
```

---

## 11. Chantier 8 — Panel Icons

### Objectif

Permettre de rechercher et placer des icônes SVG sur le canvas.

### Fonctionnalités

- Searchbar principale avec debounce 300ms.
- Grille d'icônes 4 colonnes.
- Source : bibliothèque SVG interne ou API externe (ex: Iconify).
- Clic → ajoute l'icône comme objet SVG sur le canvas Fabric.js.
- Color picker inline pour changer la couleur de l'icône avant placement.

### Structure HTML (squelette)

```html
<div class="panel">
  <div class="panel-header">
    <h2>Icons</h2>
    <button class="panel-close" (click)="close()">✕</button>
  </div>

  <div class="search-row">
    <input type="text" placeholder="Search icons…"
      [(ngModel)]="iconQuery"
      (ngModelChange)="searchIcons($event)"
      class="field-input" />
  </div>

  <!-- Catégories -->
  <div class="icon-categories">
    <button class="category-chip" *ngFor="let cat of categories"
      [class.active]="activeCategory === cat.id"
      (click)="filterByCategory(cat.id)">
      {{ cat.label }}
    </button>
  </div>

  <!-- Grille icônes -->
  <div class="icon-grid">
    <button class="icon-item" *ngFor="let icon of filteredIcons"
      (click)="placeIcon(icon)" [title]="icon.name">
      <div class="icon-preview" [innerHTML]="icon.svg | safeSvg"
        [style.color]="selectedColor">
      </div>
    </button>
  </div>

  <!-- Couleur de l'icône -->
  <div class="icon-color-row">
    <span class="field-label">Icon color</span>
    <div class="color-picker-mini">
      <input type="color" [(ngModel)]="selectedColor" />
    </div>
  </div>

  <!-- Loading state -->
  <div class="loading-state" *ngIf="isLoading">
    <div class="spinner"></div>
  </div>
</div>
```

---

## 12. Chantier 9 — Panel Layers

### Objectif

Afficher et gérer l'ordre des calques du canvas Fabric.js.

### Fonctionnalités identiques à Zazzle

- Liste de tous les objets du canvas, dans l'ordre de rendu (haut = devant).
- Chaque item : icône type (T pour texte, image thumbnail pour images) + nom/preview du contenu.
- Drag & drop pour réordonner (CDK DragDrop).
- Clic → sélectionne l'objet sur le canvas.
- Icône visibilité (👁) pour show/hide.
- Icône lock (🔒) pour verrouiller l'objet.

### Structure HTML

```html
<div class="panel">
  <div class="panel-header">
    <h2>Layers</h2>
    <button class="panel-close" (click)="close()">✕</button>
  </div>

  <div class="layers-list"
    cdkDropList
    (cdkDropListDropped)="onLayerDrop($event)">

    <div class="layer-item"
      *ngFor="let layer of layers; trackBy: trackById"
      cdkDrag
      [class.selected]="selectedId === layer.id"
      (click)="selectLayer(layer.id)">

      <!-- Drag handle -->
      <div class="layer-handle" cdkDragHandle>
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="5" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="11" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="5" cy="11" r="1.5" fill="currentColor"/>
          <circle cx="11" cy="11" r="1.5" fill="currentColor"/>
        </svg>
      </div>

      <!-- Type icon ou thumbnail -->
      <div class="layer-thumb">
        <span *ngIf="layer.type === 'text'" class="type-icon text-icon">T</span>
        <img *ngIf="layer.type === 'image'" [src]="layer.thumbnail" />
        <span *ngIf="layer.type === 'shape'" class="type-icon shape-icon">◈</span>
      </div>

      <!-- Nom -->
      <span class="layer-name">{{ layer.name }}</span>

      <!-- Actions -->
      <div class="layer-actions">
        <button class="layer-action-btn"
          [class.inactive]="!layer.visible"
          (click)="toggleVisibility(layer.id, $event)"
          title="Toggle visibility">
          <svg><!-- eye icon --></svg>
        </button>
        <button class="layer-action-btn"
          [class.active]="layer.locked"
          (click)="toggleLock(layer.id, $event)"
          title="Lock layer">
          <svg><!-- lock icon --></svg>
        </button>
      </div>
    </div>
  </div>
</div>
```

### Service Layers

```typescript
// Dans fabric-canvas.service.ts (à ajouter)
getLayers(): LayerItem[] {
  return this.canvas.getObjects()
    .map((obj: any, index) => ({
      id: obj.id || `obj-${index}`,
      type: this.getObjectType(obj),
      name: this.getObjectName(obj),
      thumbnail: obj.type === 'image' ? obj.getSrc() : null,
      visible: obj.visible !== false,
      locked: obj.lockMovementX && obj.lockMovementY,
      fabricObject: obj,
    }))
    .reverse(); // inverse pour que le dessus = premier dans la liste
}

moveLayer(fromIndex: number, toIndex: number): void {
  const objects = this.canvas.getObjects();
  const reversed = [...objects].reverse();
  const obj = reversed[fromIndex];
  reversed.splice(fromIndex, 1);
  reversed.splice(toIndex, 0, obj);
  // réappliquer l'ordre
  reversed.reverse().forEach((o, i) => {
    this.canvas.moveTo(o, i);
  });
  this.canvas.renderAll();
}
```

---

## 13. Chantier 10 — Toolbar contextuelle flottante

> Cette toolbar apparaît au-dessus de l'objet sélectionné sur le canvas. Elle n'a pas d'emplacement fixe.

### Objectif

Offrir un accès rapide aux propriétés de l'objet sélectionné — identique à la barre Zazzle (image 9 du brief).

### Comportement

1. L'utilisateur clique sur un objet sur le canvas → `fabric:selection:created` event.
2. On calcule la position de l'objet : `obj.getBoundingRect()` → `{ top, left, width, height }`.
3. La toolbar se positionne à `top - 56px, left` (au-dessus de l'objet).
4. Si trop proche du haut → se repositionne en dessous.
5. Déselection → toolbar disparaît.

### Contenu de la toolbar selon le type d'objet

**Texte sélectionné :**
```
[Edit text] [— 25 +] [Font: Dancing Script ▾] [● Color ▾] [B] [I] [≡ ▾] [🗑] [⋯]
```

**Image sélectionnée :**
```
[Crop] [Replace] [Flip H] [Flip V] [Opacity: 100%] [🗑] [⋯]
```

**Forme sélectionnée :**
```
[● Fill ▾] [Border ▾] [Opacity: 100%] [🗑] [⋯]
```

### Template HTML

```html
<!-- contextual-toolbar.component.html -->
<div class="contextual-toolbar"
  *ngIf="selectedObject"
  [style.top.px]="toolbarTop"
  [style.left.px]="toolbarLeft"
  [@toolbarFade]>

  <!-- Toolbar TEXT -->
  <ng-container *ngIf="selectedObject.type === 'text'">
    <button class="tb-btn tb-btn--label" (click)="editText()">Edit text</button>
    <div class="tb-divider"></div>
    <span class="tb-label">Font size</span>
    <button class="tb-btn-icon" (click)="decreaseFontSize()">−</button>
    <input class="tb-font-size" type="number" [(ngModel)]="fontSize"
      (change)="setFontSize($event)" />
    <button class="tb-btn-icon" (click)="increaseFontSize()">+</button>
    <div class="tb-divider"></div>
    <button class="tb-btn tb-font-picker" (click)="openFontPicker()">
      Font: {{ fontFamily }}
    </button>
    <div class="tb-divider"></div>
    <button class="tb-color-dot" [style.background]="textColor"
      (click)="openColorPicker()">
    </button>
    <div class="tb-divider"></div>
    <button class="tb-btn-icon" [class.active]="isBold" (click)="toggleBold()">B</button>
    <button class="tb-btn-icon italic" [class.active]="isItalic" (click)="toggleItalic()">I</button>
    <button class="tb-btn-icon" (click)="openAlignMenu()">≡</button>
    <div class="tb-divider"></div>
    <button class="tb-btn-icon danger" (click)="deleteObject()">🗑</button>
    <button class="tb-btn-icon" (click)="openMoreMenu()">⋯</button>
  </ng-container>

  <!-- Toolbar IMAGE -->
  <ng-container *ngIf="selectedObject.type === 'image'">
    <button class="tb-btn" (click)="cropImage()">Crop</button>
    <button class="tb-btn" (click)="replaceImage()">Replace</button>
    <button class="tb-btn-icon" (click)="flipH()">↔</button>
    <button class="tb-btn-icon" (click)="flipV()">↕</button>
    <div class="tb-divider"></div>
    <button class="tb-btn-icon danger" (click)="deleteObject()">🗑</button>
  </ng-container>
</div>
```

### SCSS toolbar

```scss
.contextual-toolbar {
  position: absolute;
  z-index: 1000;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  height: 48px;
  white-space: nowrap;
  transform: translateX(-50%); // centré sur l'objet
}

.tb-btn {
  padding: 4px 10px;
  border: none;
  background: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: #333;
  &:hover { background: #f5f5f5; }
}

.tb-btn-icon {
  width: 32px; height: 32px;
  border: none; background: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  &:hover { background: #f5f5f5; }
  &.active { background: #EEF2FF; color: #4F46E5; }
  &.danger:hover { background: #FEF2F2; color: #EF4444; }
}

.tb-divider {
  width: 1px; height: 24px;
  background: #e8e8e8;
  margin: 0 4px;
}

.tb-font-size {
  width: 44px;
  text-align: center;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 13px;
  padding: 2px 4px;
}

.tb-color-dot {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 2px solid white;
  outline: 1px solid #ccc;
  cursor: pointer;
}
```

---

## 14. Chantier 11 — Topbar redesign

### Objectif

Remplacer la topbar actuelle (Logo | Save Art | Share | Actions | Avatar) par la topbar Zazzle-style.

### Nouvelle structure

```
[✕ Save and Exit]  [Titre du template  ● Saved]  [Design | Options | Review]
                            [↩ Undo] [↪ Redo]    [👁 Preview]  [Next: Design Back →]
```

### Template HTML

```html
<!-- editor-topbar.component.html -->
<header class="topbar">
  <!-- Gauche -->
  <div class="topbar-left">
    <button class="btn-ghost-sm" (click)="saveAndExit()">
      <span>✕</span> Save and Exit
    </button>
  </div>

  <!-- Centre -->
  <div class="topbar-center">
    <span class="template-title">{{ templateName }}</span>
    <span class="save-status">
      <span class="status-dot" [class.saved]="isSaved"></span>
      {{ isSaved ? 'Saved' : 'Saving…' }}
    </span>

    <nav class="topbar-steps">
      <button class="step-btn" [class.active]="step === 'design'"
        (click)="setStep('design')">Design</button>
      <button class="step-btn" [class.active]="step === 'options'"
        (click)="setStep('options')">Options</button>
      <button class="step-btn" [class.active]="step === 'review'"
        (click)="setStep('review')">Review</button>
    </nav>

    <div class="topbar-history">
      <button class="btn-icon" (click)="undo()" [disabled]="!canUndo">↩</button>
      <button class="btn-icon" (click)="redo()" [disabled]="!canRedo">↪</button>
    </div>
  </div>

  <!-- Droite -->
  <div class="topbar-right">
    <button class="btn-ghost" (click)="preview()">👁 Preview</button>
    <button class="btn-primary" (click)="nextStep()">
      Next: Design Back →
    </button>
  </div>
</header>
```

---

## 15. Tokens de design & SCSS

### Variables CSS globales à déclarer dans styles.scss

```scss
:root {
  // Layout dimensions
  --sidebar-width: 72px;
  --panel-width: 260px;
  --topbar-height: 56px;
  --bottombar-height: 44px;
  --mini-preview-width: 140px;

  // Colors
  --color-bg-canvas: #f0f0f0;
  --color-bg-sidebar: #ffffff;
  --color-bg-panel: #ffffff;
  --color-bg-topbar: #ffffff;

  --color-border: #e8e8e8;
  --color-border-strong: #d0d0d0;

  --color-accent: #4F46E5;        // Indigo — outil actif, buttons primaires
  --color-accent-light: #EEF2FF;  // Fond outil actif sidebar
  --color-accent-hover: #4338CA;

  --color-text-primary: #1a1a1a;
  --color-text-secondary: #555555;
  --color-text-muted: #999999;

  --color-danger: #EF4444;
  --color-danger-light: #FEF2F2;

  // Typography
  --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  // Shadows
  --shadow-toolbar: 0 4px 20px rgba(0, 0, 0, 0.12);
  --shadow-panel: 1px 0 4px rgba(0, 0, 0, 0.06);

  // Transitions
  --transition-panel: 260ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-fast: 150ms ease;
}
```

---

## 16. Ordre d'implémentation & estimations

### Phase 1 — Desktop (priorité MVP)

| # | Chantier | Durée estimée | Dépendances |
|---|----------|--------------|-------------|
| 1 | Layout global CSS Grid | 1 jour | — |
| 2 | Sidebar gauche + routing | 1 jour | Layout |
| 3 | Panel Edit / Personalize | 2 jours | Sidebar + FieldsService |
| 4 | Topbar redesign | 1 jour | — |
| 5 | Toolbar contextuelle flottante | 2 jours | Fabric.js events |
| 6 | Panel Text | 1 jour | Sidebar |
| 7 | Panel Image | 1 jour | Sidebar |
| 8 | Panel Background | 1.5 jours | Color picker lib |
| 9 | Panel Elements | 1.5 jours | Assets SVG |
| 10 | Panel Icons | 1 jour | API Iconify ou lib locale |
| 11 | Panel Layers + CDK DragDrop | 2 jours | Fabric.js objects |
| **Total** | | **~15 jours** | |

### Ordre recommandé

```
Semaine 1 : Layout → Sidebar → Panel Edit (la feature clé) → Topbar
Semaine 2 : Toolbar flottante → Panel Text → Panel Image
Semaine 3 : Background → Elements → Icons → Layers
```

---

## 17. Phase 2 — Mobile responsive

> À traiter après la stabilisation du Desktop.

### Stratégie

Le layout desktop (4 colonnes) se transforme en layout mobile (plein écran + bottom drawer).

### Breakpoints

```scss
// Desktop : ≥ 1024px  → layout 4 colonnes (sidebar + panel + canvas + preview)
// Tablet  : 768-1023px → sidebar réduite (icônes seules) + panel overlay
// Mobile  : < 768px   → bottom sheet + canvas plein écran
```

### Mobile — changements principaux

1. **Sidebar → Bottom tabs** (5 onglets max — Edit, Text, Image, Elements, Layers).
2. **Panel → Bottom sheet** avec drag handle, s'ouvre à 50% de hauteur, draggable jusqu'à 90%.
3. **Mini preview** → se cache sur mobile (accès via bouton dans topbar).
4. **Topbar mobile** → simplifié (← retour | Titre | ⋯ menu | Enregistrer).
5. **Toolbar contextuelle** → apparaît en bas (au-dessus des tabs) plutôt qu'au-dessus de l'objet.

### CSS Media queries

```scss
@media (max-width: 767px) {
  .editor-body {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  .editor-sidebar    { grid-row: 2; flex-direction: row; width: 100%; height: 64px; }
  .editor-panel      { position: fixed; bottom: 64px; left: 0; right: 0;
                       height: 0; transition: height var(--transition-panel); }
  .editor-panel.open { height: 50vh; }
  .editor-canvas     { grid-row: 1; }
  .editor-mini-preview { display: none; }
}
```

---

## Annexe — Bibliothèques recommandées

| Besoin | Lib recommandée | Notes |
|--------|----------------|-------|
| Color picker | `ngx-color` ou `@angular/material color-picker` | Pour panel Background |
| Drag & drop layers | `@angular/cdk/drag-drop` | Déjà dans Angular CDK |
| Icons SVG library | `@iconify/angular` | 200k+ icônes, gratuit |
| Font picker | Custom component + Google Fonts API | Filtre par catégorie |
| Animations | `@angular/animations` | Déjà dans Angular |

---

*Document généré pour TagPrintly — Dashboard Angular · Editor Redesign Phase 1 Desktop*
*Dernière mise à jour : Avril 2026*
