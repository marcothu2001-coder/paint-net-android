import type { HistoryStep } from '../types';
import { LayerManager } from './LayerManager';

export class HistoryManager {
  private undoStack: HistoryStep[] = [];
  private redoStack: HistoryStep[] = [];
  private maxSteps: number = 30;
  private layerManager: LayerManager;
  private onStateChange: (() => void)[] = [];

  constructor(layerManager: LayerManager) {
    this.layerManager = layerManager;
    // Capture initial state
    this.saveState('Início');
  }

  public onChange(cb: () => void) {
    this.onStateChange.push(cb);
  }

  private notify() {
    this.onStateChange.forEach(cb => cb());
  }

  public canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public saveState(actionName: string) {
    const layers = this.layerManager.getLayers();
    const activeLayer = this.layerManager.getActiveLayer();

    const snapshot: HistoryStep = {
      name: actionName,
      activeLayerId: activeLayer ? activeLayer.id : layers[0]?.id || '',
      layers: layers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        blendMode: l.blendMode,
        imageData: l.ctx.getImageData(0, 0, this.layerManager.width, this.layerManager.height)
      }))
    };

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxSteps) {
      this.undoStack.shift();
    }
    // Clear redo on new action
    this.redoStack = [];
    this.notify();
  }

  public undo() {
    if (!this.canUndo()) return;

    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    const previous = this.undoStack[this.undoStack.length - 1];
    this.restore(previous);
    this.notify();
  }

  public redo() {
    if (!this.canRedo()) return;

    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.restore(next);
    this.notify();
  }

  private restore(step: HistoryStep) {
    this.layerManager.restoreSnapshot(step.layers, step.activeLayerId);
  }
}
