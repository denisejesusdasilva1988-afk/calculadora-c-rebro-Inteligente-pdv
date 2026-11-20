// Utilitários Reais de Câmera & Leitura de Código de Barras para Garrafas Transparentes / Câmeras Simples
// 1. Histogram Contrast Stretch (2º-98º percentil) + Inversão para códigos brancos/transparentes em vidro
// 2. Controle real de Hardware da Câmera via MediaTrackCapabilities (Lanterna/Torch, Zoom, Refoco)
// 3. Leitor Duplo com BarcodeDetector nativo + Pré-processamento de Contraste + Leitura por Foto

export interface CameraTrackStatus {
  hasTorch: boolean;
  torchOn: boolean;
  hasZoom: boolean;
  minZoom: number;
  maxZoom: number;
  currentZoom: number;
  canRefocus: boolean;
  hasNativeBarcodeDetector: boolean;
}

export function isNativeBarcodeDetectorSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export function getActiveVideoTrackFromViewport(viewportId: string): MediaStreamTrack | null {
  try {
    if (typeof document === "undefined") return null;
    const container = document.getElementById(viewportId);
    if (!container) return null;
    const video = container.querySelector("video") as HTMLVideoElement | null;
    const stream = video?.srcObject as MediaStream | null;
    const tracks = stream?.getVideoTracks?.();
    return tracks && tracks.length > 0 ? tracks[0] : null;
  } catch {
    return null;
  }
}

export function getActiveVideoElementFromViewport(viewportId: string): HTMLVideoElement | null {
  try {
    if (typeof document === "undefined") return null;
    const container = document.getElementById(viewportId);
    if (!container) return null;
    return container.querySelector("video") as HTMLVideoElement | null;
  } catch {
    return null;
  }
}

export function inspectCameraTrackStatus(viewportId: string, currentTorch = false): CameraTrackStatus {
  const track = getActiveVideoTrackFromViewport(viewportId);
  const hasNative = isNativeBarcodeDetectorSupported();
  if (!track) {
    return {
      hasTorch: false,
      torchOn: false,
      hasZoom: false,
      minZoom: 1,
      maxZoom: 1,
      currentZoom: 1,
      canRefocus: false,
      hasNativeBarcodeDetector: hasNative
    };
  }

  let caps: any = {};
  let settings: any = {};
  try {
    caps = typeof track.getCapabilities === "function" ? track.getCapabilities() : {};
    settings = typeof track.getSettings === "function" ? track.getSettings() : {};
  } catch {}

  const hasTorch = Boolean(caps?.torch);
  const hasZoom = Boolean(caps?.zoom && typeof caps.zoom.max === "number" && caps.zoom.max > 1);
  const minZoom = typeof caps?.zoom?.min === "number" ? caps.zoom.min : 1;
  const maxZoom = typeof caps?.zoom?.max === "number" ? Math.min(4, caps.zoom.max) : 1;
  const currentZoom = typeof settings?.zoom === "number" ? settings.zoom : 1;
  const focusModes: string[] = Array.isArray(caps?.focusMode) ? caps.focusMode : [];
  const canRefocus = focusModes.length > 0 || hasZoom;

  return {
    hasTorch,
    torchOn: Boolean(settings?.torch ?? currentTorch),
    hasZoom,
    minZoom,
    maxZoom,
    currentZoom,
    canRefocus,
    hasNativeBarcodeDetector: hasNative
  };
}

export async function applyCameraTorch(viewportId: string, enabled: boolean): Promise<boolean> {
  const track = getActiveVideoTrackFromViewport(viewportId);
  if (!track || typeof track.applyConstraints !== "function") return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: enabled } as any] });
    return true;
  } catch {
    return false;
  }
}

export async function applyCameraZoom(viewportId: string, zoomLevel: number): Promise<number | null> {
  const track = getActiveVideoTrackFromViewport(viewportId);
  if (!track || typeof track.applyConstraints !== "function") return null;
  try {
    const caps: any = typeof track.getCapabilities === "function" ? track.getCapabilities() : {};
    if (!caps?.zoom) return null;
    const min = typeof caps.zoom.min === "number" ? caps.zoom.min : 1;
    const max = typeof caps.zoom.max === "number" ? caps.zoom.max : 1;
    const clamped = Math.max(min, Math.min(max, zoomLevel));
    await track.applyConstraints({ advanced: [{ zoom: clamped } as any] });
    return clamped;
  } catch {
    return null;
  }
}

