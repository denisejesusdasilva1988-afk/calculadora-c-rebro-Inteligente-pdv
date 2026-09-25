import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Save, 
  RefreshCw, 
  Check, 
  Lock, 
  Percent, 
  DollarSign, 
  Undo2, 
  FileText, 
  Trash2, 
  AlertCircle, 
  Sliders, 
  BookOpen, 
  Calendar, 
  ShoppingBag, 
  Layers, 
  Image as ImageIcon, 
  Wallet, 
  Activity, 
  KeyRound, 
  CheckCircle2,
  Users
} from "lucide-react";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

export interface RolePermissions {
  allowDiscount: boolean;
  maxDiscount: number;
  allowEditPrice: boolean;
  allowVoidSale: boolean;
  allowSuprimento: boolean;
  allowSangria: boolean;
  allowCloseShift: boolean;
  allowViewReports: boolean;
  allowOpenBalance: boolean;
  allowRemoveProduct: boolean;
  allowResetEntirePDV: boolean;
  allowNotes?: boolean;
  allowReceipts?: boolean;
  allowAgenda?: boolean;
  allowBrecho?: boolean;
  allowSuper?: boolean;
  allowEncartes?: boolean;
  allowFinanceiro?: boolean;
  allowPDV?: boolean;
  allowInventory?: boolean;
  allowPermissions?: boolean;
  allowReturn?: boolean;
  allowFiados?: boolean;
  allowGetCustomerContact?: boolean;
  allowAddProduct?: boolean;
}

export interface SystemConfig {
  userId: string;
  caixa: RolePermissions;
  vendedor: RolePermissions;
  gerente: RolePermissions;
  updatedAt?: any;
}

const DEFAULT_ROLE_PERMS = (role: string): RolePermissions => ({
  allowDiscount: true,
  maxDiscount: role === "gerente" ? 100 : 50,
  allowEditPrice: role === "gerente",
  allowVoidSale: role === "gerente",
  allowSuprimento: role === "gerente" || role === "caixa",
  allowSangria: role === "gerente" || role === "caixa",
  allowCloseShift: true,
  allowViewReports: role === "gerente",
  allowOpenBalance: role === "gerente" || role === "caixa",
  allowRemoveProduct: role === "gerente",
  allowResetEntirePDV: role === "gerente",
  allowNotes: true,
  allowReceipts: true,
  allowAgenda: true,
  allowBrecho: true,
  allowSuper: true,
  allowEncartes: true,
  allowFinanceiro: role === "gerente",
  allowPDV: true,
  allowInventory: true,
  allowPermissions: role === "gerente",
  allowReturn: role === "gerente" || role === "caixa",
  allowFiados: role === "gerente" || role === "caixa",
  allowGetCustomerContact: true,
  allowAddProduct: role === "gerente"
});

interface PermissionManagementProps {
  db: any;
  userId: string | undefined;
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
  onPermissionsUpdated?: (config: SystemConfig) => void;
}

