import {
  Component,
  ComponentRef,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';


import { saveAs } from 'file-saver';

import { FontFamilyEditorComponent } from '../text-editor/font-family-editor/font-family-editor.component';
import { ColorEditorComponent } from '../color-editor/color-editor.component';
import { AddTextComponent } from '../add-text/add-text.component';
import { AddElementsComponent } from '../add-elements/add-elements.component';
import { AddImportComponent } from '../add-import/add-import.component';
import { ColorEditorTextComponent } from '../text-editor/color-editor-text/color-editor-text.component';
import { TextAlignEditorComponent } from '../text-editor/text-align-editor/text-align-editor.component';
import { TextEditorSizeComponent } from '../text-editor/text-editor-size/text-editor-size.component';
import { TextSpacingEditorComponent } from '../text-editor/text-spacing-editor/text-spacing-editor.component';
import {
  POSITIONS,
  SuperpositionEditorComponent,
} from '../superposition-editor/superposition-editor.component';
import { OpacityEditorComponent } from '../opacity-editor/opacity-editor.component';
import { nanoid } from 'nanoid';
import { combineLatest, of, takeUntil, take, map, Subject, debounceTime } from 'rxjs';
import { SvgColorEditorComponent } from '../svg-color-editor/color-editor.component';
import { BoxShadowEditorComponent } from '../box-shadow-editor/box-shadow-editor.component';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Canvas, Control, Group, FabricImage, IText, loadSVGFromURL, Shadow, Textbox, util } from 'fabric';
import { PagesSelectorComponent, selectedPage$, selectedPageIndexSubj } from '../pages-selector/pages-selector.component';
import { DownloadOptionsComponent, IDownloadJpegOptions, IDownloadOptions, IDownloadPnggOptions } from '../download-options/download-options.component';
import { ShareOptionsComponent } from '../share-options/share-options.component';
import {FabricObject} from 'fabric';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

import { ENVIRONMENTS } from '../../../../core/app.tokens';
import { IArtDoc, IArtPage } from '../../../shared/domaine/entities/art';
import { BaseComponentComponent } from '../../../shared/shared/base-component/base-component.component';
import { ArtFacadeService } from '../../../shared/services/new-art.facade';
import { CanvasUtilsService } from '../../../shared/canvas/canvas.utils.service';
import { FirebaseStorageService } from '../../../shared/services/firebase-storage.service';
import { AuthService } from '../../../shared/services/auth.service';
import { NotificationPushService } from '../../../shared/services/notification.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AsyncPipe, CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthorEntryRoutingModule } from '../author-entry/author-entry-routing.module';
import { FormsModule } from '@angular/forms';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { OtpLoginComponent } from '../../../auth/otp-login/otp-login.component';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { ISessionUserModel } from '../../../shared/domaine/entities/user';
import { ArtDocsService } from '../../../shared/services/art-docs.service';
import { NzLayoutModule } from 'ng-zorro-antd/layout';



import { NzButtonModule } from 'ng-zorro-antd/button';

import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

import { NzModalModule } from 'ng-zorro-antd/modal';

import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { NzTabsModule } from 'ng-zorro-antd/tabs';

import { ActivatedRoute, RouterModule } from '@angular/router';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { PublicArtService } from '../../../shared/services/public-art.service';
import { SharePublicLinkComponent } from '../share-public-link/share-public-link.component';

interface ISelectedObj {
  item: any;
  id: string;
  type: string;
}

@Component({
  selector: 'maker-tags-author',
  templateUrl: './author.component.html',
  styleUrl: './author.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    AuthorEntryRoutingModule,
    FormsModule,
    NzProgressModule,
    PagesSelectorComponent,
    DownloadOptionsComponent,
    ShareOptionsComponent,
    NzIconModule,
    NzLayoutModule,
    NzDropDownModule,
    NzSpinModule,
    NzDrawerModule,
    NzTabsModule,
    NzSliderModule,
    NzModalModule,
    NzButtonModule,
    AsyncPipe,
    RouterModule,
    

   
  ]
})
export class AuthorLayoutComponent
  extends BaseComponentComponent
  implements OnInit
{


  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private newArtFacade: ArtFacadeService,
    private elementRef: ElementRef,
    private canvaService: CanvasUtilsService,
    private httpCLientService: HttpClient,
    private firebaseStorageService: FirebaseStorageService,
    private nzMessageService:NzMessageService,
    private authService:AuthService,
    private supabaseauthService:SupabaseService,
    private artDocService:ArtDocsService,
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private notificationService: NotificationPushService,
    private analyticsService:AnalyticsService,
    private activeRoute:ActivatedRoute,
    private publicArtService: PublicArtService,
    // private afAuth: AngularFireAuth,
    @Inject(ENVIRONMENTS) private env: any,
   
    
  ) {
   
    super();
      this.newArtFacade.resetArtStore();
  }

