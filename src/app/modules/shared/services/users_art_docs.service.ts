import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { IArtDoc } from '../domaine/entities/art';
import { ArtDocsService } from './art-docs.service';

export interface ArtDocFace {
  id: string;
  side: 'recto' | 'verso';
  preview?: string;
  canvasContent?: any;
  backgroundColor?: string;
  height?: number;
  width?: number;
  size?: string;
}

export interface ArtDocUser {
  id: string;
  name: string;
  title: string;
  description: string;
  size?: string;
  height?: number;
  width?: number;
  categorie?: string;
  preview_realized_art?: string;
  generated_preview_url?: string;
  art_docs_faces?: ArtDocFace[];
}

export interface UserArtDoc {
  id: string;
  user_id: string;
  art_doc_id: string;
  created_at: string;
  art_docs?: ArtDocUser;
}

@Injectable({ providedIn: 'root' })
export class UserArtDocsService {
    supabaseService = inject(SupabaseService);
    artDocService = inject(ArtDocsService);

  // ➕ CREATE — Sauvegarder un modèle utilisateur
async createUserArtDoc(userId: string, artDoc: IArtDoc):  Promise<IArtDoc>  {
   const client = this.supabaseService.client;

  // 🔍 Vérifie si une copie existe déjà
  const { data: existing, error: checkError } = await client
    .from('user_art_docs')
    .select(`
      id,
      art_docs (
        id, name, title, description, size, height, width, categorie,
        preview_realized_art, generated_preview_url, is_3d, is_premuim, exported_times, status, tags
      ),
      user_art_docs_faces ( id, side, preview, canvasContent )
    `)
    .eq('user_id', userId)
    .eq('id', artDoc.id)
    .maybeSingle();

  if (checkError) throw checkError;

  // ✅ Si déjà existant → formater et retourner
  if (existing) {
    const doc = Array.isArray(existing.art_docs)
      ? existing.art_docs[0]
      : existing.art_docs;

    return this.formatUserArtDoc(existing.id, doc, existing.user_art_docs_faces);
  }

  // 🆕 Crée la ligne principale
  const { data: userArtDoc, error: insertError } = await client
    .from('user_art_docs')
    .insert([{ user_id: userId, art_doc_id: artDoc.id }])
    .select('id')
    .single();

  if (insertError) throw insertError;

  // 📄 Copie les faces du modèle original
  const facesToInsert = artDoc.pages?.map(face => ({
    user_art_doc_id: userArtDoc.id,
    side: face.side,
    preview: face.preview,
    canvasContent: face.canvasContent,
  })) ?? [];

  let createdFaces: any[] = [];

  if (facesToInsert.length > 0) {
    const { data: insertedFaces, error: facesError } = await client
      .from('user_art_docs_faces')
      .insert(facesToInsert)
      .select('*');

    if (facesError) throw facesError;
    createdFaces = insertedFaces;
  }

  // 🧩 Retourner l’objet complet au format IArtDoc
  return this.formatUserArtDoc(userArtDoc.id, artDoc, createdFaces);
}


/** 🧩 Helper pour formater au modèle IArtDoc */
private formatUserArtDoc(
  id: string,
  artDoc: any,
  faces: any[] = []
): IArtDoc {
  return {
    ...artDoc,
    id,
    original_id: artDoc?.id,
    reviews: [],
    pages: faces.map(f => ({
      id: f.id,
      side: f.side,
      preview: f.preview,
      canvasContent: f.canvasContent,
    })),
    type: 'copy',
  } as IArtDoc;
}







