import { Injectable } from '@angular/core';
import { nanoid } from 'nanoid';
import { AuthService } from '../../shared/services/auth.service';
import { SupabaseService } from '../../shared/services/supabase.service';

export interface UploadedImageRef {
  path: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
  userId: string;
}

export interface ValidationError {
  code: 'mime' | 'size';
  message: string;
}

export interface ValidationWarning {
  code: 'dimensions';
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    width: number | null;
    height: number | null;
    mimeType: string;
    sizeBytes: number;
  };
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

const MAX_BYTES = 10 * 1024 * 1024;
const SOFT_DIMENSION_LIMIT = 4000;

export class ImageUploadValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(errors.map((item) => item.message).join(' '));
    this.name = 'ImageUploadValidationError';
  }
}

export class ImageUploadNetworkError extends Error {
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super('Image upload failed. Please try again.');
    this.name = 'ImageUploadNetworkError';
    this.cause = cause;
  }
}

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly authService: AuthService
  ) {}

  async validate(file: File): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
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
      const dimensions = await this.readDimensions(file);
      width = dimensions.width;
      height = dimensions.height;

      if ((width ?? 0) > SOFT_DIMENSION_LIMIT || (height ?? 0) > SOFT_DIMENSION_LIMIT) {
        warnings.push({
          code: 'dimensions',
          message: `This image is ${width}x${height}. Large images may slow the editor.`,
        });
      }
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      metadata: {
        width,
        height,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    };
  }

  async upload(file: File): Promise<UploadedImageRef> {
    const validation = await this.validate(file);
    if (!validation.ok) {
      throw new ImageUploadValidationError(validation.errors);
    }

    // Ensure the Supabase client has a valid session before uploading.
    // The client may lose its session after a page refresh or token expiry
    // even though the NGXS store still holds the user id.
    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    if (!sessionData.session) {
      throw new ImageUploadValidationError([
        { code: 'mime', message: 'Your session has expired. Please sign in again.' },
      ]);
    }

    const userId = sessionData.session.user.id;

    const ext = this.extensionFromMime(file.type);
    const path = `${userId}/${Date.now()}-${nanoid(8)}.${ext}`;

    const { error } = await this.supabaseService.client.storage.from('user-uploads').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      throw new ImageUploadNetworkError(error);
    }

    const { data } = this.supabaseService.client.storage.from('user-uploads').getPublicUrl(path);
    return {
      path,
      url: data.publicUrl,
      fileName: this.sanitizeFileName(file.name),
      mimeType: file.type,
      sizeBytes: file.size,
      width: validation.metadata.width,
      height: validation.metadata.height,
      uploadedAt: new Date().toISOString(),
      userId,
    };
  }

  async listUserUploads(): Promise<UploadedImageRef[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return [];
    }

    const { data, error } = await this.supabaseService.client.storage.from('user-uploads').list(userId, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      throw new ImageUploadNetworkError(error);
    }

    return (data ?? []).map((item) => {
      const path = `${userId}/${item.name}`;
      const { data: urlData } = this.supabaseService.client.storage.from('user-uploads').getPublicUrl(path);
      const metadata = (item.metadata ?? {}) as { size?: number; mimetype?: string };
      return {
        path,
        url: urlData.publicUrl,
        fileName: item.name,
        mimeType: metadata.mimetype ?? 'image/*',
        sizeBytes: metadata.size ?? 0,
        width: null,
        height: null,
        uploadedAt: item.created_at ?? new Date().toISOString(),
        userId,
      };
    });
  }

  async remove(ref: UploadedImageRef): Promise<void> {
    const { error } = await this.supabaseService.client.storage.from('user-uploads').remove([ref.path]);
    if (error) {
      throw new ImageUploadNetworkError(error);
    }
  }

  private async readDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
    if (file.type === 'image/svg+xml') {
      const svgText = await file.text();
      const viewBoxMatch = svgText.match(/viewBox\s*=\s*"([^"]+)"/i);
      if (viewBoxMatch) {
        const parts = viewBoxMatch[1].trim().split(/\s+/);
        const width = Number(parts[2]);
        const height = Number(parts[3]);
        return {
          width: Number.isFinite(width) ? width : null,
          height: Number.isFinite(height) ? height : null,
        };
      }
      return { width: null, height: null };
    }

    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    }

    return { width: null, height: null };
  }

  private getCurrentUserId(): string | null {
    const session = this.authService.getCurrentUserSession();
    return session?.user?.id ?? null;
  }

  private extensionFromMime(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/svg+xml':
        return 'svg';
      default:
        return 'bin';
    }
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
  }
}

