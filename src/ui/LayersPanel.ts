import { LayerManager } from '../core/LayerManager';
import { HistoryManager } from '../core/HistoryManager';
import type { BlendMode } from '../types';

export class LayersPanel {
  private container: HTMLElement;
  private layerManager: LayerManager;
  private historyManager: HistoryManager;

  constructor(container: HTMLElement, layerManager: LayerManager, historyManager: HistoryManager) {
    this.container = container;
    this.layerManager = layerManager;
    this.historyManager = historyManager;

    this.layerManager.onChange(() => this.render());
    this.render();
  }

  public render() {
    const layers = this.layerManager.getLayers();
    const activeLayer = this.layerManager.getActiveLayer();

    this.container.innerHTML = `
      <div class="layers-panel">
        <div class="layers-header">
          <span class="panel-title">Camadas</span>
          <div class="layers-actions">
            <button class="layer-btn" id="addLayerBtn" title="Nova Camada">➕</button>
            <button class="layer-btn" id="dupLayerBtn" title="Duplicar Camada">📋</button>
            <button class="layer-btn" id="mergeDownBtn" title="Mesclar para Baixo">⬇️</button>
            <button class="layer-btn" id="delLayerBtn" title="Excluir Camada">🗑️</button>
          </div>
        </div>

        <div class="layers-list" id="layersList">
          ${layers.map(layer => `
            <div class="layer-item ${layer.id === activeLayer?.id ? 'active' : ''}" data-id="${layer.id}">
              <input type="checkbox" class="layer-vis-check" ${layer.visible ? 'checked' : ''} data-id="${layer.id}" title="Visibilidade" />
              <div class="layer-info" data-id="${layer.id}">
                <span class="layer-name">${layer.name}</span>
                <span class="layer-meta">${Math.round(layer.opacity * 100)}% | ${layer.blendMode}</span>
              </div>
              <div class="layer-reorder">
                <button class="layer-order-btn" data-dir="up" data-id="${layer.id}">▲</button>
                <button class="layer-order-btn" data-dir="down" data-id="${layer.id}">▼</button>
              </div>
            </div>
          `).join('')}
        </div>

        ${activeLayer ? `
          <div class="active-layer-settings">
            <div class="setting-row">
              <label>Opacidade:</label>
              <input type="range" id="layerOpacitySlider" min="0" max="100" value="${Math.round(activeLayer.opacity * 100)}" />
              <span id="opacityVal">${Math.round(activeLayer.opacity * 100)}%</span>
            </div>
            <div class="setting-row">
              <label>Mesclagem:</label>
              <select id="layerBlendSelect">
                ${['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference'].map(m => `
                  <option value="${m}" ${activeLayer.blendMode === m ? 'selected' : ''}>${m}</option>
                `).join('')}
              </select>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents() {
    this.container.querySelector('#addLayerBtn')?.addEventListener('click', () => {
      this.layerManager.createLayer();
      this.historyManager.saveState('Nova Camada');
    });

    this.container.querySelector('#dupLayerBtn')?.addEventListener('click', () => {
      const active = this.layerManager.getActiveLayer();
      if (active) {
        this.layerManager.duplicateLayer(active.id);
        this.historyManager.saveState('Duplicar Camada');
      }
    });

    this.container.querySelector('#mergeDownBtn')?.addEventListener('click', () => {
      const active = this.layerManager.getActiveLayer();
      if (active) {
        this.layerManager.mergeDown(active.id);
        this.historyManager.saveState('Mesclar Camada');
      }
    });

    this.container.querySelector('#delLayerBtn')?.addEventListener('click', () => {
      const active = this.layerManager.getActiveLayer();
      if (active) {
        this.layerManager.deleteLayer(active.id);
        this.historyManager.saveState('Excluir Camada');
      }
    });

    // Select Layer
    this.container.querySelectorAll('.layer-info').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.layerManager.setActiveLayer(id);
      });
    });

    // Toggle Visibility
    this.container.querySelectorAll('.layer-vis-check').forEach(el => {
      el.addEventListener('change', (e) => {
        const input = e.target as HTMLInputElement;
        const id = input.getAttribute('data-id');
        if (id) {
          this.layerManager.setLayerVisibility(id, input.checked);
          this.historyManager.saveState('Alternar Visibilidade');
        }
      });
    });

    // Reorder
    this.container.querySelectorAll('.layer-order-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        const btn = e.currentTarget as HTMLElement;
        const id = btn.getAttribute('data-id')!;
        const dir = btn.getAttribute('data-dir') as 'up' | 'down';
        this.layerManager.moveLayer(id, dir);
        this.historyManager.saveState('Reordenar Camadas');
      });
    });

    // Opacity Slider
    const opacitySlider = this.container.querySelector('#layerOpacitySlider') as HTMLInputElement;
    const opacityVal = this.container.querySelector('#opacityVal');
    opacitySlider?.addEventListener('input', () => {
      const val = parseInt(opacitySlider.value);
      if (opacityVal) opacityVal.textContent = val + '%';
      const active = this.layerManager.getActiveLayer();
      if (active) {
        this.layerManager.setLayerOpacity(active.id, val / 100);
      }
    });
    opacitySlider?.addEventListener('change', () => {
      this.historyManager.saveState('Ajustar Opacidade');
    });

    // Blend Select
    const blendSelect = this.container.querySelector('#layerBlendSelect') as HTMLSelectElement;
    blendSelect?.addEventListener('change', () => {
      const active = this.layerManager.getActiveLayer();
      if (active) {
        this.layerManager.setLayerBlendMode(active.id, blendSelect.value as BlendMode);
        this.historyManager.saveState('Alterar Mesclagem');
      }
    });
  }
}
