# Add Image Panel — Plan d'implémentation

## Contexte existant

| Fichier | Statut | Notes |
|---|---|---|
| `services/image-upload.service.ts` | ✅ Complet | `upload()`, `listUserUploads()`, `remove()` via Supabase bucket `user-uploads` |
| `components/images-editor/` | ⚠️ Stub vide | Composant créé mais sans logique ni template |
| `components/panels/` | — | Contient `background-panel`, `add-text-panel` — même pattern à suivre |

---

## Ce qui doit être construit

### 1. `add-image-panel` (nouveau composant panel)

Créer `src/app/modules/author/components/panels/add-image-panel/` avec :
- `add-image-panel.component.ts`
- `add-image-panel.component.html`
- `add-image-panel.component.scss`

Ce panel remplace `ImagesEditorComponent` ou l'intègre — à décider selon comment le shell route vers les panels.

---

### 2. Zone d'upload

**Bouton "Upload from desktop"**
- Input `<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml">` caché
- Bouton visible qui déclenche le click sur l'input
- Drag & drop sur la zone du panel (events `dragover`, `drop`)
- À la sélection du fichier : appeler `ImageUploadService.upload(file)`
- Pendant l'upload : spinner / état `uploading = true`
- En cas d'erreur de validation (`ImageUploadValidationError`) : afficher le message d'erreur inline (pas de toast)
- En cas d'erreur réseau (`ImageUploadNetworkError`) : message "Upload failed, please retry"
- Après succès : ajouter l'image en tête de liste sans recharger toute la liste

**Formats acceptés** (déjà définis dans le service) : JPEG, PNG, WebP, SVG — max 10 MB

---

### 3. Liste des images uploadées

- Au `ngOnInit` : appeler `ImageUploadService.listUserUploads()` → afficher la liste
- Grille de thumbnails (même style que `background-panel` pour les textures)
- Chaque thumbnail :
  - Affiche l'image (`url` du ref)
  - Au clic : **placer l'image sur le canvas** (voir §5)
  - Bouton supprimer (icône poubelle) au hover
- État vide : message "No images yet — upload one above"
- État chargement : spinner pendant le fetch initial

---

### 4. Suppression d'une image

- Au clic sur le bouton supprimer d'un thumbnail :
  - Appeler `ImageUploadService.remove(ref)`
  - Retirer l'item de la liste locale sans recharger
  - Si l'image est actuellement utilisée sur le canvas : ne pas bloquer la suppression (l'image reste sur le canvas via son URL, Supabase ne la retire pas du rendu Fabric)

---

### 5. Placement sur le canvas

Quand l'utilisateur clique sur une image de la liste :
- Charger l'image via `FabricImage.fromURL(ref.url, { crossOrigin: 'anonymous' })`
- Calculer une taille initiale raisonnable : max 50% de la largeur du canvas, ratio préservé
- Centrer l'image sur le canvas (`canvas.getWidth() / 2`, `canvas.getHeight() / 2`, `originX: 'center'`)
- Rendre l'image sélectionnable et déplaçable (`selectable: true`, `evented: true`)
- Appeler `canvas.add(image)` puis `canvas.setActiveObject(image)`
- Enregistrer dans l'historique canvas (`CanvasHistoryService`)

Le canvas est accessible via `CanvasProviderService` (déjà utilisé ailleurs dans le shell).

---

### 6. Intégration dans le shell

Vérifier dans `editor-shell.component.ts` comment les panels sont affichés/routés (probablement un switch sur un état ou une variable `activePanel`).
Ajouter le cas `'add-image'` pour afficher `AddImagePanelComponent`.

Vérifier aussi dans la sidebar (toolbar gauche) qu'il y a déjà un bouton "Add Image" — si oui, s'assurer qu'il pointe sur le bon panel. Si non, ajouter l'icône dans la sidebar au même endroit que "Add Text".

---

## Ordre d'implémentation suggéré

1. Créer le composant `add-image-panel` (structure + template vide)
2. Implémenter la liste des images uploadées (lecture seule + suppression)
3. Implémenter le bouton upload + drag & drop
4. Implémenter le placement sur canvas au clic
5. Intégrer dans le shell et la sidebar
6. Polisher : états vides, erreurs, spinner, styles cohérents avec les autres panels

---

## Points d'attention

- **CORS** : Supabase retourne des URLs publiques — s'assurer que le bucket `user-uploads` est bien configuré en lecture publique (déjà le cas si `getPublicUrl` fonctionne).
- **Fabric crossOrigin** : toujours passer `{ crossOrigin: 'anonymous' }` à `FabricImage.fromURL` pour éviter les erreurs canvas tainted.
- **SVG sur Fabric** : les SVG chargés via `FabricImage.fromURL` sont rasterisés — comportement acceptable pour l'instant.
- **Pas de state NGXS** pour les images uploadées : la liste vit dans le composant (comme `textures[]` dans `background-panel`). Pas besoin d'un store global pour ça.
