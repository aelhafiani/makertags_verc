import { AsyncPipe, CommonModule, isPlatformBrowser } from '@angular/common';
import { FEATURE_FLAGS } from '../../../../feature-flags';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { saveAs } from 'file-saver';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { ActiveSelection, Canvas, FabricObject, Group, IText, util } from 'fabric';

interface ContextMenu {
  x: number;
  y: number;
  targetIsContour: boolean;
  hasSelection: boolean;
  isGroup: boolean;
  isMultiSelection: boolean;
  isLocked: boolean;
  hasMask: boolean;
}
import { NzIconModule } from 'ng-zorro-antd/icon';
import { combineLatest, Observable, skip, Subject, takeUntil } from 'rxjs';
import { SetPagePreview } from '../../../shared/domaine/state/art-doc/art-doc.actions';
import { IArtDoc, IArtPage } from '../../../shared/domaine/entities/art';
import { ArtFacadeService } from '../../../shared/services/new-art.facade';
import { FirebaseStorageService } from '../../../shared/services/firebase-storage.service';
import { AuthService } from '../../../shared/services/auth.service';
import { selectedPage$, selectedPageIndexSubj } from '../pages-selector/pages-selector.component';
import { CanvasHistoryService } from '../../services/canvas-history.service';
import { CanvasProviderService } from '../../services/canvas-provider.service';
import { EditorAnnouncerService } from '../../services/editor-announcer.service';
import { FabricBackgroundAdapter } from '../../services/fabric-background.adapter';
import {
  BackgroundState,
  SetBackgroundColor,
  SetBackgroundTexture,
} from '../../services/background.state';
import {
  CanvasObjectType,
  EditorShellState,
  SetActiveTool,
  SetHistoryButtons,
  SetSelection,
  ToolId,
} from '../../services/editor-shell.state';
import { ContextualPanelComponent } from './contextual-panel/contextual-panel.component';
import { EditPanelComponent } from '../panels/edit-panel/edit-panel.component';
import { MiniPreviewColumnComponent } from './mini-preview-column/mini-preview-column.component';
import { FloatingTextToolbarComponent } from './floating-text-toolbar/floating-text-toolbar.component';
import { FloatingShapeToolbarComponent } from './floating-shape-toolbar/floating-shape-toolbar.component';
import { FloatingQrToolbarComponent } from './floating-qr-toolbar/floating-qr-toolbar.component';
import { FloatingAlignmentToolbarComponent } from './floating-alignment-toolbar/floating-alignment-toolbar.component';
import { SnapGuidesService } from '../../services/snap-guides.service';
import { setupCanvasControls } from './canvas-controls.setup';
import { CanvasUtilsService } from '../../../shared/canvas/canvas.utils.service';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { ShareOptionsComponent, IShareAction } from '../share-options/share-options.component';
import { DownloadOptionsComponent, IDownloadOptions } from '../download-options/download-options.component';
import { SharePublicLinkComponent } from '../share-public-link/share-public-link.component';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { ArtDocsService } from '../../../shared/services/art-docs.service';
import { UserArtDocsService } from '../../../shared/services/users_art_docs.service';
import { ENVIRONMENTS } from '../../../../core/app.tokens';
import { OtpLoginComponent } from '../../../auth/otp-login/otp-login.component';
import { LoadArtDoc, LoadUserArtDoc } from '../../../shared/domaine/state/art-doc/art-doc.actions';
import { MockupGeneratorComponent } from '../mockup-generator/mockup-generator.component';
import { AiDesignGeneratorComponent } from '../ai-design-generator/ai-design-generator.component';
import { PaymentService, PlanId } from '../../../shared/services/payment.service';
import { PremiumGateComponent } from '../../../catalog/premium-gate/premium-gate.component';

interface ToolDef {
  id: ToolId;
  label: string;
  icon: string;
}

