# Layers Panel — Plan d'implémentation (style Zazzle)

## Référence visuelle (Zazzle)

Le panel Zazzle montre :
- Une liste verticale de couches, chacune avec :
  - Une icône de type (image, texte, forme, groupe)
  - Un thumbnail preview de la couche
  - Le nom/contenu textuel de la couche
- La couche active est surlignée (fond bleu clair)
- Drag & drop pour réordonner
- Bouton "Changez l'image" contextuel sur les couches image

---

## État actuel du code

| Fichier | État | Problème |
|---|---|---|
| `layering-editor.component.ts` | ⚠️ Proto | Lit `art.item.canvasContent.objects` (JSON stocké), pas le canvas Fabric live |
| `layering-editor.component.html` | ⚠️ Proto | CDK drag-drop présent mais pas connecté au canvas réel |
| `CanvasProviderService` | ✅ Prêt | `canvas$`, `selection$`, `activeObject$` disponibles |
| `CanvasHistoryService` | ✅ Prêt | Types `layer:visibility`, `layer:lock` déjà déclarés |
| `EditorShellState` | ✅ Prêt | `ToolId = 'layers'` déjà défini, `selection.objectId` disponible |

**Problème principal** : le composant actuel lit le JSON sauvegardé et non le canvas Fabric en mémoire. Il faut rebrancher sur `CanvasProviderService.canvas$` pour avoir la liste live des objets.

---

## Architecture cible

### Source de vérité : le canvas Fabric

Les couches = `canvas.getObjects()` en temps réel.  
Affichage = liste inversée (dernier objet en haut = couche du dessus, comme Zazzle).  
Toute action (réordonnancement, visibilité, verrou, suppression) appelle directement l'API Fabric puis enregistre dans l'historique.

### Modèle d'une couche (local, pas stocké)

```ts
interface LayerItem {
  fabricObject: FabricObject;   // référence directe à l'objet Fabric
  id: string;                   // fabricObject.get('id') ou nanoid assigné à la création
  type: 'text' | 'image' | 'shape' | 'svg' | 'group';
  label: string;                // texte contenu, nom de fichier, ou "Shape"
  thumbnail: string;            // data URL généré par toDataURL() sur un canvas temporaire
  visible: boolean;             // fabricObject.visible
  locked: boolean;              // fabricObject.lockMovementX && lockScalingX etc.
  isSelected: boolean;          // objectId du store === id
}
```

---

## Fonctionnalités à implémenter

### 1. Liste des couches live

- S'abonner à `CanvasProviderService.canvas$` pour avoir le canvas
- Écouter les événements Fabric : `object:added`, `object:removed`, `object:modified`, `selection:created`, `selection:cleared`
- À chaque événement : reconstruire la liste `layers: LayerItem[]` = `canvas.getObjects().slice().reverse()`
- **Exclure** : `backgroundImage`, les objets `isTextureOverlay = true`, les objets `isArtContour = true` (form layer) — ces couches techniques ne sont pas éditables par l'utilisateur
- Générer le thumbnail via `fabricObject.toDataURL()` ou en dessinant l'objet sur un `OffscreenCanvas` 50×50

### 2. Highlight de la couche active

- S'abonner à `CanvasProviderService.selection$`
- Comparer `selection.objectId` avec chaque `LayerItem.id`
- La couche active reçoit la classe CSS `active` (fond bleu clair comme Zazzle)
- Clic sur une couche → `canvas.setActiveObject(layer.fabricObject)` + `canvas.requestRenderAll()`

### 3. Drag & drop pour réordonner

- Conserver CDK `DragDropModule` déjà importé
- `drop(event)` :
  1. `moveItemInArray(this.layers, event.previousIndex, event.currentIndex)`
  2. Recalculer l'ordre réel (la liste est inversée) : `realIndex = canvas.getObjects().length - 1 - index`
  3. Appeler `canvas.moveObjectTo(fabricObject, realIndex)` pour chaque objet dans le nouvel ordre
  4. `canvas.requestRenderAll()`
  5. `canvasHistoryService.push('object:modified')` (ou type dédié à créer `layer:reorder`)

### 4. Visibilité (œil)

- Bouton icône œil sur chaque ligne
- Toggle : `fabricObject.set({ visible: !fabricObject.visible })`
- `canvas.requestRenderAll()`
- Enregistrer dans l'historique : `canvasHistoryService.push('layer:visibility')`
- Icône : œil ouvert / œil barré selon `layer.visible`

### 5. Verrouillage (cadenas)

- Bouton icône cadenas sur chaque ligne
- Toggle lock :
  ```ts
  const locked = !layer.locked;
  fabricObject.set({
    lockMovementX: locked, lockMovementY: locked,
    lockScalingX: locked,  lockScalingY: locked,
    lockRotation: locked,
    selectable: !locked,
    evented: !locked,
  });
  ```
- `canvas.requestRenderAll()`
- Enregistrer : `canvasHistoryService.push('layer:lock')`

### 6. Suppression depuis le panel

- Bouton supprimer (icône poubelle) au hover sur chaque ligne
- `canvas.remove(layer.fabricObject)`
- `canvas.requestRenderAll()`
- Historique : `canvasHistoryService.push('object:removed')`

### 7. Icônes de type et label

| Type Fabric | Icône | Label |
|---|---|---|
| `textbox` / `i-text` | T (texte) | Contenu tronqué à 20 chars |
| `image` | Image | Nom de fichier ou "Image" |
| `path` / `polygon` / `rect` / `circle` / `ellipse` | Forme | "Shape" |
| `group` | Groupe | "Group" |
| `activeselection` | — | Ignoré (multi-sélection temporaire) |

### 8. Thumbnail

Deux approches possibles (choisir selon perf) :

**Option A — `toDataURL()` rapide** :
```ts
const dataUrl = fabricObject.toDataURL({ format: 'png', multiplier: 0.2 });
```

**Option B — canvas temporaire** :
Créer un `<canvas>` 50×50, y rendre l'objet centré et scalé — plus propre visuellement mais plus lent.

Recommandation : Option A pour le prototype, Option B si qualité insuffisante.

---

## Structure du composant refactorisé

```
layering-editor/
  layering-editor.component.ts     ← à réécrire entièrement
  layering-editor.component.html   ← à réécrire
  layering-editor.component.scss   ← nouveau (remplace .css)
```

**Ne pas créer de nouveau composant** — refactoriser l'existant en place.

### Injection

```ts
constructor(
  private readonly canvasProvider: CanvasProviderService,
  private readonly history: CanvasHistoryService,
  private readonly cdr: ChangeDetectorRef,
) {}
```

**Pas de NGXS store** pour la liste des couches — état local du composant uniquement, reconstruit depuis le canvas à chaque événement Fabric.

---

## Ce qu'on ne fait PAS dans cette itération

- Renommage des couches (double-clic pour éditer le label) — future itération
- Merge/group de couches — future itération
- Opacity par couche depuis le panel layers (déjà dans le floating toolbar)
- Couche de fond (background) dans la liste — elle n'est pas un FabricObject standard

---

## Ordre d'implémentation

1. Rebrancher la source de données sur `CanvasProviderService.canvas$` + événements Fabric
2. Générer `LayerItem[]` avec thumbnails, types, labels
3. Highlight de la couche active (abonnement à `selection$`)
4. Drag & drop connecté à `canvas.moveObjectTo()`
5. Boutons visibilité + verrouillage
6. Bouton suppression
7. Style CSS (fond bleu actif, hover actions visibles, icônes de type)
