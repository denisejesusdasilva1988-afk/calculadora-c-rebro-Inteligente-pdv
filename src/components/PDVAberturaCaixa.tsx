import React, { useState, useMemo } from "react";
import {
  Unlock,
  Shield,
  Zap,
  History,
  Coins,
  DollarSign,
  Printer,
  Share2,
  CheckCircle2,
  AlertTriangle,
  User,
  Clock,
  FileText,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  X
} from "lucide-react";

export interface CashRegisterOpeningRecord {
  id: string;
  timestamp: string;
  openingFloat: number;
  operatorName: string;
  shift: string;
  mode: "express" | "conferencia";
  billCounts?: Record<string, number>;
  notes?: string;
}

interface PDVAberturaCaixaProps {
  onConfirmOpen: (
    openingFloat: number,
    details?: {
      operatorName: string;
      shift: string;
      mode: "express" | "conferencia";
      billCounts?: Record<string, number>;
      notes?: string;
    }
  ) => void;
  formatCurrency: (val: number) => string;
  showNotification: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  storeName?: string;
  staffList?: { id: string; name: string; role?: string }[];
  initialValue?: number;
  isAlreadyOpen?: boolean;
  onClose?: () => void;
}

const BILL_DENOMINATIONS = [
  { val: 200, label: "Cédula R$ 200,00", type: "nota", color: "text-amber-300" },
  { val: 100, label: "Cédula R$ 100,00", type: "nota", color: "text-sky-300" },
  { val: 50, label: "Cédula R$ 50,00", type: "nota", color: "text-orange-300" },
  { val: 20, label: "Cédula R$ 20,00", type: "nota", color: "text-yellow-300" },
  { val: 10, label: "Cédula R$ 10,00", type: "nota", color: "text-red-300" },
  { val: 5, label: "Cédula R$ 5,00", type: "nota", color: "text-purple-300" },
  { val: 2, label: "Cédula R$ 2,00", type: "nota", color: "text-blue-300" },
];

const COIN_DENOMINATIONS = [
  { val: 1, label: "Moeda R$ 1,00", type: "moeda", color: "text-amber-400" },
  { val: 0.5, label: "Moeda R$ 0,50", type: "moeda", color: "text-slate-300" },
  { val: 0.25, label: "Moeda R$ 0,25", type: "moeda", color: "text-amber-500" },
  { val: 0.1, label: "Moeda R$ 0,10", type: "moeda", color: "text-yellow-500" },
  { val: 0.05, label: "Moeda R$ 0,05", type: "moeda", color: "text-orange-400" },
];

const QUICK_FLOAT_OPTIONS = [
  { label: "R$ 0,00 (Sem Troco)", val: 0 },
  { label: "R$ 50,00", val: 50 },
  { label: "R$ 100,00 (Mais Comum)", val: 100 },
  { label: "R$ 150,00", val: 150 },
  { label: "R$ 200,00", val: 200 },
  { label: "R$ 300,00", val: 300 },
  { label: "R$ 500,00", val: 500 },
];