  async getUserArtDocs(userId: string): Promise<IArtDoc[]> {
  const client = this.supabaseService.client;

  const { data, error } = await client
    .from('user_art_docs')
    .select(`
      id,
      art_doc_id,
      created_at,
      art_docs ( id, name, title, categorie, size, height, width, is_premuim, generated_preview_url, preview_realized_art ),
      user_art_docs_faces ( id, side, preview )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // 2️⃣ Formate en structure IArtDoc
  return (data || []).map((item: any) => {
    const artDoc = Array.isArray(item.art_docs)
      ? item.art_docs[0]
      : item.art_docs;

    return {
      ...artDoc,
      id: item.id, // ⚠️ on prend l'id du user_art_doc
      original_id: artDoc?.id, // référence au modèle original
      type: 'copy',
      created_at: item.created_at,
      pages: (item.user_art_docs_faces || []).map((face: any) => ({
        id: face.id,
        side: face.side,
        preview: face.preview,
      })),
    } as IArtDoc;
  });
}

  


  

  // ❌ DELETE — Supprimer un modèle sauvegardé
  async deleteUserArtDoc(userArtDocId: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('user_art_docs')
      .delete()
      .eq('id', userArtDocId);

    if (error) throw error;
  }


  async getUserArtDocById(userId: string, artDocId: string): Promise<IArtDoc | undefined> {
  const { data, error } = await this.supabaseService.client
    .from('user_art_docs')
    .select(`
      id,
      art_docs (
        id, name, title, description, size, height, width, categorie,
        preview_realized_art, generated_preview_url, is_3d, is_premuim, status
      ),
      user_art_docs_faces (
        id, side, preview, canvasContent
      )
    `)
    .eq('user_id', userId)
    .eq('id', artDocId)
    .maybeSingle();

  if (error || !data) throw error || new Error('User ArtDoc not found');

  const artDocs = Array.isArray(data.art_docs) ? data.art_docs[0] : data.art_docs;

  return {
    ...artDocs,
    id: data.id,
    original_id: artDocs?.id,
    pages: data.user_art_docs_faces || [],
    type: 'copy'
  } as IArtDoc;
}
/** 🔄 GET OR CREATE — récupère ou crée la copie utilisateur */
async getOrCreateUserArtDoc(userId: string, artDocId: string): Promise<IArtDoc> {
  const client = this.supabaseService.client;

  // 1️⃣ Vérifie si la copie utilisateur existe déjà
  const existing = await this.getUserArtDocById(userId, artDocId).catch(() => undefined);
  if (existing) {
    return existing; // ✅ copie déjà existante → on la retourne
  }

  // 2️⃣ Récupère le modèle original dans `art_docs`
  const { data: originalArtDoc, error: fetchError } = await client
    .from('art_docs')
    .select(`
      id,
      name,
      title,
      description,
      categorie,
      size,
      height,
      width,
      preview_realized_art,
      generated_preview_url,
      is_premuim,
      is_3d,
      exported_times,
      status,
      tags,
      reviews,
      art_docs_faces!fk_art_doc (
      id, side, preview, canvasContent
    )
    `)
    .eq('id', artDocId)
    .maybeSingle();

  if (fetchError || !originalArtDoc) {
    throw fetchError || new Error('Original ArtDoc not found');
  }

  // 3️⃣ Crée une copie utilisateur dans user_art_docs
const   newCopy = await this.createUserArtDoc(userId, {
    ...originalArtDoc,
    pages: originalArtDoc.art_docs_faces || [],
  } as IArtDoc);

  // 4️⃣ Récupère la nouvelle copie utilisateur
  
  if (!newCopy) throw new Error('Failed to create user ArtDoc copy');

  return newCopy;
}

/**
 * Save canvas content for user faces.
 * - If face has an id → direct update on user_art_docs_faces (user copy already exists)
 * - If no face id → find/create user_art_doc then insert new faces
 * Writes ONLY to user_art_docs + user_art_docs_faces, never to art_docs_faces.
 */
async saveUserCanvasContent(
  userId: string,
  originalArtDocId: string,
  pages: { id?: string; canvasContent?: any; preview?: string; side?: string }[]
): Promise<void> {
  const client = this.supabaseService.client;

  // Case 1: faces already have IDs → direct update (user came from /creator/my/:id)
  const pagesWithId = pages.filter(p => !!p.id);
  if (pagesWithId.length > 0) {
    for (const page of pagesWithId) {
      const { error } = await client
        .from('user_art_docs_faces')
        .update({
          canvasContent: page.canvasContent,
          preview: page.preview ?? null,
        })
        .eq('id', page.id!);
      if (error) throw error;
    }
    return;
  }

  // Case 2: no face IDs → find or create user_art_doc then upsert faces
  const { data: existing } = await client
    .from('user_art_docs')
    .select('id, user_art_docs_faces(id, side)')
    .eq('user_id', userId)
    .eq('art_doc_id', originalArtDocId)
    .maybeSingle();

  let userDocId: string;
  let existingFaces: { id: string; side: string }[] = [];

  if (existing) {
    userDocId = existing.id;
    existingFaces = (existing.user_art_docs_faces as any[]) || [];
  } else {
    const { data: newDoc, error } = await client
      .from('user_art_docs')
      .insert([{ user_id: userId, art_doc_id: originalArtDocId }])
      .select('id')
      .single();
    if (error) throw error;
    userDocId = newDoc.id;
  }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const faceId = existingFaces[i]?.id;

    if (faceId) {
      const { error } = await client
        .from('user_art_docs_faces')
        .update({ canvasContent: page.canvasContent, preview: page.preview ?? null })
        .eq('id', faceId);
      if (error) throw error;
    } else {
      const { error } = await client
        .from('user_art_docs_faces')
        .insert([{
          user_art_doc_id: userDocId,
          side: page.side ?? (i === 0 ? 'front' : 'back'),
          canvasContent: page.canvasContent,
          preview: page.preview ?? null,
        }]);
      if (error) throw error;
    }
  }
}

async updateUserArtDocFace(faceId: string, updates: Partial<ArtDocFace>): Promise<void> {
  const { error } = await this.supabaseService.client
    .from('user_art_docs_faces')
    .update({
      canvasContent: updates.canvasContent,
      preview: updates.preview,
    })
    .eq('id', faceId);

  if (error) throw error;
}

// ➕ GET user_art_doc by ID with relations (used for public art view)
getPublicUserArtDocById(userArtDocId: string) {
  return new Promise((resolve, reject) => {
    this.supabaseService.client
      .from('user_art_docs')
      .select(`
        id,
        art_docs (
          id, name, title, description, size, height, width, categorie,
          preview_realized_art, generated_preview_url, is_3d, is_premuim, exported_times, status, tags
        ),
        user_art_docs_faces (
          id, side, preview, canvasContent
        )
      `)
      .eq('id', userArtDocId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          reject(error);
        } else if (!data) {
          reject(new Error('User ArtDoc not found'));
        } else {
          // Extract and format the data
          const artDocs = Array.isArray(data.art_docs) ? data.art_docs[0] : data.art_docs;
          const artDocFaces = data.user_art_docs_faces || [];
          
          const result = {
            ...artDocs,
            id: data.id,
            original_id: artDocs?.id,
            pages: artDocFaces.map((face: any) => ({
              id: face.id,
              side: face.side,
              preview: face.preview,
              canvasContent: face.canvasContent
            }))
          };
          
          resolve(result);
        }
      });
  });
}

}
