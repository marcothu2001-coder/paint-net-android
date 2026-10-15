import { LayerManager } from '../core/LayerManager';
import { HistoryManager } from '../core/HistoryManager';
import { EffectsEngine } from '../core/EffectsEngine';

export class TopBar {
  private container: HTMLElement;
  private layerManager: LayerManager;
  private historyManager: HistoryManager;
  private onRenderNeeded: () => void;
  private onTogglePanel: (panel: 'colors' | 'layers') => void;

  constructor(
    container: HTMLElement, 
    layerManager: LayerManager, 
    historyManager: HistoryManager,
    onRenderNeeded: () => void,
    onTogglePanel: (panel: 'colors' | 'layers') => void
  ) {
    this.container = container;
    this.layerManager = layerManager;
    this.historyManager = historyManager;
    this.onRenderNeeded = onRenderNeeded;
    this.onTogglePanel = onTogglePanel;

    this.render();
  }

  public render() {
    this.container.innerHTML = `
      <header class="app-topbar">
        <div class="topbar-left">
          <div class="app-brand">
            <span class="app-logo">🎨</span>
            <span class="app-title">Paint.NET Mobile</span>
          </div>

          <div class="topbar-btn-group">
            <button class="topbar-btn" id="newCanvasBtn" title="Novo Canvas">📄 Novo</button>
            <label class="topbar-btn" for="openFileInput" title="Abrir Imagem">📂 Abrir</label>
            <input type="file" id="openFileInput" accept="image/*" style="display:none;" />
            <button class="topbar-btn" id="saveImageBtn" title="Salvar Imagem">💾 Salvar</button>
          </div>
        </div>

        <div class="topbar-center">
          <button class="topbar-btn icon-btn" id="undoBtn" title="Desfazer (Ctrl+Z)" ${!this.historyManager.canUndo() ? 'disabled' : ''}>↩️</button>
          <button class="topbar-btn icon-btn" id="redoBtn" title="Refazer (Ctrl+Y)" ${!this.historyManager.canRedo() ? 'disabled' : ''}>↪️</button>
          <button class="topbar-btn" id="effectsMenuBtn" title="Filtros e Ajustes">✨ Efeitos</button>
        </div>

        <div class="topbar-right">
          <button class="topbar-btn toggle-panel-btn" id="toggleColorsBtn" title="Alternar Painel de Cores">🎨 Cores</button>
          <button class="topbar-btn toggle-panel-btn" id="toggleLayersBtn" title="Alternar Painel de Camadas">📚 Camadas</button>
        </div>
      </header>

      <!-- Modal de Efeitos e Ajustes -->
      <div class="modal-backdrop" id="effectsModal" style="display:none;">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Filtros e Ajustes (Paint.NET)</h3>
            <button class="modal-close-btn" id="closeEffectsModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="effect-card">
              <h4>Brilho e Contraste</h4>
              <div class="slider-group">
                <label>Brilho: <span id="brightVal">0</span></label>
                <input type="range" id="brightSlider" min="-100" max="100" value="0" />
              </div>
              <div class="slider-group">
                <label>Contraste: <span id="contrastVal">0</span></label>
                <input type="range" id="contrastSlider" min="-100" max="100" value="0" />
              </div>
              <button class="action-btn" id="applyBrightContrastBtn">Aplicar</button>
            </div>

            <div class="effect-card">
              <h4>Matiz / Saturação (HSL)</h4>
              <div class="slider-group">
                <label>Matiz: <span id="hueVal">0</span>°</label>
                <input type="range" id="hueSlider" min="-180" max="180" value="0" />
              </div>
              <div class="slider-group">
                <label>Saturação: <span id="satVal">0</span></label>
                <input type="range" id="satSlider" min="-100" max="100" value="0" />
              </div>
              <button class="action-btn" id="applyHueSatBtn">Aplicar</button>
            </div>

            <div class="effect-card">
              <h4>Desfoque & Mosaico</h4>
              <div class="slider-group">
                <label>Raio de Desfoque: <span id="blurVal">4</span>px</label>
                <input type="range" id="blurSlider" min="1" max="30" value="4" />
                <button class="action-btn" id="applyBlurBtn">Aplicar Desfoque</button>
              </div>
              <div class="slider-group" style="margin-top:10px;">
                <label>Tamanho do Bloco (Pixelate): <span id="pixelVal">8</span>px</label>
                <input type="range" id="pixelSlider" min="2" max="40" value="8" />
                <button class="action-btn" id="applyPixelBtn">Aplicar Pixelate</button>
              </div>
            </div>

            <div class="effect-quick-actions">
              <button class="action-btn" id="applyInvertBtn">Inverter Cores</button>
              <button class="action-btn" id="applyGrayscaleBtn">Preto e Branco</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents() {
    // Undo / Redo
    this.container.querySelector('#undoBtn')?.addEventListener('click', () => {
      this.historyManager.undo();
      this.onRenderNeeded();
      this.render();
    });

    this.container.querySelector('#redoBtn')?.addEventListener('click', () => {
      this.historyManager.redo();
      this.onRenderNeeded();
      this.render();
    });

    // Toggle panels
    this.container.querySelector('#toggleColorsBtn')?.addEventListener('click', () => {
      this.onTogglePanel('colors');
    });

    this.container.querySelector('#toggleLayersBtn')?.addEventListener('click', () => {
      this.onTogglePanel('layers');
    });

    // Save image
    this.container.querySelector('#saveImageBtn')?.addEventListener('click', () => {
      this.saveCompositeImage();
    });

    // Open file
    const fileInput = this.container.querySelector('#openFileInput') as HTMLInputElement;
    fileInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const img = new Image();
          img.onload = () => {
            const newLayer = this.layerManager.createLayer(file.name);
            newLayer.ctx.drawImage(img, 0, 0, this.layerManager.width, this.layerManager.height);
            this.historyManager.saveState('Carregar Imagem');
            this.onRenderNeeded();
          };
          img.src = loadEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    });

    // New Canvas
    this.container.querySelector('#newCanvasBtn')?.addEventListener('click', () => {
      if (confirm('Criar nova imagem? As alterações não salvas serão perdidas.')) {
        window.location.reload();
      }
    });

    // Effects Modal
    const modal = this.container.querySelector('#effectsModal') as HTMLElement;
    this.container.querySelector('#effectsMenuBtn')?.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
    this.container.querySelector('#closeEffectsModal')?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Sliders feedback
    this.setupSliderWatcher('brightSlider', 'brightVal');
    this.setupSliderWatcher('contrastSlider', 'contrastVal');
    this.setupSliderWatcher('hueSlider', 'hueVal');
    this.setupSliderWatcher('satSlider', 'satVal');
    this.setupSliderWatcher('blurSlider', 'blurVal');
    this.setupSliderWatcher('pixelSlider', 'pixelVal');

    // Apply Effects
    this.container.querySelector('#applyBrightContrastBtn')?.addEventListener('click', () => {
      const active = this.layerManager.getActiveLayer();
      if (!active) return;
      const b = parseInt((this.container.querySelector('#brightSlider') as HTMLInputElement).value);
      const c = parseInt((this.container.querySelector('#contrastSlider') as HTMLInputElement).value);
      EffectsEngine.applyBrightnessContrast(active, b, c);
      this.historyManager.saveState('Brilho/Contraste');
      this.onRenderNeeded();
      modal.style.display = 'none';
    });

    this.container.querySelector('#applyHueSatBtn')?.addEventListener('click', () => {
      const active = this.layerManager.getActiveLayer();
      if (!active) return;
      const h = parseInt((this.container.querySelector('#hueSlider') as HTMLInputElement).value);
      const s = parseInt((this.container.querySelector('#satSlider') as HTMLInputElement).value);
      EffectsEngine.applyHueSaturation(active, h, s, 0);
      this.historyManager.saveState('Matiz/Saturação');
      this.onRenderNeeded();
      modal.style.display = 'none';
    });

    this.container.querySelector('#applyBlurBtn')?.addEventListener('click', () => {
      const active = this.layerManager.getActiveLayer();
      if (!active) return;
      const r = parseInt((this.container.querySelector('#blurSlider') as HTMLInputElement).value);
      EffectsEngine.applyBlur(active, r);
      this.historyManager.saveState('Desfoque');
      this.onRenderNeeded();
      modal.style.display = 'none';
    });

    this.container.querySelector('#applyPixelBtn')?.addEventListener('click', () => {
      const active = this.layerManager.getActiveLayer();
      if (!active) return;
      const b = parseInt((this.container.querySelector('#pixelSlider') as HTMLInputElement).value);
      EffectsEngine.applyPixelate(active, b);
      this.historyManager.saveState('Pixelate');
      this.onRenderNeeded();
      modal.style.display = 'none';
    });

    this.container.querySelector('#applyInvertBtn')?.addEventListener('click', () => {
      const active = this.layerManager.getActiveLayer();
      if (!active) return;
      EffectsEngine.applyInvert(active);
      this.historyManager.saveState('Inverter Cores');
      this.onRenderNeeded();
      modal.style.display = 'none';
    });

    this.container.querySelector('#applyGrayscaleBtn')?.addEventListener('click', () => {
      const active = this.layerManager.getActiveLayer();
      if (!active) return;
      EffectsEngine.applyGrayscale(active);
      this.historyManager.saveState('Preto e Branco');
      this.onRenderNeeded();
      modal.style.display = 'none';
    });
  }

  private setupSliderWatcher(sliderId: string, valId: string) {
    const slider = this.container.querySelector('#' + sliderId) as HTMLInputElement;
    const val = this.container.querySelector('#' + valId);
    slider?.addEventListener('input', () => {
      if (val) val.textContent = slider.value;
    });
  }

  private saveCompositeImage() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.layerManager.width;
    tempCanvas.height = this.layerManager.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Export without checkerboard
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    const layers = this.layerManager.getLayers();
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible || layer.opacity <= 0) continue;
      tempCtx.save();
      tempCtx.globalAlpha = layer.opacity;
      tempCtx.globalCompositeOperation = layer.blendMode;
      tempCtx.drawImage(layer.canvas, 0, 0);
      tempCtx.restore();
    }

    const dataUrl = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `paintdotnet_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }
}
