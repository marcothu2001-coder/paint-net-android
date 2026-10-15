import type { Layer } from '../types';

export class EffectsEngine {
  /**
   * Ajusta Brilho e Contraste
   * brightness: -100 a 100
   * contrast: -100 a 100
   */
  public static applyBrightnessContrast(layer: Layer, brightness: number, contrast: number) {
    const width = layer.canvas.width;
    const height = layer.canvas.height;
    const imgData = layer.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const b = (brightness / 100) * 255;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue; // Skip fully transparent pixels

      let r = factor * (data[i] - 128) + 128 + b;
      let g = factor * (data[i + 1] - 128) + 128 + b;
      let bVal = factor * (data[i + 2] - 128) + 128 + b;

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, bVal));
    }

    layer.ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Inverter Cores
   */
  public static applyInvert(layer: Layer) {
    const width = layer.canvas.width;
    const height = layer.canvas.height;
    const imgData = layer.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }

    layer.ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Tons de Cinza / Preto e Branco
   */
  public static applyGrayscale(layer: Layer) {
    const width = layer.canvas.width;
    const height = layer.canvas.height;
    const imgData = layer.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    layer.ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Ajuste de Matiz, Saturação e Luminosidade
   * hueDelta: -180 a 180 graus
   * satDelta: -100 a 100
   * valDelta: -100 a 100
   */
  public static applyHueSaturation(layer: Layer, hueDelta: number, satDelta: number, valDelta: number) {
    const width = layer.canvas.width;
    const height = layer.canvas.height;
    const imgData = layer.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;

      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      let v = max;
      const d = max - min;
      s = max === 0 ? 0 : d / max;

      if (max !== min) {
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      // Apply deltas
      h = (h * 360 + hueDelta + 360) % 360 / 360;
      s = Math.max(0, Math.min(1, s + satDelta / 100));
      v = Math.max(0, Math.min(1, v + valDelta / 100));

      // HSV to RGB
      const iVal = Math.floor(h * 6);
      const f = h * 6 - iVal;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);

      let nr = 0, ng = 0, nb = 0;
      switch (iVal % 6) {
        case 0: nr = v; ng = t; nb = p; break;
        case 1: nr = q; ng = v; nb = p; break;
        case 2: nr = p; ng = v; nb = t; break;
        case 3: nr = p; ng = q; nb = v; break;
        case 4: nr = t; ng = p; nb = v; break;
        case 5: nr = v; ng = p; nb = q; break;
      }

      data[i] = Math.round(nr * 255);
      data[i + 1] = Math.round(ng * 255);
      data[i + 2] = Math.round(nb * 255);
    }

    layer.ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Efeito Pixelate (Mosaico)
   * blockSize: tamanho do bloco (ex: 4 a 32)
   */
  public static applyPixelate(layer: Layer, blockSize: number = 8) {
    const width = layer.canvas.width;
    const height = layer.canvas.height;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;

    const scaledW = Math.max(1, Math.floor(width / blockSize));
    const scaledH = Math.max(1, Math.floor(height / blockSize));

    tempCanvas.width = scaledW;
    tempCanvas.height = scaledH;

    tempCtx.drawImage(layer.canvas, 0, 0, scaledW, scaledH);
    layer.ctx.imageSmoothingEnabled = false;
    layer.ctx.clearRect(0, 0, width, height);
    layer.ctx.drawImage(tempCanvas, 0, 0, width, height);
    layer.ctx.imageSmoothingEnabled = true;
  }

  /**
   * Desfoque Gaussiano / Rápido
   */
  public static applyBlur(layer: Layer, radius: number = 4) {
    if (radius <= 0) return;
    const width = layer.canvas.width;
    const height = layer.canvas.height;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCtx.filter = `blur(${radius}px)`;
    tempCtx.drawImage(layer.canvas, 0, 0);

    layer.ctx.clearRect(0, 0, width, height);
    layer.ctx.drawImage(tempCanvas, 0, 0);
  }
}
