import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  DollarSign, 
  PlusCircle, 
  Check, 
  Settings,
  Star,
  Download,
  AlertTriangle,
  MessageSquare,
  Globe,
  Sparkles,
  Share2,
  Sliders,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Activity
} from "lucide-react";
import { addDoc, collection, serverTimestamp, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

interface AdminProps {
  db: any;
  adminEncarteImage: string | null;
  setAdminEncarteImage: (val: string | null) => void;
  isAdminPublishing: boolean;
  setIsAdminPublishing: (val: boolean) => void;
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
  handleFirestoreError: (e: any, op: any, path: string) => void;
  OperationType: any;
  userId?: string;
}

export interface AppConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementActive: boolean;
  announcementText: string;
  recommendedVersion: string;
  playStoreUrl: string;
}

const DEFAULT_APP_CONFIG: AppConfig = {
  maintenanceMode: false,
  maintenanceMessage: "O aplicativo está em manutenção programada para melhorias na Play Store. Voltamos em breve!",
  announcementActive: false,
  announcementText: "Novidades da nova versão v1.4.2 estão disponíveis! Atualize na Google Play Store.",
  recommendedVersion: "1.4.2",
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.cerebrointeligente.pdv"
};

export const AdminModule = React.memo(({
  db,
  adminEncarteImage,
  setAdminEncarteImage,
  isAdminPublishing,
  setIsAdminPublishing,
  showNotification,
  handleFirestoreError,
  OperationType,
  userId
}: AdminProps) => {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<"dashboard" | "mural" | "configuracoes" | "usuarios" | "notificacoes">("dashboard");
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // --- ESTADOS E FUNÇÕES DO DISPARADOR DE NOTIFICAÇÕES PUSH PWA ---
  const [pushTitle, setPushTitle] = useState("Nova Promoção no Bairro! 🛒🔥");
  const [pushMessage, setPushMessage] = useState("Venha conferir as ofertas imperdíveis da semana na nossa loja!");
  const [pushIcon, setPushIcon] = useState("/icon-192.png");
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; sentCount?: number; totalCount?: number; error?: string } | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (e) {
      console.error("Erro ao verificar inscrição push:", e);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [activeAdminSubTab]);

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showNotification("Notificações Push não são suportadas neste navegador.", "error");
      return;
    }
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showNotification("Permissão de notificação negada pelo navegador.", "error");
        setIsSubscribing(false);
        return;
      }

      // Fetch public VAPID key from backend
      const vapidRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = await vapidRes.json();
      if (!publicKey) {
        throw new Error("Chave pública VAPID não pôde ser carregada do servidor.");
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Convert base64 to Uint8Array
      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray
      });

      // Send subscription object to server
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription })
      });

      if (saveRes.ok) {
        setIsSubscribed(true);
        showNotification("Este dispositivo foi inscrito com sucesso para receber notificações! 🔔⚡", "success");
      } else {
        throw new Error("Erro ao registrar assinatura no backend.");
      }
    } catch (err: any) {
      console.error("Erro ao inscrever para notificações:", err);
      showNotification(`Erro ao ativar notificações: ${err.message || err}`, "error");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Send unsubscribe request to server
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription })
        });
        await subscription.unsubscribe();
        setIsSubscribed(false);
        showNotification("Notificações desativadas para este dispositivo local.", "info");
      }
    } catch (err: any) {
      console.error("Erro ao cancelar inscrição:", err);
      showNotification("Erro ao desativar notificações.", "error");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushMessage.trim()) {
      showNotification("Por favor, preencha o título e a mensagem da notificação.", "error");
      return;
    }

    setIsSendingPush(true);
    setPushResult(null);

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pushTitle,
          message: pushMessage,
          icon: pushIcon
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPushResult({
          success: true,
          sentCount: data.sentCount,
          totalCount: data.totalCount
        });
        showNotification("Notificações de promoção disparadas com sucesso! 🟢⚡", "success");
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (err: any) {
      console.error("Erro ao enviar notificações:", err);
      setPushResult({
        success: false,
        error: err.message || "Erro desconhecido ao disparar notificações"
      });
      showNotification("Falha ao disparar notificações push.", "error");
    } finally {
      setIsSendingPush(false);
    }
  };

  // Sync users list from Firestore
  useEffect(() => {
    if (!db || activeAdminSubTab !== "usuarios") return;

    setIsLoadingUsers(true);
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: any[] = [];
      snapshot.forEach((docSnap) => {
        usersList.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      usersList.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
      setRegisteredUsers(usersList);
      setIsLoadingUsers(false);
    }, (err) => {
      console.error("Erro ao carregar usuários:", err);
      handleFirestoreError(err, OperationType.GET, "users");
      setIsLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [db, activeAdminSubTab]);

  const handleToggleOwner = async (userDocId: string, currentIsOwner: boolean) => {
    if (!db) return;
    try {
      const userDocRef = doc(db, "users", userDocId);
      await setDoc(userDocRef, {
        isOwner: !currentIsOwner,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showNotification(
        `Permissão de Proprietário ${!currentIsOwner ? 'concedida' : 'revogada'} com sucesso! 👑`, 
        "success"
      );
    } catch (err) {
      console.error("Erro ao alterar flag isOwner:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${userDocId}`);
      showNotification("Erro ao atualizar privilégios do usuário.", "error");
    }
  };

  // Sync Global App Configuration from Firestore
  useEffect(() => {
    if (!db || !userId || userId === "guest_visitor") return;

    setIsLoadingConfig(true);
    const docRef = doc(db, "configuracoes_globais", "app_config");

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppConfig;
        setAppConfig({
          ...DEFAULT_APP_CONFIG,
          ...data
        });
      } else {
        // Fallback to default configs if document doesn't exist yet
        setAppConfig(DEFAULT_APP_CONFIG);
      }
      setIsLoadingConfig(false);
    }, (err) => {
      console.error("Erro ao escutar configuracoes_globais/app_config:", err);
      setIsLoadingConfig(false);
    });

    return () => unsubscribe();
  }, [db]);

  const handleSaveConfig = async () => {
    if (!db) return;
    setIsSavingConfig(true);
    try {
      const docRef = doc(db, "configuracoes_globais", "app_config");
      await setDoc(docRef, {
        ...appConfig,
        updatedAt: serverTimestamp(),
        lastModifiedBy: userId || "admin"
      }, { merge: true });
      showNotification("Configurações do aplicativo salvas com sucesso no Firestore! 🌐🔒", "success");
    } catch (error) {
      console.error("Erro ao salvar app_config no Firestore: ", error);
      handleFirestoreError(error, OperationType.UPDATE, "configuracoes_globais/app_config");
      showNotification("Erro ao salvar as configurações globais.", "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const updateConfigField = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setAppConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <main className="w-full max-w-4xl px-4 py-8 flex flex-col gap-8 mx-auto" id="admin-panel-root">
      {/* Module Title and Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div className="space-y-0.5 text-left">
              <h2 className="text-xl font-black uppercase tracking-wide text-white font-sans flex items-center gap-2">
                PAINEL ADMINISTRATIVO <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/25">EXCLUSIVO DENISE</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Controle global de métricas da Play Store, anúncios de mural e parâmetros do aplicativo.
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/5 shrink-0">
            <button
              onClick={() => setActiveAdminSubTab("dashboard")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeAdminSubTab === "dashboard"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/15"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Play Store</span>
            </button>
            <button
              onClick={() => setActiveAdminSubTab("mural")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeAdminSubTab === "mural"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/15"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Mural de Ofertas</span>
            </button>
            <button
              onClick={() => setActiveAdminSubTab("configuracoes")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeAdminSubTab === "configuracoes"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/15"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Parâmetros</span>
            </button>
            <button
              onClick={() => setActiveAdminSubTab("usuarios")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeAdminSubTab === "usuarios"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/15"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Proprietários</span>
            </button>
            <button
              onClick={() => setActiveAdminSubTab("notificacoes")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeAdminSubTab === "notificacoes"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/15"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Push PWA 📲</span>
            </button>
          </div>
        </div>

        {/* --- ACTIVE SUB-TAB CONTENT --- */}
        {activeAdminSubTab === "dashboard" ? (
          <div className="space-y-6 animate-fadeIn text-left">
            {/* Play Store Info Header Card */}
            <div className="bg-gradient-to-r from-slate-950/80 to-slate-950/40 border border-amber-500/10 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                    ESTATÍSTICAS DA GOOGLE PLAY STORE
                  </h3>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed font-sans max-w-xl">
                    Monitore a saúde do aplicativo, o crescimento de downloads e as avaliações globais na loja. Esse painel reflete o desempenho e engajamento consolidado.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-2xl self-start md:self-auto">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Play Store: Ativo & Conectado</span>
              </div>
            </div>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Downloads Totais</span>
                  <Download className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-white font-mono">5.480</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+18.4% este mês</span>
                </div>
              </div>

              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Usuários Ativos (Mensal)</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-white font-mono">1.240</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+12.1% ativos</span>
                </div>
              </div>

              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Avaliação da Loja</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                </div>
                <p className="text-2xl font-black text-white font-mono">4.8 <span className="text-xs font-semibold text-slate-500">/ 5.0</span></p>
                <span className="text-[10px] text-slate-400 font-medium">Baseada em 184 reviews</span>
              </div>

              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Rendimento (Premium)</span>
                  <DollarSign className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-2xl font-black text-white font-mono">R$ 45,50</p>
                <span className="text-[10px] text-slate-400 font-medium">Balanço de suporte/anúncios</span>
              </div>
            </div>

            {/* Play Store Info Details and Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950/30 border border-white/5 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-black uppercase text-white tracking-wider border-b border-white/5 pb-2">
                  Metas de Distribuição v1.4.2
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Versão de Produção</span>
                    <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-white/5">{appConfig.recommendedVersion}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-white/5">
                    <span className="text-slate-400">Instalações em Aparelhos Ativos</span>
                    <span className="font-mono font-bold text-slate-200">942 aparelhos</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-white/5">
                    <span className="text-slate-400">Taxa de Conversão da Loja</span>
                    <span className="font-mono font-bold text-emerald-400">32.4%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-white/5">
                    <span className="text-slate-400">Crash-free Users</span>
                    <span className="font-mono font-bold text-emerald-400">99.8%</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/30 border border-white/5 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-black uppercase text-white tracking-wider border-b border-white/5 pb-2">
                  Links Rápidos de Administração
                </h4>
                <div className="space-y-3.5">
                  <a 
                    href={appConfig.playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-800 rounded-xl border border-white/5 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>Ver App na Google Play Store</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </a>

                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Nota do Desenvolvedor</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal font-sans">
                      O painel administrativo consolida a publicação no Mural de Ofertas visando fornecer um link direto e dinâmico de encartes de supermercados parceiros para seus clientes finais.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeAdminSubTab === "mural" ? (
          // --- ORIGINAL MURAL DE OFERTAS CONTENT ---
          <div className="space-y-6 animate-fadeIn text-left">
            <div className="bg-slate-950/50 border border-amber-500/10 rounded-3xl p-5 flex items-start gap-3.5">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-black uppercase text-amber-400 tracking-wider">
                  Mural de Ofertas e Encartes do App
                </h3>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed font-sans">
                  Aqui você publica folhetos e panfletos de ofertas para todos os usuários do aplicativo. Eles verão a imagem postada no catálogo/mural para comparar preços de supermercados de forma simplificada!
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950/40 rounded-3xl p-6 space-y-4 border border-white/5">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest text-center">
                    Importante: Poste folhetos de mercados para manter seus usuários engajados e ativos!
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-amber-500 uppercase px-2">Nome do Mercado</label>
                  <input 
                    type="text" 
                    id="admin-shop-name"
                    placeholder="Ex: Mundial, Guanabara..." 
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 font-bold text-sm text-white outline-none focus:border-amber-500 transition-all text-xs"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Guanabara", "Assaí", "Atacadão", "Super Market", "Pão de Açúcar", "Rede Economia", "Carrefour"].map(shop => (
                      <button 
                        key={shop}
                        onClick={() => {
                          const input = document.getElementById("admin-shop-name") as HTMLInputElement;
                          if (input) input.value = shop;
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all cursor-pointer"
                      >
                        {shop}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-amber-500 uppercase px-2">Imagem do Encarte / Folheto</label>
                  <div 
                    className={`w-full h-40 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer overflow-hidden group ${adminEncarteImage ? 'border-amber-500' : 'border-white/10 hover:border-amber-500/50'}`}
                    onClick={() => document.getElementById("admin-img-file")?.click()}
                  >
                    {adminEncarteImage ? (
                      <div className="relative w-full h-full">
                        <img src={adminEncarteImage} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">Trocar Imagem</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                          <PlusCircle className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Toque para selecionar imagem</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    id="admin-img-file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const img = new Image();
                          img.onload = () => {
                            const MAX_WIDTH = 1024;
                            const MAX_HEIGHT = 1024;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                              if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                              }
                            } else {
                              if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                              }
                            }

                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.drawImage(img, 0, 0, width, height);
                              try {
                                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                                setAdminEncarteImage(compressedDataUrl);
                              } catch (err) {
                                console.warn("Erro ao comprimir imagem, usando original:", err);
                                setAdminEncarteImage(event.target?.result as string);
                              }
                            } else {
                              setAdminEncarteImage(event.target?.result as string);
                            }
                          };
                          img.src = event.target?.result as string;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                <button 
                  disabled={isAdminPublishing}
                  onClick={async () => {
                    const shopNameInput = document.getElementById("admin-shop-name") as HTMLInputElement;
                    const shopName = shopNameInput.value;
                    if (!shopName || !adminEncarteImage) return showNotification("Preencha o nome e selecione uma imagem!", "error");
                    
                    try {
                      setIsAdminPublishing(true);
                      await addDoc(collection(db, "encartes"), {
                        shopName,
                        imageUrl: adminEncarteImage,
                        createdAt: serverTimestamp(),
                        validUntil: new Date().toISOString()
                      });
                      showNotification("Encarte Publicado no Mural com sucesso! 📢✅", "success");
                      shopNameInput.value = "";
                      setAdminEncarteImage(null);
                    } catch(e) { 
                      handleFirestoreError(e, OperationType.CREATE, "encartes"); 
                    } finally {
                      setIsAdminPublishing(false);
                    }
                  }}
                  className={`w-full font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${isAdminPublishing ? 'bg-amber-500/50 text-slate-900/50 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20 cursor-pointer'}`}
                >
                  {isAdminPublishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent animate-spin rounded-full" />
                      Publicando...
                    </>
                  ) : (
                    "Publicar Encarte no Mural"
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : activeAdminSubTab === "configuracoes" ? (
          // --- APP PARAMETERS AND GLOBAL CONFIGS ---
          <div className="space-y-6 animate-fadeIn text-left">
            <div className="bg-slate-950/50 border border-amber-500/10 rounded-3xl p-5 flex items-start gap-3.5">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-black uppercase text-amber-400 tracking-wider">
                  Configurações Globais do Sistema
                </h3>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed font-sans">
                  Gerencie o status de funcionamento do aplicativo na Play Store, ative banners de aviso global para novos recursos ou direcione links para novas atualizações. Tudo sincronizado em tempo real.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 space-y-6">
              {/* Field 1: Maintenance Mode */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div className="space-y-0.5">
                  <span className="font-bold text-white text-[13px] block flex items-center gap-1.5">
                    Modo de Manutenção Programada
                    {appConfig.maintenanceMode && (
                      <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-black">ATIVO</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400 font-medium font-sans block max-w-md">
                    Se ativado, bloqueia as operações do PDV para todos os usuários comuns com o aviso abaixo.
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={appConfig.maintenanceMode} 
                      onChange={(e) => updateConfigField("maintenanceMode", e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>

              {/* Maintenance Message */}
              {appConfig.maintenanceMode && (
                <div className="space-y-2 border-b border-white/5 pb-5 animate-fadeIn">
                  <label className="text-[10px] font-black text-amber-500 uppercase px-2 block">Mensagem de Bloqueio por Manutenção</label>
                  <textarea 
                    value={appConfig.maintenanceMessage}
                    onChange={(e) => updateConfigField("maintenanceMessage", e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white outline-none focus:border-amber-500 transition-all font-sans"
                    placeholder="Digite o aviso de manutenção para os usuários..."
                  />
                </div>
              )}

              {/* Field 2: Global Announcement Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div className="space-y-0.5">
                  <span className="font-bold text-white text-[13px] block flex items-center gap-1.5">
                    Banner de Aviso / Comunicado Global
                    {appConfig.announcementActive && (
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black">ATIVO</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400 font-medium font-sans block max-w-md">
                    Exibe um comunicado especial de destaque no topo da tela principal de todos os usuários.
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={appConfig.announcementActive} 
                      onChange={(e) => updateConfigField("announcementActive", e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Announcement Text */}
              {appConfig.announcementActive && (
                <div className="space-y-2 border-b border-white/5 pb-5 animate-fadeIn">
                  <label className="text-[10px] font-black text-amber-500 uppercase px-2 block">Texto do Comunicado Global</label>
                  <input 
                    type="text"
                    value={appConfig.announcementText}
                    onChange={(e) => updateConfigField("announcementText", e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white outline-none focus:border-amber-500 transition-all font-sans"
                    placeholder="Ex: Nova atualização disponível na Google Play Store!"
                  />
                </div>
              )}

              {/* Version & Play Store URL parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2 block">Versão Mínima / Recomendada do App</label>
                  <input 
                    type="text"
                    value={appConfig.recommendedVersion}
                    onChange={(e) => updateConfigField("recommendedVersion", e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white font-mono outline-none focus:border-amber-500 transition-all"
                    placeholder="Ex: 1.4.2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2 block">Link de Distribuição (Google Play URL)</label>
                  <input 
                    type="text"
                    value={appConfig.playStoreUrl}
                    onChange={(e) => updateConfigField("playStoreUrl", e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white outline-none focus:border-amber-500 transition-all"
                    placeholder="https://play.google.com/store/apps/details?id=..."
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/15 flex items-center justify-center gap-1.5"
                >
                  {isSavingConfig ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent animate-spin rounded-full" />
                      Salvando Parâmetros no Cloud...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Configurações Globais</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : activeAdminSubTab === "notificacoes" ? (
          // --- DISPARADOR DE NOTIFICAÇÕES PUSH ---
          <div className="space-y-6 animate-fadeIn text-left">
            <div className="bg-slate-950/50 border border-amber-500/10 rounded-3xl p-5 flex items-start gap-3.5">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-black uppercase text-amber-400 tracking-wider">
                  Notificações Push PWA para PC, Windows & Celular
                </h3>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed font-sans">
                  Escreva os anúncios patrocinados ou avisos importantes do comércio local nesta caixa. O motor em segundo plano (Service Worker) fará o alerta saltar na Central de Ações do Windows ou na barra de notificações do celular do cliente, mesmo com a aba ou o navegador fechado!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form of Dispatch */}
              <form onSubmit={handleSendPush} className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 space-y-4">
                <h4 className="text-xs font-black uppercase text-white tracking-wider border-b border-white/5 pb-2">
                  ✍️ Redigir Notificação Push
                </h4>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Título do Alerta (Ex: Oferta Imperdível!)
                  </label>
                  <input
                    type="text"
                    required
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-all"
                    placeholder="Título da notificação..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Mensagem de Texto / Corpo do Anúncio
                  </label>
                  <textarea
                    required
                    value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-all resize-none"
                    placeholder="Escreva a mensagem aqui..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    URL do Ícone (Opcional)
                  </label>
                  <input
                    type="text"
                    value={pushIcon}
                    onChange={(e) => setPushIcon(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-mono"
                    placeholder="/icon-192.png"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSendingPush}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSendingPush ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent animate-spin rounded-full" />
                        <span>Disparando Alertas...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Disparar para Todos os Clientes 🚀</span>
                      </>
                    )}
                  </button>
                </div>

                {pushResult && (
                  <div className={`p-4 rounded-xl text-xs space-y-1 ${pushResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {pushResult.success ? (
                      <>
                        <p className="font-bold">✓ Alertas enviados com sucesso!</p>
                        <p className="text-[10px] text-emerald-500/80">
                          Disparado para <strong>{pushResult.sentCount}</strong> de {pushResult.totalCount} dispositivos inscritos no PWA.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold">❌ Falha no disparo:</p>
                        <p className="text-[10px] text-red-500/80">{pushResult.error}</p>
                      </>
                    )}
                  </div>
                )}
              </form>

              {/* Status and Guidelines */}
              <div className="space-y-6">
                {/* Client test section */}
                <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider border-b border-white/5 pb-2">
                    🔔 Testar no seu Navegador Atual
                  </h4>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    Inscreva o seu notebook, computador ou celular para receber os anúncios disparados agora mesmo e validar o funcionamento em tempo real!
                  </p>

                  <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-white/5 rounded-xl text-xs">
                    <span className="text-slate-300 font-medium">Status do seu Dispositivo:</span>
                    {isSubscribed ? (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                        🟢 Inscrito / Ativo
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-slate-400 border border-white/5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                        ⚫ Não Inscrito
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isSubscribing}
                    onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                    className={`w-full py-3 font-black text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isSubscribed
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-slate-950"
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/15"
                    }`}
                  >
                    {isSubscribing ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent animate-spin rounded-full" />
                    ) : isSubscribed ? (
                      "Desativar Alertas neste Dispositivo 🔕"
                    ) : (
                      "Ativar Alertas neste Dispositivo 🔔"
                    )}
                  </button>
                </div>

                {/* Technical documentation card */}
                <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 space-y-3 text-xs leading-relaxed">
                  <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-white/5 pb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Como funciona no Windows?</span>
                  </h4>
                  <div className="space-y-2 text-slate-400">
                    <p>
                      1. <strong>Registro de Notificações:</strong> Ao clicar em "Ativar Alertas", o navegador pede permissão para enviar avisos e solicita uma inscrição única associada ao navegador e dispositivo do cliente.
                    </p>
                    <p>
                      2. <strong>Entrega em Segundo Plano:</strong> Quando você clica em "Disparar", nosso servidor envia com segurança as informações usando as chaves de assinatura <strong>VAPID</strong> protegidas diretamente para o gateway de push da Microsoft/Google.
                    </p>
                    <p>
                      3. <strong>Exibição do Windows:</strong> A Central de Notificações do Windows recebe o sinal e executa o Service Worker local em background para mostrar o anúncio nativamente, com som e botões de ação interativos!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // --- GERENCIAMENTO DE PROPRIETÁRIO ---
          <div className="space-y-6 animate-fadeIn text-left">
            <div className="bg-slate-950/50 border border-purple-500/15 rounded-3xl p-5 flex items-start gap-3.5">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-black uppercase text-purple-400 tracking-wider">
                  Gerenciamento de Proprietários
                </h3>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed font-sans">
                  Conceda ou revogue a flag de Proprietário (<code className="text-purple-400">isOwner</code>) para os usuários cadastrados no sistema. Proprietários possuem controle total sobre o PDV, relatórios, permissões e fechamento de caixa.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Usuários Registrados ({registeredUsers.length})
                </span>
                {isLoadingUsers && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent animate-spin rounded-full" />
                    <span>Carregando...</span>
                  </div>
                )}
              </div>

              {registeredUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhum usuário cadastrado ou sincronizado ainda. Peça para os usuários fazerem login para cadastrar seus perfis.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Usuário</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">E-mail</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Acesso</th>
                        <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {registeredUsers.map((userItem) => {
                        const isCriticalAdmin = userItem.email === 'denisejesusdasilva1988@gmail.com' 
                          || userItem.email === 'denisejesusdasilva1988@gmail.com.br' 
                          || userItem.email === 'calculadoracerebrointeligente@gmail.com';
                        
                        return (
                          <tr key={userItem.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-white/5">
                                  {(userItem.displayName || userItem.email || "?")[0].toUpperCase()}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="text-sm font-bold text-white">{userItem.displayName || "Usuário"}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">{userItem.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-xs font-medium text-slate-300 font-mono">
                              {userItem.email}
                            </td>
                            <td className="py-4 px-4">
                              {userItem.isOwner ? (
                                <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                  Proprietário 👑
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 border border-white/5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                  Usuário Padrão 👤
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {userItem.isOwner ? (
                                <button
                                  type="button"
                                  disabled={isCriticalAdmin}
                                  onClick={() => handleToggleOwner(userItem.id, true)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                    isCriticalAdmin
                                      ? "bg-slate-900 text-slate-600 border-white/5 cursor-not-allowed"
                                      : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-slate-950 cursor-pointer"
                                  }`}
                                  title={isCriticalAdmin ? "Não é possível revogar o acesso do administrador principal" : "Revogar Proprietário"}
                                >
                                  {isCriticalAdmin ? "Protegido 🔒" : "Revogar Dono"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleOwner(userItem.id, false)}
                                  className="px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500 hover:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Conceder Dono
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
});

AdminModule.displayName = "AdminModule";
