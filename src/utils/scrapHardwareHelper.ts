// Utilitários de Hardware Real para Portão de Ferro Velho & Pátio de Vidros:
// 1. Cálculos com arredondamento por item (sem divergência de centavos) e separação estrita Vidros vs Ferro Velho
// 2. Locutor IA (Web Speech API pt-BR + pulso acústico para acordar caixa de som Bluetooth)
// 3. Balança de Gancho Digital Bluetooth (Web Bluetooth GATT Weight Scale / UART / HM-10)
// 4. Ditado por Voz do Peso (SpeechRecognition pt-BR) para balanças de gancho sem Bluetooth

export const VOICE_ANNOUNCER_STORAGE_KEY = "pdv_dw_voice_announcer_enabled_v1";

export function roundCurrencyBrl(value: number): number {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return Math.round((safe + Number.EPSILON) * 100) / 100;
}

export function roundWeightKg(value: number): number {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return Math.round((safe + Number.EPSILON) * 1000) / 1000;
}

export function computeScrapLineTotal(weightKg: number, pricePerKg: number): number {
  const w = Number.isFinite(weightKg) ? Math.max(0, weightKg) : 0;
  const p = Number.isFinite(pricePerKg) ? Math.max(0, pricePerKg) : 0;
  return roundCurrencyBrl(w * p);
}

export function formatBrl(value: number): string {
  return roundCurrencyBrl(value).toFixed(2).replace(".", ",");
}

export type ScrapUnitType = "kg" | "L";

export function resolveScrapMaterialUnit(mat?: {
  unitType?: ScrapUnitType | string;
  unitLabel?: string;
  id?: string;
  name?: string;
}): ScrapUnitType {
  if (!mat) return "kg";
  if (mat.unitType === "L" || mat.unitLabel === "L") return "L";
  if (mat.id === "scrap_oleo") return "L";
  const name = String(mat.name || "");
  if (/(\bóleo\b|\boleo\b|\(litro\)|litros?\b|\b\/l\b)/i.test(name)) return "L";
  return "kg";
}

export function formatWeightKgDetailed(value: number, withComma = true): string {
  const formatted = roundWeightKg(value).toFixed(3);
  return withComma ? formatted.replace(".", ",") : formatted;
}

export function formatQuantityDetailed(
  value: number,
  unit: ScrapUnitType = "kg",
  uppercaseUnit = false
): string {
  const numStr = formatWeightKgDetailed(value, true);
  const unitStr = unit === "L" ? "L" : uppercaseUnit ? "KG" : "kg";
  return `${numStr} ${unitStr}`;
}

export function splitTicketKgAndLiters(
  items: { totalWeightKg?: number; unitLabel?: string; materialId?: string; name?: string }[] = [],
  fallbackTotalKg = 0
): { kgTotal: number; litersTotal: number } {
  let kgTotal = 0;
  let litersTotal = 0;
  for (const it of items) {
    const qty = roundWeightKg(Number(it?.totalWeightKg) || 0);
    if (qty <= 0) continue;
    if (resolveScrapMaterialUnit(it) === "L") {
      litersTotal = roundWeightKg(litersTotal + qty);
    } else {
      kgTotal = roundWeightKg(kgTotal + qty);
    }
  }
  if (items.length === 0 && fallbackTotalKg > 0) {
    kgTotal = roundWeightKg(fallbackTotalKg);
  }
  return { kgTotal, litersTotal };
}

export interface TicketLikeForCalc {
  id: string;
  isFounder?: boolean;
  isScrapPurchase?: boolean;
  isCancelled?: boolean;
  totalWeightKg?: number;
  totalPaid?: number;
  bonusAmount?: number;
  discountAmount?: number;
  paymentStatus?: string;
  items?: { costPaid?: number }[];
}

export interface PaymentLikeForCalc {
  id: string;
  amountPaid?: number;
  isCancelled?: boolean;
  sector?: "vidros" | "ferro_velho" | "geral";
}

