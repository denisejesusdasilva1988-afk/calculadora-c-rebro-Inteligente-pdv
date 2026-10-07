import React, { useState } from "react";
import { 
  Printer, 
  Settings, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Sparkles, 
  RotateCcw, 
  Scissors, 
  Store, 
  FileText, 
  Smartphone, 
  Layers, 
  QrCode,
  Sliders,
  DollarSign,
  Eye,
  Bluetooth,
  Zap,
  Check,
  ShoppingCart,
  ArrowLeft
} from "lucide-react";
import { 
  PrinterConfig, 
  DEFAULT_PRINTER_CONFIG, 
  savePrinterConfig, 
  buildThermalReceiptHtml, 
  executeThermalPrint,
  isBluetoothPrintSupported,
  printViaBluetoothEscPos
} from "../utils/thermalPrinterHelper";

export interface PDVPrinterConfigViewProps {
  config: PrinterConfig;
  onSaveConfig: (newConfig: PrinterConfig) => void;
  showNotification: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onBackToSales?: () => void;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export function PDVPrinterConfigView({
  config: initialConfig,
  onSaveConfig,
  showNotification,
  onBackToSales,
  onClose,
  isEmbedded = false
}: PDVPrinterConfigViewProps) {
  const [localConfig, setLocalConfig] = useState<PrinterConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<"bobina" | "loja" | "preview" | "guia">("bobina");
  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const [isPrintingBt, setIsPrintingBt] = useState(false);
  const [btStatusMsg, setBtStatusMsg] = useState("");

  const handleUpdate = <K extends keyof PrinterConfig>(key: K, val: PrinterConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    savePrinterConfig(localConfig);
    onSaveConfig(localConfig);
    showNotification("Configurações da impressora e bobina gravadas com sucesso! 🖨️✅", "success");
    if (onClose) onClose();
  };

  const handleResetDefaults = () => {
    if (confirm("Deseja restaurar as configurações padrão recomendadas para bobina de 80mm?")) {
      const reset = { ...DEFAULT_PRINTER_CONFIG, storeName: localConfig.storeName, storeCnpjCpf: localConfig.storeCnpjCpf };
      setLocalConfig(reset);
      savePrinterConfig(reset);
      onSaveConfig(reset);
      showNotification("Configurações restauradas para o padrão 80mm! 🔄", "info");
    }
  };

  const handlePrintTest = () => {
    setIsPrintingTest(true);
    const testHtml = buildThermalReceiptHtml({
      config: localConfig,
      isTest: true
    });

    executeThermalPrint(
      testHtml,
      () => {
        setIsPrintingTest(false);
        showNotification("Enviando cupom de teste para a impressora bobina... 🖨️✨", "success");
      },
      (err) => {
        setIsPrintingTest(false);
        showNotification("Não foi possível enviar a impressão. Verifique se o navegador bloqueou pop-up.", "error");
      }
    );
  };

  const handlePrintBluetoothTest = async () => {
    setIsPrintingBt(true);
    setBtStatusMsg("Iniciando...");
    try {
      await printViaBluetoothEscPos(undefined, localConfig, (msg) => {
        setBtStatusMsg(msg);
      });
      showNotification("Cupom de teste enviado para a impressora Bluetooth! 📶🖨️", "success");
    } catch (err: any) {
      showNotification(err.message || "Erro na conexão Bluetooth.", "error");
    } finally {
      setIsPrintingBt(false);
      setBtStatusMsg("");
    }
  };

  const content = (
    <div className={`bg-slate-900 border border-emerald-500/30 rounded-3xl w-full flex flex-col shadow-2xl overflow-hidden text-left ${isEmbedded ? "min-h-[600px]" : "max-h-[94vh]"}`}>
      
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/70 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black uppercase text-white flex items-center gap-2">
              <span>Configurar Bobinas e Impressoras Térmicas</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Aba Ativa 🖨️
              </span>
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400">
              Ajuste tamanho de papel (58mm / 80mm), corte de guilhotina, margens, avanço e cabeçalho para impressão sem cortes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToSales && (
            <button
              type="button"
              onClick={onBackToSales}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Voltar para Vendas</span>
            </button>
          )}

          {onClose && !isEmbedded && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-white/5 shrink-0 px-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("bobina")}
          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "bobina"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Papel & Bobina</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("loja")}
          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "loja"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Dados da Loja</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "preview"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Visualizar Cupom 🧾</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("guia")}
          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "guia"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Guia: Não Cortar Bordas 💡</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="p-5 overflow-y-auto space-y-5 text-left text-xs leading-relaxed flex-1">
        
        {/* TAB 1: BOBINA & PRINT STYLING */}
        {activeTab === "bobina" && (
          <div className="space-y-4">
            {/* Paper Roll Width Selection */}
            <div>
              <label className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block mb-1.5">
                1. Largura da Bobina Térmica
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "58mm",
                    title: "58mm (2 Polegadas)",
                    desc: "Mini impressoras Bluetooth, maquininhas POS e impressoras portáteis (Área útil: 48mm / 384 pontos)",
                    badge: "Portátil / Compacta"
                  },
                  {
                    id: "80mm",
                    title: "80mm (3 Polegadas)",
                    desc: "Padrão de Balcão: Epson TM-T20X, Elgin i9/i7, Bematech MP-4200 TH, Daruma, etc. (Área: 72mm / 576 pontos)",
                    badge: "Padrão Recomendado"
                  },
                  {
                    id: "A4",
                    title: "A4 / Meia Folha",
                    desc: "Impressoras comuns de escritório (jato de tinta, laser ou folhas sulfites normais)",
                    badge: "Escritório"
                  }
                ].map(item => {
                  const isSelected = localConfig.printerType === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleUpdate("printerType", item.id as any)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/15 scale-[1.01]"
                          : "bg-slate-950 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-black text-sm text-white">{item.title}</span>
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            isSelected ? "bg-emerald-500 text-slate-950" : "bg-white/10 text-slate-400"
                          }`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">{item.desc}</p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-bold">
                        <span>{isSelected ? "Selecionado ✔️" : "Clique para escolher"}</span>
                        <span className="font-mono text-emerald-400">{item.id}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Font Size & Contrast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block mb-1.5">
                  2. Tamanho da Fonte da Bobina
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-white/10">
                  {[
                    { id: "pequena", label: "Pequena" },
                    { id: "media", label: "Média (Padrão)" },
                    { id: "grande", label: "Grande" }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleUpdate("fontSize", f.id as any)}
                      className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center ${
                        localConfig.fontSize === f.id
                          ? "bg-emerald-500 text-slate-950 shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 block">
                  {localConfig.fontSize === "pequena" ? "Econômica: cabe mais itens por centímetro de bobina." : localConfig.fontSize === "grande" ? "Legibilidade ampliada: letras maiores e fáceis de ler." : "Equilíbrio padrão ideal para comprovantes térmicos."}
                </span>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block mb-1.5">
                  3. Avanço de Papel / Espaço para Serrilha
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-white/10">
                  {[
                    { lines: 2, label: "2 Linhas (15mm)" },
                    { lines: 4, label: "4 Linhas (25mm)" },
                    { lines: 6, label: "6 Linhas (40mm)" }
                  ].map(fl => (
                    <button
                      key={fl.lines}
                      type="button"
                      onClick={() => handleUpdate("feedLines", fl.lines)}
                      className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center ${
                        localConfig.feedLines === fl.lines
                          ? "bg-emerald-500 text-slate-950 shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {fl.label}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 block">
                  Evita que a serrilha ou a guilhotina rasguem a mensagem ou o QR Code ao destacar.
                </span>
              </div>
            </div>

            {/* Automation Toggles */}
            <div className="pt-2 border-t border-white/5 space-y-2.5">
              <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">
                4. Recursos de Automação de Balcão & Guilhotina (ESC/POS)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Impressão Automática ao Concluir Venda */}
                <label className="flex items-center justify-between p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-all col-span-1 sm:col-span-2">
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-300 block">Imprimir Cupom Automaticamente ao Concluir Venda ⚡</span>
                      <span className="text-[9.5px] text-slate-400">Assim que a venda é finalizada no caixa, dispara a impressão na bobina sem precisar clicar de novo.</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localConfig.autoPrintOnSale}
                    onChange={(e) => handleUpdate("autoPrintOnSale", e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </label>

                {/* Guilhotina / Auto Cut */}
                <label className="flex items-center justify-between p-3 bg-slate-950 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all">
                  <div>
                    <span className="font-bold text-white block">Auto-Corte / Guilhotina Elétrica</span>
                    <span className="text-[9.5px] text-slate-500">Envia pulso ESC/POS para acionar a lâmina após imprimir</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localConfig.autoCut}
                    onChange={(e) => handleUpdate("autoCut", e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </label>

                {/* Abertura da Gaveta de Dinheiro */}
                <label className="flex items-center justify-between p-3 bg-slate-950 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all">
                  <div>
                    <span className="font-bold text-white block">Abrir Gaveta de Dinheiro Elétrica</span>
                    <span className="text-[9.5px] text-slate-500">Destrava a gaveta conectada via cabo RJ11 na impressora</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localConfig.openDrawer}
                    onChange={(e) => handleUpdate("openDrawer", e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </label>

                {/* Imprimir 2ª Via */}
                <label className="flex items-center justify-between p-3 bg-slate-950 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all">
                  <div>
                    <span className="font-bold text-white block">Imprimir 2ª Via Automática</span>
                    <span className="text-[9.5px] text-slate-500">1ª via para o Cliente + 2ª via para Cozinha/Controle Loja</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localConfig.printTwoCopies}
                    onChange={(e) => handleUpdate("printTwoCopies", e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </label>

                {/* QR Code de Autenticação */}
                <label className="flex items-center justify-between p-3 bg-slate-950 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all">
                  <div>
                    <span className="font-bold text-white block">QR Code no Cupom</span>
                    <span className="text-[9.5px] text-slate-500">Gera código QR para consulta e autenticação do comprovante</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localConfig.showQrCode}
                    onChange={(e) => handleUpdate("showQrCode", e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </label>

                {/* Alto Contraste Térmico */}
                <label className="flex items-center justify-between p-3 bg-slate-950 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all col-span-1 sm:col-span-2">
                  <div>
                    <span className="font-bold text-white block">Modo Alto Contraste Térmico (Negrito Extra)</span>
                    <span className="text-[9.5px] text-slate-500">Ideal se a impressora estiver com impressão fraca ou cabeça térmica desgastada</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localConfig.highContrast}
                    onChange={(e) => handleUpdate("highContrast", e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STORE DETAILS */}
        {activeTab === "loja" && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-950 border border-white/10 rounded-2xl space-y-3 shadow-inner">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                  Nome da Empresa / Estabelecimento no Cupom
                </label>
                <input
                  type="text"
                  value={localConfig.storeName}
                  onChange={(e) => handleUpdate("storeName", e.target.value)}
                  placeholder="Ex: Supermercado Central, Loja da Denise..."
                  className="w-full mt-1 bg-slate-900 border border-white/10 focus:border-emerald-400 px-3.5 py-2 rounded-xl text-xs font-bold text-white uppercase outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                    CNPJ ou CPF do Estabelecimento
                  </label>
                  <input
                    type="text"
                    value={localConfig.storeCnpjCpf}
                    onChange={(e) => handleUpdate("storeCnpjCpf", e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full mt-1 bg-slate-900 border border-white/10 focus:border-emerald-400 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                    Telefone / WhatsApp da Loja (Opcional)
                  </label>
                  <input
                    type="text"
                    value={localConfig.storePhone || ""}
                    onChange={(e) => handleUpdate("storePhone", e.target.value)}
                    placeholder="(00) 90000-0000"
                    className="w-full mt-1 bg-slate-900 border border-white/10 focus:border-emerald-400 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                  Endereço / Cidade da Loja (Opcional)
                </label>
                <input
                  type="text"
                  value={localConfig.storeAddress || ""}
                  onChange={(e) => handleUpdate("storeAddress", e.target.value)}
                  placeholder="Rua Comercial, 123 - Centro"
                  className="w-full mt-1 bg-slate-900 border border-white/10 focus:border-emerald-400 px-3.5 py-2 rounded-xl text-xs font-bold text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                  Mensagem de Agradecimento no Rodapé
                </label>
                <input
                  type="text"
                  value={localConfig.receiptFooterMsg}
                  onChange={(e) => handleUpdate("receiptFooterMsg", e.target.value)}
                  placeholder="Obrigado pela preferência! Volte sempre!"
                  className="w-full mt-1 bg-slate-900 border border-white/10 focus:border-emerald-400 px-3.5 py-2 rounded-xl text-xs font-bold text-white outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-2.5 text-[11px] text-emerald-300 leading-normal">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Esses dados são impressos de forma limpa no cabeçalho e rodapé do cupom, garantindo uma apresentação comercial idônea para o seu cliente.
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: REAL-TIME PREVIEW OF THE THERMAL RECEIPT */}
        {activeTab === "preview" && (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-slate-950 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Largura atual configurada: <strong className="text-emerald-400 uppercase">{localConfig.printerType}</strong>
              </span>
              <span className="text-slate-400">
                Fonte: <strong className="text-white uppercase">{localConfig.fontSize}</strong>
              </span>
            </div>

            {/* Realistic Paper Roll Container */}
            <div className="flex justify-center p-3 bg-slate-950/80 rounded-2xl border border-white/5 overflow-x-auto">
              <div 
                className={`bg-white text-slate-950 p-4 shadow-2xl font-mono text-left select-none relative ${
                  localConfig.printerType === "58mm" ? "w-[240px] text-[10px]" : localConfig.printerType === "80mm" ? "w-[310px] text-[11px]" : "w-[360px] text-xs"
                }`}
                style={{
                  fontWeight: localConfig.highContrast ? 700 : 500,
                  lineHeight: 1.25
                }}
              >
                {/* Serrilha / Tear visual */}
                <div className="border-b-2 border-dashed border-slate-400 pb-2 mb-2 text-center text-[9px] text-slate-600 font-bold">
                  --- INÍCIO DA BOBINA TÉRMICA ---
                </div>

                {/* Header */}
                <div className="text-center space-y-0.5">
                  <div className="font-black text-sm uppercase leading-tight">
                    {localConfig.storeName || "ESTABELECIMENTO COMERCIAL"}
                  </div>
                  {localConfig.storeCnpjCpf && (
                    <div className="text-[9px]">CNPJ/CPF: {localConfig.storeCnpjCpf}</div>
                  )}
                  {localConfig.storeAddress && (
                    <div className="text-[8.5px] text-slate-700">{localConfig.storeAddress}</div>
                  )}
                  {localConfig.storePhone && (
                    <div className="text-[8.5px] text-slate-700">TEL: {localConfig.storePhone}</div>
                  )}
                  <div className="text-[9px] font-black mt-1 uppercase">
                    *** COMPROVANTE DE TESTE ***
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-900 my-2" />

                {/* Meta */}
                <div className="text-[8.5px] flex justify-between">
                  <span>DATA: {new Date().toLocaleDateString("pt-BR")}</span>
                  <span>HORA: {new Date().toLocaleTimeString("pt-BR")}</span>
                </div>
                <div className="text-[8.5px] font-bold">CLIENTE: CONSUMIDOR FINAL</div>

                <div className="border-t border-dashed border-slate-900 my-2" />

                {/* Items */}
                <div className="space-y-1.5 text-[9px]">
                  <div className="flex justify-between font-bold border-b border-dashed border-slate-300 pb-0.5">
                    <span>ITEM / QTD</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <div className="font-bold">PÃO FRANCÊS TRADICIONAL</div>
                      <div className="text-[8px] text-slate-600">5 un x R$ 1,20</div>
                    </div>
                    <span className="font-bold">R$ 6,00</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <div className="font-bold">REFRIGERANTE LATA 350ML</div>
                      <div className="text-[8px] text-slate-600">2 un x R$ 5,50</div>
                    </div>
                    <span className="font-bold">R$ 11,00</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-900 my-2" />

                {/* Totals */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm font-black border-t border-b border-slate-900 py-1">
                    <span>TOTAL R$:</span>
                    <span>R$ 17,00</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span>PAGAMENTO:</span>
                    <span className="font-bold">DINHEIRO</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span>VALOR RECEBIDO:</span>
                    <span>R$ 20,00</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold">
                    <span>TROCO:</span>
                    <span>R$ 3,00</span>
                  </div>
                </div>

                {localConfig.showQrCode && (
                  <div className="text-center my-3">
                    <div className="w-16 h-16 bg-slate-950 text-white flex items-center justify-center mx-auto text-[8px] font-mono">
                      [QR CODE]
                    </div>
                    <div className="text-[7.5px] mt-1 text-slate-600">AUTENTICAÇÃO DO CUPOM</div>
                  </div>
                )}

                {/* Footer message */}
                <div className="border-t border-dashed border-slate-900 pt-2 text-center text-[9px] font-bold">
                  {localConfig.receiptFooterMsg || "Obrigado pela preferência!"}
                </div>

                {/* Paper feed indicator */}
                <div 
                  className="bg-slate-100 border-t border-dashed border-slate-300 mt-2 text-center text-[7.5px] text-slate-400 flex items-center justify-center gap-1"
                  style={{ height: `${(localConfig.feedLines || 4) * 8}px` }}
                >
                  <span>[Avanço de {localConfig.feedLines} linhas para corte sem rasgar]</span>
                </div>

                <div className="border-t-2 border-dashed border-slate-400 pt-1 text-center text-[8px] text-slate-600 font-bold">
                  --- CORTE / SERRILHA DA BOBINA ---
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STEP-BY-STEP BROWSER GUIDE (CRUCIAL FOR THERMAL COILS!) */}
        {activeTab === "guia" && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-2 text-amber-200">
              <div className="flex items-center gap-2 font-black text-xs uppercase text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                Regras de Ouro para Bobina Térmica Não Cortar o Texto!
              </div>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                Ao clicar em <strong>Imprimir Cupom</strong>, a janela de impressão do seu navegador (Google Chrome, Microsoft Edge ou Celular) será aberta. Para não sair cortado nas bordas nem com links do site, faça isso <strong>apenas uma vez</strong>:
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-950 border border-white/10 rounded-2xl flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">1</span>
                <div>
                  <h5 className="font-bold text-white text-xs">Destino / Impressora</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Selecione o nome da sua impressora de bobina instalada (Ex: <em>Epson TM-T20X, Elgin i9, POS-58, POS-80</em>). Não deixe em "Salvar como PDF".
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-white/10 rounded-2xl flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">2</span>
                <div>
                  <h5 className="font-bold text-white text-xs">Margens: Selecione "NENHUMA" (None) ⚠️</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Clique em <strong>Mais definições</strong> (More settings) e no campo <strong>Margens</strong> mude de "Padrão" para <strong className="text-emerald-400">"Nenhuma"</strong>. Isso garante que o valor dos itens e o total não sejam cortados na lateral direita!
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-white/10 rounded-2xl flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">3</span>
                <div>
                  <h5 className="font-bold text-white text-xs">Desmarque "Cabeçalhos e rodapés" ⚠️</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Desmarque a caixinha <strong>"Cabeçalhos e rodapés"</strong> para que a data do Windows e o link do site (URL) não saiam impressos no papel da bobina.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-white/10 rounded-2xl flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">4</span>
                <div>
                  <h5 className="font-bold text-white text-xs">Escala: Mantenha em 100% (Padrão)</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mantenha a escala em 100% para não distorcer o alinhamento das colunas da bobina.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrintTest}
            disabled={isPrintingTest}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-400 font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="Gera uma impressão de teste com régua de alinhamento para testar na sua bobina física agora"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>{isPrintingTest ? "Imprimindo..." : "🖨️ Testar Impressão na Bobina"}</span>
          </button>

          {isBluetoothPrintSupported() && (
            <button
              type="button"
              onClick={handlePrintBluetoothTest}
              disabled={isPrintingBt}
              className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Conectar e imprimir diretamente via Bluetooth ESC/POS sem abrir caixa de diálogo"
            >
              <Bluetooth className="w-4 h-4 text-cyan-400" />
              <span>{isPrintingBt ? (btStatusMsg || "Conectando...") : "Testar Bluetooth 📶"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetDefaults}
            className="p-2.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Restaurar valores padrão recomendados"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 justify-end">
          {onClose && !isEmbedded && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>Gravar Configurações</span>
          </button>
        </div>
      </div>

    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 text-white animate-in fade-in duration-200">
      <div className="max-w-3xl w-full">
        {content}
      </div>
    </div>
  );
}
