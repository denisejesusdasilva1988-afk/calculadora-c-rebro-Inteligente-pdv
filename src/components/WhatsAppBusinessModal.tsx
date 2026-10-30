import React from "react";
import { 
  X, 
  MessageCircle, 
  Download, 
  Smartphone, 
  CheckCircle2, 
  Sparkles, 
  Store, 
  Clock, 
  Tag, 
  Share2, 
  ExternalLink,
  Bot,
  Zap,
  Copy
} from "lucide-react";

interface WhatsAppBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  showNotification?: (msg: string, type?: any) => void;
}

export const WhatsAppBusinessModal: React.FC<WhatsAppBusinessModalProps> = ({
  isOpen,
  onClose,
  showNotification,
}) => {
  if (!isOpen) return null;

  const playStoreLink = "https://play.google.com/store/apps/details?id=com.whatsapp.w4b";
  const appStoreLink = "https://apps.apple.com/app/whatsapp-business/id1386432906";

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(playStoreLink);
      if (showNotification) {
        showNotification("Link do WhatsApp Business copiado! 📲", "success");
      }
    } catch {}
  };

  const handleShareToWhatsApp = () => {
    const text = `Dica de Ouro para Empreendedores! 🚀\n\nSe você tem comércio, barbearia, adega ou presta serviços, instale o *WhatsApp Business* (100% Grátis da Meta) para ter catálogo, respostas automáticas com IA e perfil comercial profissional:\n\nAndroid: ${playStoreLink}\n\nConecte com a *Calculadora Cérebro PDV* para enviar recibos e agendamentos automáticos!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto no-scrollbar text-left animate-scaleIn">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-black uppercase text-white tracking-wider">
                  WhatsApp Business
                </span>
                <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  100% Gratuito
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-snug mt-0.5">
                O aplicativo indispensável que todo comerciante e profissional precisa ter no celular
              </p>
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

        {/* Motivos / Benefícios para o Empreendedor */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Por que trocar o WhatsApp comum pelo WhatsApp Business?</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Benefício 1: IA e Respostas Automáticas */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>IA & Respostas 24h</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                A Meta liberou a Inteligência Artificial no WhatsApp Business para responder dúvidas de clientes, saudações e mensagens de ausência quando você estiver ocupado.
              </p>
            </div>

            {/* Benefício 2: Perfil Comercial Oficial */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase">
                <Store className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Perfil da Empresa</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                Passe mais confiança aos clientes exibindo seu logotipo, endereço no Google Maps, dias e horários de funcionamento e catálogo.
              </p>
            </div>

            {/* Benefício 3: Organização por Etiquetas */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Etiquetas de Clientes</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                Separe conversas com cores: <strong className="text-rose-400">Fiado a Cobrar</strong>, <strong className="text-emerald-400">Pago</strong>, <strong className="text-purple-400">Agendado</strong> ou <strong className="text-amber-400">Novo Cliente</strong>.
              </p>
            </div>

            {/* Benefício 4: Atalhos Rápidos */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase">
                <Zap className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Atalhos Rápidos (/pix)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                Basta digitar <code>/pix</code> ou <code>/chave</code> para enviar sua chave Pix instantaneamente sem precisar digitar tudo de novo.
              </p>
            </div>
          </div>
        </div>

        {/* Integração com a Calculadora Cérebro PDV */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-emerald-950/40 border border-emerald-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Como usar junto com a Calculadora Cérebro:</span>
          </div>
          <ul className="text-[11.5px] text-slate-300 space-y-1 font-medium list-disc list-inside leading-relaxed">
            <li>Coloque o link da sua <strong>Agenda Online</strong> na Bio do seu WhatsApp para os clientes marcarem direto.</li>
            <li>Envie <strong>comprovantes térmicos, notinhas e orçamentos</strong> do PDV com apenas 1 toque no WhatsApp do cliente.</li>
            <li>Envie lembretes de <strong>Anti-Falta de 24h e 2h</strong> para clientes de salão e barbearia.</li>
          </ul>
        </div>

        {/* Botões de Download Oficiais */}
        <div className="space-y-2.5 pt-2 border-t border-white/10">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Baixe gratuitamente nas lojas oficiais:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Android / Play Store */}
            <a
              href={playStoreLink}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Baixar para Celular (Play Store) ↗</span>
            </a>

            {/* iPhone / Apple App Store */}
            <a
              href={appStoreLink}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xs uppercase flex items-center justify-center gap-2.5 border border-white/15 transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Baixar para iPhone (App Store) ↗</span>
            </a>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleShareToWhatsApp}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-850 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Indicar WhatsApp Business para um Amigo 📲</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copiar Link de Download"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
