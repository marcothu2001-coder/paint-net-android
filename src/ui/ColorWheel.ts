import type { AppState } from '../types';

export class ColorWheel {
  private container: HTMLElement;
  private state: AppState;
  private wheelCanvas!: HTMLCanvasElement;
  private wheelCtx!: CanvasRenderingContext2D;
  private valueSlider!: HTMLInputElement;
  private primaryBox!: HTMLElement;
  private secondaryBox!: HTMLElement;
  private currentHSV = { h: 0, s: 1, v: 1 };
  private isSelectingColor: boolean = false;
  private onColorChange: (color: string) => void;

  private classicPalette = [
    '#000000', '#404040', '#FF0000', '#FF6A00', '#FFD800', '#00FF21', '#0094FF', '#0026FF', '#B200FF', '#FF00DC',
    '#FFFFFF', '#808080', '#7F0000', '#7F3300', '#7F6A00', '#007F0E', '#004A7F', '#00137F', '#57007F', '#7F006E'
  ];

  constructor(container: HTMLElement, state: AppState, onColorChange: (color: string) => void) {
    this.container = container;
    this.state = state;
    this.onColorChange = onColorChange;
    this.init();
  }

  private init() {
    this.container.innerHTML = `
      <div class="color-panel">
        <div class="color-header">
          <span class="panel-title">Cores</span>
          <div class="color-boxes">
            <div class="color-box primary-box" id="primaryBox" title="Cor Primária"></div>
            <button class="swap-colors-btn" id="swapColorsBtn" title="Inverter Cores Primária/Secundária">⇄</button>
            <div class="color-box secondary-box" id="secondaryBox" title="Cor Secundária"></div>
          </div>
        </div>

        <div class="wheel-wrapper">
          <canvas id="colorWheelCanvas" width="160" height="160"></canvas>
        </div>

        <div class="slider-row">
          <label>Luz:</label>
          <input type="range" id="valueSlider" min="0" max="100" value="100" />
        </div>

        <div class="swatches-grid" id="swatchesGrid"></div>
      </div>
    `;

    this.wheelCanvas = this.container.querySelector('#colorWheelCanvas') as HTMLCanvasElement;
    this.wheelCtx = this.wheelCanvas.getContext('2d')!;
    this.valueSlider = this.container.querySelector('#valueSlider') as HTMLInputElement;
    this.primaryBox = this.container.querySelector('#primaryBox') as HTMLElement;
    this.secondaryBox = this.container.querySelector('#secondaryBox') as HTMLElement;

    this.renderWheel();
    this.renderSwatches();
    this.updateColorDisplay();
    this.attachEvents();
  }

  private renderWheel() {
    const width = this.wheelCanvas.width;
    const height = this.wheelCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = width / 2 - 2;

    const imgData = this.wheelCtx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;

          const sat = dist / radius;
          const [r, g, b] = this.hsvToRgb(angle / 360, sat, this.currentHSV.v);

          const idx = (y * width + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    }

    this.wheelCtx.putImageData(imgData, 0, 0);
  }

  private renderSwatches() {
    const grid = this.container.querySelector('#swatchesGrid') as HTMLElement;
    grid.innerHTML = '';
    this.classicPalette.forEach(hex => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = hex;
      swatch.addEventListener('click', () => {
        this.state.primaryColor = hex;
        this.updateColorDisplay();
        this.onColorChange(hex);
      });
      grid.appendChild(swatch);
    });
  }

  public updateColorDisplay() {
    this.primaryBox.style.backgroundColor = this.state.primaryColor;
    this.secondaryBox.style.backgroundColor = this.state.secondaryColor;
  }

  private attachEvents() {
    const handlePick = (e: MouseEvent | TouchEvent) => {
      const rect = this.wheelCanvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cx = this.wheelCanvas.width / 2;
      const cy = this.wheelCanvas.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = this.wheelCanvas.width / 2 - 2;

      if (dist <= radius) {
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        this.currentHSV.h = angle / 360;
        this.currentHSV.s = Math.min(1, dist / radius);

        const [r, g, b] = this.hsvToRgb(this.currentHSV.h, this.currentHSV.s, this.currentHSV.v);
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        this.state.primaryColor = hex;
        this.updateColorDisplay();
        this.onColorChange(hex);
      }
    };

    this.wheelCanvas.addEventListener('mousedown', (e) => {
      this.isSelectingColor = true;
      handlePick(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isSelectingColor) handlePick(e);
    });

    window.addEventListener('mouseup', () => {
      this.isSelectingColor = false;
    });

    this.wheelCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isSelectingColor = true;
      handlePick(e);
    });

    this.wheelCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.isSelectingColor) handlePick(e);
    });

    this.wheelCanvas.addEventListener('touchend', () => {
      this.isSelectingColor = false;
    });

    this.valueSlider.addEventListener('input', () => {
      this.currentHSV.v = parseInt(this.valueSlider.value) / 100;
      this.renderWheel();
      const [r, g, b] = this.hsvToRgb(this.currentHSV.h, this.currentHSV.s, this.currentHSV.v);
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
      this.state.primaryColor = hex;
      this.updateColorDisplay();
      this.onColorChange(hex);
    });

    const swapBtn = this.container.querySelector('#swapColorsBtn');
    swapBtn?.addEventListener('click', () => {
      const temp = this.state.primaryColor;
      this.state.primaryColor = this.state.secondaryColor;
      this.state.secondaryColor = temp;
      this.updateColorDisplay();
      this.onColorChange(this.state.primaryColor);
    });
  }

  private hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r = 0, g = 0, b = 0;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
}