private faceUpdate$ = new Subject<void>();

  private modalRef?: NzModalRef; 
  @ViewChild('dynamicComponentContainer', { read: ViewContainerRef })

  isLoggedIn:boolean = false
  isCollapsed:boolean = false
  userSession?:ISessionUserModel
  dynamicComponentContainer?: ViewContainerRef;
  childComponentRef!: ComponentRef<TextEditorSizeComponent>;
  shouldExecuteSelectionClearedHandler = true;
  SelectedGroupObjects:FabricObject[] = [];
  menuTitle = '';
  menuDrawerHeight = 350;
  selectedComponentMenu: any;
  selectedComponentAddInMenu: any;
  listEditorComponentsMenu: any = [];
  maskedObject: FabricObject | null = null; 
  listAddElementComponentsMenu = [
    {
      name: 'text',
      value: AddTextComponent,
    },
    {
      name: 'elements',
      value: AddElementsComponent,
    },

    {
      name: 'import',
      value: AddImportComponent,
    },
  ];

  canvasBackEditors = [

    {
      isNzIcon: true,
      icon: 'bg-colors',
      name: 'Color',
      value: ColorEditorComponent,
    },
    // {
    //   icon: 'layer',
    //   name: 'Layers',
    //   value: LayeringEditorComponent,
    //   label: 'Layers',
    //   drawerHeight: 280,
    // },
  ];

  textEditors = [
    {
      isNzIcon: false,
      icon: 'fontFamily',
      name: 'Font',
      value: FontFamilyEditorComponent,
      label: 'Font family',
      drawerHeight: 200,
    },
    {
      isNzIcon: false,
      icon: 'fontSize',
      name: 'Size',
      value: TextEditorSizeComponent,
      label: 'Font size',
      drawerHeight: 120,
    },
    {
      icon: 'textColor',
      name: 'Color',
      value: ColorEditorTextComponent,
      label: 'Color',
      drawerHeight: 220,
    },
    {
      icon: 'fontFormat',
      name: 'Format',
      value: TextAlignEditorComponent,
      label: 'Format',
      drawerHeight: 230,
    },
    {
      icon: 'spaceLetter',
      name: 'Space',
      value: TextSpacingEditorComponent,
      label: 'Letter Spacing',
      drawerHeight: 200,
    },
    {
      isNzIcon: false,
      icon: 'opacityIcon',
      name: 'opacity',
      value: OpacityEditorComponent,
      label: 'Opacity',
      drawerHeight: 200,
    },
    {
      isNzIcon: false,
      icon: 'position',
      name: 'Position',
      value: SuperpositionEditorComponent,
      label: 'Position',
      drawerHeight: 200,
    },
    // {
    //   icon: 'layer',
    //   name: 'Layers',
    //   value: LayeringEditorComponent,
    //   label: 'Layers',
    //   drawerHeight: 280,
    // }
    // {
    //   icon: 'effetText',
    //   name:'Effect',
    //   value:FontFamilyEditorComponent,
    //   label:'Effect',
    //   drawerHeight:200
    // },
  ];

  tabsLeft = [
    {
      icon: 'bg-colors',
      name: 'Bg-colors',
      content: 'tab1',
    },
    {
      icon: 'font-colors',
      name: 'Font',
      content: 'tab2',
    },
    {
      icon: 'picture',
      name: 'Elements',
      content: 'tab3',
    },
  ];
  groupsEditors = [
    
  ]
  menuPrint = [

  ]
  ImageEditors: any = [
    {
      isNzIcon: true,
      icon: 'copy',
      name: 'BoxShadow',
      value: BoxShadowEditorComponent,
      label: 'BoxShadow',
      drawerHeight: 200,
    },
    {
      isNzIcon: false,
      icon: 'position',
      name: 'Position',
      value: SuperpositionEditorComponent,
      label: 'Position',
      drawerHeight: 200,
    },
    // {
    //   icon: 'layer',
    //   name: 'Layers',
    //   value: LayeringEditorComponent,
    //   label: 'Layers',
    //   drawerHeight: 280,
    // },
    {
      isNzIcon: false,
      icon: 'opacityIcon',
      name: 'opacity',
      value: OpacityEditorComponent,
      label: 'Opacity',
      drawerHeight: 200,
    },
  ];
  SvgEditros: any = [
    {
      isNzIcon: true,
      icon: 'copy',
      name: 'BoxShadow',
      value: BoxShadowEditorComponent,
      label: 'BoxShadow',
      drawerHeight: 200,
    },
    {
      isNzIcon: false,
      icon: 'position',
      name: 'Position',
      value: SuperpositionEditorComponent,
      label: 'Position',
      drawerHeight: 200,
    },
    // {
    //   icon: 'layer',
    //   name: 'Layers',
    //   value: LayeringEditorComponent,
    //   label: 'Layers',
    //   drawerHeight: 280,
    // },
    {
      isNzIcon: false,
      icon: 'opacityIcon',
      name: 'opacity',
      value: OpacityEditorComponent,
      label: 'Opacity',
      drawerHeight: 200,
    },
    {
      isNzIcon: true,
      icon: 'bg-colors',
      name: 'Color',
      value: SvgColorEditorComponent,
    },
  ];
  @ViewChild('fileInput') fileInput!: ElementRef;
  is3D_art:boolean = false
  public previewImage: string = '';
  mobileMenu = false;
  pagesDrawer = false;
  addInArtMenu = false;
  isAddInMenuBarre = true;
  selectedObj!: ISelectedObj;
  isTextSelected = false;
  isEventListenerAdded = false;
  isObjectLoked = false;
  selectedGroup: any;
  // activeSelection : ActiveSelection,
  collection = '';
  reference = '';
  _canvas: any;

  currentAuthUser:any = {};
  isElementSelected = false;

  isLoaded = true;
  isDownloaded = false
  progress = 0;
  public screenWidth: any;
  public screenHeight: any;
  public currentPageIndex:number = 0
  downloadDrawer:boolean = false;
  canvasWi = 600;
  canvasHei = 600;

  art?: IArtPage;
  userArtDoc:IArtDoc | undefined;
  @Input() artDocPage?: IArtPage;
  @Input() id = '';
  artDoc ?:IArtDoc = {} as IArtDoc

  // Share/Public Art properties
  shareDrawer: boolean = false;
  userHasDownloaded: boolean = false;
  previewImageUrl: string = '';
 @HostListener('window:resize')
  onResize() {
     if (isPlatformBrowser(this.platformId)) {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
     }
      this.resizeCanvas();
  }
    resizeCanvas() {
  const container = document.querySelector('.canvas-content') as HTMLElement;
  if (!container || !this.artDoc) return;

  const containerWidth = container.clientWidth 
  const containerHeight = container.clientHeight - 40 ; // si tu veux prendre en compte la hauteur

  const scaleX = containerWidth / this.artDoc.width;
  const scaleY = containerHeight / this.artDoc.height;

  // Choisir le scale le plus petit pour que tout tienne dans le container
  const zoom = Math.min(scaleX, scaleY);
if(this._canvas){
  this._canvas.setWidth(this.artDoc.width * zoom);
  this._canvas.setHeight(this.artDoc.height * zoom);
  this._canvas.setZoom(zoom);
  this._canvas.requestRenderAll();
  }
}
  get isAdmin$(){
    return this.authService.isAdmin$;
  }
  get isAuthentified(){
    return this.authService.isLoggedIn;
  }
  ngAfterViewInit() {
this._canvas.clear();
 // Global styles for all objects
 FabricObject.ownDefaults.borderColor = '#00b4d8';
 FabricObject.ownDefaults.cornerColor = '#023e8a';
 FabricObject.ownDefaults.cornerStyle = 'rect';
 FabricObject.ownDefaults.cornerSize = 5;
 FabricObject.ownDefaults.transparentCorners = false;
 FabricObject.ownDefaults.cornerStrokeColor = 'black';
 FabricObject.ownDefaults.borderDashArray = [4, 2];
 
 // Set padding to 0 to ensure the bounding box tightly surrounds the object
 FabricObject.ownDefaults.padding = 0;

  // Define the rotation icon (SVG)
  const rotationIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 4v6h-6M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
`;

// Create a custom rotation control with an icon

const rotationControl = new Control({
  x: 0,
  y: -0.5,
  offsetY: -40, // Adjust this value to position the rotation control
  actionHandler: Control.prototype.actionHandler, // Use Control's default action handler
  cursorStyle: 'crosshair',
  withConnection: true,
  actionName: 'rotate',
  sizeX: 30, // Increase the clickable area width
  sizeY: 30, // Increase the clickable area height
  render: (ctx: CanvasRenderingContext2D, left: number, top: number, styleOverride: any, fabricObject: Object) => {
    const imgElement = document.createElement('img'); // Standard HTML image element
    imgElement.src = `data:image/svg+xml;utf8,${encodeURIComponent(rotationIcon)}`;

    imgElement.onload = () => {
      ctx.save();
      ctx.translate(left, top);
      ctx.drawImage(imgElement, -12, -12, 24, 24); // Ensure the correct element is drawn
      ctx.restore();
    };
  },
});

// FabricObject.prototype.controls['mtr'] = rotationControl;
  // Replace the default mtr control with the custom rotation control
  FabricObject.prototype.controls = {
    ...FabricObject.ownDefaults.controls,
    mtr: rotationControl,
  };
  if (FabricObject.ownDefaults.controls) {
    FabricObject.ownDefaults.controls['mtr'] = rotationControl;
  
  }

    // Add event listeners for both click and touch events
    this._canvas.on('mouse:up', this.handleMouseUp.bind(this));
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), {
      passive: false,
    });
    this.fixEditTextInmobile();

  }
async ngOnChanges(): Promise<void> {
    this.isLoaded = true;
    if (this.id ) {
      this.newArtFacade.selectOrCreateArtDoc(this.id);
    }
      this._canvas = new Canvas('fabricSurface', {
      backgroundColor: '#fff',
      preserveObjectStacking: true
    });
     combineLatest([selectedPage$, (this.newArtFacade.artDocState$ ?? of()) ]).pipe(takeUntil(this.destroy$)).subscribe( async ([page_index,docArt])=>{
    this.artDoc = {} as IArtDoc
      this.artDoc = docArt.item
        if(this.artDoc && this._canvas){
     this._canvas.setWidth(this.artDoc.width);
    this._canvas.setHeight(this.artDoc.height);
    }
      this.is3D_art = docArt.item.is_3d
      
      this.currentPageIndex = page_index
    //  selectedPageIndexSubj.next(this.currentPageIndex)
      this.isLoaded = true;
      this.art = docArt.item.pages[this.currentPageIndex]
      const canvasContent = await this.firebaseStorageService.getArtContent(this.art?.canvasContent)
      this.art = (Object as any).assign(this.art, {canvasContent})
        this.addInArtMenu = false;
        
        this._canvas.setDimensions({
          width: Number(this.artDoc?.width),
          height: Number(this.artDoc?.height),
        });
        this._canvas.on('text:changed', (e: any) => {
          this.setContentCanvasInState();
        });
        this._canvas.on('object:modified', (drragable: any) => {
          this.setContentCanvasInState();
           this.faceUpdate$.next();
        });

        //  this.faceUpdate$
        //   .pipe(debounceTime(3000))
        //   .subscribe(() => {
        //     this.saveUserArtDocFace();
        //   });
       
        if (!this.art?.canvasContent || Object.keys(this.art?.canvasContent).length === 0) {
          this._canvas.set({ backgroundColor: this.art?.canvasContent?.background || '#fff' });
           this.isLoaded = false
        }else{
          this.initElementsInCanvas();
          // this.resizeCanvas();
        }
       

        this.listendToCanvasEvents();
        this.resizeCanvas()
      // });
    })
    
  }
  ngOnInit(): void {

    this.userSession = this.authService.getCurrentUserSession();

     if (isPlatformBrowser(this.platformId)) {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
     }

    
 
  
    this._canvas.preserveObjectStacking = true;

   
    this.canvaService.addElementEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event?.name === 'addText') {
          this.addText(event);
        }
        if (event?.name === 'addImage') {
          this.addImage(event);
        }

      });

    this.canvaService.editorEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        // TODO: Fix the event mut have an text 
        const textEvent = ['fontFamily','fontSize','color-text','fontWeight','fontStyle','underline','linethrough','textAlign','lineHeight','charSpacing','opacity']
        if (textEvent.includes(event?.name)) {
           this.updateText(event);
        }
        if (event?.name === 'layer-changed') {
          this.initElementsInCanvas();
          setTimeout(() => {
            this.setContentCanvasInState();
            
          }, 0);
        }
        if (event?.name === 'canva-color') {
          this._canvas.setBackgroundColor(event?.value);
          this.setContentCanvasInState();
          this._canvas.renderAll();
        }
        if (event?.name === 'position') {
          this.updatePosition(event.value);
        }
        if (event?.name === 'svg-color') {
          this.updateSvgColor(event.value);
          this.setContentCanvasInState();
          this._canvas.renderAll();
        }

        if (event?.name.includes('stroke')) {
          this.editStorke(event, 1);
        }
        if (event?.name.includes('shadow')) {
          this.addShadowToObject(this._canvas.getActiveObject(), event);
        }
      });

      // this.currentAuthUser =  getAuth();

       // 2️⃣ écouter les notifications avec un debounceTime
  this.faceUpdate$
    .pipe(
      debounceTime(4000), // 2 secondes après la dernière modif
      takeUntil(this.destroy$)
    )
    .subscribe(() => {
     if(this.userSession?.user?.app_role !== 'admin')
     this.saveUserArt();
    });
  }
  fixEditTextInmobile(){
    let lastTapTime = 0;

    // Force editing on touch for mobile
    this._canvas.on('mouse:down', (event: any) => {
      const now = new Date().getTime();
      const DOUBLE_TAP_DELAY = 500; // Time window for double tap in milliseconds
    
      if (event.target && event.target.type === 'i-text'|| event.target.type === 'textbox') {
        // Detect double tap
        if (now - lastTapTime <= DOUBLE_TAP_DELAY) {
          (event.target as IText).enterEditing();
          this._canvas.setActiveObject(event.target);
        }
        lastTapTime = now; // Update the last tap time
      }
    });
}
closeTextEditor(){
 this.isElementSelected = false
 this.isAddInMenuBarre = true
}
  handleMouseUp(event: MouseEvent) {
    if (!event.target) {
      this.isElementSelected = true;
      this.listEditorComponentsMenu = this.canvasBackEditors;
      // this.removeEditorsForText()
      this.hideControls();
    } else {
      // An object was clicked
    }
  }
  logout() {
    this.authService.logout();
  }
  handleClick(event: any) {
    const contentElm = this.elementRef.nativeElement.querySelector('#content');
    if (event.target === this._canvas.upperCanvasEl) {
      this.isElementSelected = true;
    } else if (event.target === contentElm) {
      this.isElementSelected = false;
      this.isAddInMenuBarre = true
      this.hideControls();
    }
  }
  initOriginalArt(){
    this.newArtFacade.initArtDoc()
     if (isPlatformBrowser(this.platformId)) {
    window.location.reload()
     }
  }
  handleTouchStart(event: TouchEvent) {
    const contentElm = this.elementRef.nativeElement.querySelector('#content');
    if (event.target === this._canvas.upperCanvasEl) {
      this.isElementSelected = true;
    } else if (event.target === contentElm) {
      this.isElementSelected = false;
      this.hideControls();
    }
  }
saveUserArt(){
  const updates = { 
    preview: this.art?.preview || '',
    canvasContent: this.art?.canvasContent || {}
   };
  this.newArtFacade.updateUserArtDocFace(this.art?.id || '', updates).pipe(take(1)).subscribe({
      
  })
}
  async saveArt(){
    if(this.artDoc){
      const resp = await  this.artDocService.updateArtDocPages(this.artDoc)
      if(resp){
         this.nzMessageService.success('Art updated successfully')
      }
    }
   
  }
  triggerFileInput() {
    this.fileInput.nativeElement.click();  // Programmatically click the hidden file input
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {


        FabricImage.fromURL(e.target.result, { crossOrigin: 'anonymous' })
        .then((img) => {
          img.set({ crossOrigin: 'anonymous' });
          this._canvas.add(img);
          this._canvas.requestRenderAll();
        })
      };

      reader.readAsDataURL(file);  // Read the image file as Data URL
    }
  }
  
  updateText(event: any) {
    const activeObject = this._canvas.getActiveObject();
    if (activeObject) {
      switch (event.name) {
        case 'fontFamily':
          activeObject.set({ fontFamily: event.value });
          break;
        case 'fontSize':
          activeObject.set({ fontSize: event.value });
          break;
        case 'color-text':
          activeObject.set({ fill: event.value });
          break;
        case 'fontWeight':
          activeObject.set({ fontWeight: event.value });
          break;
        case 'fontStyle':
          activeObject.set({ fontStyle: event.value });
          break;
        case 'underline':
          activeObject.set({ underline: event.value });
          break;
        case 'linethrough':
          activeObject.set({ linethrough: event.value });
          break;
        case 'textAlign':
          activeObject.set({ textAlign: event.value });
          break;
        case 'lineHeight':
          activeObject.set({ lineHeight: event.value });
          break;
        case 'charSpacing':
          activeObject.set({ charSpacing: event.value });
          break;
        case 'opacity':
          activeObject.set({ opacity: event.value });
          break;
      }
      this.setContentCanvasInState();
      this._canvas.renderAll();
    }
  }

  generatePreviewByPage() {
    // Generate data URL for the canvas
    this.previewImage = this._canvas.toDataURL({
      format: 'jpeg',
      quality: 0.3
    });
    this.newArtFacade.setPagePreview(this.previewImage , this.currentPageIndex)
    
  }
  updateSvgColor(color: any) {
    const selectedObject = this._canvas.getActiveObject();
    selectedObject.set({ fill: color });
  }
  editStorke(event: any, index?: number) {
    const activeObject = this._canvas.getActiveObject();
    if (activeObject) {
      switch (event.name) {
        case 'stroke-color':
          activeObject.set({ stroke: event.value });
          break;
        case 'stroke-width':
          activeObject.set({ strokeWidth: event.value });
          break;
        case 'stroke-visibility':
          activeObject.set({ stroke: event.value });
          break;
        case 'stroke-style':
          if (event.value === 'solid') {
            activeObject.set({ strokeDashArray: [] });
          } else if (event.value === 'dotted') {
            activeObject.set({ strokeDashArray: [5, 5] });
          } else if (event.value === 'dashed') {
            activeObject.set({ strokeDashArray: [10] });
          }
          break;
      }
      this.setContentCanvasInState();
      this._canvas.renderAll();
    }
  }
  updatePosition(position: string) {
    const selectedObject = this._canvas.getActiveObject();
    switch (position) {
      case POSITIONS.bringForward: {
        this._canvas.bringObjectForward(selectedObject, true);
        this.isElementSelected = false;
        break;
      }
      case POSITIONS.sendBackwards: {
        this._canvas.sendObjectBackwards(selectedObject, true);
        break;
      }
      case POSITIONS.sendToBack: {
        this._canvas.sendObjectToBack(selectedObject);
        this.isElementSelected = false;
        break;
      }
      case POSITIONS.bringToFront: {
        this._canvas.bringObjectToFront(selectedObject);

        this.isElementSelected = false;
        break;
      }

      default: {
        //statements;
        break;
      }
    }
    this._canvas.discardActiveObject();
    this._canvas.renderAll();
    this.setContentCanvasInState();
  }
  
  
  async addImage(event: any) {
    if (event.value.type === 'image') {
      FabricImage.fromURL(event.value.source, { crossOrigin: 'anonymous' })
        .then((img) => {
          img.set({ crossOrigin: 'anonymous' });
          this._canvas.add(img);
          this._canvas.requestRenderAll();
        })
        .catch((error) => console.error('Error loading image:', error));
    } else {
      try {
        const { objects, options } = await loadSVGFromURL(event.value.source);
        
        // **Filter out null values from objects**
        const validObjects = objects.filter((obj): obj is FabricObject => obj !== null);
  
        const svg = util.groupSVGElements(validObjects, options);
        this._canvas.add(svg);
        this._canvas.requestRenderAll();
      } catch (error) {
        console.error('Error loading SVG:', error);
      }
    }
    this.setContentCanvasInState();
  }
  addText(event: any, index?: number) {
    let elementObj: any;
    if (!event.value.isBoxText) {
      elementObj = new IText(event.value.value, {
        id: nanoid()
      } as any);
    } else {
      elementObj = new Textbox(event.value.value, {
        height: 100,
        width: 200,
        splitByGrapheme: true,
        id: nanoid()
      } as any);

      //  // Listen for changes in the textbox content
      elementObj.on('updated', () => {
        const newText = elementObj.text.replace(/\n/g, '\n'); // Ensure consistent line breaks
        elementObj.set({
          text: newText,
          width: elementObj.width,
          height: elementObj.height,
        });
        this.setContentCanvasInState();
        this._canvas.renderAll();
      });
    }

    if(this.selectedGroup){
      // this.selectedGroup.add(elementObj);
      elementObj.set({top: this.selectedGroup.top, left: this.selectedGroup.left});
      this.SelectedGroupObjects.push(elementObj);
    }
    this._canvas.add(elementObj);

  
  }

 async initElementsInCanvas() {
    if (this.art?.canvasContent) {
     this._canvas.clear();
      const content = this.art?.canvasContent;
      // this._canvas.loadFromJSON(content).then(()=>{this._canvas.renderAll()})
      
    await this._canvas.loadFromJSON(content);
  // Lock the objects marked as background
  this._canvas.getObjects().forEach(obj => {
    if (obj.lockedBackground) {
      obj.set({
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false, // optional
        hasBorders: false   // optional
      });
     
    }
  });
  
  this._canvas.renderAll();

      
    }
    this.isLoaded = false;
  }

  listendToCanvasEvents() {


    this._canvas.on('selection:created', (drragable: any) => {
      const selectedObject = this._canvas.getActiveObject();
      this.isObjectLoked = selectedObject.lockMovementX && selectedObject.lockMovementY;
      this.isElementSelected = true;
      this.isAddInMenuBarre = false;
      this.showControls(drragable);
      this.updateSelectedMenuEditor();
      // this.updateSelectedObj();
    });

    /* listen to selection when its updated*/
    this._canvas.on('selection:updated', (drragable: any) => {
      const selectedObject = this._canvas.getActiveObject();
      this.isAddInMenuBarre = false;
      this.isObjectLoked = selectedObject.lockMovementX && selectedObject.lockMovementY;
      // this.setContentCanvasInState();   
      this.updateSelectedMenuEditor();  
    });

    this._canvas.on('mouse:dblclick', (event: any) => {
      if (event.target.type === 'group') {
        const target = event.target as Group;
        // Store the group's original index
        const groupIndex = this._canvas.getObjects().indexOf(target);
        this.selectedGroup = target;
        // Ungroup the group
        this.minimizeOutsideOpacity(this.selectedGroup, groupIndex);
        this._canvas.renderAll();
      }
    });

    this._canvas.renderAll();
  }

  minimizeOutsideOpacity(group: Group, groupIndex: number) {
    // Store the references of objects within the group
    const groupObjects = [...group.getObjects()];
    this.SelectedGroupObjects = groupObjects;
    const objects = this._canvas.getObjects();
    const originalZIndices = new Map<Object, number>();

    // Store the original z-index of each object
    this.SelectedGroupObjects.forEach((obj) => {
      originalZIndices.set(obj, this._canvas.getObjects().indexOf(obj));
    });
    for (let i in objects) {
      if (objects[i] !== group) {
        objects[i].set({ opacity: 0.3, selectable: false });
      }
    }


    this.ungroupeByGroup(group);
    this._canvas.discardActiveObject();

    // Restore the original z-index positions
    this.SelectedGroupObjects.forEach((obj, index) => {
      // Remove the object from the canvas and re-add it at the correct position
      this._canvas.remove(obj);
      this._canvas.insertAt(obj, groupIndex + index);
    });

    this._canvas.on('selection:cleared', () => {

        this.restoreOriginalProperties(
          objects,
          groupIndex,
          group,
          this.SelectedGroupObjects
        );
      
    });
    this._canvas.renderAll();
  }
  groupTextWithBottomImage() {
    let bottomGroup: Group; 
    const textObjects = this._canvas
      .getObjects()
      .filter((obj: any) => obj.type === 'i-text' || obj.type === 'textbox');
    const bottomImage = this._canvas.item(0); // Assuming the bottom-most image is at index 0

    if (bottomImage && textObjects.length) {
      const groupItems = [bottomImage, ...textObjects];
      bottomGroup = new Group(groupItems, {
        left: bottomImage.left,
        top: bottomImage.top,
        id: nanoid()
      } as any);

      // Remove original objects
      this._canvas.remove(bottomImage);
      textObjects.forEach((text: any) => this._canvas.remove(text));

      // Add grouped object
      this._canvas.add(bottomGroup);
      (bottomGroup as any).moveTo(0);
      this._canvas.requestRenderAll();
      return bottomGroup;
    }
    return null;
  }

  exportCanvasForEachGroup(option?:IDownloadOptions) {
    this.groupTextWithBottomImage();
    const multiplier = 2.069; // 300 DPI
    const multiplier_for_600 = 4.138;
    const groups = this._canvas.getObjects('group');
    const images = this._canvas.getObjects('image');
    const polygon = this._canvas.getObjects('polygon');
 
    groups.forEach((group: any, index: number) => {
      // Create a temporary canvas for each group
      const tempCanvas = new Canvas({} as any, {
        width: this._canvas.width,
        height: this._canvas.height,
        backgroundColor: 'white',
      });

      // Clone the group to avoid modifying the original
      group.clone((clonedGroup: any) => {
        clonedGroup.left = group.left;
        clonedGroup.top = group.top;
        tempCanvas.add(clonedGroup);
        tempCanvas.renderAll();

        // Export the group to a data URL
        const dataURL = tempCanvas.toDataURL({
          format: 'png',
          multiplier: multiplier,
        });
        const requestOption = {
          dataURL,
          size:this.artDoc?.size,
          bleed: option?.switchValueBleed ? 0.125 : 0,
          marks:option?.marks,
          savePaper:option?.savePaper
        }

         this.generateDoc(requestOption)
        // imageExports.push(dataURL);

      });
    });

    images.forEach((image: any, index: number) => {
      // Create a temporary canvas for each image
      const tempCanvas = new Canvas({} as any, {
        width: this._canvas.width,
        height: this._canvas.height,
        backgroundColor: 'white',
      });

      image.clone((clonedImage: any) => {
        clonedImage.left = image.left;
        clonedImage.top = image.top;

        tempCanvas.add(clonedImage);
        tempCanvas.renderAll();

        // Export the image to a data URL
        const dataURL = tempCanvas.toDataURL({
          format: 'png',
          multiplier: multiplier_for_600,
        });
        const requestOption = {
          dataURL,
          size:this.artDoc?.size,
          bleed:option?.switchValueBleed ? 0.125 : 0,
          marks:option?.marks,
          savePaper:option?.savePaper
        }
        this.generateDoc(requestOption)
      });
    });
    polygon.forEach((group: any, index: number) => {
      // Create a temporary canvas for each group
      const tempCanvas = new Canvas({} as any, {
        width: this._canvas.width,
        height: this._canvas.height,
        backgroundColor: 'white',
      });

      // Clone the group to avoid modifying the original
      group.clone((clonedGroup: any) => {
        clonedGroup.left = group.left;
        clonedGroup.top = group.top;
        tempCanvas.add(clonedGroup);
        tempCanvas.renderAll();

        // Export the group to a data URL
        const dataURL = tempCanvas.toDataURL({
          format: 'png',
          multiplier: multiplier,
        });
        const requestOption = {
          dataURL,
          size:this.artDoc?.size,
          bleed: option?.switchValueBleed ? 0.125 : 0,
          marks:option?.marks,
          savePaper:option?.savePaper
        }

         this.generateDoc(requestOption)
        // imageExports.push(dataURL);
      
      });
    });
  }

  
  async exportCanvas(options?:IDownloadOptions) {
    this.isDownloaded = true
    const multiplier_for_600 = 4.138; // Calculated multiplier for 600 DPI export

    // Temporarily clear canvas background so the staging area color is not
    // captured in the export — only the artwork objects are rendered.
    const savedBg = this._canvas.backgroundColor as string;
    this._canvas.backgroundColor = '';
    this._canvas.renderAll();

    const dataURL = this._canvas.toDataURL({ format: 'png', multiplier: multiplier_for_600 });

    // Restore the canvas background immediately after capture
    this._canvas.backgroundColor = savedBg;
    this._canvas.renderAll();

    const requestOption: any = {
      dataURL,
      uid:this.userSession?.user?.id,
      size:this.artDoc?.size,
      bleed:options?.switchValueBleed ? 0.125 : 0,
      marks:options?.marks,
      savePaper:options?.savePaper,
      accessToken: this.userSession?.access_token
    }
    this.generateDoc(requestOption)
  }

  async generateDoc(requestOption: any) {
      

    const url = `${this.env.hostServer}/.netlify/functions/generatePdfFromFabricJson`;

    this.httpCLientService.post(url, requestOption).subscribe({
      next: async (response: any) => {
        this.progress = 100
        this.isDownloaded = false
        
        const artdocid = this.artDoc?.original_id ? this.artDoc.original_id : '0';
        this.analyticsService.addExport(this.userSession?.user?.id || '',artdocid,'pdf')
        // this.firebaseStorageService.incrementExportedTimes(artdocid).subscribe();
         setTimeout(() => {
            this.notificationService.requestPermission();
          }, 1000);
        this.initElementsInCanvas();
        const filename = `generated-file-${Date.now()}.pdf`;
        if (response?.url) {
          const pdfResponse = await fetch(response.url);
          const blob = await pdfResponse.blob();
          saveAs(blob, filename);
        }
      },
      error: (err) => {
        this.isDownloaded = false
        this.handleError(err);
      },
    });
  }

  private handleError(error: any) {
    let errorMessage = 'An unknown error occurred.';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 403) {
        errorMessage = 'Email not verified. Please verify your email to proceed.';
      } else if (error.status === 500) {
        errorMessage = 'Internal server error. Please try again later.';
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    // Display the error message to the user
    this.displayErrorMessage(errorMessage);
  }

  private displayErrorMessage(message: string) {
    // Implement your logic to display the error message to the user
    // For example, you can use a toast notification or a modal dialog
    alert(message); // This is just an example. Use a proper UI component to display the error.
  }
  simulateProgress() {
    this.progress = 10; // initial
    
    const interval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 10;
      }
    }, 200);
  }
  async exportCanvasAsJpeg(options?:IDownloadJpegOptions) {
    this.isDownloaded = true
   
    const multiplier_150 = 1.034; // Calculated multiplier for 150 DPI export
    const multiplier = 2.069; // Calculated multiplier for 300 DPI export
    const multiplier_for_600 = 4.138; // Calculated multiplier for 600 DPI export

    // Export the canvas to an image with the specified multiplier
    const dataURL = this._canvas.toDataURL({
      format: 'jpeg',
      multiplier: multiplier_for_600,
    });

    const requestOption = {
      dataURL,
      size:this.artDoc?.size,
      bleed:options?.switchValueBleed ? 0.125 : 0,
      resolution:options?.printJpegQuality,
      uid:this.userSession?.user?.id
    }
    try {

   
      const url = `${this.env.hostServer}/.netlify/functions/generateJpeg`
      this.httpCLientService
        .post(url, requestOption)
        .subscribe({
          next: (blob:any) => {
            this.progress = 100
            this.isDownloaded = false
            const artdocid = this.artDoc?.original_id ? this.artDoc.original_id : '0';
             this.analyticsService.addExport(this.userSession?.user?.id || '',artdocid,'jpeg')
            const filename = `generated-file-${Date.now()}.jpeg`;

            saveAs(blob.url, filename);
          },
          error: (err) => {
              this.isDownloaded = false
          }
        });
      // Handle the successful PDF generation
    } catch (error) {
      // Handle the error
    }
  }
  async exportCanvasAsPng (options?:IDownloadPnggOptions) {
    this.isDownloaded = true
    const multiplier_150 = 1.034; // Calculated multiplier for 150 DPI export
    const multiplier = 2.069; // Calculated multiplier for 300 DPI export
    const multiplier_for_600 = 4.138; // Calculated multiplier for 600 DPI export

    // Export the canvas to an image with the specified multiplier
    const dataURL = this._canvas.toDataURL({
      format: 'jpeg',
      multiplier: multiplier_for_600,
    });

    const requestOption = {
      dataURL,
      size:this.artDoc?.size,
      bleed:options?.switchValueBleed ? 0.125 : 0,
      resolution:options?.printPngQuality,
      uid:this.userSession?.user?.id
    }
    try {
 
      const url = `${this.env.hostServer}/.netlify/functions/generatePng`
      this.httpCLientService
        .post(url, requestOption)
        .subscribe({
          next: (blob:any) => {
            this.progress = 100
            this.isDownloaded = false
            const artdocid = this.artDoc?.original_id ? this.artDoc.original_id : '0';
            this.analyticsService.addExport(this.userSession?.user?.id || '',artdocid,'png')
            const filename = `generated-file-${Date.now()}.png`;

            saveAs(blob.url, filename);
          },
          error: (err) => {
            this.isDownloaded = false
            console.error('Download error:', err);
          }
        });
      // Handle the successful PDF generation
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Handle the error
    }
  }

  restoreOriginalProperties(
    objects: any,
    groupIndex: number,
    group?: any,
    originalObjects?: any
  ) {

    for (let i in objects) {
      if (objects[i] !== group) {
        objects[i].set({ opacity: 1, selectable: true });
      }
    }
    if (group && originalObjects) {
      const newGroup = new Group(originalObjects, {
        left: group.left,
        top: group.top,
        id: nanoid()
      } as any);

      this._canvas.add(newGroup);
      (newGroup as any).moveTo(groupIndex);
      this._canvas.setActiveObject(newGroup);

      // Remove original objects from canvas
      originalObjects.forEach((obj: any) => {
        this._canvas.remove(obj);
      });
    }
    this.setContentCanvasInState();

    this._canvas.off('selection:cleared');
    this.selectedGroup = null;
    this.SelectedGroupObjects = [];
    // this._canvas.off('mouse:dblclick');
    this._canvas.requestRenderAll();
  }
 
  addShadowToObject(object: FabricObject, event: any) {
    const shadow: any = {
      color: event.value.color,
      offsetX: event.value.offsetX,
      offsetY: event.value.offsetY,
      blur: event.value.blur,
    };
    object.set('shadow', new Shadow(shadow));
    this._canvas.renderAll();
  }

  updateSelectedObj() {
    const content = this._canvas.getActiveObject();
    this.newArtFacade.seSelectedObj(content);
  }
  updateSelectedMenuEditor() {
    this.isElementSelected = true;
    const selectedObject = this._canvas.getActiveObject();
    const geometricTypes = ['rect', 'circle', 'triangle', 'polygon', 'line', 'ellipse'];
    if (selectedObject.type === 'i-text' || selectedObject.type === 'textbox') {
      this.listEditorComponentsMenu = this.textEditors;
    } else if (selectedObject.type === 'image' || selectedObject.type === 'group') {
      this.listEditorComponentsMenu = this.ImageEditors;
    } else if (selectedObject.type === 'path') {
      this.listEditorComponentsMenu = this.SvgEditros;
    } else if (geometricTypes.includes(selectedObject.type)) {
      this.listEditorComponentsMenu = this.SvgEditros;
    }else{
      this.listEditorComponentsMenu = []
    }
  }

  setContentCanvasInState() {
    this.generatePreviewByPage(); 
    const content = this._canvas.toDatalessJSON([
      'lockMovementX',
      'lockMovementY',
      'lockScalingX',
      'lockScalingY',
      'id',
    ]);
    const contentJson = JSON.stringify(content);
    // this.newArtFacade.setContentCanvas(content);
    this.newArtFacade.setContentCanvasByPage(contentJson,this.currentPageIndex)
  }

  groupElementBySelection() {
    const activeObject = this._canvas.getActiveObject();
    if (!activeObject) {
      return;
    }
    if (activeObject.type !== 'activeSelection') {
      return;
    }

    // Group the active selection and get the new group
    const newGroup = activeObject.toGroup();

    // Set options on the new group
    newGroup.set({
      id: nanoid()
      // Add any other options you need
    });

    this._canvas.renderAll();
    this.setContentCanvasInState();
  }
  unLockMovement() {
    const activeObject = this._canvas.getActiveObject();
    activeObject.set({ lockMovementX: false, lockMovementY: false ,lockScalingX: false, lockScalingY: false});
    this._canvas.requestRenderAll();
    this.setContentCanvasInState();
  }
  lockMovement() {
    const activeObject = this._canvas.getActiveObject();
    activeObject.set({ lockMovementX: true, lockMovementY: true ,   lockScalingX: true, lockScalingY: true});
    this._canvas.requestRenderAll();
    this.setContentCanvasInState();
  }
  ungroupeByGroup(group: Group) {
    (group as any).toActiveSelection();
    this._canvas.requestRenderAll();
  }
  ungroupeEelemnts() {
    if (!this._canvas.getActiveObject()) {
      return;
    }
    this._canvas.getActiveObject().toActiveSelection();
    this._canvas.requestRenderAll();
  }

  updateCanvasDimention() {
    if (this.mobileMenu) {
      const canvasWi = this.artDoc?.width ? this.artDoc?.width * 0.8 : 0;
      const canvasHei = this.artDoc?.height ? this.artDoc?.height * 0.8 : 0;
      this._canvas.setDimensions({ width: canvasWi, height: canvasHei });
      this._canvas.setZoom(0.8);
    } else {
      this._canvas.setDimensions({
        width: this.artDoc?.width,
        height: this.artDoc?.height,
      });
      this._canvas.setZoom(1);
    }
  }
  removeElement() {
    // Set the flag to false to prevent the event handler from executing
      const activeObject = this._canvas.getActiveObject();
    if (!activeObject) {
      return;
    }

    const canvasContent = this.art?.canvasContent;
    if (!canvasContent) {
      return;
    }
    if(this.SelectedGroupObjects.some((obj:any)=>obj.id === activeObject.id)){
      activeObject.set({visible:false });
      this.setContentCanvasInState();
      this._canvas.renderAll();
    }else{
      this._canvas.remove(activeObject);
      this._canvas.renderAll();
    }
  

     this.setContentCanvasInState();
  }
  showControls(object: any) {
    const controls = document.getElementById('controls');
    if (controls) {
      controls.style.display = 'none';
      controls.style.top = `${object.top - 50}px`;
      controls.style.left = `${object.left}px`;
      controls.style.display = 'block';
    }
  }

  hideControls() {
    const controls = document.getElementById('controls');
    if (controls) controls.style.display = 'none';
  }
  openMobileMenu(menu: any) {
    this.selectedComponentMenu = menu.value;

    this.mobileMenu = true;
    this.menuTitle = menu.label;
    this.menuDrawerHeight = menu.drawerHeight;
    if(this.screenWidth < 767 ){
      this.updateCanvasDimention();
    }
    
    this.hideControls();
  }
  openAddInMenu(menu: any) {
    this.selectedComponentAddInMenu = this.listAddElementComponentsMenu.find(
      (e) => e.name === menu
    )?.value;
    this.addInArtMenu = true;
  }
  closeMobileMenu() {
    this.mobileMenu = false;
    this.updateCanvasDimention();
  }
  closeAddInArtMenu() {
    this.addInArtMenu = false;
  }
  openAddInMenuBarre() {
    this.isAddInMenuBarre = true;
  }
  openPagesDrawer(){
    this.pagesDrawer = true
  }
  closePageDrawer(){
    this.pagesDrawer = false
  }

  openDownloadMenu(){
if (isPlatformBrowser(this.platformId)) {
   // AJOUTER CETTE LIGNE :
   (window as any).dataLayer = (window as any).dataLayer || [];
   (window as any).dataLayer.push({
     event: 'export_pdf'
   });
  }
   this.supabaseauthService.isLoggedIn().then(async (loggedIn) => {
  if (loggedIn) {
    const emailVerified = await this.supabaseauthService.isEmailVerified();
    if (!emailVerified &&  this.userSession?.user?.app_role!=='anonymous-user') {
      this.nzMessageService.error('Please verify your email to download the file');
      return;
    }
    this.downloadDrawer = true;
  } else {
    this.openLoginModal();
  }
});


  }


  openLoginModal() {
    this.modalRef?.destroy();
    this.modalRef = this.modal.create({
      nzContent: OtpLoginComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzData: { action: 'Download' },

    });
  }
  


  closeDownloadDrawer(){
    this.downloadDrawer = false
  }
  downloadActionFile(options:IDownloadOptions){
   this.simulateProgress();
    if(options.printType === 'pdf'){
        if(options.splitByGroup){
          this.exportCanvasForEachGroup(options)
        }else{
          this.exportCanvas(options)
        }
    
    }else if(options.printType === 'jpeg'){
  
      this.exportCanvasAsJpeg(options)
    }else if(options.printType === 'png'){
      this.exportCanvasAsPng(options)
    }
    
}
applyMaskIfTwoObjectsSelected() {
  const selectedObjects = this._canvas.getActiveObjects();

  // Check if exactly two objects are selected
  if (selectedObjects.length === 2) {
    // Sort to ensure the object underneath is the mask, and the one above is the masked image
    const maskedObject = selectedObjects[0];
    const maskObject = selectedObjects[1];
    maskObject.set({ 
      absolutePositioned: true,
      selectable: false,
      evented: false,
      fill: 'rgba(0, 0, 0, 0)',
      objectCaching: false,
        // originX: 'center',
        // originY: 'center',    
    });

    // Apply the mask object as a clip path to the masked object
    maskedObject.set({
      clipPath: maskObject,
    });

    // Store a reference to the masked object for undoing later
    this.maskedObject = maskedObject;

    // Deselect objects and re-render
    this._canvas.discardActiveObject();
    this._canvas.requestRenderAll();
  } 
}

async duplicateSelectedObject() {

  this._canvas
    .getActiveObject()
    .clone()
    .then((cloned) => {
      let clonedObj = cloned;
        clonedObj.set({
          left: clonedObj.left + 10,
          top: clonedObj.top + 10,
          evented: true,
        });

     
      this._canvas.add(clonedObj);

    // this should solve the unselectability
       this._canvas.discardActiveObject();
    });
  
  // try {
  //   // ⭐ Méthode recommandée Fabric 5.x
  //   const cloned = await objectToClone.clo();

  //   cloned.set({
  //     left: objectToClone.left + 20,
  //     top: objectToClone.top + 20,
  //     evented: true,
  //     selectable: true
  //   });

  //   // this._canvas.add(cloned);
  //   // this._canvas.setActiveObject(cloned);
  //   // this._canvas.requestRenderAll();

  // } catch (error) {
  //   console.error("Clone error:", error);
  // }
}


undoMask() {
  // Check if there is a masked object to undo
  if (this.maskedObject) {
    // Remove the clip path
    this.maskedObject.clipPath = null as any;

    // Update the canvas
    this._canvas.requestRenderAll();

    // Clear the reference to the masked object
    this.maskedObject = null;
  } 
}

/**
 * Download canvas content as JSON file
 */
downloadCanvasAsJson(): void {
  try {
    // Get the canvas content as JSON
    const canvasData = this._canvas.toJSON([
      'lockMovementX',
      'lockMovementY',
      'lockScalingX',
      'lockScalingY',
      'id',
    ]);

    // Add metadata to the JSON
    const jsonContent = {
      metadata: {
        title: this.artDoc?.title || 'Untitled',
        description: this.artDoc?.description || '',
        createdAt: new Date().toISOString(),
        canvasWidth: this.artDoc?.width,
        canvasHeight: this.artDoc?.height,
      },
      canvas: canvasData,
    };

    // Convert to JSON string with formatting
    const jsonString = JSON.stringify(jsonContent, null, 2);

    // Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a download link and trigger the download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canvas-${this.artDoc?.id || 'export'}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.nzMessageService.success('Canvas downloaded as JSON');
  } catch (error) {
    console.error('Error downloading canvas as JSON:', error);
    this.nzMessageService.error('Failed to download canvas as JSON');
  }
}

/**
 * Open share menu instead of download menu
 */
openShareMenu(): void {
  this.shareDrawer = true;
}

/**
 * Close share drawer
 */
closeShareDrawer(): void {
  this.shareDrawer = false;
}

/**
 * Generate preview image from canvas
 */
private generatePreviewImage(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = this._canvas.getElement() as HTMLCanvasElement;
      const previewUrl = canvas.toDataURL('image/png');
      resolve(previewUrl);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Upload preview to Supabase storage
 */
private async uploadPreviewToStorage(previewData: string): Promise<string> {
  try {
    const response = await fetch(previewData);
    const blob = await response.blob();
    const file = new File([blob], `preview-${this.artDoc?.id}.png`, { type: 'image/png' });
    
    // Upload with fixed filename based on artDoc ID
    const uploadedPath = await this.artDocService.uploadFile(file, 'previews', `preview-${this.artDoc?.id}`);
    
    // Get public URL using the same path that was uploaded
    const { data } = this.supabaseauthService.client.storage
      .from('thubnails')
      .getPublicUrl(`previews/preview-${this.artDoc?.id}.png`);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading preview:', error);
    throw error;
  }
}

/**
 * Handle share action - shows share modal after download
 */
openShareModal(): void {
  if (!this.artDoc?.id) {
    this.nzMessageService.error('Art document not found');
    return;
  }

  // Generate preview and then show modal
  this.generatePreviewImage().then((previewData) => {
    this.uploadPreviewToStorage(previewData).then((previewUrl) => {
      this.previewImageUrl = previewUrl;

      const modalRef = this.modal.create({
        nzTitle: 'Share Your Art',
        nzContent: SharePublicLinkComponent,
        nzData: {
          artDocId: this.artDoc?.id,
          title: this.artDoc?.title,
          description: this.artDoc?.description,
          previewUrl: previewUrl
        },
        nzFooter: null,
        nzWidth: 500,
        nzOkText: null,
        nzCancelText: null
      });

      modalRef.afterClose.subscribe((result) => {
        // Modal closed
      });
    }).catch((error) => {
      console.error('Error uploading preview:', error);
      this.nzMessageService.error('Failed to generate preview');
    });
  }).catch((error) => {
    console.error('Error generating preview:', error);
    this.nzMessageService.error('Failed to generate preview');
  });
}

/**
 * Handle share drawer action
 */
onShareAction(action: any): void {
  this.closeShareDrawer();
  
  if (action.action === 'export') {
    // Open the download drawer
    this.openDownloadMenu();
    if (isPlatformBrowser(this.platformId)) {
   // AJOUTER CETTE LIGNE :
   (window as any).dataLayer = (window as any).dataLayer || [];
   (window as any).dataLayer.push({
     event: 'export_pdf'
   });
  }
  } else if (action.action === 'public') {
    // Open the share modal
    this.openShareModal();
    if (isPlatformBrowser(this.platformId)) {
   // AJOUTER CETTE LIGNE :
   (window as any).dataLayer = (window as any).dataLayer || [];
   (window as any).dataLayer.push({
     event: 'share_public_link'
   });
  }
  }
}

}

