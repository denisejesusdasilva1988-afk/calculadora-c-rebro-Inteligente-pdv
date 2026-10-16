/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Módulo Completo para Barbearias, Salões de Beleza, Profissionais & Encomendas de Festas/Eventos
 * 
 * Recursos:
 * 1. Fotos e Dados dos Profissionais / Funcionários separados (Barbeiros, Cabeleireiras, etc.)
 * 2. Logomarca e Link Personalizado da Empresa (Instagram, WhatsApp, Site)
 * 3. Aniversários de Clientes (com botão para felicitar e enviar presente no WhatsApp)
 * 4. Agenda de Atendimentos & Serviços de Salão e Barbearia (com lembretes)
 * 5. Módulo de Encomendas para Festas & Eventos (Bolos, Salgados, Doces, Kits, Sinal e Saldo)
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Scissors,
  Users,
  Calendar as CalendarIcon,
  Cake,
  PartyPopper,
  Building2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Share2,
  DollarSign,
  Camera,
  Upload,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  Gift,
  ArrowRight,
  TrendingUp,
  Receipt,
  AlertCircle,
  Save,
  Lock,
  Unlock,
  Send,
  X,
  Megaphone,
  Heart,
  Palette
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ClientPublicAgendaPortal } from "./ClientPublicAgendaPortal";
import { BarbeariaTimelineAgenda } from "./BarbeariaTimelineAgenda";
import { ModalConfiguracaoAgendaProfissional } from "./ModalConfiguracaoAgendaProfissional";
import { ModalPersonalizarParabens, MODELOS_PARABENS_PRONTOS } from "./ModalPersonalizarParabens";
import { ModalComunicadosAgenda } from "./ModalComunicadosAgenda";
import { loadCompanyProfile, saveCompanyProfile } from "../utils/companyProfile";

// Segmentos suportados no módulo
export type NegocioSegmento = "barbearia" | "salao" | "manicure" | "festas";

// Modelo de Bloqueio ou Horário Reservado do Profissional
export interface HorarioBloqueadoProfissional {
  id: string;
  data?: string; // se vazio, vale recorrente para todos os dias
  horarioInicio: string; // "12:00"
  horarioFim: string; // "13:30"
  motivo: string; // "Horário de Almoço", "Reservado", "Consulta Médica", "Indisponível"
  tipo?: "almoco" | "reservado" | "indisponivel" | "folga";
}

// Modelo de Profissional / Barbeiro / Manicure / Confeiteira
export interface ProfissionalBarbearia {
  id: string;
  nome: string;
  apelido?: string;
  categoria?: NegocioSegmento; // "barbearia" | "salao" | "manicure" | "festas"
  fotoUrl: string;
  especialidade: string; // Ex: Corte Degradê, Barba Terapia, Manicure, Doces
  telefone: string;
  chavePix?: string;
  comissaoPct: number; // Ex: 50%
  horarioTrabalho?: string;
  horaInicio?: string; // Horário de abertura da agenda (Ex: "08:00" ou "09:00")
  horaFim?: string; // Horário de fechamento da agenda (Ex: "19:00" ou "20:00")
  diasSemana?: number[]; // Dias de atendimento [1, 2, 3, 4, 5, 6] (1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sáb, 0=dom)
  intervaloInicio?: string; // Início do almoço/intervalo (Ex: "12:00")
  intervaloFim?: string; // Fim do almoço/intervalo (Ex: "13:30" ou "14:00")
  intervaloMotivo?: string; // Ex: "Horário de almoço"
  bloqueiosPersonalizados?: HorarioBloqueadoProfissional[];
  totalAtendimentos: number;
  totalFaturado: number;
  ativo: boolean;
}

// Modelo de Agendamento de Atendimento
export interface AgendamentoServico {
  id: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  horarioFim?: string; // HH:mm (ex: 09:40)
  clienteNome: string;
  clienteTelefone: string;
  profissionalId: string;
  profissionalNome: string;
  categoria?: NegocioSegmento;
  servico: string;
  valor: number;
  status: "agendado" | "em_atendimento" | "concluido" | "cancelado";
  observacoes?: string;
  criadoEm: string;
}

// Modelo de Aniversário de Cliente
export interface AniversarioCliente {
  id: string;
  nome: string;
  telefone: string;
  dia: number; // 1 a 31
  mes: number; // 1 a 12
  anoNascimento?: number;
  observacao?: string;
  presenteOferecido?: string;
}

// Modelo de Encomenda para Festas
export interface EncomendaFesta {
  id: string;
  dataEntrega: string; // YYYY-MM-DD
  horarioEntrega: string; // HH:mm
  clienteNome: string;
  clienteTelefone: string;
  tipoEvento: string; // Aniversário, Casamento, Confraternização, Festa Infantil
  itensDescricao: string; // Ex: Bolo Chocolate 3kg + 100 Salgados + 50 Brigadeiros
  categoriaFesta?: "bolo" | "salgados" | "doces" | "kit_completo" | "buffet" | "outro";
  valorTotal: number;
  sinalPago: number;
  saldoRestante: number;
  metodoPagamentoSinal: string;
  status: "anotado" | "em_preparo" | "pronto" | "entregue";
  observacoes?: string;
  criadoEm: string;
}

interface BarbeariaSalaoEventosModuleProps {
  userId?: string | null;
  db?: any;
  formatCurrency?: (val: number) => string;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
  onOpenPDV?: () => void;
}

// Avatares ilustrativos para fotos de profissionais caso não faça upload
const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
];