export function getTicketEffectiveMonetaryValue(ticket: TicketLikeForCalc): number {
  if (!ticket) return 0;
  if (!ticket.isFounder) {
    return roundCurrencyBrl(ticket.totalPaid || 0);
  }
  const itemsSum = (ticket.items || []).reduce(
    (sum, it) => sum + roundCurrencyBrl(it.costPaid || 0),
    0
  );
  return roundCurrencyBrl(
    Math.max(0, itemsSum + (ticket.bonusAmount || 0) - (ticket.discountAmount || 0))
  );
}

export interface SectorFolderStats {
  tickets: TicketLikeForCalc[];
  activeTickets: TicketLikeForCalc[];
  activeCount: number;
  cancelledCount: number;
  weightKg: number;
  boughtAmount: number;
  paidDirectAmount: number;
  founderSavedAmount: number;
}

export interface FolderSectorBreakdown {
  vidros: SectorFolderStats;
  ferroVelho: SectorFolderStats;
  all: {
    activeCount: number;
    cancelledCount: number;
    weightKg: number;
    boughtAmount: number;
    paidDirectAmount: number;
    founderSavedAmount: number;
  };
}

export function computeFolderSectorBreakdown(tickets: TicketLikeForCalc[]): FolderSectorBreakdown {
  const buildSector = (list: TicketLikeForCalc[]): SectorFolderStats => {
    const activeTickets = list.filter((t) => !t.isCancelled);
    const cancelledCount = list.length - activeTickets.length;
    let weightKg = 0;
    let boughtAmount = 0;
    let paidDirectAmount = 0;
    let founderSavedAmount = 0;

    for (const tk of activeTickets) {
      weightKg = roundWeightKg(weightKg + (tk.totalWeightKg || 0));
      const val = getTicketEffectiveMonetaryValue(tk);
      if (tk.isFounder) {
        founderSavedAmount = roundCurrencyBrl(founderSavedAmount + val);
      } else {
        boughtAmount = roundCurrencyBrl(boughtAmount + val);
        if (tk.paymentStatus === "pago_na_hora") {
          paidDirectAmount = roundCurrencyBrl(paidDirectAmount + val);
        }
      }
    }

    return {
      tickets: list,
      activeTickets,
      activeCount: activeTickets.length,
      cancelledCount,
      weightKg,
      boughtAmount,
      paidDirectAmount,
      founderSavedAmount
    };
  };

  const vidrosList = tickets.filter((t) => !t.isScrapPurchase);
  const fvList = tickets.filter((t) => Boolean(t.isScrapPurchase));

  const vidros = buildSector(vidrosList);
  const ferroVelho = buildSector(fvList);

  return {
    vidros,
    ferroVelho,
    all: {
      activeCount: vidros.activeCount + ferroVelho.activeCount,
      cancelledCount: vidros.cancelledCount + ferroVelho.cancelledCount,
      weightKg: roundWeightKg(vidros.weightKg + ferroVelho.weightKg),
      boughtAmount: roundCurrencyBrl(vidros.boughtAmount + ferroVelho.boughtAmount),
      paidDirectAmount: roundCurrencyBrl(vidros.paidDirectAmount + ferroVelho.paidDirectAmount),
      founderSavedAmount: roundCurrencyBrl(vidros.founderSavedAmount + ferroVelho.founderSavedAmount)
    }
  };
}

// =========================================================================
// 2. LOCUTOR IA PARA CAIXA DE SOM BLUETOOTH (Web Speech API PT-BR)
// =========================================================================

export function getVoiceAnnouncerEnabled(): boolean {
  try {
    const saved = localStorage.getItem(VOICE_ANNOUNCER_STORAGE_KEY);
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
}

export function setVoiceAnnouncerEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(VOICE_ANNOUNCER_STORAGE_KEY, enabled ? "true" : "false");
  } catch {}
}