export async function triggerCameraRefocus(viewportId: string): Promise<boolean> {
  const track = getActiveVideoTrackFromViewport(viewportId);
  if (!track || typeof track.applyConstraints !== "function") return false;
  try {
    const caps: any = typeof track.getCapabilities === "function" ? track.getCapabilities() : {};
    const focusModes: string[] = Array.isArray(caps?.focusMode) ? caps.focusMode : [];

    if (focusModes.includes("single-shot")) {
      await track.applyConstraints({ advanced: [{ focusMode: "single-shot" } as any] });
      await new Promise((r) => setTimeout(r, 250));
    }
    if (focusModes.includes("continuous")) {
      await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] });
      return true;
    }
    if (focusModes.includes("single-shot")) return true;

    // Fallback leve de zoom +-0.05 para forçar o hardware a refazer o foco automático
    if (caps?.zoom && typeof caps.zoom.max === "number" && caps.zoom.max > 1.1) {
      const settings: any = typeof track.getSettings === "function" ? track.getSettings() : {};
      const cur = typeof settings?.zoom === "number" ? settings.zoom : 1;
      const nudge = cur + 0.08 <= caps.zoom.max ? cur + 0.08 : Math.max(caps.zoom.min || 1, cur - 0.08);
      await track.applyConstraints({ advanced: [{ zoom: nudge } as any] });
      await new Promise((r) => setTimeout(r, 140));
      await track.applyConstraints({ advanced: [{ zoom: cur } as any] });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Estica o contraste de uma região de código de barras usando percentis 2%..98%
 * (ignora reflexos de luz no vidro curvo e transforma códigos branco-no-transparente em barras nítidas).
 */
export function stretchBarcodeContrastBuffer(
  data: Uint8ClampedArray,
  options?: { invert?: boolean; boostSteepness?: number }
): void {
  const len = data.length;
  if (len < 4) return;
  const pixelCount = len >> 2;
  const hist = new Uint32Array(256);
  const lumas = new Uint8Array(pixelCount);

  for (let i = 0, p = 0; i < len; i += 4, p++) {
    const l = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const clamped = l < 0 ? 0 : l > 255 ? 255 : l;
    lumas[p] = clamped;
    hist[clamped]++;
  }

  const lowTarget = Math.max(1, Math.floor(pixelCount * 0.02));
  const highTarget = Math.max(lowTarget + 1, Math.floor(pixelCount * 0.98));

  let acc = 0;
  let minLuma = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= lowTarget) {
      minLuma = v;
      break;
    }
  }

  acc = 0;
  let maxLuma = 255;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= pixelCount - highTarget) {
      maxLuma = v;
      break;
    }
  }

  const span = Math.max(12, maxLuma - minLuma);
  const invert = Boolean(options?.invert);
  const steepness = options?.boostSteepness ?? 1.45;

  for (let i = 0, p = 0; i < len; i += 4, p++) {
    let norm = (lumas[p] - minLuma) / span;
    if (norm < 0) norm = 0;
    else if (norm > 1) norm = 1;

    // Curva sigmoidal leve em torno de 0.5 para separar barras claras de vidro transparente
    const centered = norm - 0.5;
    let boosted = 0.5 + Math.tanh(centered * steepness * 2.2) / (2 * Math.tanh(steepness * 1.1));
    if (boosted < 0) boosted = 0;
    else if (boosted > 1) boosted = 1;

    let out = Math.round(boosted * 255);
    if (invert) out = 255 - out;

    data[i] = out;
    data[i + 1] = out;
    data[i + 2] = out;
    data[i + 3] = 255;
  }
}

export async function createNativeBarcodeDetectorInstance(include2D = false): Promise<any | null> {
  if (!isNativeBarcodeDetectorSupported()) return null;
  try {
    const DetectorCtor = (window as any).BarcodeDetector;
    const base1D = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "code_93", "itf", "codabar"];
    const base2D = ["qr_code", "data_matrix", "pdf417", "aztec"];
    const candidates = include2D ? [...base1D, ...base2D] : base1D;
    const supported: string[] =
      typeof DetectorCtor.getSupportedFormats === "function"
        ? await DetectorCtor.getSupportedFormats()
        : candidates;
    const wanted = candidates.filter((f) => supported.includes(f));
    return new DetectorCtor({ formats: wanted.length > 0 ? wanted : ["ean_13", "ean_8", "code_128"] });
  } catch {
    return null;
  }
}

