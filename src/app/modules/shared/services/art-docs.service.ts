import { Inject, inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, from, map, Observable, of, switchMap, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { IArtDoc } from '../domaine/entities/art';
import { nanoid } from 'nanoid';
import { SupabaseService } from './supabase.service';
import { ENVIRONMENTS } from '../../../core/app.tokens';

@Injectable({
  providedIn: 'root'
})
export class ArtDocsService {
  supabaseService = inject(SupabaseService);
  constructor(
    private nzMessageService: NzMessageService,
    private httpClient: HttpClient,
    @Inject(ENVIRONMENTS) private environment: any
  ) {}
  getAllArtsByLimit(limit) : Observable<any[]> {
  const artsQuery = this.supabaseService.client
    .from('art_docs')
    .select('*')
    .eq('status', 'published') 
    .order('created_at', { ascending: false }) // emulate limitToLast
    .limit(limit);

  return from(
    artsQuery.then(({ data, error }) => {
      if (error) throw error;
      return data ? data.reverse() : [];
    })
  );
}
  async getPagesForDoc(artDocId: string) {
    const { data, error } = await this.supabaseService.client
      .from('art_docs_faces')
      .select('*')
      .eq('art_doc_id', artDocId);

    if (error) {
      console.error(`Error fetching pages for ${artDocId}:`, error);
      throw error;
    }

    return data;
  }

isUUIDv4(id: string): boolean {
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}

getArtworkByid(id: string): Observable<any> {
  if (!id) {
    this.nzMessageService.error('No ID provided');
    return of(null);
  }

  const columnToQuery = this.isUUIDv4(id) ? 'id' : 'firestore_id';

  return from(
    this.supabaseService.client
      .from('art_docs')
      .select('*')
      .eq(columnToQuery, id)
      .single()
  ).pipe(
    map(({ data, error }) => {
      if (error || !data) {
        this.nzMessageService.error('Document does not exist');
        return null;
      }
      return data;
    }),
    catchError((error) => {
      console.error('Error in getArtworkByid:', error);
      this.nzMessageService.error('Error fetching artwork');
      return of(null);
    })
  );
}

  getFilteredArts(filters?: any): Observable<any[]> {
  // Start building the query
  let query = this.supabaseService.client
    .from('art_docs')
    .select('*')
    .eq('status', 'published') // default filter
    .order('created_at', { ascending: false }); // default order

  // Add optional filters
  if (filters?.category) {
    query = query.eq('categorie', filters.category);
  }
  if (filters?.size) {
    query = query.eq('size', filters.size);
  }


  // Convert to Observable
  return from(query).pipe(
    map(({ data, error }) => {
      if (error) {
        throw error;
      }
      return data || [];
    }),
    catchError((error) => {
      console.error('Error in getFilteredArts:', error);
      this.nzMessageService?.error?.('Failed to load artworks');
      return of([]);
    })
  );
}

getArtByCategoryLimit(category: string, limit: number = 4): Observable<any[]> {
   return from(
    this.supabaseService.client
      .from('art_docs')
      .select('*')
      .eq('categorie', category)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit)

  ).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      return data || [];
    }),
    catchError((error) => {
      console.error('Error in getArtByCategory:', error);
      this.nzMessageService?.error?.('Failed to load artworks');
      return of([]);
    })
  );
}
getArtByCategory(category: string): Observable<any[]> {
  return from(
    this.supabaseService.client
      .from('art_docs')
      .select('*')
      .eq('categorie', category)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

  ).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      return data || [];
    }),
    catchError((error) => {
      console.error('Error in getArtByCategory:', error);
      this.nzMessageService?.error?.('Failed to load artworks');
      return of([]);
    })
  );
}

getQuestions(): Observable<any[]> {
  return from(
     this.supabaseService.client.from('questions').select('*')
  ).pipe(
    map(res => {
      if (res.error) throw res.error;
      return res.data ?? [];
    }),
    catchError(err => {
      console.error('Error fetching questions:', err);
      return of([]);
    })
  );
}



getFilteredArtsForDashboard(filters: any = {}): Observable<any[]> {
  // Start base query
  let query = this.supabaseService.client
    .from('art_docs')
    .select('*')
    .order('created_at', { ascending: false }); // default order

  // Map filters to Supabase query conditions
  const filterMappings: { [key: string]: any } = {
    categorie: filters.category,
    status: filters.status !== 'all' ? filters.status : null,
    size: filters.size
    };

  // Dynamically apply filters
  for (const [field, value] of Object.entries(filterMappings)) {
    if (value !== null && value !== undefined) {
      query = query.eq(field, value);
    }
  }

  // Convert to Observable
  return from(query).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      return data || [];
    }),
    catchError((error) => {
      console.error('Error in getFilteredArtsForDashboard:', error);
      this.nzMessageService?.error?.('Failed to load artworks');
      return of([]);
    })
  );
}

getAllArts(): Observable<any[]> {
  return from(
    this.supabaseService.client
      .from('art_docs')
      .select('*')
      .order('created_at', { ascending: false })
  ).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      return data || [];
    }),
    catchError((error) => {
      console.error('Error fetching all arts:', error);
      this.nzMessageService?.error?.('Failed to load artworks');
      return of([]);
    })
  );
}


