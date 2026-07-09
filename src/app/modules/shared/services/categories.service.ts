// src/app/services/categories.service.ts
import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface Category {
  id?: string;
  label: string;
  value: string;
  image_url?: string;
  created_at?: string;
  is_showing?: boolean;
  title?: string;
  description?: string;
  heading?: string;
  full_description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  supabaseService = inject(SupabaseService);
   // ✅ Upload image to Supabase Storage
  async uploadImage(file: File): Promise<string> {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await this.supabaseService.client.storage
      .from('category-images') // bucket name
      .upload(fileName, file);

    if (error) throw error;

    const { data: publicUrl } = this.supabaseService.client
      .storage
      .from('category-images')
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  }

  // ✅ CREATE
  async addCategory(category: Category) {
    const { data, error } = await this.supabaseService.client
      .from('categories')
      .insert([category])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // 📖 READ ALL
  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabaseService.client
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // 🔍 READ ONE
  async getCategoryById(id: string): Promise<Category | null> {
    const { data, error } = await this.supabaseService.client
      .from('categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  // ✏️ UPDATE
  async updateCategory(id: string, updates: Partial<Category>) {
    const { data, error } = await this.supabaseService.client
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // 🗑️ DELETE
  async deleteCategory(id: string) {
    const { error } = await this.supabaseService.client
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
  // 🔍 GET CATEGORY BY VALUE
  async getCategoryByValue(value: string): Promise<Category | null> {
    const { data, error } = await this.supabaseService.client
      .from('categories')
      .select('*')
      .eq('value', value)
      .eq('is_showing', true)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async getVisibleCategories() {
  const { data, error } = await this.supabaseService.client
    .from('categories')
    .select('*')
    .eq('is_showing', true)
    .order('label', { ascending: true }); 

  if (error) throw error;
  return data;
}
}
