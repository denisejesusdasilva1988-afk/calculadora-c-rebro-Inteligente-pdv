import React, { useState, useEffect } from 'react';
import { Pencil, CheckCircle2, ChevronRight, Trash2, Calendar, Folder, FolderPlus, Download, Save, X, Plus, Sparkles, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface SavedExcelSheet {
  id: string;
  title: string;
  folder: string;
  date: string;
  rows: any[];
  budget: string;
  total: number;
  createdAt: number;
}

interface PlannerProps {
  inputText: string;
  setInputText: (val: string) => void;
  setNotepadMode: (mode: any) => void;
  budget: string;
  setBudget: (val: string) => void;
  balance: number;
  excelRows: any[];
  updateExcelRow: (id: string, field: string, value: any) => void;
  removeExcelRow: (id: string) => void;
  formatCurrency: (val: number) => string;
  editingField: any;
  setEditingField: (val: any) => void;
  excelTotal: number;
  onAddToAgenda?: (amount: number) => void;
}

export const PlannerModule = React.memo(({
  inputText,
  setInputText,
  setNotepadMode,
  budget,
  setBudget,
  balance,
  excelRows,
  updateExcelRow,
  removeExcelRow,
  formatCurrency,
  editingField,
  setEditingField,
  excelTotal,
  onAddToAgenda
}: PlannerProps) => {
  // --- Dedicated Saved Folders Exclusively for Calculadora Nota Excel ---
  const [savedExcelSheets, setSavedExcelSheets] = useState<SavedExcelSheet[]>(() => {
    try {
      const stored = localStorage.getItem("notepad_excel_saved_sheets");
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [];
  });

  const [isExcelFoldersOpen, setIsExcelFoldersOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveFolder, setSaveFolder] = useState("Planilhas de Compras");
  const [selectedFolderTab, setSelectedFolderTab] = useState("all");
  const [newCustomFolderInput, setNewCustomFolderInput] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Default and custom folders created in the Excel Calculator
  const [excelFoldersList, setExcelFoldersList] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("notepad_excel_folders_list");
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return ["Planilhas de Compras", "Cotações Fornecedores", "Despesas do Mês", "Orçamentos Excel", "Geral"];
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem("notepad_excel_saved_sheets", JSON.stringify(savedExcelSheets));
  }, [savedExcelSheets]);

  useEffect(() => {
    localStorage.setItem("notepad_excel_folders_list", JSON.stringify(excelFoldersList));
  }, [excelFoldersList]);

  // Handle Save Current Excel Sheet
  const handleSaveCurrentSheet = () => {
    const title = saveTitle.trim() || `Planilha Excel #${savedExcelSheets.length + 1}`;
    const newSheet: SavedExcelSheet = {
      id: `excel_sheet_${Date.now()}`,
      title,
      folder: saveFolder,
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      rows: JSON.parse(JSON.stringify(excelRows)),
      budget: budget,
      total: excelTotal,
      createdAt: Date.now()
    };

    setSavedExcelSheets(prev => [newSheet, ...prev]);
    setIsSaveModalOpen(false);
    setSaveTitle("");
    alert(`Planilha "${title}" salva com sucesso na pasta "${saveFolder}"! 💾📊`);
  };

  // Handle Load Sheet into Calculator
  const handleLoadSheet = (sheet: SavedExcelSheet) => {
    if (confirm(`Deseja carregar a planilha "${sheet.title}" (${sheet.rows.length} itens)? Os dados atuais serão substituídos.`)) {
      // Rebuild rows into calculator
      sheet.rows.forEach(r => {
        updateExcelRow(r.id, "name", r.name);
        updateExcelRow(r.id, "price", r.price);
        updateExcelRow(r.id, "qty", r.qty);
        updateExcelRow(r.id, "unitType", r.unitType);
        updateExcelRow(r.id, "checked", r.checked);
      });
      setBudget(sheet.budget || "");
      setIsExcelFoldersOpen(false);
      alert(`Planilha "${sheet.title}" carregada com sucesso na Calculadora Nota Excel! ⚡`);
    }
  };

  // Handle Delete Sheet
  const handleDeleteSheet = (id: string, title: string) => {
    if (confirm(`Excluir a planilha "${title}" permanentemente?`)) {
      setSavedExcelSheets(prev => prev.filter(s => s.id !== id));
    }
  };

  // Handle Export to CSV for Excel
  const handleExportCSV = (sheet?: SavedExcelSheet) => {
    const targetRows = sheet ? sheet.rows : excelRows;
    const title = sheet ? sheet.title : "Calculadora_Nota_Excel";
    let csv = "Linha;Item;Quantidade;Unidade;Preco_Unitario;Total_Item\n";
    targetRows.forEach((r: any, idx: number) => {
      if (r.name) {
        const itemTotal = r.unitType === 'g' ? (r.qty / 1000) * r.price : r.qty * r.price;
        csv += `${idx + 1};"${r.name.replace(/"/g, '""')}";${r.qty};${r.unitType};${r.price.toFixed(2).replace('.', ',')};${itemTotal.toFixed(2).replace('.', ',')}\n`;
      }
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered sheets based on folder tab
  const filteredSheets = savedExcelSheets.filter(s => {
    if (selectedFolderTab === "all") return true;
    return s.folder === selectedFolderTab;
  });
  return (
    <motion.div
      key="excel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white min-h-[60vh] pb-60"
    >
      {/* 📁 Dedicated Folders Toolbar Exclusively for Calculadora Nota Excel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/20 p-4 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Calculadora Nota & Excel 📊
                </span>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {savedExcelSheets.length} planilhas salvas
                </span>
              </div>
              <p className="text-[9.5px] text-slate-400 font-medium">
                Pastas salvas dedicadas exclusivamente para a Calculadora Nota Excel
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar em Pasta 💾</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExcelFoldersOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Pastas Salvas ({savedExcelSheets.length}) 📂</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportCSV()}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all border border-white/10 cursor-pointer"
              title="Baixar planilha em formato CSV compatível com Microsoft Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-6 border-b border-slate-200">
        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Pencil className="w-3 h-3" /> Digite ou Fale sua Lista
        </h4>
        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ex: Pão 5,00\nArroz 20,00\nCerveja 12,00 x 3"
          className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 font-bold text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 outline-none transition-all min-h-[180px] text-2xl shadow-inner md:text-3xl"
        />
        
        {inputText.trim().length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setNotepadMode("revisão")}
              className="w-full bg-emerald-600 text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-black uppercase text-[9px] tracking-widest shadow-xl active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Verificar Cesta
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onAddToAgenda && onAddToAgenda(excelTotal)}
              className="w-full bg-emerald-600 text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-black uppercase text-[9px] tracking-widest shadow-xl active:scale-95 transition-all"
            >
              <Calendar className="w-4 h-4" />
              Agendar Valor
            </motion.button>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
         <div className="flex flex-col">
            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Quanto você tem? (R$)</h3>
            <div className="flex items-center gap-2">
               <span className="text-white font-black text-xl">R$</span>
               <input 
                 type="text"
                 inputMode="decimal"
                 placeholder="0,00"
                 value={budget === "" ? "" : budget.replace(".", ",")}
                 onChange={(e) => {
                   const raw = e.target.value.replace(",", ".");
                   if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                     setBudget(raw);
                   }
                 }}
                 className="bg-transparent border-none outline-none text-white font-black text-3xl w-40 placeholder:text-slate-700"
               />
            </div>
         </div>
         <div className="flex flex-col items-end">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{balance < 0 ? "Saldo Excedido" : "Saldo Livre"}</p>
            <p className={`text-xl font-black mono-display ${balance < 0 ? "text-red-500" : "text-green-500"}`}>
               {formatCurrency(Math.abs(balance))}
            </p>
         </div>
      </div>

      <div className="bg-slate-100 border-b border-slate-300 flex items-center h-14 text-[12px] font-black uppercase text-slate-800 tracking-widest sticky top-0 z-20 shadow-sm px-1">
        <div className="w-10 text-center border-r border-slate-200"><CheckCircle2 className="w-4 h-4 mx-auto" /></div>
        <div className="w-[8%] text-center border-r border-slate-200">#</div>
        <div className="flex-grow pl-3">Item / Descrição</div>
        <div className="w-10 text-center border-l border-slate-200">Qtd</div>
        <div className="w-10 text-center border-l border-slate-200">Unid</div>
        <div className="w-34 text-right pr-3 border-l border-slate-200">Preço (R$)</div>
        <div className="w-34 text-right pr-4 border-l border-slate-200 bg-emerald-50 text-emerald-700">Total</div>
      </div>

      <div className="divide-y divide-slate-100">
        {excelRows.map((row, index) => (
          <div key={row.id} className={`flex flex-col min-h-[64px] group relative ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"} ${row.checked ? "opacity-40" : ""}`}>
            <div className="flex items-center w-full min-h-[56px]">
              <div className="w-10 flex items-center justify-center border-r border-slate-100">
                <input 
                  type="checkbox"
                  checked={row.checked || false}
                  onChange={(e) => updateExcelRow(row.id, "checked", e.target.checked)}
                  className="w-5 h-5 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                />
              </div>
              <div className="w-[8%] text-center text-xs font-black text-slate-400 border-r border-slate-100 italic h-full py-4 bg-slate-50/30">
                {index + 1}
              </div>
              <div className="flex-grow min-w-0 pr-2 relative">
                <input 
                  type="text"
                  placeholder="Ex: Arroz, Feijão..."
                  value={row.name}
                  onChange={(e) => updateExcelRow(row.id, "name", e.target.value)}
                  className={`w-full bg-transparent px-3 py-4 border-none outline-none font-black text-slate-900 placeholder:text-slate-300 focus:bg-emerald-50/50 transition-all text-base ${row.checked ? "line-through text-slate-400" : ""}`}
                />
                {row.name && (
                  <button 
                    onClick={() => removeExcelRow(row.id)}
                    className="absolute left-[-18px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-600 text-white rounded-full z-30 shadow-xl"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
               <div className="w-10 border-l border-slate-100 flex items-center bg-white/50">
                <input 
                  type="number"
                  value={row.qty || ""}
                  placeholder="1"
                  onChange={(e) => updateExcelRow(row.id, "qty", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                  className="w-full bg-transparent text-center font-black text-slate-900 border-none outline-none focus:bg-emerald-100 text-base py-4"
                />
              </div>
              <div className="w-10 border-l border-slate-100 flex items-center justify-center bg-white/50">
                <select 
                  value={row.unitType}
                  onChange={(e) => updateExcelRow(row.id, "unitType", e.target.value)}
                  className="w-full bg-transparent text-xs font-black text-emerald-600 text-center border-none outline-none focus:bg-emerald-100 py-4 appearance-none cursor-pointer"
                >
                  <option value="un">un</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="pack">pk</option>
                </select>
              </div>
               <div className="w-34 border-l border-slate-100 flex items-center pr-1 h-full bg-slate-50/20">
                <input 
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={editingField?.id === row.id && editingField?.field === 'price' ? editingField.value : (row.price === 0 ? "" : row.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                  onFocus={() => {
                    setEditingField({ id: row.id, field: 'price', value: row.price === 0 ? "" : row.price.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) });
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+([,.]\d{0,2})?$/.test(val) || val === "," || val === ".") {
                      setEditingField({ id: row.id, field: 'price', value: val });
                      const raw = val.replace(",", ".");
                      const numeric = parseFloat(raw);
                      if (!isNaN(numeric)) {
                        updateExcelRow(row.id, "price", numeric);
                      } else if (val === "") {
                        updateExcelRow(row.id, "price", 0);
                      }
                    }
                  }}
                  onBlur={() => setEditingField(null)}
                  className="w-full bg-transparent text-right font-black mono-display border-none outline-none pr-3 text-slate-950 focus:bg-emerald-100 text-base py-4"
                />
              </div>
              <div className="w-34 border-l border-slate-100 bg-emerald-500/10 text-right pr-4 font-black mono-display text-emerald-800 h-full flex items-center justify-end py-4 text-base">
                {formatCurrency(row.unitType === 'g' ? (row.qty / 1000) * row.price : row.qty * row.price)}
              </div>
            </div>
            {row.unitType === 'pack' && (
              <div className="flex items-center gap-4 px-10 pb-3 -mt-1 bg-emerald-50/20 border-t border-slate-50 italic">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Qtd Pack:</span>
                  <input 
                    type="number"
                    value={row.packSize}
                    onChange={(e) => updateExcelRow(row.id, "packSize", parseFloat(e.target.value) || 1)}
                    className="bg-transparent border-none outline-none text-[9px] font-black text-emerald-600 w-10 text-center"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* 💾 Modal: Salvar Planilha em Pasta da Calculadora */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-5 max-w-md w-full shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-tight">
                  Salvar Planilha na Pasta 📁
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                Nome da Planilha
              </label>
              <input
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="Ex: Cotação Arroz e Feijão, Compras da Semana..."
                className="w-full bg-slate-950 border border-white/10 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                Escolher Pasta
              </label>
              <select
                value={saveFolder}
                onChange={(e) => setSaveFolder(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
              >
                {excelFoldersList.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Create New Folder Inline */}
            <div className="pt-1">
              {isCreatingFolder ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCustomFolderInput}
                    onChange={(e) => setNewCustomFolderInput(e.target.value)}
                    placeholder="Nome da nova pasta..."
                    className="flex-1 bg-slate-950 border border-indigo-400/50 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCustomFolderInput.trim()) {
                        const name = newCustomFolderInput.trim();
                        if (!excelFoldersList.includes(name)) {
                          setExcelFoldersList(prev => [...prev, name]);
                        }
                        setSaveFolder(name);
                        setNewCustomFolderInput("");
                        setIsCreatingFolder(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-2 py-1.5 text-slate-400 text-xs"
                  >
                    X
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Criar uma nova pasta
                </button>
              )}
            </div>

            <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Itens na tabela:</span>
                <span className="font-bold text-white">{excelRows.filter(r => r.name).length} produtos</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total da planilha:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(excelTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleSaveCurrentSheet}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs uppercase rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                Salvar Planilha na Pasta 💾
              </button>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📂 Modal: Pastas Salvas Apenas da Calculadora Nota Excel */}
      {isExcelFoldersOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-5 max-w-2xl w-full shadow-2xl text-left space-y-4 my-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Pastas da Calculadora Nota Excel 📊📁
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Mostrando exclusivamente as planilhas salvas nesta ferramenta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExcelFoldersOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Folder Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedFolderTab("all")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                  selectedFolderTab === "all"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-white/5"
                }`}
              >
                Todas ({savedExcelSheets.length})
              </button>
              {excelFoldersList.map(folderName => {
                const count = savedExcelSheets.filter(s => s.folder === folderName).length;
                return (
                  <button
                    key={folderName}
                    type="button"
                    onClick={() => setSelectedFolderTab(folderName)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      selectedFolderTab === folderName
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-white/5"
                    }`}
                  >
                    <span>{folderName}</span>
                    <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Sheets List */}
            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
              {filteredSheets.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3 border-2 border-dashed border-white/10 rounded-2xl">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs font-bold uppercase">Nenhuma planilha salva {selectedFolderTab === "all" ? "ainda" : "nesta pasta"}</p>
                  <p className="text-[10px] text-slate-500">
                    Clique em &quot;Salvar em Pasta 💾&quot; na barra superior da calculadora para guardar suas contas!
                  </p>
                </div>
              ) : (
                filteredSheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className="p-3.5 bg-slate-950 border border-white/10 hover:border-indigo-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white uppercase tracking-tight">
                          {sheet.title}
                        </span>
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                          {sheet.folder}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                        <span>🗓️ {sheet.date}</span>
                        <span>📦 {sheet.rows?.filter(r => r.name).length || 0} itens</span>
                        <span className="text-emerald-400 font-bold font-mono">Total: {formatCurrency(sheet.total || 0)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleLoadSheet(sheet)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                        title="Carregar esta planilha de volta na calculadora"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Carregar ⚡</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportCSV(sheet)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                        title="Baixar em formato Excel (.CSV)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSheet(sheet.id, sheet.title)}
                        className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-xl transition-all"
                        title="Excluir planilha"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-400">
              <span>Pastas e planilhas salvas com segurança no seu dispositivo</span>
              <button
                type="button"
                onClick={() => setIsExcelFoldersOpen(false)}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});

PlannerModule.displayName = "PlannerModule";