export function formatCurrencyPtBrForSpeech(value: number): string {
  const safe = roundCurrencyBrl(value);
  const reais = Math.floor(safe);
  const centavos = Math.round((safe - reais) * 100);
  if (reais === 0 && centavos === 0) return "zero reais";
  const reaisPart = reais === 0 ? "" : reais === 1 ? "1 real" : `${reais} reais`;
  const centsPart = centavos === 0 ? "" : centavos === 1 ? "1 centavo" : `${centavos} centavos`;
  if (reaisPart && centsPart) return `${reaisPart} e ${centsPart}`;
  return reaisPart || centsPart;
}

export function formatWeightKgForSpeech(kg: number): string {
  const safe = roundWeightKg(kg);
  const wholeKg = Math.floor(safe);
  const grams = Math.round((safe - wholeKg) * 1000);
  if (wholeKg === 0 && grams === 0) return "zero quilos";
  const kgPart = wholeKg === 0 ? "" : wholeKg === 1 ? "1 quilo" : `${wholeKg} quilos`;
  const gPart = grams === 0 ? "" : grams === 1 ? "1 grama" : `${grams} gramas`;
  if (kgPart && gPart) return `${kgPart} e ${gPart}`;
  return kgPart || gPart;
}

let sharedWakeAudioCtx: AudioContext | null = null;

export async function playSpeakerWakeChime(): Promise<void> {
  try {
    const AudioCtx =
      typeof window !== "undefined"
        ? window.AudioContext || (window as any).webkitAudioContext
        : null;
    if (!AudioCtx) return;
    if (!sharedWakeAudioCtx || sharedWakeAudioCtx.state === "closed") {
      sharedWakeAudioCtx = new AudioCtx();
    }
    if (sharedWakeAudioCtx.state === "suspended") {
      await sharedWakeAudioCtx.resume();
    }
    const ctx = sharedWakeAudioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.06); // E5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {}
}

export function stopYardAnnouncement(): void {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {}
}

function pickPtBrVoice(): SpeechSynthesisVoice | null {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    return (
      voices.find((v) => v.lang.toLowerCase() === "pt-br" && /google|luciana|daniel|maria|felipe|thalita|francisca/i.test(v.name)) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("pt-br")) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("pt")) ||
      null
    );
  } catch {
    return null;
  }
}

export async function speakYardAnnouncement(
  text: string,
  options?: { force?: boolean; rate?: number; pitch?: number; wakeBluetooth?: boolean }
): Promise<boolean> {
  if (!text || !text.trim()) return false;
  if (!options?.force && !getVoiceAnnouncerEnabled()) return false;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;

  try {
    if (options?.wakeBluetooth !== false) {
      await playSpeakerWakeChime();
      await new Promise((r) => setTimeout(r, 170));
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = "pt-BR";
    utterance.rate = options?.rate ?? 1.02;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = 1.0;
    const voice = pickPtBrVoice();
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

// =========================================================================
// 3. BALANÇA DE GANCHO DIGITAL VIA WEB BLUETOOTH (BLE GATT / UART / HM-10)
// =========================================================================

export function isBluetoothScaleSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export function parseBleScaleWeightPacket(
  dataView: DataView,
  characteristicUuid?: string
): number | null {
  if (!dataView || dataView.byteLength === 0) return null;
  const uuid = (characteristicUuid || "").toLowerCase();

  // 1) Padrão oficial Bluetooth SIG Weight Measurement (0x2A9D)
  if (uuid.includes("2a9d") && dataView.byteLength >= 3) {
    const flags = dataView.getUint8(0);
    const isImperialLbs = (flags & 0x01) === 1;
    const rawVal = dataView.getUint16(1, true);
    if (rawVal === 0xffff) return null;
    if (isImperialLbs) {
      const lbs = rawVal * 0.01;
      return roundWeightKg(lbs * 0.45359237);
    }
    // Em kg com resolução de 0.005 kg (5 gramas)
    return roundWeightKg(rawVal * 0.005);
  }

  // 2) Payload ASCII de balanças de gancho / UART / HM-10 (ex: "ST,GS,+  3.20kg", "07.10", "850g")
  try {
    const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    const text = new TextDecoder("utf-8", { fatal: false })
      .decode(bytes)
      .replace(/[^\x20-\x7E]/g, " ")
      .trim();
    if (text) {
      const match = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|lb|lbs)?/i);
      if (match) {
        const parsed = parseFloat(match[1].replace(",", "."));
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 2000) {
          const unit = (match[2] || "").toLowerCase();
          if (unit === "g") return roundWeightKg(parsed / 1000);
          if (unit === "lb" || unit === "lbs") return roundWeightKg(parsed * 0.45359237);
          return roundWeightKg(parsed);
        }
      }
    }
  } catch {}

  // 3) Fallback binário de 2 bytes uint16 em 10g (algumas balanças chinesas de gancho BLE)
  if (dataView.byteLength === 2 || dataView.byteLength === 4) {
    const raw = dataView.getUint16(0, true);
    if (raw > 0 && raw < 50000) {
      return roundWeightKg(raw / 100);
    }
  }

  return null;
}

