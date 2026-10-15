import type { AppState, ToolType, ShapeType } from '../types';

export class ToolBar {
  private container: HTMLElement;
  private state: AppState;
  private onToolChange: (tool: ToolType) => void;

  private tools: { id: ToolType; label: string; icon: string }[] = [
    { id: 'brush', label: 'Pincel', icon: '🖌️' },
    { id: 'pencil', label: 'Lápis', icon: '✏️' },
    { id: 'eraser', label: 'Borracha', icon: '🧼' },
    { id: 'floodfill', label: 'Balde', icon: '🪣' },
    { id: 'shapes', label: 'Formas', icon: '🔷' },
    { id: 'eyedropper', label: 'Conta-gotas', icon: '💧' },
    { id: 'text', label: 'Texto', icon: '🔤' }
  ];

  constructor(container: HTMLElement, state: AppState, onToolChange: (tool: ToolType) => void) {
    this.container = container;
    this.state = state;
    this.onToolChange = onToolChange;
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
          <div class="option-item">
            <label>Tamanho:</label>
            <input type="range" id="brushSizeSlider" min="1" max="100" value="${this.state.brushSize}" />
            <span id="brushSizeVal">${this.state.brushSize}px</span>
          </div>

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

          ${this.state.activeTool === 'floodfill' ? `
            <div class="option-item">
              <label>Tolerância:</label>
              <input type="range" id="toleranceSlider" min="0" max="100" value="${this.state.tolerance}" />
              <span id="toleranceVal">${this.state.tolerance}%</span>
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

    const tolSlider = this.container.querySelector('#toleranceSlider') as HTMLInputElement;
    const tolVal = this.container.querySelector('#toleranceVal');
    tolSlider?.addEventListener('input', () => {
      const t = parseInt(tolSlider.value);
      this.state.tolerance = t;
      if (tolVal) tolVal.textContent = t + '%';
    });
  }
}
