import React, { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  Laptop,
  Zap,
  Recycle,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  AlertTriangle,
  Lightbulb,
  Check,
  Plus,
  Trash2,
  Pencil,
  RotateCcw
} from "lucide-react";
import { motion } from "motion/react";

interface ComponentItem {
  id: string;
  name: string;
  category: "celular" | "notebook" | "eletro";
  estimatedValue: number;
  condition: "excelente" | "bom" | "precisa_teste";
  enabled: boolean;
}

const DEFAULT_COMPONENTS: Record<string, { name: string; estimatedValue: number }[]> = {
  celular: [
    { name: "Tela / Display Original Usado (Testado)", estimatedValue: 140 },
    { name: "Sub-placa Conector de Carga (Encaixe Rápido)", estimatedValue: 35 },
    { name: "Câmera Traseira Principal", estimatedValue: 50 },
    { name: "Câmera Frontal", estimatedValue: 25 },
    { name: "Bateria Original com Boa Saúde", estimatedValue: 45 },
    { name: "Alto-falante & Campainha", estimatedValue: 20 },
    { name: "Gaveta de Chip & Botões Laterais Flex", estimatedValue: 15 },
    { name: "Tampa Traseira & Lente da Câmera", estimatedValue: 25 }
  ],
  notebook: [
    { name: "Carregador / Fonte Original", estimatedValue: 65 },
    { name: "Pente de Memória RAM (DDR3 / DDR4)", estimatedValue: 55 },
    { name: "Unidade SSD ou HD de Armazenamento", estimatedValue: 60 },
    { name: "Placa Wi-Fi & Antenas Internas", estimatedValue: 30 },
    { name: "Teclado Original em Bom Estado", estimatedValue: 45 },
    { name: "Tela LED / LCD Usada (Sem Riscos)", estimatedValue: 130 },
    { name: "Dobradiças, Cabo Flat & WebCam", estimatedValue: 40 },
    { name: "Cooler & Dissipador de Calor", estimatedValue: 35 }
  ],
  eletro: [
    { name: "Magnetron / Motor Principal", estimatedValue: 80 },
    { name: "Placa Eletrônica de Comando / Relés", estimatedValue: 60 },
    { name: "Termostato / Fusível Térmico / Protetor", estimatedValue: 25 },
    { name: "Prato de Vidro / Hélice / Acessório Raro", estimatedValue: 40 },
    { name: "Cabo de Força Original Reforçado", estimatedValue: 20 },
    { name: "Microchaves de Segurança da Porta", estimatedValue: 25 }
  ]
};

