/**
 * canvas-controls.setup.ts
 *
 * Applies custom Zazzle-style selection controls globally to every Fabric.js
 * object on the canvas:
 *   - Pink border + hollow-circle corner/side handles
 *   - Default top-rotation handle hidden
 *   - Functional rotation handle at the BOTTOM of the object
 */
import { Canvas, Control, FabricObject, controlsUtils } from 'fabric';

const PINK = '#e91e63';

// ─── Rotation icon renderer ───────────────────────────────────────────────────
/**
 * Draws a white circle with a clockwise-rotation arrow inside it.
 * Used as the render function for the bottom rotation control.
 */
function renderRotateControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride: object,
  _fabricObject: FabricObject,
): void {
  const R = 10;  // outer circle radius
  const ar = 5;  // inner arc radius

  ctx.save();
  ctx.translate(left, top);

  // ── White circle with pink border ─────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = PINK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // ── Clockwise-rotation arc (300° sweep, gap at top-right) ────────────────
  ctx.strokeStyle = PINK;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  const startAngle = Math.PI / 6;                      // 30°  (1 o'clock)
  const endAngle   = startAngle + (5 * Math.PI) / 3;  // 330° (11 o'clock)

  ctx.beginPath();
  ctx.arc(0, 0, ar, startAngle, endAngle, false);
  ctx.stroke();

  // ── Arrowhead at end of arc ───────────────────────────────────────────────
  const ex = ar * Math.cos(endAngle);
  const ey = ar * Math.sin(endAngle);

  // Clockwise tangent direction at endAngle: (-sin θ, cos θ)
  const tx = -Math.sin(endAngle); // ≈ 0.5
  const ty =  Math.cos(endAngle); // ≈ 0.866
  // Perpendicular (right-hand side)
  const px =  ty;
  const py = -tx;

  const as = 2.2; // arrowhead size

  ctx.beginPath();
  ctx.moveTo(ex - tx * as + px * as * 0.7, ey - ty * as + py * as * 0.7);
  ctx.lineTo(ex, ey);
  ctx.lineTo(ex - tx * as - px * as * 0.7, ey - ty * as - py * as * 0.7);
  ctx.stroke();

  ctx.restore();
}

// ─── Per-object style application ────────────────────────────────────────────
function applyCustomControls(obj: FabricObject): void {
  // ── Border & corner visual style ─────────────────────────────────────────
  obj.set({
    borderColor:        PINK,
    borderScaleFactor:  1.5,
    cornerStyle:        'circle' as const,
    cornerColor:        '#ffffff',
    cornerStrokeColor:  PINK,
    cornerSize:         12,
    transparentCorners: false,
    padding:            6,
  });

  // ── Hide default top-rotation handle ─────────────────────────────────────
  if (obj.controls['mtr']) {
    obj.controls['mtr'].visible = false;
  }

  // ── Bottom rotation handle ────────────────────────────────────────────────
  if (!obj.controls['rot-bottom']) {
    obj.controls['rot-bottom'] = new Control({
      x:                  0,
      y:                  0.5,
      offsetY:            28,
      withConnection:     false,
      actionName:         'rotate',
      cursorStyle:        'crosshair',
      actionHandler:      controlsUtils.rotationWithSnapping,
      cursorStyleHandler: controlsUtils.rotationStyleHandler,
      render:             renderRotateControl,
    });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Call once after the canvas is created.
 * Listens to `object:added` to style every future object.
 * Also returns `applyCustomControls` so callers can re-apply after
 * `loadFromJSON` (fabric fires object:added during deserialization, so
 * usually the listener alone is sufficient).
 */
export function setupCanvasControls(canvas: Canvas): void {
  // Style objects loaded in the future (includes JSON deserialization)
  canvas.on('object:added', (e) => {
    if (e.target) applyCustomControls(e.target);
  });

  // Style objects already on the canvas (if any exist at setup time)
  canvas.getObjects().forEach(applyCustomControls);
}
