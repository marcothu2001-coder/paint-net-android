import type { AppState, ShapeType } from '../types';
import { LayerManager } from './LayerManager';
import { HistoryManager } from './HistoryManager';

export class ToolEngine {
  private layerManager: LayerManager;
  private historyManager: HistoryManager;
  private state: AppState;

  private isDrawing: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private startX: number = 0;
  private startY: number = 0;

  public previewCanvas: HTMLCanvasElement;
  public previewCtx: CanvasRenderingContext2D;
  private onCompositeNeedUpdate: () => void;

  constructor(
    layerManager: LayerManager, 
    historyManager: HistoryManager, 
    state: AppState,
    onCompositeNeedUpdate: () => void
  ) {
    this.layerManager = layerManager;
    this.historyManager = historyManager;
    this.state = state;
    this.onCompositeNeedUpdate = onCompositeNeedUpdate;

    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.width = layerManager.width;
    this.previewCanvas.height = layerManager.height;
    this.previewCtx = this.previewCanvas.getContext('2d')!;
  }

  public onPointerDown(x: number, y: number) {
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer || !activeLayer.visible) return;

    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
    this.startX = x;
    this.startY = y;

    if (this.state.activeTool === 'brush') {
      const ctx = activeLayer.ctx;
      ctx.save();
      ctx.strokeStyle = this.state.primaryColor;
      ctx.fillStyle = this.state.primaryColor;
      ctx.lineWidth = this.state.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.arc(x, y, this.state.brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.onCompositeNeedUpdate();
    } else if (this.state.activeTool === 'pencil') {
      this.drawPencilPixel(activeLayer.ctx, Math.floor(x), Math.floor(y));
      this.onCompositeNeedUpdate();
    } else if (this.state.activeTool === 'eraser') {
      const ctx = activeLayer.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = this.state.brushSize;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, this.state.brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.onCompositeNeedUpdate();
    } else if (this.state.activeTool === 'eyedropper') {
      this.pickColor(x, y);
      this.isDrawing = false;
    } else if (this.state.activeTool === 'floodfill') {
      this.floodFill(Math.floor(x), Math.floor(y));
      this.historyManager.saveState('Balde de Tinta');
      this.onCompositeNeedUpdate();
      this.isDrawing = false;
    } else if (this.state.activeTool === 'text') {
      this.insertText(x, y);
      this.isDrawing = false;
    }
  }

