import React, { useState } from 'react';
import { Search, ShoppingBag, Info, Heart, ChevronRight, AlertCircle, Volume2, VolumeX, Sparkles, Plus, Calendar, Pencil, Brain, Award, Smartphone, TrendingUp, Utensils, Beer, X, Filter } from "lucide-react";
import { motion } from "motion/react";

const normalizeText = (str: string): string => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

interface MarketCatalogProps {
  superSearch: string;
  setSuperSearch: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  showOnlyCheckedSuper: boolean;
  setShowOnlyCheckedSuper: (val: boolean) => void;
  handleCreateCustomItem: () => void;
  filteredCategories: any[];
  superListData: any;
  updateSuperList: (name: string, field: string, value: any) => void;
  budgetNum: number;
  formatCurrency: (val: number) => string;
  editingField: any;
  setEditingField: (val: any) => void;
  setEditingItem?: (item: any) => void;
  
  // Extra voice & monthly list features
  handleGenerateMonthlyList?: () => void;
  handleReadItemAloud?: (name: string) => void;
  handleReadEntireListAloud?: () => void;
  currentlySpeakingItem?: string | null;
  isSpeakingList?: boolean;
  stopSpeaking?: () => void;
  handleAddNewCustomItem?: (
    name: string, 
    price?: number, 
    qty?: number, 
    unit?: string, 
    category?: string, 
    urgente?: boolean, 
    emFalta?: boolean
  ) => void;
}

interface ItemCardProps {
  key?: any;
  it: any;
  superListData: any;
  updateSuperList: (name: string, field: string, value: any) => void;
  budgetNum: number;
  formatCurrency: (val: number) => string;
  editingField: any;
  setEditingField: (val: any) => void;
  setEditingItem?: (item: any) => void;
  handleReadItemAloud?: (name: string) => void;
  currentlySpeakingItem?: string | null;
  stopSpeaking?: () => void;
  showCategoryLabel?: boolean;
}