const VALID_BOTTLE_BARCODE_RE = /^[A-Za-z0-9\-_.]{6,32}$/;

function isValidDetectedCode(raw: string, include2D: boolean): boolean {
  if (!raw) return false;
  if (include2D) {
    return raw.length >= 4 && raw.length <= 256;
  }
  return VALID_BOTTLE_BARCODE_RE.test(raw);
}

/**
 * Executa varredura auxiliar de alto contraste (normal + invertida) no vídeo ativo
 * usando BarcodeDetector nativo (quando suportado pelo Android/Chrome).
 */
export function startTransparentBottleContrastLoop(options: {
  viewportId: string;
  isEnhancedEnabled: () => boolean;
  onDetected: (code: string) => void;
  intervalMs?: number;
  include2D?: boolean;
}): () => void {
  let stopped = false;
  let detector: any = null;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let passIndex = 0;
  let busy = false;

  const include2D = Boolean(options.include2D);

  createNativeBarcodeDetectorInstance(include2D).then((inst) => {
    if (!stopped) detector = inst;
  });

  const timer = setInterval(async () => {
    if (stopped || busy || !detector) return;
    const video = getActiveVideoElementFromViewport(options.viewportId);
    if (!video || video.readyState < 2 || video.videoWidth < 160 || video.videoHeight < 120) return;

    busy = true;
    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // Alterna passes:
      // 0: Faixa central larga com contraste esticado (ótimo para códigos finos)
      // 1: Faixa central com contraste esticado + INVERSÃO (ótimo para código branco em vidro transparente!)
      // 2: Zoom digital central 1.6x com contraste esticado (ótimo para longnecks menores à distância de foco)
      const mode = options.isEnhancedEnabled() ? passIndex % 3 : 0;
      passIndex++;

      const cropW = mode === 2 ? Math.round(vw * 0.56) : Math.round(vw * 0.86);
      const cropH = mode === 2 ? Math.round(vh * 0.42) : Math.round(vh * 0.56);
      const sx = Math.max(0, Math.round((vw - cropW) / 2));
      const sy = Math.max(0, Math.round((vh - cropH) / 2));

      const targetW = Math.min(820, Math.max(480, cropW));
      const targetH = Math.round((cropH / cropW) * targetW);

      if (!canvas) {
        canvas = document.createElement("canvas");
        ctx = canvas.getContext("2d", { willReadFrequently: true });
      }
      if (!ctx || !canvas) return;

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, targetW, targetH);

      if (options.isEnhancedEnabled()) {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        stretchBarcodeContrastBuffer(imgData.data, {
          invert: mode === 1,
          boostSteepness: 1.55
        });
        ctx.putImageData(imgData, 0, 0);
      }

      const codes = await detector.detect(canvas);
      if (stopped || !Array.isArray(codes) || codes.length === 0) return;

      for (const hit of codes) {
        const raw = String(hit?.rawValue || "").trim();
        if (isValidDetectedCode(raw, include2D)) {
          options.onDetected(raw);
          break;
        }
      }
    } catch {
      // Silencia erros pontuais de frame
    } finally {
      busy = false;
    }
  }, options.intervalMs ?? 210);

  return () => {
    stopped = true;
    clearInterval(timer);
    canvas = null;
    ctx = null;
  };
}

/**
 * Decodifica uma foto tirada com a câmera nativa do celular (foco HDR real)
 * tentando leitura normal, alto contraste esticado e alto contraste invertido (rótulo branco/transparente).
 */
