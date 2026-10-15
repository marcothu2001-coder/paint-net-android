export type ToolType = 
  | 'brush' 
  | 'pencil' 
  | 'eraser' 
  | 'floodfill' 
  | 'shapes' 
  | 'eyedropper' 
  | 'text' 
  | 'pan';

export type ShapeType = 
  | 'rectangle' 
  | 'filled_rectangle' 
  | 'ellipse' 
  | 'filled_ellipse' 
  | 'line';

export type BlendMode = 
  | 'source-over' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten' 
  | 'difference';

export interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  visible: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
}

export interface HistoryStep {
  name: string;
  layers: {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    blendMode: BlendMode;
    imageData: ImageData;
  }[];
  activeLayerId: string;
}

export interface AppState {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  activeTool: ToolType;
  brushSize: number;
  tolerance: number; // 0 to 100
  selectedShape: ShapeType;
  primaryColor: string; // #RRGGBBAA or #RRGGBB
  secondaryColor: string;
  activeLayerId: string;
}