addArtDocAndPages(artDoc: IArtDoc): Observable<void> {
  // Exclude pages from the main document
  const { pages, ...mainDocData } = artDoc;
  const artDocPublished = { ...mainDocData, status: "draft" };

return from(
   this.supabaseService.client.from('art_docs').insert([artDocPublished]).select('id').single()
).pipe(
  switchMap(({ data, error }) => {
    if (error) {
      this.nzMessageService.error('Document already exists');
      throw new Error('Document already exists');
    }

    const artDocId = data?.id || artDoc.id;
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return of(undefined);
    }

    // Insert all pages with the correct art_doc_id
    const pagesWithDocId = pages.map(page => ({
      ...page,
      art_doc_id: artDocId
    }));

    return from(
       this.supabaseService.client.from('art_docs_faces').insert(pagesWithDocId)
    ).pipe(map(() => undefined));
  }),
  catchError((error) => {
    console.error("Error in addArtDocAndPages:", error);
    this.nzMessageService.error('Failed to add document');
    return throwError(() => error);
  })
);
}


  async uploadFile(file: File, path: string, id?: string): Promise<any> {
    const fileName = id ? `${id}.png` : `${nanoid()}.png`;
    const fullPath = `${path}/${fileName}`;
    const { data, error } = await this.supabaseService.client.storage
      .from('thubnails')
      .upload(fullPath, file, { upsert: true });
    console.log('Upload response:', { data, error });

    if (error) {
      throw error;
    }
    return data;
  }

      getImagesByCategotiries(){
    return from(
      this.supabaseService.client
      .from('assets_images')
      .select('*')
    ).pipe(
      map(({ data, error }) => {
      if (error) throw error;
      return data || [];
      }),
      catchError((error) => {
      console.error('Error fetching images by categories:', error);
      this.nzMessageService?.error?.('Failed to load images');
      return of([]);
      })
    );

   }


   async updateArtDocPages(docArt: IArtDoc) {
 try {
    // Check if pages exist and are not empty
    if (!docArt.pages || docArt.pages.length === 0) {
      console.log('No pages to update for document:', docArt.id);
      return { success: true };
    }

    const newPages = docArt.pages.map((page) => ({
      id: page.id,
      art_doc_id: docArt.id,
      ...page,
      canvasContent: page.canvasContent,
    }));

    const { error: upsertError } = await this.supabaseService.client
      .from("art_docs_faces")
      .upsert(newPages, { onConflict: 'id' }); 
      // "id" must be PRIMARY KEY or UNIQUE in your table

    if (upsertError) throw upsertError;

    return { success: true };
  } catch (err) {
    console.error("Error updating art document pages:", err);
    throw err;
  }
}

  /**
   * Update art doc pages and publish to WordPress blog
   */
  async updateArtDocAndPublishToWordPress(
    docArt: IArtDoc,
    wpData: { title: string; description: string; editor_url: string }
  ) {
    try {
      // Step 1: Update art doc pages
      await this.updateArtDocPages(docArt);
      console.log('Art document pages updated successfully');

      // Step 2: Publish to WordPress
      const url = `${this.environment.hostServer}/.netlify/functions/create-model-wp`;
      return this.httpClient
        .post(url, wpData)
        .toPromise()
        .then((response) => {
          this.nzMessageService.success('Published to blog successfully');
          console.log('WordPress post created:', response);
          return { success: true, response };
        })
        .catch((error) => {
          console.error('Error publishing to WordPress:', error);
          this.nzMessageService.error('Failed to publish to blog');
          throw error;
        });
    } catch (err) {
      console.error('Error in updateArtDocAndPublishToWordPress:', err);
      this.nzMessageService.error('Error updating document and publishing');
      throw err;
    }
  }

updateArtDoc(docArt: IArtDoc) {
  console.log("Updating document with ID:", docArt.id);
  return from(
    this.supabaseService.client
      .from("art_docs")
      .update(docArt)
      .eq("id", docArt.id)
      .select("*") // return updated row(s)
  ).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      console.log("Document updated successfully:", data);
      if (!data || data.length === 0) {
        this.nzMessageService.error("Document does not exist");
        throw new Error("Document does not exist");
      }
      return data[0]; // return the updated document
    }),
    catchError((err) => {
      console.error("Error in updateArtDoc:", err);
      return throwError(() => err);
    })
  );
}


removeArtDoc(id: string) {
  // Delete faces first (ignore RLS silent failures), then delete the parent doc
  return from(
    this.supabaseService.client
      .from('art_docs_faces')
      .delete()
      .eq('art_doc_id', id)
  ).pipe(
    // Proceed even if faces delete failed (RLS may block it silently)
    catchError(() => of(null)),
    switchMap(() =>
      from(
        this.supabaseService.client
          .from('art_docs')
          .delete()
          .eq('id', id)
      )
    ),
    map(({ error }) => {
      if (error) throw error;
      return true;
    }),
    catchError((err) => {
      console.error('Error deleting art doc:', err);
      return of(false);
    })
  );
}



async getArtDocById(id: string): Promise<IArtDoc | undefined> {
    const isUUIDv4 = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    const queryColumn = isUUIDv4(id) ? 'id' : 'firestore_id';

    const { data: artDoc, error } = await this.supabaseService.client
      .from('art_docs')
      .select('*')
      .eq(queryColumn, id)
      .single();

    if (error || !artDoc) throw error || new Error('Document not found');

    const { data: pages, error: pagesError } = await this.supabaseService.client
      .from('art_docs_faces')
      .select('*')
      .eq('art_doc_id', artDoc.id)
      .order('created_at', { ascending: true });

    if (pagesError) throw pagesError;

    return { ...artDoc, pages: pages || [] };
  }
}