export interface BluetoothScaleConnection {
  deviceName: string;
  disconnect: () => void;
}

export async function connectBluetoothHookScale({
  onWeightKg,
  onStatus,
  onDisconnect
}: {
  onWeightKg: (kg: number) => void;
  onStatus?: (msg: string) => void;
  onDisconnect?: () => void;
}): Promise<BluetoothScaleConnection> {
  if (!isBluetoothScaleSupported()) {
    throw new Error(
      "Este navegador não suporta Bluetooth direto (Web Bluetooth). Use o Chrome no Android, digite o peso do visor da balança de gancho ou use o botão Falar Peso!"
    );
  }

  const nav = navigator as any;
  if (onStatus) onStatus("Procurando balança digital Bluetooth por perto...");

  const optionalServices = [
    "0000181d-0000-1000-8000-00805f9b34fb", // Weight Scale Service
    "0000ffe0-0000-1000-8000-00805f9b34fb", // HM-10 / Serial BLE
    "0000fff0-0000-1000-8000-00805f9b34fb", // Balanças de gancho / bagagem BLE genéricas
    "0000ffb0-0000-1000-8000-00805f9b34fb",
    "6e400001-b5a3-f393-e0a9-e50e24dcca9e"  // Nordic UART
  ];

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices
  });

  if (!device || !device.gatt) {
    throw new Error("Nenhuma balança Bluetooth selecionada.");
  }

  const deviceName = device.name || "Balança Bluetooth";
  if (onStatus) onStatus(`Conectando à ${deviceName}...`);

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices().catch(() => []);
  const attachedChars: any[] = [];

  for (const service of services) {
    const chars = await service.getCharacteristics().catch(() => []);
    for (const ch of chars) {
      if (ch.properties?.notify || ch.properties?.indicate) {
        try {
          ch.addEventListener("characteristicvaluechanged", (ev: any) => {
            const dv: DataView | undefined = ev?.target?.value;
            if (!dv) return;
            const kg = parseBleScaleWeightPacket(dv, ch.uuid);
            if (kg !== null && kg >= 0) {
              onWeightKg(kg);
            }
          });
          await ch.startNotifications();
          attachedChars.push(ch);
        } catch {}
      }
    }
  }

  const handleGattDisconnected = () => {
    if (onDisconnect) onDisconnect();
  };
  device.addEventListener("gattserverdisconnected", handleGattDisconnected);

  if (attachedChars.length === 0) {
    try {
      device.gatt.disconnect();
    } catch {}
    throw new Error(
      `Conectado em "${deviceName}", mas este aparelho não envia peso por Bluetooth (ou é uma balança de gancho com visor apenas local). Digite o peso do visor ou use Falar Peso!`
    );
  }

  if (onStatus) {
    onStatus(`Balança "${deviceName}" conectada (${attachedChars.length} canal ativo)! Pendure o saco para ler o peso.`);
  }

  return {
    deviceName,
    disconnect: () => {
      try {
        device.removeEventListener("gattserverdisconnected", handleGattDisconnected);
        if (device.gatt?.connected) {
          device.gatt.disconnect();
        }
      } catch {}
      if (onDisconnect) onDisconnect();
    }
  };
}

