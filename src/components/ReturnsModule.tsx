import React, { useState, useMemo } from "react";
import { 
  X, 
  RotateCcw, 
  Check, 
  AlertCircle,
  ShoppingBag,
  Info,
  ArrowRightLeft,
  Search,
  Plus,
  Trash2,
  DollarSign
} from "lucide-react";

export interface ReturnItem {
  name: string;
  price: number;
  quantity: number;
}

export interface CustomProductOption {
  id: string;
  name: string;
  price: number;
  category?: string;
  code?: string;
}

interface ReturnsModuleProps {
  transaction: {
    id: string;
    description: string;
    amount: number;
    paymentMethod: string;
    items?: ReturnItem[];
    clientName?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReturn: (
    returnedItems: { name: string; quantity: number; price: number }[],
    refundAmount: number,
    restock: boolean,
    replacementItems?: { name: string; quantity: number; price: number }[],
    differenceAmount?: number,
    exchangePaymentMethod?: string
  ) => void;
  formatCurrency: (value: number) => string;
  customProducts?: CustomProductOption[];
}

export const ReturnsModule: React.FC<ReturnsModuleProps> = ({
  transaction,
  isOpen,
  onClose,
  onConfirmReturn,
  formatCurrency,
  customProducts = [],
}) => {
  // Modal Operation Mode: 'devolucao' (Reembolso) or 'troca' (Substituição por outro produto)
  const [opMode, setOpMode] = useState<"troca" | "devolucao">("troca");

  // Quantities to return keyed by item name
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState(true);

  // Replacement items when doing an exchange (Troca)
  const [replacementItems, setReplacementItems] = useState<{ id?: string; name: string; price: number; quantity: number }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [exchangePaymentMethod, setExchangePaymentMethod] = useState<string>("dinheiro");

  // Manual custom replacement item
  const [manualProdName, setManualProdName] = useState("");
  const [manualProdPrice, setManualProdPrice] = useState("");

  if (!isOpen || !transaction) return null;

  // Ensure transaction has items. If not, simulate from description
  const itemsList: ReturnItem[] = useMemo(() => {
    if (transaction.items && transaction.items.length > 0) {
      return transaction.items;
    }
    try {
      const items: ReturnItem[] = [];
      const parts = transaction.description.split(" | ");
      const firstPart = parts[0];
      const itemTokens = firstPart.split(", ");
      itemTokens.forEach(tok => {
        const match = tok.match(/^(\d+(?:\.\d+)?)\s*x\s*(.+)$/i);
        if (match) {
          const qty = parseFloat(match[1]);
          const name = match[2];
          items.push({ name, price: 0, quantity: qty });
        }
      });
      return items;
    } catch {
      return [];
    }
  }, [transaction]);

  // Adjust return quantity
  const handleSetQty = (itemName: string, maxQty: number, val: number) => {
    const cleanVal = Math.max(0, Math.min(maxQty, val));
    setReturnQuantities(prev => ({
      ...prev,
      [itemName]: cleanVal
    }));
  };

  // Calculate total value of returned items
  const totalReturnedValue = useMemo(() => {
    let sum = 0;
    itemsList.forEach(item => {
      const qty = returnQuantities[item.name] || 0;
      sum += qty * (item.price || 0);
    });
    return sum > transaction.amount ? transaction.amount : sum;
  }, [itemsList, returnQuantities, transaction]);

  // Calculate total value of new replacement items
  const totalReplacementValue = useMemo(() => {
    return replacementItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  }, [replacementItems]);

  // Balance difference in Exchange mode: (Replacement - Returned)
  // > 0: Customer pays the difference
  // < 0: Store owes change to the customer
  // = 0: Perfect balance
  const exchangeDifference = useMemo(() => {
    return totalReplacementValue - totalReturnedValue;
  }, [totalReplacementValue, totalReturnedValue]);

  const hasAnyReturn = useMemo(() => {
    return Object.keys(returnQuantities).some(key => (returnQuantities[key] || 0) > 0);
  }, [returnQuantities]);

  // Filtered available products to pick for exchange
  const filteredCatalog = useMemo(() => {
    if (!productSearch.trim()) return customProducts.slice(0, 10);
    const q = productSearch.toLowerCase().trim();
    return customProducts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [customProducts, productSearch]);

  const handleAddReplacementFromCatalog = (prod: CustomProductOption) => {
    setReplacementItems(prev => {
      const existing = prev.find(p => p.name.toUpperCase() === prod.name.toUpperCase());
      if (existing) {
        return prev.map(p => p.name.toUpperCase() === prod.name.toUpperCase() ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { id: prod.id, name: prod.name, price: prod.price, quantity: 1 }];
    });
    setProductSearch("");
  };

  const handleAddManualReplacement = () => {
    if (!manualProdName.trim()) return;
    const priceNum = parseFloat(manualProdPrice.replace(",", ".")) || 0;
    setReplacementItems(prev => [
      ...prev,
      { name: manualProdName.trim(), price: priceNum, quantity: 1 }
    ]);
    setManualProdName("");
    setManualProdPrice("");
  };

  const handleRemoveReplacementItem = (index: number) => {
    setReplacementItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyReturn) {
      alert("Por favor, selecione pelo menos 1 item para realizar a devolução ou troca!");
      return;
    }

    const returnedItems = itemsList
      .map(item => ({
        name: item.name,
        quantity: returnQuantities[item.name] || 0,
        price: item.price
      }))
      .filter(it => it.quantity > 0);

    if (opMode === "troca") {
      if (replacementItems.length === 0) {
        alert("Na modalidade TROCA, selecione o novo produto que o cliente vai levar no lugar!");
        return;
      }
      onConfirmReturn(
        returnedItems,
        0,
        restock,
        replacementItems,
        exchangeDifference,
        exchangePaymentMethod
      );
    } else {
      // Devolução simples / estorno
      onConfirmReturn(returnedItems, totalReturnedValue, restock);
    }
    
    // Reset and close
    setReturnQuantities({});
    setReplacementItems([]);
    setRestock(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-amber-400">
            <ArrowRightLeft className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white block">
                Trocas & Devoluções de Mercadorias 🔁
              </span>
              <span className="text-[9.5px] text-slate-400 font-semibold block leading-tight">
                Ajuste automático de estoque e caixa para Bar, Adega, Mercadinho e Serviços
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: Troca vs Devolução */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-white/5">
          <button
            type="button"
            onClick={() => setOpMode("troca")}
            className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              opMode === "troca"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Troca de Produto 🔁</span>
          </button>
          <button
            type="button"
            onClick={() => setOpMode("devolucao")}
            className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              opMode === "devolucao"
                ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Devolução & Reembolso 🔄</span>
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="bg-slate-950 p-3 rounded-2xl border border-white/5 space-y-1.5 text-xs">
          <div className="flex justify-between items-center font-bold">
            <span className="text-slate-400">Cupom Original:</span>
            <span className="text-slate-300 font-mono text-[11px]">{transaction.id.substring(0, 18)}...</span>
          </div>
          {transaction.clientName && (
            <div className="flex justify-between items-center font-bold">
              <span className="text-slate-400">Cliente:</span>
              <span className="text-amber-300 uppercase">{transaction.clientName}</span>
            </div>
          )}
          <div className="flex justify-between items-center font-bold">
            <span className="text-slate-400">Total Pago na Compra:</span>
            <span className="text-emerald-400 font-mono text-sm">{formatCurrency(transaction.amount)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* PASSO 1: Itens Sendo Devolvidos */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                <span>1. Produto Devolvido pelo Cliente (Devolver ao Estoque)</span>
              </span>
              <span className="text-[9px] text-slate-400 font-bold">
                Ex: Brahma 350ml
              </span>
            </div>
            
            {itemsList.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-xl text-center text-slate-500 font-mono">
                Não há itens detalhados individualmente nesta venda.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                {itemsList.map((item) => {
                  const currentRet = returnQuantities[item.name] || 0;
                  return (
                    <div key={item.name} className="bg-slate-950 p-3 rounded-2xl border border-white/5 flex items-center justify-between gap-3 text-left">
                      <div className="truncate">
                        <span className="font-black text-white uppercase block text-[11px] truncate">{item.name}</span>
                        <span className="text-[9.5px] text-slate-400 font-mono mt-0.5 block">
                          Comprado: {item.quantity} un • {formatCurrency(item.price || 0)} cada
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetQty(item.name, item.quantity, currentRet - 1)}
                          className="w-7 h-7 bg-slate-900 text-slate-300 hover:text-white rounded-lg border border-white/10 font-black text-sm flex items-center justify-center cursor-pointer active:scale-95"
                        >
                          -
                        </button>
                        <span className="font-mono font-black text-white w-6 text-center text-sm">{currentRet}</span>
                        <button
                          type="button"
                          onClick={() => handleSetQty(item.name, item.quantity, currentRet + 1)}
                          className="w-7 h-7 bg-slate-900 text-slate-300 hover:text-white rounded-lg border border-white/10 font-black text-sm flex items-center justify-center cursor-pointer active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalReturnedValue > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-amber-300 font-bold uppercase text-[10px]">Crédito da Devolução:</span>
                <span className="font-mono font-black text-amber-400">{formatCurrency(totalReturnedValue)}</span>
              </div>
            )}
          </div>

          {/* PASSO 2: Novo Produto Levado (Apenas se Modo Troca) */}
          {opMode === "troca" && (
            <div className="space-y-2.5 text-xs pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                  <span>2. Novo Produto que o Cliente vai Levar (Dar Baixa)</span>
                </span>
                <span className="text-[9px] text-slate-400 font-bold">
                  Ex: Antártica 350ml
                </span>
              </div>

              {/* Busca rápida no catálogo de produtos cadastrados */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar produto novo no catálogo (ex: Antártica, Skol, Coca...)"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-bold focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Sugestões do catálogo ao digitar */}
              {productSearch.trim().length > 0 && (
                <div className="bg-slate-950 p-2 rounded-xl border border-white/10 space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                  {filteredCatalog.length === 0 ? (
                    <p className="text-[10px] text-slate-500 p-2 text-center">Nenhum produto encontrado com este nome.</p>
                  ) : (
                    filteredCatalog.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddReplacementFromCatalog(p)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-transparent text-left transition-colors cursor-pointer group"
                      >
                        <span className="text-[11px] font-black text-white group-hover:text-emerald-300 uppercase truncate">{p.name}</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0 ml-2">{formatCurrency(p.price)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Ou adicionar produto manual se não estiver no catálogo */}
              <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-white/5">
                <input
                  type="text"
                  placeholder="Nome do produto novo..."
                  value={manualProdName}
                  onChange={(e) => setManualProdName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-bold outline-none"
                />
                <input
                  type="text"
                  placeholder="Preço R$"
                  value={manualProdPrice}
                  onChange={(e) => setManualProdPrice(e.target.value)}
                  className="w-20 bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white font-bold font-mono outline-none text-right"
                />
                <button
                  type="button"
                  onClick={handleAddManualReplacement}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer shrink-0"
                >
                  Adicionar
                </button>
              </div>

              {/* Lista de itens selecionados para a troca */}
              {replacementItems.length > 0 && (
                <div className="space-y-1.5 bg-slate-950 p-3 rounded-2xl border border-emerald-500/20">
                  <span className="text-[9px] text-slate-400 uppercase font-black block">Itens Novos a Entregar:</span>
                  {replacementItems.map((rep, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-[11px] font-black text-emerald-300 uppercase truncate">
                        {rep.quantity}x {rep.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] text-white font-bold">{formatCurrency(rep.price * rep.quantity)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveReplacementItem(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1 border-t border-white/5 text-xs font-bold">
                    <span className="text-slate-400 text-[10px] uppercase">Total Levado:</span>
                    <span className="text-emerald-400 font-mono">{formatCurrency(totalReplacementValue)}</span>
                  </div>
                </div>
              )}

              {/* Balanço Financeiro da Troca */}
              {hasAnyReturn && replacementItems.length > 0 && (
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-left ${
                  exchangeDifference > 0 
                    ? "bg-emerald-950/30 border-emerald-500/40" 
                    : exchangeDifference < 0
                    ? "bg-rose-950/30 border-rose-500/40"
                    : "bg-slate-950 border-white/20"
                }`}>
                  <div>
                    <span className="text-[9.5px] font-black uppercase tracking-wider block text-slate-300">
                      {exchangeDifference > 0 ? "💵 Cliente Deve Pagar a Diferença:" : exchangeDifference < 0 ? "🪙 Devolver Troco ao Cliente:" : "✅ Troca no Mesmo Valor:"}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {exchangeDifference > 0 ? "Produto novo é mais caro (Entrada no caixa)" : exchangeDifference < 0 ? "Produto novo é mais barato (Saída de caixa)" : "Valores idênticos (Saldo inalterado)"}
                    </span>
                  </div>
                  <span className={`text-base font-black font-mono ${
                    exchangeDifference > 0 ? "text-emerald-400" : exchangeDifference < 0 ? "text-rose-400" : "text-white"
                  }`}>
                    {formatCurrency(Math.abs(exchangeDifference))}
                  </span>
                </div>
              )}

              {/* Se houver diferença a pagar, escolher método */}
              {exchangeDifference > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Receber via:</span>
                  <select
                    value={exchangePaymentMethod}
                    onChange={(e) => setExchangePaymentMethod(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none flex-1"
                  >
                    <option value="dinheiro">Dinheiro 💵</option>
                    <option value="pix">PIX ⚡</option>
                    <option value="debito">Cartão de Débito 💳</option>
                    <option value="credito">Cartão de Crédito 💳</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Opção de Retorno ao Estoque (Reabastecimento) */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-white/5 flex items-center justify-between gap-3 text-xs">
            <div className="text-left space-y-0.5">
              <span className="font-black text-white block text-[10.5px]">Retornar item devolvido ao estoque?</span>
              <span className="text-[9px] text-slate-400 block">
                Se ativado, o produto devolvido (ex: Brahma) volta para o estoque (+1).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRestock(!restock)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all cursor-pointer ${
                restock 
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" 
                  : "bg-slate-900 border-white/10 text-slate-500"
              }`}
            >
              {restock ? "SIM (REABASTECER) ✅" : "NÃO REABASTECER ❌"}
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10 text-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-850 border border-white/10 text-slate-400 font-black rounded-xl uppercase cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!hasAnyReturn || (opMode === "troca" && replacementItems.length === 0)}
              className={`px-4 py-2.5 font-black rounded-xl uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg ${
                hasAnyReturn && (opMode !== "troca" || replacementItems.length > 0)
                  ? opMode === "troca"
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                    : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20"
                  : "bg-slate-950 border border-white/5 text-slate-600 cursor-not-allowed"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{opMode === "troca" ? "Confirmar Troca & Ajustar Estoque 🔁" : "Confirmar Devolução & Estorno 🔄"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