export const BarbeariaSalaoEventosModule: React.FC<BarbeariaSalaoEventosModuleProps> = ({
  userId,
  db,
  formatCurrency = (v) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`,
  showNotification,
  onOpenPDV
}) => {
  // Aba Ativa
  const [activeTab, setActiveTab] = useState<"profissionais" | "agenda" | "aniversarios" | "encomendas" | "empresa">("profissionais");
  const [agendaViewMode, setAgendaViewMode] = useState<"timeline" | "lista">("timeline");

  // Filtro de Segmento Selecionado: "todos" | "barbearia" | "salao" | "manicure" | "festas"
  const [segmentFilter, setSegmentFilter] = useState<"todos" | NegocioSegmento>(() => {
    try {
      const saved = localStorage.getItem("barbearia_selected_segment");
      if (saved && ["todos", "barbearia", "salao", "manicure", "festas"].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return "todos";
  });

  // Modais de Mensagens WhatsApp
  const [isPersonalizarParabensOpen, setIsPersonalizarParabensOpen] = useState(false);
  const [isComunicadosAgendaOpen, setIsComunicadosAgendaOpen] = useState(false);

  // Armazenamento
  const storagePrefix = userId && userId !== "guest_visitor" ? `barbearia_${userId}_` : "barbearia_guest_";

  // 1. Profissionais State com todos os 4 segmentos separados
  const [profissionais, setProfissionais] = useState<ProfissionalBarbearia[]>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}profissionais`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "prof_1",
        nome: "Carlos Eduardo",
        apelido: "Kadu Navalha",
        categoria: "barbearia",
        fotoUrl: AVATAR_PRESETS[0],
        especialidade: "Corte Degradê & Barba Terapia",
        telefone: "21988887777",
        chavePix: "21988887777",
        comissaoPct: 50,
        horarioTrabalho: "Terça a Sábado, 09h às 19h",
        totalAtendimentos: 42,
        totalFaturado: 1470,
        ativo: true
      },
      {
        id: "prof_2",
        nome: "Juliana Santos",
        apelido: "Ju Hair",
        categoria: "salao",
        fotoUrl: AVATAR_PRESETS[2],
        especialidade: "Escova, Mechas & Penteados",
        telefone: "21977776666",
        chavePix: "21977776666",
        comissaoPct: 50,
        horarioTrabalho: "Quarta a Domingo, 10h às 20h",
        totalAtendimentos: 28,
        totalFaturado: 1960,
        ativo: true
      },
      {
        id: "prof_3",
        nome: "Larissa Silveira",
        apelido: "Larissa Nails",
        categoria: "manicure",
        fotoUrl: AVATAR_PRESETS[1],
        especialidade: "Manicure, Pedicure & Alongamento em Gel",
        telefone: "21966665555",
        chavePix: "21966665555",
        comissaoPct: 60,
        horarioTrabalho: "Segunda a Sábado, 09h às 18h",
        totalAtendimentos: 36,
        totalFaturado: 2160,
        ativo: true
      },
      {
        id: "prof_4",
        nome: "Chef Renata Festas",
        apelido: "Renata Doces & Bolos",
        categoria: "festas",
        fotoUrl: AVATAR_PRESETS[3],
        especialidade: "Bolos Confeitados, Salgados Cento & Kits Festa",
        telefone: "21955554444",
        chavePix: "21955554444",
        comissaoPct: 100,
        horarioTrabalho: "Segunda a Domingo (Sob Encomenda)",
        totalAtendimentos: 19,
        totalFaturado: 3890,
        ativo: true
      }
    ];
  });

  // 2. Agendamentos State
  const [agendamentos, setAgendamentos] = useState<AgendamentoServico[]>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}agendamentos`);
      if (saved) return JSON.parse(saved);
    } catch {}
    const today = new Date().toISOString().slice(0, 10);
    return [
      {
        id: "ag_1",
        data: today,
        horario: "14:00",
        clienteNome: "Marcos Vinicius",
        clienteTelefone: "21999991111",
        profissionalId: "prof_1",
        profissionalNome: "Carlos Eduardo",
        categoria: "barbearia",
        servico: "Corte Degradê + Barba Terapia",
        valor: 55,
        status: "agendado",
        criadoEm: new Date().toISOString()
      },
      {
        id: "ag_2",
        data: today,
        horario: "16:30",
        clienteNome: "Fernanda Lima",
        clienteTelefone: "21999992222",
        profissionalId: "prof_2",
        profissionalNome: "Juliana Santos",
        categoria: "salao",
        servico: "Escova Modelada + Hidratação",
        valor: 75,
        status: "agendado",
        criadoEm: new Date().toISOString()
      },
      {
        id: "ag_3",
        data: today,
        horario: "11:00",
        clienteNome: "Camila Ribeiro",
        clienteTelefone: "21999993333",
        profissionalId: "prof_3",
        profissionalNome: "Larissa Silveira",
        categoria: "manicure",
        servico: "Alongamento em Gel + Esmaltação",
        valor: 130,
        status: "agendado",
        criadoEm: new Date().toISOString()
      }
    ];
  });

  // 3. Aniversários State
  const [aniversarios, setAniversarios] = useState<AniversarioCliente[]>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}aniversarios`);
      if (saved) return JSON.parse(saved);
    } catch {}
    const now = new Date();
    return [
      {
        id: "aniv_1",
        nome: "Rodrigo Mendonça",
        telefone: "21996673263",
        dia: now.getDate(), // Hoje para demonstrar
        mes: now.getMonth() + 1,
        observacao: "Cliente assíduo de barba",
        presenteOferecido: "10% de desconto no corte de aniversário"
      },
      {
        id: "aniv_2",
        nome: "Patrícia Alves",
        telefone: "21988882222",
        dia: (now.getDate() + 3) % 28 + 1,
        mes: now.getMonth() + 1,
        observacao: "Faz unhas e cabelo para festas",
        presenteOferecido: "Hidratação cortesia de aniversário"
      }
    ];
  });

  // 4. Encomendas para Festas & Eventos State
  const [encomendas, setEncomendas] = useState<EncomendaFesta[]>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}encomendas`);
      if (saved) return JSON.parse(saved);
    } catch {}
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const inThreeDays = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
    return [
      {
        id: "enc_1",
        dataEntrega: tomorrow,
        horarioEntrega: "15:00",
        clienteNome: "Renata Oliveira",
        clienteTelefone: "21998887766",
        tipoEvento: "Aniversário Infantil",
        categoriaFesta: "kit_completo",
        itensDescricao: "Bolo de Chocolate Brigadeiro 3kg + 100 Coxinhas + 50 Brigadeiros + 50 Beijinhos + 2 Refris 2L",
        valorTotal: 340,
        sinalPago: 170,
        saldoRestante: 170,
        metodoPagamentoSinal: "PIX",
        status: "em_preparo",
        criadoEm: new Date().toISOString()
      },
      {
        id: "enc_2",
        dataEntrega: inThreeDays,
        horarioEntrega: "18:00",
        clienteNome: "Mariana & Carlos",
        clienteTelefone: "21977778899",
        tipoEvento: "Festa de Noivado / Casamento",
        categoriaFesta: "bolo",
        itensDescricao: "Bolo de Andar Flores Brancas (Massa Nozes com Doce de Leite) + 150 Doces Finos",
        valorTotal: 520,
        sinalPago: 260,
        saldoRestante: 260,
        metodoPagamentoSinal: "Cartão de Crédito",
        status: "anotado",
        criadoEm: new Date().toISOString()
      }
    ];
  });

  // 5. Dados da Empresa e Redes Sociais (Deixados em branco por padrão para cada negócio preencher o seu)
  const [companyName, setCompanyName] = useState(() => {
    return loadCompanyProfile(userId).name || localStorage.getItem("pdv_store_name") || "Barbearia, Salão & Festas";
  });
  const [companyLogo, setCompanyLogo] = useState(() => {
    return loadCompanyProfile(userId).logoUrl || localStorage.getItem("pdv_company_logo") || "";
  });
  const [companyPhone, setCompanyPhone] = useState(() => {
    return loadCompanyProfile(userId).whatsapp || loadCompanyProfile(userId).phone || localStorage.getItem("pdv_store_phone") || "";
  });
  const [companyInstagram, setCompanyInstagram] = useState(() => {
    return loadCompanyProfile(userId).instagram || localStorage.getItem("pdv_store_instagram") || "";
  });
  const [companyFacebook, setCompanyFacebook] = useState(() => {
    return loadCompanyProfile(userId).facebook || localStorage.getItem("pdv_store_facebook") || "";
  });
  const [companyWebsite, setCompanyWebsite] = useState(() => {
    return loadCompanyProfile(userId).website || localStorage.getItem("pdv_store_website") || "";
  });
  const [companyLink, setCompanyLink] = useState(() => {
    return localStorage.getItem("pdv_company_link") || "";
  });

  // Salvar no localStorage sempre que mudar
  const [allowCaixaAgendar, setAllowCaixaAgendar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("barbearia_caixa_pode_agendar");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [allowCaixaEncomendar, setAllowCaixaEncomendar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("barbearia_caixa_pode_encomendar");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [isPublicAgendaActive, setIsPublicAgendaActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("barbearia_link_publico_ativo");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [isPreviewClientPortalOpen, setIsPreviewClientPortalOpen] = useState(false);
  const [editingScheduleProf, setEditingScheduleProf] = useState<ProfissionalBarbearia | null>(null);

  const handleUpdateProfissional = (profAtualizado: ProfissionalBarbearia) => {
    setProfissionais((prev) =>
      prev.map((p) => (p.id === profAtualizado.id ? profAtualizado : p))
    );
    showNotification(`Agenda de ${profAtualizado.nome} atualizada com sucesso! ✂️📅`, "success");
  };

  const handleCompanyLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification("A imagem da logo deve ter no máximo 5MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCompanyLogo(reader.result);
          localStorage.setItem("pdv_company_logo", reader.result);
          window.dispatchEvent(new CustomEvent("pdv_company_profile_changed", {
            detail: { logoUrl: reader.result }
          }));
          showNotification("Logomarca carregada com sucesso! 🖼️ Clique em 'Salvar Identidade' para confirmar.", "success");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Role check
  const gestaoRole = (() => {
    try {
      return localStorage.getItem("pdv_gestao_user_role") || "proprietario";
    } catch {
      return "proprietario";
    }
  })();
  const isCaixa = gestaoRole === "caixa" || gestaoRole === "funcionario";

  const clientAgendaUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}?agendar=true`
    : "";

  const handleCopyClientAgendaLink = () => {
    if (!isPublicAgendaActive) {
      showNotification("Atenção: O link público está desativado (marcado como NÃO). Ative com SIM para os clientes conseguirem agendar!", "error");
    }
    navigator.clipboard.writeText(clientAgendaUrl);
    showNotification("Link da Agenda copiado! 📋 Envie para seus clientes no WhatsApp.", "success");
  };

  const handleShareAgendaOnWhatsApp = () => {
    if (!isPublicAgendaActive) {
      showNotification("Atenção: O link público está desativado (marcado como NÃO). Ative com SIM para os clientes conseguirem agendar!", "error");
    }
    const msg = encodeURIComponent(
      `Olá! 💈✂️ Agora você pode agendar seu horário na *${companyName}* ou solicitar sua encomenda de festa diretamente pelo nosso link exclusivo:\n\n` +
      `👉 ${clientAgendaUrl}\n\n` +
      `Escolha o profissional, o serviço e o melhor horário para você sem complicação! Esperamos por você! ✨`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleToggleAllowCaixa = (permitir: boolean) => {
    setAllowCaixaAgendar(permitir);
    localStorage.setItem("barbearia_caixa_pode_agendar", String(permitir));
    showNotification(
      permitir
        ? "Caixa de Marcar: SIM! Operadores do Caixa podem marcar horários na Agenda. ✅"
        : "Caixa de Marcar: NÃO! Apenas o Proprietário ou clientes pelo WhatsApp podem marcar horários. 🔒",
      permitir ? "success" : "info"
    );
  };

  const handleToggleAllowCaixaEncomendar = (permitir: boolean) => {
    setAllowCaixaEncomendar(permitir);
    localStorage.setItem("barbearia_caixa_pode_encomendar", String(permitir));
    showNotification(
      permitir
        ? "Caixa de Marcar Encomendas: SIM! O Caixa pode anotar encomendas de festas no balcão. ✅"
        : "Caixa de Marcar Encomendas: NÃO! Bloqueado para o Caixa. Apenas o Proprietário anota encomendas. 🔒",
      permitir ? "success" : "info"
    );
  };

  const handleTogglePublicAgendaActive = (ativo: boolean) => {
    setIsPublicAgendaActive(ativo);
    localStorage.setItem("barbearia_link_publico_ativo", String(ativo));
    showNotification(
      ativo
        ? "Link Público Ativo: SIM! Clientes agora podem marcar horários e festas pelo WhatsApp. 📲✅"
        : "Link Público Desativado: NÃO! Clientes não conseguirão agendar pelo link até você reativar. ⏸️",
      ativo ? "success" : "info"
    );
  };

  // 1. Sincronizar dados do Firestore ao carregar para não perder cadastros
  useEffect(() => {
    let isMounted = true;
    const fetchCloudData = async () => {
      if (!userId || userId === "guest_visitor" || !db) return;
      try {
        const snap = await getDoc(doc(db, "userData", userId));
        if (snap.exists() && isMounted) {
          const d = snap.data();
          if (Array.isArray(d.barbeariaProfissionais) && d.barbeariaProfissionais.length > 0) {
            setProfissionais(d.barbeariaProfissionais);
            localStorage.setItem(`${storagePrefix}profissionais`, JSON.stringify(d.barbeariaProfissionais));
          }
          if (Array.isArray(d.barbeariaAgendamentos)) {
            setAgendamentos(d.barbeariaAgendamentos);
            localStorage.setItem(`${storagePrefix}agendamentos`, JSON.stringify(d.barbeariaAgendamentos));
          }
          if (Array.isArray(d.barbeariaAniversarios)) {
            setAniversarios(d.barbeariaAniversarios);
            localStorage.setItem(`${storagePrefix}aniversarios`, JSON.stringify(d.barbeariaAniversarios));
          }
          if (Array.isArray(d.barbeariaEncomendas)) {
            setEncomendas(d.barbeariaEncomendas);
            localStorage.setItem(`${storagePrefix}encomendas`, JSON.stringify(d.barbeariaEncomendas));
          }
          if (d.companyProfile) {
            const cp = d.companyProfile;
            if (cp.name) setCompanyName(cp.name);
            if (cp.logoUrl !== undefined) setCompanyLogo(cp.logoUrl);
            if (cp.phone || cp.whatsapp) setCompanyPhone(cp.phone || cp.whatsapp);
            if (cp.instagram) setCompanyInstagram(cp.instagram);
            if (cp.facebook) setCompanyFacebook(cp.facebook);
            if (cp.website) setCompanyWebsite(cp.website);
          }
        }
      } catch (err) {
        console.warn("Aviso ao ler dados da barbearia/salão da nuvem:", err);
      }
    };
    fetchCloudData();
    return () => { isMounted = false; };
  }, [userId, db, storagePrefix]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}profissionais`, JSON.stringify(profissionais));
    if (userId && userId !== "guest_visitor" && db) {
      setDoc(doc(db, "userData", userId), { barbeariaProfissionais: profissionais }, { merge: true }).catch(() => {});
    }
  }, [profissionais, storagePrefix, userId, db]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}agendamentos`, JSON.stringify(agendamentos));
    if (userId && userId !== "guest_visitor" && db) {
      setDoc(doc(db, "userData", userId), { barbeariaAgendamentos: agendamentos }, { merge: true }).catch(() => {});
    }
  }, [agendamentos, storagePrefix, userId, db]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}aniversarios`, JSON.stringify(aniversarios));
    if (userId && userId !== "guest_visitor" && db) {
      setDoc(doc(db, "userData", userId), { barbeariaAniversarios: aniversarios }, { merge: true }).catch(() => {});
    }
  }, [aniversarios, storagePrefix, userId, db]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}encomendas`, JSON.stringify(encomendas));
    if (userId && userId !== "guest_visitor" && db) {
      setDoc(doc(db, "userData", userId), { barbeariaEncomendas: encomendas }, { merge: true }).catch(() => {});
    }
  }, [encomendas, storagePrefix, userId, db]);

  // Modal States
  const [isAddProfissionalOpen, setIsAddProfissionalOpen] = useState(false);
  const [newProfNome, setNewProfNome] = useState("");
  const [newProfApelido, setNewProfApelido] = useState("");
  const [newProfCategoria, setNewProfCategoria] = useState<NegocioSegmento>("barbearia");
  const [newProfEspecialidade, setNewProfEspecialidade] = useState("");
  const [newProfTelefone, setNewProfTelefone] = useState("");
  const [newProfPix, setNewProfPix] = useState("");
  const [newProfComissao, setNewProfComissao] = useState("50");
  const [newProfFoto, setNewProfFoto] = useState(AVATAR_PRESETS[0]);

  const [isAddAgendamentoOpen, setIsAddAgendamentoOpen] = useState(false);
  const [newAgData, setNewAgData] = useState(() => new Date().toISOString().slice(0, 10));
  const [newAgHora, setNewAgHora] = useState("14:00");
  const [newAgClienteNome, setNewAgClienteNome] = useState("");
  const [newAgClienteTelefone, setNewAgClienteTelefone] = useState("");
  const [newAgProfissionalId, setNewAgProfissionalId] = useState(profissionais[0]?.id || "");
  const [newAgServico, setNewAgServico] = useState("");
  const [newAgValor, setNewAgValor] = useState("45");

  const [isAddAniversarioOpen, setIsAddAniversarioOpen] = useState(false);
  const [newAnivNome, setNewAnivNome] = useState("");
  const [newAnivTelefone, setNewAnivTelefone] = useState("");
  const [newAnivDia, setNewAnivDia] = useState(new Date().getDate().toString());
  const [newAnivMes, setNewAnivMes] = useState((new Date().getMonth() + 1).toString());
  const [newAnivPresente, setNewAnivPresente] = useState("10% de desconto no mês de aniversário");

  const [isAddEncomendaOpen, setIsAddEncomendaOpen] = useState(false);
  const [newEncData, setNewEncData] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [newEncHora, setNewEncHora] = useState("15:00");
  const [newEncClienteNome, setNewEncClienteNome] = useState("");
  const [newEncClienteTelefone, setNewEncClienteTelefone] = useState("");
  const [newEncTipoEvento, setNewEncTipoEvento] = useState("Festa de Aniversário");
  const [newEncCategoriaFesta, setNewEncCategoriaFesta] = useState<"kit_completo" | "bolo" | "salgados" | "doces" | "buffet" | "outro">("kit_completo");
  const [newEncItens, setNewEncItens] = useState("");
  const [newEncValorTotal, setNewEncValorTotal] = useState("");
  const [newEncSinal, setNewEncSinal] = useState("");
  const [newEncMetodo, setNewEncMetodo] = useState("PIX");

  // Profissionais e Agendamentos Filtrados pelo Segmento Ativo (Barbeiro, Salão, Manicure, Festas)
  const filteredProfissionais = useMemo(() => {
    if (segmentFilter === "todos") return profissionais;
    return profissionais.filter((p) => (p.categoria || "barbearia") === segmentFilter);
  }, [profissionais, segmentFilter]);

  const filteredAgendamentos = useMemo(() => {
    if (segmentFilter === "todos") return agendamentos;
    return agendamentos.filter((a) => {
      if (a.categoria) return a.categoria === segmentFilter;
      const prof = profissionais.find((p) => p.id === a.profissionalId);
      return (prof?.categoria || "barbearia") === segmentFilter;
    });
  }, [agendamentos, profissionais, segmentFilter]);

  // Análise de Aniversários
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const mesHoje = hoje.getMonth() + 1;

  const aniversariantesHoje = useMemo(() => {
    return aniversarios.filter((a) => Number(a.dia) === diaHoje && Number(a.mes) === mesHoje);
  }, [aniversarios, diaHoje, mesHoje]);

  const aniversariantesMes = useMemo(() => {
    return aniversarios.filter((a) => Number(a.mes) === mesHoje);
  }, [aniversarios, mesHoje]);

  // Handler para Adicionar Profissional
  const handleSaveProfissional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfNome.trim()) {
      showNotification("Informe o nome do profissional! 👤", "error");
      return;
    }

    const defaultEspec =
      newProfCategoria === "manicure"
        ? "Manicure, Pedicure & Gel"
        : newProfCategoria === "festas"
        ? "Bolos Confeitados & Kits Festa"
        : newProfCategoria === "salao"
        ? "Escova, Mechas & Cortes"
        : "Corte Degradê & Barba Terapia";

    const novoProf: ProfissionalBarbearia = {
      id: "prof_" + Date.now(),
      nome: newProfNome.trim(),
      apelido: newProfApelido.trim() || undefined,
      categoria: newProfCategoria,
      fotoUrl: newProfFoto,
      especialidade: newProfEspecialidade.trim() || defaultEspec,
      telefone: newProfTelefone.trim(),
      chavePix: newProfPix.trim() || undefined,
      comissaoPct: Number(newProfComissao) || 50,
      totalAtendimentos: 0,
      totalFaturado: 0,
      ativo: true
    };

    setProfissionais((prev) => [novoProf, ...prev]);
    showNotification(`Profissional ${novoProf.nome} cadastrado com sucesso! ✨`, "success");
    setIsAddProfissionalOpen(false);
    setNewProfNome("");
    setNewProfApelido("");
    setNewProfEspecialidade("");
    setNewProfTelefone("");
    setNewProfPix("");
  };

  // Handler para Upload de Foto do Profissional
  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setNewProfFoto(reader.result);
          showNotification("Foto carregada com sucesso! 📸", "success");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler para Adicionar Agendamento
  const handleSaveAgendamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgClienteNome.trim()) {
      showNotification("Informe o nome do cliente! 👤", "error");
      return;
    }

    const prof = profissionais.find((p) => p.id === newAgProfissionalId) || profissionais[0];
    const valorNum = Number(newAgValor) || 0;

    const novoAg: AgendamentoServico = {
      id: "ag_" + Date.now(),
      data: newAgData,
      horario: newAgHora,
      clienteNome: newAgClienteNome.trim(),
      clienteTelefone: newAgClienteTelefone.trim(),
      profissionalId: prof?.id || "geral",
      profissionalNome: prof?.nome || "Equipe",
      categoria: prof?.categoria || "barbearia",
      servico: newAgServico.trim() || "Atendimento",
      valor: valorNum,
      status: "agendado",
      criadoEm: new Date().toISOString()
    };

    setAgendamentos((prev) => [novoAg, ...prev]);
    showNotification("Horário agendado com sucesso! ⏰✨", "success");
    setIsAddAgendamentoOpen(false);
    setNewAgClienteNome("");
    setNewAgClienteTelefone("");
    setNewAgServico("");
  };

  // Handler para Adicionar Aniversário
  const handleSaveAniversario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnivNome.trim()) {
      showNotification("Informe o nome do aniversariante! 🎂", "error");
      return;
    }

    const novoAniv: AniversarioCliente = {
      id: "aniv_" + Date.now(),
      nome: newAnivNome.trim(),
      telefone: newAnivTelefone.trim(),
      dia: Number(newAnivDia) || 1,
      mes: Number(newAnivMes) || 1,
      presenteOferecido: newAnivPresente.trim()
    };

    setAniversarios((prev) => [novoAniv, ...prev]);
    showNotification("Aniversário de cliente anotado com sucesso! 🎈🎉", "success");
    setIsAddAniversarioOpen(false);
    setNewAnivNome("");
    setNewAnivTelefone("");
  };

  // Handler para Adicionar Encomenda de Festa
  const handleSaveEncomenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEncClienteNome.trim() || !newEncItens.trim()) {
      showNotification("Preencha o nome do cliente e os itens da encomenda! 🍰", "error");
      return;
    }

    const totalNum = Number(newEncValorTotal) || 0;
    const sinalNum = Number(newEncSinal) || 0;
    const restante = Math.max(0, totalNum - sinalNum);

    const novaEnc: EncomendaFesta = {
      id: "enc_" + Date.now(),
      dataEntrega: newEncData,
      horarioEntrega: newEncHora,
      clienteNome: newEncClienteNome.trim(),
      clienteTelefone: newEncClienteTelefone.trim(),
      tipoEvento: newEncTipoEvento,
      categoriaFesta: newEncCategoriaFesta,
      itensDescricao: newEncItens.trim(),
      valorTotal: totalNum,
      sinalPago: sinalNum,
      saldoRestante: restante,
      metodoPagamentoSinal: newEncMetodo,
      status: "em_preparo",
      criadoEm: new Date().toISOString()
    };

    setEncomendas((prev) => [novaEnc, ...prev]);
    showNotification("Encomenda para festa cadastrada com sucesso! 🍰🎉", "success");
    setIsAddEncomendaOpen(false);
    setNewEncClienteNome("");
    setNewEncClienteTelefone("");
    setNewEncItens("");
    setNewEncValorTotal("");
    setNewEncSinal("");
  };

  // WhatsApp Mensagem de Aniversário (utiliza modelo personalizado salvo ou pronto)
  const handleFelicitarAniversario = (cliente: AniversarioCliente) => {
    const limpo = cliente.telefone.replace(/\D/g, "");
    const customTemplate = localStorage.getItem("pdv_msg_parabens_custom");
    let msgTexto = customTemplate || MODELOS_PARABENS_PRONTOS[0].texto;

    msgTexto = msgTexto
      .replace(/{cliente}/g, cliente.nome)
      .replace(/{empresa}/g, companyName || "Nossa Empresa")
      .replace(/{telefone}/g, companyPhone || "")
      .replace(/{link_agenda}/g, clientAgendaUrl)
      .replace(/{desconto}/g, cliente.presenteOferecido || "15% de desconto")
      .replace(/{presente}/g, cliente.presenteOferecido || "Brinde Especial Cortesia");

    const msg = encodeURIComponent(msgTexto);
    const waUrl = limpo ? `https://wa.me/55${limpo}?text=${msg}` : `https://wa.me/?text=${msg}`;
    try {
      const a = document.createElement("a");
      a.href = waUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(waUrl, "_blank");
    }
    showNotification("Mensagem de aniversário enviada ao WhatsApp! 🎂🎉", "success");
  };

  // WhatsApp Lembrete de Horário
  const handleLembreteWhatsApp = (ag: AgendamentoServico) => {
    const limpo = ag.clienteTelefone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${ag.clienteNome}! ⏰💈\n\nPassando para confirmar seu horário na *${companyName}*:\n📅 Data: ${ag.data.split("-").reverse().join("/")}\n🕒 Horário: ${ag.horario}\n✂️ Serviço: ${ag.servico}\n👤 Profissional: ${ag.profissionalNome}\n💰 Valor: ${formatCurrency(ag.valor)}\n\nEsperamos por você! Qualquer dúvida, nos avise aqui. 👍`
    );
    window.open(`https://wa.me/55${limpo}?text=${msg}`, "_blank");
  };

  // WhatsApp Comprovante de Encomenda
  const handleComprovanteEncomenda = (enc: EncomendaFesta) => {
    const limpo = enc.clienteTelefone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `🍰 *COMPROVANTE DE ENCOMENDA - ${companyName}* 🎉\n\n` +
      `👤 *Cliente:* ${enc.clienteNome}\n` +
      `📅 *Data de Entrega/Festa:* ${enc.dataEntrega.split("-").reverse().join("/")} às ${enc.horarioEntrega}\n` +
      `🎈 *Tipo de Evento:* ${enc.tipoEvento}\n` +
      `📦 *Itens Encomendados:*\n${enc.itensDescricao}\n\n` +
      `💵 *Valor Total:* ${formatCurrency(enc.valorTotal)}\n` +
      `✅ *Sinal Pago:* ${formatCurrency(enc.sinalPago)} (${enc.metodoPagamentoSinal})\n` +
      `⚠️ *Saldo Restante na Entrega:* ${formatCurrency(enc.saldoRestante)}\n\n` +
      `Agradecemos a sua preferência! Estamos preparando tudo com muito carinho! ❤️`
    );
    window.open(`https://wa.me/55${limpo}?text=${msg}`, "_blank");
  };

  // Salvar Identidade da Empresa e Redes Sociais
  const handleSaveEmpresa = async () => {
    const current = loadCompanyProfile(userId);
    const updated = {
      ...current,
      name: companyName,
      logoUrl: companyLogo,
      phone: companyPhone,
      whatsapp: companyPhone,
      instagram: companyInstagram,
      facebook: companyFacebook,
      website: companyWebsite
    };
    saveCompanyProfile(updated, userId);
    localStorage.setItem("pdv_company_link", companyInstagram || companyWebsite || companyFacebook || "");
    
    // Salvar no Firestore se logado
    if (userId && userId !== "guest_visitor" && db) {
      try {
        await setDoc(doc(db, "userData", userId), {
          companyProfile: updated,
          storeName: companyName,
          barbeariaProfissionais: profissionais,
          barbeariaAgendamentos: agendamentos,
          barbeariaEncomendas: encomendas,
          barbeariaAniversarios: aniversarios,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Erro ao salvar dados no Firestore:", err);
      }
    }

    showNotification("Dados e redes sociais da empresa gravados com sucesso na memória do app e nuvem! 🏢💾✅", "success");
  };

  return (
    <div className="space-y-6 text-left">
      {/* BANNER HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Scissors className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {companyName}
                </h2>
                <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Barbearia • Salão • Encomendas
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Profissionais com dados separados, controle de comissões, agenda de horários, aniversariantes do dia e encomendas para festas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {companyLink && (
              <a
                href={companyLink}
                target="_blank"
                rel="noreferrer"
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Link da Empresa</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
            <button
              onClick={() => setActiveTab("empresa")}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Editar Logo & Link</span>
            </button>
          </div>
        </div>

        {/* ALERTA DE ANIVERSARIANTES DE HOJE */}
        {aniversariantesHoje.length > 0 && (
          <div className="mt-5 p-3.5 bg-gradient-to-r from-pink-950/60 to-purple-950/60 border border-pink-500/30 rounded-2xl flex items-center justify-between gap-3 flex-wrap animate-pulse">
            <div className="flex items-center gap-2 text-pink-300 text-xs font-black">
              <PartyPopper className="w-4 h-4 text-pink-400" />
              <span>
                TEM ANIVERSARIANTE HOJE! 🎂 {aniversariantesHoje.map((a) => a.nome).join(", ")}
              </span>
            </div>
            <button
              onClick={() => setActiveTab("aniversarios")}
              className="bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Felicitar no WhatsApp</span>
            </button>
          </div>
        )}
      </div>

      {/* SELETOR DE SEGMENTOS: BARBEIRO, SALÃO DE BELEZA, MANICURE, FESTAS & ENCOMENDAS */}
      <div className="bg-slate-950/80 border border-white/10 p-3 sm:p-4 rounded-3xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-amber-400" />
              <span>Separar por Negócio / Atuação:</span>
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              (Barbeiro, Salão, Manicure ou Festas & Encomendas de Eventos)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão Comunicados da Agenda */}
            <button
              type="button"
              onClick={() => setIsComunicadosAgendaOpen(true)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Comunicado de Agendas 📢</span>
            </button>

            {/* Botão Personalizar Parabéns */}
            <button
              type="button"
              onClick={() => setIsPersonalizarParabensOpen(true)}
              className="bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Cake className="w-3.5 h-3.5 text-pink-400" />
              <span>Personalizar Parabéns 🎂</span>
            </button>
          </div>
        </div>

        {/* Botões dos 4 Segmentos + Todos */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => {
              setSegmentFilter("todos");
              localStorage.setItem("barbearia_selected_segment", "todos");
            }}
            className={`p-2.5 rounded-2xl border text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
              segmentFilter === "todos"
                ? "bg-slate-800 text-white border-white/30 shadow-md ring-2 ring-white/10"
                : "bg-slate-900/60 text-slate-400 border-white/5 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <span>✨ Todos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSegmentFilter("barbearia");
              localStorage.setItem("barbearia_selected_segment", "barbearia");
              if (activeTab === "encomendas") setActiveTab("profissionais");
            }}
            className={`p-2.5 rounded-2xl border text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
              segmentFilter === "barbearia"
                ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/30"
                : "bg-slate-900/60 text-amber-300/80 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <span>💈 Barbeiro</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSegmentFilter("salao");
              localStorage.setItem("barbearia_selected_segment", "salao");
              if (activeTab === "encomendas") setActiveTab("profissionais");
            }}
            className={`p-2.5 rounded-2xl border text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
              segmentFilter === "salao"
                ? "bg-purple-600 text-white border-purple-400 font-black shadow-lg shadow-purple-600/20 ring-2 ring-purple-400/30"
                : "bg-slate-900/60 text-purple-300/80 border-purple-500/20 hover:bg-purple-500/10 hover:text-purple-300"
            }`}
          >
            <span>💇‍♀️ Salão de Beleza</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSegmentFilter("manicure");
              localStorage.setItem("barbearia_selected_segment", "manicure");
              if (activeTab === "encomendas") setActiveTab("profissionais");
            }}
            className={`p-2.5 rounded-2xl border text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
              segmentFilter === "manicure"
                ? "bg-pink-600 text-white border-pink-400 font-black shadow-lg shadow-pink-600/20 ring-2 ring-pink-400/30"
                : "bg-slate-900/60 text-pink-300/80 border-pink-500/20 hover:bg-pink-500/10 hover:text-pink-300"
            }`}
          >
            <span>💅 Manicure</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSegmentFilter("festas");
              localStorage.setItem("barbearia_selected_segment", "festas");
              setActiveTab("encomendas");
            }}
            className={`p-2.5 rounded-2xl border text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              segmentFilter === "festas"
                ? "bg-emerald-600 text-white border-emerald-400 font-black shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-400/30"
                : "bg-slate-900/60 text-emerald-300/80 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-300"
            }`}
          >
            <span>🎂 Festas & Eventos</span>
          </button>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO DO MÓDULO */}
      <div className="flex bg-slate-900 border border-white/10 p-1.5 rounded-2xl gap-1.5 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab("profissionais")}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "profissionais"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Equipe ({filteredProfissionais.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("agenda")}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "agenda"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Agenda Horários ({filteredAgendamentos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("aniversarios")}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "aniversarios"
              ? "bg-pink-600 text-white shadow-lg shadow-pink-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Cake className="w-4 h-4" />
          <span>Aniversários ({aniversariantesMes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("encomendas")}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "encomendas"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <PartyPopper className="w-4 h-4" />
          <span>Festas & Encomendas ({encomendas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("empresa")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "empresa"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Empresa & Logo</span>
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: PROFISSIONAIS COM DADOS SEPARADOS */}
      {activeTab === "profissionais" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-white text-base font-black tracking-tight flex items-center gap-2">
                <span>Equipe de Profissionais & Barbeiros</span>
                <span className="text-xs text-amber-400 font-bold">
                  (Dados e Faturamentos 100% Separados)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cada funcionário possui sua foto, especialidade, comissão e histórico individual de atendimentos.
              </p>
            </div>

            <button
              onClick={() => setIsAddProfissionalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Profissional</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profissionais.map((prof) => {
              const comissaoTotal = (prof.totalFaturado * prof.comissaoPct) / 100;
              const repasseEmpresa = prof.totalFaturado - comissaoTotal;

              return (
                <div
                  key={prof.id}
                  className="bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-4 hover:border-amber-500/40 transition-all shadow-xl"
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={prof.fotoUrl}
                      alt={prof.nome}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/30 shadow-md shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-white font-black text-sm truncate">
                          {prof.nome}
                        </h4>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                          {prof.ativo ? "Ativo" : "Pausa"}
                        </span>
                      </div>
                      {prof.apelido && (
                        <p className="text-[11px] text-amber-300 font-bold truncate">
                          "{prof.apelido}"
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 truncate">
                        {prof.especialidade}
                      </p>
                    </div>
                  </div>

                  {/* Informações Separadas do Profissional */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Comissão Acordada:</span>
                      <strong className="text-white font-mono">{prof.comissaoPct}%</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Total Atendimentos:</span>
                      <strong className="text-amber-400 font-mono">{prof.totalAtendimentos} cortes/serviços</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Total Faturado no Mês:</span>
                      <strong className="text-emerald-400 font-mono">{formatCurrency(prof.totalFaturado)}</strong>
                    </div>
                    <div className="border-t border-white/5 pt-2 flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Comissão do Profissional:</span>
                      <strong className="text-purple-300 font-mono font-black">{formatCurrency(comissaoTotal)}</strong>
                    </div>
                  </div>

                  {/* Link Único e Pessoal da Agenda deste Profissional para Redes Sociais */}
                  <button
                    type="button"
                    onClick={() => {
                      const profUrl = `${clientAgendaUrl}&segmento=${prof.categoria || "barbearia"}&prof=${prof.id}`;
                      navigator.clipboard.writeText(profUrl);
                      showNotification(`Link único da agenda de ${prof.nome} copiado! 📋 Deixe no Instagram ou WhatsApp do profissional.`, "success");
                    }}
                    className="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-[10.5px] font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Copiar link único deste profissional para colocar na bio do Instagram ou WhatsApp dele"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Copiar Link da Agenda de {prof.nome.split(" ")[0]} 🔗</span>
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEditingScheduleProf(prof)}
                      className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Configurar horários que vai abrir a agenda, dias de atendimento, almoço e bloqueios"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Configurar Agenda ⚙️</span>
                    </button>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {prof.telefone && (
                        <a
                          href={`https://wa.me/55${prof.telefone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      <button
                        onClick={() => {
                          setProfissionais((prev) => prev.filter((p) => p.id !== prof.id));
                          showNotification(`Profissional ${prof.nome} removido.`, "info");
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: AGENDA DE HORÁRIOS */}
      {activeTab === "agenda" && (
        <div className="space-y-5">
          {/* BANNER 1: LINK EXCLUSIVO DA AGENDA PARA CLIENTES NO WHATSAPP */}
          <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-left">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/30 shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-white font-black text-sm sm:text-base tracking-tight">
                      Link da Agenda para Enviar aos Clientes no WhatsApp
                    </h4>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      Exclusivo para Clientes
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5 max-w-xl">
                    O cliente acessa <strong>apenas a agenda limpa</strong> no celular dele (escolhe o profissional com foto, serviço e horário, ou encomenda para festas). <strong>Sem acesso ao seu caixa, valores ou faturamento!</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsComunicadosAgendaOpen(true)}
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/10"
                >
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <span>Comunicados & Lembretes (10 Modelos WhatsApp) 📢</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareAgendaOnWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyClientAgendaLink}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copiar Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const bioText = `💈 Agende seu horário online pelo nosso link exclusivo:\n👉 ${clientAgendaUrl}\n✂️ Sem filas e com confirmação rápida pelo WhatsApp!`;
                    navigator.clipboard.writeText(bioText);
                    showNotification("Texto pronto para Bio do Instagram copiado! 📋 Cole no seu perfil.", "success");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
                  title="Copiar texto pronto para colar na Bio do Instagram ou redes sociais"
                >
                  <Copy className="w-3.5 h-3.5 text-pink-400" />
                  <span>Texto para Bio Instagram</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewClientPortalOpen(true)}
                  className="bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-300 border border-indigo-500/40 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ver Como Cliente Enxerga 👁️</span>
                </button>
              </div>
            </div>

            {/* Input com o link para visualização */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-white/10 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 min-w-0 w-full">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 shrink-0">Link dos Clientes:</span>
                <input
                  type="text"
                  readOnly
                  value={clientAgendaUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="bg-transparent text-xs text-emerald-400 font-mono font-bold w-full outline-none select-all truncate"
                />
              </div>

              {/* Caixa de marcar se o link online está ativo */}
              <div className="flex items-center gap-2 shrink-0 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5">
                <span className="text-[11px] font-bold text-slate-300">Link Online Ativo:</span>
                <button
                  type="button"
                  onClick={() => handleTogglePublicAgendaActive(true)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                    isPublicAgendaActive
                      ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>SIM</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePublicAgendaActive(false)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                    !isPublicAgendaActive
                      ? "bg-red-600 text-white font-black shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <X className="w-3 h-3" />
                  <span>NÃO</span>
                </button>
              </div>
            </div>

            {/* Links Diretos por Segmento para Redes Sociais */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/5 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Links Diretos por Segmento (Copie e cole na Bio do Instagram / WhatsApp de cada serviço):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${clientAgendaUrl}&segmento=barbearia`);
                    showNotification("Link exclusivo de Barbearia copiado! 💈", "success");
                  }}
                  className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>💈 Link Só Barbearia</span>
                  <Copy className="w-3 h-3 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${clientAgendaUrl}&segmento=salao`);
                    showNotification("Link exclusivo de Salão de Beleza copiado! 💇‍♀️", "success");
                  }}
                  className="bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>💇‍♀️ Link Só Salão</span>
                  <Copy className="w-3 h-3 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${clientAgendaUrl}&segmento=manicure`);
                    showNotification("Link exclusivo de Manicure & Unhas copiado! 💅", "success");
                  }}
                  className="bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 px-3 py-1.5 rounded-xl text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>💅 Link Só Manicure</span>
                  <Copy className="w-3 h-3 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${clientAgendaUrl}&segmento=festas`);
                    showNotification("Link exclusivo de Festas & Encomendas copiado! 🍰", "success");
                  }}
                  className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🍰 Link Só Festas & Encomendas</span>
                  <Copy className="w-3 h-3 opacity-70" />
                </button>
              </div>
            </div>
          </div>

          {/* BANNER 2: CAIXA DE MARCAR - PERMISSÃO DO CAIXA MARCAR HORÁRIOS (SIM OU NÃO) */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  allowCaixaAgendar ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {allowCaixaAgendar ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Caixa de Marcar: O Caixa / Balcão pode marcar horários na Agenda?</span>
                    <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md ${
                      allowCaixaAgendar ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {allowCaixaAgendar ? "SIM (Habilitado)" : "NÃO (Bloqueado)"}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Escolha abaixo na caixa de seleção se os operadores de caixa podem marcar horários ou se apenas o proprietário e clientes pelo WhatsApp podem:
                  </p>
                </div>
              </div>
            </div>

            {/* SELEÇÃO DUAL COM CAIXAS DE MARCAR (CHECKBOXES / BOTÕES SIM OU NÃO) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div
                onClick={() => handleToggleAllowCaixa(true)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                  allowCaixaAgendar
                    ? "bg-emerald-500/15 border-emerald-500 shadow-md shadow-emerald-500/10 text-white"
                    : "bg-slate-950 border-white/5 text-slate-400 hover:border-white/15 hover:text-white"
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                  allowCaixaAgendar
                    ? "bg-emerald-500 border-emerald-500 text-slate-950 font-black"
                    : "border-white/20 bg-slate-900"
                }`}>
                  {allowCaixaAgendar && <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[3]" />}
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block">
                    [ X ] SIM - Caixa Pode Marcar
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Operadores e funcionários podem agendar horários no balcão.
                  </span>
                </div>
              </div>

              <div
                onClick={() => handleToggleAllowCaixa(false)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                  !allowCaixaAgendar
                    ? "bg-red-500/15 border-red-500 shadow-md shadow-red-500/10 text-white"
                    : "bg-slate-950 border-white/5 text-slate-400 hover:border-white/15 hover:text-white"
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                  !allowCaixaAgendar
                    ? "bg-red-500 border-red-500 text-white font-black"
                    : "border-white/20 bg-slate-900"
                }`}>
                  {!allowCaixaAgendar && <CheckCircle2 className="w-4 h-4 text-white stroke-[3]" />}
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block">
                    [ X ] NÃO - Bloquear Caixa
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Apenas o Proprietário ou clientes pelo link do WhatsApp podem agendar.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SELETOR DE MODO DE VISUALIZAÇÃO: GRADE DA AGENDA (TIMELINE DA FOTO) vs LISTA */}
          <div className="flex bg-slate-900 border border-white/10 p-1.5 rounded-2xl gap-1.5">
            <button
              type="button"
              onClick={() => setAgendaViewMode("timeline")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                agendaViewMode === "timeline"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Grade da Agenda (Visual da Foto) 📅</span>
            </button>
            <button
              type="button"
              onClick={() => setAgendaViewMode("lista")}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                agendaViewMode === "lista"
                  ? "bg-slate-800 text-white border border-white/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Lista Resumida ({agendamentos.length})</span>
            </button>
          </div>

          {agendaViewMode === "timeline" ? (
            /* GRADE DA AGENDA TIMELINE (EXATAMENTE COMO NA FOTO) */
            <div className="space-y-4">
              <BarbeariaTimelineAgenda
                profissionais={profissionais}
                agendamentos={agendamentos}
                onAddAgendamento={(novoAg) => {
                  setAgendamentos((prev) => [novoAg, ...prev]);
                  showNotification("Agendamento marcado com sucesso na grade! ✂️📅", "success");
                }}
                onDeleteAgendamento={(id) => {
                  setAgendamentos((prev) => prev.filter((a) => a.id !== id));
                  showNotification("Agendamento excluído da grade.", "info");
                }}
                formatCurrency={formatCurrency}
                isClientView={false}
                companyPhone={companyPhone}
                companyName={companyName}
                allowCaixaAgendar={allowCaixaAgendar}
                isCaixa={isCaixa}
                onUpdateProfissional={handleUpdateProfissional}
                showNotification={showNotification}
              />
            </div>
          ) : (
            /* VISÃO EM LISTA RESUMIDA */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                <div>
                  <h3 className="text-white text-base font-black tracking-tight">
                    Horários Agendados ({agendamentos.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Horários confirmados com envio de lembrete no WhatsApp e lançamento no caixa.
                  </p>
                </div>

                {isCaixa && !allowCaixaAgendar ? (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-400" />
                    <span>Agendamento desativado para o Caixa pelo Proprietário</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddAgendamentoOpen(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Marcar Novo Horário</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
            {agendamentos.map((ag) => (
              <div
                key={ag.id}
                className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex flex-col items-center justify-center font-mono shrink-0 border border-indigo-500/20">
                    <span className="text-[10px] uppercase font-bold">Hora</span>
                    <span className="text-xs font-black">{ag.horario}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white font-black text-sm">{ag.clienteNome}</h4>
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        {ag.servico}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                      <span>Data: <strong className="text-slate-200">{ag.data.split("-").reverse().join("/")}</strong></span>
                      <span>•</span>
                      <span>Profissional: <strong className="text-amber-300">{ag.profissionalNome}</strong></span>
                      <span>•</span>
                      <span>Valor: <strong className="text-emerald-400 font-mono">{formatCurrency(ag.valor)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {ag.clienteTelefone && (
                    <button
                      onClick={() => handleLembreteWhatsApp(ag)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Lembrar no WhatsApp</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setAgendamentos((prev) =>
                        prev.map((item) =>
                          item.id === ag.id ? { ...item, status: "concluido" } : item
                        )
                      );
                      showNotification("Atendimento concluído! ✂️✅", "success");
                    }}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                      ag.status === "concluido"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{ag.status === "concluido" ? "Concluído ✅" : "Concluir"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setAgendamentos((prev) => prev.filter((item) => item.id !== ag.id));
                      showNotification("Agendamento excluído.", "info");
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: ANIVERSÁRIOS DE CLIENTES */}
      {activeTab === "aniversarios" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-white text-base font-black tracking-tight flex items-center gap-2">
                <span>Aniversários de Clientes 🎂</span>
                <span className="text-xs text-pink-400 font-bold">
                  (Fidelização & Felicitações)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Acompanhe os aniversários dos seus clientes para enviar mensagens carinhosas e cupons de desconto.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsPersonalizarParabensOpen(true)}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-amber-500/10 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Personalizar Mensagens de Parabéns (10 Modelos WhatsApp) 🎂🎨</span>
              </button>

              <button
                onClick={() => setIsAddAniversarioOpen(true)}
                className="bg-pink-600 hover:bg-pink-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-pink-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Aniversariante</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aniversarios.map((aniv) => {
              const isHoje = Number(aniv.dia) === diaHoje && Number(aniv.mes) === mesHoje;
              const isMes = Number(aniv.mes) === mesHoje;

              return (
                <div
                  key={aniv.id}
                  className={`border rounded-3xl p-5 space-y-3 shadow-xl transition-all ${
                    isHoje
                      ? "bg-gradient-to-br from-pink-950/40 via-slate-900 to-purple-950/40 border-pink-500 shadow-pink-500/10"
                      : "bg-slate-900 border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 flex flex-col items-center justify-center font-mono border border-pink-500/20 shrink-0">
                        <span className="text-[9px] uppercase font-bold leading-none">Dia</span>
                        <span className="text-sm font-black leading-tight">
                          {String(aniv.dia).padStart(2, "0")}/{String(aniv.mes).padStart(2, "0")}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-white font-black text-sm">{aniv.nome}</h4>
                        <p className="text-[11px] text-slate-400">{aniv.telefone || "Sem telefone"}</p>
                      </div>
                    </div>

                    {isHoje && (
                      <span className="bg-pink-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full animate-pulse shadow">
                        Hoje! 🎉
                      </span>
                    )}
                  </div>

                  {aniv.presenteOferecido && (
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-white/5 text-[11px] text-pink-300 font-medium">
                      🎁 <strong>Presente/Cupom:</strong> {aniv.presenteOferecido}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    {aniv.telefone && (
                      <button
                        onClick={() => handleFelicitarAniversario(aniv)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-black uppercase px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Felicitar no WhatsApp 🎉</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setAniversarios((prev) => prev.filter((a) => a.id !== aniv.id));
                        showNotification("Aniversariante removido.", "info");
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: ENCOMENDAS PARA FESTAS & EVENTOS */}
      {activeTab === "encomendas" && (
        <div className="space-y-5">
          {/* BANNER ENCOMENDAS: LINK PARA CLIENTES NO WHATSAPP */}
          <div className="bg-gradient-to-r from-pink-950/80 via-slate-900 to-purple-950/80 border-2 border-pink-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-left">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-pink-600 text-white flex items-center justify-center font-black shadow-lg shadow-pink-600/30 shrink-0">
                  <Cake className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-white font-black text-sm sm:text-base tracking-tight">
                      Link de Encomendas de Festas para Clientes no WhatsApp
                    </h4>
                    <span className="bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      Festas & Eventos
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5 max-w-xl">
                    Envie o link para o cliente solicitar orçamentos de bolos, salgados e kits para festas pelo WhatsApp com praticidade e rapidez!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const msg = encodeURIComponent(
                      `Olá! 🍰🎉 Faça sua encomenda de bolos, salgados, doces e kits para festas na *${companyName}* pelo nosso link exclusivo:\n\n` +
                      `👉 ${clientAgendaUrl}\n\n` +
                      `Preencha a data da sua comemoração e o que deseja que entraremos em contato com seu orçamento! ✨`
                    );
                    window.open(`https://wa.me/?text=${msg}`, "_blank");
                  }}
                  className="bg-pink-600 hover:bg-pink-500 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-pink-600/30"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyClientAgendaLink}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
                >
                  <Copy className="w-3.5 h-3.5 text-pink-400" />
                  <span>Copiar Link</span>
                </button>
              </div>
            </div>
          </div>

          {/* BANNER 2: CAIXA DE MARCAR - PERMISSÃO DO CAIXA ANOTAR ENCOMENDAS (SIM OU NÃO) */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  allowCaixaEncomendar ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {allowCaixaEncomendar ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Caixa de Marcar: O Caixa / Balcão pode anotar Encomendas de Festas?</span>
                    <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md ${
                      allowCaixaEncomendar ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {allowCaixaEncomendar ? "SIM (Habilitado)" : "NÃO (Bloqueado)"}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Defina abaixo se os operadores de caixa podem receber pedidos de encomendas ou apenas o proprietário:
                  </p>
                </div>
              </div>
            </div>

            {/* SELEÇÃO DUAL COM CAIXAS DE MARCAR (CHECKBOXES / BOTÕES SIM OU NÃO) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div
                onClick={() => handleToggleAllowCaixaEncomendar(true)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                  allowCaixaEncomendar
                    ? "bg-emerald-500/15 border-emerald-500 shadow-md shadow-emerald-500/10 text-white"
                    : "bg-slate-950 border-white/5 text-slate-400 hover:border-white/15 hover:text-white"
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                  allowCaixaEncomendar
                    ? "bg-emerald-500 border-emerald-500 text-slate-950 font-black"
                    : "border-white/20 bg-slate-900"
                }`}>
                  {allowCaixaEncomendar && <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[3]" />}
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block">
                    [ X ] SIM - Caixa Pode Anotar Encomendas
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Operadores podem registrar encomendas e sinais pagos no balcão.
                  </span>
                </div>
              </div>

              <div
                onClick={() => handleToggleAllowCaixaEncomendar(false)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                  !allowCaixaEncomendar
                    ? "bg-red-500/15 border-red-500 shadow-md shadow-red-500/10 text-white"
                    : "bg-slate-950 border-white/5 text-slate-400 hover:border-white/15 hover:text-white"
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                  !allowCaixaEncomendar
                    ? "bg-red-500 border-red-500 text-white font-black"
                    : "border-white/20 bg-slate-900"
                }`}>
                  {!allowCaixaEncomendar && <CheckCircle2 className="w-4 h-4 text-white stroke-[3]" />}
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block">
                    [ X ] NÃO - Bloquear Caixa para Encomendas
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Apenas o Proprietário ou clientes pelo WhatsApp podem registrar encomendas.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-white text-base font-black tracking-tight flex items-center gap-2">
                <span>Lista de Encomendas para Festas & Eventos ({encomendas.length})</span>
              </h3>
              <p className="text-xs text-slate-400">
                Bolos, salgados, doces e kits. Controle de sinal pago, saldo restante a receber e comprovante para o cliente.
              </p>
            </div>

            {isCaixa && !allowCaixaEncomendar ? (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-400" />
                <span>Anotação de encomendas desativada para o Caixa pelo Proprietário</span>
              </div>
            ) : (
              <button
                onClick={() => setIsAddEncomendaOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Anotar Nova Encomenda</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {encomendas.map((enc) => (
              <div
                key={enc.id}
                className="bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black shrink-0 border border-amber-500/20">
                      <Cake className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white font-black text-base">{enc.clienteNome}</h4>
                        <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full">
                          {enc.tipoEvento}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Entrega: <strong className="text-amber-400">{enc.dataEntrega.split("-").reverse().join("/")}</strong> às <strong className="text-white">{enc.horarioEntrega}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:text-right">
                    <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Total</span>
                      <strong className="text-sm font-black text-white font-mono">{formatCurrency(enc.valorTotal)}</strong>
                    </div>
                    <div className="bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      <span className="text-[9px] uppercase font-bold text-emerald-400 block">Sinal Pago</span>
                      <strong className="text-sm font-black text-emerald-300 font-mono">{formatCurrency(enc.sinalPago)}</strong>
                    </div>
                    <div className="bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-500/20">
                      <span className="text-[9px] uppercase font-bold text-amber-400 block">Restante</span>
                      <strong className="text-sm font-black text-amber-300 font-mono">{formatCurrency(enc.saldoRestante)}</strong>
                    </div>
                  </div>
                </div>

                {/* Descrição dos Itens */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Itens da Encomenda:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {enc.itensDescricao}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  {enc.clienteTelefone && (
                    <button
                      onClick={() => handleComprovanteEncomenda(enc)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Enviar Comprovante no WhatsApp</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <select
                      value={enc.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as any;
                        setEncomendas((prev) =>
                          prev.map((item) => (item.id === enc.id ? { ...item, status: newStatus } : item))
                        );
                        showNotification("Status da encomenda atualizado!", "info");
                      }}
                      className="bg-slate-950 border border-white/10 text-xs text-white rounded-xl px-3 py-2 font-bold outline-none"
                    >
                      <option value="anotado">📝 Pedido Anotado</option>
                      <option value="em_preparo">🥣 Em Produção</option>
                      <option value="pronto">📦 Pronto para Entrega</option>
                      <option value="entregue">🎉 Entregue & Quitado</option>
                    </select>

                    <button
                      onClick={() => {
                        setEncomendas((prev) => prev.filter((item) => item.id !== enc.id));
                        showNotification("Encomenda excluída.", "info");
                      }}
                      className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 5: EMPRESA, LOGO E LINK */}
      {activeTab === "empresa" && (
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-white text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>Identidade Visual da Empresa, Logomarca & Link</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Configure a imagem e o link de divulgação da sua barbearia, salão de beleza ou empresa de eventos.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-300">
                Nome da Barbearia, Salão ou Empresa *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Barbearia do João / Salão Estilo & Beleza"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold focus:border-amber-500"
              />
            </div>

            {/* Aviso de Privacidade e Dados Pessoais Protegidos */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 text-xs">
                <strong className="text-white font-black block">
                  Segurança & Proteção de Dados Pessoais 🔒
                </strong>
                <p className="text-slate-300 leading-relaxed font-medium">
                  Deixamos os campos de contato e redes sociais em branco por padrão para que você preencha apenas os dados comerciais da sua empresa. Os dados da agenda pública dos clientes nunca expõem caixas, senhas ou informações particulares.
                </p>
              </div>
            </div>

            {/* WhatsApp Comercial */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp / Celular Comercial da Empresa</span>
              </label>
              <input
                type="text"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="Ex: (11) 99999-8888 (Deixar em branco se preferir)"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold font-mono focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400 block">
                É para este número que os clientes enviarão a confirmação dos agendamentos e encomendas.
              </span>
            </div>

            {/* Instagram da Empresa */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-300 flex items-center gap-1.5">
                <span className="text-pink-400 font-bold">@</span>
                <span>Instagram da Empresa / Salão / Barbearia</span>
              </label>
              <input
                type="text"
                value={companyInstagram}
                onChange={(e) => {
                  setCompanyInstagram(e.target.value);
                  setCompanyLink(e.target.value);
                }}
                placeholder="Ex: @minhabarbearia ou https://instagram.com/minhabarbearia"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold focus:border-pink-500"
              />
            </div>

            {/* Facebook da Empresa */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Página do Facebook</span>
              </label>
              <input
                type="text"
                value={companyFacebook}
                onChange={(e) => setCompanyFacebook(e.target.value)}
                placeholder="Ex: https://facebook.com/minhapagina"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold focus:border-blue-500"
              />
            </div>

            {/* Site / Página Web / Portfólio Pessoal */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Site Pessoal, Portfólio ou Página Web da Empresa</span>
              </label>
              <input
                type="text"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                placeholder="Ex: https://minhaempresa.com.br"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold focus:border-indigo-500"
              />
            </div>

            {/* Logomarca / Imagem de Destaque com Upload e Prévia */}
            <div className="space-y-2 bg-slate-950/70 p-4 rounded-2xl border border-white/5">
              <label className="text-[10.5px] font-black uppercase text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-pink-400" />
                <span>Logomarca ou Foto de Destaque do Negócio</span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                {/* Quadrado de prévia */}
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/15 bg-slate-950 flex items-center justify-center overflow-hidden flex-shrink-0 group relative shadow-inner">
                  {companyLogo ? (
                    <>
                      <img
                        src={companyLogo}
                        alt="Logomarca da Empresa"
                        className="w-full h-full object-contain p-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyLogo("");
                          localStorage.setItem("pdv_company_logo", "");
                          window.dispatchEvent(new CustomEvent("pdv_company_profile_changed", {
                            detail: { logoUrl: "" }
                          }));
                          showNotification("Logomarca removida.", "info");
                        }}
                        className="absolute inset-0 bg-red-950/80 text-red-200 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black cursor-pointer"
                        title="Remover logotipo"
                      >
                        <Trash2 className="w-4 h-4 text-red-400 mb-0.5" />
                        Remover
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 text-center p-2">
                      <Camera className="w-6 h-6 stroke-1 mb-1 text-slate-500" />
                      <span className="text-[8px] font-bold">Sem Logo</span>
                    </div>
                  )}
                </div>

                {/* Botões de Ação & Link Alternativo */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-black shadow-lg shadow-pink-900/30 transition-all active:scale-95">
                      <Camera className="w-4 h-4" />
                      <span>Carregar Foto / Imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCompanyLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {companyLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyLogo("");
                          localStorage.setItem("pdv_company_logo", "");
                          window.dispatchEvent(new CustomEvent("pdv_company_profile_changed", {
                            detail: { logoUrl: "" }
                          }));
                          showNotification("Logomarca removida.", "info");
                        }}
                        className="px-3 py-2 bg-red-900/30 hover:bg-red-800/50 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={companyLogo}
                    onChange={(e) => setCompanyLogo(e.target.value)}
                    placeholder="Ou cole o link direto da imagem (https://...)"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] text-white outline-none focus:border-amber-500 font-bold"
                  />
                  <p className="text-[10px] text-slate-400">
                    PNG, JPG ou WebP de até 5MB. Aparece nos cupons, no link da agenda e no WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveEmpresa}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Identidade & Link da Empresa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CADASTRAR PROFISSIONAL COM FOTO */}
      {isAddProfissionalOpen && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-white font-black text-base flex items-center gap-2">
                <Scissors className="w-5 h-5 text-amber-400" />
                <span>Novo Barbeiro / Profissional</span>
              </h3>
              <button
                onClick={() => setIsAddProfissionalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfissional} className="space-y-4">
              {/* Seletor de Foto do Profissional */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-300 block">
                  Foto do Profissional 📸
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={newProfFoto}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/50 shadow-md shrink-0"
                  />
                  <div className="space-y-1.5 flex-1">
                    <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-white/10 transition-all flex items-center gap-2 cursor-pointer w-fit">
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span>Escolher Foto do Aparelho</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFotoUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[9px] text-slate-500 block">
                      Ou escolha um dos modelos abaixo:
                    </span>
                  </div>
                </div>

                {/* Presets de foto rápida */}
                <div className="flex gap-2 overflow-x-auto py-1">
                  {AVATAR_PRESETS.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Avatar ${idx}`}
                      onClick={() => setNewProfFoto(url)}
                      className={`w-10 h-10 rounded-xl object-cover cursor-pointer transition-all border-2 ${
                        newProfFoto === url ? "border-amber-400 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProfNome}
                    onChange={(e) => setNewProfNome(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">
                    Apelido / Nome de Guerra
                  </label>
                  <input
                    type="text"
                    value={newProfApelido}
                    onChange={(e) => setNewProfApelido(e.target.value)}
                    placeholder="Ex: Kadu Navalha"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  Especialidade / Serviços
                </label>
                <input
                  type="text"
                  value={newProfEspecialidade}
                  onChange={(e) => setNewProfEspecialidade(e.target.value)}
                  placeholder="Ex: Corte Degradê, Barba Terapia, Manicure"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">
                    WhatsApp do Profissional
                  </label>
                  <input
                    type="text"
                    value={newProfTelefone}
                    onChange={(e) => setNewProfTelefone(e.target.value)}
                    placeholder="Ex: (21) 98888-7777"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newProfComissao}
                    onChange={(e) => setNewProfComissao(e.target.value)}
                    placeholder="Ex: 50"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddProfissionalOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs uppercase"
                >
                  Salvar Profissional
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MARCAR HORÁRIO */}
      {isAddAgendamentoOpen && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-white font-black text-base flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-400" />
                <span>Novo Agendamento de Horário</span>
              </h3>
              <button
                onClick={() => setIsAddAgendamentoOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgendamento} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Data</label>
                  <input
                    type="date"
                    required
                    value={newAgData}
                    onChange={(e) => setNewAgData(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Horário</label>
                  <input
                    type="time"
                    required
                    value={newAgHora}
                    onChange={(e) => setNewAgHora(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    value={newAgClienteNome}
                    onChange={(e) => setNewAgClienteNome(e.target.value)}
                    placeholder="Ex: Gabriel Silva"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">WhatsApp do Cliente</label>
                  <input
                    type="text"
                    value={newAgClienteTelefone}
                    onChange={(e) => setNewAgClienteTelefone(e.target.value)}
                    placeholder="Ex: (21) 99999-8888"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">Profissional Responsável</label>
                <select
                  value={newAgProfissionalId}
                  onChange={(e) => setNewAgProfissionalId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                >
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.apelido ? `(${p.apelido})` : ""} - {p.especialidade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Serviço</label>
                  <input
                    type="text"
                    value={newAgServico}
                    onChange={(e) => setNewAgServico(e.target.value)}
                    placeholder="Ex: Corte Degradê"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Valor (R$)</label>
                  <input
                    type="number"
                    value={newAgValor}
                    onChange={(e) => setNewAgValor(e.target.value)}
                    placeholder="45"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAgendamentoOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs uppercase"
                >
                  Confirmar Horário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CADASTRAR ANIVERSÁRIO */}
      {isAddAniversarioOpen && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-white font-black text-base flex items-center gap-2">
                <Cake className="w-5 h-5 text-pink-400" />
                <span>Anotar Aniversário de Cliente</span>
              </h3>
              <button
                onClick={() => setIsAddAniversarioOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAniversario} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={newAnivNome}
                  onChange={(e) => setNewAnivNome(e.target.value)}
                  placeholder="Ex: Denise Jesus"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">WhatsApp</label>
                <input
                  type="text"
                  value={newAnivTelefone}
                  onChange={(e) => setNewAnivTelefone(e.target.value)}
                  placeholder="Ex: (21) 96671-3263"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Dia (1 a 31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={newAnivDia}
                    onChange={(e) => setNewAnivDia(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Mês (1 a 12)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={newAnivMes}
                    onChange={(e) => setNewAnivMes(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  Presente ou Cupom de Aniversário
                </label>
                <input
                  type="text"
                  value={newAnivPresente}
                  onChange={(e) => setNewAnivPresente(e.target.value)}
                  placeholder="Ex: 10% de desconto no mês de aniversário"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAniversarioOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-pink-600 hover:bg-pink-500 text-white py-2.5 rounded-xl font-black text-xs uppercase"
                >
                  Salvar Aniversariante 🎂
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CADASTRAR ENCOMENDA PARA FESTA */}
      {isAddEncomendaOpen && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-white font-black text-base flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-emerald-400" />
                <span>Nova Encomenda para Festa / Evento</span>
              </h3>
              <button
                onClick={() => setIsAddEncomendaOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEncomenda} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Data da Entrega</label>
                  <input
                    type="date"
                    required
                    value={newEncData}
                    onChange={(e) => setNewEncData(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Horário da Festa/Entrega</label>
                  <input
                    type="time"
                    required
                    value={newEncHora}
                    onChange={(e) => setNewEncHora(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    value={newEncClienteNome}
                    onChange={(e) => setNewEncClienteNome(e.target.value)}
                    placeholder="Ex: Renata Oliveira"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">WhatsApp do Cliente</label>
                  <input
                    type="text"
                    value={newEncClienteTelefone}
                    onChange={(e) => setNewEncClienteTelefone(e.target.value)}
                    placeholder="Ex: (21) 99888-7766"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">Tipo de Evento</label>
                <input
                  type="text"
                  value={newEncTipoEvento}
                  onChange={(e) => setNewEncTipoEvento(e.target.value)}
                  placeholder="Ex: Aniversário Infantil / Confraternização"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  Itens Encomendados (Descreva os produtos) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newEncItens}
                  onChange={(e) => setNewEncItens(e.target.value)}
                  placeholder="Ex: Bolo de Chocolate Brigadeiro 3kg + 100 Coxinhas + 50 Brigadeiros + 50 Beijinhos"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Valor Total (R$) *</label>
                  <input
                    type="number"
                    required
                    value={newEncValorTotal}
                    onChange={(e) => setNewEncValorTotal(e.target.value)}
                    placeholder="280"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">Sinal / Entrada Paga (R$)</label>
                  <input
                    type="number"
                    value={newEncSinal}
                    onChange={(e) => setNewEncSinal(e.target.value)}
                    placeholder="140"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEncomendaOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-black text-xs uppercase"
                >
                  Gravar Encomenda 🍰
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: PREVIEW DO CLIENTE (COMO O CLIENTE ENXERGA O LINK DO WHATSAPP) */}
      {isPreviewClientPortalOpen && (
        <div className="fixed inset-0 z-[10030] bg-slate-950 overflow-y-auto">
          <ClientPublicAgendaPortal
            companyName={companyName}
            companyLogo={companyLogo}
            companyPhone={companyPhone}
            profissionais={profissionais}
            agendamentos={agendamentos}
            isOnlineBookingActive={isPublicAgendaActive}
            onSaveAgendamento={(ag) => {
              setAgendamentos((prev) => [ag, ...prev]);
              showNotification("Agendamento de teste criado com sucesso! ✂️✅", "success");
            }}
            onSaveEncomenda={(enc) => {
              setEncomendas((prev) => [enc, ...prev]);
              showNotification("Encomenda de festa criada com sucesso! 🍰🎉", "success");
            }}
            onClosePortal={() => setIsPreviewClientPortalOpen(false)}
            formatCurrency={formatCurrency}
          />
        </div>
      )}

      {/* MODAL: CONFIGURAÇÃO DE AGENDA DO PROFISSIONAL (ABERTURA, FOLGAS, ALMOÇO E BLOQUEIOS) */}
      {editingScheduleProf && (
        <ModalConfiguracaoAgendaProfissional
          isOpen={!!editingScheduleProf}
          onClose={() => setEditingScheduleProf(null)}
          profissional={editingScheduleProf}
          onSave={(atualizado) => {
            handleUpdateProfissional(atualizado);
            setEditingScheduleProf(null);
          }}
          showNotification={showNotification}
        />
      )}

      {/* MODAL: PERSONALIZAR PARABÉNS DOS ANIVERSARIANTES (ATÉ 10 MODELOS) */}
      <ModalPersonalizarParabens
        isOpen={isPersonalizarParabensOpen}
        onClose={() => setIsPersonalizarParabensOpen(false)}
        companyName={companyName}
        companyPhone={companyPhone}
        clientAgendaUrl={clientAgendaUrl}
        showNotification={showNotification}
      />

      {/* MODAL: COMUNICADOS & LEMBRETES DA AGENDA (ATÉ 10 MODELOS) */}
      <ModalComunicadosAgenda
        isOpen={isComunicadosAgendaOpen}
        onClose={() => setIsComunicadosAgendaOpen(false)}
        companyName={companyName}
        companyPhone={companyPhone}
        clientAgendaUrl={clientAgendaUrl}
        agendamentos={agendamentos}
        formatCurrency={formatCurrency}
        showNotification={showNotification}
      />
    </div>
  );
};