const ItemCard = React.memo(({
  it,
  superListData,
  updateSuperList,
  budgetNum,
  formatCurrency,
  editingField,
  setEditingField,
  setEditingItem,
  handleReadItemAloud,
  currentlySpeakingItem,
  stopSpeaking,
  showCategoryLabel = false
}: ItemCardProps) => {
  const data = superListData[it.name] || { qty: 0, price: 0, checked: false, unit: it.unit || "un", urgente: false, emFalta: false, customName: "" };
  const displayName = data.customName || it.name;
  const itemTotal = data.qty * data.price;
  const isExpensive = itemTotal > (budgetNum * 0.15);
  const isChecked = data.checked;

  return (
    <div 
      onClick={() => updateSuperList(it.name, "checked", !data.checked)}
      className={`rounded-[2.2rem] border-3 transition-all p-6 flex flex-col gap-5 relative overflow-hidden group hover:scale-[1.01] cursor-pointer active:scale-[0.99] ${isChecked ? "bg-emerald-50/90 border-emerald-500 shadow-md shadow-emerald-500/10" : "bg-white border-slate-300 hover:border-slate-400"} ${data.urgente ? "ring-4 ring-red-500/30 border-red-500 animate-pulse" : ""} ${data.emFalta && !data.urgente ? "ring-4 ring-amber-500/20 border-amber-500" : ""}`}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        {/* Left Side: Checkbox and Text Names */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Large Checkbox Container */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              updateSuperList(it.name, "checked", !data.checked);
            }}
            className={`w-16 h-16 rounded-2xl border-3 flex items-center justify-center transition-all shrink-0 ${isChecked ? "bg-emerald-500 border-emerald-600 text-white font-extrabold shadow-md shadow-emerald-500/20" : "bg-slate-100 border-slate-350 hover:border-slate-500 flex items-center justify-center text-transparent"}`}
          >
            {isChecked ? (
              <svg className="w-8 h-8 stroke-[4px] drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : null}
          </div>

          <div className="min-w-0">
            {showCategoryLabel && it.catName && (
              <span className="text-xs font-black leading-none text-slate-500 uppercase tracking-widest block mb-1">
                {it.catName}
              </span>
            )}
            {/* What's written on the list (Item name in uppercase, bold and bright) */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-sans font-black text-slate-900 text-lg sm:text-xl tracking-wide uppercase leading-tight">
                {displayName}
              </p>
              {data.urgente && (
                <span className="bg-red-550 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md">
                  🚨 Urgente
                </span>
              )}
              {data.emFalta && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md">
                  ⚠️ Em Falta
                </span>
              )}
            </div>
            
            {/* Units/Qty & unit rate capsule */}
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className="text-slate-800 font-black text-xs uppercase tracking-wider bg-slate-100 border border-slate-250 px-2.5 py-1 rounded-md">
                {data.qty} {data.unit || "un"}
              </span>
              
              <span className="px-3 py-1 rounded-full font-sans font-black bg-slate-100 border border-slate-250 text-slate-800 text-xs uppercase font-mono tracking-tight">
                R$ {(data.price || 0).toFixed(2).replace(".", ",")}/{data.unit || "un"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Price total of the item and pencil / speak button */}
        <div className="flex items-center gap-4 justify-end shrink-0 w-full sm:w-auto">
          <div className="text-right flex flex-col justify-center">
            <span className="text-[10px] font-black leading-none text-slate-500 uppercase tracking-widest block text-right mb-1">Total do Item</span>
            <span className="text-slate-950 font-mono font-black text-2xl md:text-3xl tracking-tighter block leading-none">
              R$ {itemTotal.toFixed(2).replace(".", ",")}
            </span>
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-2 ml-1">
            {isChecked && handleReadItemAloud && (
              <button
                type="button"
                onClick={(e) => {
                   e.stopPropagation();
                   if (currentlySpeakingItem === it.name) {
                     stopSpeaking?.();
                   } else {
                     handleReadItemAloud(it.name);
                   }
                }}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${currentlySpeakingItem === it.name ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-200'}`}
                title="Ouvir descrição completa do item"
              >
                 {currentlySpeakingItem === it.name ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}

            {setEditingItem && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingItem({
                    type: 'super',
                    originalName: it.name,
                    name: displayName,
                    price: data.price,
                    qty: data.qty
                  });
                }}
                className="w-12 h-12 rounded-full border-2 border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200 flex items-center justify-center transition-all shadow-md active:scale-90"
                title="Editar quantidade e preço"
              >
                <Pencil className="w-4 h-4 text-amber-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline editing quick selectors for extremely fast budget recording */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-extrabold uppercase tracking-wider">Marcadores:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const newUrgente = !data.urgente;
                updateSuperList(it.name, "urgente", newUrgente);
                if (newUrgente) {
                  updateSuperList(it.name, "checked", true);
                }
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border-2 ${data.urgente ? "bg-red-100 border-red-500 text-red-700" : "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900"}`}
            >
              🚨 {data.urgente ? "Urgente!" : "Urgente"}
            </button>
            <button
              type="button"
              onClick={() => {
                const newEmFalta = !data.emFalta;
                updateSuperList(it.name, "emFalta", newEmFalta);
                if (newEmFalta) {
                  updateSuperList(it.name, "checked", true);
                }
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border-2 ${data.emFalta ? "bg-amber-100 border-amber-500 text-amber-700" : "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900"}`}
            >
              ⚠️ {data.emFalta ? "Falta!" : "Em Falta"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-extrabold uppercase tracking-wider">Unidades:</span>
            <div className="flex items-center bg-slate-50 border-2 border-slate-300 rounded-xl overflow-hidden h-10 px-1">
                <button 
                  type="button"
                  onClick={() => updateSuperList(it.name, "qty", Math.max(0, data.qty - 1))}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg text-lg font-black active:scale-90"
                >-</button>
                <input 
                  type="number"
                  inputMode="numeric"
                  value={data.qty}
                  onChange={(e) => updateSuperList(it.name, "qty", parseFloat(e.target.value) || 0)}
                  className="w-12 bg-transparent text-center text-sm font-black text-slate-900 border-none p-0 outline-none font-mono focus:text-[#ff9100]"
                />
                <button 
                  type="button"
                  onClick={() => updateSuperList(it.name, "qty", data.qty + 1)}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg text-lg font-black active:scale-90"
                >+</button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-extrabold uppercase tracking-wider">Preço:</span>
            <div className="flex items-center bg-slate-50 border-2 border-slate-300 rounded-xl px-3 h-10 w-32">
              <span className="text-xs font-black text-slate-500 mr-1">R$</span>
              <input 
                type="text"
                inputMode="decimal"
                value={editingField?.id === it.name && editingField?.field === 'super-price' ? editingField.value : (data.price > 0 ? data.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "")}
                onFocus={() => setEditingField({ id: it.name, field: 'super-price', value: data.price === 0 ? "" : data.price.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) })}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d+([,.]\d{0,2})?$/.test(val) || val === "," || val === ".") {
                    setEditingField({ id: it.name, field: 'super-price', value: val });
                    const raw = val.replace(",", ".");
                    const numeric = parseFloat(raw);
                    if (!isNaN(numeric)) updateSuperList(it.name, "price", numeric);
                    else if (val === "") updateSuperList(it.name, "price", 0);
                  }
                }}
                onBlur={() => setEditingField(null)}
                placeholder="0,00"
                className="w-full bg-transparent text-right text-sm font-black font-mono border-none p-0 outline-none text-slate-900 placeholder:text-slate-400 focus:text-amber-600"
              />
            </div>
          </div>
        </div>
      </div>

      {isExpensive && !data.checked && (
        <div className="bg-red-50 border border-red-200 px-3.5 py-2 rounded-xl flex items-center gap-2 mt-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-[10px] font-black text-red-700 uppercase tracking-tight">Este item representa mais de {Math.round((itemTotal / (budgetNum || 1)) * 100)}% de seu limite planejado!</span>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  const prevData = prevProps.superListData[prevProps.it.name] || {};
  const nextData = nextProps.superListData[nextProps.it.name] || {};
  
  return (
    prevProps.currentlySpeakingItem === nextProps.currentlySpeakingItem &&
    prevProps.budgetNum === nextProps.budgetNum &&
    prevData.checked === nextData.checked &&
    prevData.qty === nextData.qty &&
    prevData.price === nextData.price &&
    prevData.urgente === nextData.urgente &&
    prevData.emFalta === nextData.emFalta &&
    prevData.customName === nextData.customName &&
    prevProps.editingField?.id === nextProps.editingField?.id &&
    prevProps.editingField?.field === nextProps.editingField?.field &&
    prevProps.editingField?.value === nextProps.editingField?.value
  );
});

export const MarketCatalogModule = React.memo(({
  superSearch,
  setSuperSearch,
  selectedCategory,
  setSelectedCategory,
  showOnlyCheckedSuper,
  setShowOnlyCheckedSuper,
  handleCreateCustomItem,
  filteredCategories,
  superListData,
  updateSuperList,
  budgetNum,
  formatCurrency,
  editingField,
  setEditingField,
  setEditingItem,
  handleGenerateMonthlyList,
  handleReadItemAloud,
  handleReadEntireListAloud,
  currentlySpeakingItem,
  isSpeakingList,
  stopSpeaking,
  handleAddNewCustomItem
}: MarketCatalogProps) => {
  const [localSearch, setLocalSearch] = useState(superSearch);
  const [newCustomItemName, setNewCustomItemName] = useState("");
  const [newCustomItemPrice, setNewCustomItemPrice] = useState("");
  const [newCustomItemQty, setNewCustomItemQty] = useState("");
  const [newCustomItemUnit, setNewCustomItemUnit] = useState("un");
  const [newCustomItemCategory, setNewCustomItemCategory] = useState("mercadinho");
  const [newCustomIsUrgente, setNewCustomIsUrgente] = useState(false);
  const [newCustomIsEmFalta, setNewCustomIsEmFalta] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "checked" | "unchecked" | "priority">("all");

  const categoriesList = [
    { id: "mercadinho", name: "Mercadinho" },
    { id: "custom", name: "Meus Itens" },
    { id: "mercearia", name: "Mercearia de Base" },
    { id: "açougue", name: "Açougue & Carnes" },
    { id: "laticinios", name: "Laticínios & Frios" },
    { id: "beleza", name: "Beleza & Higiene" },
    { id: "limpeza", name: "Limpeza" },
    { id: "hortifruti", name: "Hortifruti" },
    { id: "padaria", name: "Padaria & Mercadinho" },
    { id: "bebidas", name: "Bebidas & Adega" }
  ];

  const handleQuickAdd = () => {
    if (!newCustomItemName.trim()) return;
    const priceNum = parseFloat(newCustomItemPrice.replace(",", ".")) || 0;
    const qtyNum = parseFloat(newCustomItemQty) || 1;
    
    if (handleAddNewCustomItem) {
      handleAddNewCustomItem(
        newCustomItemName,
        priceNum,
        qtyNum,
        newCustomItemUnit,
        newCustomItemCategory,
        newCustomIsUrgente,
        newCustomIsEmFalta
      );
    }
    
    // reset form
    setNewCustomItemName("");
    setNewCustomItemPrice("");
    setNewCustomItemQty("");
    setNewCustomIsUrgente(false);
    setNewCustomIsEmFalta(false);
  };

  const handleStatusFilterChange = (filter: "all" | "checked" | "unchecked" | "priority") => {
    setStatusFilter(filter);
    if (filter === "checked") {
      setShowOnlyCheckedSuper(true);
    } else {
      setShowOnlyCheckedSuper(false);
    }
  };

  // filter categories and items based on search + filters
  const processedCategories = filteredCategories.map(cat => {
    let items = cat.items;
    
    // search query filter
    if (localSearch.trim()) {
      const query = normalizeText(localSearch);
      items = items.filter((it: any) => {
        const itemData = superListData[it.name] || {};
        const name = normalizeText(it.name);
        const customName = normalizeText(itemData.customName || "");
        return name.includes(query) || customName.includes(query);
      });
    }

    // status filters
    if (statusFilter === "checked") {
      items = items.filter((it: any) => superListData[it.name]?.checked);
    } else if (statusFilter === "unchecked") {
      items = items.filter((it: any) => !superListData[it.name]?.checked);
    } else if (statusFilter === "priority") {
      items = items.filter((it: any) => superListData[it.name]?.urgente || superListData[it.name]?.emFalta);
    }

    return {
      ...cat,
      items
    };
  }).filter(cat => cat.items.length > 0);

  // find highlight items (Urgent or Em Falta)
  const highlightItems: any[] = [];
  filteredCategories.forEach(cat => {
    cat.items.forEach((it: any) => {
      const itemData = superListData[it.name] || {};
      if (itemData.urgente || itemData.emFalta) {
        // match search query if active
        if (localSearch.trim()) {
          const query = normalizeText(localSearch);
          const name = normalizeText(it.name);
          const customName = normalizeText(itemData.customName || "");
          if (!name.includes(query) && !customName.includes(query)) return;
        }
        
        // Match status filter
        if (statusFilter === "checked" && !itemData.checked) return;
        if (statusFilter === "unchecked" && itemData.checked) return;
        
        // Prevent duplicate highlight
        if (!highlightItems.some(h => h.name === it.name)) {
          highlightItems.push({ ...it, catName: cat.name });
        }
      }
    });
  });

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="p-6 pb-40 space-y-8 min-h-[60vh] bg-slate-50 text-slate-900 rounded-b-[2.5rem]"
    >
      {/* Shopping Assistant Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Monthly List Card */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-white text-indigo-950 p-6 rounded-[2.5rem] shadow-lg border-2 border-indigo-200 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-500/15 text-indigo-700 rounded-xl">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <h4 className="font-black uppercase tracking-wider text-xs text-indigo-700">Lista de Compras do Mês</h4>
            </div>
            <p className="text-xs text-slate-700 font-semibold leading-relaxed">
              Preencha seu carrinho instantaneamente com itens básicos de alimentação, laticínios, carnes, higiene e limpeza do mês para facilitar seu cálculo!
            </p>
          </div>
          <button 
            type="button"
            onClick={handleGenerateMonthlyList}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            Gerar Lista do Mês (23 Itens)
          </button>
        </div>

        {/* Audio Assistant Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white text-emerald-950 p-6 rounded-[2.5rem] shadow-lg border-2 border-emerald-200 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-emerald-500/15 text-emerald-700 rounded-xl">
                <Volume2 className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="font-black uppercase tracking-wider text-xs text-emerald-700">Assistente de Voz (Ditado)</h4>
            </div>
            <p className="text-xs text-slate-700 font-semibold leading-relaxed">
              Deixe o aplicativo ditar os itens do carrinho enquanto você caminha pelo supermercado. Útil para verificar preços e itens sem segurar o celular!
            </p>
          </div>
          <div className="flex gap-2">
            {isSpeakingList ? (
              <button 
                type="button"
                onClick={stopSpeaking}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <VolumeX className="w-4 h-4 animate-bounce" />
                Parar Leitura de Voz
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleReadEntireListAloud}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Volume2 className="w-4 h-4" />
                Ditar Todo Carrinho
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Redesigned Custom Item Section (Highly spacious, clear and fully featured) */}
      <div className="bg-slate-100 p-6 lg:p-8 rounded-[2.5rem] border-2 border-slate-200 space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ff9100] rounded-xl flex items-center justify-center text-black shadow-md shadow-[#ff9100]/20">
            <Plus className="w-5 h-5 stroke-[3px]" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Acrescentar Itens</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Insira novos itens ao seu catálogo com layout confortável</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Item Name Input */}
          <div className="space-y-2 flex flex-col">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-1">Nome do Produto</span>
            <input 
              type="text" 
              placeholder="Ex: Amaciante, Açúcar, Feijão..."
              value={newCustomItemName}
              onChange={(e) => setNewCustomItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              className="w-full h-14 px-5 rounded-2xl border-2 border-slate-300 bg-white text-sm font-bold text-slate-900 outline-none focus:border-[#ff9100] transition-colors placeholder:text-slate-400"
            />
          </div>

          {/* Item Price Input (R$) */}
          <div className="space-y-2 flex flex-col">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-1">Preço Unitário (Opcional)</span>
            <div className="relative w-full">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-[#ff9100]">R$</span>
              <input 
                type="text" 
                inputMode="decimal"
                placeholder="0,00"
                value={newCustomItemPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d+([,.]\d{0,2})?$/.test(val) || val === "," || val === ".") {
                    setNewCustomItemPrice(val);
                  }
                }}
                className="w-full h-14 px-5 pl-12 rounded-2xl border-2 border-slate-300 bg-white text-sm font-black text-slate-900 outline-none focus:border-[#ff9100] transition-colors placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Quantity and Unit measure */}
          <div className="space-y-2 flex flex-col">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-1">Quantidade & Unidade</span>
            <div className="flex gap-2 w-full">
              <input 
                type="number" 
                inputMode="numeric"
                min="1"
                placeholder="1"
                value={newCustomItemQty}
                onChange={(e) => setNewCustomItemQty(e.target.value)}
                className="w-24 h-14 px-4 rounded-2xl border-2 border-slate-300 bg-white text-sm font-black text-center text-slate-900 outline-none focus:border-[#ff9100] transition-colors"
              />
              <select 
                value={newCustomItemUnit}
                onChange={(e) => setNewCustomItemUnit(e.target.value)}
                className="flex-1 h-14 px-4 rounded-2xl border-2 border-slate-300 bg-white text-xs font-black text-slate-900 outline-none focus:border-[#ff9100] transition-colors"
              >
                <option value="un">un (Unidades)</option>
                <option value="kg">kg (Quilogramas)</option>
                <option value="lt">lt (Litros)</option>
                <option value="pct">pct (Pacotes)</option>
                <option value="cx">cx (Caixas)</option>
                <option value="pt">pt (Potes)</option>
                <option value="rl">rl (Rolos)</option>
                <option value="dz">dz (Dúzias)</option>
              </select>
            </div>
          </div>

          {/* Categorize product dropdown */}
          <div className="space-y-2 flex flex-col">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-1">Categoria Organizadora</span>
            <select 
              value={newCustomItemCategory}
              onChange={(e) => setNewCustomItemCategory(e.target.value)}
              className="w-full h-14 px-5 rounded-2xl border-2 border-slate-300 bg-white text-xs font-black text-slate-900 outline-none focus:border-[#ff9100] transition-colors"
            >
              {categoriesList.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Urgência and Em Falta quick toggle tags */}
          <div className="space-y-2 flex flex-col md:col-span-1 lg:col-span-2">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-1">Importância Especial</span>
            <div className="flex gap-3 h-14">
              <button
                type="button"
                onClick={() => setNewCustomIsUrgente(!newCustomIsUrgente)}
                className={`flex-1 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${newCustomIsUrgente ? "bg-red-500/20 border-red-500 text-red-650 shadow-md shadow-red-500/10" : "bg-white border-slate-300 text-slate-500 hover:text-slate-800"}`}
              >
                <span>🚨 Urgência Importante</span>
              </button>
              
              <button
                type="button"
                onClick={() => setNewCustomIsEmFalta(!newCustomIsEmFalta)}
                className={`flex-1 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${newCustomIsEmFalta ? "bg-amber-500/20 border-amber-500 text-amber-650 shadow-md shadow-amber-500/10" : "bg-white border-slate-300 text-slate-500 hover:text-slate-800"}`}
              >
                <span>⚠️ Produto em Falta</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end w-full">
          <button 
            type="button"
            onClick={handleQuickAdd}
            className="w-full md:w-auto px-8 h-14 bg-[#ff9100] text-black font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg hover:bg-amber-500 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5 stroke-[3px]" />
            Acrescentar Item à Lista
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-2 border-slate-200 p-6 rounded-[2.5rem] space-y-6 shadow-xl">
        {/* Level 1: Search Input */}
        <div className="space-y-2">
          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest pl-2">Buscar item no Catálogo</span>
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#ff9100] transition-colors" />
            <input 
              type="text" 
              placeholder="O que você precisa comprar hoje? Digite aqui para pesquisar..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setSuperSearch(e.target.value);
              }}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-16 pr-14 py-5 font-bold text-slate-900 placeholder:text-slate-450 focus:border-[#ff9100] shadow-md outline-none transition-all text-base focus:bg-white"
            />
            {localSearch.trim() && (
              <button 
                type="button"
                onClick={() => {
                  setLocalSearch("");
                  setSuperSearch("");
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all active:scale-90"
                title="Limpar busca"
              >
                <X className="w-4 h-4 stroke-[3px]" />
              </button>
            )}
          </div>
          
          {localSearch.trim().length > 0 && !processedCategories.some(c => c.items.some(i => {
            const normQuery = normalizeText(localSearch);
            const normName = normalizeText(i.name);
            const normCustomName = normalizeText(superListData[i.name]?.customName || "");
            return normName.includes(normQuery) || normCustomName.includes(normQuery);
          })) && (
            <motion.button 
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => {
                setSuperSearch(localSearch);
                // Trigger after state update finishes
                setTimeout(handleCreateCustomItem, 0);
              }}
              className="w-full bg-[#ff9100] text-black rounded-2xl py-4 flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all mt-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Adicionar "{localSearch}" à Lista
            </motion.button>
          )}
        </div>

        {/* Level 2: Category Selector */}
        <div className="space-y-2">
          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest pl-2">Filtrar por Categoria</span>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 px-1">
            {[
              { id: "all", name: "Todas as Categorias", icon: <ShoppingBag className="w-4 h-4" /> },
              { id: "custom", name: "Meus Itens", icon: <Pencil className="w-4 h-4" /> },
              { id: "mercadinho", name: "Mercadinho", icon: <ShoppingBag className="w-4 h-4" /> },
              { id: "mercearia", name: "Mercearia de Base", icon: <Brain className="w-4 h-4" /> },
              { id: "açougue", name: "Açougue & Carnes", icon: <Award className="w-4 h-4" /> },
              { id: "laticinios", name: "Laticínios & Frios", icon: <Smartphone className="w-4 h-4" /> },
              { id: "beleza", name: "Beleza & Higiene", icon: <Heart className="w-4 h-4" /> },
              { id: "limpeza", name: "Limpeza", icon: <Sparkles className="w-4 h-4" /> },
              { id: "hortifruti", name: "Hortifruti", icon: <TrendingUp className="w-4 h-4" /> },
              { id: "padaria", name: "Padaria & Mercadinho", icon: <Utensils className="w-4 h-4" /> },
              { id: "bebidas", name: "Bebidas & Adega", icon: <Beer className="w-4 h-4" /> }
            ].map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button 
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap shadow-md flex items-center gap-2 border-2 ${isSelected ? "bg-[#ff9100] text-black border-[#ff9100] shadow-md shadow-[#ff9100]/25" : "bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900"}`}
                >
                  {cat.icon}
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Level 3: Status Filters */}
        <div className="space-y-2">
          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest pl-2">Filtrar por Situação no Carrinho</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { id: "all", name: "Todos os Itens", info: "Catálogo completo" },
              { id: "checked", name: "🛒 No carrinho", info: "Itens adicionados" },
              { id: "unchecked", name: "📝 Falta Comprar", info: "Não selecionados" },
              { id: "priority", name: "🚨 Urgentes / Faltas", info: "Marcas especiais" }
            ].map(filter => {
              const isActive = statusFilter === filter.id;
              return (
                <button 
                  key={filter.id}
                  type="button"
                  onClick={() => handleStatusFilterChange(filter.id as any)}
                  className={`px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-1 text-center border-2 ${isActive ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10" : "bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-450 hover:text-slate-900"}`}
                >
                  <span className="truncate max-w-full font-extrabold text-xs">{filter.name}</span>
                  <span className={`text-[8px] font-bold uppercase tracking-tight ${isActive ? "text-slate-300" : "text-slate-500"}`}>{filter.info}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spotlight/Pinned section for Urgent/Out of stock items */}
      {highlightItems.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 via-white to-red-50/40 p-6 rounded-[2.5rem] border-2 border-red-200 space-y-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl border border-red-200">
               <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-red-600 uppercase tracking-wider">🚨 Super Destaque: Urgentes & Em Falta</h3>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Abaixo estão os itens marcados como prioridade máxima</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {highlightItems.map((it: any) => (
              <ItemCard 
                key={`highlight-${it.name}`}
                it={it}
                superListData={superListData}
                updateSuperList={updateSuperList}
                budgetNum={budgetNum}
                formatCurrency={formatCurrency}
                editingField={editingField}
                setEditingField={setEditingField}
                setEditingItem={setEditingItem}
                handleReadItemAloud={handleReadItemAloud}
                currentlySpeakingItem={currentlySpeakingItem}
                stopSpeaking={stopSpeaking}
                showCategoryLabel={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Standard Categorized Listings */}
      <div className="flex flex-col gap-10">
        {processedCategories.map((cat: any) => (
          <div key={cat.id} className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="p-3 bg-slate-200 text-[#ff9100] rounded-xl border-2 border-slate-300">
                 {cat.icon}
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">{cat.name}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{cat.items.length} itens disponíveis</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {cat.items.map((it: any) => (
                <ItemCard 
                  key={`standard-${it.name}`}
                  it={it}
                  superListData={superListData}
                  updateSuperList={updateSuperList}
                  budgetNum={budgetNum}
                  formatCurrency={formatCurrency}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  setEditingItem={setEditingItem}
                  handleReadItemAloud={handleReadItemAloud}
                  currentlySpeakingItem={currentlySpeakingItem}
                  stopSpeaking={stopSpeaking}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
});
