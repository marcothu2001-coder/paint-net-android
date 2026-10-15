import type { AppState, ToolType, ShapeType } from '../types';

export class ToolBar {
  private container: HTMLElement;
  private state: AppState;
  private onToolChange: (tool: ToolType) => void;
  private onToleranceChange: (tolerance: number) => void;
  private onDeleteSelection: () => void;
  private onClearSelection: () => void;
  private onCommitMove: () => void;

  private tools: { id: ToolType; label: string; icon: string }[] = [
    { id: 'brush', label: 'Pincel', icon: '🖌️' },
    { id: 'pencil', label: 'Lápis', icon: '✏️' },
    { id: 'eraser', label: 'Borracha', icon: '🧼' },
    { id: 'magicwand', label: 'Varinha', icon: '🪄' },
    { id: 'moveselection', label: 'Mover', icon: '✥' },
    { id: 'floodfill', label: 'Balde', icon: '🪣' },
    { id: 'shapes', label: 'Formas', icon: '🔷' },
    { id: 'eyedropper', label: 'Conta-gotas', icon: '💧' },
    { id: 'text', label: 'Texto', icon: '🔤' }
  ];

  constructor(
    container: HTMLElement, 
    state: AppState, 
    onToolChange: (tool: ToolType) => void,
    onToleranceChange: (tolerance: number) => void,
    onDeleteSelection: () => void,
    onClearSelection: () => void,
    onCommitMove: () => void
  ) {
    this.container = container;
    this.state = state;
    this.onToolChange = onToolChange;
    this.onToleranceChange = onToleranceChange;
    this.onDeleteSelection = onDeleteSelection;
    this.onClearSelection = onClearSelection;
    this.onCommitMove = onCommitMove;
    this.render();
  }

  public render() {
    this.container.innerHTML = `
      <div class="toolbar-wrapper">
        <div class="tools-list">
          ${this.tools.map(tool => `
            <button class="tool-btn ${this.state.activeTool === tool.id ? 'active' : ''}" 
                    data-tool="${tool.id}" 
                    title="${tool.label}">
              <span class="tool-icon">${tool.icon}</span>
              <span class="tool-label">${tool.label}</span>
            </button>
          `).join('')}
        </div>

        <div class="tool-options-bar" id="toolOptionsBar">
          ${this.state.activeTool !== 'magicwand' && this.state.activeTool !== 'moveselection' && this.state.activeTool !== 'eyedropper' ? `
            <div class="option-item">
              <label>Tamanho:</label>
              <input type="range" id="brushSizeSlider" min="1" max="100" value="${this.state.brushSize}" />
              <span id="brushSizeVal">${this.state.brushSize}px</span>
            </div>
          ` : ''}

          ${this.state.activeTool === 'moveselection' ? `
            <div class="option-item">
              <label>Modo de Mover:</label>
              <select id="moveModeSelect">
                <option value="pixels" ${this.state.moveMode === 'pixels' ? 'selected' : ''}>Mover Pixels (Conteúdo)</option>
                <option value="selection" ${this.state.moveMode === 'selection' ? 'selected' : ''}>Mover Apenas Contorno</option>
              </select>
            </div>
            <button class="action-btn" id="commitMoveBtn" title="Fixar pixels na camada">
              📌 Fixar
            </button>
          ` : ''}

          ${this.state.activeTool === 'shapes' ? `
            <div class="option-item">
              <label>Forma:</label>
              <select id="shapeSelect">
                <option value="rectangle" ${this.state.selectedShape === 'rectangle' ? 'selected' : ''}>Retângulo (Linha)</option>
                <option value="filled_rectangle" ${this.state.selectedShape === 'filled_rectangle' ? 'selected' : ''}>Retângulo (Cheio)</option>
                <option value="ellipse" ${this.state.selectedShape === 'ellipse' ? 'selected' : ''}>Elipse (Linha)</option>
                <option value="filled_ellipse" ${this.state.selectedShape === 'filled_ellipse' ? 'selected' : ''}>Elipse (Cheia)</option>
                <option value="line" ${this.state.selectedShape === 'line' ? 'selected' : ''}>Linha Reta</option>
              </select>
            </div>
          ` : ''}

          ${this.state.activeTool === 'floodfill' || this.state.activeTool === 'magicwand' ? `
            <div class="option-item tolerance-item">
              <label>Tolerância (Tempo Real):</label>
              <input type="range" id="toleranceSlider" min="0" max="100" value="${this.state.tolerance}" />
              <span id="toleranceVal" class="badge-val">${this.state.tolerance}%</span>
            </div>
          ` : ''}

          ${this.state.hasSelection ? `
            <div class="selection-actions">
              ${this.state.activeTool !== 'moveselection' ? `
                <button class="action-btn" id="quickMoveBtn" title="Ativar ferramenta Mover">
                  ✥ Mover
                </button>
              ` : ''}
              <button class="action-btn danger-btn" id="deleteSelectionBtn" title="Deletar pixels da seleção (Delete)">
                🗑️ Deletar
              </button>
              <button class="action-btn secondary-btn" id="clearSelectionBtn" title="Desmarcar seleção">
                ✕ Desmarcar
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents() {
    this.container.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = (e.currentTarget as HTMLElement).getAttribute('data-tool') as ToolType;
        if (tool) {
          this.state.activeTool = tool;
          this.render();
          this.onToolChange(tool);
        }
      });
    });

    const brushSizeSlider = this.container.querySelector('#brushSizeSlider') as HTMLInputElement;
    const brushSizeVal = this.container.querySelector('#brushSizeVal');
    brushSizeSlider?.addEventListener('input', () => {
      const s = parseInt(brushSizeSlider.value);
      this.state.brushSize = s;
      if (brushSizeVal) brushSizeVal.textContent = s + 'px';
    });

    const shapeSelect = this.container.querySelector('#shapeSelect') as HTMLSelectElement;
    shapeSelect?.addEventListener('change', () => {
      this.state.selectedShape = shapeSelect.value as ShapeType;
    });

    const moveModeSelect = this.container.querySelector('#moveModeSelect') as HTMLSelectElement;
    moveModeSelect?.addEventListener('change', () => {
      this.state.moveMode = moveModeSelect.value as 'pixels' | 'selection';
    });

    const commitMoveBtn = this.container.querySelector('#commitMoveBtn');
    commitMoveBtn?.addEventListener('click', () => {
      this.onCommitMove();
    });

    const quickMoveBtn = this.container.querySelector('#quickMoveBtn');
    quickMoveBtn?.addEventListener('click', () => {
      this.state.activeTool = 'moveselection';
      this.render();
      this.onToolChange('moveselection');
    });

    const tolSlider = this.container.querySelector('#toleranceSlider') as HTMLInputElement;
    const tolVal = this.container.querySelector('#toleranceVal');
    tolSlider?.addEventListener('input', () => {
      const t = parseInt(tolSlider.value);
      this.state.tolerance = t;
      if (tolVal) tolVal.textContent = t + '%';
      this.onToleranceChange(t);
    });

    this.container.querySelector('#deleteSelectionBtn')?.addEventListener('click', () => {
      this.onDeleteSelection();
    });

    this.container.querySelector('#clearSelectionBtn')?.addEventListener('click', () => {
      this.onClearSelection();
    });
  }
}
