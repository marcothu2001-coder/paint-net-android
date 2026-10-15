import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function saveCanvasToPNG(canvas: HTMLCanvasElement, suggestedName?: string): Promise<boolean> {
  const fileName = suggestedName || `paintdotnet_${Date.now()}.png`;

  try {
    // 1. Android / iOS Native Platform via Capacitor
    if (Capacitor.isNativePlatform()) {
      const dataUrl = canvas.toDataURL('image/png');
      // Remove prefix "data:image/png;base64,"
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

      // Write file to Cache or Documents directory
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      // Open Android native share sheet allowing user to save to Gallery, Google Drive, WhatsApp, Files, etc.
      await Share.share({
        title: 'Salvar Imagem PNG',
        text: 'Imagem exportada do Paint.NET Mobile',
        url: savedFile.uri,
        dialogTitle: 'Salvar na Galeria ou Compartilhar'
      });

      return true;
    }

    // 2. Web Browser Fallback (Blob + ObjectURL + Navigator Share)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      throw new Error('Falha ao gerar Blob da imagem PNG');
    }

    // Check if Web Share API with files is supported
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Paint.NET Mobile',
            text: 'Imagem exportada com fundo transparente'
          });
          return true;
        } catch (shareErr) {
          // If user cancelled share sheet, that's fine; otherwise fallback to download
          console.log('Share cancelado ou não suportado, usando download direto:', shareErr);
        }
      }
    }

    // Standard download anchor
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    return true;
  } catch (error) {
    console.error('Erro ao salvar imagem:', error);
    alert('Erro ao salvar imagem: ' + (error instanceof Error ? error.message : String(error)));
    return false;
  }
}
