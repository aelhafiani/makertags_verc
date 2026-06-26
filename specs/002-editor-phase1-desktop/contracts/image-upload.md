# Contract: Image Upload Service

**Branch**: `002-editor-phase1-desktop` | **Date**: 2026-04-12
**Source target**: `src/app/modules/author/services/image-upload.service.ts` (new)
**Spec references**: FR-023, FR-023a, FR-023b, FR-023c, FR-024, research.md §2 and §5, data-model.md `UploadedImageRef`

---

## Overview

`ImageUploadService` is an injectable singleton that:
1. Validates user-selected image files against MIME/size/dimension rules.
2. Uploads valid files to the Supabase Storage bucket `user-uploads`.
3. Returns `UploadedImageRef` objects usable by the Add Image panel and the canvas.
4. Lists the current user's prior uploads for the session gallery.

It wraps the existing `SupabaseService` (already injected throughout the app per 001 audit). It does NOT reuse `ArtDocsService.uploadFile()` — that method is scoped to the `thubnails` bucket and the preview-image pipeline. Mixing content types in one method would tangle retention and policy concerns (see research.md §2).

---

## Public API

```typescript
@Injectable({ providedIn: 'root' })
class ImageUploadService {
  /** Validate a file without touching the network. */
  validate(file: File): Promise<ValidationResult>;

  /** Upload a validated file. Throws if validation has not been run
   *  or failed. Returns the persisted reference. */
  upload(file: File): Promise<UploadedImageRef>;

  /** List the current user's uploads. Returns empty array if the user
   *  is anonymous. */
  listUserUploads(): Promise<UploadedImageRef[]>;

  /** Delete an uploaded image. Callable from the gallery (stretch goal
   *  for Phase 1; not a core requirement). */
  remove(ref: UploadedImageRef): Promise<void>;
}

interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];   // Blocking issues — reject if non-empty
  warnings: ValidationWarning[]; // Non-blocking — user may still proceed
  metadata: {
    width: number | null;
    height: number | null;
    mimeType: string;
    sizeBytes: number;
  };
}

type ValidationError =
  | { code: 'mime'; message: string }
  | { code: 'size'; message: string };

type ValidationWarning =
  | { code: 'dimensions'; message: string };
```

---

## Validation pipeline

Implementation of `validate(file)`:

```typescript
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);
const MAX_BYTES = 10 * 1024 * 1024;   // 10 MiB (FR-023b)
const SOFT_DIMENSION_LIMIT = 4000;    // px (FR-023c)

const errors: ValidationError[] = [];
const warnings: ValidationWarning[] = [];

if (!ALLOWED_MIME.has(file.type)) {
  errors.push({
    code: 'mime',
    message: 'Only JPEG, PNG, WebP, or SVG images are supported.',
  });
}

if (file.size > MAX_BYTES) {
  errors.push({
    code: 'size',
    message: 'Image must be 10 MB or smaller.',
  });
}

let width: number | null = null;
let height: number | null = null;
if (errors.length === 0) {
  // SVG: parse viewBox or width/height attrs from file text
  // raster: createImageBitmap(file) → returns { width, height }
  const dims = await readDimensions(file);
  width = dims.width;
  height = dims.height;
  if (width > SOFT_DIMENSION_LIMIT || height > SOFT_DIMENSION_LIMIT) {
    warnings.push({
      code: 'dimensions',
      message: `This image is ${width}×${height}. Large images may slow the editor.`,
    });
  }
}

return {
  ok: errors.length === 0,
  errors,
  warnings,
  metadata: { width, height, mimeType: file.type, sizeBytes: file.size },
};
```

---

## Upload contract

```typescript
async upload(file: File): Promise<UploadedImageRef> {
  const result = await this.validate(file);
  if (!result.ok) {
    throw new ImageUploadValidationError(result.errors);
  }

  const userId = this.auth.requireUserId();            // throws if anonymous
  const ext = extFromMime(file.type);                  // 'jpg'|'png'|'webp'|'svg'
  const path = `${userId}/${Date.now()}-${nanoid(8)}.${ext}`;

  const { error } = await this.supabase.client
    .storage
    .from('user-uploads')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw new ImageUploadNetworkError(error);

  const { data } = this.supabase.client
    .storage
    .from('user-uploads')
    .getPublicUrl(path);

  return {
    path,
    url: data.publicUrl,
    fileName: sanitizeFileName(file.name),
    mimeType: file.type,
    sizeBytes: file.size,
    width: result.metadata.width,
    height: result.metadata.height,
    uploadedAt: new Date().toISOString(),
    userId,
  };
}
```

---

## Gallery listing

```typescript
async listUserUploads(): Promise<UploadedImageRef[]> {
  const userId = this.auth.currentUserId();
  if (!userId) return [];

  const { data, error } = await this.supabase.client
    .storage
    .from('user-uploads')
    .list(userId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) throw new ImageUploadNetworkError(error);

  return data.map(obj => {
    const path = `${userId}/${obj.name}`;
    const { data: urlData } = this.supabase.client
      .storage
      .from('user-uploads')
      .getPublicUrl(path);
    return {
      path,
      url: urlData.publicUrl,
      fileName: obj.name,
      mimeType: obj.metadata?.mimetype ?? 'image/*',
      sizeBytes: obj.metadata?.size ?? 0,
      width: null,
      height: null,
      uploadedAt: obj.created_at,
      userId,
    };
  });
}
```

---

## Bucket policy (infrastructure concern)

The bucket `user-uploads` MUST be configured as follows (to be executed as part of implementation — not this plan):

```sql
-- Public read, authenticated write under own prefix
create bucket if not exists "user-uploads" with public = true;

-- RLS policies on storage.objects
create policy "authenticated can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'user-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "anyone can read user-uploads"
  on storage.objects for select
  using (bucket_id = 'user-uploads');

create policy "users can delete own uploads"
  on storage.objects for delete
  using (
    bucket_id = 'user-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## Error types

```typescript
class ImageUploadValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super(errors.map(e => e.message).join(' '));
  }
}

class ImageUploadNetworkError extends Error {
  constructor(public cause: unknown) {
    super('Image upload failed. Please try again.');
  }
}
```

Consumers (Add Image panel) surface these errors via `NzMessageService` — the same notification channel used elsewhere in the editor.

---

## Testing contract

- Unit tests with a mocked `SupabaseService` for: valid upload, MIME rejection, size rejection, dimension warning, anonymous user path rejection.
- No integration test against a real Supabase instance in Phase 1 unit suite — a separate manual smoke test in `quickstart.md` covers the happy path.