export function TechRecyclingTradeCalculator({
  showNotification
}: {
  showNotification?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}) {
  const [activeTab, setActiveTab] = useState<"desmanche" | "base_troca" | "organizacao">("desmanche");
  const [deviceType, setDeviceType] = useState<"celular" | "notebook" | "eletro">("celular");
  const currentDeviceRef = useRef<"celular" | "notebook" | "eletro">("celular");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nome do aparelho sendo desmanchado (ex: "Moto G8 Play", "Notebook Dell i3", "Micro-ondas Brastemp")
  const [deviceName, setDeviceName] = useState<string>(() => {
    try {
      return localStorage.getItem("pdv_tech_device_name_celular") || "Celular / Smartphone Modelo de Teste";
    } catch {
      return "Celular / Smartphone Modelo de Teste";
    }
  });

  // State for Desmanche
  const [acquisitionCost, setAcquisitionCost] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("pdv_tech_acq_cost_celular");
      return stored ? Number(stored) : 30;
    } catch {
      return 30;
    }
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [components, setComponents] = useState<ComponentItem[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_tech_components_celular");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_COMPONENTS["celular"].map((c, idx) => ({
      id: `comp-cel-${idx}`,
      name: c.name,
      category: "celular",
      estimatedValue: c.estimatedValue,
      condition: "bom",
      enabled: true
    }));
  });

  // Salvar explicitamente
  const handleSaveDisassembly = () => {
    try {
      const curType = currentDeviceRef.current;
      localStorage.setItem(`pdv_tech_components_${curType}`, JSON.stringify(components));
      localStorage.setItem(`pdv_tech_device_name_${curType}`, deviceName);
      localStorage.setItem(`pdv_tech_acq_cost_${curType}`, String(acquisitionCost));
      setSaveStatus("Alterações salvas com sucesso!");
      setTimeout(() => setSaveStatus(null), 3000);
      if (showNotification) {
        showNotification(`Aparelho "${deviceName}" e ${components.length} peças salvos com sucesso! 💾✅`, "success");
      }
    } catch {
      if (showNotification) {
        showNotification("Erro ao salvar no dispositivo.", "error");
      }
    }
  };

  // Debounced auto-save for edits without race conditions on deviceType switch
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const curType = currentDeviceRef.current;
        localStorage.setItem(`pdv_tech_components_${curType}`, JSON.stringify(components));
        localStorage.setItem(`pdv_tech_device_name_${curType}`, deviceName);
        localStorage.setItem(`pdv_tech_acq_cost_${curType}`, String(acquisitionCost));
      } catch {}
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [components, deviceName, acquisitionCost]);

  const handleDeviceTypeChange = (nextType: "celular" | "notebook" | "eletro") => {
    if (nextType === deviceType) return;

    // 1. Flush and save current device data first before switching
    try {
      const prevType = currentDeviceRef.current;
      localStorage.setItem(`pdv_tech_components_${prevType}`, JSON.stringify(components));
      localStorage.setItem(`pdv_tech_device_name_${prevType}`, deviceName);
      localStorage.setItem(`pdv_tech_acq_cost_${prevType}`, String(acquisitionCost));
    } catch {}

    // 2. Update ref and state
    currentDeviceRef.current = nextType;
    setDeviceType(nextType);

    // 3. Load target device cost
    let loadedCost = nextType === "celular" ? 30 : nextType === "notebook" ? 50 : 20;
    try {
      const savedCost = localStorage.getItem(`pdv_tech_acq_cost_${nextType}`);
      if (savedCost !== null && !isNaN(Number(savedCost))) loadedCost = Number(savedCost);
    } catch {}
    setAcquisitionCost(loadedCost);

    // 4. Load target device name
    let loadedName =
      nextType === "celular"
        ? "Celular / Smartphone Modelo de Teste"
        : nextType === "notebook"
        ? "Notebook / Computador Usado"
        : "Eletrodoméstico / TV para Peças";
    try {
      const savedName = localStorage.getItem(`pdv_tech_device_name_${nextType}`);
      if (savedName) loadedName = savedName;
    } catch {}
    setDeviceName(loadedName);

    // 5. Load target device components safely
    let loadedComps: ComponentItem[] = (DEFAULT_COMPONENTS[nextType] || []).map((c, idx) => ({
      id: `comp-${nextType}-${idx}`,
      name: c.name,
      category: nextType,
      estimatedValue: c.estimatedValue,
      condition: "bom",
      enabled: true
    }));
    try {
      const stored = localStorage.getItem(`pdv_tech_components_${nextType}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedComps = parsed.map((item: any, idx: number) => ({
            id: item.id || `comp-${nextType}-${idx}`,
            name: String(item.name || "Peça"),
            category: nextType,
            estimatedValue: Number(item.estimatedValue) || 0,
            condition: item.condition || "bom",
            enabled: item.enabled !== false
          }));
        }
      }
    } catch {}
    setComponents(loadedComps);
  };

  const toggleComponent = (id: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const updateComponentName = (id: string, newName: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );
  };

  const updateComponentValue = (id: string, val: number) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estimatedValue: Math.max(0, val) } : c))
    );
  };

  const handleAddComponent = () => {
    const newId = `comp-${deviceType}-${Date.now()}`;
    const defaultLabel =
      deviceType === "celular"
        ? "Nova Peça Celular (ex: Tampa Traseira, Flex Power)"
        : deviceType === "notebook"
        ? "Nova Peça Notebook (ex: Cabo Flat, Placa Wi-Fi)"
        : "Nova Peça Eletro (ex: Hélice, Termostato)";

    const newComp: ComponentItem = {
      id: newId,
      name: defaultLabel,
      category: deviceType,
      estimatedValue: 35,
      condition: "bom",
      enabled: true
    };
    setComponents((prev) => [newComp, ...prev]);
    if (showNotification) {
      showNotification("Nova peça adicionada! Digite o nome no campo de texto ✍️", "success");
    }
  };

  const handleDeleteComponent = (id: string, compName: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    if (showNotification) {
      showNotification(`Peça "${compName}" removida da lista. 🗑️`, "info");
    }
  };

  const handleResetToDefaults = () => {
    try {
      localStorage.removeItem(`pdv_tech_components_${deviceType}`);
    } catch {}
    setComponents(
      DEFAULT_COMPONENTS[deviceType].map((c, idx) => ({
        id: `comp-${deviceType}-${idx}`,
        name: c.name,
        category: deviceType,
        estimatedValue: c.estimatedValue,
        condition: "bom",
        enabled: true
      }))
    );
    if (showNotification) {
      showNotification("Lista de peças padrão restaurada com sucesso! 🔄", "info");
    }
  };

  // Desmanche math
  const totalRecoveredPartsValue = components
    .filter((c) => c.enabled)
    .reduce((acc, c) => acc + c.estimatedValue, 0);

  const netDisassemblyProfit = totalRecoveredPartsValue - acquisitionCost;
  const roiPct =
    acquisitionCost > 0
      ? ((netDisassemblyProfit / acquisitionCost) * 100).toFixed(0)
      : "1000+";

  // State for Base de Troca
  const [tradeServiceName, setTradeServiceName] = useState<string>(() => {
    try {
      return localStorage.getItem("pdv_tech_trade_service") || "Conserto / Reparo Geral";
    } catch {
      return "Conserto / Reparo Geral";
    }
  });
  const [tradeDeviceName, setTradeDeviceName] = useState<string>(() => {
    try {
      return localStorage.getItem("pdv_tech_trade_device") || "Aparelho Antigo do Cliente (Entrada)";
    } catch {
      return "Aparelho Antigo do Cliente (Entrada)";
    }
  });
  const [repairServiceValue, setRepairServiceValue] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("pdv_tech_trade_service_val");
      return stored ? Number(stored) : 120;
    } catch {
      return 120;
    }
  });
  const [tradeDiscountGiven, setTradeDiscountGiven] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("pdv_tech_trade_discount");
      return stored ? Number(stored) : 40;
    } catch {
      return 40;
    }
  });
  const [estimatedPartsFromTradeDevice, setEstimatedPartsFromTradeDevice] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("pdv_tech_trade_parts_val");
      return stored ? Number(stored) : 200;
    } catch {
      return 200;
    }
  });

  const [tradeSaveStatus, setTradeSaveStatus] = useState<string | null>(null);

  const handleSaveTrade = () => {
    try {
      localStorage.setItem("pdv_tech_trade_service", tradeServiceName);
      localStorage.setItem("pdv_tech_trade_device", tradeDeviceName);
      localStorage.setItem("pdv_tech_trade_service_val", String(repairServiceValue));
      localStorage.setItem("pdv_tech_trade_discount", String(tradeDiscountGiven));
      localStorage.setItem("pdv_tech_trade_parts_val", String(estimatedPartsFromTradeDevice));
      setTradeSaveStatus("Simulação de troca salva com sucesso!");
      setTimeout(() => setTradeSaveStatus(null), 3500);
      if (showNotification) {
        showNotification("Dados da base de troca salvos com sucesso! 💾🤝", "success");
      }
    } catch {
      if (showNotification) {
        showNotification("Erro ao salvar simulação de troca.", "error");
      }
    }
  };

  const cashCollectedFromClient = Math.max(0, repairServiceValue - tradeDiscountGiven);
  const totalCombinedGain = cashCollectedFromClient + estimatedPartsFromTradeDevice;
  const extraGainComparedToCashOnly = totalCombinedGain - repairServiceValue;

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-left">
      {/* BANNER DE SABEDORIA DA OFICINA & INTELIGÊNCIA COMERCIAL */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-emerald-500/30">
                <Recycle className="w-3.5 h-3.5" />
                Economia Circular & Sucata de Ouro
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                Segredo dos Técnicos Prósperos
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              Banco de Peças, Base de Troca & Desmanche Lucrativo
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed font-medium">
              Aparelhos com defeito, doações e trocas não são lixo nem entulho:{" "}
              <strong className="text-emerald-300">são dinheiro limpo e peças originais raras</strong>. 
              Edite o nome de cada peça, altere valores de mercado, simule abatimentos e organize seu estoque com total facilidade!
            </p>
          </div>
        </div>

        {/* SUB-MENU TABS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
          <button
            type="button"
            onClick={() => setActiveTab("desmanche")}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === "desmanche"
                ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/40 font-black"
                : "bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-900"
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === "desmanche" ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-300"}`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wide">1. Desmanche Lucrativo</div>
              <div className={`text-[10px] ${activeTab === "desmanche" ? "text-emerald-100" : "text-slate-400"}`}>
                Editar nomes e valores peça por peça
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("base_troca")}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === "base_troca"
                ? "bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40 font-black"
                : "bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-900"
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === "base_troca" ? "bg-white/20 text-white" : "bg-cyan-500/20 text-cyan-300"}`}>
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wide">2. Base de Troca com Cliente</div>
              <div className={`text-[10px] ${activeTab === "base_troca" ? "text-cyan-100" : "text-slate-400"}`}>
                Desconto no serviço + lucro dobrado
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("organizacao")}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === "organizacao"
                ? "bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-900/40 font-black"
                : "bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-900"
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === "organizacao" ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-300"}`}>
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wide">3. Organização sem Bagunça</div>
              <div className={`text-[10px] ${activeTab === "organizacao" ? "text-amber-100" : "text-slate-400"}`}>
                Gaveteiros, parcerias e reciclagem
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ABA 1: DESMANCHE LUCRATIVO */}
      {activeTab === "desmanche" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Seletor de Tipo de Aparelho */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Escolha o Tipo de Aparelho para Desmanchar:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleDeviceTypeChange("celular")}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  deviceType === "celular"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Celular / Smartphone
              </button>
              <button
                type="button"
                onClick={() => handleDeviceTypeChange("notebook")}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  deviceType === "notebook"
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Laptop className="w-4 h-4" />
                Notebook / PC
              </button>
              <button
                type="button"
                onClick={() => handleDeviceTypeChange("eletro")}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  deviceType === "eletro"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-400"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="w-4 h-4" />
                Eletrodoméstico / TV
              </button>
            </div>
          </div>

          {/* Nome Editável do Aparelho Desmanchado */}
          <div className="bg-slate-950 p-4.5 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                Nome do Aparelho que Você Está Desmanchando (Editável):
              </label>
              <span className="text-[9.5px] text-slate-400">Personalize o modelo exato</span>
            </div>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Ex: Samsung Galaxy A10 Preto, Moto G8 Power, Notebook Dell Inspiron 15, Micro-ondas Brastemp..."
              className="w-full bg-slate-900 border border-white/10 focus:border-emerald-400 rounded-xl px-3.5 py-2 text-sm font-bold text-white outline-none transition-all"
            />
          </div>

          {/* Cards de Resumo Financeiro do Desmanche */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-slate-950 p-4.5 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Custo de Aquisição (ou Valor Pago ao Catador/Cliente)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={acquisitionCost}
                  onChange={(e) => setAcquisitionCost(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-lg font-black text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Se ganhou do cliente ou doação, digite 0.
              </p>
            </div>

            <div className="bg-slate-950 p-4.5 rounded-2xl border border-emerald-500/30 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Valor Total das Peças Boas Recuperadas
              </span>
              <div className="text-2xl font-black text-emerald-400">
                R$ {totalRecoveredPartsValue.toFixed(2)}
              </div>
              <p className="text-[10.5px] text-slate-300 font-medium">
                Soma das {components.filter((c) => c.enabled).length} peças marcadas como aproveitáveis.
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-950 to-slate-900 p-4.5 rounded-2xl border border-emerald-400/40 space-y-1 shadow-lg">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center justify-between">
                <span>Lucro Líquido Potencial</span>
                <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-black text-[9px]">
                  +{roiPct}% ROI
                </span>
              </span>
              <div className="text-2xl font-black text-white">
                R$ {netDisassemblyProfit.toFixed(2)}
              </div>
              <p className="text-[10.5px] text-emerald-200/80 font-medium">
                Transformando sucata em faturamento direto no balcão!
              </p>
            </div>
          </div>

          {/* Lista de Peças com Nome Editável, Checkbox, Preço e Exclusão */}
          <div className="bg-slate-950 p-5 rounded-3xl border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Peças Aproveitáveis (Toque no nome para editar ✍️):
                </h3>
                <p className="text-[10.5px] text-slate-400">
                  Você pode renomear cada peça, trocar os valores, excluir ou adicionar novas peças.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveDisassembly}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30"
                  title="Salvar alterações de nomes e preços das peças permanentemente"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>💾 Salvar Peças & Preços</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 active:scale-95 text-emerald-400 font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nova Peça</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs uppercase rounded-xl border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                  title="Restaurar a lista padrão de peças"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão</span>
                </button>
              </div>
            </div>

            {saveStatus && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {saveStatus}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {components.map((comp) => (
                <div
                  key={comp.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    comp.enabled
                      ? "bg-slate-900/90 border-emerald-500/40 text-white shadow-sm"
                      : "bg-slate-950/50 border-white/5 text-slate-500 opacity-60"
                  }`}
                >
                  {/* Left: Checkbox + Editable Name */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => toggleComponent(comp.id)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                        comp.enabled
                          ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm"
                          : "border-white/20 bg-slate-800 text-transparent"
                      }`}
                      title={comp.enabled ? "Peça marcada como aproveitável" : "Peça danificada / descartada"}
                    >
                      {comp.enabled && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 bg-slate-950/80 border border-white/10 hover:border-emerald-500/50 focus-within:border-emerald-400 rounded-xl px-2.5 py-1.5 transition-all">
                        <Pencil className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
                        <input
                          type="text"
                          value={comp.name}
                          onChange={(e) => updateComponentName(comp.id, e.target.value)}
                          placeholder="Digite o nome da peça..."
                          className="w-full bg-transparent text-xs font-bold text-white outline-none placeholder:text-slate-500"
                        />
                      </div>
                      <div className="text-[9.5px] text-slate-400 flex items-center gap-1.5 px-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${comp.enabled ? "bg-emerald-400" : "bg-slate-500"}`} />
                        <span>{comp.enabled ? "Aproveitável para reposição/venda" : "Danificada ou descartada"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price + Delete Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <div className="flex items-center gap-1 bg-slate-950/90 px-2.5 py-1.5 rounded-xl border border-white/10">
                      <span className="text-[11px] text-emerald-400 font-bold">R$</span>
                      <input
                        type="number"
                        min="0"
                        value={comp.estimatedValue}
                        disabled={!comp.enabled}
                        onChange={(e) => updateComponentValue(comp.id, Number(e.target.value) || 0)}
                        className="w-16 bg-transparent text-xs font-black text-white text-right outline-none disabled:opacity-40"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteComponent(comp.id, comp.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                      title="Excluir esta peça da lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/20 p-3 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-200">
              <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Dica de Mestre:</strong> Peças originais retiradas de aparelhos autênticos (como telas, baterias e placas) possuem durabilidade superior a peças paralelas. Seus clientes pagam com satisfação por uma peça original testada!
              </span>
            </div>

            {/* BARRA INFERIOR DE SALVAMENTO */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Total de peças: <strong className="text-emerald-400">{Array.isArray(components) ? components.length : 0}</strong> | Aproveitáveis:{" "}
                <strong className="text-white">
                  {Array.isArray(components) ? components.filter((c) => c && c.enabled).length : 0}
                </strong>
              </div>
              <button
                type="button"
                onClick={handleSaveDisassembly}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-emerald-500/25"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>💾 Salvar Peças de {(deviceName || "Aparelho").split("(")[0].trim() || "Aparelho"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ABA 2: SIMULADOR DE BASE DE TROCA */}
      {activeTab === "base_troca" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">
                  Fidelização & Lucro Oculto
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-cyan-400" />
                  Como Lucrar Mais Aceitando Aparelhos Quebrados na Troca
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Quando o cliente acha o conserto caro ou está sem dinheiro, oferecer abatimento aceitando um celular ou eletrodoméstico quebrado que ele ia jogar no lixo é a melhor estratégia de vendas:
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveTrade}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/30 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>💾 Salvar Simulação de Troca</span>
              </button>
            </div>

            {tradeSaveStatus && (
              <div className="p-3 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {tradeSaveStatus}
              </div>
            )}

            {/* Nomes Editáveis dos Itens na Troca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-900/60 rounded-2xl border border-white/5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-cyan-400 flex items-center gap-1">
                  <Pencil className="w-3 h-3" />
                  Nome do Serviço / Conserto Realizado:
                </label>
                <input
                  type="text"
                  value={tradeServiceName}
                  onChange={(e) => setTradeServiceName(e.target.value)}
                  placeholder="Ex: Troca de Tela Frontal, Reparo de Placa, Formatação..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                  <Pencil className="w-3 h-3" />
                  Nome do Aparelho que o Cliente Deu na Troca:
                </label>
                <input
                  type="text"
                  value={tradeDeviceName}
                  onChange={(e) => setTradeDeviceName(e.target.value)}
                  placeholder="Ex: Samsung A10 Quebrado, Micro-ondas antigo, Notebook velho..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Valor Normal do Conserto (Mão de Obra + Peça)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    min="10"
                    value={repairServiceValue}
                    onChange={(e) => setRepairServiceValue(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-base font-black text-white focus:border-cyan-500 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Preço de tabela que você cobraria 100% em dinheiro.
                </p>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 space-y-2">
                <label className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
                  Desconto / Abatimento Dado pelo Aparelho do Cliente
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cyan-400 font-bold">R$</span>
                  <input
                    type="number"
                    min="0"
                    value={tradeDiscountGiven}
                    onChange={(e) => setTradeDiscountGiven(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-base font-black text-cyan-300 focus:border-cyan-500 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  O cliente paga apenas a diferença em dinheiro vivo.
                </p>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 space-y-2">
                <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Valor Estimado de Peças no Aparelho Recebido
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-bold">R$</span>
                  <input
                    type="number"
                    min="0"
                    value={estimatedPartsFromTradeDevice}
                    onChange={(e) => setEstimatedPartsFromTradeDevice(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-base font-black text-emerald-400 focus:border-emerald-500 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Telas, conectores, motores ou revenda consertado.
                </p>
              </div>
            </div>

            {/* Resultado Comparativo da Estratégia */}
            <div className="bg-gradient-to-br from-slate-900 to-cyan-950/40 p-5 rounded-2xl border border-cyan-500/30 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
                  <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Dinheiro Vivo no Bolso</span>
                  <div className="text-xl font-black text-white mt-1">R$ {cashCollectedFromClient.toFixed(2)}</div>
                  <span className="text-[10px] text-slate-400">Pago pelo cliente na hora</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
                  <span className="text-[9.5px] uppercase font-bold text-emerald-400 block">Estoque de Peças Ganho</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">R$ {estimatedPartsFromTradeDevice.toFixed(2)}</div>
                  <span className="text-[10px] text-slate-400">Pronto para consertos futuros</span>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-400/40">
                  <span className="text-[9.5px] uppercase font-black text-cyan-300 block">Faturamento Real Total</span>
                  <div className="text-2xl font-black text-white mt-1">R$ {totalCombinedGain.toFixed(2)}</div>
                  <span className="text-[10px] text-cyan-300 font-bold flex items-center justify-center sm:justify-start gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +R$ {extraGainComparedToCashOnly.toFixed(2)} a mais que o normal!
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/90 p-4 rounded-xl border border-white/10 space-y-2 text-xs text-slate-300">
                <h4 className="font-black text-white text-xs uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Por que essa estratégia é imbatível?
                </h4>
                <ul className="space-y-1.5 pl-4 list-disc text-slate-300">
                  <li>
                    <strong>O cliente fica maravilhado:</strong> Ele economizou R$ {tradeDiscountGiven.toFixed(2)} dando uma "tralha" que estava encostada na gaveta.
                  </li>
                  <li>
                    <strong>Você não perdeu o serviço:</strong> Em vez de o cliente desistir por falta de dinheiro, você fechou o negócio e ainda garantiu peças valiosas para atender outros clientes com margem máxima.
                  </li>
                  <li>
                    <strong>Fidelidade eterna:</strong> Na próxima vez que ele ou a família precisar de conserto, ele volta direto para você.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ABA 3: ORGANIZAÇÃO SEM BAGUNÇA & PARCERIA COM RECICLADORES */}
      {activeTab === "organizacao" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Como Lucrar com Sucata sem Acúmulo de Bagunça (Estilo Loja Organizada) */}
            <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Como Guardar Peças sem Bagunça na Loja
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    O segredo para uma bancada impecável e lucrativa
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
                  <span className="font-black text-amber-400 block text-xs">
                    1. Desmonte Imediato (Regra do Mesmo Dia)
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Nunca empilhe carcaças inteiras na frente da loja. Ao receber o aparelho, desmonte-o na hora: retire a tela, placa de carga e bateria. Descarte a carcaça inútil para reciclagem no mesmo dia.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
                  <span className="font-black text-amber-400 block text-xs">
                    2. Gaveteiros Plásticos & Saquinhos Zip-Lock
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Guarde as peças em saquinhos transparentes com fita crepe marcando o modelo (ex: "Display Moto G8 - Original"). Coloque em gaveteiros por marca: Gaveta Motorola, Gaveta Samsung, Gaveta iPhone, Gaveta Fontes.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
                  <span className="font-black text-amber-400 block text-xs">
                    3. Local Separado ou Armário Fechado
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Deixe a loja e o balcão limpos como uma vitrine de shopping. O estoque de peças usadas fica guardado em caixas organizadoras numeradas no fundo da bancada.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: A Lição da Parceria com Catadores e Recicladores */}
            <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
                  <Recycle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Parceria com Catadores & Recicladores
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Quem faz jogo duro perde a fonte de ouro
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/20 space-y-1">
                  <span className="font-black text-emerald-400 block text-xs">
                    1. Catadores encontram os melhores aparelhos
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Pessoas ricas e condomínios descartam notebooks, TVs de LED e celulares quase novos com defeitos simples. O catador e o reciclador são quem tem acesso a isso primeiro!
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/20 space-y-1">
                  <span className="font-black text-emerald-400 block text-xs">
                    2. Nunca Faça Jogo Duro ou Seja Mesquinho
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    O técnico que quer tudo de graça e cobra caro por qualquer favor perde a parceria. Conserte a panela ou o ventilador do reciclador com carinho ou pague um valor justo pelos aparelhos.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/20 space-y-1">
                  <span className="font-black text-emerald-400 block text-xs">
                    3. Torne-se o Ponto Oficial de Entrega
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Quando você trata os parceiros da comunidade com respeito e gratidão, eles nunca mais vendem sucata eletrônica para outro técnico. Tudo chega primeiro nas suas mãos!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