@Component({
  selector: 'maker-tags-editor-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzIconModule,
    NzDrawerModule,
    NzButtonModule,
    ContextualPanelComponent,
    MiniPreviewColumnComponent,
    FloatingTextToolbarComponent,
    FloatingShapeToolbarComponent,
    FloatingQrToolbarComponent,
    FloatingAlignmentToolbarComponent,
    ShareOptionsComponent,
    DownloadOptionsComponent,
    EditPanelComponent,
    AsyncPipe,
    RouterLink,
    NzSpinModule,
    MockupGeneratorComponent,
    AiDesignGeneratorComponent,
    PremiumGateComponent,
  ],
  templateUrl: './editor-shell.component.html',
  styleUrl: './editor-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorShellComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('fabricSurface') fabricSurface!: ElementRef<HTMLCanvasElement>;
  @ViewChild('liveRegion') liveRegion!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasScrollEl') canvasScrollEl!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasWrapperEl') canvasWrapperEl!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasLoaderEl') canvasLoaderEl!: ElementRef<HTMLDivElement>;

  // ── Toolbar state ─────────────────────────────────────────────────────────
  zoomLevel = 100;
  readonly zoomOptions = [25, 50, 75, 100, 125, 150, 200];
  canvasWidth = 400;
  canvasHeight = 600;

  readonly tools: ToolDef[] = [
    { id: 'edit',       label: 'Edit',       icon: 'edit' },
    { id: 'add-text',   label: 'Add Text',   icon: 'font-size' },
    { id: 'add-image',  label: 'Add Image',  icon: 'picture' },
    { id: 'background', label: 'Background', icon: 'bg-colors' },
    { id: 'elements',   label: 'Elements',   icon: 'appstore' },
    // { id: 'icons',      label: 'Icons',      icon: 'star' },
    { id: 'layers',     label: 'Layers',     icon: 'layout' },
    { id: 'qrcode',     label: 'QR Code',    icon: 'qrcode' },
  ];

  get activeTool(): ToolId | null {
    return this.store.selectSnapshot(EditorShellState.getActiveTool);
  }

  // ── Public doc reference (used in template) ───────────────────────────────
  artDoc: IArtDoc | null = null;

  // ── Context menu (right-click) ────────────────────────────────────────────
  contextMenu: ContextMenu | null = null;
  isAdmin$!: Observable<boolean>;

  // ── Premium watermark ───────────────────────────────────────────────────
  showWatermarkBanner = false;

  // ── Share / Download ──────────────────────────────────────────────────────
  shareDrawer = false;
  downloadDrawer = false;
  isDownloaded = false;
  progress = 0;

  // ── Mobile ────────────────────────────────────────────────────────────────
  readonly mobileSimpleEditorEnabled = FEATURE_FLAGS.MOBILE_SIMPLE_EDITOR;
  mobileMode: 'simple' | 'canvas' = FEATURE_FLAGS.MOBILE_SIMPLE_EDITOR ? 'simple' : 'canvas';
  mobilePanelOpen = false;
  mobilePreviewDataUrl: string | null = null;
  sheetExpanded = false;
  sheetTransform = 'translateY(calc(100% - 56px))';
  sheetDragging = false;
  private sheetDragStartY = 0;
  private sheetDragDelta = 0;

  private readonly SHEET_COLLAPSED = 'translateY(calc(100% - 56px))';

  get activeToolLabel(): string {
    const tool = this.tools.find(t => t.id === this.activeTool);
    return tool?.label ?? '';
  }

  // ── Private ───────────────────────────────────────────────────────────────
  private readonly destroy$ = new Subject<void>();
  private canvas: Canvas | null = null;
  private windowFocusListener: (() => void) | null = null;
  private pageIndex = 0;
  private canvasReady = false;
  private previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastLoadedFaceId: string | null = null;
  private lastKnownPageCount = 0;
  private syncingBackground = false;


  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Inject(ENVIRONMENTS) private readonly env: any,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly artFacade: ArtFacadeService,
    private readonly firebaseStorage: FirebaseStorageService,
    private readonly canvasProvider: CanvasProviderService,
    private readonly canvasHistory: CanvasHistoryService,
    private readonly announcer: EditorAnnouncerService,
    private readonly store: Store,
    private readonly fabricBackgroundAdapter: FabricBackgroundAdapter,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly modal: NzModalService,
    private readonly nzMessage: NzMessageService,
    private readonly supabaseService: SupabaseService,
    private readonly artDocsService: ArtDocsService,
    private readonly userArtDocsService: UserArtDocsService,
    private readonly http: HttpClient,
    private readonly canvasUtils: CanvasUtilsService,
    private readonly snapGuides: SnapGuidesService,
    private readonly paymentService: PaymentService,
  ) {
    this.isAdmin$ = this.authService.isAdmin$;
  }

  ngOnInit(): void {
    const session = this.authService.getCurrentUserSession();
    console.log('[DEBUG] app_role =', session?.user?.app_role, '| email =', session?.user?.email);
    this.isAdmin$.subscribe(v => console.log('[DEBUG] isAdmin$ =', v));

    // Schedule preview whenever any editor tool changes canvas visually
    // (color, svg-color, stroke, background, opacity, etc.) — these don't
    // fire fabric's object:modified so we hook in here instead.
    this.canvasUtils.editorEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event) this.schedulePreview();
      });

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (!id) return;
      const isUserCopy = !!this.route.snapshot.data['userCopy'];
      if (isUserCopy) {
        this.store.dispatch(new LoadUserArtDoc({ id }));
      } else {
        this.store.dispatch(new LoadArtDoc({ id }));
      }
    });

    combineLatest([selectedPage$, this.artFacade.artDocState$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(async ([pageIndex, docState]) => {
        this.artDoc = docState.item;
        const pages = this.artDoc?.pages ?? [];
        const newPageCount = pages.length;

        // A new page was added (e.g. "Add Back") — auto-switch to it
        if (newPageCount > this.lastKnownPageCount && this.lastKnownPageCount > 0) {
          this.lastKnownPageCount = newPageCount;
          selectedPageIndexSubj.next(newPageCount - 1);
          return; // the next emission will carry the correct pageIndex
        }
        this.lastKnownPageCount = newPageCount;

        this.pageIndex = pageIndex;
        this.cdr.markForCheck();

        if (!this.canvasReady) return;

        const face = pages[this.pageIndex];
        if (!face) return;

        // Skip reload if the same face is already loaded
        if (face.id === this.lastLoadedFaceId) return;

        this.showCanvasLoader();
        await this.loadFace(face).catch(() =>
          this.publishToLiveRegion('Could not load canvas face')
        );
      });

    combineLatest([this.canvasHistory.canUndo$, this.canvasHistory.canRedo$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([canUndo, canRedo]) => {
        this.store.dispatch(new SetHistoryButtons(canUndo, canRedo));
      });

    this.announcer.messages$.pipe(takeUntil(this.destroy$)).subscribe((message) => {
      this.publishToLiveRegion(message);
    });

    this.store
      .select(BackgroundState.currentBackground)
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe((background) => {
        if (!this.canvas || this.syncingBackground) return;
        this.fabricBackgroundAdapter.applyBackground(this.canvas, background);
        this.schedulePreview();
      });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.canvas = new Canvas(this.fabricSurface.nativeElement, {
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });
    this.canvasProvider.setCanvas(this.canvas);
    this.bindSelectionEvents(this.canvas);
    setupCanvasControls(this.canvas);
    this.snapGuides.attach(this.canvas);
    this.canvasReady = true;

    const face = this.artDoc?.pages?.[this.pageIndex];
    if (face) {
      this.showCanvasLoader();
      this.loadFace(face).catch(() =>
        this.publishToLiveRegion('Could not load canvas face')
      );
    }
  }

  // ── Topbar actions ────────────────────────────────────────────────────────
  onExit(): void {
    this.requireAuth(() => this.saveUserCopyThenRun(() => this.router.navigate(['/'])));
  }

  onUndo(): void {
    this.canvasHistory.undo();
  }

  onRedo(): void {
    this.canvasHistory.redo();
  }

  get snapGuidesEnabled(): boolean { return this.snapGuides.isEnabled; }
  toggleSnapGuides(): void { this.snapGuides.setEnabled(!this.snapGuides.isEnabled); }

  // ── Tool selection ────────────────────────────────────────────────────────
  selectTool(toolId: ToolId): void {
    const current = this.store.selectSnapshot(EditorShellState.getActiveTool);
    if (current === toolId) {
      this.store.dispatch(new SetActiveTool(null));
      this.mobilePanelOpen = false;
    } else {
      this.store.dispatch(new SetActiveTool(toolId));
      this.mobilePanelOpen = true;
      this.sheetExpanded = false;
      this.sheetTransform = 'translateY(calc(100% - 56px))';
    }
    this.cdr.markForCheck();
  }

  switchToCanvasMode(): void {
    this.mobileMode = 'canvas';
    this.cdr.markForCheck();
    // DOM is hidden until now — recalculate zoom once layout is painted
    setTimeout(() => {
      const canvasW = Number(this.artDoc?.width ?? this.canvasWidth);
      const canvasH = Number(this.artDoc?.height ?? this.canvasHeight);
      this.fitZoomToScroll(canvasW, canvasH);
    }, 50);
  }

  switchToSimpleMode(): void {
    this.mobileMode = 'simple';
    this.mobilePanelOpen = false;
    this.store.dispatch(new SetActiveTool('edit'));
    this.refreshMobilePreview();
    this.cdr.markForCheck();
  }

  private refreshMobilePreview(): void {
    if (!this.canvas) return;
    setTimeout(() => {
      this.mobilePreviewDataUrl = this.canvas!.toDataURL({ format: 'jpeg', quality: 0.85, multiplier: 1 });
      this.cdr.markForCheck();
    }, 100);
  }

  closeMobilePanel(): void {
    this.mobilePanelOpen = false;
    this.sheetExpanded = true;
    this.sheetTransform = 'translateY(0px)';
    this.store.dispatch(new SetActiveTool(null));
    this.cdr.markForCheck();
  }

  toggleMobileSheet(): void {
    this.sheetExpanded = !this.sheetExpanded;
    this.sheetTransform = this.sheetExpanded ? 'translateY(0px)' : this.SHEET_COLLAPSED;
    this.cdr.markForCheck();
  }

  onSheetTouchStart(e: TouchEvent): void {
    this.sheetDragStartY = e.touches[0].clientY;
    this.sheetDragDelta = 0;
    this.sheetDragging = true; // disable CSS transition during drag
    this.cdr.markForCheck();
  }

  onSheetTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const dy = e.touches[0].clientY - this.sheetDragStartY;
    this.sheetDragDelta = dy;

    if (this.sheetExpanded) {
      // Expanded: only allow drag down
      const clamp = Math.max(0, dy);
      this.sheetTransform = `translateY(${clamp}px)`;
    } else {
      // Collapsed: only allow drag up (negative dy)
      const sheetHeight = window.innerHeight * 0.65;
      const collapsed = sheetHeight - 56;
      const clamp = Math.max(0, collapsed + dy);
      this.sheetTransform = `translateY(${clamp}px)`;
    }
    this.cdr.markForCheck();
  }

  onSheetTouchEnd(_e: TouchEvent): void {
    const absDelta = Math.abs(this.sheetDragDelta);
    const threshold = 60;
    let nextExpanded = this.sheetExpanded;

    if (absDelta < 10) {
      nextExpanded = !this.sheetExpanded;
    } else if (this.sheetExpanded && this.sheetDragDelta > threshold) {
      nextExpanded = false;
    } else if (!this.sheetExpanded && this.sheetDragDelta < -threshold) {
      nextExpanded = true;
    }

    // Set final transform BEFORE re-enabling transition so browser sees the target
    this.sheetExpanded = nextExpanded;
    this.sheetTransform = nextExpanded ? 'translateY(0px)' : this.SHEET_COLLAPSED;
    this.sheetDragDelta = 0;

    // Re-enable transition on next frame so the snap animates from drag position
    requestAnimationFrame(() => {
      this.sheetDragging = false;
      this.cdr.markForCheck();
    });

    this.cdr.markForCheck();
  }

  // ── Zoom ─────────────────────────────────────────────────────────────────
  zoomIn(): void {
    const idx = this.zoomOptions.indexOf(this.zoomLevel);
    if (idx < this.zoomOptions.length - 1) {
      this.zoomLevel = this.zoomOptions[idx + 1];
    }
  }

  zoomOut(): void {
    const idx = this.zoomOptions.indexOf(this.zoomLevel);
    if (idx > 0) {
      this.zoomLevel = this.zoomOptions[idx - 1];
    }
  }

  onZoomChange(value: number): void {
    this.zoomLevel = value;
  }

  private fitZoomToScroll(canvasW: number, canvasH: number): void {
    const el = this.canvasScrollEl?.nativeElement;
    if (!el) return;
    const isMobile = window.innerWidth <= 768;
    const padH = isMobile ? 20 : 48;
    const padV = isMobile ? 16 : 64;
    const availW = el.clientWidth - padH;
    const availH = el.clientHeight - padV;
    if (availW <= 0 || availH <= 0) return;
    const scaleW = availW / canvasW;
    const scaleH = availH / canvasH;
    const scale = Math.min(scaleW, scaleH, 1);
    const pct = Math.max(5, Math.round(scale * 100));
    if (isMobile) {
      // on mobile use exact fit value, no snapping
      this.zoomLevel = pct;
    } else {
      // on desktop snap to nearest predefined option, preferring smaller
      const snap = this.zoomOptions.reduce((prev, cur) =>
        Math.abs(cur - pct) < Math.abs(prev - pct) ? cur : prev
      );
      this.zoomLevel = snap <= pct ? snap : (this.zoomOptions[this.zoomOptions.indexOf(snap) - 1] ?? snap);
    }
    this.cdr.markForCheck();
  }

  applyCanvasSize(): void {
    if (!this.canvas) return;
    const w = Math.max(1, Math.round(this.canvasWidth));
    const h = Math.max(1, Math.round(this.canvasHeight));
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.canvas.setDimensions({ width: w, height: h });
    this.fitZoomToScroll(w, h);
    this.canvas.renderAll();
    this.schedulePreview();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.contextMenu = null;
    this.store.dispatch(new SetActiveTool(null));
    this.publishToLiveRegion('Panel closed');
    this.cdr.markForCheck();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.contextMenu) {
      this.contextMenu = null;
      this.cdr.markForCheck();
    }
  }

  // ── Context menu ──────────────────────────────────────────────────────────
  onCanvasContextMenu(event: MouseEvent): void {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject() as (FabricObject & { isArtContour?: boolean }) | null;
    if (!active) return;

    event.preventDefault();
    event.stopPropagation();
    const activeExt = active as FabricObject & { isArtContour?: boolean; clipPath?: unknown };
    this.contextMenu = {
      x: event.clientX,
      y: event.clientY,
      targetIsContour: !!activeExt.isArtContour,
      hasSelection: true,
      isGroup: active.type === 'group',
      isMultiSelection: active.type === 'activeselection',
      isLocked: !!(active as any).lockMovementX && !!(active as any).lockMovementY,
      hasMask: !!(activeExt.clipPath),
    };
    this.cdr.markForCheck();
  }

  setAsArtContour(): void {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject() as (FabricObject & { isArtContour?: boolean }) | null;
    if (!active) return;

    // Clear previous contour marker
    (this.canvas.getObjects() as (FabricObject & { isArtContour?: boolean })[])
      .filter((o) => o.isArtContour)
      .forEach((o) => {
        o.isArtContour = false;
        this.patchToObject(o, { isArtContour: false });
      });

    // Mark selected object
    active.isArtContour = true;
    this.patchToObject(active, { isArtContour: true });

    // Immediately sync background to the new contour
    const bg = this.store.selectSnapshot(BackgroundState.currentBackground);
    this.fabricBackgroundAdapter.applyBackground(this.canvas, bg);
    this.canvas.renderAll();
    this.canvas.fire('object:modified' as any);

    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  clearArtContour(): void {
    if (!this.canvas) return;
    (this.canvas.getObjects() as (FabricObject & { isArtContour?: boolean })[])
      .filter((o) => o.isArtContour)
      .forEach((o) => {
        o.isArtContour = false;
        this.patchToObject(o, { isArtContour: false });
      });

    this.canvas.fire('object:modified' as any);
    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  // ── Admin canvas actions ──────────────────────────────────────────────────

  groupElements(): void {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (!active || active.type !== 'activeselection') return;

    const objects = (active as ActiveSelection).getObjects() as FabricObject[];
    objects.forEach(obj => this.canvas!.remove(obj));

    const group = new Group(objects);
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.requestRenderAll();
    this.canvasHistory.push('object:added');
    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  ungroupElements(): void {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (!active || active.type !== 'group') return;

    const group = active as Group;
    // Snapshot world transforms while still inside the group
    const objects = (group.getObjects() as FabricObject[]).map(obj => {
      const worldMatrix = obj.calcTransformMatrix();
      group.remove(obj);
      util.applyTransformToObject(obj, worldMatrix);
      return obj;
    });

    this.canvas.remove(group);
    objects.forEach(obj => this.canvas!.add(obj));

    const sel = new ActiveSelection(objects, { canvas: this.canvas });
    this.canvas.setActiveObject(sel);
    this.canvas.requestRenderAll();
    this.canvasHistory.push('object:removed');
    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  lockMovement(): void {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (!active) return;
    active.set({ lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true });
    this.canvas.requestRenderAll();
    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  unlockMovement(): void {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (!active) return;
    active.set({ lockMovementX: false, lockMovementY: false, lockScalingX: false, lockScalingY: false });
    this.canvas.requestRenderAll();
    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  applyMask(): void {
    if (!this.canvas) return;
    const selected = this.canvas.getActiveObjects();
    if (selected.length !== 2) return;

    const [maskedObject, maskObject] = selected;
    maskObject.set({
      absolutePositioned: true,
      selectable: false,
      evented: false,
      fill: 'rgba(0,0,0,0)',
      objectCaching: false,
    });
    (maskedObject as FabricObject & { clipPath: unknown }).clipPath = maskObject;
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  undoMask(): void {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject() as (FabricObject & { clipPath?: unknown }) | null;
    if (!active) return;
    active.clipPath = undefined;
    this.canvas.requestRenderAll();
    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  async mirrorHorizontal(): Promise<void> {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (!active) return;
    const cloned = await active.clone();
    const canvasW = this.canvas.getWidth();
    const origCenterX = (active.left ?? 0) + (active.width ?? 0) * (active.scaleX ?? 1) * 0.5;
    cloned.set({
      flipX: !active.flipX,
      left: canvasW - origCenterX - (active.width ?? 0) * (active.scaleX ?? 1) * 0.5,
      top: active.top,
      evented: true,
    });
    this.canvas.add(cloned);
    this.canvas.setActiveObject(cloned);
    this.canvas.requestRenderAll();
    this.canvasHistory.push('object:added');
    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  async mirrorVertical(): Promise<void> {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (!active) return;
    const cloned = await active.clone();
    const canvasH = this.canvas.getHeight();
    const origCenterY = (active.top ?? 0) + (active.height ?? 0) * (active.scaleY ?? 1) * 0.5;
    cloned.set({
      flipY: !active.flipY,
      left: active.left,
      top: canvasH - origCenterY - (active.height ?? 0) * (active.scaleY ?? 1) * 0.5,
      evented: true,
    });
    this.canvas.add(cloned);
    this.canvas.setActiveObject(cloned);
    this.canvas.requestRenderAll();
    this.canvasHistory.push('object:added');
    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  async duplicateObject(): Promise<void> {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (!active) return;
    const cloned = await active.clone();
    cloned.set({ left: (cloned.left ?? 0) + 10, top: (cloned.top ?? 0) + 10, evented: true });
    this.canvas.add(cloned);
    this.canvas.setActiveObject(cloned);
    this.canvas.requestRenderAll();
    this.contextMenu = null;
    this.cdr.markForCheck();
  }

  /** Patch an object's toObject() so the custom property survives canvas.toJSON(). */
  private patchToObject(obj: FabricObject, extras: Record<string, unknown>): void {
    const original = obj.toObject.bind(obj);
    obj.toObject = (props?: string[]) => ({ ...original(props), ...extras });
  }

  // ── Share ─────────────────────────────────────────────────────────────────

  openShareMenu(): void {
    this.requireAuth(() => {
      this.saveUserCopyThenRun(() => {
        this.shareDrawer = true;
        this.cdr.markForCheck();
      });
    });
  }

  closeShareDrawer(): void {
    this.shareDrawer = false;
  }

  onShareAction(action: IShareAction): void {
    this.closeShareDrawer();
    if (action.action === 'export') {
      this.openDownloadMenu();
    } else if (action.action === 'public') {
      this.openShareModal();
    }
  }

  openShareModal(): void {
    if (!this.artDoc?.id) {
      this.nzMessage.error('Art document not found');
      return;
    }
    this.generatePreviewImage()
      .then((previewData) => this.uploadPreviewToStorage(previewData))
      .then((previewUrl) => {
        this.modal.create({
          nzTitle: 'Share Your Art',
          nzContent: SharePublicLinkComponent,
          nzData: {
            artDocId: this.artDoc?.id,
            title: this.artDoc?.title,
            description: this.artDoc?.description,
            previewUrl,
          },
          nzFooter: null,
          nzWidth: 500,
          nzOkText: null,
          nzCancelText: null,
        });
      })
      .catch(() => this.nzMessage.error('Failed to generate preview'));
  }

  private generatePreviewImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.canvas) { reject(new Error('No canvas')); return; }
        resolve(this.canvas.getElement().toDataURL('image/png'));
      } catch (e) { reject(e); }
    });
  }

  private async uploadPreviewToStorage(previewData: string): Promise<string> {
    const response = await fetch(previewData);
    const blob = await response.blob();
    const file = new File([blob], `preview-${this.artDoc?.id}.png`, { type: 'image/png' });
    await this.artDocsService.uploadFile(file, 'previews', `preview-${this.artDoc?.id}`);
    const { data } = this.supabaseService.client.storage
      .from('thubnails')
      .getPublicUrl(`previews/preview-${this.artDoc?.id}.png`);
    return data.publicUrl;
  }

  // ── AI Design Generator ───────────────────────────────────────────────────

  openAiDesignGenerator(): void {
    const ref = this.modal.create({
      nzTitle: undefined,
      nzFooter: null,
      nzWidth: 500,
      nzBodyStyle: { padding: '24px' },
      nzContent: AiDesignGeneratorComponent,
    });

    const instance = ref.getContentComponent();
    if (instance) {
      instance.canvas = this.canvas;
      instance.artDoc = this.artDoc;
    }
  }

  // ── Mockup Generator ──────────────────────────────────────────────────────

  openMockupGenerator(): void {
    const ref = this.modal.create({
      nzTitle: undefined,
      nzFooter: null,
      nzWidth: 520,
      nzBodyStyle: { padding: '24px' },
      nzContent: MockupGeneratorComponent,
      nzData: {
        canvas: this.canvas,
        artDoc: this.artDoc,
      },
    });

    const instance = ref.getContentComponent();
    if (instance) {
      instance.canvas = this.canvas;
      instance.artDoc = this.artDoc;
    }
  }

  // ── Download ──────────────────────────────────────────────────────────────

  openDownloadMenu(): void {
    this.requireAuth(() => {
      this.downloadDrawer = true;
      this.cdr.markForCheck();
    });
  }

  // ── Save user copy ────────────────────────────────────────────────────────

  private async saveUserCopyThenRun(after: () => void): Promise<void> {
    const session = this.authService.getCurrentUserSession();
    const userId = session?.user?.id;
    if (!userId || !this.artDoc) { after(); return; }

    const role = session?.user?.app_role ?? 'user';
    const isAdmin = role === 'admin';

    try {
      // Serialize current canvas into the active page
      const rawPages = this.artDoc.pages ?? [];
      const pagesWithCanvas = rawPages.map((p, i) => {
        if (i === this.pageIndex && this.canvas) {
          // Temporarily remove watermark objects so they are never serialised
          const watermarks = this.canvas.getObjects().filter((o) => (o as any).isWatermark);
          watermarks.forEach((o) => this.canvas!.remove(o));

          const canvasContent = this.canvas.toObject([
            'id',
            'lockMovementX', 'lockMovementY',
            'lockScalingX', 'lockScalingY',
            'lockRotation',
            'selectable', 'evented',
            'visible',
            'lockedBackground', 'isArtContour',
            'uploadedImagePath', 'uploadedImageUrl',
            'isTextureOverlay',
            'qrData',
          ]);
          const preview = this.canvas.toDataURL({ multiplier: 0.5, format: 'jpeg', quality: 0.8 });

          // Re-add watermarks after serialisation
          watermarks.forEach((o) => {
            this.canvas!.add(o);
            this.canvas!.bringObjectToFront(o);
          });

          return { ...p, canvasContent, preview };
        }
        return { ...p };
      });

      if (isAdmin) {
        // ── ADMIN: update original art_docs_faces directly ─────────────────
        const artDocId = this.artDoc.id;
        for (const page of pagesWithCanvas) {
          if (!page.id) continue;
          const { error } = await this.supabaseService.client
            .from('art_docs_faces')
            .update({
              canvasContent: page.canvasContent,
              preview: page.preview ?? null,
            })
            .eq('id', page.id)
            .eq('art_doc_id', artDocId);
          if (error) throw error;
        }
        this.nzMessage.success('Modèle original mis à jour');
      } else {
        // ── USER: save to user_art_docs_faces (never touches art_docs_faces) ─
        const isUserCopy = this.artDoc.type === 'copy';
        const originalId: string = this.artDoc.original_id ?? this.artDoc.id;

        const pages = pagesWithCanvas.map(p => ({
          id: isUserCopy ? p.id : undefined,
          side: p.side,
          canvasContent: p.canvasContent,
          preview: p.preview,
        }));

        await this.userArtDocsService.saveUserCanvasContent(userId, originalId, pages);
        this.nzMessage.success('Modèle sauvegardé dans votre profil');
      }
    } catch (e) {
      console.error('Save error:', e);
      this.nzMessage.error('Erreur lors de la sauvegarde');
    }

    after();
  }

  /** Check auth; if logged in run callback immediately, otherwise show login modal then run callback on success. */
  private requireAuth(onSuccess: () => void): void {
    this.authService.isLoggedInAsync().then((loggedIn) => {
      if (loggedIn) {
        onSuccess();
      } else {
        const modalRef = this.modal.create({
          nzContent: OtpLoginComponent,
          nzData: { action: 'Continue' },
          nzFooter: null,
          nzWidth: 480,
        });
        modalRef.afterClose.subscribe(() => {
          this.authService.isLoggedInAsync().then((nowLoggedIn) => {
            if (nowLoggedIn) onSuccess();
          });
        });
      }
    });
  }

  closeDownloadDrawer(): void {
    this.downloadDrawer = false;
  }

  downloadActionFile(options: IDownloadOptions): void {
    this.simulateProgress();
    if (options.printType === 'pdf') {
      options.splitByGroup ? this.exportCanvasForEachGroup(options) : this.exportCanvasVectorPdf(options);
    } else if (options.printType === 'jpeg') {
      this.exportCanvasAsJpeg(options);
    } else if (options.printType === 'png') {
      this.exportCanvasAsPng(options);
    }
  }

  private _progressInterval: any = null;

  private simulateProgress(): void {
    if (this._progressInterval) { clearInterval(this._progressInterval); }
    this.progress = 0;
    this.cdr.markForCheck();
    this._progressInterval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 10;
      } else {
        clearInterval(this._progressInterval);
        this._progressInterval = null;
      }
      this.cdr.markForCheck();
    }, 250);
  }

  /**
   * Replace all https:// image hrefs in an SVG string with base64 PNG data URIs.
   * SVG images are rasterized at high resolution (300 Dpi equivalent) via Canvas
   * because svg-to-pdfkit cannot render nested SVG data URIs.
   */
  private async inlineSvgImages(svg: string): Promise<string> {
    const hrefRe    = /((?:xlink:href|href)=")(https?:\/\/[^"]+)(")/gi;
    // Also grab display dimensions from the <image> element for DPI-aware sizing
    const imageElemRe = /<image\b([^>]*)>/gi;
    const dimByUrl: Record<string, { w: number; h: number }> = {};
    let em: RegExpExecArray | null;
    while ((em = imageElemRe.exec(svg)) !== null) {
      const attrs  = em[1];
      const hrefM  = attrs.match(/(?:xlink:href|href)="(https?:\/\/[^"]+)"/);
      if (!hrefM) continue;
      const w = parseFloat(attrs.match(/\bwidth="([^"]+)"/)?.[1] ?? '0');
      const h = parseFloat(attrs.match(/\bheight="([^"]+)"/)?.[1] ?? '0');
      if (w > 0 && h > 0) dimByUrl[hrefM[1]] = { w, h };
    }

    const urls = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = hrefRe.exec(svg)) !== null) urls.add(m[2]);
    hrefRe.lastIndex = 0;
    if (!urls.size) return svg;

    // 300 DPI vs SVG 72-DPI ≈ ×4.17 — clamp to 4000 px
    const DPI_SCALE = 300 / 72;
    const MAX_PX    = 4000;

    const cache: Record<string, string> = {};
    await Promise.all([...urls].map(async (url) => {
      try {
        const res  = await fetch(url);
        const blob = await res.blob();
        const isSvg = blob.type.includes('svg') || /\.svg(\?|$)/i.test(url);

        if (isSvg) {
          // Rasterize SVG → PNG at high res via an offscreen Canvas
          const svgText = await blob.text();
          const disp    = dimByUrl[url];
          const dispW   = disp ? disp.w : 200;
          const dispH   = disp ? disp.h : 200;
          const canvW   = Math.min(Math.round(dispW * DPI_SCALE), MAX_PX);
          const canvH   = Math.min(Math.round(dispH * DPI_SCALE), MAX_PX);

          const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
          const objUrl  = URL.createObjectURL(svgBlob);
          cache[url]    = await new Promise<string>((resolve, reject) => {
            const img    = new Image();
            img.onload  = () => {
              const c   = document.createElement('canvas');
              c.width   = canvW;
              c.height  = canvH;
              c.getContext('2d')!.drawImage(img, 0, 0, canvW, canvH);
              URL.revokeObjectURL(objUrl);
              resolve(c.toDataURL('image/png'));
            };
            img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('img load failed')); };
            img.src     = objUrl;
          });
        } else {
          // Raster image (PNG/JPEG/WebP) — embed as-is
          cache[url] = await new Promise<string>((resolve, reject) => {
            const reader    = new FileReader();
            reader.onload  = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) { console.warn('[export] could not inline image:', url, e); }
    }));

    return svg.replace(hrefRe, (_, before, url, after) =>
      cache[url] ? `${before}${cache[url]}${after}` : `${before}${url}${after}`
    );
  }

  private async exportCanvasVectorPdf(options?: IDownloadOptions): Promise<void> {
    if (!this.canvas) return;
    this.isDownloaded = true;

    const savedBg = this.canvas.backgroundColor as string;
    this.canvas.backgroundColor = '';
    this.canvas.renderAll();

    // Sanitize non-string fill/stroke so toSVG() doesn't crash (walk group children too)
    const savedFills: { obj: any; fill: any; stroke: any }[] = [];
    const sanitize = (o: any) => {
      const badFill   = o.fill   != null && typeof o.fill   !== 'string' && !o.fill?.type;
      const badStroke = o.stroke != null && typeof o.stroke !== 'string' && !o.stroke?.type;
      if (badFill || badStroke) {
        savedFills.push({ obj: o, fill: o.fill, stroke: o.stroke });
        if (badFill)   o.fill   = '#000000';
        if (badStroke) o.stroke = 'none';
      }
      o._objects?.forEach(sanitize);
    };
    this.canvas.getObjects().forEach(sanitize);

    const rawSvg  = this.canvas.toSVG();
    const svgData = await this.inlineSvgImages(rawSvg);

    for (const { obj, fill, stroke } of savedFills) { obj.fill = fill; obj.stroke = stroke; }
    this.canvas.backgroundColor = savedBg;
    this.canvas.renderAll();

    const session = this.authService.getCurrentUserSession();
    const uid = session?.user?.id ?? 'anon';

    // Upload SVG to Supabase to avoid Netlify 6 MB body limit for large canvases
    const svgPath = `${uid}/pdf-exports/${Date.now()}.svg`;
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    const { data: uploadData, error: uploadError } = await this.supabaseService.client.storage
      .from('user-uploads')
      .upload(svgPath, svgBlob, { contentType: 'image/svg+xml', upsert: true });

    if (uploadError || !uploadData) {
      console.error('[export] SVG upload failed, falling back to inline', uploadError);
      // fallback: send inline (may still fail for very large canvases)
      this.generateDoc({
        uid, svgData,
        size: this.artDoc?.size, canvasWidth: this.artDoc?.width, canvasHeight: this.artDoc?.height,
        bleed: options?.switchValueBleed ? 0.125 : 0, marks: options?.marks,
        savePaper: options?.savePaper, paperFormat: options?.paperFormat ?? 'A4-L',
        accessToken: session?.access_token,
      });
      return;
    }

    const { data: publicUrlData } = this.supabaseService.client.storage
      .from('user-uploads')
      .getPublicUrl(svgPath);

    this.generateDoc({
      uid,
      svgUrl:      publicUrlData.publicUrl,
      size:        this.artDoc?.size,
      canvasWidth: this.artDoc?.width,
      canvasHeight: this.artDoc?.height,
      bleed:       options?.switchValueBleed ? 0.125 : 0,
      marks:       options?.marks,
      savePaper:   options?.savePaper,
      paperFormat: options?.paperFormat ?? 'A4-L',
      accessToken: session?.access_token,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async exportCanvas(options?: IDownloadOptions): Promise<void> {
    console.log('Export options pdf:', options);
    if (!this.canvas) return;
    this.isDownloaded = true;

    // Clear staging background so only artwork is captured
    const savedBg = this.canvas.backgroundColor as string;
    this.canvas.backgroundColor = '';
    this.canvas.renderAll();

    // Hide text objects → export background/images as PNG → restore text
    const allObjects = this.canvas.getObjects();
    const textObjects = allObjects.filter(
      o => o.type === 'i-text' || o.type === 'textbox' || o.type === 'text'
    );
    textObjects.forEach(o => { (o as any).visible = false; });
    this.canvas.renderAll();

    const dataURL = this.canvas.toDataURL({ format: 'png', multiplier: 4.138 });

    textObjects.forEach(o => { (o as any).visible = true; });
    this.canvas.backgroundColor = savedBg;
    this.canvas.renderAll();

    // Extract text metadata for server-side vector rendering
    const textData = textObjects.map(o => {
      const t = o as any;
      const bb = o.getBoundingRect();
      return {
        text:       t.text ?? '',
        left:       bb.left,
        top:        bb.top,
        width:      bb.width,
        height:     bb.height,
        fontSize:   t.fontSize   ?? 12,
        fontFamily: t.fontFamily ?? 'Helvetica',
        fontWeight: t.fontWeight ?? 'normal',
        fontStyle:  t.fontStyle  ?? 'normal',
        fill:       typeof t.fill === 'string' ? t.fill : '#000000',
        textAlign:  t.textAlign  ?? 'left',
        angle:      t.angle      ?? 0,
      };
    });

    const session = this.authService.getCurrentUserSession();
    const requestOption: any = {
      uid: session?.user?.id,
      dataURL,
      textData,
      size: this.artDoc?.size,
      canvasWidth:  this.artDoc?.width,
      canvasHeight: this.artDoc?.height,
      bleed: options?.switchValueBleed ? 0.125 : 0,
      marks: options?.marks,
      savePaper: options?.savePaper,
      paperFormat: options?.paperFormat ?? 'A4-L',
      accessToken: session?.access_token,
    };
    this.generateDoc(requestOption);
  }

  private async exportCanvasAsJpeg(options?: IDownloadOptions): Promise<void> {
    if (!this.canvas) return;
    this.isDownloaded = true;
    const savedBg = this.canvas.backgroundColor as string;
    try {
      this.canvas.backgroundColor = '#ffffff';
      this.canvas.renderAll();
      const multiplier = this.dpiToMultiplier(options?.printJpegQuality ?? '300dpi');
      const dataURL = this.canvas.toDataURL({ format: 'jpeg', multiplier, quality: 0.92 });
      this.progress = 100;
      this.downloadDataURL(dataURL, `design-${Date.now()}.jpeg`);
    } catch (err) {
      console.error('[export] JPEG failed:', err);
      alert('Export échoué. Vérifiez que toutes les images sont accessibles (CORS).');
    } finally {
      this.canvas.backgroundColor = savedBg;
      this.canvas.renderAll();
      this.isDownloaded = false;
      this.cdr.markForCheck();
    }
  }

  private async exportCanvasAsPng(options?: IDownloadOptions): Promise<void> {
    if (!this.canvas) return;
    this.isDownloaded = true;
    const savedBg = this.canvas.backgroundColor as string;
    try {
      this.canvas.backgroundColor = '';
      this.canvas.renderAll();
      const multiplier = this.dpiToMultiplier(options?.printPngQuality ?? '300dpi');
      const dataURL = this.canvas.toDataURL({ format: 'png', multiplier });
      this.progress = 100;
      this.downloadDataURL(dataURL, `design-${Date.now()}.png`);
    } catch (err) {
      console.error('[export] PNG failed:', err);
      alert('Export échoué. Vérifiez que toutes les images sont accessibles (CORS).');
    } finally {
      this.canvas.backgroundColor = savedBg;
      this.canvas.renderAll();
      this.isDownloaded = false;
      this.cdr.markForCheck();
    }
  }

  private downloadDataURL(dataURL: string, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /** Convert a DPI string ('96dpi' | '300dpi') to a Fabric.js canvas multiplier.
   *  Fabric.js canvas base is 72 DPI. */
  private dpiToMultiplier(dpiStr: string): number {
    const dpi = parseInt(dpiStr, 10);
    if (!dpi || isNaN(dpi)) return 4.167; // default 300 DPI
    return Math.min(dpi / 72, 6); // cap at ~432 DPI to avoid OOM crash
  }

  private exportCanvasForEachGroup(options?: IDownloadOptions): void {
    if (!this.canvas) return;
    const multiplier = 4.138;
    [...this.canvas.getObjects('group'), ...this.canvas.getObjects('image'), ...this.canvas.getObjects('polygon')]
      .forEach((obj) => {
        obj.clone().then((cloned: any) => {
          cloned.left = obj.left;
          cloned.top = obj.top;
          const dataURL = this.canvas!.toDataURL({ format: 'png', multiplier });
          this.generateDoc({
            dataURL,
            size: this.artDoc?.size,
            bleed: options?.switchValueBleed ? 0.125 : 0,
            marks: options?.marks,
            savePaper: options?.savePaper,
            paperFormat: options?.paperFormat ?? 'A4-L',
          });
        });
      });
  }

  private async generateDoc(requestOption: any): Promise<void> {
    const url = `${this.env.hostServer}/.netlify/functions/generatePdfFromFabricJson`;
    this.http.post(url, requestOption).subscribe({
      next: async (response: any) => {
        this.progress = 100;
        this.isDownloaded = false;
        if (response?.url) {
          const pdfResponse = await fetch(response.url);
          const blob = await pdfResponse.blob();
          saveAs(blob, `generated-file-${Date.now()}.pdf`);
        }
      },
      error: () => { this.isDownloaded = false; },
    });
  }

  ngOnDestroy(): void {
    this.deregisterWindowFocusCheck();
    this.canvasHistory.detach();
    this.canvasProvider.setCanvas(null);
    this.canvas?.dispose();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Canvas internals ──────────────────────────────────────────────────────
  private schedulePreview(): void {
    if (this.previewDebounceTimer) clearTimeout(this.previewDebounceTimer);
    this.previewDebounceTimer = setTimeout(() => this.generateAndDispatchPreview(), 600);
  }

  private bindSelectionEvents(canvas: Canvas): void {
    const updateSelection = () => {
      const activeObject = canvas.getActiveObject() as (FabricObject & { id?: string }) | null;
      const objectType = this.mapObjectType(activeObject?.type ?? null);
      const selection = {
        objectId: activeObject?.id ?? null,
        objectType,
        isMultiSelection: canvas.getActiveObjects().length > 1,
      };
      this.canvasProvider.setSelection(selection, activeObject);
      this.store.dispatch(new SetSelection(selection));
    };

    const clearSelection = () => {
      const selection = { objectId: null, objectType: null, isMultiSelection: false };
      this.canvasProvider.setSelection(selection, null);
      this.store.dispatch(new SetSelection(selection));
    };

    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', clearSelection);

    const schedulePreview = () => this.schedulePreview();
    canvas.on('object:added', schedulePreview);
    canvas.on('object:removed', schedulePreview);
    canvas.on('object:modified', schedulePreview);
  }

  private showCanvasLoader(): void {
    this.canvasWrapperEl.nativeElement.style.visibility = 'hidden';
    this.canvasLoaderEl.nativeElement.style.display = 'flex';
  }

  private hideCanvasLoader(): void {
    this.canvasLoaderEl.nativeElement.style.display = 'none';
    this.canvasWrapperEl.nativeElement.style.visibility = 'visible';
  }

  private async loadFace(face: IArtPage): Promise<void> {
    if (!this.canvas || !face?.id) return;
    // Mark as loading only after successful completion (reset on error) so that
    // a failed or slow fetch does not permanently block retries via the guard at
    // the combineLatest subscription.
    this.lastLoadedFaceId = face.id;

    this.canvasHistory.detach();

    const canvasW = Number(this.artDoc?.width ?? 400);
    const canvasH = Number(this.artDoc?.height ?? 600);
    this.canvasWidth = canvasW;
    this.canvasHeight = canvasH;

    this.canvas.setDimensions({ width: canvasW, height: canvasH });
    // Clear immediately so the old face never flashes while the new content loads
    this.canvas.clear();
    this.canvas.set({ backgroundColor: face.backgroundColor || '#ffffff' });
    this.canvas.requestRenderAll();
    // Defer zoom calc to ensure the scroll container has its final dimensions in the DOM
    setTimeout(() => this.fitZoomToScroll(canvasW, canvasH), 50);

    let resolvedContent: unknown;
    try {
      resolvedContent = await this.firebaseStorage.getArtContent(face.canvasContent);
    } catch (err) {
      this.lastLoadedFaceId = null;
      this.hideCanvasLoader();
      throw err;
    }
    const content = this.toCanvasJson(resolvedContent ?? face.canvasContent);

    this.canvas.clear();

    if (content && Object.keys(content).length > 0) {
      await this.canvas.loadFromJSON(content, (_serialized: Record<string, any>, instance: any) => {
        if (instance?.type === 'image') {
          instance.set({ crossOrigin: 'anonymous' });
          if (_serialized?.['qrData'] !== undefined) {
            instance['qrData'] = _serialized['qrData'];
          }
        }
      });

      this.canvas.getObjects().forEach((obj) => {
        if ((obj as FabricObject & { lockedBackground?: boolean }).lockedBackground) {
          obj.set({
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            hasControls: false,
            hasBorders: false,
          });
        }
      });
    } else {
      this.canvas.set({ backgroundColor: face.backgroundColor || '#ffffff' });
    }

    // Pre-load any Google Fonts used in this canvas so text renders correctly
    await this.ensureFontsLoaded(this.canvas);

    this.canvas.renderAll();
    this.hideCanvasLoader();
    this.canvasProvider.setCanvas(this.canvas);
    this.canvasHistory.attach(this.canvas, face.id);

    // Sync BackgroundState from the canvas as loaded from JSON.
    // Guard the subscription so it does NOT re-apply applyBackground and
    // overwrite the fill that was just restored from the saved JSON.
    this.syncingBackground = true;
    this.syncBackgroundStateFromCanvas(face.backgroundColor);
    setTimeout(() => { this.syncingBackground = false; }, 0);

    const currentTool = this.store.selectSnapshot(EditorShellState.getActiveTool);
    if (currentTool !== 'edit') {
      this.store.dispatch(new SetActiveTool('edit'));
    }
    this.cdr.markForCheck();
    this.publishToLiveRegion('Edit panel opened');

    // Add watermark for premium models (non-admin users without purchase)
    const isAdmin = this.authService.getCurrentUserSession()?.user?.app_role === 'admin';
    console.log('[watermark] is_premuim:', this.artDoc?.is_premuim, '| isAdmin:', isAdmin, '| id:', this.artDoc?.id, '| original_id:', (this.artDoc as any)?.original_id);
    if (this.artDoc?.is_premuim && !isAdmin) {
      const artDocId = (this.artDoc as any).original_id ?? this.artDoc.id;
      const userId = this.authService.getCurrentUserSession()?.user?.id;
      console.log('[watermark] checking purchase — artDocId:', artDocId, '| userId:', userId);

      // Fast path: device-scoped unlock stored after Stripe checkout (works for guests too)
      if (this.isLocallyUnlocked(artDocId)) {
        console.log('[watermark] locally unlocked — no watermark');
      } else {
        this.paymentService.hasAccess(artDocId, true).then(hasAccess => {
          console.log('[watermark] hasAccess result:', hasAccess);
          if (!hasAccess) {
            this.addPremiumWatermark();
            this.showWatermarkBanner = true;
            this.cdr.markForCheck();
            this.registerWindowFocusCheck();
          }
        });
      }
    }

    // Generate preview immediately after render (not debounced)
    this.generateAndDispatchPreview();
  }

  private async ensureFontsLoaded(canvas: Canvas): Promise<void> {
    // Collect unique fontFamily values from all text objects
    const families = new Set<string>();
    (canvas.getObjects() as (FabricObject & { fontFamily?: string })[]).forEach((obj) => {
      if (obj.fontFamily) families.add(obj.fontFamily);
    });

    if (families.size === 0) return;

    // Build Google Fonts URL for only the fonts used in this canvas
    const systemFonts = new Set(['Georgia', 'Courier New', 'Arial', 'Times New Roman', 'Verdana']);
    const googleFamilies = [...families]
      .filter((f) => !systemFonts.has(f))
      .map((f) => f.replace(/ /g, '+'));

    if (googleFamilies.length === 0) return;

    const linkId = 'google-fonts-editor';
    // Ensure the global editor font stylesheet is present
    if (!document.getElementById(linkId)) {
      const families2 = googleFamilies.join('&family=');
      const href = `https://fonts.googleapis.com/css2?family=${families2}&display=swap`;
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }

    // Wait for the browser to finish loading all fonts
    try {
      await document.fonts.ready;
    } catch {
      // non-blocking — render anyway if fonts.ready fails
    }
  }

  private generateAndDispatchPreview(): void {
    if (!this.canvas) return;
    setTimeout(() => {
      if (!this.canvas) return;
      const preview = this.canvas.toDataURL({ multiplier: 0.3, format: 'jpeg', quality: 0.7 });
      this.store.dispatch(new SetPagePreview({ preview, page_index: this.pageIndex }));
      // Also refresh mobile simple mode preview
      this.mobilePreviewDataUrl = this.canvas.toDataURL({ format: 'jpeg', quality: 0.85, multiplier: 1 });
      this.cdr.markForCheck();
    }, 100);
  }

  openUnlockPremium(): void {
    const artDocId = (this.artDoc as any)?.original_id ?? this.artDoc?.id;
    if (!artDocId) return;
    // Store return URL so purchase-success can redirect back to the editor
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('editorReturnUrl', `/creator/${artDocId}`);
    }
    this.modal.create({
      nzTitle: undefined,
      nzContent: PremiumGateComponent,
      nzData: {
        artDocId,
        artTitle: this.artDoc?.title ?? this.artDoc?.name ?? 'this design',
        initialPlan: 'single' as PlanId,
      },
      nzFooter: null,
      nzWidth: 480,
      nzBodyStyle: { padding: '24px' },
      nzMaskClosable: true,
      nzKeyboard: true,
    });
  }

  private registerWindowFocusCheck(): void {
    if (!isPlatformBrowser(this.platformId) || this.windowFocusListener) return;
    this.windowFocusListener = () => {
      const artDocId = (this.artDoc as any)?.original_id ?? this.artDoc?.id;
      if (!artDocId) return;
      // Check localStorage unlock first (guest buyers), then server access check
      if (this.isLocallyUnlocked(artDocId)) {
        this.removePremiumWatermark();
        this.showWatermarkBanner = false;
        this.cdr.markForCheck();
        this.deregisterWindowFocusCheck();
        return;
      }
      this.paymentService.hasAccess(artDocId, true).then(hasAccess => {
        if (hasAccess) {
          this.removePremiumWatermark();
          this.showWatermarkBanner = false;
          this.cdr.markForCheck();
          this.deregisterWindowFocusCheck();
        }
      });
    };
    window.addEventListener('focus', this.windowFocusListener);
  }

  /** Returns true if this device has a server-verified unlock for the given artDocId */
  private isLocallyUnlocked(artDocId: string): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      const list: string[] = JSON.parse(localStorage.getItem('unlockedArtDocs') ?? '[]');
      return list.includes(artDocId);
    } catch {
      return false;
    }
  }

  private deregisterWindowFocusCheck(): void {
    if (this.windowFocusListener) {
      window.removeEventListener('focus', this.windowFocusListener);
      this.windowFocusListener = null;
    }
  }

  private removePremiumWatermark(): void {
    if (!this.canvas) return;
    const existing = this.canvas.getObjects().filter((o) => (o as any).isWatermark);
    existing.forEach((o) => this.canvas!.remove(o));
    this.canvas.requestRenderAll();
  }

  private addPremiumWatermark(): void {
    if (!this.canvas) return;
    const w = this.canvas.getWidth();
    const h = this.canvas.getHeight();

    // Remove any existing watermark first
    const existing = this.canvas.getObjects().filter(
      (o) => (o as any).isWatermark
    );
    existing.forEach((o) => this.canvas!.remove(o));

    const text = 'MakerTags Premium';
    const cols = 3;
    const rows = 4;
    const stepX = w / cols;
    const stepY = h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wm = new IText(text, {
          left: stepX * c + stepX / 2,
          top: stepY * r + stepY / 2,
          originX: 'center',
          originY: 'center',
          fontSize: Math.max(14, Math.round(w / 18)),
          fontFamily: 'Arial',
          fill: 'rgba(255,255,255,0.35)',
          stroke: 'rgba(0,0,0,0.12)',
          strokeWidth: 0.5,
          angle: -30,
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          editable: false,
        } as any);
        (wm as any).isWatermark = true;
        this.canvas!.add(wm);
        this.canvas!.bringObjectToFront(wm);
      }
    }
    this.canvas.requestRenderAll();
  }

  private toCanvasJson(content: unknown): Record<string, unknown> | null {
    if (!content) return null;
    if (typeof content === 'string') {
      try { return JSON.parse(content) as Record<string, unknown>; } catch { return null; }
    }
    if (typeof content === 'object') return content as Record<string, unknown>;
    return null;
  }

  private publishToLiveRegion(message: string): void {
    if (!this.liveRegion?.nativeElement) return;
    this.liveRegion.nativeElement.textContent = '';
    setTimeout(() => {
      if (this.liveRegion?.nativeElement) {
        this.liveRegion.nativeElement.textContent = message;
      }
    }, 0);
  }

  private mapObjectType(type: string | null): CanvasObjectType | null {
    if (!type) return null;
    if (type === 'i-text' || type === 'textbox') return 'text';
    if (type === 'image') return 'image';
    if (type === 'group') return 'group';
    if (['rect', 'circle', 'triangle', 'polygon', 'ellipse', 'line'].includes(type)) return 'shape';
    return 'svg';
  }

  private syncBackgroundStateFromCanvas(faceBackgroundColor?: string): void {
    if (!this.canvas) return;

    const backgroundImage = this.canvas.backgroundImage as { src?: string; getSrc?: () => string } | undefined;
    const textureSrc = backgroundImage?.getSrc?.() || backgroundImage?.src || null;

    if (textureSrc) {
      this.store.dispatch(new SetBackgroundTexture(textureSrc));
      return;
    }

    const backgroundColor = this.extractHexColor(
      (this.canvas.backgroundColor as string | null | undefined) || faceBackgroundColor || '#FFFFFF'
    );
    this.store.dispatch(new SetBackgroundColor(backgroundColor, false));
  }

  private extractHexColor(value: string): string {
    const match = (value || '').trim().match(/#?[0-9a-fA-F]{6}/);
    if (!match) return '#FFFFFF';
    const normalized = match[0].startsWith('#') ? match[0] : `#${match[0]}`;
    return normalized.toUpperCase();
  }
}