  public onPointerMove(x: number, y: number) {
    if (!this.isDrawing) return;
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    if (this.state.activeTool === 'brush') {
      const ctx = activeLayer.ctx;
      ctx.save();
      ctx.strokeStyle = this.state.primaryColor;
      ctx.lineWidth = this.state.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(this.lastX, this.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();

      this.lastX = x;
      this.lastY = y;
      this.onCompositeNeedUpdate();
    } else if (this.state.activeTool === 'pencil') {
      this.drawPencilLine(activeLayer.ctx, Math.floor(this.lastX), Math.floor(this.lastY), Math.floor(x), Math.floor(y));
      this.lastX = x;
      this.lastY = y;
      this.onCompositeNeedUpdate();
    } else if (this.state.activeTool === 'eraser') {
      const ctx = activeLayer.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = this.state.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(this.lastX, this.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();

      this.lastX = x;
      this.lastY = y;
      this.onCompositeNeedUpdate();
    } else if (this.state.activeTool === 'shapes') {
      // Draw live shape on preview canvas
      this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      this.drawShape(this.previewCtx, this.startX, this.startY, x, y, this.state.selectedShape);
      this.onCompositeNeedUpdate();
    }
  }

  public onPointerUp(x: number, y: number) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    if (this.state.activeTool === 'shapes') {
      // Commit shape to active layer
      this.drawShape(activeLayer.ctx, this.startX, this.startY, x, y, this.state.selectedShape);
      this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      this.historyManager.saveState('Forma: ' + this.state.selectedShape);
      this.onCompositeNeedUpdate();
    } else if (this.state.activeTool === 'brush' || this.state.activeTool === 'pencil' || this.state.activeTool === 'eraser') {
      this.historyManager.saveState('Traço: ' + this.state.activeTool);
    }
  }

  private drawShape(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, shape: ShapeType) {
    ctx.save();
    ctx.strokeStyle = this.state.primaryColor;
    ctx.fillStyle = this.state.primaryColor;
    ctx.lineWidth = this.state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    ctx.beginPath();
    switch (shape) {
      case 'rectangle':
        ctx.strokeRect(rx, ry, rw, rh);
        break;
      case 'filled_rectangle':
        ctx.fillRect(rx, ry, rw, rh);
        break;
      case 'ellipse':
        ctx.ellipse(rx + rw / 2, ry + rh / 2, Math.max(1, rw / 2), Math.max(1, rh / 2), 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'filled_ellipse':
        ctx.ellipse(rx + rw / 2, ry + rh / 2, Math.max(1, rw / 2), Math.max(1, rh / 2), 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'line':
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  private drawPencilPixel(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = this.state.primaryColor;
    const s = Math.max(1, Math.floor(this.state.brushSize));
    ctx.fillRect(x - Math.floor(s / 2), y - Math.floor(s / 2), s, s);
  }

  private drawPencilLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    // Bresenham's line algorithm
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;
    while (true) {
      this.drawPencilPixel(ctx, cx, cy);
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  private pickColor(x: number, y: number) {
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    // Pick from composite
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.layerManager.width;
    tempCanvas.height = this.layerManager.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    this.layerManager.renderComposite(tempCtx);

    const px = tempCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    this.state.primaryColor = hex;
  }

  private floodFill(startX: number, startY: number) {
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const width = this.layerManager.width;
    const height = this.layerManager.height;
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const imgData = activeLayer.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startIndex = (startY * width + startX) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    // Parse fill color
    const fillR = parseInt(this.state.primaryColor.slice(1, 3), 16) || 0;
    const fillG = parseInt(this.state.primaryColor.slice(3, 5), 16) || 0;
    const fillB = parseInt(this.state.primaryColor.slice(5, 7), 16) || 0;
    const fillA = 255;

    // Same color check
    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

    // Tolerance range 0..100 maps to distance threshold
    const tolDistance = (this.state.tolerance / 100) * 441.67; // sqrt(255^2*3)

    const matches = (idx: number) => {
      const dr = data[idx] - targetR;
      const dg = data[idx + 1] - targetG;
      const db = data[idx + 2] - targetB;
      const da = data[idx + 3] - targetA;
      return Math.sqrt(dr * dr + dg * dg + db * db + da * da) <= tolDistance;
    };

    const visited = new Uint8Array(width * height);
    const queue = [startX + startY * width];
    visited[startX + startY * width] = 1;

    while (queue.length > 0) {
      const pos = queue.pop()!;
      const cx = pos % width;
      const cy = Math.floor(pos / width);
      const idx = pos * 4;

      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = fillA;

      // 4-way neighbours
      const neighbors = [
        cx > 0 ? pos - 1 : -1,
        cx < width - 1 ? pos + 1 : -1,
        cy > 0 ? pos - width : -1,
        cy < height - 1 ? pos + width : -1
      ];

      for (const n of neighbors) {
        if (n !== -1 && !visited[n] && matches(n * 4)) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }

    activeLayer.ctx.putImageData(imgData, 0, 0);
  }

  private insertText(x: number, y: number) {
    const text = prompt('Digite o texto a ser inserido:');
    if (!text) return;

    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const ctx = activeLayer.ctx;
    ctx.save();
    ctx.fillStyle = this.state.primaryColor;
    const fontSize = Math.max(16, this.state.brushSize * 2);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillText(text, x, y);
    ctx.restore();

    this.historyManager.saveState('Inserir Texto');
    this.onCompositeNeedUpdate();
  }
}
