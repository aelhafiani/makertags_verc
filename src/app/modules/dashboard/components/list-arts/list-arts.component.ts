import { AfterViewInit, Component, ElementRef, inject, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { nanoid } from 'nanoid';
import { NzMessageService } from 'ng-zorro-antd/message';
import {  take } from 'rxjs';
import { NzDropdownMenuComponent } from 'ng-zorro-antd/dropdown';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { HttpClient } from '@angular/common/http';
import { IArtDoc } from '../../../shared/domaine/entities/art';
import { ArtFacadeService } from '../../../shared/services/new-art.facade';
import { ArtDocsService } from '../../../shared/services/art-docs.service';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { CategoriesService, Category } from '../../../shared/services/categories.service';
import { AiTextGeneratorService } from '../../../author/services/ai-text-generator.service';

@Component({
  selector: 'maker-tags-list-arts',
  templateUrl: './list-arts.component.html',
  styleUrl: './list-arts.component.css',
   standalone: false
})
export class ListArtsComponent implements OnInit , AfterViewInit {
  http = inject(HttpClient);
  @ViewChildren('menuDropdownContent') dropdowns!: QueryList<NzDropdownMenuComponent>;
  dropdownRefs: NzDropdownMenuComponent[] = [];
  arts_thumbnails: NzUploadFile[] =  [
  ];
  artsList:IArtDoc[] = []
  selectedDoc?:IArtDoc
  editMode:boolean = false
  visible = false;
  newArtId = uuidv4();
  editorModal= 'ddd'

  loading = false;
  isPublishingToWP = false;
  mainPreview: string = '';
  tags = ['tags'];
  inputVisible = false;
  inputValue = '';
  previewImage: string | undefined = '';
  previewVisible = false;
  categories: Category[] = [];
  categoriesForAdded: Category[] = [];

  aiGenerating = false;
  aiGeneratingTags = false;
  // Sizes array
  sizes = [
    { label: 'All', value: null },
    { label: 'Business Card Size', value: '2 x 3.5' },
    { label: 'Square', value: '2 x 2' },
    { label: 'Rectangular', value: '1.75 x 3.75' },
    { label: 'Rec Smaller than Business Card Size', value: '2 x 3' },
    { label: 'Cut Die Card Size', value: '6 x 2.5' },
  ];

  status = [
    { label: 'All', value: null },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' }
  ]
    filterForm: FormGroup  = new FormGroup({});
supabaseService = inject(SupabaseService);
  constructor(private newArtFacade:ArtFacadeService, 
     private categoriesService: CategoriesService,
    private fb:FormBuilder,private router:Router,
    private artDocsService:ArtDocsService,
    private nzMessageService:NzMessageService,
    private aiTextGenerator: AiTextGeneratorService){}
  addNewArtForm!:FormGroup

  get isCustomSize(): boolean {
    return this.addNewArtForm?.get('size')?.value === 'custom';
  }

  private get effectiveSize(): string {
    if (this.isCustomSize) {
      return this.addNewArtForm?.get('customSizeLabel')?.value?.trim() || 'custom';
    }
    return this.addNewArtForm?.get('size')?.value;
  }

  private readonly PRESET_SIZES = ['2 x 3.5', '2 x 2', '1.75 x 3.75', '2 x 3', '6 x 2.5'];
    ngAfterViewInit(): void {
  this.dropdownRefs = this.dropdowns.toArray();
}
@ViewChild('inputElement', { static: false }) inputElement?: ElementRef;

  ngOnInit():void{
    this.loadCategories();
    this.addNewArtForm = this.fb.group({
    generated_preview_url: [''],
    size: '',
    customSizeLabel: [''],
    width: 0,
    height: 0,
    title: 'title example',
    categorie: 'category example',
    description: 'description example',
    tags: [],
    video: '',
    status: 'draft',
    is_premuim: false,
    is_3d: false
  });
  this.filterForm = this.fb.group({
    category: [null],
    size: [null],
    popular: [null],
    status: [null]
  });
  this.addNewArtForm?.get('size')?.valueChanges.subscribe((value)=>{
    if (value === '2 x 3.5') {
      this.addNewArtForm?.get('width')?.setValue(320, {emitEvent:false});
      this.addNewArtForm?.get('height')?.setValue(545, {emitEvent:false});
    } else if (value === '2 x 2') {
      this.addNewArtForm?.get('width')?.setValue(320, {emitEvent:false});
      this.addNewArtForm?.get('height')?.setValue(320, {emitEvent:false});
    } else if (value === '1.75 x 3.75') {
      this.addNewArtForm?.get('width')?.setValue(283, {emitEvent:false});
      this.addNewArtForm?.get('height')?.setValue(583, {emitEvent:false});
    } else if (value === '2 x 3') {
      this.addNewArtForm?.get('width')?.setValue(320, {emitEvent:false});
      this.addNewArtForm?.get('height')?.setValue(470, {emitEvent:false});
    } else if (value === '6 x 2.5') {
      this.addNewArtForm?.get('width')?.setValue(1200, {emitEvent:false});
      this.addNewArtForm?.get('height')?.setValue(500, {emitEvent:false});
    } else if (value === 'custom') {
      this.addNewArtForm?.get('width')?.setValue(0, {emitEvent:false});
      this.addNewArtForm?.get('height')?.setValue(0, {emitEvent:false});
    }
  })

  this.getArtsList()
    this.filterForm.valueChanges
        .subscribe((filters) => {
          this.artsList = []
          this.artDocsService.getFilteredArtsForDashboard(filters).subscribe((arts) => {
          this.artsList = arts;
          })
         });
}


  handlePreview = (file: NzUploadFile) => {
    // if (!file.url && !file.preview) {
    //   file.preview = await getBase64(file.originFileObj!);
    // }
    this.previewImage = file.url
    this.previewVisible = true;
  }

  handleClose(removedTag: {}): void {
    this.tags = this.tags.filter(tag => tag !== removedTag);
  }

  async loadCategories() { 
      this.categories = await this.categoriesService.getVisibleCategories();
          this.categoriesForAdded =   await this.categoriesService.getCategories();

  }
  sliceTagName(tag: string): string {
    const isLongTag = tag.length > 20;
    return isLongTag ? `${tag.slice(0, 20)}...` : tag;
  }

  showInput(): void {
    this.inputVisible = true;
    setTimeout(() => {
      this.inputElement?.nativeElement.focus();
    }, 10);
  }

  handleInputConfirm(): void {
    if (this.addNewArtForm.get('tags')?.value && this.tags.indexOf(this.inputValue) === -1) {
      this.tags = [...this.tags, this.addNewArtForm.get('tags')?.value];
    }
    this.addNewArtForm.get('tags')?.setValue('');
    this.inputVisible = false;
  }


  onEditDoc(docId: any) {
    this.newArtId = docId
    this.selectedDoc = this.artsList.find((doc) => doc.id === docId);
    this.mainPreview = this.selectedDoc?.preview_realized_art ?? ''
    const thumbnailsStr = this.selectedDoc?.thumbnails;
    try {
      this.arts_thumbnails = thumbnailsStr && thumbnailsStr !== '[]' ? JSON.parse(thumbnailsStr) : [];
    } catch {
      this.arts_thumbnails = [];
    }
    this.editMode = true;
    if (this.selectedDoc) {
      const storedSize = this.selectedDoc.size ?? '';
      const isPreset = this.PRESET_SIZES.includes(storedSize);
      this.addNewArtForm.patchValue({
        size: isPreset ? storedSize : 'custom',
        customSizeLabel: isPreset ? '' : storedSize,
        width: this.selectedDoc.width,
        height: this.selectedDoc.height,
        title: this.selectedDoc.title,
        video : this.selectedDoc.video,
        description: this.selectedDoc.description,
        status: this.selectedDoc.status,
        categorie: this.selectedDoc.categorie,
        generated_preview_url: this.selectedDoc?.generated_preview_url ? this.selectedDoc?.generated_preview_url : '',
        tags: [],
        is_premuim: this.selectedDoc.is_premuim,
        is_3d: this.selectedDoc.is_3d
      });
      this.tags = this.selectedDoc.tags || [];
    }
    this.visible = true;
  }
  async openAddArt(): Promise<void> {
    this.visible = true;
  }

  close(): void {
    this.addNewArtForm.reset();
    this.loading = false;
    this.mainPreview = '';
    this.arts_thumbnails = [];
    this.visible = false;
  }

  async generateTitleAndDescription(): Promise<void> {
    if (this.aiGenerating) return;
    this.aiGenerating = true;
    try {
      const result = await this.aiTextGenerator.generateArtDocMeta({
        title: this.addNewArtForm.get('title')?.value ?? '',
        category: this.addNewArtForm.get('categorie')?.value ?? '',
        size: this.addNewArtForm.get('size')?.value ?? '',
      });
      let updated = false;
      if (result.title) { this.addNewArtForm.get('title')?.setValue(result.title); updated = true; }
      if (result.description) { this.addNewArtForm.get('description')?.setValue(result.description); updated = true; }
      if (updated) {
        this.nzMessageService.success('Title & description generated!');
      } else {
        this.nzMessageService.warning('AI returned empty content, please retry.');
      }
    } catch (e) {
      console.error('[AI] generateTitleAndDescription error:', e);
      this.nzMessageService.error('AI generation failed, please retry.');
    } finally {
      this.aiGenerating = false;
    }
  }

  async generateMetaTags(): Promise<void> {
    if (this.aiGeneratingTags) return;
    this.aiGeneratingTags = true;
    try {
      const result = await this.aiTextGenerator.generateArtDocMeta({
        title: this.addNewArtForm.get('title')?.value ?? '',
        category: this.addNewArtForm.get('categorie')?.value ?? '',
        size: this.addNewArtForm.get('size')?.value ?? '',
      });
      if (result.tags.length > 0) {
        this.tags = result.tags;
        this.nzMessageService.success('Meta tags generated!');
      }
    } catch {
      this.nzMessageService.error('AI tags generation failed, please retry.');
    } finally {
      this.aiGeneratingTags = false;
    }
  }
  sanitizeQuillContent(html: string): string {
    return html.replace(/&nbsp;/g, ' '); // Replace non-breaking spaces with normal spaces
  }
 async AddNewArt() {
    if(!this.selectedDoc){
      this.newArtFacade.resetArtStore();
      this.addNewArtForm.get('tags')?.setValue(this.tags);
      let arts_thumbnails = JSON.stringify(this.arts_thumbnails);
      const cleanDescription = this.sanitizeQuillContent(this.addNewArtForm.get('description')?.value);
      this.addNewArtForm.get('description')?.value.replace(/<[^>]*>/g, '');
      const artData = {
        id: this.newArtId,
        video: this.addNewArtForm.get('video')?.value,
        is_premuim: Boolean(this.addNewArtForm.get('is_premuim')?.value),
        is_3d: Boolean(this.addNewArtForm.get('is_3d')?.value),
        name: this.addNewArtForm.get('title')?.value,
        categorie: this.addNewArtForm.get('categorie')?.value,
        preview_realized_art: this.mainPreview,
        thumbnails: arts_thumbnails,
        pages: [],
        status: 'draft',
        title: this.addNewArtForm.get('title')?.value,
        description: cleanDescription,
        tags: this.tags,    
        size: this.effectiveSize,
        width: Number(this.addNewArtForm.get('width')?.value),
        height: Number(this.addNewArtForm.get('height')?.value),
        created_at: new Date(),
        reviews: [],
        exported_times: 0
      }
      this.newArtFacade.setArtDoc(artData)
      this.newArtFacade.addNewPage();
  
      this.newArtFacade.setArtByPage({id:nanoid(),side:'front',name:'name',canvasContent:{},backgroundColor:'#fff',size:this.addNewArtForm.get('size')?.value},0)
      const artDocState$ = this.newArtFacade.artDocState$;
      if (artDocState$) {
        artDocState$.pipe(take(1)).subscribe((artDocState) => {
          console.log('artDocState', artDocState);
          if (artDocState?.item) {
            console.log('artDocState.item', artDocState.item)
            this.artDocsService.addArtDocAndPages(artDocState.item).pipe(take(1)).subscribe({
              next: () => {
                this.nzMessageService.success('Art document added successfully');
                this.router.navigate(['creator', artDocState.item.id]);
              },
              error: (err) => {
                console.error('Failed to add art document:', err);
              }
            });
          } else {
            this.nzMessageService.error('No valid art document found in state');
          }
        });
      } else {
        this.router.navigate(['/creator']);
      }
    }else{
      this.updateArtSetting()
    }

    
  }
  onEditorChange(event:any){
    console.log('event',event)
  }
 async updateArtSetting() {
  const cleanDescription = this.sanitizeQuillContent(this.addNewArtForm.get('description')?.value);
    if (this.selectedDoc) {
      const { customSizeLabel, ...formValues } = this.addNewArtForm.value;
      this.selectedDoc = {
        ...this.selectedDoc,
        ...formValues,
        size: this.effectiveSize,
        ...{ description: cleanDescription },
        ...{ preview_realized_art: this.mainPreview },
        ...{ thumbnails:  JSON.stringify(this.arts_thumbnails) },
        tags: this.tags,
        updated_at: new Date() 
      };
  
      if(this.selectedDoc){
        this.artDocsService.updateArtDoc(this.selectedDoc).pipe(take(1)).subscribe({
          next: () => {
            this.nzMessageService.success('Art document updated successfully');
            this.getArtsList()
            this.visible = false;
          },
          error: (err) => {
            console.error('Failed to update art document:', err);
          }
        });
      }
        
     
        
    }
  }
  getArtsList(){
    this.artsList = []
    this.artDocsService.getAllArts().subscribe((data)=>{

    
        this.artsList = data
  

    })
  } 

  beforeUploadMain = (file: NzUploadFile): boolean => {
    // Extract the native File object from NzUploadFile
    // const nativeFile = file.originFileObj as File;
  const nativeFile = file as unknown as File; 
    // Validate that the file exists and is either PNG or JPEG
    if (!file || (file.type !== 'image/png' && file.type !== 'image/jpeg')) {
      this.nzMessageService.error('You can only upload PNG or JPEG files!');
      return false; // Prevent upload
    }
  
    this.loading = true;
    const filePath = `arts_preview`;
  
    // Use your firebaseStorageService with the native File object
    this.artDocsService.uploadFile(nativeFile, filePath , this.newArtId).then((snapshot) => {
        return this.getDownloadURL(snapshot.path);
      
      }).then((downloadURL) => {
        this.mainPreview = `${downloadURL}?v=${new Date().getTime()}`;
        console.log('File available at', this.mainPreview);
})
      .catch(error => {
        this.loading = false;
        this.nzMessageService.error('Upload failed');
      });
    
    return false; // Prevent default upload behavior
  };

  getDownloadURL(key:string): string {
    const { data } = this.supabaseService.client.storage
  .from('thubnails')
  .getPublicUrl(key)

  return  data.publicUrl;
  }

  private getBase64(img: File, callback: (img: string) => void): void {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result!.toString()));
    reader.readAsDataURL(img);
  }

  handleChange(info: { file: NzUploadFile }): void {
    switch (info.file.status) {
      case 'uploading':
        this.loading = true;
        break;
      case 'done':
        // Get this url from response in real world.
        this.getBase64(info.file!.originFileObj!, (img: string) => {
          this.loading = false;
          this.mainPreview = img;
        });
        break;
      case 'error':
        this.nzMessageService.error('Network error');
        this.loading = false;
        break;
    }
  }


  
  beforeUploadList = (file: any): boolean => {
    if (!file || (file.type !== 'image/png' && file.type !== 'image/jpeg')) {
      this.nzMessageService.error('You can only upload PNG or JPEG files!');
      return false; // Prevent upload
    }
  
    const filePath = `arts_thumbnails_` + this.newArtId;
  
    this.artDocsService.uploadFile(file, filePath)
      .then((snapshot) => {
        return this.getDownloadURL(snapshot.path);
      })
      .then((downloadURL) => {
        console.log('File available at', downloadURL);
        
        // Reassign fileList
        this.arts_thumbnails = [...this.arts_thumbnails, { uid: nanoid(), name: file.name, status: 'done', url: downloadURL }];
      })
      .catch(error => {
        this.loading = false;
        this.nzMessageService.error('Upload failed');
      });
  
    return false; // Prevent default upload behavior
  };

  /**
   * Publish art document to WordPress blog
   */
  async publishToBlog() {
    if (!this.selectedDoc) {
      this.nzMessageService.error('Please select a document to publish');
      return;
    }

    this.isPublishingToWP = true;
    try {
      // Prepare WordPress data
      const wpData = {
        title: this.selectedDoc.title,
        description: this.selectedDoc.description || '',
        editor_url: `https://tagprintly.com/creator/${this.selectedDoc.id}`
      };

      // Call the service to update pages and publish to WordPress
      await this.artDocsService.updateArtDocAndPublishToWordPress(this.selectedDoc, wpData);
      
      // Update the selected doc status
      this.selectedDoc.status = 'published';
      this.addNewArtForm.get('status')?.setValue('published');
      
      this.nzMessageService.success('Published to blog successfully!');
      this.getArtsList();
    } catch (error) {
      console.error('Error publishing to blog:', error);
      this.nzMessageService.error('Failed to publish to blog');
    } finally {
      this.isPublishingToWP = false;
    }
  }
  
}
