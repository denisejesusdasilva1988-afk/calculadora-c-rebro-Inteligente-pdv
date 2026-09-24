import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Lock,
  EyeOff,
  UserCheck,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Info,
  Check
} from "lucide-react";

interface InteractiveTutorialProps {
  onClose: () => void;
  isOpen: boolean;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  onClose,
  isOpen
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [testNoteText, setTestNoteText] = useState("");
  const [isNoteSaved, setIsNoteSaved] = useState(false);
  const [isPrivateToggle, setIsPrivateToggle] = useState(true);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Seus Dados São Privados 🔒",
      icon: <Shield className="w-10 h-10 text-emerald-400" />,
      badge: "Isolamento de Contas",
      description:
        "Este aplicativo foi moldado para garantir segurança e sigilo absoluto. Cada conta possui um espaço totalmente isolado e seguro. Outras pessoas usando o sistema não conseguem ver suas contas, preços ou anotações sob nenhuma circunstância!",
      renderInteractive: () => (
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Demonstração de Sigilo
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isPrivateToggle
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {isPrivateToggle ? "Privacidade Ativa" : "Dados Expostos"}
            </span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-850">
            <div
              className={`p-2 rounded-lg transition-colors ${
                isPrivateToggle ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              }`}
            >
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-black text-white">Suas Calculadoras & Notas</p>
              <p className="text-[10px] text-slate-405 text-slate-400">
                {isPrivateToggle
                  ? "Sincronizados e exclusivos para a sua conta."
                  : "Qualquer um poderia ler. (Não recomendado!)"}
              </p>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 italic text-left">
            *Nós utilizamos chaves de criptografia e regras de segurança (Firebase Rules) que impedem que qualquer outro usuário consulte suas informações.
          </p>
        </div>
      )
    },
    {
      title: "Cadastro e Dados Pessoais 👤",
      icon: <UserCheck className="w-10 h-10 text-purple-400" />,
      badge: "Perfil Seguro",
      description:
        "No painel 'Login', você pode cadastrar seu endereço de e-mail e definir uma senha de segurança mínima de 6 caracteres. Seus dados começam locais e, assim que você cria seu acesso, eles são transferidos e salvos na sua própria conta particular do Firebase.",
      renderInteractive: () => (
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 text-left">
          <div className="space-y-2">
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 flex gap-3 text-xs text-purple-200">
              <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold uppercase text-[9px] tracking-widest text-purple-400">
                  Como funciona?
                </p>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px] font-medium text-slate-300">
                  <li>O cadastro é o seu escudo particular no sistema.</li>
                  <li>Invalida acessos de terceiros às suas informações.</li>
                  <li>Caso não faça cadastro, os dados residem só no seu celular.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Isolamento por UID Único
              </span>
            </div>
            <span className="text-[9px] font-mono text-purple-400 bg-purple-950/35 px-2 py-0.5 rounded-md">
              uid: user_secure_id
            </span>
          </div>
        </div>
      )
    },
    {
      title: "Bloco de Notas Inteligente 📝",
      icon: <FileText className="w-10 h-10 text-amber-400" />,
      badge: "Anotações Seguras",
      description:
        "O Bloco de Notas Inteligente permite anotações livres, como listas extras ou metas financeiras. É salvo de forma automática apenas no seu cadastro pessoal. Você pode testar digitando algo abaixo e pressionando 'Verificar Salvamento' para ver a simulação de privacidade instantânea.",
      renderInteractive: () => (
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
          <textarea
            value={testNoteText}
            onChange={(e) => {
              setTestNoteText(e.target.value);
              setIsNoteSaved(false);
            }}
            placeholder="Digite algo confidencial para testar..."
            className="w-full h-16 bg-slate-900 text-xs text-slate-200 p-3 rounded-xl border border-slate-800 focus:border-amber-500 focus:outline-none placeholder:text-slate-650"
          />
          <div className="flex justify-between items-center gap-2">
            <button
              onClick={() => {
                if (testNoteText.trim()) {
                  setIsNoteSaved(true);
                }
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-black text-[9px] uppercase tracking-widest px-3 py-2 rounded-lg transition-all"
            >
              Verificar Salvamento
            </button>
            <AnimatePresence>
              {isNoteSaved && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[9px] font-black uppercase text-emerald-400 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Salvo Isoladamente!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      )
    },
    {
      title: "Confidencialidade Garantida 🛡️",
      icon: <CheckCircle2 className="w-10 h-10 text-cyan-400" />,
      badge: "Selo de Confiança",
      description:
        "Nosso sistema utiliza regras de segurança exclusivas do banco de dados (rules). Ninguém — exceto quem souber seu e-mail e senha cadastrados — pode visualizar o que você digita na calculadora, as contas cadastradas ou suas anotações.",
      renderInteractive: () => (
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-start gap-3 text-left">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                Tecnologia Cloud Isolação
              </h5>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Cada salvamento verifica se o proprietário da nota corresponde ao seu login exclusivo. Seus dados estão completamente protegidos do olhar de terceiros.
              </p>
            </div>
          </div>
          <div className="h-0.5 bg-slate-900 border-none" />
          <div className="bg-slate-900 p-4 rounded-xl text-center space-y-1">
            <p className="text-[11px] text-slate-300 font-bold">
              Seu painel é exclusivo, limpo e seguro.
            </p>
            <p className="text-[9px] text-slate-500">
              Pronto para economizar com total privacidade!
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem("tutorial_completed_v1", "true");
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-purple-600/10 via-indigo-650/10 to-cyan-500/10 p-6 pb-2 border-b border-slate-850 flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Manual de Segurança & Uso
            </span>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("tutorial_completed_v1", "true");
              onClose();
            }}
            className="p-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic content scrollable */}
        <div className="p-8 pb-4 overflow-y-auto flex-1 space-y-6">
          {/* Top section step tracker */}
          <div className="flex items-center gap-1.5 justify-center pb-2">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? "w-8 bg-purple-500"
                    : idx < currentStep
                    ? "w-3 bg-purple-700/45"
                    : "w-3 bg-slate-800"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 text-center"
            >
              {/* Big step icon */}
              <div className="w-20 h-20 bg-slate-950 rounded-[2rem] flex items-center justify-center mx-auto border border-slate-850">
                {steps[currentStep].icon}
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black text-purple-400 bg-purple-950/40 border border-purple-500/15 px-3 py-1 rounded-full uppercase tracking-widest inline-block">
                  {steps[currentStep].badge}
                </span>
                <h3 className="text-xl font-black italic uppercase text-white tracking-wide">
                  {steps[currentStep].title}
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-semibold max-w-sm mx-auto">
                {steps[currentStep].description}
              </p>

              {/* Step Custom Interactive Demo Component */}
              <div className="mt-4">{steps[currentStep].renderInteractive()}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-slate-950 border-t border-slate-850 flex gap-4 items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              currentStep === 0
                ? "text-slate-700 pointer-events-none"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
            Passo {currentStep + 1} de {steps.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02] text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-md shadow-purple-600/15"
          >
            {currentStep === steps.length - 1 ? "Compreendido" : "Próximo"}{" "}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
