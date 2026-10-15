import type { AppState, ShapeType } from '../types';
import { LayerManager } from './LayerManager';
import { HistoryManager } from './HistoryManager';

export class ToolEngine {
  private layerManager: LayerManager;
  private historyManager: HistoryManager;
  public state: AppState;

  private isDrawing: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private startX: number = 0;
  private startY: number = 0;

  public previewCanvas: HTMLCanvasElement;
  public previewCtx: CanvasRenderingContext2D;
  private onCompositeNeedUpdate: () => void;
  private onSelectionChange?: (hasSelection: boolean) => void;

  // Magic Wand & Selection state
  public selectionMask: Uint8Array | null = null;
  public lastWandPoint: { x: number; y: number } | null = null;

  // Move Selection & Pixels state
  public isMovingSelection: boolean = false;
  public moveStartX: number = 0;
  public moveStartY: number = 0;
  public floatingCanvas: HTMLCanvasElement | null = null;
  public floatingCtx: CanvasRenderingContext2D | null = null;
  public floatingBaseX: number = 0;
  public floatingBaseY: number = 0;
  public currentMoveOffsetX: number = 0;
  public currentMoveOffsetY: number = 0;

  constructor(
    layerManager: LayerManager, 
    historyManager: HistoryManager, 
    state: AppState,
    onCompositeNeedUpdate: () => void,
    onSelectionChange?: (hasSelection: boolean) => void
  ) {
    this.layerManager = layerManager;
    this.historyManager = historyManager;
    this.state = state;
    this.onCompositeNeedUpdate = onCompositeNeedUpdate;
    this.onSelectionChange = onSelectionChange;

    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.width = layerManager.width;
    this.previewCanvas.height = layerManager.height;
    this.previewCtx = this.previewCanvas.getContext('2d')!;
  }

  public setTolerance(tolerance: number) {
    this.state.tolerance = tolerance;
    if (this.state.activeTool === 'magicwand' && this.lastWandPoint) {
      this.computeMagicWand(this.lastWandPoint.x, this.lastWandPoint.y, tolerance);
    }
  }

  public onPointerDown(x: number, y: number) {
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer || !activeLayer.visible) return;

    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
    this.startX = x;
    this.startY = y;

    // Se a ferramenta for Mover Seleção
    if (this.state.activeTool === 'moveselection') {
      if (this.state.hasSelection && this.selectionMask) {
        this.startMoveSelection(x, y);
      }
      return;
    }

