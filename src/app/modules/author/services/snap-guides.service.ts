import { Injectable } from '@angular/core';
import { Canvas, FabricObject } from 'fabric';

interface VLine { x: number }
interface HLine { y: number }

/** Distance en px (coords canvas) sous laquelle une ligne de guidage s'affiche. */
const THRESHOLD = 5;
const GUIDE_COLOR = '#2563eb';

@Injectable({ providedIn: 'root' })
export class SnapGuidesService {
  private canvas: Canvas | null = null;
  private vLines: VLine[] = [];
  private hLines: HLine[] = [];
  private enabled = true;

  attach(canvas: Canvas): void {
    this.canvas = canvas;
    canvas.on('object:moving',  (e) => this.onMoving(e.target as FabricObject));
    canvas.on('mouse:up',       ()  => this.clearGuides());
    canvas.on('object:modified',()  => this.clearGuides());
    // Dessin sur le canvas inférieur, après chaque rendu Fabric
    canvas.on('after:render',   (e) => this.draw((e as any).ctx as CanvasRenderingContext2D));
  }

  detach(): void {
    if (!this.canvas) return;
    this.canvas.off('object:moving');
    this.canvas.off('mouse:up');
    this.canvas.off('object:modified');
    this.canvas.off('after:render');
    this.canvas = null;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) this.clearGuides();
  }

  get isEnabled(): boolean { return this.enabled; }

  // ─── private ──────────────────────────────────────────────────────────────

  private onMoving(moving: FabricObject): void {
    if (!this.canvas || !this.enabled) return;

    this.vLines = [];
    this.hLines = [];

    const m  = this.bounds(moving);
    const cw = this.canvas.width  ?? 0;
    const ch = this.canvas.height ?? 0;

    // Points de référence fixes (bords + centre du canvas)
    const refX = [0, cw / 2, cw];
    const refY = [0, ch / 2, ch];

    // Points de référence dynamiques (bords + centre de chaque autre objet)
    for (const obj of this.canvas.getObjects()) {
      if (obj === moving || !obj.visible) continue;
      const b = this.bounds(obj);
      refX.push(b.left, b.cx, b.right);
      refY.push(b.top,  b.cy, b.bottom);
    }

    // Comparer chaque point de contrôle de l'objet en mouvement
    const mxs = [m.left, m.cx, m.right];
    const mys = [m.top,  m.cy, m.bottom];

    const seenX = new Set<number>();
    const seenY = new Set<number>();

    for (const rx of refX) {
      for (const mx of mxs) {
        if (Math.abs(rx - mx) <= THRESHOLD) {
          const key = Math.round(rx);
          if (!seenX.has(key)) { seenX.add(key); this.vLines.push({ x: rx }); }
        }
      }
    }

    for (const ry of refY) {
      for (const my of mys) {
        if (Math.abs(ry - my) <= THRESHOLD) {
          const key = Math.round(ry);
          if (!seenY.has(key)) { seenY.add(key); this.hLines.push({ y: ry }); }
        }
      }
    }
  }

  private draw(ctx: CanvasRenderingContext2D | undefined): void {
    if (!ctx || !this.canvas) return;
    if (!this.vLines.length && !this.hLines.length) return;

    const zoom = this.canvas.getZoom();
    const vpt  = this.canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    const cw   = this.canvas.width  ?? 0;
    const ch   = this.canvas.height ?? 0;

    ctx.save();
    ctx.strokeStyle = GUIDE_COLOR;
    ctx.lineWidth   = 1 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    ctx.globalAlpha = 0.9;

    // Appliquer la transformation viewport (zoom + pan)
    ctx.transform(zoom, 0, 0, zoom, vpt[4], vpt[5]);

    // Hauteur/largeur dans les coordonnées canvas (avant zoom)
    const w = cw / zoom;
    const h = ch / zoom;

    for (const v of this.vLines) {
      ctx.beginPath();
      ctx.moveTo(v.x, 0);
      ctx.lineTo(v.x, h);
      ctx.stroke();
    }

    for (const g of this.hLines) {
      ctx.beginPath();
      ctx.moveTo(0, g.y);
      ctx.lineTo(w, g.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private clearGuides(): void {
    if (!this.vLines.length && !this.hLines.length) return;
    this.vLines = [];
    this.hLines = [];
    this.canvas?.renderAll();
  }

  private bounds(obj: FabricObject) {
    const r = obj.getBoundingRect();
    return {
      left:  r.left,
      right: r.left + r.width,
      cx:    r.left + r.width  / 2,
      top:   r.top,
      bottom:r.top  + r.height,
      cy:    r.top  + r.height / 2,
    };
  }
}
