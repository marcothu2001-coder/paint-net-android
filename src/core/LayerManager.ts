import type { Layer, BlendMode } from '../types';

export class LayerManager {
  private layers: Layer[] = [];
  private activeLayerId: string = '';
  public width: number;
  public height: number;
  private onChangeCallbacks: (() => void)[] = [];

  constructor(width: number = 800, height: number = 600) {
    this.width = width;
    this.height = height;
    // Create background layer by default
    this.createLayer('Plano de Fundo', true);
  }

  public onChange(callback: () => void) {
    this.onChangeCallbacks.push(callback);
  }

  private notifyChange() {
    this.onChangeCallbacks.forEach(cb => cb());
  }

  public getLayers(): Layer[] {
    return this.layers;
  }

  public getActiveLayer(): Layer | undefined {
    return this.layers.find(l => l.id === this.activeLayerId) || this.layers[0];
  }

  public setActiveLayer(id: string) {
    if (this.layers.some(l => l.id === id)) {
      this.activeLayerId = id;
      this.notifyChange();
    }
  }

  public createLayer(name?: string, fillWhite: boolean = false): Layer {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    if (fillWhite) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    const newLayer: Layer = {
      id: 'layer_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: name || `Camada ${this.layers.length + 1}`,
      canvas,
      ctx,
      visible: true,
      opacity: 1.0,
      blendMode: 'source-over'
    };

    // Add to top of stack
    this.layers.unshift(newLayer);
    this.activeLayerId = newLayer.id;
    this.notifyChange();
    return newLayer;
  }

  public deleteLayer(id: string) {
    if (this.layers.length <= 1) {
      // Cannot delete the only remaining layer
      return;
    }
    const index = this.layers.findIndex(l => l.id === id);
    if (index !== -1) {
      this.layers.splice(index, 1);
      if (this.activeLayerId === id) {
        this.activeLayerId = this.layers[Math.max(0, index - 1)].id;
      }
      this.notifyChange();
    }
  }

  public duplicateLayer(id: string): Layer | null {
    const source = this.layers.find(l => l.id === id);
    if (!source) return null;

    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source.canvas, 0, 0);

    const dupLayer: Layer = {
      id: 'layer_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: `${source.name} (Cópia)`,
      canvas,
      ctx,
      visible: source.visible,
      opacity: source.opacity,
      blendMode: source.blendMode
    };

    const index = this.layers.findIndex(l => l.id === id);
    this.layers.splice(index, 0, dupLayer);
    this.activeLayerId = dupLayer.id;
    this.notifyChange();
    return dupLayer;
  }

  public mergeDown(id: string) {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1 || index >= this.layers.length - 1) {
      // Cannot merge down bottom-most layer
      return;
    }

    const topLayer = this.layers[index];
    const bottomLayer = this.layers[index + 1];

    bottomLayer.ctx.save();
    bottomLayer.ctx.globalAlpha = topLayer.opacity;
    bottomLayer.ctx.globalCompositeOperation = topLayer.blendMode;
    bottomLayer.ctx.drawImage(topLayer.canvas, 0, 0);
    bottomLayer.ctx.restore();

    this.layers.splice(index, 1);
    this.activeLayerId = bottomLayer.id;
    this.notifyChange();
  }

  public moveLayer(id: string, direction: 'up' | 'down') {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = this.layers[index];
      this.layers[index] = this.layers[index - 1];
      this.layers[index - 1] = temp;
      this.notifyChange();
    } else if (direction === 'down' && index < this.layers.length - 1) {
      const temp = this.layers[index];
      this.layers[index] = this.layers[index + 1];
      this.layers[index + 1] = temp;
      this.notifyChange();
    }
  }

  public setLayerVisibility(id: string, visible: boolean) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = visible;
      this.notifyChange();
    }
  }

  public setLayerOpacity(id: string, opacity: number) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
      this.notifyChange();
    }
  }

  public setLayerBlendMode(id: string, blendMode: BlendMode) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.blendMode = blendMode;
      this.notifyChange();
    }
  }

  public renderComposite(targetCtx: CanvasRenderingContext2D) {
    targetCtx.clearRect(0, 0, this.width, this.height);

    // Paint checkerboard background for transparency preview
    this.drawCheckerboard(targetCtx);

    // Render layers from bottom to top
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible || layer.opacity <= 0) continue;

      targetCtx.save();
      targetCtx.globalAlpha = layer.opacity;
      targetCtx.globalCompositeOperation = layer.blendMode;
      targetCtx.drawImage(layer.canvas, 0, 0);
      targetCtx.restore();
    }
  }

  private drawCheckerboard(ctx: CanvasRenderingContext2D) {
    const size = 16;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#E5E7EB';
    for (let y = 0; y < this.height; y += size) {
      for (let x = 0; x < this.width; x += size) {
        if (((x / size) + (y / size)) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  public restoreSnapshot(layersData: {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    blendMode: BlendMode;
    imageData: ImageData;
  }[], activeId: string) {
    this.layers = layersData.map(d => {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.putImageData(d.imageData, 0, 0);

      return {
        id: d.id,
        name: d.name,
        canvas,
        ctx,
        visible: d.visible,
        opacity: d.opacity,
        blendMode: d.blendMode
      };
    });
    this.activeLayerId = activeId;
    this.notifyChange();
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.layers.forEach(l => {
      const oldCanvas = l.canvas;
      const newCanvas = document.createElement('canvas');
      newCanvas.width = width;
      newCanvas.height = height;
      const newCtx = newCanvas.getContext('2d', { willReadFrequently: true })!;
      newCtx.drawImage(oldCanvas, 0, 0);
      l.canvas = newCanvas;
      l.ctx = newCtx;
    });
    this.notifyChange();
  }

  public resetWithImage(img: HTMLImageElement, name: string) {
    this.width = img.width;
    this.height = img.height;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);

    const layer: Layer = {
      id: 'layer_' + Date.now(),
      name: name || 'Imagem',
      canvas,
      ctx,
      visible: true,
      opacity: 1.0,
      blendMode: 'source-over'
    };

    this.layers = [layer];
    this.activeLayerId = layer.id;
    this.notifyChange();
  }

  public resetNewCanvas(width: number, height: number, fillWhite: boolean = false) {
    this.width = width;
    this.height = height;
    this.layers = [];
    this.createLayer(fillWhite ? 'Plano de Fundo' : 'Camada 1', fillWhite);
  }
}
