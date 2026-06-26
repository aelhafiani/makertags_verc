import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { nanoid } from 'nanoid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SupabaseService } from '../../../shared/services/supabase.service';

const STORAGE_BUCKET = 'assets';
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

export interface AssetItem {
  id: string;
  source: string;
  categorie: string;
  type: string;
  scaleX: number;
  scaleY: number;
  angle: number;
  left: number;
  opacity: number;
  top: number;
}

@Component({
  selector: 'maker-tags-assets',
  templateUrl: './assets.component.html',
  styleUrl: './assets.component.scss',
  standalone: false,
})
export class AssetsComponent implements OnInit {
  images: AssetItem[] = [];
  loading = false;
  uploading = false;
  filesToUp?: FileList;
  addNewAssetForm: FormGroup = new FormGroup({});
  visible = false;

  constructor(
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.initNewAssetForm();
    this.getImages();
  }

  initNewAssetForm() {
    this.addNewAssetForm = this.fb.group({
      categorie: ['general', Validators.required],
      type: ['', Validators.required],
    });
  }

  async getImages() {
    this.loading = true;
    try {
      const { data, error } = await this.supabase.client
        .from('assets_images')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      this.images = data ?? [];
    } catch (err) {
      this.message.error('Failed to load assets');
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  async deleteAsset(asset: AssetItem) {
    try {
      const { error: dbError } = await this.supabase.client
        .from('assets_images')
        .delete()
        .eq('id', asset.id);

      if (dbError) throw dbError;

      this.images = this.images.filter((img) => img.id !== asset.id);
      this.message.success('Asset deleted');
    } catch (err) {
      this.message.error('Failed to delete asset');
      console.error(err);
    }
  }

  open(): void {
    this.visible = true;
  }

  close(): void {
    this.initNewAssetForm();
    this.filesToUp = undefined;
    this.visible = false;
  }

  async AddNewAsset(): Promise<void> {
    if (!this.addNewAssetForm.valid) {
      this.message.warning('Please fill all required fields');
      return;
    }
    if (!this.filesToUp || this.filesToUp.length === 0) {
      this.message.warning('Please select at least one file');
      return;
    }

    const { categorie, type } = this.addNewAssetForm.value;
    this.uploading = true;

    try {
      for (const file of Array.from(this.filesToUp)) {
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
          this.message.error(`${file.name}: unsupported format (JPEG, PNG, WebP, SVG only)`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          this.message.error(`${file.name}: file too large (max 10 MB)`);
          continue;
        }

        const ext = file.name.split('.').pop() ?? 'bin';
        const path = `${type}/${categorie}/${nanoid(10)}.${ext}`;

        const { error: uploadError } = await this.supabase.client.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = this.supabase.client.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);

        const { error: dbError } = await this.supabase.client.from('assets_images').insert([
          {
            id: nanoid(),
            source: urlData.publicUrl,
            categorie,
            type,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            left: 50,
            opacity: 1,
            top: 50,
          },
        ]);

        if (dbError) throw dbError;
      }

      this.message.success('Assets uploaded successfully');
      this.close();
      this.getImages();
    } catch (err) {
      this.message.error('Upload failed');
      console.error(err);
    } finally {
      this.uploading = false;
    }
  }

  handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.filesToUp = target.files;
    }
  }
}
