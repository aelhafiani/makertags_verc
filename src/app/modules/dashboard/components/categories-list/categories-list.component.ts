import { Component } from '@angular/core';
import { CategoriesService, Category } from '../../../shared/services/categories.service';
import { NzMessageModule, NzMessageService } from 'ng-zorro-antd/message';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

@Component({
  selector: 'app-categories-list',
  imports: [CommonModule,
    ReactiveFormsModule,
    NzTableModule,
    NzButtonModule,
    NzCardModule,
    NzMessageModule,
    NzDrawerModule,
    NzFormModule,
    NzInputModule,
    NzIconModule,
    NzTagModule,
    NzSwitchModule
  ],
  templateUrl: './categories-list.component.html',
  styleUrl: './categories-list.component.scss'

})
export class CategoriesListComponent {
   categories: Category[] = [];
  loading = false;
  drawerVisible = false;
  submitting = false;
  selectedFile: File | null = null;
  categoryForm!: FormGroup;
  previewUrl: string | null = null;

  isEditMode = false;
  editingCategoryId: string | null = null;

  constructor(
    private categoriesService: CategoriesService,
    private message: NzMessageService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadCategories();
  }

  initForm() {
    this.categoryForm = this.fb.group({
      label: ['', [Validators.required]],
      value: ['', [Validators.required]],
      title: [''],
      description: [''],
      heading: [''],
      full_description: [''],
      is_showing: [false],    
});
  }

  async loadCategories() {
    this.loading = true;
    this.categories = await this.categoriesService.getCategories();
    this.loading = false;
  }

  openDrawer() {
    this.drawerVisible = true;
    this.isEditMode = false;
    this.categoryForm.reset();
    this.previewUrl = null;
    this.selectedFile = null;
  }

  closeDrawer() {
    this.drawerVisible = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.previewUrl = URL.createObjectURL(file);
    }
  }

  async submitForm() {
    if (this.categoryForm.invalid) return;
    this.submitting = true;

    try {
      let imageUrl: string | undefined = this.previewUrl || undefined;

      if (this.selectedFile) {
        imageUrl = await this.categoriesService.uploadImage(this.selectedFile);
      }

      const formData = {
        ...this.categoryForm.value,
        image_url: imageUrl,
      };

      if (this.isEditMode && this.editingCategoryId) {
        await this.categoriesService.updateCategory(this.editingCategoryId, formData);
        this.message.success('Category updated successfully');
      } else {
        await this.categoriesService.addCategory(formData);
        this.message.success('Category added successfully');
      }

      this.drawerVisible = false;
      await this.loadCategories();
    } catch (err) {
      this.message.error('Error saving category');
      console.error(err);
    } finally {
      this.submitting = false;
    }
  }

  editCategory(category: Category) {
    this.isEditMode = true;
    this.drawerVisible = true;
    this.editingCategoryId = category.id || null;
    this.categoryForm.patchValue({
      label: category.label,
      value: category.value,
      title:  category.title,
      description:  category.description,
      heading: category.heading,
      full_description: category.full_description,

      is_showing: category.is_showing,
    });
    this.previewUrl = category.image_url || null;
  }

  async deleteCategory(id?: string) {
    if (!id) return;
    await this.categoriesService.deleteCategory(id);
    this.message.success('Category deleted');
    await this.loadCategories();
  }
}
