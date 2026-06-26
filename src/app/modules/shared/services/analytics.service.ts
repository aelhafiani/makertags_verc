import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

   supabaseService = inject(SupabaseService);


  // 🔹 1. Ajouter une ligne d'exportation
  async addExport(userId: string, artDocId: string, format: string) {
    const { data, error } = await this.supabaseService.client
      .from('exports')
      .insert([{ user_id: userId, art_doc_id: artDocId, format }]);

    if (error) {
      console.error('Erreur lors de l’ajout de l’exportation:', error);
      throw error;
    }

    return data;
  }

  // 🔹 2. Récupérer le total d’exports par utilisateur
  async getExportsByUser() {
    const { data, error } = await this.supabaseService.client.rpc('get_exports_by_user');
    if (error) {
      console.error('Erreur getExportsByUser:', error);
      throw error;
    }
    return data;
  }

  // 🔹 3. Récupérer le total d’exports par œuvre
  async getExportsByArt() {
    const { data, error } = await this.supabaseService.client.rpc('get_exports_by_art');
    if (error) {
      console.error('Erreur getExportsByArt:', error);
      throw error;
    }
    return data;
  }

  // 🔹 4. Récupérer les exports par jour (tendance)
  async getExportsByDay() {
    const { data, error } = await this.supabaseService.client.rpc('get_exports_by_day');
    if (error) {
      console.error('Erreur getExportsByDay:', error);
      throw error;
    }
    return data;
  }
}
