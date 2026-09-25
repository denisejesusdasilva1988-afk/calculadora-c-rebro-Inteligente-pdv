import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MessageCircle,
  TrendingUp,
  Award,
  DollarSign,
  Calendar,
  ShoppingBag,
  Star,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Heart,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Save,
  X
} from "lucide-react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export interface ClienteCompraHistorico {
  id: string;
  data: string; // ISO ou DD/MM/YYYY HH:mm
  total: number;
  itens: string;
  metodoPagamento: string;
  status: "pago" | "fiado_pendente" | "fiado_quitado";
}

export interface ClienteFiel {
  id: string;
  nome: string;
  whatsapp: string;
  apelido?: string;
  bairro?: string;
  limiteFiado?: number;
  observacoes?: string;
  dataCadastro: string;
  historicoCompras?: ClienteCompraHistorico[];
}

interface ClientesFieisModuleProps {
  db?: any;
  userId?: string;
  isLoggedIn?: boolean;
  transactions?: any[];
  onBackToPDV?: () => void;
  onSelectClientForPDV?: (clientName: string) => void;
  onSelectClientForSale?: (client: ClienteFiel) => void;
  formatCurrency?: (val: number) => string;
  showNotification: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export function ClientesFieisModule({
  db,
  userId,
  isLoggedIn,
  transactions = [],
  onBackToPDV,
  onSelectClientForPDV,
  onSelectClientForSale,
  formatCurrency = (v) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`,
  showNotification
}: ClientesFieisModuleProps) {
  // Clientes State
  const [clientes, setClientes] = useState<ClienteFiel[]>(() => {
    try {
      const saved = localStorage.getItem("pdv_clientes_fieis");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return [
      {
        id: "cli_demo_1",
        nome: "Hélio da Silva",
        whatsapp: "11987654321",
        apelido: "Seu Hélio",
        bairro: "Vila Nova",
        limiteFiado: 250,
        observacoes: "Vem toda manhã comprar pão, café e frios. Paga certinho todo quinto dia útil.",
        dataCadastro: new Date().toISOString(),
        historicoCompras: [
          {
            id: "comp_1",
            data: new Date(Date.now() - 86400000 * 2).toLocaleDateString("pt-BR") + " 08:30",
            total: 35.50,
            itens: "2x Pão Francês, 1x Café Moído, 200g Queijo Mussarela",
            metodoPagamento: "dinheiro",
            status: "pago"
          },
          {
            id: "comp_2",
            data: new Date(Date.now() - 86400000 * 5).toLocaleDateString("pt-BR") + " 17:45",
            total: 52.00,
            itens: "Refrigerante 2L, Carvão 3kg, Biscoitos",
            metodoPagamento: "pix",
            status: "pago"
          }
        ]
      },
      {
        id: "cli_demo_2",
        nome: "Denise de Jesus",
        whatsapp: "11999887766",
        apelido: "Dona Denise",
        bairro: "Centro",
        limiteFiado: 300,
        observacoes: "Cliente semanal assídua de salgados e encomendas. Super simpática!",
        dataCadastro: new Date().toISOString(),
        historicoCompras: [
          {
            id: "comp_3",
            data: new Date(Date.now() - 86400000 * 1).toLocaleDateString("pt-BR") + " 16:15",
            total: 85.00,
            itens: "30x Coxinhas de Frango, 1x Suco de Laranja 1L",
            metodoPagamento: "pix",
            status: "pago"
          }
        ]
      },
      {
        id: "cli_demo_3",
        nome: "Evaldo & Verônica",
        whatsapp: "11977665544",
        apelido: "Evaldo",
        bairro: "Jardim das Flores",
        limiteFiado: 180,
        observacoes: "Compram ingredientes e lanches da tarde para toda a família.",
        dataCadastro: new Date().toISOString(),
        historicoCompras: [
          {
            id: "comp_4",
            data: new Date(Date.now() - 86400000 * 3).toLocaleDateString("pt-BR") + " 19:20",
            total: 42.00,
            itens: "Farinha, Frango, Leite Condensado",
            metodoPagamento: "dinheiro",
            status: "pago"
          }
        ]
      }
    ];
  });

  const [search, setSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<ClienteFiel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formNome, setFormNome] = useState("");
  const [formApelido, setFormApelido] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formBairro, setFormBairro] = useState("");
  const [formLimiteFiado, setFormLimiteFiado] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");

  // Sync with Firestore (if available) and LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("pdv_clientes_fieis", JSON.stringify(clientes));
    } catch (_) {}

    if (db && userId && isLoggedIn) {
      try {
        const clientDocRef = doc(db, "users", userId, "pdv_data", "clientes_fieis");
        setDoc(clientDocRef, { clientes, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      } catch (_) {}
    }
  }, [clientes, db, userId, isLoggedIn]);

  // Load from Firestore on mount
  useEffect(() => {
    if (!db || !userId || !isLoggedIn) return;
    try {
      const clientDocRef = doc(db, "users", userId, "pdv_data", "clientes_fieis");
      const unsub = onSnapshot(clientDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.clientes) && data.clientes.length > 0) {
            setClientes(data.clientes);
          }
        }
      }, () => {});
      return () => unsub();
    } catch (_) {}
  }, [db, userId, isLoggedIn]);

  // Merge transactions from PDV with client history
  const enrichedClientes = useMemo(() => {
    return clientes.map((c) => {
      // Find all transactions in PDV with matching client name
      const normClientName = c.nome.trim().toUpperCase();
      const normApelido = c.apelido ? c.apelido.trim().toUpperCase() : "";

      const pdvMatches = transactions.filter((tx) => {
        if (!tx.clientName) return false;
        const txName = tx.clientName.trim().toUpperCase();
        return txName === normClientName || (normApelido && txName === normApelido) || txName.includes(normClientName);
      });

      // Combine existing registered purchases with PDV transactions
      const existingHistory = c.historicoCompras || [];
      const pdvPurchases: ClienteCompraHistorico[] = pdvMatches
        .filter((tx) => !existingHistory.some((eh) => eh.id === tx.id))
        .map((tx) => ({
          id: tx.id,
          data: tx.timestamp || new Date().toLocaleDateString("pt-BR"),
          total: tx.amount || 0,
          itens: tx.description || "Venda balcão PDV",
          metodoPagamento: tx.paymentMethod || "dinheiro",
          status: tx.isFiado ? (tx.fiadoStatus === "pago" ? "fiado_quitado" : "fiado_pendente") : "pago"
        }));

      const allPurchases = [...existingHistory, ...pdvPurchases].sort((a, b) => b.id.localeCompare(a.id));

      const totalGasto = allPurchases.reduce((acc, curr) => acc + (curr.total || 0), 0);
      const totalFiadoPendente = allPurchases
        .filter((p) => p.status === "fiado_pendente")
        .reduce((acc, curr) => acc + (curr.total || 0), 0);

      // Estimate monthly average
      const numCompras = allPurchases.length;
      const mediaMensalEstimada = numCompras > 0 ? (totalGasto / Math.max(1, Math.min(6, Math.ceil(numCompras / 4)))) : 0;

      // Classificação de Fidelidade & Diagnóstico
      let nivelFidelidade: "ouro" | "prata" | "bronze" = "bronze";
      let diagnostico = "";

      if (totalGasto >= 300 || numCompras >= 10) {
        nivelFidelidade = "ouro";
        diagnostico = "🏆 CLIENTE OURO (ALTÍSSIMA RENTABILIDADE): Esse cliente é um dos pilares do seu negócio! Ele gira o seu caixa com frequência. Vale muito a pena mandar mensagem, oferecer agrado, priorizar no atendimento e manter um ótimo relacionamento.";
      } else if (totalGasto >= 100 || numCompras >= 4) {
        nivelFidelidade = "prata";
        diagnostico = "⭐ CLIENTE PRATA (FREQUENTE E FIEL): Cliente fiel da vizinhança. Compra regularmente e confia no seu estabelecimento. Mantenha o contato próximo!";
      } else {
        nivelFidelidade = "bronze";
        diagnostico = "🌱 CLIENTE BRONZE (EM POTENCIAL): Está começando a comprar com você. Um bom atendimento e um agrado podem transformá-lo em cliente fiel toda semana!";
      }

      return {
        ...c,
        allPurchases,
        totalGasto,
        totalFiadoPendente,
        mediaMensalEstimada,
        nivelFidelidade,
        diagnostico,
        numCompras
      };
    });
  }, [clientes, transactions]);

  // Filtered clients list
  const filteredClientes = useMemo(() => {
    if (!search.trim()) return enrichedClientes;
    const term = search.toLowerCase();
    return enrichedClientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(term) ||
        (c.apelido && c.apelido.toLowerCase().includes(term)) ||
        c.whatsapp.includes(term) ||
        (c.bairro && c.bairro.toLowerCase().includes(term))
    );
  }, [enrichedClientes, search]);

  // Overall metrics
  const totalGeralGastoClientes = useMemo(() => {
    return enrichedClientes.reduce((acc, c) => acc + c.totalGasto, 0);
  }, [enrichedClientes]);

  const totalFiadoAbertoGeral = useMemo(() => {
    return enrichedClientes.reduce((acc, c) => acc + c.totalFiadoPendente, 0);
  }, [enrichedClientes]);

  // Open Form for new or edit
  const handleOpenForm = (cliente?: ClienteFiel) => {
    if (cliente) {
      setEditingId(cliente.id);
      setFormNome(cliente.nome);
      setFormApelido(cliente.apelido || "");
      setFormWhatsapp(cliente.whatsapp || "");
      setFormBairro(cliente.bairro || "");
      setFormLimiteFiado(cliente.limiteFiado ? cliente.limiteFiado.toString() : "");
      setFormObservacoes(cliente.observacoes || "");
    } else {
      setEditingId(null);
      setFormNome("");
      setFormApelido("");
      setFormWhatsapp("");
      setFormBairro("");
      setFormLimiteFiado("150");
      setFormObservacoes("");
    }
    setIsModalOpen(true);
  };

  const handleSaveCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      showNotification("Por favor, informe pelo menos o nome do cliente!", "error");
      return;
    }

    const limNum = formLimiteFiado ? parseFloat(formLimiteFiado.replace(",", ".")) : 0;

    if (editingId) {
      setClientes((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                nome: formNome.trim(),
                apelido: formApelido.trim() || undefined,
                whatsapp: formWhatsapp.replace(/\D/g, ""),
                bairro: formBairro.trim() || undefined,
                limiteFiado: limNum,
                observacoes: formObservacoes.trim() || undefined
              }
            : c
        )
      );
      showNotification(`Cliente "${formNome}" atualizado com sucesso! ✅`, "success");
    } else {
      const novoCliente: ClienteFiel = {
        id: "cli_" + Date.now(),
        nome: formNome.trim(),
        apelido: formApelido.trim() || undefined,
        whatsapp: formWhatsapp.replace(/\D/g, ""),
        bairro: formBairro.trim() || undefined,
        limiteFiado: limNum,
        observacoes: formObservacoes.trim() || undefined,
        dataCadastro: new Date().toISOString(),
        historicoCompras: []
      };
      setClientes((prev) => [novoCliente, ...prev]);
      showNotification(`Cliente "${formNome}" cadastrado com sucesso! 🎉`, "success");
    }

    setIsModalOpen(false);
  };

  const handleDeleteCliente = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja excluir o cadastro do cliente "${nome}"?`)) {
      setClientes((prev) => prev.filter((c) => c.id !== id));
      if (selectedCliente && selectedCliente.id === id) {
        setSelectedCliente(null);
      }
      showNotification(`Cliente "${nome}" removido.`, "info");
    }
  };

  const handleSendWhatsApp = (cliente: ClienteFiel, tipo: "agradecimento" | "extrato" | "cobranca" | "geral") => {
    const cleanPhone = cliente.whatsapp.replace(/\D/g, "");
    if (!cleanPhone) {
      showNotification(`O cliente "${cliente.nome}" não possui número de WhatsApp cadastrado!`, "warning");
      return;
    }

    let phoneWithCountry = cleanPhone;
    if (!phoneWithCountry.startsWith("55")) {
      phoneWithCountry = "55" + phoneWithCountry;
    }

    const tratativa = cliente.apelido || cliente.nome.split(" ")[0];
    let msg = "";

    if (tipo === "agradecimento") {
      msg = `Olá ${tratativa}! Tudo bem? Passando para agradecer pela preferência aqui no nosso comércio. É sempre uma grande alegria atender você! Qualquer coisa que precisar é só mandar mensagem por aqui. Tenha um ótimo dia! 😊🏪`;
    } else if (tipo === "extrato") {
      msg = `Olá ${tratativa}! Aqui está o resumo das suas compras no nosso comércio. Agradecemos muito pela confiança e parceria de sempre! Volte sempre! 🛒✨`;
    } else if (tipo === "cobranca") {
      msg = `Olá ${tratativa}, tudo bem? Passando com carinho para lembrar do saldo pendente no nosso caderninho de fiado. Quando puder passar para acertar ficamos à disposição. Muito obrigado pela consideração! 🤝📕`;
    } else {
      msg = `Olá ${tratativa}! Como você está? Temos novidades aqui na loja hoje e lembramos de você! Dá uma passadinha quando puder! 🌟`;
    }

    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Fidelidade & Diagnóstico do Comércio
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Clientes Fiéis
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-purple-400" />
              <span>Diagnóstico de Clientes & Rentabilidade</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
              Saiba exatamente quanto cada cliente gasta no seu comércio por mês, quem gera maior lucro e quem são seus clientes mais valiosos para você cuidar, valorizar e nunca perder uma venda.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenForm()}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/25 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Cliente</span>
            </button>
          </div>
        </div>

        {/* METRICS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-white/10">
          <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Clientes Cadastrados</span>
              <span className="text-lg sm:text-xl font-black text-white font-mono">{enrichedClientes.length} pessoas</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Total Gasto pelos Clientes</span>
              <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">{formatCurrency(totalGeralGastoClientes)}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Total em Fiado Pendente</span>
              <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">{formatCurrency(totalFiadoAbertoGeral)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, apelido, telefone ou bairro..."
            className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-all font-sans"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs font-bold"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="text-xs text-slate-400 font-medium self-center">
          Exibindo <span className="text-white font-bold">{filteredClientes.length}</span> de {enrichedClientes.length} clientes
        </div>
      </div>

      {/* CLIENTS LIST & DIAGNOSTIC GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARDS LIST (COL 7) */}
        <div className="lg:col-span-7 space-y-3.5">
          {filteredClientes.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-white/10 rounded-3xl p-10 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-black text-slate-300 uppercase">Nenhum cliente encontrado</h3>
              <p className="text-xs text-slate-500">Tente buscar com outro nome ou cadastre um novo cliente.</p>
              <button
                type="button"
                onClick={() => handleOpenForm()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase transition-all"
              >
                Cadastrar Primeiro Cliente
              </button>
            </div>
          ) : (
            filteredClientes.map((cliente) => {
              const isSelected = selectedCliente?.id === cliente.id;
              const badgeColor =
                cliente.nivelFidelidade === "ouro"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : cliente.nivelFidelidade === "prata"
                  ? "bg-slate-400/20 text-slate-200 border-slate-400/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

              return (
                <div
                  key={cliente.id}
                  onClick={() => setSelectedCliente(cliente)}
                  className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all cursor-pointer relative overflow-hidden group shadow-lg ${
                    isSelected
                      ? "border-purple-500 bg-slate-900/90 shadow-purple-500/10 ring-1 ring-purple-500"
                      : "border-white/10 hover:border-purple-500/40 hover:bg-slate-850"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
                        {cliente.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                            {cliente.nome}
                          </h3>
                          {cliente.apelido && (
                            <span className="text-[10px] font-black uppercase text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full">
                              "{cliente.apelido}"
                            </span>
                          )}
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {cliente.nivelFidelidade === "ouro" ? "🏆 Ouro" : cliente.nivelFidelidade === "prata" ? "⭐ Prata" : "🌱 Bronze"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          {cliente.whatsapp && (
                            <span className="flex items-center gap-1 text-emerald-400 font-mono">
                              <Phone className="w-3 h-3" />
                              {cliente.whatsapp}
                            </span>
                          )}
                          {cliente.bairro && (
                            <span className="text-slate-400">
                              📍 {cliente.bairro}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenForm(cliente);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Editar Dados do Cliente"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCliente(cliente.id, cliente.nome);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Excluir Cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* FINANCIAL SUMMARY ROW */}
                  <div className="grid grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-white/5 text-center">
                    <div className="bg-slate-950/40 rounded-xl p-2">
                      <span className="text-[8.5px] font-black uppercase text-slate-400 block">Total Gasto</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono block mt-0.5">
                        {formatCurrency(cliente.totalGasto)}
                      </span>
                    </div>
                    <div className="bg-slate-950/40 rounded-xl p-2">
                      <span className="text-[8.5px] font-black uppercase text-slate-400 block">Média Mensal</span>
                      <span className="text-xs sm:text-sm font-black text-purple-300 font-mono block mt-0.5">
                        {formatCurrency(cliente.mediaMensalEstimada)}/mês
                      </span>
                    </div>
                    <div className="bg-slate-950/40 rounded-xl p-2">
                      <span className="text-[8.5px] font-black uppercase text-slate-400 block">Fiado Aberto</span>
                      <span className={`text-xs sm:text-sm font-black font-mono block mt-0.5 ${cliente.totalFiadoPendente > 0 ? "text-amber-400" : "text-slate-400"}`}>
                        {formatCurrency(cliente.totalFiadoPendente)}
                      </span>
                    </div>
                  </div>

                  {/* QUICK ACTION BUTTONS */}
                  <div className="flex items-center justify-between gap-2 mt-3.5 pt-2">
                    <div className="flex items-center gap-1.5">
                      {cliente.whatsapp && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsApp(cliente, "agradecimento");
                          }}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>
                      )}
                      {cliente.totalFiadoPendente > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsApp(cliente, "cobranca");
                          }}
                          className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Cobrar Fiado 🔔</span>
                        </button>
                      )}
                    </div>

                    {onSelectClientForPDV && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClientForPDV(cliente.nome);
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Vender no PDV</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DETAILS & DIAGNOSTIC PANEL (COL 5) */}
        <div className="lg:col-span-5">
          {selectedCliente ? (
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 sticky top-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider">Ficha de Diagnóstico</span>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">{selectedCliente.nome}</h3>
                  {selectedCliente.apelido && (
                    <span className="text-xs text-slate-400">Apelido: {selectedCliente.apelido}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCliente(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* DIAGNOSTIC CARD */}
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-black text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Diagnóstico de Lucro & Importância</span>
                </div>
                <p className="text-xs text-purple-200/90 leading-relaxed font-medium">
                  {selectedCliente.diagnostico}
                </p>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Gasto Total Histórico</span>
                  <span className="text-base font-black text-emerald-400 font-mono block mt-1">
                    {formatCurrency(selectedCliente.totalGasto)}
                  </span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Projeção Média Mensal</span>
                  <span className="text-base font-black text-purple-300 font-mono block mt-1">
                    {formatCurrency(selectedCliente.mediaMensalEstimada)}
                  </span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Limite de Fiado</span>
                  <span className="text-sm font-black text-white font-mono block mt-1">
                    {selectedCliente.limiteFiado ? formatCurrency(selectedCliente.limiteFiado) : "Sem limite"}
                  </span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Total de Compras</span>
                  <span className="text-sm font-black text-white font-mono block mt-1">
                    {selectedCliente.numCompras} compras
                  </span>
                </div>
              </div>

              {selectedCliente.observacoes && (
                <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 text-xs text-slate-300">
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase block mb-1">Notas do Atendimento:</span>
                  {selectedCliente.observacoes}
                </div>
              )}

              {/* HISTORICO DE COMPRAS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                    <span>Histórico de Compras</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                    {selectedCliente.allPurchases.length} registros
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {selectedCliente.allPurchases.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 font-medium">
                      Nenhuma compra registrada ainda para este cliente.
                    </div>
                  ) : (
                    selectedCliente.allPurchases.map((comp) => (
                      <div key={comp.id} className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-xs flex justify-between items-center gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-mono block">{comp.data}</span>
                          <span className="text-slate-200 font-medium text-[11px] block line-clamp-1">{comp.itens}</span>
                          <span className="text-[8.5px] font-bold uppercase text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded">
                            {comp.metodoPagamento}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-emerald-400 font-mono block">
                            {formatCurrency(comp.total)}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-1 rounded ${
                            comp.status === "pago"
                              ? "text-emerald-400"
                              : comp.status === "fiado_quitado"
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}>
                            {comp.status === "pago" ? "Pago" : comp.status === "fiado_quitado" ? "Fiado Pago" : "Fiado Pendente"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="flex gap-2 pt-2 border-t border-white/10">
                {onSelectClientForPDV && (
                  <button
                    type="button"
                    onClick={() => onSelectClientForPDV(selectedCliente.nome)}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Lançar Venda para {selectedCliente.nome.split(" ")[0]}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-dashed border-white/10 rounded-3xl p-8 text-center space-y-3 sticky top-4">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto opacity-70" />
              <h4 className="text-xs font-black uppercase text-slate-300">Selecione um Cliente ao Lado</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Clique em qualquer cliente da lista para visualizar seu diagnóstico de rentabilidade, quanto ele gasta por mês e o histórico completo de compras.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <span>{editingId ? "Editar Cliente" : "Cadastrar Novo Cliente"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCliente} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Hélio da Silva, Denise de Jesus, etc."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Apelido / Tratamento
                  </label>
                  <input
                    type="text"
                    value={formApelido}
                    onChange={(e) => setFormApelido(e.target.value)}
                    placeholder="Ex: Seu Hélio"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    WhatsApp / Celular
                  </label>
                  <input
                    type="text"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    placeholder="DDD + Número"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Bairro / Localidade
                  </label>
                  <input
                    type="text"
                    value={formBairro}
                    onChange={(e) => setFormBairro(e.target.value)}
                    placeholder="Ex: Centro"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Limite Fiado (R$)
                  </label>
                  <input
                    type="text"
                    value={formLimiteFiado}
                    onChange={(e) => setFormLimiteFiado(e.target.value)}
                    placeholder="Ex: 150,00"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Observações / Preferências
                </label>
                <textarea
                  rows={2}
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Ex: Compra salgados toda semana, paga sempre no dia 05, etc."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Cliente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
