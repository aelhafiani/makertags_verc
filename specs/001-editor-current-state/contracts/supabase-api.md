# Contract: Supabase API — Editor Operations

**Branch**: `001-editor-current-state` | **Date**: 2026-04-11  
**Source**: `src/app/modules/shared/services/art-docs.service.ts`

---

## Save Art (Admin)

**Method**: `ArtDocsService.updateArtDocPages(docArt: IArtDoc): Promise<any>`  
**Trigger**: User clicks "Save Art" button (admin-only)

**Operation**: Upsert all pages of the art document to Supabase table `art_docs_faces`.

**Input**:
```typescript
{
  id: string,          // Art doc ID
  pages: IArtPage[],   // All faces with updated canvasContent
  // ... all other IArtDoc fields
}
```

**Success**: Returns updated document; shows `nzMessageService.success('Art updated successfully')`.  
**Failure**: Silent (no error handling in `saveArt()` beyond `if(resp)` guard).

---

## User Auto-Save

**Method**: `ArtFacadeService.updateUserArtDocFace(pageId: string, updates: Partial<IArtPage>): Observable<any>`  
**Trigger**: Canvas object:modified / text:changed events (non-admin users only, debounced)

**Input**:
```typescript
{
  pageId: string,
  updates: {
    preview: string,          // Base64 preview image
    canvasContent: object,    // Fabric.js canvas.toObject() output
  }
}
```

---

## Load Art Document

**Method**: `ArtFacadeService.selectOrCreateArtDoc(id)` + `ArtFacadeService.artDocState$`  
**Trigger**: Editor initialization when component receives `id` and calls `selectOrCreateArtDoc(id)`  
**Returns**: NGXS state slice observable `{ item: IArtDoc }`.

---

## Upload Preview Image

**Method**: `ArtDocsService.uploadFile(file: File, path: string, id?: string): Promise<any>`  
**Trigger**: Share public-link flow (`openShareModal`) generates PNG preview and uploads to Supabase Storage.

**Storage bucket**: `thubnails` (as implemented in service)  
**Path argument used by caller**: `'previews'`  
**Resolved object path**: `previews/preview-{artDocId}.png`

---

## Get Elements by Category

**Method**: `ArtDocsService.getImagesByCategotiries(): Observable<any[]>`  
**Trigger**: `AddElementsComponent.ngOnInit()`

**Returns**: Array of image objects, each with a `categorie` field. Grouped by category for tab display.  
**Admin visibility**: Admin users see the `'models'` category; regular users do not.
