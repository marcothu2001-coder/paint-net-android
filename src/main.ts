import './style.css';
import type { AppState } from './types';
import { LayerManager } from './core/LayerManager';
import { HistoryManager } from './core/HistoryManager';
import { ToolEngine } from './core/ToolEngine';
import { TopBar } from './ui/TopBar';
import { ToolBar } from './ui/ToolBar';
import { ColorWheel } from './ui/ColorWheel';
import { LayersPanel } from './ui/LayersPanel';

class PaintApp {
  private state: AppState = {
    width: 800,
    height: 600,
    zoom: 1.0,
    panX: 0,
    panY: 0,
    activeTool: 'brush',
    brushSize: 8,
    tolerance: 30,
    selectedShape: 'rectangle',
    primaryColor: '#0026FF',
    secondaryColor: '#FFFFFF',
    activeLayerId: ''
  };

  private layerManager: LayerManager;
  private historyManager: HistoryManager;
  private toolEngine: ToolEngine;

  private displayCanvas!: HTMLCanvasElement;
  private displayCtx!: CanvasRenderingContext2D;
  private viewportEl!: HTMLElement;
  private canvasContainer!: HTMLElement;

  public topBar!: TopBar;
  public toolBar!: ToolBar;
  public colorWheel!: ColorWheel;
  public layersPanel!: LayersPanel;

  // Touch gesture tracking
  private initialPinchDistance: number = 0;
  private initialZoom: number = 1.0;
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;

  constructor() {
    this.layerManager = new LayerManager(this.state.width, this.state.height);
    this.historyManager = new HistoryManager(this.layerManager);
    this.toolEngine = new ToolEngine(
      this.layerManager, 
      this.historyManager, 
      this.state, 
      () => this.renderComposite()
    );

    this.initLayout();
    this.initEvents();
    this.centerCanvas();
    this.renderComposite();
  }

  private initLayout() {
    const appEl = document.getElementById('app')!;
    appEl.innerHTML = `
      <div class="app-layout">
        <div id="topbarContainer"></div>

        <div class="app-body">
          <div id="canvasViewport" class="canvas-viewport">
            <div id="canvasTransformContainer" class="canvas-container">
              <canvas id="displayCanvas" width="${this.state.width}" height="${this.state.height}"></canvas>
            </div>
          </div>

          <!-- Painéis Flutuantes Estilo Paint.NET -->
          <div id="colorsFloatingPanel" class="floating-panel panel-left visible"></div>
          <div id="layersFloatingPanel" class="floating-panel panel-right visible"></div>
        </div>

        <div id="toolbarContainer"></div>
      </div>
    `;

    this.viewportEl = document.getElementById('canvasViewport')!;
    this.canvasContainer = document.getElementById('canvasTransformContainer')!;
    this.displayCanvas = document.getElementById('displayCanvas') as HTMLCanvasElement;
    this.displayCtx = this.displayCanvas.getContext('2d')!;

    // Instancia Componentes UI
    this.topBar = new TopBar(
      document.getElementById('topbarContainer')!,
      this.layerManager,
      this.historyManager,
      () => this.renderComposite(),
      (panel) => this.togglePanel(panel)
    );

    this.toolBar = new ToolBar(
      document.getElementById('toolbarContainer')!,
      this.state,
      () => {}
    );

    this.colorWheel = new ColorWheel(
      document.getElementById('colorsFloatingPanel')!,
      this.state,
      () => {}
    );

    this.layersPanel = new LayersPanel(
      document.getElementById('layersFloatingPanel')!,
      this.layerManager,
      this.historyManager
    );

    this.historyManager.onChange(() => {
      this.topBar.render();
      this.renderComposite();
    });
  }

  private togglePanel(panel: 'colors' | 'layers') {
    const el = document.getElementById(panel === 'colors' ? 'colorsFloatingPanel' : 'layersFloatingPanel');
    if (el) {
      el.classList.toggle('visible');
    }
  }