export async function scanBarcodeFromPhotoFile(
  file: File,
  html5Scanner?: { scanFileV2?: (f: File, showImage?: boolean) => Promise<{ decodedText: string }>; scanFile?: (f: File, showImage?: boolean) => Promise<string> } | null,
  options?: { include2D?: boolean }
): Promise<string | null> {
  const include2D = Boolean(options?.include2D);
  // 1. Tenta BarcodeDetector nativo direto na imagem original e nas versões de alto contraste
  const detector = await createNativeBarcodeDetectorInstance(include2D);
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });

    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const w = Math.max(1, Math.round((img.naturalWidth || 640) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || 480) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (ctx && detector) {
      ctx.drawImage(img, 0, 0, w, h);

      // Passe 1: Original nítida
      try {
        const res1 = await detector.detect(canvas);
        const raw1 = String(res1?.[0]?.rawValue || "").trim();
        if (isValidDetectedCode(raw1, include2D)) return raw1;
      } catch {}

      // Passe 2: Contraste esticado (normal)
      const originalData = ctx.getImageData(0, 0, w, h);
      const stretched = new ImageData(new Uint8ClampedArray(originalData.data), w, h);
      stretchBarcodeContrastBuffer(stretched.data, { invert: false, boostSteepness: 1.65 });
      ctx.putImageData(stretched, 0, 0);
      try {
        const res2 = await detector.detect(canvas);
        const raw2 = String(res2?.[0]?.rawValue || "").trim();
        if (isValidDetectedCode(raw2, include2D)) return raw2;
      } catch {}

      // Passe 3: Contraste esticado + invertido (código branco em garrafa transparente!)
      const inverted = new ImageData(new Uint8ClampedArray(originalData.data), w, h);
      stretchBarcodeContrastBuffer(inverted.data, { invert: true, boostSteepness: 1.65 });
      ctx.putImageData(inverted, 0, 0);
      try {
        const res3 = await detector.detect(canvas);
        const raw3 = String(res3?.[0]?.rawValue || "").trim();
        if (isValidDetectedCode(raw3, include2D)) return raw3;
      } catch {}
    }

    // 2. Fallback com Html5Qrcode scanFileV2 / scanFile na foto esticada
    if (html5Scanner) {
      try {
        if (typeof html5Scanner.scanFileV2 === "function") {
          const r = await html5Scanner.scanFileV2(file, false);
          if (r?.decodedText?.trim()) return r.decodedText.trim();
        } else if (typeof html5Scanner.scanFile === "function") {
          const r = await html5Scanner.scanFile(file, false);
          if (r?.trim()) return r.trim();
        }
      } catch {}

      // Se a foto original não leu no Html5Qrcode, gera PNG de alto contraste e tenta scanFile novamente
      if (ctx) {
        // Re-desenha original para gerar versão normal esticada (não-invertida) como Blob PNG
        ctx.drawImage(img, 0, 0, w, h);
        const normImg = ctx.getImageData(0, 0, w, h);
        stretchBarcodeContrastBuffer(normImg.data, { invert: false, boostSteepness: 1.65 });
        ctx.putImageData(normImg, 0, 0);
        const stretchedBlob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/png"));
        if (stretchedBlob) {
          const stretchedFile = new File([stretchedBlob], "barcode-contrast.png", { type: "image/png" });
          try {
            if (typeof html5Scanner.scanFileV2 === "function") {
              const r = await html5Scanner.scanFileV2(stretchedFile, false);
              if (r?.decodedText?.trim()) return r.decodedText.trim();
            } else if (typeof html5Scanner.scanFile === "function") {
              const r = await html5Scanner.scanFile(stretchedFile, false);
              if (r?.trim()) return r.trim();
            }
          } catch {}
        }
        // E versão invertida para código branco em garrafa transparente
        ctx.drawImage(img, 0, 0, w, h);
        const invImg = ctx.getImageData(0, 0, w, h);
        stretchBarcodeContrastBuffer(invImg.data, { invert: true, boostSteepness: 1.65 });
        ctx.putImageData(invImg, 0, 0);
        const invBlob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/png"));
        if (invBlob) {
          const invFile = new File([invBlob], "barcode-inverted.png", { type: "image/png" });
          try {
            if (typeof html5Scanner.scanFileV2 === "function") {
              const r = await html5Scanner.scanFileV2(invFile, false);
              if (r?.decodedText?.trim()) return r.decodedText.trim();
            } else if (typeof html5Scanner.scanFile === "function") {
              const r = await html5Scanner.scanFile(invFile, false);
              if (r?.trim()) return r.trim();
            }
          } catch {}
        }
      }
    }

    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
