import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Canvas,
  Circle,
  FabricImage,
  FabricObject,
  Line,
  Rect,
  Triangle,
  loadSVGFromURL,
  util,
} from 'fabric';
import { nanoid } from 'nanoid';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Subject, takeUntil } from 'rxjs';
import { CanvasProviderService } from '../../../services/canvas-provider.service';
import { EditorAnnouncerService } from '../../../services/editor-announcer.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { ArtDocsService } from '../../../../shared/services/art-docs.service';

interface AssetItem {
  id: string;
  source: string;
  categorie: string;
  type: string;
  name?: string;
}

interface CategoryGroup {
  categorie: string;
  items: AssetItem[];
}

type BasicShapeType = 'rect' | 'rect-r' | 'circle' | 'triangle' | 'line';

@Component({
  selector: 'maker-tags-elements-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
  ],
  templateUrl: './elements-panel.component.html',
  styleUrl: './elements-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElementsPanelComponent implements OnInit, OnDestroy {
  view: 'home' | 'category' = 'home';
  allGroups: CategoryGroup[] = [];
  activeGroup: CategoryGroup | null = null;
  searchQuery = '';
  loading = true;
  errorMessage: string | null = null;

  readonly basicShapes: Array<{ type: BasicShapeType; label: string; icon: string }> = [
    { type: 'rect', label: 'Rectangle', icon: 'border' },
    { type: 'rect-r', label: 'Rounded', icon: 'border' },
    { type: 'circle', label: 'Circle', icon: 'border' },
    { type: 'triangle', label: 'Triangle', icon: 'caret-up' },
    { type: 'line', label: 'Line', icon: 'minus' },
  ];

  private canvas: Canvas | null = null;
  private isAdmin = false;
  private allAssets: AssetItem[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly artDocsService: ArtDocsService,
    private readonly canvasProvider: CanvasProviderService,
    private readonly authService: AuthService,
    private readonly announcer: EditorAnnouncerService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.canvasProvider.canvas$.pipe(takeUntil(this.destroy$)).subscribe((canvas) => {
      this.canvas = canvas;
    });

    this.authService.isAdmin$.pipe(takeUntil(this.destroy$)).subscribe((admin) => {
      this.isAdmin = admin;
      this.allGroups = this.groupAssets(this.filterAssets(this.allAssets));
      this.cdr.markForCheck();
    });

    this.artDocsService.getImagesByCategotiries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assets) => {
          this.allAssets = (assets ?? [])
            .map((item: any) => this.toAssetItem(item))
            .filter((item): item is AssetItem => item !== null);

          this.allGroups = this.groupAssets(this.filterAssets(this.allAssets));
          this.loading = false;
          this.errorMessage = null;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Could not load decorative elements.';
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredItems(): AssetItem[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return this.allGroups
      .flatMap((group) => group.items)
      .filter((item) =>
        item.categorie.toLowerCase().includes(query) ||
        (item.name ?? '').toLowerCase().includes(query)
      );
  }

  get categoryFilteredItems(): AssetItem[] {
    const items = this.activeGroup?.items ?? [];
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) =>
      item.categorie.toLowerCase().includes(query) ||
      (item.name ?? '').toLowerCase().includes(query)
    );
  }

  openCategory(group: CategoryGroup): void {
    this.activeGroup = group;
    this.view = 'category';
    this.searchQuery = '';
    this.cdr.markForCheck();
  }

  goBack(): void {
    this.view = 'home';
    this.activeGroup = null;
    this.searchQuery = '';
    this.cdr.markForCheck();
  }

  async addAsset(item: AssetItem): Promise<void> {
    if (!this.canvas) {
      return;
    }

    try {
      if (this.isSvgAsset(item)) {
        const { objects, options } = await loadSVGFromURL(item.source);
        const validObjects = objects.filter((object): object is FabricObject => object !== null);

        if (validObjects.length === 0) {
          // Not a real SVG — load as raster image instead
          const image = await FabricImage.fromURL(item.source, { crossOrigin: 'anonymous' });
          image.set({ uploadedImageUrl: item.source } as Partial<FabricObject>);
          this.centerAndScale(image, this.canvas);
          this.canvas.add(image);
          this.canvas.setActiveObject(image);
        } else {
          const group = util.groupSVGElements(validObjects, options);
          const firstFill = validObjects.find(o => o.fill && o.fill !== 'transparent' && o.fill !== '')?.fill as string | undefined;
          const uniformFill = firstFill ?? '#f59e0b';
          validObjects.forEach(o => { if (o.fill !== 'transparent') o.set({ fill: uniformFill }); });
          (group as FabricObject & { svgShape?: boolean }).svgShape = true;
          this.centerAndScale(group, this.canvas);
          this.canvas.add(group);
          this.canvas.setActiveObject(group);
        }
      } else {
        const image = await FabricImage.fromURL(item.source, { crossOrigin: 'anonymous' });
        image.set({ uploadedImageUrl: item.source } as Partial<FabricObject>);
        this.centerAndScale(image, this.canvas);
        this.canvas.add(image);
        this.canvas.setActiveObject(image);
      }

      this.canvas.requestRenderAll();
      this.announcer.announce('Element added');
    } catch {
      this.errorMessage = 'Could not add this element to the canvas.';
      this.cdr.markForCheck();
    }
  }

  addShape(type: BasicShapeType): void {
    if (!this.canvas) {
      return;
    }

    const centerX = this.canvas.getWidth() / 2;
    const centerY = this.canvas.getHeight() / 2;
    const commonProps = {
      left: centerX,
      top: centerY,
      originX: 'center' as const,
      originY: 'center' as const,
      fill: '#d1d5db',
      stroke: '#4b5563',
      strokeWidth: 1,
      id: nanoid(),
    };

    let shape: FabricObject | null = null;
    switch (type) {
      case 'rect':
        shape = new Rect({ ...commonProps, width: 120, height: 80 });
        break;
      case 'rect-r':
        shape = new Rect({ ...commonProps, width: 120, height: 80, rx: 16, ry: 16 });
        break;
      case 'circle':
        shape = new Circle({ ...commonProps, radius: 48 });
        break;
      case 'triangle':
        shape = new Triangle({ ...commonProps, width: 110, height: 100 });
        break;
      case 'line':
        shape = new Line([-60, 0, 60, 0], {
          left: centerX,
          top: centerY,
          originX: 'center',
          originY: 'center',
          stroke: '#374151',
          strokeWidth: 4,
          id: nanoid(),
        });
        break;
      default:
        shape = null;
    }

    if (!shape) {
      return;
    }

    this.canvas.add(shape);
    this.canvas.setActiveObject(shape);
    this.canvas.requestRenderAll();
    this.announcer.announce('Shape added');
  }

  trackGroup(_index: number, group: CategoryGroup): string {
    return group.categorie;
  }

  trackItem(_index: number, item: AssetItem): string {
    return item.id;
  }

  private centerAndScale(object: FabricObject, canvas: Canvas): void {
    const maxWidth = canvas.getWidth() * 0.4;
    const currentWidth = object.getScaledWidth();
    const ratio = currentWidth > maxWidth ? maxWidth / currentWidth : 1;

    object.set({
      scaleX: (object.scaleX ?? 1) * ratio,
      scaleY: (object.scaleY ?? 1) * ratio,
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      originX: 'center',
      originY: 'center',
      id: (object as FabricObject & { id?: string }).id ?? nanoid(),
    } as Partial<FabricObject>);
  }

  private filterAssets(items: AssetItem[]): AssetItem[] {
    return items.filter((item) => this.isAdmin || item.categorie.toLowerCase() !== 'models');
  }

  private groupAssets(items: AssetItem[]): CategoryGroup[] {
    const grouped = new Map<string, AssetItem[]>();

    for (const item of items) {
      const key = item.categorie || 'uncategorized';
      const existing = grouped.get(key) ?? [];
      existing.push(item);
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([categorie, groupItems]) => ({
        categorie,
        items: groupItems,
      }));
  }

  private toAssetItem(item: any): AssetItem | null {
    const source = item?.source as string | undefined;
    const categorie = item?.categorie as string | undefined;
    if (!source || !categorie) {
      return null;
    }

    return {
      id: String(item.id ?? source),
      source,
      categorie,
      type: this.resolveAssetType(item),
      name: item.name ?? item.title ?? item.label ?? undefined,
    };
  }

  private resolveAssetType(item: any): string {
    const rawType = String(item?.type ?? '').toLowerCase();
    if (rawType === 'image') return 'image';
    const url = String(item?.source ?? '');
    const decodedPath = decodeURIComponent(url.split('?')[0]);
    if (/\.(png|jpe?g|webp|gif)$/i.test(decodedPath)) return 'image';
    if (decodedPath.includes('/images/')) return 'image';
    return 'svg';
  }

  private isSvgAsset(item: AssetItem): boolean {
    return item.type === 'svg';
  }
}