export function PDVAberturaCaixa({
  onConfirmOpen,
  formatCurrency,
  showNotification,
  storeName,
  staffList = [],
  initialValue,
  isAlreadyOpen = false,
  onClose
}: PDVAberturaCaixaProps) {
  // Mode: "express" (básico/rápido) vs "conferencia" (detalhado/blindado) vs "historico"
  const [openingMode, setOpeningMode] = useState<"express" | "conferencia" | "historico">("express");

  // Express state: initialize from initialValue if provided
  const [expressInput, setExpressInput] = useState<string>(() => {
    if (typeof initialValue === "number" && !isNaN(initialValue)) {
      return initialValue.toFixed(2).replace(".", ",");
    }
    return "100,00";
  });
  const [operatorName, setOperatorName] = useState<string>(() => {
    try {
      return localStorage.getItem("pdv_last_operator_name") || "Operador(a) Principal";
    } catch {
      return "Operador(a) Principal";
    }
  });
  const [shift, setShift] = useState<string>("Manhã");
  const [observation, setObservation] = useState<string>("");

  // Detailed Bill/Coin counts
  const [counts, setCounts] = useState<Record<string, number>>({
    "200": 0,
    "100": 0,
    "50": 1,
    "20": 2,
    "10": 1,
    "5": 0,
    "2": 0,
    "1": 0,
    "0.5": 0,
    "0.25": 0,
    "0.1": 0,
    "0.05": 0
  });

  // History of openings
  const [openingHistory, setOpeningHistory] = useState<CashRegisterOpeningRecord[]>(() => {
    try {
      const saved = localStorage.getItem("pdv_cashier_opening_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sum of detailed bill and coins
  const totalCounted = useMemo(() => {
    let sum = 0;
    Object.entries(counts).forEach(([valStr, rawQty]) => {
      const val = parseFloat(valStr);
      const qty = Number(rawQty) || 0;
      if (!isNaN(val) && qty > 0) {
        sum += val * qty;
      }
    });
    return sum;
  }, [counts]);

  // Handle increment/decrement
  const updateCount = (key: string, delta: number) => {
    setCounts((prev) => {
      const current = prev[key] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: next };
    });
  };

  const setCountDirect = (key: string, qtyStr: string) => {
    const qty = parseInt(qtyStr, 10);
    setCounts((prev) => ({
      ...prev,
      [key]: isNaN(qty) ? 0 : Math.max(0, qty)
    }));
  };

  // Quick chip select
  const handleSelectQuickChip = (val: number) => {
    setExpressInput(val.toFixed(2).replace(".", ","));
  };

  // Save record to local history
  const recordOpening = (record: CashRegisterOpeningRecord) => {
    try {
      const updated = [record, ...openingHistory.slice(0, 29)];
      setOpeningHistory(updated);
      localStorage.setItem("pdv_cashier_opening_history", JSON.stringify(updated));
      localStorage.setItem("pdv_last_operator_name", record.operatorName);
    } catch (e) {
      console.error("Erro ao salvar histórico de abertura:", e);
    }
  };

  // Submit Express
  const handleSubmitExpress = () => {
    const cleanStr = expressInput.replace(/\./g, "").replace(",", ".");
    const val = parseFloat(cleanStr);
    const finalVal = isNaN(val) ? 0 : Math.max(0, val);

    const record: CashRegisterOpeningRecord = {
      id: `open_${Date.now()}`,
      timestamp: new Date().toLocaleString("pt-BR"),
      openingFloat: finalVal,
      operatorName: operatorName.trim() || "Operador(a)",
      shift,
      mode: "express",
      notes: observation.trim()
    };

    recordOpening(record);
    onConfirmOpen(finalVal, {
      operatorName: record.operatorName,
      shift: record.shift,
      mode: "express",
      notes: record.notes
    });
  };

  // Submit Conferencia
  const handleSubmitConferencia = () => {
    const record: CashRegisterOpeningRecord = {
      id: `open_${Date.now()}`,
      timestamp: new Date().toLocaleString("pt-BR"),
      openingFloat: totalCounted,
      operatorName: operatorName.trim() || "Operador(a)",
      shift,
      mode: "conferencia",
      billCounts: counts,
      notes: observation.trim()
    };

    recordOpening(record);
    onConfirmOpen(totalCounted, {
      operatorName: record.operatorName,
      shift: record.shift,
      mode: "conferencia",
      billCounts: counts,
      notes: record.notes
    });
  };

  // Print Thermal / A4 Receipt
  const handlePrintOpeningReceipt = (record?: CashRegisterOpeningRecord) => {
    const target = record || {
      id: `open_${Date.now()}`,
      timestamp: new Date().toLocaleString("pt-BR"),
      openingFloat: openingMode === "conferencia" ? totalCounted : (parseFloat(expressInput.replace(",", ".")) || 0),
      operatorName: operatorName.trim() || "Operador(a)",
      shift,
      mode: openingMode === "conferencia" ? "conferencia" : "express",
      billCounts: counts,
      notes: observation.trim()
    };

    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) return;

      const billsList = target.billCounts
        ? Object.entries(target.billCounts)
            .filter(([_, rawQ]) => Number(rawQ) > 0)
            .map(([val, rawQ]) => {
              const q = Number(rawQ);
              return `<tr><td>${q}x R$ ${parseFloat(val).toFixed(2).replace(".", ",")}</td><td style="text-align:right">R$ ${(parseFloat(val) * q).toFixed(2).replace(".", ",")}</td></tr>`;
            })
            .join("")
        : "";

      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Comprovante de Abertura de Caixa</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; color: #000; width: 280px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; font-size: 11px; }
            .sign { margin-top: 35px; border-top: 1px solid #000; text-align: center; font-size: 10px; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="center bold">${storeName || "CALCULADORA CÉREBRO PDV"}</div>
          <div class="center">COMPROVANTE DE ABERTURA DE CAIXA</div>
          <div class="center">${target.timestamp}</div>
          <div class="line"></div>
          <div><strong>Operador(a):</strong> ${target.operatorName}</div>
          <div><strong>Turno:</strong> ${target.shift}</div>
          <div><strong>Modo:</strong> ${target.mode === "conferencia" ? "Conferência Física" : "Abertura Rápida"}</div>
          ${target.notes ? `<div><strong>Obs:</strong> ${target.notes}</div>` : ""}
          <div class="line"></div>
          ${billsList ? `
            <div class="bold">DISCRIMINAÇÃO DE CÉDULAS & MOEDAS:</div>
            <table>${billsList}</table>
            <div class="line"></div>
          ` : ""}
          <div class="bold" style="font-size: 14px; text-align: right;">
            FUNDO INICIAL: R$ ${target.openingFloat.toFixed(2).replace(".", ",")}
          </div>
          <div class="line"></div>
          <div class="center" style="font-size: 10px;">
            Declaro ter conferido e recebido exatamente o valor acima descrito para o fundo de troco deste turno.
          </div>
          <div class="sign">Assinatura do(a) Operador(a) de Caixa</div>
          <div class="sign">Visto do Proprietário / Gerente</div>
        </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);

      showNotification("Comprovante enviado para impressão! 🖨️", "success");
    } catch (e: any) {
      showNotification("Erro ao imprimir: " + e.message, "error");
    }
  };

  // Share to WhatsApp
  const handleShareWhatsApp = (record?: CashRegisterOpeningRecord) => {
    const target = record || {
      id: `open_${Date.now()}`,
      timestamp: new Date().toLocaleString("pt-BR"),
      openingFloat: openingMode === "conferencia" ? totalCounted : (parseFloat(expressInput.replace(",", ".")) || 0),
      operatorName: operatorName.trim() || "Operador(a)",
      shift,
      mode: openingMode === "conferencia" ? "conferencia" : "express",
      billCounts: counts,
      notes: observation.trim()
    };

    let text = `*📋 TERMO DE ABERTURA DE CAIXA - ${storeName || "PDV"}*\n`;
    text += `⏰ *Data/Hora:* ${target.timestamp}\n`;
    text += `👤 *Operador(a):* ${target.operatorName}\n`;
    text += `🌅 *Turno:* ${target.shift}\n`;
    text += `💰 *FUNDO DE TROCO INICIAL:* R$ ${target.openingFloat.toFixed(2).replace(".", ",")}\n`;

    if (target.notes) {
      text += `📝 *Observação:* ${target.notes}\n`;
    }

    if (target.billCounts) {
      const activeItems = Object.entries(target.billCounts).filter(([_, rawQ]) => Number(rawQ) > 0);
      if (activeItems.length > 0) {
        text += `\n*Detalhamento das Cédulas/Moedas:*\n`;
        activeItems.forEach(([val, rawQ]) => {
          const q = Number(rawQ);
          text += `• ${q}x de R$ ${parseFloat(val).toFixed(2).replace(".", ",")} = R$ ${(parseFloat(val) * q).toFixed(2).replace(".", ",")}\n`;
        });
      }
    }

    text += `\n✅ _Fundo de troco conferido na gaveta e registrado no sistema com sucesso._`;

    try {
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    } catch {
      showNotification("Não foi possível abrir o WhatsApp!", "error");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-2 sm:px-4 animate-fadeIn">
      {/* Card Container Principal */}
      <div className="bg-slate-900 border-2 border-emerald-500/25 rounded-[2.5rem] p-5 sm:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header do Caixa com Ícone e Fechamento */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
              <Unlock className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                  Abertura de Caixa & Fundo de Troco 🌅
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                  isAlreadyOpen 
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}>
                  {isAlreadyOpen ? "● Caixa Aberto no Turno" : "Caixa Fechado"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {isAlreadyOpen
                  ? "Consulte ou reimprima o comprovante de abertura deste turno, envie no WhatsApp ou veja o histórico."
                  : "Defina o valor físico em dinheiro disponível na gaveta para iniciar as vendas com segurança."
                }
              </p>
            </div>
          </div>

          {/* Botão de Ajuda, Histórico e Fechar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpeningMode(openingMode === "historico" ? "express" : "historico")}
              className={`px-3.5 py-2 rounded-2xl text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border cursor-pointer ${
                openingMode === "historico"
                  ? "bg-purple-600 text-white border-purple-400 shadow-md"
                  : "bg-slate-950 hover:bg-slate-800 text-slate-300 border-white/5"
              }`}
            >
              <History className="w-3.5 h-3.5 text-purple-400" />
              <span>Histórico ({openingHistory.length})</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-white/10 transition-all cursor-pointer"
                title="Fechar Abertura de Caixa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Seleção de Modo: Rápido (Pequenos Comércios) vs Blindado/Conferência */}
        {openingMode !== "historico" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setOpeningMode("express")}
              className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                openingMode === "express"
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/40"
                  : "text-slate-400 hover:text-white border-transparent"
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-300" />
              <span>1. Modo Rápido / Básico (Express)</span>
            </button>

            <button
              type="button"
              onClick={() => setOpeningMode("conferencia")}
              className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                openingMode === "conferencia"
                  ? "bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-950/40"
                  : "text-slate-400 hover:text-white border-transparent"
              }`}
            >
              <Shield className="w-4 h-4 text-amber-300" />
              <span>2. Conferência de Cédulas (Blindagem)</span>
            </button>
          </div>
        )}

        {/* 3. Conteúdo por Modo */}
        {openingMode === "historico" ? (
          /* HISTÓRICO DE ABERTURAS */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-300">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Histórico de Aberturas Anteriores
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpeningMode("express")}
                className="text-[10.5px] font-black uppercase tracking-wider text-purple-300 hover:text-white underline cursor-pointer"
              >
                Voltar à Abertura
              </button>
            </div>

            {openingHistory.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/50 rounded-3xl border border-white/5 text-slate-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold uppercase tracking-wider">Nenhuma abertura registrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {openingHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-950 border border-white/5 hover:border-purple-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-black text-white">{item.timestamp}</span>
                        <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          {item.shift}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          Op: <strong className="text-slate-200">{item.operatorName}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Modo: <strong className="text-slate-300">{item.mode === "conferencia" ? "Contagem Cédula a Cédula" : "Valor Direto"}</strong>
                        {item.notes && <span className="ml-2 italic text-slate-500">"{item.notes}"</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-base font-black text-emerald-400 font-mono">
                        {formatCurrency(item.openingFloat)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintOpeningReceipt(item)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                          title="Reimprimir Comprovante"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(item)}
                          className="p-2 bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                          title="Reenviar no WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : openingMode === "express" ? (
          /* MODO RÁPIDO / BÁSICO (EXPRESS) */
          <div className="space-y-6 animate-fadeIn">
            {/* Explicação Rápida */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
              <Zap className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase text-emerald-300 tracking-wider">
                  Abertura Rápida para o Pequeno Comércio ⚡
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                  Para agilidade no balcão: toque em um dos botões rápidos ou defina o valor do troco e clique em abrir para começar a passar produtos imediatamente.
                </p>
              </div>
            </div>

            {/* Ações Rápidas de 1 Clique Direto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setExpressInput("0,00");
                  onConfirmOpen(0, {
                    operatorName: operatorName.trim() || "Operador(a)",
                    shift,
                    mode: "express",
                    notes: "Abertura direta sem troco inicial (R$ 0,00)"
                  });
                }}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/30 rounded-2xl flex items-center justify-center gap-2 text-slate-300 hover:text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>1 Toque: Começar Sem Troco (R$ 0,00)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExpressInput("100,00");
                  onConfirmOpen(100, {
                    operatorName: operatorName.trim() || "Operador(a)",
                    shift,
                    mode: "express",
                    notes: "Abertura rápida com troco padrão de R$ 100,00"
                  });
                }}
                className="p-3 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>1 Toque: Abrir com R$ 100,00 (Padrão)</span>
              </button>
            </div>

            {/* Chips de Valores Rápidos */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                Outros Valores Comuns de Fundo de Caixa:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {QUICK_FLOAT_OPTIONS.map((chip) => {
                  const isSelected = expressInput === chip.val.toFixed(2).replace(".", ",");
                  return (
                    <button
                      key={chip.val}
                      type="button"
                      onClick={() => handleSelectQuickChip(chip.val)}
                      className={`p-3 rounded-2xl font-black text-xs uppercase tracking-wide transition-all border cursor-pointer text-center ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/40 scale-[1.03]"
                          : "bg-slate-950 hover:bg-slate-800 text-slate-300 border-white/5"
                      }`}
                    >
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campos de Entrada: Valor + Operador + Turno */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Valor */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Valor do Fundo de Troco (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-mono font-black text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    value={expressInput}
                    onChange={(e) => setExpressInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500 pl-11 pr-4 py-3 rounded-2xl outline-none text-emerald-400 font-mono font-black text-lg tracking-wide transition-all shadow-inner"
                    placeholder="100,00"
                  />
                </div>
              </div>

              {/* Operador / Funcionário */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Operador(a) / Funcionário(a):
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    list="staff-suggestions"
                    className="w-full bg-slate-950 border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500 pl-10 pr-4 py-3 rounded-2xl outline-none text-white font-bold text-xs tracking-wide transition-all"
                    placeholder="Nome de quem opera o caixa"
                  />
                  <datalist id="staff-suggestions">
                    {staffList.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Turno */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Turno do Caixa:
                </label>
                <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/10">
                  {["Manhã 🌅", "Tarde ☀️", "Noite 🌙"].map((t) => {
                    const rawTurno = t.split(" ")[0];
                    const isSel = shift === rawTurno;
                    return (
                      <button
                        key={rawTurno}
                        type="button"
                        onClick={() => setShift(rawTurno)}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${
                          isSel ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Observação Inicial (Opcional):
              </label>
              <input
                type="text"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Peguei R$ 100 com o patrão em notas de 10 e 20"
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Botões de Ação do Modo Rápido */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSubmitExpress}
                className="flex-1 w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-5 h-5" />
                <span>Confirmar e Abrir Caixa Agora 🚀</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintOpeningReceipt()}
                className="px-4 py-4 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Imprimir Comprovante de Abertura"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Via</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareWhatsApp()}
                className="px-4 py-4 bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white border border-green-500/30 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Enviar Comprovante no WhatsApp do Patrão"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </button>
            </div>
          </div>
        ) : (
          /* MODO CONFERÊNCIA DETALHADA (PROTEÇÃO AO FUNCIONÁRIO) */
          <div className="space-y-6 animate-fadeIn">
            {/* Aviso de Proteção ao Funcionário */}
            <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
              <Shield className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-xs sm:text-sm font-black uppercase text-amber-300 tracking-wider">
                  Blindagem & Proteção do Operador de Caixa 🛡️
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                  Se faltar dinheiro ou houver divergência no fechamento no final do dia, muitas vezes quem acaba pagando o prejuízo do próprio bolso é a funcionária ou funcionário. Ao contar cada cédula e moeda aqui, o sistema gera o <strong className="text-amber-200">Termo Oficial de Abertura com Assinaturas e Envio no WhatsApp</strong>, comprovando matematicamente com quanto a gaveta iniciou e protegendo a equipe contra cobranças indevidas!
                </p>
              </div>
            </div>

            {/* Total Contado em Destaque Gigante */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  Total Físico Contado na Gaveta:
                </span>
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
                  {formatCurrency(totalCounted)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const empty: Record<string, number> = {};
                    Object.keys(counts).forEach((k) => (empty[k] = 0));
                    setCounts(empty);
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-white/5 cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Zerar Contagem</span>
                </button>
              </div>
            </div>

            {/* Grade de Cédulas */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cédulas em Papel (Notas Físicas):</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {BILL_DENOMINATIONS.map((bill) => {
                  const qty = counts[bill.val.toString()] || 0;
                  const subtotal = bill.val * qty;
                  return (
                    <div
                      key={bill.val}
                      className="p-3 bg-slate-950 border border-white/5 hover:border-emerald-500/30 rounded-2xl flex items-center justify-between gap-2 transition-all"
                    >
                      <div>
                        <span className={`text-xs font-black block ${bill.color}`}>
                          R$ {bill.val.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Subtotal: <strong className="text-white">{formatCurrency(subtotal)}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCount(bill.val.toString(), -1)}
                          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-black active:scale-95 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={qty === 0 ? "" : qty}
                          onChange={(e) => setCountDirect(bill.val.toString(), e.target.value)}
                          placeholder="0"
                          className="w-12 h-8 text-center bg-slate-900 border border-white/10 rounded-xl font-mono font-black text-sm text-white outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateCount(bill.val.toString(), 1)}
                          className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center font-black active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grade de Moedas */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Moedas de Troco:</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {COIN_DENOMINATIONS.map((coin) => {
                  const qty = counts[coin.val.toString()] || 0;
                  const subtotal = coin.val * qty;
                  return (
                    <div
                      key={coin.val}
                      className="p-3 bg-slate-950 border border-white/5 hover:border-amber-500/30 rounded-2xl flex items-center justify-between gap-2 transition-all"
                    >
                      <div>
                        <span className={`text-xs font-black block ${coin.color}`}>
                          R$ {coin.val.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Subtotal: <strong className="text-white">{formatCurrency(subtotal)}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCount(coin.val.toString(), -1)}
                          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-black active:scale-95 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={qty === 0 ? "" : qty}
                          onChange={(e) => setCountDirect(coin.val.toString(), e.target.value)}
                          placeholder="0"
                          className="w-12 h-8 text-center bg-slate-900 border border-white/10 rounded-xl font-mono font-black text-sm text-white outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateCount(coin.val.toString(), 1)}
                          className="w-8 h-8 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center font-black active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Identificação de Operador e Observações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Nome do(a) Operador(a) Responsável:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    list="staff-suggestions-conf"
                    className="w-full bg-slate-950 border border-white/10 hover:border-amber-500/30 focus:border-amber-500 pl-10 pr-4 py-3 rounded-2xl outline-none text-white font-bold text-xs tracking-wide transition-all"
                    placeholder="Nome completo do funcionário"
                  />
                  <datalist id="staff-suggestions-conf">
                    {staffList.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Turno de Trabalho:
                </label>
                <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/10">
                  {["Manhã 🌅", "Tarde ☀️", "Noite 🌙"].map((t) => {
                    const rawTurno = t.split(" ")[0];
                    const isSel = shift === rawTurno;
                    return (
                      <button
                        key={rawTurno}
                        type="button"
                        onClick={() => setShift(rawTurno)}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${
                          isSel ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Termo / Observação do Balcão:
              </label>
              <input
                type="text"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Recebido do proprietário em dinheiro trocado. Cédulas conferidas na presença do gerente."
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500 transition-all"
              />
            </div>

            {/* Ações Finais do Modo Conferência */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSubmitConferencia}
                className="flex-1 w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-[0.99] text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-5 h-5 text-slate-950" />
                <span>Salvar Termo & Abrir Caixa com {formatCurrency(totalCounted)} 🛡️</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintOpeningReceipt()}
                className="px-4 py-4 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Imprimir Comprovante de Abertura para Assinar"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Imprimir Termo</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareWhatsApp()}
                className="px-4 py-4 bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white border border-green-500/30 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Enviar Termo no WhatsApp do Proprietário"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
