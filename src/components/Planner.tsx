import React from 'react';
import { Pencil, CheckCircle2, ChevronRight, Trash2, Calendar } from "lucide-react";
import { motion } from "motion/react";

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
  return (
    <motion.div
      key="excel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white min-h-[60vh] pb-60"
    >
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
    </motion.div>
  );
});

PlannerModule.displayName = "PlannerModule";
