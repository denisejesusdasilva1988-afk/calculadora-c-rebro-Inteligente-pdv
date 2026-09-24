import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Trash2, 
  Search, 
  AlertTriangle,
  ShoppingBag,
  DollarSign
} from "lucide-react";

export interface DeliveryOrder {
  id: string;
  clientName: string;
  phone?: string;
  address: string;
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime: string; // HH:MM
  itemsDescription: string;
  status: "pendente" | "entregue" | "cancelado";
  totalAmount: number;
  paymentStatus: "pendente" | "pago";
  paymentMethod: "dinheiro" | "pix" | "cartao_debito" | "cartao_credito" | "fiado";
}

interface DeliveriesModuleProps {
  deliveryOrders: DeliveryOrder[];
  setDeliveryOrders: React.Dispatch<React.SetStateAction<DeliveryOrder[]>>;
  formatCurrency: (value: number) => string;
  showNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
  onAddTransaction: (tx: {
    amount: number;
    description: string;
    paymentMethod: "dinheiro" | "pix" | "cartao_debito" | "cartao_credito" | "fiado";
    category: "venda";
    clientName?: string;
  }) => void;
}

export const DeliveriesModule: React.FC<DeliveriesModuleProps> = ({
  deliveryOrders,
  setDeliveryOrders,
  formatCurrency,
  showNotification,
  onAddTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<"hoje" | "proximas" | "concluidas">("hoje");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form states for creating new delivery order
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [deliveryTime, setDeliveryTime] = useState("18:00");
  const [itemsDescription, setItemsDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pendente" | "pago">("pendente");
  const [paymentMethod, setPaymentMethod] = useState<DeliveryOrder["paymentMethod"]>("dinheiro");

  // Filter & classify orders
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const filteredOrders = useMemo(() => {
    return deliveryOrders.filter(order => {
      const matchesSearch = 
        order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.itemsDescription.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === "hoje") {
        return order.deliveryDate === todayStr && order.status === "pendente";
      } else if (activeTab === "proximas") {
        return order.deliveryDate > todayStr && order.status === "pendente";
      } else {
        // concluidas or canceladas
        return order.status === "entregue" || order.status === "cancelado";
      }
    });
  }, [deliveryOrders, searchQuery, activeTab, todayStr]);

  // Compute stats and late alerts
  const lateOrdersCount = useMemo(() => {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    
    return deliveryOrders.filter(order => {
      if (order.status !== "pendente") return false;
      if (order.deliveryDate < todayStr) return true;
      if (order.deliveryDate === todayStr && order.deliveryTime < currentTimeStr) return true;
      return false;
    }).length;
  }, [deliveryOrders, todayStr]);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !address.trim() || !itemsDescription.trim() || !totalAmount.trim()) {
      showNotification("Por favor, preencha todos os campos obrigatórios!", "error");
      return;
    }

    const parsedAmount = parseFloat(totalAmount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      showNotification("Por favor, digite um valor de faturamento válido!", "error");
      return;
    }

    const newOrder: DeliveryOrder = {
      id: "del_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      clientName: clientName.trim(),
      phone: phone.trim() || undefined,
      address: address.trim(),
      deliveryDate,
      deliveryTime,
      itemsDescription: itemsDescription.trim(),
      status: "pendente",
      totalAmount: parsedAmount,
      paymentStatus,
      paymentMethod,
    };

    const updated = [newOrder, ...deliveryOrders];
    setDeliveryOrders(updated);
    localStorage.setItem("pdv_delivery_orders", JSON.stringify(updated));

    showNotification("Agendamento de Entrega registrado com sucesso! 🛵", "success");
    setIsFormOpen(false);

    // Reset Form
    setClientName("");
    setPhone("");
    setAddress("");
    setItemsDescription("");
    setTotalAmount("");
    setPaymentStatus("pendente");
    setPaymentMethod("dinheiro");
  };

  const handleMarkAsDelivered = (order: DeliveryOrder) => {
    const updated = deliveryOrders.map(o => {
      if (o.id === order.id) {
        return { ...o, status: "entregue" as const, paymentStatus: "pago" as const };
      }
      return o;
    });

    setDeliveryOrders(updated);
    localStorage.setItem("pdv_delivery_orders", JSON.stringify(updated));

    // Post to the main finance ledger automatically
    onAddTransaction({
      amount: order.totalAmount,
      description: `DELIVERY ENTREGUE: ${order.itemsDescription.toUpperCase()} | CLIENTE: ${order.clientName.toUpperCase()}`,
      paymentMethod: order.paymentMethod,
      category: "venda",
      clientName: order.clientName,
    });

    showNotification(`Entrega para ${order.clientName} concluída e venda lançada no fluxo de caixa! 💵🛵`, "success");
  };

  const handleCancelOrder = (orderId: string, clientName: string) => {
    const updated = deliveryOrders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: "cancelado" as const };
      }
      return o;
    });

    setDeliveryOrders(updated);
    localStorage.setItem("pdv_delivery_orders", JSON.stringify(updated));
    showNotification(`Entrega para ${clientName} cancelada com sucesso.`, "info");
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm("Deseja realmente excluir este registro de agendamento de entrega?")) {
      const updated = deliveryOrders.filter(o => o.id !== orderId);
      setDeliveryOrders(updated);
      localStorage.setItem("pdv_delivery_orders", JSON.stringify(updated));
      showNotification("Agendamento excluído definitivamente.", "warning");
    }
  };

  return (
    <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl text-left space-y-5 shadow-2xl">
      
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500 animate-pulse" />
            Agenda de Entregas & Delivery Integrado 🛵
          </h3>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">
            Agende pedidos, configure prazos e adicione entregas de forma profissional. O sistema notifica atrasos e integra automaticamente a entrega concluída ao caixa!
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 bg-amber-550 hover:bg-amber-500 text-slate-950 font-black text-[10.5px] uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          {isFormOpen ? "Fechar Formulário" : "Agendar Entrega 📦"}
        </button>
      </div>

      {/* Late Orders Alert Banner */}
      {lateOrdersCount > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-left">
            <p className="text-[10.5px] font-black text-rose-400 uppercase leading-none">⚠️ EXistem agendamentos pendentes atrasados!</p>
            <p className="text-[9.5px] text-slate-300 mt-1 leading-relaxed">
              Você possui <strong className="text-white">{lateOrdersCount} entrega(s)</strong> cujo prazo de entrega já expirou. Verifique o status das encomendas para evitar reclamações de clientes!
            </p>
          </div>
        </div>
      )}

      {/* New Appointment Form */}
      {isFormOpen && (
        <form onSubmit={handleCreateOrder} className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-4 animate-in slide-in-from-top duration-200">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">📝 Novo Compromisso / Agendamento</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Client name */}
            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase">Nome do Cliente *</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Ex: Ana Maria"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-lg pl-8 pr-2.5 py-1.5 outline-none font-bold"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase">Celular / WhatsApp (Opcional)</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Ex: (11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-lg pl-8 pr-2.5 py-1.5 outline-none font-bold"
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase">Data de Entrega *</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none font-bold font-mono"
                required
              />
            </div>

            {/* Time */}
            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase">Horário de Entrega *</label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Ex: 14:30"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-lg pl-8 pr-2.5 py-1.5 outline-none font-bold font-mono"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase">Endereço de Entrega *</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Ex: Av. Paulista, 1000 - Apto 50 - Consolação"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-lg pl-8 pr-2.5 py-1.5 outline-none font-bold"
                  required
                />
              </div>
            </div>

            {/* Value */}
            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase">Valor da Cobrança R$ *</label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="0,00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-lg pl-8 pr-2.5 py-1.5 outline-none font-bold font-mono text-right"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase">Meio de Pagamento Combinado</label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-slate-300 rounded-lg px-2 py-1.5 outline-none font-bold"
              >
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="pix">⚡ Pix</option>
                <option value="cartao_debito">💳 Débito</option>
                <option value="cartao_credito">💳 Crédito</option>
                <option value="fiado">📕 Fiado</option>
              </select>
            </div>

            {/* Items Description */}
            <div className="col-span-1 sm:col-span-4 space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase">Descrição dos Itens / Encomenda *</label>
              <textarea
                placeholder="Ex: 1 Bolo de Cenoura com Vulcão de Chocolate, 10 Brigadeiros e 10 Empadinhas."
                value={itemsDescription}
                onChange={(e) => setItemsDescription(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-1.5 outline-none font-bold text-xs h-16 resize-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-550 hover:bg-amber-500 text-slate-950 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              Confirmar Agendamento ✅
            </button>
          </div>
        </form>
      )}

      {/* Control Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-white/5">
        <div className="flex flex-wrap gap-1">
          {(["hoje", "proximas", "concluidas"] as const).map((tab) => {
            const label = tab === "hoje" ? "Hoje 🗓️" : tab === "proximas" ? "Próximas 🔜" : "Histórico / Concluídas ✅";
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-amber-550 text-slate-950 font-black shadow-lg shadow-amber-500/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Buscar por cliente ou endereço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-7 pr-2.5 py-1 text-[10px] text-white font-bold outline-none uppercase"
          />
        </div>
      </div>

      {/* Deliveries List */}
      <div className="space-y-3.5">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-950/40 p-10 rounded-2xl border border-dashed border-white/5 text-center">
            <p className="text-[11px] text-amber-500 font-black uppercase">Nenhuma entrega ativa encontrada 🛵</p>
            <p className="text-[9.5px] text-slate-400 mt-2 leading-relaxed">
              Não há agendamentos nesta aba no momento. Use o botão <strong className="text-white">Agendar Entrega 📦</strong> no canto superior direito para agendar um novo pedido de delivery!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredOrders.map((order) => {
              const isPendente = order.status === "pendente";
              const isCancelado = order.status === "cancelado";
              
              // Date formatting
              const [y, m, d] = order.deliveryDate.split("-");
              const formattedDate = `${d}/${m}/${y}`;

              return (
                <div 
                  key={order.id}
                  className={`bg-slate-950 p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 text-left ${
                    isCancelado 
                      ? "border-red-500/10 bg-red-950/5 opacity-60" 
                      : !isPendente 
                        ? "border-emerald-500/15" 
                        : order.deliveryDate < todayStr 
                          ? "border-rose-500/40 animate-pulse bg-rose-500/[0.02]" 
                          : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header: Client & Status badge */}
                    <div className="flex justify-between items-start gap-2.5">
                      <div>
                        <span className="text-[11.5px] font-black text-white uppercase block leading-none">{order.clientName}</span>
                        {order.phone && (
                          <span className="text-[9px] text-slate-400 font-mono font-bold">{order.phone}</span>
                        )}
                      </div>
                      
                      <span className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase border ${
                        order.status === "entregue"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                          : order.status === "cancelado"
                            ? "bg-red-500/10 text-red-400 border-red-500/15"
                            : order.deliveryDate < todayStr
                              ? "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/15"
                      }`}>
                        {order.status === "entregue" ? "Entregue" : order.status === "cancelado" ? "Cancelado" : order.deliveryDate < todayStr ? "ATRASADO 🚨" : "Agendado"}
                      </span>
                    </div>

                    {/* Schedule: Date & Time */}
                    <div className="flex items-center gap-3.5 text-[9.5px] text-slate-300 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-mono font-bold text-white">{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-mono font-bold text-white">{order.deliveryTime}</span>
                      </div>
                    </div>

                    {/* Address & Items details */}
                    <div className="space-y-1 text-[10px] text-slate-300">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <p className="leading-relaxed font-semibold">{order.address}</p>
                      </div>

                      <div className="flex items-start gap-1 pt-1 border-t border-white/5 mt-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <p className="leading-relaxed text-slate-400 font-mono font-medium whitespace-pre-line">{order.itemsDescription}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action controllers */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[7.5px] text-slate-500 block uppercase font-bold">Valor da Entrega</span>
                      <span className="text-[13px] font-mono font-black text-emerald-400">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPendente && (
                        <>
                          <button
                            onClick={() => handleCancelOrder(order.id, order.clientName)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            title="Cancelar Entrega"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleMarkAsDelivered(order)}
                            className="px-2.5 py-1.5 bg-emerald-550 hover:bg-emerald-500 text-slate-950 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                            title="Marcar como Entregue"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-slate-950" />
                            <span>Entregue ✓</span>
                          </button>
                        </>
                      )}

                      {!isPendente && (
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          title="Excluir Agendamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
