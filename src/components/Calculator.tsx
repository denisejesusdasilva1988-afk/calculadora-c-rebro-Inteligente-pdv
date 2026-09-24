import React from 'react';
import { RotateCcw, Calculator, Delete, History, Calendar, ShoppingCart, ChevronDown, ChevronUp, Folder } from "lucide-react";
import { SavedList } from '../types';

interface CalculatorProps {
  calcDisplay: string;
  calcExpression: string;
  calcHistory: { expr: string, res: string }[];
  handleCalcPress: (val: string) => void;
  setCalcHistory: React.Dispatch<React.SetStateAction<{ expr: string, res: string }[]>>;
  setCalcDisplay: React.Dispatch<React.SetStateAction<string>>;
  setCalcExpression: React.Dispatch<React.SetStateAction<string>>;
  setIsResult: React.Dispatch<React.SetStateAction<boolean>>;
  showNotification: (msg: string, type?: any) => void;
  setNotepadMode: (mode: any) => void;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  currentFolder: string;
  setCurrentFolder: (folder: string) => void;
  groupedHistory: any;
  onAddToAgenda?: (amount: number) => void;
}

// Simple and robust parser helper for list lines in Portuguese supermarket notation
const parseNotepadLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Clean currency flags
  const cleanLine = trimmed.replace(/R\$\s*/g, "").replace(/\$\s*/g, "");
  
  // Detect "qty x price" (e.g. 2 x 15,90 or 2x15.90)
  const multiplierRegex = /(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)/;
  const matchMult = cleanLine.match(multiplierRegex);
  
  if (matchMult) {
    const qty = parseFloat(matchMult[1].replace(",", "."));
    const price = parseFloat(matchMult[2].replace(",", "."));
    const matchIndex = cleanLine.indexOf(matchMult[0]);
    let desc = cleanLine.substring(0, matchIndex).trim();
    if (!desc) desc = "Item s/ nome";
    return {
      description: desc,
      qty,
      price,
      total: qty * price,
      lineText: trimmed
    };
  }

  // Fallback: search for numbers, assume last is price, qty is 1
  const numbers = cleanLine.match(/(\d+(?:[.,]\d+)?)/g);
  if (numbers && numbers.length > 0) {
    const lastNumStr = numbers[numbers.length - 1];
    const price = parseFloat(lastNumStr.replace(",", "."));
    const lastIndex = cleanLine.lastIndexOf(lastNumStr);
    let desc = cleanLine.substring(0, lastIndex).trim().replace(/[-:]\s*$/, "").trim();
    if (!desc) desc = "Item s/ nome";
    return {
      description: desc,
      qty: 1,
      price,
      total: price,
      lineText: trimmed
    };
  }

  return null;
};