  private renderComposite() {
    this.layerManager.renderComposite(this.displayCtx);

    // Overlay shape preview if active
    if (this.toolEngine.previewCanvas) {
      this.displayCtx.drawImage(this.toolEngine.previewCanvas, 0, 0);
    }
  }

  private updateTransform() {
    this.canvasContainer.style.transform = `translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoom})`;
  }

  private centerCanvas() {
    const vw = this.viewportEl.clientWidth;
    const vh = this.viewportEl.clientHeight;
    // Fit canvas comfortably in viewport
    const scaleX = (vw - 80) / this.state.width;
    const scaleY = (vh - 80) / this.state.height;
    this.state.zoom = Math.min(1.0, Math.min(scaleX, scaleY));
    this.state.panX = (vw - this.state.width * this.state.zoom) / 2;
    this.state.panY = (vh - this.state.height * this.state.zoom) / 2;
    this.updateTransform();
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.displayCanvas.getBoundingClientRect();
    const x = (clientX - rect.left) / this.state.zoom;
    const y = (clientY - rect.top) / this.state.zoom;
    return { x, y };
  }

  private initEvents() {
    window.addEventListener('resize', () => this.centerCanvas());

    // Mouse Events
    this.displayCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || this.state.activeTool === 'pan' || e.altKey) {
        this.isPanning = true;
        this.panStartX = e.clientX - this.state.panX;
        this.panStartY = e.clientY - this.state.panY;
        return;
      }
      const coords = this.getCanvasCoords(e.clientX, e.clientY);
      this.toolEngine.onPointerDown(coords.x, coords.y);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.state.panX = e.clientX - this.panStartX;
        this.state.panY = e.clientY - this.panStartY;
        this.updateTransform();
        return;
      }
      const coords = this.getCanvasCoords(e.clientX, e.clientY);
      this.toolEngine.onPointerMove(coords.x, coords.y);
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        return;
      }
      const coords = this.getCanvasCoords(e.clientX, e.clientY);
      this.toolEngine.onPointerUp(coords.x, coords.y);
    });

    // Mouse Wheel Zoom
    this.viewportEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newZoom = Math.max(0.1, Math.min(10, this.state.zoom * zoomFactor));

      const rect = this.viewportEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.state.panX = mouseX - (mouseX - this.state.panX) * (newZoom / this.state.zoom);
      this.state.panY = mouseY - (mouseY - this.state.panY) * (newZoom / this.state.zoom);
      this.state.zoom = newZoom;
      this.updateTransform();
    }, { passive: false });

    // Touch Events (1 finger = draw, 2 fingers = pinch-to-zoom & pan)
    this.displayCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        this.isPanning = true;
        this.initialPinchDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
        this.initialZoom = this.state.zoom;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        this.panStartX = midX - this.state.panX;
        this.panStartY = midY - this.state.panY;
      } else if (e.touches.length === 1 && !this.isPanning) {
        const coords = this.getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        this.toolEngine.onPointerDown(coords.x, coords.y);
      }
    }, { passive: false });

    this.displayCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 2 && this.isPanning) {
        const dist = this.getTouchDistance(e.touches[0], e.touches[1]);
        if (this.initialPinchDistance > 0) {
          const factor = dist / this.initialPinchDistance;
          this.state.zoom = Math.max(0.1, Math.min(10, this.initialZoom * factor));
        }
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        this.state.panX = midX - this.panStartX;
        this.state.panY = midY - this.panStartY;
        this.updateTransform();
      } else if (e.touches.length === 1 && !this.isPanning) {
        const coords = this.getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        this.toolEngine.onPointerMove(coords.x, coords.y);
      }
    }, { passive: false });

    this.displayCanvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.isPanning = false;
        this.initialPinchDistance = 0;
        this.toolEngine.onPointerUp(0, 0);
      }
    });

    // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.historyManager.redo();
        } else {
          this.historyManager.undo();
        }
        this.renderComposite();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.historyManager.redo();
        this.renderComposite();
      }
    });
  }

  private getTouchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
  new PaintApp();
});
