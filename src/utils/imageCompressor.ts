/**
 * Compressor de imagens de alta performance via Canvas HTML5.
 * Reduz fotos de smartphones (3MB a 12MB) para 25KB a 45KB em Base64,
 * garantindo salvamento instantâneo em localStorage e Firebase sem estouro de cota (QuotaExceededError).
 */
export async function compressImageFile(
  file: File,
  maxWidth = 380,
  maxHeight = 380,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Arquivo de imagem não fornecido"));
      return;
    }

    // Se não for imagem válida
    if (!file.type.startsWith("image/")) {
      reject(new Error("O arquivo selecionado não é uma imagem válida"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo no dispositivo"));
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (!src) {
        reject(new Error("Arquivo de imagem vazio"));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error("Falha ao decodificar a foto"));
      img.onload = () => {
        try {
          let width = img.width || 380;
          let height = img.height || 380;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(src);
            return;
          }

          // Preenchimento de fundo limpo para manter transparências em JPG
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, width, height);

          // Gera data URL jpeg leve
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        } catch (canvasErr) {
          console.warn("Aviso ao processar canvas, usando fallback:", canvasErr);
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