    // Se estiver em outra ferramenta e havia pixels flutuando de um movimento anterior, fixa-os
    if (this.floatingCanvas) {
      this.commitMove();
    }

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
    } else if (this.state.activeTool === 'magicwand') {
      this.lastWandPoint = { x: Math.floor(x), y: Math.floor(y) };
      this.computeMagicWand(this.lastWandPoint.x, this.lastWandPoint.y, this.state.tolerance);
    } else if (this.state.activeTool === 'text') {
      this.insertText(x, y);
      this.isDrawing = false;
    }
  }

  public onPointerMove(x: number, y: number) {
    if (!this.isDrawing) return;
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    if (this.state.activeTool === 'moveselection') {
      if (this.isMovingSelection) {
        this.updateMoveSelection(x, y);
      }
      return;
    }

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
      this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      this.drawShape(this.previewCtx, this.startX, this.startY, x, y, this.state.selectedShape);
      this.onCompositeNeedUpdate();
    } else if (this.state.activeTool === 'magicwand') {
      const dx = x - this.startX;
      const tolChange = Math.round(dx / 3);
      const newTol = Math.max(0, Math.min(100, this.state.tolerance + tolChange));
      if (this.lastWandPoint) {
        this.computeMagicWand(this.lastWandPoint.x, this.lastWandPoint.y, newTol);
      }
    }
  }

  public onPointerUp(x: number, y: number) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.state.activeTool === 'moveselection') {
      if (this.isMovingSelection) {
        this.finishMoveSelection();
      }
      return;
    }

    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    if (this.state.activeTool === 'shapes') {
      this.drawShape(activeLayer.ctx, this.startX, this.startY, x, y, this.state.selectedShape);
      this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      this.historyManager.saveState('Forma: ' + this.state.selectedShape);
      this.onCompositeNeedUpdate();
    } else if (this.state.activeTool === 'brush' || this.state.activeTool === 'pencil' || this.state.activeTool === 'eraser') {
      this.historyManager.saveState('Traço: ' + this.state.activeTool);
    }
  }

  // --- MOTOR DE MOVER SELEÇÃO & PIXELS ---

  private startMoveSelection(x: number, y: number) {
    this.isMovingSelection = true;
    this.moveStartX = x;
    this.moveStartY = y;

    // Se estiver no modo de mover pixels e ainda não recortou para o buffer flutuante
    if (this.state.moveMode === 'pixels' && !this.floatingCanvas) {
      this.extractSelectionToFloating();
    }
  }

  private extractSelectionToFloating() {
    if (!this.selectionMask || !this.state.hasSelection) return;
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const width = this.layerManager.width;
    const height = this.layerManager.height;
    const activeImgData = activeLayer.ctx.getImageData(0, 0, width, height);
    const activeData = activeImgData.data;

    this.floatingCanvas = document.createElement('canvas');
    this.floatingCanvas.width = width;
    this.floatingCanvas.height = height;
    this.floatingCtx = this.floatingCanvas.getContext('2d')!;

    const floatImgData = this.floatingCtx.createImageData(width, height);
    const floatData = floatImgData.data;
    const mask = this.selectionMask;

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) {
        const idx = i * 4;
        floatData[idx] = activeData[idx];
        floatData[idx + 1] = activeData[idx + 1];
        floatData[idx + 2] = activeData[idx + 2];
        floatData[idx + 3] = activeData[idx + 3];

        // Limpa na camada ativa
        activeData[idx] = 0;
        activeData[idx + 1] = 0;
        activeData[idx + 2] = 0;
        activeData[idx + 3] = 0;
      }
    }

    this.floatingCtx.putImageData(floatImgData, 0, 0);
    activeLayer.ctx.putImageData(activeImgData, 0, 0);

    this.floatingBaseX = 0;
    this.floatingBaseY = 0;
    this.currentMoveOffsetX = 0;
    this.currentMoveOffsetY = 0;
  }

  private updateMoveSelection(x: number, y: number) {
    this.currentMoveOffsetX = Math.round(x - this.moveStartX);
    this.currentMoveOffsetY = Math.round(y - this.moveStartY);
    this.renderMovedPreview();
  }

  private finishMoveSelection() {
    this.floatingBaseX += this.currentMoveOffsetX;
    this.floatingBaseY += this.currentMoveOffsetY;
    this.currentMoveOffsetX = 0;
    this.currentMoveOffsetY = 0;
    this.isMovingSelection = false;
  }

  public commitMove() {
    const totalX = this.floatingBaseX + this.currentMoveOffsetX;
    const totalY = this.floatingBaseY + this.currentMoveOffsetY;

    const activeLayer = this.layerManager.getActiveLayer();
    if (activeLayer) {
      if (this.floatingCanvas) {
        // Estampa os pixels flutuantes na camada ativa
        activeLayer.ctx.save();
        activeLayer.ctx.drawImage(this.floatingCanvas, totalX, totalY);
        activeLayer.ctx.restore();
      }

      // Desloca a máscara de seleção para a nova posição
      if (this.selectionMask && (totalX !== 0 || totalY !== 0)) {
        this.shiftSelectionMask(totalX, totalY);
      }

      this.historyManager.saveState('Mover Seleção');
    }

    this.floatingCanvas = null;
    this.floatingCtx = null;
    this.floatingBaseX = 0;
    this.floatingBaseY = 0;
    this.currentMoveOffsetX = 0;
    this.currentMoveOffsetY = 0;

    this.renderSelectionMask();
    this.onCompositeNeedUpdate();
  }

  private shiftSelectionMask(dx: number, dy: number) {
    if (!this.selectionMask) return;
    const width = this.layerManager.width;
    const height = this.layerManager.height;
    const newMask = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const oldIdx = y * width + x;
        if (this.selectionMask[oldIdx] === 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            newMask[ny * width + nx] = 1;
          }
        }
      }
    }
    this.selectionMask = newMask;
  }

  private renderMovedPreview() {
    const width = this.layerManager.width;
    const height = this.layerManager.height;
    this.previewCtx.clearRect(0, 0, width, height);

    const totalX = this.floatingBaseX + this.currentMoveOffsetX;
    const totalY = this.floatingBaseY + this.currentMoveOffsetY;

    // Se houver pixels flutuando, desenha-os deslocados
    if (this.floatingCanvas) {
      this.previewCtx.drawImage(this.floatingCanvas, totalX, totalY);
    }

    // Desenha o contorno da seleção deslocado
    if (this.selectionMask && this.state.hasSelection) {
      this.renderShiftedSelectionOverlay(totalX, totalY);
    }

    this.onCompositeNeedUpdate();
  }

  private renderShiftedSelectionOverlay(dx: number, dy: number) {
    const width = this.layerManager.width;
    const height = this.layerManager.height;
    const overlay = this.previewCtx.createImageData(width, height);
    const outData = overlay.data;
    const mask = this.selectionMask!;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (mask[i] === 1) {
          const targetX = x + dx;
          const targetY = y + dy;

          if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
            const outIdx = (targetY * width + targetX) * 4;

            const isEdge = 
              x === 0 || x === width - 1 || y === 0 || y === height - 1 ||
              mask[i - 1] === 0 || mask[i + 1] === 0 || 
              mask[i - width] === 0 || mask[i + width] === 0;

            if (isEdge) {
              outData[outIdx] = 0;
              outData[outIdx + 1] = 230;
              outData[outIdx + 2] = 255;
              outData[outIdx + 3] = 255;
            } else {
              outData[outIdx] = 0;
              outData[outIdx + 1] = 162;
              outData[outIdx + 2] = 232;
              outData[outIdx + 3] = 90;
            }
          }
        }
      }
    }

    // Composição sobre o que já foi desenhado
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCanvas.getContext('2d')!.putImageData(overlay, 0, 0);
    this.previewCtx.drawImage(tempCanvas, 0, 0);
  }

  // --- MOTOR DA VARINHA MÁGICA ---

  public computeMagicWand(startX: number, startY: number, tolerance: number) {
    if (this.floatingCanvas) {
      this.commitMove();
    }

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

    const tolDistance = (tolerance / 100) * 441.67;

    const matches = (idx: number) => {
      const dr = data[idx] - targetR;
      const dg = data[idx + 1] - targetG;
      const db = data[idx + 2] - targetB;
      const da = data[idx + 3] - targetA;
      return Math.sqrt(dr * dr + dg * dg + db * db + da * da) <= tolDistance;
    };

    const mask = new Uint8Array(width * height);
    const queue = [startX + startY * width];
    mask[startX + startY * width] = 1;

    let selectedCount = 0;

    while (queue.length > 0) {
      const pos = queue.pop()!;
      selectedCount++;
      const cx = pos % width;
      const cy = Math.floor(pos / width);

      const neighbors = [
        cx > 0 ? pos - 1 : -1,
        cx < width - 1 ? pos + 1 : -1,
        cy > 0 ? pos - width : -1,
        cy < height - 1 ? pos + width : -1
      ];

      for (const n of neighbors) {
        if (n !== -1 && mask[n] === 0 && matches(n * 4)) {
          mask[n] = 1;
          queue.push(n);
        }
      }
    }

    this.selectionMask = mask;
    this.state.hasSelection = selectedCount > 0;

    this.renderSelectionMask();
    this.onCompositeNeedUpdate();

    if (this.onSelectionChange) {
      this.onSelectionChange(this.state.hasSelection);
    }
  }

  public renderSelectionMask() {
    const width = this.layerManager.width;
    const height = this.layerManager.height;
    this.previewCtx.clearRect(0, 0, width, height);

    if (!this.selectionMask || !this.state.hasSelection) return;

    const overlay = this.previewCtx.createImageData(width, height);
    const outData = overlay.data;
    const mask = this.selectionMask;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (mask[i] === 1) {
          const idx = i * 4;

          const isEdge = 
            x === 0 || x === width - 1 || y === 0 || y === height - 1 ||
            mask[i - 1] === 0 || mask[i + 1] === 0 || 
            mask[i - width] === 0 || mask[i + width] === 0;

          if (isEdge) {
            outData[idx] = 0;
            outData[idx + 1] = 230;
            outData[idx + 2] = 255;
            outData[idx + 3] = 255;
          } else {
            outData[idx] = 0;
            outData[idx + 1] = 162;
            outData[idx + 2] = 232;
            outData[idx + 3] = 100;
          }
        }
      }
    }

    this.previewCtx.putImageData(overlay, 0, 0);
  }

  public deleteSelection() {
    if (this.floatingCanvas) {
      // Se havia pixels flutuando, simplesmente descarta
      this.floatingCanvas = null;
      this.floatingCtx = null;
      this.clearSelection();
      this.historyManager.saveState('Deletar Seleção');
      this.onCompositeNeedUpdate();
      return;
    }

    if (!this.selectionMask || !this.state.hasSelection) return;

    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const width = this.layerManager.width;
    const height = this.layerManager.height;
    const imgData = activeLayer.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const mask = this.selectionMask;

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) {
        const idx = i * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0; // Transparente
      }
    }

    activeLayer.ctx.putImageData(imgData, 0, 0);

    this.clearSelection();
    this.historyManager.saveState('Deletar Seleção');
    this.onCompositeNeedUpdate();
  }

  public clearSelection() {
    if (this.floatingCanvas) {
      this.commitMove();
    }

    this.selectionMask = null;
    this.lastWandPoint = null;
    this.state.hasSelection = false;
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.onCompositeNeedUpdate();

    if (this.onSelectionChange) {
      this.onSelectionChange(false);
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

    const fillR = parseInt(this.state.primaryColor.slice(1, 3), 16) || 0;
    const fillG = parseInt(this.state.primaryColor.slice(3, 5), 16) || 0;
    const fillB = parseInt(this.state.primaryColor.slice(5, 7), 16) || 0;
    const fillA = 255;

    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

    const tolDistance = (this.state.tolerance / 100) * 441.67;

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
