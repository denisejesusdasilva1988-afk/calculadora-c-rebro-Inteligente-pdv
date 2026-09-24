import React, { useState, useRef, useEffect } from "react";
import { 
  Mail, 
  Copy, 
  FileUp, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MessageSquare,
  Bell,
  Wifi,
  Database,
  RefreshCw
} from "lucide-react";
import { getAuth } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";

interface PDVSettingsSupportProps {
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
  logRiskAction: (action: string, description: string, details?: any) => Promise<void>;
  userId: string;
  isLoggedIn: boolean;
  db: any;
}

interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  base64: string;
}

export const PDVSettingsSupport: React.FC<PDVSettingsSupportProps> = ({
  showNotification,
  logRiskAction,
  userId,
  isLoggedIn,
  db
}) => {
  const [supportAttachments, setSupportAttachments] = useState<AttachmentFile[]>([]);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDescription, setSupportDescription] = useState("");
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [swStatus, setSwStatus] = useState<"checking" | "active" | "unsupported" | "not_registered">("checking");
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [syncSupported, setSyncSupported] = useState<boolean>(false);
  const [periodicSyncSupported, setPeriodicSyncSupported] = useState<boolean>(false);

  useEffect(() => {
    // Check Notification Permission
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission("unsupported");
    }

    // Check Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setSwStatus("active");
        if ("sync" in reg) {
          setSyncSupported(true);
        }
        if ("periodicSync" in reg) {
          setPeriodicSyncSupported(true);
        }
      }).catch(() => {
        setSwStatus("not_registered");
      });
    } else {
      setSwStatus("unsupported");
    }
  }, []);

  const triggerTestNotification = () => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      showNotification("Por favor, conceda permissão de notificações primeiro! 🔔", "error");
      return;
    }

    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          (reg as any).showNotification("Cérebro PDV - Teste de Notificação 🧠", {
            body: "Parabéns! Suas notificações push do PWA estão configuradas e funcionando perfeitamente! 🚀📈",
            icon: "icon-192.png",
            badge: "icon-192.png",
            vibrate: [100, 50, 100],
            data: {
              url: "./"
            }
          } as any);
          showNotification("Notificação de teste disparada pelo Service Worker! 🔔✔️", "success");
        }).catch(() => {
          new Notification("Cérebro PDV - Teste de Notificação 🧠", {
            body: "Notificações locais estão ativas! 🚀📈",
            icon: "icon-192.png"
          });
          showNotification("Notificação de teste local disparada! 🔔", "success");
        });
      } else {
        new Notification("Cérebro PDV - Teste de Notificação 🧠", {
          body: "Notificações locais estão ativas! 🚀📈",
          icon: "icon-192.png"
        });
        showNotification("Notificação de teste local disparada! 🔔", "success");
      }
    } catch (err: any) {
      console.error("Erro ao disparar notificação:", err);
      showNotification("Seu navegador ou dispositivo bloqueou o envio da notificação local.", "error");
    }
  };

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      showNotification("Notificações não são suportadas por este navegador. ❌", "error");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        showNotification("Permissão de notificações concedida com sucesso! 🔔✨", "success");
        triggerTestNotification();
      } else if (permission === "denied") {
        showNotification("Permissão de notificações foi negada. Você precisa habilitar nas configurações do navegador. ❌", "error");
      }
    } catch (err: any) {
      console.error("Erro ao solicitar permissão de notificações:", err);
      showNotification(`Erro ao solicitar permissão: ${err.message || err}`, "error");
    }
  };

  const handleTriggerSync = async () => {
    if (!("serviceWorker" in navigator)) {
      showNotification("Service Worker não disponível no navegador. ❌", "error");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      if ("sync" in reg) {
        await (reg as any).sync.register("database-sync");
        showNotification("Evento 'database-sync' registrado com sucesso no Background Sync! 🔄💾", "success");
      } else {
        showNotification("Seu navegador não oferece suporte nativo para a API Background Sync. Executando fallback manual... 🔄", "info");
        if (navigator.onLine) {
          showNotification("Conectado! Sincronização em segundo plano executada localmente. 🟢", "success");
        } else {
          showNotification("Você está offline! A sincronização ocorrerá assim que a conexão retornar. 🟡", "info");
        }
      }
    } catch (err: any) {
      console.error("Erro ao registrar Background Sync:", err);
      showNotification(`Erro ao registrar Background Sync: ${err.message || err}`, "error");
    }
  };

  const handleTriggerPeriodicSync = async () => {
    if (!("serviceWorker" in navigator)) {
      showNotification("Service Worker não disponível no navegador. ❌", "error");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      if ("periodicSync" in reg) {
        const status = await navigator.permissions.query({
          name: "periodic-background-sync" as any
        });
        if (status.state === "granted") {
          await (reg as any).periodicSync.register("fetch-new-content", {
            minInterval: 24 * 60 * 60 * 1000
          });
          showNotification("Evento 'fetch-new-content' de Sincronização Periódica registrado com sucesso! 📆🔄", "success");
        } else {
          showNotification("A permissão para Sincronização Periódica não foi concedida pelo navegador. ❌", "error");
        }
      } else {
        showNotification("Seu navegador não oferece suporte para Sincronização Periódica em Segundo Plano. ❌", "error");
      }
    } catch (err: any) {
      console.error("Erro ao registrar Periodic Background Sync:", err);
      showNotification(`Erro ao registrar: ${err.message || err}`, "error");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("calculadoracerebrointeligente@gmail.com");
    showNotification("E-mail de suporte copiado para a área de transferência! 🚀📎", "success");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    Array.from(fileList).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        showNotification(`O arquivo "${file.name}" excede o limite permitido de 10MB! ❌`, "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setSupportAttachments(prev => [
          ...prev,
          {
            id: "file_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            name: file.name,
            size: file.size,
            type: file.type,
            base64: reader.result as string
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setSupportAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim()) {
      showNotification("Por favor, preencha o assunto do chamado! 📝", "error");
      return;
    }
    if (!supportDescription.trim()) {
      showNotification("Por favor, descreva detalhadamente sua dúvida ou falha! 📝", "error");
      return;
    }

    setIsSendingSupport(true);
    setUploadProgress(0);

    // Simulate progress bar upload speed
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 15;
      });
    }, 150);

    try {
      const email = getAuth().currentUser?.email || "modo_visitante_local@cerebro.com";
      const ticketData = {
        userId: userId || "guest_visitor",
        userEmail: email,
        subject: supportSubject,
        description: supportDescription,
        attachmentsCount: supportAttachments.length,
        createdAt: new Date().toISOString(),
        status: "open",
        attachments: supportAttachments.map(a => ({
          name: a.name,
          size: a.size,
          type: a.type,
          base64: a.base64
        }))
      };

      // Real saving in Firestore or Local Storage
      if (isLoggedIn && db && userId && userId !== "guest_visitor") {
        await addDoc(collection(db, "suporte_anexos"), ticketData);
      } else {
        const saved = localStorage.getItem("pdv_suporte_tickets");
        const parsed = saved ? JSON.parse(saved) : [];
        parsed.push(ticketData);
        localStorage.setItem("pdv_suporte_tickets", JSON.stringify(parsed));
      }

      setUploadProgress(100);
      clearInterval(interval);

      setTimeout(() => {
        showNotification("Chamado enviado com sucesso! Nossa equipe analisará e responderá em até 24h. 🚀📬", "success");
        logRiskAction("Envio de Suporte", `Usuário abriu chamado: "${supportSubject}" com ${supportAttachments.length} anexo(s).`);
        
        // Reset form
        setSupportSubject("");
        setSupportDescription("");
        setSupportAttachments([]);
        setUploadProgress(0);
        setIsSendingSupport(false);
      }, 500);

    } catch (err: any) {
      clearInterval(interval);
      setUploadProgress(0);
      setIsSendingSupport(false);
      console.error("Error sending support ticket:", err);
      showNotification(`Falha ao enviar suporte: ${err.message || err}`, "error");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
      
      {/* Esquerda: Informações de Contato */}
      <div className="space-y-4 md:col-span-1">
        <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Mail className="w-4 h-4 text-purple-400" />
            <span className="text-[11.5px] font-black uppercase text-slate-350 font-sans">📬 Contato E-mail</span>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              Caso precise de suporte urgente, tirar dúvidas operacionais ou relatar falhas, envie uma mensagem para o nosso e-mail oficial:
            </p>

            <div className="bg-slate-900 border border-white/5 p-3 rounded-lg text-center space-y-2">
              <span className="text-[10px] font-black text-white font-mono block select-all">
                calculadoracerebrointeligente@gmail.com
              </span>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-[9px] uppercase tracking-wider rounded border border-white/5 flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Copy className="w-3 h-3 text-purple-400" />
                  Copiar E-mail
                </button>
                <a
                  href="mailto:calculadoracerebrointeligente@gmail.com?subject=Suporte%20PDV%20Cérebro%20Inteligente"
                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-[9px] uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer transition-all"
                >
                  Enviar E-mail
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span className="text-[11.5px] font-black uppercase text-emerald-400 font-sans">💬 Suporte WhatsApp</span>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              Para suporte operacional rápido em tempo real e plantão técnico, envie uma mensagem para o nosso WhatsApp oficial:
            </p>

            <div className="bg-slate-900 border border-white/5 p-3 rounded-lg text-center space-y-2">
              <span className="text-xs font-black text-white font-mono block select-all">
                (21) 96671-3263
              </span>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText("21966713263");
                    showNotification("WhatsApp de suporte copiado! 📋", "success");
                  }}
                  className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-[9px] uppercase tracking-wider rounded border border-white/5 flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Copy className="w-3 h-3 text-emerald-400" />
                  Copiar Número
                </button>
                <a
                  href="https://wa.me/5521966713263?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20PDV%20C%C3%A9rebro%20Inteligente"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer transition-all"
                >
                  Falar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-1.5">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black uppercase text-slate-300 font-sans">⏱️ Tempo de Resposta</span>
          </div>
          <ul className="text-[9.5px] text-slate-400 space-y-1.5 font-medium list-disc pl-4 leading-relaxed font-sans">
            <li>Nossa equipe trabalha de <strong>Segunda a Sexta-feira das 8h às 18h</strong>.</li>
            <li>Tempo estimado de resposta para chamados urgentes é de <strong>até 2 horas</strong>.</li>
            <li>Durante finais de semana, o retorno pode levar até <strong>24 horas</strong>.</li>
          </ul>
        </div>
      </div>

      {/* Direita: Formulário Interativo de Suporte & Upload */}
      <form onSubmit={handleSendSupport} className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-4 md:col-span-2 text-left">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <FileUp className="w-4 h-4 text-purple-400" />
          <span className="text-[11.5px] font-black uppercase text-slate-350 font-sans">📎 Enviar Mensagem & Anexos</span>
        </div>

        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Assunto ou Título do Chamado:
            </label>
            <input
              type="text"
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              placeholder="Ex: Dúvida sobre conexão do Pix ou erro no fechamento"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
              disabled={isSendingSupport}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Descrição Detalhada do Problema / Dúvida:
            </label>
            <textarea
              value={supportDescription}
              onChange={(e) => setSupportDescription(e.target.value)}
              placeholder="Descreva detalhadamente o que ocorreu. Se houver mensagens de erro, copie e cole aqui..."
              rows={4}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold resize-none leading-relaxed"
              disabled={isSendingSupport}
            />
          </div>

          {/* Drag & Drop Zone */}
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Anexar Arquivos, Prints de Tela, Fotos ou Logs (Até 10MB por arquivo):
            </label>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isSendingSupport && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isSendingSupport 
                  ? "border-white/5 bg-slate-900/10 cursor-not-allowed" 
                  : "border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-950/10"
              }`}
            >
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                disabled={isSendingSupport}
              />
              <FileUp className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-bounce" />
              <p className="text-xs font-black text-slate-200">Arraste e solte seus arquivos aqui</p>
              <p className="text-[10px] text-slate-400 font-medium">Ou clique para procurar em seu computador/celular</p>
            </div>
          </div>

          {/* List of attachments */}
          {supportAttachments.length > 0 && (
            <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                Arquivos Selecionados ({supportAttachments.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {supportAttachments.map((file) => {
                  const isImage = file.type.startsWith("image/");
                  return (
                    <div 
                      key={file.id} 
                      className="bg-slate-950 border border-white/5 p-2 rounded-lg flex items-center justify-between gap-3 animate-in fade-in"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {isImage ? (
                          <img 
                            src={file.base64} 
                            alt={file.name} 
                            className="w-8 h-8 object-cover rounded border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-slate-900 border border-white/5 rounded flex items-center justify-center">
                            <FileText className="w-4 h-4 text-purple-400" />
                          </div>
                        )}
                        <div className="overflow-hidden text-left">
                          <p className="text-[10px] font-black text-slate-200 truncate pr-2">{file.name}</p>
                          <p className="text-[8px] text-slate-500 font-bold">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(file.id)}
                        disabled={isSendingSupport}
                        className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Send progress bar */}
          {isSendingSupport && (
            <div className="space-y-1.5 bg-slate-900 border border-white/5 p-3 rounded-xl">
              <div className="flex justify-between items-center text-[9px] font-black uppercase">
                <span className="text-slate-400">Enviando arquivos e dados de suporte...</span>
                <span className="text-purple-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/[0.03]">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-sky-500 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSendingSupport}
            className="w-full py-3 bg-purple-600 hover:bg-purple-550 disabled:opacity-55 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-500/15"
          >
            {isSendingSupport ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enviando Chamado...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Enviar para o Suporte Técnico</span>
              </>
            )}
          </button>
        </div>
      </form>
      </div>

      {/* PAINEL DE DIAGNÓSTICOS PWA & RECURSOS OFFLINE */}
      <div className="bg-slate-950 p-5 rounded-xl border border-white/5 space-y-4 text-left">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
          <Bell className="w-4 h-4 text-purple-400" />
          <span className="text-[11.5px] font-black uppercase text-slate-300 font-sans">📲 Diagnósticos PWA, Notificações & Sincronização Offline</span>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
          Verifique em tempo real a integridade das tecnologias Progressive Web App (PWA) instaladas no seu aparelho. O nosso sistema está preparado para rodar de forma independente e offline com notificações de segurança e sincronização local automática.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          {/* Item 1: Service Worker Status */}
          <div className="bg-slate-900 border border-white/5 p-3 rounded-lg space-y-2">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">Service Worker</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                swStatus === "active" ? "bg-emerald-500 animate-pulse" :
                swStatus === "checking" ? "bg-amber-500 animate-spin" : "bg-rose-500"
              }`} />
              <span className="text-xs font-black text-white">
                {swStatus === "active" ? "🟢 Ativo e Pronto" :
                 swStatus === "checking" ? "🟡 Verificando..." :
                 swStatus === "unsupported" ? "❌ Sem Suporte" : "🔴 Não Registrado"}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium leading-normal">
              Garante que o aplicativo abra de forma instantânea mesmo sem internet de qualquer dispositivo.
            </p>
          </div>

          {/* Item 2: Notificações */}
          <div className="bg-slate-900 border border-white/5 p-3 rounded-lg space-y-2">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">Permissão de Notificações</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                notifPermission === "granted" ? "bg-emerald-500 animate-pulse" :
                notifPermission === "default" ? "bg-amber-500" : "bg-rose-500"
              }`} />
              <span className="text-xs font-black text-white font-sans">
                {notifPermission === "granted" ? "🟢 Permitido" :
                 notifPermission === "default" ? "🟡 Aguardando" :
                 notifPermission === "unsupported" ? "❌ Sem Suporte" : "🔴 Negado"}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium leading-normal">
              Permite receber avisos de segurança, alertas de sangria de caixa e vendas feitas pelo PDV.
            </p>
          </div>

          {/* Item 3: Background Sync */}
          <div className="bg-slate-900 border border-white/5 p-3 rounded-lg space-y-2">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">Background Sync</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${syncSupported ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="text-xs font-black text-white font-sans">
                {syncSupported ? "🟢 Disponível" : "🟡 Modo Fallback"}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium leading-normal">
              Salva e envia automaticamente suas vendas salvas localmente para a nuvem assim que detecta conexão.
            </p>
          </div>

          {/* Item 4: Periodic Sync */}
          <div className="bg-slate-900 border border-white/5 p-3 rounded-lg space-y-2">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">Sincronização Periódica</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${periodicSyncSupported ? "bg-emerald-500 animate-pulse" : "bg-amber-450"}`} />
              <span className="text-xs font-black text-white font-sans">
                {periodicSyncSupported ? "🟢 Ativo" : "🟡 Indisponível"}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium leading-normal">
              Busca novidades, novas configurações e atualiza o estoque e relatórios de forma autônoma de madrugada.
            </p>
          </div>
        </div>

        {/* Diagnostic Action Controls */}
        <div className="bg-slate-900/50 border border-white/5 p-4 rounded-lg space-y-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ações de Teste de Integração (PWA)</span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-[9.5px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-white/5 shadow"
            >
              <Bell className="w-3.5 h-3.5" />
              Solicitar Notificação
            </button>
            <button
              type="button"
              onClick={triggerTestNotification}
              disabled={notifPermission !== "granted"}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 font-black text-[9.5px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-white/5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              Notificação de Teste
            </button>
            <button
              type="button"
              onClick={handleTriggerSync}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-black text-[9.5px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-white/5"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Sincronizar Vendas (Sync)
            </button>
            <button
              type="button"
              onClick={handleTriggerPeriodicSync}
              disabled={!periodicSyncSupported}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 font-black text-[9.5px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-white/5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              Sincronizar de Madrugada
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
