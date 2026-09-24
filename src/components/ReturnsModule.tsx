import React, { useState, useMemo } from "react";
import { 
  X, 
  RotateCcw, 
  Check, 
  AlertCircle,
  ShoppingBag,
  Info
} from "lucide-react";

export interface ReturnItem {
  name: string;
  price: number;
  quantity: number;
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
    restock: boolean
  ) => void;
  formatCurrency: (value: number) => string;
}

export const ReturnsModule: React.FC<ReturnsModuleProps> = ({
  transaction,
  isOpen,
  onClose,
  onConfirmReturn,
  formatCurrency,
}) => {
  // Quantities to return keyed by item name
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState(true);

  if (!isOpen || !transaction) return null;

  // Ensure transaction has items. If not, simulate from description or show warning
  const itemsList: ReturnItem[] = useMemo(() => {
    if (transaction.items && transaction.items.length > 0) {
      return transaction.items;
    }
    // Backup fallback if transaction doesn't have explicit items array (parse description)
    try {
      const items: ReturnItem[] = [];
      const parts = transaction.description.split(" | ");
      const firstPart = parts[0]; // e.g., "1x REFRIGERANTE, 2x SALGADO"
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

  // Calculate total refund
  const totalRefund = useMemo(() => {
    let refund = 0;
    itemsList.forEach(item => {
      const qtyToReturn = returnQuantities[item.name] || 0;
      refund += qtyToReturn * (item.price || 0);
    });
    // Cap refund at original transaction amount to be safe
    return refund > transaction.amount ? transaction.amount : refund;
  }, [itemsList, returnQuantities, transaction]);

  const hasAnyReturn = useMemo(() => {
    return Object.keys(returnQuantities).some(key => (returnQuantities[key] || 0) > 0);
  }, [returnQuantities]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyReturn) {
      alert("Por favor, selecione pelo menos 1 item para realizar a troca ou devolução!");
      return;
    }

    const returnedItems = itemsList
      .map(item => ({
        name: item.name,
        quantity: returnQuantities[item.name] || 0,
        price: item.price
      }))
      .filter(it => it.quantity > 0);

    onConfirmReturn(returnedItems, totalRefund, restock);
    
    // Reset and close
    setReturnQuantities({});
    setRestock(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2 text-amber-400">
            <RotateCcw className="w-5 h-5 text-amber-500 animate-spin-reverse" />
            <span className="text-xs font-black uppercase tracking-wider">Troca & Devolução de Itens</span>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-white/5"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Transaction Brief */}
        <div className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-1 text-xs">
          <div className="flex justify-between font-bold">
            <span className="text-slate-400">Venda ID:</span>
            <span className="text-slate-200 font-mono">{transaction.id.substring(0, 16)}...</span>
          </div>
          {transaction.clientName && (
            <div className="flex justify-between font-bold">
              <span className="text-slate-400">Cliente:</span>
              <span className="text-purple-400 uppercase">{transaction.clientName}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span className="text-slate-400">Total Pago:</span>
            <span className="text-emerald-400 font-mono">{formatCurrency(transaction.amount)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Items Selector List */}
          <div className="space-y-2 text-xs">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">Selecione os Itens a Devolver</span>
            
            {itemsList.length === 0 ? (
              <div className="p-4 bg-slate-950/50 rounded-xl text-center text-slate-500 font-mono">
                Não há itens detalhados nesta transação para estornar individualmente.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {itemsList.map((item) => {
                  const currentRet = returnQuantities[item.name] || 0;
                  return (
                    <div key={item.name} className="bg-slate-950 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-left">
                      <div>
                        <span className="font-bold text-white uppercase block text-[10.5px]">{item.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
                          Original: {item.quantity}x • {formatCurrency(item.price || 0)}/unid
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetQty(item.name, item.quantity, currentRet - 1)}
                          className="px-2 py-1 bg-slate-900 text-slate-400 hover:text-white rounded border border-white/10 font-black"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-white w-6 text-center">{currentRet}</span>
                        <button
                          type="button"
                          onClick={() => handleSetQty(item.name, item.quantity, currentRet + 1)}
                          className="px-2 py-1 bg-slate-900 text-slate-400 hover:text-white rounded border border-white/10 font-black"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Restock Toggle */}
          <div className="bg-slate-950 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-xs">
            <div className="text-left space-y-0.5">
              <span className="font-bold text-white block text-[10.5px]">Retornar itens ao estoque?</span>
              <span className="text-[9px] text-slate-400 block">Se ativado, as quantidades devolvidas serão adicionadas de volta ao estoque automaticamente.</span>
            </div>
            <button
              type="button"
              onClick={() => setRestock(!restock)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all cursor-pointer ${
                restock 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-slate-900 border-white/10 text-slate-500"
              }`}
            >
              {restock ? "REABASTECER" : "NÃO REABASTECER"}
            </button>
          </div>

          {/* Refund Breakdown */}
          {hasAnyReturn && (
            <div className="bg-slate-950/75 p-3.5 rounded-xl border border-amber-500/20 flex justify-between items-center">
              <div className="text-left">
                <span className="text-[9px] text-slate-400 uppercase font-black block leading-none">VALOR A REEMBOLSAR</span>
                <span className="text-[9.5px] text-slate-500 block leading-relaxed mt-0.5">Dinheiro a ser devolvido ao cliente</span>
              </div>
              <span className="text-[16px] font-mono font-black text-amber-400">
                {formatCurrency(totalRefund)}
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/5 text-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-400 font-bold rounded-lg uppercase cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!hasAnyReturn}
              className={`px-4 py-2 font-black rounded-lg uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                hasAnyReturn 
                  ? "bg-amber-550 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10" 
                  : "bg-slate-950 border border-white/5 text-slate-600 cursor-not-allowed"
              }`}
            >
              <Check className="w-4 h-4" />
              Confirmar Troca / Estorno
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