// =========================================================================
// 4. DITADO POR VOZ DO PESO (Para balanças de gancho sem Bluetooth)
// =========================================================================

export function isVoiceWeightSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function parseSpokenWeightPtBr(rawTranscript: string): number | null {
  if (!rawTranscript) return null;
  let text = rawTranscript.toLowerCase().trim();

  const wordDigits: Record<string, string> = {
    "zero": "0",
    "um": "1",
    "uma": "1",
    "dois": "2",
    "duas": "2",
    "três": "3",
    "tres": "3",
    "quatro": "4",
    "cinco": "5",
    "seis": "6",
    "sete": "7",
    "oito": "8",
    "nove": "9",
    "dez": "10",
    "meio": "0.5"
  };

  // Ex: "3 quilos e meio" -> 3.5
  const meioMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:quilos?|kg)\s*(?:e\s*)?meio/);
  if (meioMatch) {
    const base = parseFloat(meioMatch[1].replace(",", "."));
    if (Number.isFinite(base)) return roundWeightKg(base + 0.5);
  }

  // Ex: "3 quilos e 200 gramas" -> 3.2
  const kgAndGramsMatch = text.match(/(\d+)\s*(?:quilos?|kg)\s*(?:e\s*)?(\d{1,3})\s*(?:gramas?|g)?/);
  if (kgAndGramsMatch) {
    const kg = parseInt(kgAndGramsMatch[1], 10);
    const gRaw = parseInt(kgAndGramsMatch[2], 10);
    const gramsFrac = kgAndGramsMatch[2].length === 1 ? gRaw / 10 : kgAndGramsMatch[2].length === 2 ? gRaw / 100 : gRaw / 1000;
    if (Number.isFinite(kg) && Number.isFinite(gramsFrac)) {
      return roundWeightKg(kg + gramsFrac);
    }
  }

  // Ex: "850 gramas" -> 0.85
  const gramsOnly = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:gramas?|g)\b/);
  if (gramsOnly) {
    const g = parseFloat(gramsOnly[1].replace(",", "."));
    if (Number.isFinite(g)) return roundWeightKg(g / 1000);
  }

  for (const [word, digit] of Object.entries(wordDigits)) {
    text = text.replace(new RegExp(`\\b${word}\\b`, "g"), digit);
  }
  text = text.replace(/\s+(?:vírgula|virgula|ponto|e)\s+/g, ".");

  const genericNum = text.match(/(\d+(?:[.,]\d+)?)/);
  if (genericNum) {
    const val = parseFloat(genericNum[1].replace(",", "."));
    if (Number.isFinite(val) && val >= 0) {
      return roundWeightKg(val);
    }
  }
  return null;
}

export function startVoiceWeightDictation({
  onWeightKg,
  onTranscript,
  onError,
  onEnd
}: {
  onWeightKg: (kg: number, transcript: string) => void;
  onTranscript?: (transcript: string) => void;
  onError?: (msg: string) => void;
  onEnd?: () => void;
}): () => void {
  const RecClass =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  if (!RecClass) {
    if (onError) onError("Ditado por voz não disponível neste navegador.");
    if (onEnd) onEnd();
    return () => {};
  }

  const recognition = new RecClass();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const transcript = event?.results?.[0]?.[0]?.transcript || "";
    if (onTranscript) onTranscript(transcript);
    const kg = parseSpokenWeightPtBr(transcript);
    if (kg !== null && kg > 0) {
      onWeightKg(kg, transcript);
    } else if (onError) {
      onError(`Ouvi "${transcript}", mas não entendi o peso. Fale por exemplo: "7 quilos e 100" ou "3 vírgula 20".`);
    }
  };

  recognition.onerror = (ev: any) => {
    const msg =
      ev?.error === "not-allowed"
        ? "Permissão do microfone negada. Libere o microfone no navegador para ditar o peso."
        : ev?.error === "no-speech"
        ? "Nenhuma voz detectada. Tente novamente."
        : "Não consegui ouvir o peso. Tente novamente ou digite no campo.";
    if (onError) onError(msg);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  try {
    recognition.start();
  } catch {
    if (onError) onError("Não foi possível iniciar o microfone.");
    if (onEnd) onEnd();
  }

  return () => {
    try {
      recognition.stop();
    } catch {}
  };
}