export const CalculatorModule = React.memo(({
  calcDisplay,
  calcExpression,
  calcHistory,
  handleCalcPress,
  setCalcHistory,
  setCalcDisplay,
  setCalcExpression,
  setIsResult,
  showNotification,
  setNotepadMode,
  setInputText,
  currentFolder,
  setCurrentFolder,
  groupedHistory,
  onAddToAgenda
}: CalculatorProps) => {
  const [expandedListId, setExpandedListId] = React.useState<string | null>(null);

  // Defensive Timestamp sort helper
  const getListTime = (list: any) => {
    if (!list || !list.data) return 0;
    if (typeof list.data.seconds === 'number') return list.data.seconds;
    if (typeof list.data.toMillis === 'function') return list.data.toMillis() / 1000;
    if (list.data instanceof Date) return list.data.getTime() / 1000;
    const parsed = Date.parse(list.data);
    return isNaN(parsed) ? 0 : parsed / 1000;
  };

  // Beautiful date formatter
  const formatListDate = (list: any) => {
    if (!list || !list.data) return "S/ data";
    let dateObj: Date;
    if (typeof list.data.seconds === 'number') {
      dateObj = new Date(list.data.seconds * 1000);
    } else if (typeof list.data.toDate === 'function') {
      dateObj = list.data.toDate();
    } else if (list.data instanceof Date) {
      dateObj = list.data;
    } else {
      dateObj = new Date(list.data);
    }
    
    if (isNaN(dateObj.getTime())) return "S/ data";
    
    return dateObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    });
  };

  // Flatten and sort saved lists by date
  const allSavedLists = React.useMemo(() => {
    if (!groupedHistory) return [];
    const list: SavedList[] = [];
    Object.values(groupedHistory).forEach((group: any) => {
      if (Array.isArray(group)) {
        list.push(...group);
      }
    });
    return list.sort((a, b) => getListTime(b) - getListTime(a));
  }, [groupedHistory]);

  const handleLoadFullSum = (items: any[]) => {
    if (items.length === 0) return;
    const exprParts = items.map(item => item.total.toFixed(2).replace(".", ","));
    const fullExpr = exprParts.join(" + ");
    
    const sumTotal = items.reduce((acc, item) => acc + item.total, 0);
    const totalStr = sumTotal.toFixed(2).replace(".", ",");
    
    setCalcExpression(fullExpr);
    setCalcDisplay(totalStr);
    setIsResult(true);
    showNotification("Soma completa carregada na calculadora! 🧮", "success");
  };
  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl mb-8 border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Calculadora Inteligente</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Memória: {calcHistory.length} recentes</p>
          </div>
        </div>
        <button 
          onClick={() => setCalcHistory([])}
          className="p-2 text-slate-500 hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      
      <div className="bg-slate-950 rounded-3xl p-6 mb-4 border border-white/5 shadow-inner relative group">
        <div className="text-right h-10 text-slate-400 text-xl font-bold uppercase tracking-widest mb-1 overflow-hidden truncate leading-none">
          {calcExpression || "0"}
        </div>
        <div className="text-right h-12 text-white text-4xl font-black mono-display overflow-hidden truncate leading-none">
          {calcDisplay}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          'C', '%', 'DEL', '/',
          '7', '8', '9', 'x',
          '4', '5', '6', '-',
          '1', '2', '3', '+',
          '0', '.', ',', '='
        ].map(btn => (
          <button 
            key={btn}
            onClick={() => handleCalcPress(btn === 'DEL' ? 'DEL' : btn)}
            className={'h-12 rounded-2xl font-black text-lg flex items-center justify-center transition-all active:scale-90 shadow-lg ' + (
              btn === '=' ? 'bg-blue-600 text-white shadow-blue-500/20' : 
              btn === 'DEL' ? 'bg-slate-800 text-red-500 border border-white/5' :
              ['C','±','%'].includes(btn) ? 'bg-slate-800 text-slate-400 border border-white/5' :
              ['/','x','-','+'].includes(btn) ? 'bg-slate-800 text-blue-400 border border-white/5' : 
              'bg-white/5 text-white border border-white/10 hover:bg-white/10'
            )}
          >
            {btn === 'DEL' ? <Delete className="w-5 h-5" /> : btn}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <button 
          onClick={() => {
            const lastRes = calcDisplay.replace(",", ".");
            if (lastRes !== "0" && !isNaN(parseFloat(lastRes))) {
              setInputText(prev => prev + (prev.endsWith("\n") || prev === "" ? "" : "\n") + lastRes);
              showNotification("Valor adicionado à lista!", "success");
              setNotepadMode("edit");
            }
          }}
          className="h-14 rounded-2xl font-black text-[9px] uppercase tracking-widest bg-emerald-600 text-white active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center gap-1"
        >
          <ShoppingCart className="w-5 h-5" /> Adicionar Carrinho
        </button>

        <button 
          onClick={() => {
            const lastRes = calcDisplay.replace(",", ".");
            if (lastRes !== "0" && !isNaN(parseFloat(lastRes))) {
              if (onAddToAgenda) {
                onAddToAgenda(parseFloat(lastRes));
              }
            }
          }}
          className="h-14 rounded-2xl font-black text-[9px] uppercase tracking-widest bg-blue-600 text-white active:scale-95 transition-all shadow-lg shadow-blue-500/20 flex flex-col items-center justify-center gap-1"
        >
          <Calendar className="w-5 h-5" /> Agendar Agenda
        </button>
      </div>

      {/* History section inside the module for better organization */}
      {calcHistory.length > 0 && (
         <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                     <History className="w-4 h-4 text-blue-400" />
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Recentes</h4>
               </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
               {calcHistory.map((h, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setCalcDisplay(h.res);
                      setCalcExpression(h.res);
                      setIsResult(false);
                      showNotification("Cálculo recuperado!", "info");
                    }}
                    className="w-full bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col items-end gap-1 hover:border-blue-500/30 transition-all group"
                  >
                     <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight opacity-60 group-hover:opacity-100 transition-opacity">{h.expr}</span>
                     <span className="text-lg font-black text-white mono-display text-right w-full">= {h.res}</span>
                  </button>
               ))}
            </div>
         </div>
      )}

      {/* Histórico do Caderninho (Contas de Supermercado) e Exemplos de Somas */}
      <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl animate-pulse">
               <History className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex flex-col">
               <h4 className="text-xs font-black text-white uppercase tracking-widest">Somas do Caderninho</h4>
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Histórico de Listas</p>
            </div>
          </div>
          <span className="text-[9px] font-black text-slate-500 bg-slate-800/60 border border-white/5 px-2 py-1 rounded-xl">
            {allSavedLists.length} {allSavedLists.length === 1 ? 'Salva' : 'Salvas'}
          </span>
        </div>

        {allSavedLists.length === 0 ? (
          <div className="bg-slate-950/40 p-5 rounded-3xl border border-dashed border-white/5 text-center py-6">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nenhuma lista salva ainda</p>
             <p className="text-[9px] text-slate-600 mt-1 leading-normal">
               Crie e salve contas no caderno de compras para ver os exemplos de somas listados diretamente aqui.
             </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
             {allSavedLists.map((list) => {
                const isExpanded = expandedListId === list.id;
                const formattedDate = formatListDate(list);
                
                // Extract items and calculate sums
                const listItems = list.texto_digitado 
                  ? list.texto_digitado.split("\n").map(parseNotepadLine).filter(Boolean) 
                  : [];
                
                return (
                   <div 
                     key={list.id} 
                     className="bg-slate-950 rounded-2xl border border-white/5 overflow-hidden transition-all duration-200"
                   >
                     {/* List Header clickable to expand */}
                     <button
                       type="button"
                       onClick={() => setExpandedListId(isExpanded ? null : list.id)}
                       className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors focus:outline-none"
                     >
                       <div className="space-y-1">
                         <div className="flex items-center gap-2">
                           <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-purple-600/20 text-purple-400 border border-purple-500/10">
                             <Folder className="w-2.5 h-2.5 inline mr-1 opacity-75" />{list.pasta || "Geral"}
                           </span>
                           <span className="text-[9px] text-slate-500 font-bold">{formattedDate}</span>
                         </div>
                         <p className="text-[10.5px] text-slate-300 font-semibold line-clamp-1">
                           {list.texto_digitado ? list.texto_digitado.split("\n")[0] || "Compra" : "Compra"}
                         </p>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="text-right space-y-0.5">
                           <span className="text-[9px] text-slate-500 font-bold uppercase block leading-none">Total Pago</span>
                           <span className="text-xs font-black text-emerald-400 mono-display">
                             R$ {list.total_gasto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </span>
                         </div>
                         <div className="text-slate-500">
                           {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                         </div>
                       </div>
                     </button>

                     {/* Expanded Items (Somas) */}
                     {isExpanded && (
                       <div className="px-4 pb-4 pt-1 border-t border-white/5 bg-slate-900/30 space-y-3">
                         <p className="text-[9px] text-purple-400 font-black uppercase tracking-wider">
                           📋 Somas detalhadas para cada item:
                         </p>
                         
                         {listItems.length === 0 ? (
                           <p className="text-[9px] text-slate-500 font-semibold italic text-center py-2">
                             Nenhum item com valor numérico detectado nesta lista.
                           </p>
                         ) : (
                           <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                             {listItems.map((item: any, itemIdx: number) => {
                               const itemTotalStr = item.total.toFixed(2).replace(".", ",");
                               const itemPriceStr = item.price.toFixed(2).replace(".", ",");
                               return (
                                 <div 
                                   key={itemIdx} 
                                   className="flex items-center justify-between bg-slate-950/60 p-2 text-[10px] rounded-xl border border-white/5 hover:border-slate-800 transition-colors"
                                 >
                                   <div className="text-slate-400 max-w-[150px] truncate leading-tight font-semibold">
                                     <strong className="text-white font-black">{item.qty}x</strong> {item.description}
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <span className="text-slate-500 text-[9px] mono-display">
                                       (R$ {itemPriceStr})
                                     </span>
                                     {/* Clickable total pill to load/sum value */}
                                     <button
                                       type="button"
                                       onClick={() => {
                                         setCalcDisplay(itemTotalStr);
                                         setCalcExpression(prev => {
                                           if (prev === "" || prev === "0") return itemTotalStr;
                                           if (/[+\-*/x%]$/.test(prev.trim())) return prev + " " + itemTotalStr;
                                           return prev + " + " + itemTotalStr;
                                         });
                                         setIsResult(false);
                                         showNotification(`Adicionado: R$ ${itemTotalStr}`, "success");
                                       }}
                                       className="bg-blue-600/20 hover:bg-blue-600 hover:text-white border border-blue-500/30 px-2 py-0.5 rounded-lg text-blue-400 font-bold tracking-tight transition-all active:scale-95"
                                       title="Clique para somar valor"
                                     >
                                       + R$ {itemTotalStr}
                                     </button>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         )}

                         {/* Actions for the expanded list */}
                         <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                           {listItems.length > 0 && (
                             <button
                               type="button"
                               onClick={() => handleLoadFullSum(listItems)}
                               className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white py-2 px-3 rounded-xl transition-all text-[9.5px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow"
                             >
                               <span>Jogar Soma de Cada Item (Fórmula) ➕</span>
                             </button>
                           )}
                           
                           <button
                             type="button"
                             onClick={() => {
                               const formattedTotal = list.total_gasto.toFixed(2).replace(".", ",");
                               setCalcDisplay(formattedTotal);
                               setCalcExpression(formattedTotal);
                               setIsResult(false);
                               showNotification(`Total de R$ ${formattedTotal} carregado!`, "success");
                             }}
                             className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-white/90 py-2 px-3 rounded-xl border border-white/10 transition-all text-[9.5px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
                           >
                             <span>Carregar Total Pago na Calculadora 💸</span>
                           </button>
                         </div>
                       </div>
                     )}
                   </div>
                );
             })}
          </div>
        )}
      </div>
    </div>
  );
});
