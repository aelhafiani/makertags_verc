import { inject, Injectable } from '@angular/core';
import { catchError, from, map, Observable, of, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SupabaseService } from './supabase.service';
import { nanoid } from 'nanoid';

export interface IPublicArtDoc {
  id?: string;
  user_art_doc_id: string;
  public_slug: string;
  title?: string;
  description?: string;
  preview_url: string;
  is_indexable?: boolean;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PublicArtService {
  private supabaseService = inject(SupabaseService);
  private nzMessageService = inject(NzMessageService);

  /**
   * Generate a unique slug for the public art
   */
  generateSlug(title?: string): string {
    const base = title
      ? title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
      : 'art';

    const uniquePart = nanoid(8);
    return `${base}-${uniquePart}`;
  }

  /**
   * Create a public art link
   */
  createPublicLink(publicArtDoc: IPublicArtDoc): Observable<IPublicArtDoc> {
    return from(
      this.supabaseService.client
        .from('public_user_art_docs')
        .insert([publicArtDoc])
        .select('*')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          this.nzMessageService.error('Failed to create public link');
          throw error;
        }
        return data;
      }),
      catchError((error) => {
        console.error('Error creating public link:', error);
        this.nzMessageService.error('Failed to create public link');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get public art by slug
   */
  getPublicArtBySlug(slug: string): Observable<IPublicArtDoc> {
    return from(
      this.supabaseService.client
        .from('public_user_art_docs')
        .select('*')
        .eq('public_slug', slug)
        .maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error || !data) {
          throw new Error('Public art not found');
        }
        return data;
      }),
      catchError((error) => {
        console.error('Error fetching public art:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if slug already exists
   */
  slugExists(slug: string): Observable<boolean> {
    return from(
      this.supabaseService.client
        .from('public_user_art_docs')
        .select('id')
        .eq('public_slug', slug)
        .limit(1)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          return false;
        }
        return data && data.length > 0;
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Update public art info
   */
  updatePublicLink(id: string, updates: Partial<IPublicArtDoc>): Observable<IPublicArtDoc> {
    return from(
      this.supabaseService.client
        .from('public_user_art_docs')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data;
      }),
      catchError((error) => {
        console.error('Error updating public link:', error);
        this.nzMessageService.error('Failed to update public link');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get public link for a user art doc
   */
  getPublicLinkForArtDoc(userArtDocId: string): Observable<IPublicArtDoc | null> {
    return from(
      this.supabaseService.client
        .from('public_user_art_docs')
        .select('*')
        .eq('user_art_doc_id', userArtDocId)
        .limit(1)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          return null;
        }
        return data && data.length > 0 ? data[0] : null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Delete public link
   */
  deletePublicLink(id: string): Observable<boolean> {
    return from(
      this.supabaseService.client
        .from('public_user_art_docs')
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
        return true;
      }),
      catchError((error) => {
        console.error('Error deleting public link:', error);
        this.nzMessageService.error('Failed to delete public link');
        return throwError(() => error);
      })
    );
  }
}
