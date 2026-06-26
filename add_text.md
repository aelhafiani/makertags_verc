# Add Text Panel — Feature Description

## Objectif

Implémenter le panneau "Add text to your design" qui s'affiche dans la zone `panel-lane` quand l'utilisateur clique sur l'outil **Add Text** dans la sidebar gauche.

---

## Résultat attendu (référence image)

```
┌──────────────────────────────┐
│ Add text to your design    ✕ │
│ Add additional text to your  │
│ design                       │
│                              │
│  ┌────────────────────────┐  │
│  │ gfgfgfg hyhh           │  │  ← input éditable (text 1)
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ ttrtrtrt               │  │  ← input éditable (text 2)
│  └────────────────────────┘  │
│                              │
│  ┌──────────────────────────┐│
│  │ 🔤  Add a text box       ││  ← bouton bleu primaire
│  └──────────────────────────┘│
└──────────────────────────────┘
```

---

## Composant à créer

**Fichier :** `src/app/modules/author/components/panels/add-text-panel/add-text-panel.component.ts`  
**Selector :** `maker-tags-add-text-panel`  
**Standalone :** oui

---

## Comportement détaillé

### 1. Affichage du panneau

- S'affiche dans le `ContextualPanelComponent` quand `activeTool === 'add-text'`
- Titre fixe : **"Add text to your design"**
- Sous-titre fixe : **"Add additional text to your design"**
- Pas de bouton ✕ (la fermeture se fait via la sidebar comme les autres outils)

### 2. Liste des textes existants

- Au chargement, lire `canvasProvider.canvas$` et extraire tous les objets de type `i-text` ou `textbox`
- Pour chaque objet texte, afficher un `<input type="text">` pré-rempli avec la valeur actuelle du texte (`obj.text`)
- L'input est stylé comme un champ simple (bordure grise, fond blanc, radius 6px) — identique aux inputs visibles dans la capture
- **Au focus de l'input :** sélectionner l'objet correspondant sur le canvas via `canvas.setActiveObject(obj)` + `canvas.renderAll()`
- **À la modification (keyup, debounce 80ms) :** mettre à jour `obj.set({ text: value })` + `canvas.renderAll()`
- Écouter les événements canvas `object:added` et `object:removed` pour mettre à jour la liste dynamiquement
- Si aucun texte n'existe, afficher un message vide (sans message d'erreur)

### 3. Bouton "Add a text box"

- Bouton bleu pleine largeur avec icône texte à gauche
- Au clic :
  1. Créer un `new Textbox('New text', { ... })` centré sur le canvas
  2. Propriétés initiales : `fontSize: 32`, `fontFamily: 'Inter'`, `fill: '#000000'`, `textAlign: 'center'`, `width: 200`
  3. `canvas.add(obj)` → `canvas.setActiveObject(obj)` → `canvas.renderAll()`
  4. Mettre le focus sur l'input correspondant dans la liste (scroll si nécessaire)

### 4. Synchronisation canvas ↔ panel

- Quand l'utilisateur sélectionne un texte directement sur le canvas (via `canvasProvider.activeObject$`), mettre le focus visuel (border bleue) sur l'input correspondant dans la liste
- Quand `object:removed` fire, retirer l'input de la liste
- Quand `object:modified` ou `text:changed` fire, re-lire la valeur du texte et mettre à jour l'input si le focus n'est pas dessus

---

## Intégration dans le ContextualPanelComponent

Dans `contextual-panel.component.ts` / `.html`, ajouter le cas `add-text` :

```typescript
// Déjà géré via switch/case ou *ngIf sur activeTool
// Ajouter :
case 'add-text': // → afficher <maker-tags-add-text-panel>
```

Le composant est ajouté dans les `imports` du `ContextualPanelComponent`.

---

## Dépendances à utiliser

| Service / Import | Usage |
|---|---|
| `CanvasProviderService` | Accès au canvas et à l'objet actif |
| `Textbox` from `fabric` | Création d'un nouvel objet texte |
| `FormsModule` | Binding `[(ngModel)]` sur les inputs |
| `CommonModule` | `*ngFor`, `*ngIf` |
| `NzIconModule` | Icône dans le bouton |

---

## Style (SCSS)

- Fond blanc, padding 16px
- Header : titre 14px bold + sous-titre 12px gris
- Liste : gap 8px entre les inputs
- Input : width 100%, height 38px, border 1px solid #d1d5db, border-radius 6px, padding 0 12px, font-size 13px
- Input focus (correspondant à l'objet sélectionné sur canvas) : border 1.5px solid #2563eb (bleu)
- Bouton : bg #2563eb, color white, height 40px, border-radius 8px, font-weight 600, icône à gauche

---

## Ce qu'on ne fait PAS dans cette feature

- Pas de gestion de style (font, size, color) — c'est le rôle de la floating toolbar
- Pas de drag-and-drop de textes
- Pas de types de texte multiples (heading, body…) — juste "Add a text box"