// =========================================================================
// 5. UNIFICAÇÃO E CONFERÊNCIA DO PÁTIO DE VIDROS (CATÁLOGO VS RECIBOS ATIVOS)
// =========================================================================

export interface GlassCatalogBottleLike {
  id: string;
  name: string;
  category?: string;
  volumeMl?: number;
  barcode?: string;
  additionalBarcodes?: string[];
  unitWeightGrams: number;
  unitWeightKg?: number;
  buyPricePerUnit?: number;
  stockUnits?: number;
}

export interface GlassTicketItemLike {
  name: string;
  volumeMl?: number;
  barcode?: string;
  quantity: number;
  unitWeightGrams?: number;
  totalWeightKg?: number;
  costPaid?: number;
}

export interface GlassTicketLike {
  id: string;
  timestamp?: string;
  isCancelled?: boolean;
  isScrapPurchase?: boolean;
  items?: GlassTicketItemLike[];
}

export interface GlassShipmentLike {
  id: string;
  timestamp?: string;
}

export interface GlassYardSummary {
  totalUnits: number;
  totalWeightKg: number;
  totalWeightTon: number;
  grossRevenueTon: number;
  estimatedAcquisitionCost: number;
  netProfit: number;
  profitMarginPct: number;
}

export function extractRecordTimestampMs(id?: string, timestampStr?: string): number {
  if (id) {
    const m = id.match(/(\d{12,15})/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 1_000_000_000_000) return n;
    }
  }
  if (timestampStr) {
    // Parse pt-BR "DD/MM/YYYY, HH:mm:ss" or "DD/MM/YYYY HH:mm:ss"
    const pt = timestampStr.match(/(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (pt) {
      const dt = new Date(
        Number(pt[3]),
        Number(pt[2]) - 1,
        Number(pt[1]),
        Number(pt[4]),
        Number(pt[5]),
        Number(pt[6] || "0")
      );
      if (Number.isFinite(dt.getTime())) return dt.getTime();
    }
    const parsed = Date.parse(timestampStr);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function computeGlassCatalogSummary(
  catalog: GlassCatalogBottleLike[],
  sellPricePerKg: number
): GlassYardSummary {
  let totalUnits = 0;
  let totalWeightGrams = 0;
  let estimatedAcquisitionCost = 0;

  if (Array.isArray(catalog)) {
    for (const b of catalog) {
      if (!b || typeof b !== "object") continue;
      const units = Math.max(0, Math.round(Number(b.stockUnits) || 0));
      const rawGrams = Number(b.unitWeightGrams);
      const rawKg = Number(b.unitWeightKg);
      const grams =
        Number.isFinite(rawGrams) && rawGrams > 0
          ? rawGrams
          : Number.isFinite(rawKg) && rawKg > 0
          ? rawKg * 1000
          : 0;
      totalUnits += units;
      totalWeightGrams += units * grams;
      estimatedAcquisitionCost += units * Math.max(0, Number(b.buyPricePerUnit) || 0);
    }
  }

  const totalWeightKg = roundWeightKg(totalWeightGrams / 1000);
  const totalWeightTon = totalWeightKg / 1000;
  const safePricePerKg = Number.isFinite(sellPricePerKg) && sellPricePerKg > 0 ? sellPricePerKg : 0.15;
  const grossRevenueTon = roundCurrencyBrl(totalWeightKg * safePricePerKg);
  const roundedCost = roundCurrencyBrl(estimatedAcquisitionCost);
  const netProfit = roundCurrencyBrl(Math.max(0, grossRevenueTon - roundedCost));
  const profitMarginPct = grossRevenueTon > 0 ? (netProfit / grossRevenueTon) * 100 : 0;

  return {
    totalUnits,
    totalWeightKg,
    totalWeightTon,
    grossRevenueTon,
    estimatedAcquisitionCost: roundedCost,
    netProfit,
    profitMarginPct
  };
}

export interface GlassTicketReconciliationResult<T extends GlassCatalogBottleLike> {
  expectedUnits: number;
  expectedWeightKg: number;
  matchedTicketsCount: number;
  breakdownLabels: string[];
  reconciledCatalog: T[];
}

export function reconcileGlassCatalogFromActiveTickets<T extends GlassCatalogBottleLike>(
  catalog: T[],
  purchaseHistory: GlassTicketLike[],
  truckShipments: GlassShipmentLike[] = []
): GlassTicketReconciliationResult<T> {
  let lastDispatchTs = 0;
  for (const s of truckShipments) {
    const ts = extractRecordTimestampMs(s.id, s.timestamp);
    if (ts > lastDispatchTs) lastDispatchTs = ts;
  }

  const activeGlassTickets = purchaseHistory.filter((tk) => {
    if (!tk || tk.isCancelled || tk.isScrapPurchase) return false;
    if (lastDispatchTs > 0) {
      const tkTs = extractRecordTimestampMs(tk.id, tk.timestamp);
      if (tkTs > 0 && tkTs <= lastDispatchTs) return false;
    }
    return true;
  });

  const expectedUnitsById = new Map<string, number>();
  let unmatchedUnits = 0;
  let unmatchedWeightKg = 0;
  const breakdownCounts = new Map<string, { name: string; units: number; grams: number }>();

  const findCatalogMatch = (it: GlassTicketItemLike): T | undefined => {
    const cleanBarcode = (it.barcode || "").trim();
    if (cleanBarcode && cleanBarcode !== "BALANCA") {
      const byBarcode = catalog.find(
        (b) =>
          (b.barcode || "").trim() === cleanBarcode ||
          (b.additionalBarcodes || []).some((ab) => (ab || "").trim() === cleanBarcode)
      );
      if (byBarcode) return byBarcode;
    }
    const cleanName = (it.name || "").trim().toLowerCase();
    const byExactNameAndMl = catalog.find(
      (b) =>
        b.name.trim().toLowerCase() === cleanName &&
        (it.volumeMl == null || b.volumeMl == null || b.volumeMl === it.volumeMl)
    );
    if (byExactNameAndMl) return byExactNameAndMl;
    return catalog.find((b) => b.name.trim().toLowerCase() === cleanName);
  };

  for (const tk of activeGlassTickets) {
    for (const it of tk.items || []) {
      const qty = Math.max(0, Math.round(Number(it.quantity) || 0));
      if (qty <= 0) continue;
      const matched = findCatalogMatch(it);
      if (matched) {
        expectedUnitsById.set(matched.id, (expectedUnitsById.get(matched.id) || 0) + qty);
        const cur = breakdownCounts.get(matched.id) || {
          name: matched.name,
          units: 0,
          grams: matched.unitWeightGrams
        };
        cur.units += qty;
        breakdownCounts.set(matched.id, cur);
      } else {
        unmatchedUnits += qty;
        unmatchedWeightKg += Math.max(
          0,
          Number(it.totalWeightKg) || (qty * (Number(it.unitWeightGrams) || 0)) / 1000
        );
      }
    }
  }

  let expectedUnits = unmatchedUnits;
  let expectedWeightGrams = unmatchedWeightKg * 1000;

  const reconciledCatalog = catalog.map((b) => {
    const nextUnits = expectedUnitsById.get(b.id) || 0;
    expectedUnits += nextUnits;
    expectedWeightGrams += nextUnits * Math.max(0, Number(b.unitWeightGrams) || 0);
    return {
      ...b,
      stockUnits: nextUnits
    };
  });

  const breakdownLabels = Array.from(breakdownCounts.values()).map(
    (entry) => `${entry.units}× ${entry.name} (${entry.grams}g)`
  );

  return {
    expectedUnits,
    expectedWeightKg: roundWeightKg(expectedWeightGrams / 1000),
    matchedTicketsCount: activeGlassTickets.length,
    breakdownLabels,
    reconciledCatalog
  };
}