export const PermissionManagement: React.FC<PermissionManagementProps> = ({
  db,
  userId,
  showNotification,
  onPermissionsUpdated
}) => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [activeRole, setActiveRole] = useState<"caixa" | "vendedor" | "gerente">("caixa");
  const [discountInputMap, setDiscountInputMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isRealUser = Boolean(userId && userId !== "guest_visitor");
  const targetUserId = isRealUser ? (userId as string) : "local_store_owner";

  // Load permissions in real-time from Firestore or LocalStorage fallback
  useEffect(() => {
    if (!db || !isRealUser) {
      // Fallback local configuration
      try {
        const saved = localStorage.getItem("pdv_system_config");
        if (saved) {
          const parsed = JSON.parse(saved);
          setConfig(parsed);
          if (onPermissionsUpdated) onPermissionsUpdated(parsed);
        } else {
          const initial: SystemConfig = {
            userId: targetUserId,
            caixa: DEFAULT_ROLE_PERMS("caixa"),
            vendedor: DEFAULT_ROLE_PERMS("vendedor"),
            gerente: DEFAULT_ROLE_PERMS("gerente")
          };
          setConfig(initial);
          if (onPermissionsUpdated) onPermissionsUpdated(initial);
        }
      } catch (err) {
        console.error("Erro ao carregar permissões locais:", err);
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const docRef = doc(db, "configuracoes_sistema", targetUserId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemConfig;
        // Merge missing fields to avoid undefined errors
        const loadedConfig: SystemConfig = {
          userId: targetUserId,
          caixa: { ...DEFAULT_ROLE_PERMS("caixa"), ...data.caixa },
          vendedor: { ...DEFAULT_ROLE_PERMS("vendedor"), ...data.vendedor },
          gerente: { ...DEFAULT_ROLE_PERMS("gerente"), ...data.gerente },
          updatedAt: data.updatedAt
        };
        setConfig(loadedConfig);
        try {
          localStorage.setItem("pdv_system_config", JSON.stringify(loadedConfig));
        } catch (_) {}
        if (onPermissionsUpdated) onPermissionsUpdated(loadedConfig);
      } else {
        const initialConfig: SystemConfig = {
          userId: targetUserId,
          caixa: DEFAULT_ROLE_PERMS("caixa"),
          vendedor: DEFAULT_ROLE_PERMS("vendedor"),
          gerente: DEFAULT_ROLE_PERMS("gerente")
        };
        setConfig(initialConfig);
        if (onPermissionsUpdated) onPermissionsUpdated(initialConfig);
        setDoc(docRef, {
          ...initialConfig,
          createdAt: serverTimestamp()
        }).catch(err => console.error("Erro ao inicializar documento no firestore:", err));
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Erro ao escutar configuracoes_sistema no Firestore:", err);
      // Fallback to local on error
      try {
        const saved = localStorage.getItem("pdv_system_config");
        if (saved) setConfig(JSON.parse(saved));
      } catch (_) {}
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, targetUserId, isRealUser]);

  const handleTogglePermission = (key: keyof RolePermissions) => {
    if (!config) return;

    const currentVal = config[activeRole][key];
    const updatedRoleConfig = {
      ...config[activeRole],
      [key]: typeof currentVal === "boolean" ? !currentVal : currentVal
    };

    const newConfig = {
      ...config,
      [activeRole]: updatedRoleConfig
    };

    setConfig(newConfig);
  };

  const handleMaxDiscountChange = (val: number) => {
    if (!config) return;

    const updatedRoleConfig = {
      ...config[activeRole],
      maxDiscount: Math.max(0, Math.min(100, val))
    };

    const newConfig = {
      ...config,
      [activeRole]: updatedRoleConfig
    };

    setConfig(newConfig);
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      localStorage.setItem("pdv_system_config", JSON.stringify(config));

      if (db && isRealUser) {
        const docRef = doc(db, "configuracoes_sistema", targetUserId);
        await setDoc(docRef, {
          ...config,
          updatedAt: serverTimestamp()
        }, { merge: true });
        showNotification("Permissões de equipe salvas com sucesso no Firestore e localmente! 🔒👑", "success");
      } else {
        showNotification("Permissões do proprietário salvas localmente no navegador! 📱💾", "success");
      }

      if (onPermissionsUpdated) {
        onPermissionsUpdated(config);
      }
      window.dispatchEvent(new CustomEvent("pdv_config_updated", { detail: config }));
    } catch (err) {
      console.error("Erro ao salvar permissões:", err);
      showNotification("Erro ao salvar configurações no banco de dados.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">Buscando Regras & Permissões...</span>
      </div>
    );
  }

  if (!config) return null;

  const currentPerms = config[activeRole] || DEFAULT_ROLE_PERMS(activeRole);

  const permissionCategories = [
    {
      title: "Controles Financeiros & de Caixa 💸",
      icon: <Wallet className="w-4 h-4 text-emerald-400" />,
      items: [
        {
          key: "allowPDV",
          label: "Acesso à Frente de Caixa (PDV)",
          desc: "Permite abrir a tela de vendas de frente de caixa.",
          icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />
        },
        {
          key: "allowDiscount",
          label: "Permissão de Desconto",
          desc: "Permite dar descontos em vendas, com total liberdade para definir qualquer porcentagem (0% a 100%).",
          icon: <Percent className="w-3.5 h-3.5 text-purple-400" />,
          extra: currentPerms.allowDiscount && (
            <div className="space-y-2.5 mt-2.5 pt-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-950 border border-purple-500/40 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-500/50 rounded-xl px-2.5 py-1.5 shadow-inner transition-all">
                  <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Máx:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      discountInputMap[activeRole] !== undefined
                        ? discountInputMap[activeRole]
                        : currentPerms.maxDiscount !== undefined
                        ? String(currentPerms.maxDiscount)
                        : "50"
                    }
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      // Remove non-digits
                      let clean = e.target.value.replace(/[^\d]/g, "");
                      // Strip leading zeros if more than 1 digit (e.g. "010" -> "10")
                      if (clean.length > 1 && clean.startsWith("0")) {
                        clean = clean.replace(/^0+/, "");
                      }
                      setDiscountInputMap(prev => ({ ...prev, [activeRole]: clean }));
                      if (clean === "") {
                        handleMaxDiscountChange(0);
                      } else {
                        const num = Math.min(100, parseInt(clean, 10) || 0);
                        handleMaxDiscountChange(num);
                      }
                    }}
                    onBlur={() => {
                      const currentVal = discountInputMap[activeRole];
                      if (currentVal === "" || currentVal === undefined) {
                        const fallback = currentPerms.maxDiscount ?? 50;
                        setDiscountInputMap(prev => ({ ...prev, [activeRole]: String(fallback) }));
                        handleMaxDiscountChange(fallback);
                      }
                    }}
                    placeholder="50"
                    className="w-12 bg-transparent text-center text-sm text-white font-black border-0 p-0 focus:ring-0 outline-none"
                  />
                  <span className="text-xs text-purple-300 font-black">%</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Defina de 0% a 100%</span>
              </div>

              {/* Botões rápidos de escolha rápida */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] text-purple-300 font-bold uppercase tracking-wider mr-0.5">Atalhos:</span>
                {[5, 10, 15, 20, 30, 50, 100].map((pct) => {
                  const isCurrent = currentPerms.maxDiscount === pct;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDiscountInputMap(prev => ({ ...prev, [activeRole]: String(pct) }));
                        handleMaxDiscountChange(pct);
                      }}
                      className={`px-2.5 py-1 text-[10.5px] font-black rounded-lg transition-all active:scale-95 cursor-pointer border ${
                        isCurrent
                          ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 scale-105"
                          : "bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-white/10 hover:border-purple-500/40 hover:text-white"
                      }`}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>
            </div>
          )
        },
        {
          key: "allowReturn",
          label: "Devolver Produtos para as Prateleiras",
          desc: "Permite processar trocas e devoluções de itens no histórico, retornando os produtos devolvidos para o estoque físico.",
          icon: <Undo2 className="w-3.5 h-3.5 text-orange-400" />
        },
        {
          key: "allowSuprimento",
          label: "Mexer no Fundo do Caixa (Suprimento)",
          desc: "Permite colocar dinheiro inicial de troco ou reforço físico de notas na gaveta do caixa.",
          icon: <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
        },
        {
          key: "allowSangria",
          label: "Mexer no Fundo do Caixa (Sangria)",
          desc: "Permite retirar dinheiro físico do caixa para pagamentos de despesas ou segurança.",
          icon: <Sliders className="w-3.5 h-3.5 text-amber-500" />
        },
        {
          key: "allowOpenBalance",
          label: "Ver Balanceamento (Abertura/Auditoria)",
          desc: "Permite definir o saldo inicial do turno de trabalho e realizar a conferência/balanceamento da gaveta.",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
        },
        {
          key: "allowCloseShift",
          label: "Fechar Caixa / Turno",
          desc: "Permite fazer o fechamento físico do caixa do dia, gerando o relatório final com as vendas brutas.",
          icon: <Lock className="w-3.5 h-3.5 text-rose-500" />
        },
        {
          key: "allowFiados",
          label: "Módulo Fiados / Caderneta",
          desc: "Permite vender usando o método FIADO, criando contas correntes pendentes na caderneta de clientes.",
          icon: <BookOpen className="w-3.5 h-3.5 text-red-400" />
        },
        {
          key: "allowGetCustomerContact",
          label: "Pegar Contato do Cliente p/ Cupom Fiscal",
          desc: "Permite capturar o nome, CPF e telefone do cliente no momento da finalização do cupom fiscal da venda.",
          icon: <Users className="w-3.5 h-3.5 text-cyan-400" />
        }
      ]
    },
    {
      title: "Administração & Cadastros de Comércio 📦",
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      items: [
        {
          key: "allowAddProduct",
          label: "Cadastrar Novos Produtos / Estoque",
          desc: "Permite registrar novos produtos, preços, custos, códigos de barras e configurar estoque crítico no catálogo.",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        },
        {
          key: "allowEditPrice",
          label: "Editar Preços de Venda no Carrinho",
          desc: "Permite alterar os preços de itens em tempo real diretamente dentro do carrinho de vendas.",
          icon: <DollarSign className="w-3.5 h-3.5 text-amber-400" />
        },
        {
          key: "allowVoidSale",
          label: "Estornar/Cancelar Vendas Completas",
          desc: "Permite estornar ou cancelar lançamentos concluídos diretamente do relatório de fluxo.",
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        },
        {
          key: "allowRemoveProduct",
          label: "Excluir Produtos do Catálogo",
          desc: "Permite apagar permanentemente produtos do estoque e catálogo de itens da loja.",
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />
        },
        {
          key: "allowViewReports",
          label: "Ver Histórico de Fluxo de Caixa (BI)",
          desc: "Permite acessar gráficos de desempenho, vendas brutas, faturamento líquido e relatórios consolidados.",
          icon: <FileText className="w-3.5 h-3.5 text-sky-400" />
        },
        {
          key: "allowFinanceiro",
          label: "Acesso ao Painel Financeiro Geral",
          desc: "Permite monitorar as despesas da loja, acompanhar o CMV (Custo de Mercadoria) e taxas de cartões.",
          icon: <Wallet className="w-3.5 h-3.5 text-teal-400" />
        },
        {
          key: "allowPermissions",
          label: "Gerenciar Permissões da Equipe",
          desc: "Permite gerenciar as regras de cargos e controle de acessos deste painel.",
          icon: <Shield className="w-3.5 h-3.5 text-amber-500" />
        },
        {
          key: "allowResetEntirePDV",
          label: "Zerar Todo o Caixa (Reset Geral)",
          desc: "Permite apagar todo o histórico de vendas e reiniciar o banco de dados do zero. USE COM EXTREMA CAUTELA!",
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" />,
          isDanger: true
        }
      ]
    },
    {
      title: "Módulos Auxiliares de Apoio 📑",
      icon: <Layers className="w-4 h-4 text-emerald-400" />,
      items: [
        {
          key: "allowNotes",
          label: "Acesso ao Bloco de Notas",
          desc: "Permite visualizar e editar as anotações internas do estabelecimento comercial.",
          icon: <BookOpen className="w-3.5 h-3.5 text-yellow-400" />
        },
        {
          key: "allowReceipts",
          label: "Gerador de Recibos de Pagamento",
          desc: "Permite gerar e fazer download de recibos customizados em formato de imagem/PDF para clientes.",
          icon: <FileText className="w-3.5 h-3.5 text-indigo-400" />
        },
        {
          key: "allowAgenda",
          label: "Acesso aos Pedidos & Agenda Comercial",
          desc: "Permite visualizar ou agendar datas de entregas de encomendas, horários de serviços e frete.",
          icon: <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        },
        {
          key: "allowBrecho",
          label: "Módulo Bazar & Brechó",
          desc: "Permite controle de lotes de roupas usadas, tamanhos, cores e controle específico de peças.",
          icon: <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
        },
        {
          key: "allowSuper",
          label: "Lista de Compras e Abastecimento",
          desc: "Permite criar e gerenciar a lista de suprimentos internos para compras em atacados.",
          icon: <ShoppingBag className="w-3.5 h-3.5 text-red-400" />
        },
        {
          key: "allowEncartes",
          label: "Gerador de Encartes Visuais",
          desc: "Permite gerar artes e folhetos promocionais de ofertas para divulgação no WhatsApp ou redes sociais.",
          icon: <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
        },
        {
          key: "allowInventory",
          label: "Consulta e Controle de Estoque",
          desc: "Permite inspecionar a listagem geral de estoque e alertas de estoque crítico.",
          icon: <Layers className="w-3.5 h-3.5 text-emerald-500" />
        }
      ]
    }
  ];

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Title block */}
      <div className="bg-slate-950/50 border border-amber-500/10 rounded-3xl p-5 flex flex-col md:flex-row items-start gap-4">
        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-1">
          <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider font-sans">
            Configurar Permissões de Equipe por Cargo 👑
          </h3>
          <p className="text-[11px] text-slate-300 font-medium leading-relaxed font-sans">
            Selecione o cargo abaixo e use os seletores (chavinhas) para ligar ou desligar recursos específicos de forma imediata. Ao finalizar, clique em salvar para registrar no Firestore.
          </p>
          
          <div className="p-3 bg-purple-950/20 border border-purple-500/15 rounded-xl text-[10.5px] text-purple-300 font-medium leading-normal flex items-start gap-2.5">
            <span className="text-sm">👑</span>
            <div>
              <strong className="text-white">Dono Proprietário:</strong> Possui acesso mestre total automático e irrestrito. Nunca será bloqueado para evitar que o dono se exclua acidentalmente das configurações.
            </div>
          </div>
        </div>
      </div>

      {/* Role selector tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/40 p-2 rounded-2xl border border-white/5">
        <div className="flex flex-wrap gap-1">
          {(["caixa", "vendedor", "gerente"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeRole === role
                  ? "bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                  : "text-slate-400 hover:text-white bg-transparent"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{role === "caixa" ? "Caixa / Funcionário" : role === "vendedor" ? "Vendedor" : "Gerente"}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? "Salvando..." : "Salvar Permissões"}</span>
        </button>
      </div>

      {/* Grid of categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {permissionCategories.map((category, catIdx) => (
          <div key={catIdx} className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <div className="p-2 bg-slate-950 rounded-lg border border-white/5 shrink-0">
                {category.icon}
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                {category.title}
              </h4>
            </div>

            <div className="space-y-2.5">
              {category.items.map((item) => {
                const key = item.key as keyof RolePermissions;
                const isEnabled = currentPerms[key] !== false;

                return (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-4 p-3 bg-slate-950/30 hover:bg-slate-950/50 rounded-xl border border-white/5 transition-all text-left"
                  >
                    <div className="flex gap-3 min-w-0">
                      <div className="p-2 bg-slate-950 rounded-xl border border-white/5 text-slate-400 shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-white block">
                          {item.label}
                        </span>
                        <p className="text-[10px] text-slate-400 leading-normal font-sans">
                          {item.desc}
                        </p>
                        {item.extra}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 select-none pt-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(key)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 focus:outline-none flex items-center relative cursor-pointer border ${
                          isEnabled
                            ? (item.isDanger ? 'bg-rose-500/90 border-rose-500 shadow-md shadow-rose-500/20' : 'bg-amber-500 border-amber-400 shadow-md shadow-amber-500/25')
                            : 'bg-slate-950 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span
                          className={`w-4.5 h-4.5 rounded-full shadow-sm transform transition-transform duration-200 ease-out ${
                            isEnabled ? 'translate-x-5 bg-slate-950' : 'translate-x-0 bg-slate-500'
                          }`}
                        />
                      </button>
                      <span className={`text-[10px] font-black w-6 text-left transition-colors ${
                        isEnabled
                          ? (item.isDanger ? 'text-rose-400' : 'text-amber-400')
                          : 'text-slate-500'
                      }`}>
                        {isEnabled ? "Sim" : "Não"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
