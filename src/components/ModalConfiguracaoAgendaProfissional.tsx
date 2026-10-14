/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal Completo de Configuração da Agenda do Profissional
 * Dá autonomia total para o Barbeiro, Manicure, Salão, Proprietário, etc. configurarem:
 * 1. Dias de atendimento na semana em que vai abrir a agenda (Seg, Ter, Qua, Qui, Sex, Sáb, Dom)
 * 2. Horário de abertura e fechamento da agenda (Ex: 08:00 às 19:30)
 * 3. Horário de almoço e pausas fixas (Ex: 12:00 às 13:30)
 * 4. Horários reservados e horários não disponíveis (bloqueios personalizados pontuais ou recorrentes)
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Clock,
  Calendar,
  Save,
  Check,
  Coffee,
  Plus,
  Trash2,
  Lock,
  User,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { ProfissionalBarbearia, HorarioBloqueadoProfissional } from "./BarbeariaSalaoEventosModule";

interface ModalConfiguracaoAgendaProfissionalProps {
  isOpen: boolean;
  onClose: () => void;
  profissional: ProfissionalBarbearia;
  onSaveProfissional: (profAtualizado: ProfissionalBarbearia) => void;
  showNotification?: (msg: string, type?: "success" | "error" | "info") => void;
}

// Dias da semana: 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
const DIAS_SEMANA_NOMES = [
  { id: 1, label: "Seg", full: "Segunda-feira" },
  { id: 2, label: "Ter", full: "Terça-feira" },
  { id: 3, label: "Qua", full: "Quarta-feira" },
  { id: 4, label: "Qui", full: "Quinta-feira" },
  { id: 5, label: "Sex", full: "Sexta-feira" },
  { id: 6, label: "Sáb", full: "Sábado" },
  { id: 0, label: "Dom", full: "Domingo" }
];

export const ModalConfiguracaoAgendaProfissional: React.FC<ModalConfiguracaoAgendaProfissionalProps> = ({
  isOpen,
  onClose,
  profissional,
  onSaveProfissional,
  showNotification = () => {}
}) => {
  if (!isOpen) return null;

  // Dias de atendimento (padrão Seg a Sáb: [1, 2, 3, 4, 5, 6])
  const [diasSemana, setDiasSemana] = useState<number[]>(
    profissional.diasSemana && profissional.diasSemana.length > 0
      ? profissional.diasSemana
      : [1, 2, 3, 4, 5, 6]
  );

  // Horários de Abertura e Fechamento
  const [horaInicio, setHoraInicio] = useState(profissional.horaInicio || "08:00");
  const [horaFim, setHoraFim] = useState(profissional.horaFim || "20:00");

  // Almoço / Intervalo fixo
  const [temAlmoco, setTemAlmoco] = useState(!!profissional.intervaloInicio || true);
  const [intervaloInicio, setIntervaloInicio] = useState(profissional.intervaloInicio || "12:00");
  const [intervaloFim, setIntervaloFim] = useState(profissional.intervaloFim || "13:30");
  const [intervaloMotivo, setIntervaloMotivo] = useState(profissional.intervaloMotivo || "Horário de Almoço");

  // Bloqueios personalizados (Horários Reservados e Indisponíveis)
  const [bloqueios, setBloqueios] = useState<HorarioBloqueadoProfissional[]>(
    profissional.bloqueiosPersonalizados || []
  );

  // Form para adicionar novo bloqueio
  const [novoBloqueioData, setNovoBloqueioData] = useState("");
  const [novoBloqueioInicio, setNovoBloqueioInicio] = useState("14:00");
  const [novoBloqueioFim, setNovoBloqueioFim] = useState("15:00");
  const [novoBloqueioMotivo, setNovoBloqueioMotivo] = useState("Horário Reservado Particular");
  const [novoBloqueioTipo, setNovoBloqueioTipo] = useState<"reservado" | "indisponivel" | "folga">("reservado");

  // Alternar dia de atendimento
  const toggleDia = (diaId: number) => {
    setDiasSemana((prev) => {
      if (prev.includes(diaId)) {
        if (prev.length === 1) {
          showNotification("Atenção: A agenda precisa ter ao menos 1 dia de atendimento ativo!", "info");
          return prev;
        }
        return prev.filter((d) => d !== diaId);
      } else {
        return [...prev, diaId].sort();
      }
    });
  };

  // Presets rápidos de dias
  const setPresetDias = (preset: "seg-sab" | "seg-sex" | "ter-dom" | "todos") => {
    if (preset === "seg-sab") setDiasSemana([1, 2, 3, 4, 5, 6]);
    if (preset === "seg-sex") setDiasSemana([1, 2, 3, 4, 5]);
    if (preset === "ter-dom") setDiasSemana([2, 3, 4, 5, 6, 0]);
    if (preset === "todos") setDiasSemana([0, 1, 2, 3, 4, 5, 6]);
  };

  // Adicionar Bloqueio / Horário Reservado
  const handleAddBloqueio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoBloqueioInicio || !novoBloqueioFim) {
      showNotification("Informe o horário de início e fim do bloqueio.", "error");
      return;
    }

    if (novoBloqueioInicio >= novoBloqueioFim) {
      showNotification("O horário de início deve ser menor que o horário de término.", "error");
      return;
    }

    const novoItem: HorarioBloqueadoProfissional = {
      id: "blq_" + Date.now(),
      data: novoBloqueioData || undefined,
      horarioInicio: novoBloqueioInicio,
      horarioFim: novoBloqueioFim,
      motivo: novoBloqueioMotivo.trim() || "Horário Não Disponível",
      tipo: novoBloqueioTipo
    };

    setBloqueios((prev) => [...prev, novoItem]);
    showNotification("Horário reservado / bloqueado adicionado! 🔒", "success");
    setNovoBloqueioMotivo("Horário Reservado Particular");
  };

  const handleRemoveBloqueio = (id: string) => {
    setBloqueios((prev) => prev.filter((b) => b.id !== id));
    showNotification("Bloqueio de horário removido.", "info");
  };

  // Salvar tudo
  const handleSave = () => {
    const profAtualizado: ProfissionalBarbearia = {
      ...profissional,
      diasSemana,
      horaInicio,
      horaFim,
      intervaloInicio: temAlmoco ? intervaloInicio : undefined,
      intervaloFim: temAlmoco ? intervaloFim : undefined,
      intervaloMotivo: temAlmoco ? intervaloMotivo : undefined,
      bloqueiosPersonalizados: bloqueios
    };

    onSaveProfissional(profAtualizado);
    showNotification(`Agenda de ${profissional.nome} configurada e atualizada com sucesso! 💈📅✅`, "success");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10030] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-slate-900 border border-white/10 text-white w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header com foto do profissional */}
          <div className="p-4 sm:p-6 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={profissional.fotoUrl}
                alt={profissional.nome}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/50 shadow-md shrink-0"
              />
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Configurar Agenda de {profissional.nome}
                  </h3>
                  <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    {profissional.especialidade}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Controle total dos seus horários, abertura, dias de atendimento e pausas!
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-left">
            {/* SEÇÃO 1: DIAS EM QUE VAI ABRIR A AGENDA */}
            <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-[10.5px] font-extrabold uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>1. Dias em que a Agenda vai Abrir (Atendimento)</span>
                </label>
                <div className="flex items-center gap-1 text-[9px]">
                  <button
                    type="button"
                    onClick={() => setPresetDias("seg-sab")}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                  >
                    Seg a Sáb
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDias("seg-sex")}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                  >
                    Seg a Sex
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDias("ter-dom")}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                  >
                    Ter a Dom
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDias("todos")}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                  >
                    Todos
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Toque nos dias da semana abaixo para marcar onde você atende ou folga:
              </p>

              {/* Botões dos 7 dias da semana */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {DIAS_SEMANA_NOMES.map((d) => {
                  const isAtivo = diasSemana.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDia(d.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        isAtivo
                          ? "bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-500/10 font-black"
                          : "bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300 opacity-60"
                      }`}
                      title={`${d.full}: ${isAtivo ? "Atende (Aberto)" : "Folga (Fechado)"}`}
                    >
                      <span className="text-xs font-black">{d.label}</span>
                      <span className={`text-[8.5px] font-bold uppercase ${isAtivo ? "text-emerald-400" : "text-slate-600"}`}>
                        {isAtivo ? "Abre ✅" : "Folga"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO 2: HORÁRIO DE ABERTURA E FECHAMENTO */}
            <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-white/5 space-y-3">
              <label className="text-[10.5px] font-extrabold uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>2. Horário de Expediente (Abertura e Fechamento)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Horário que vai abrir a agenda (Início):
                  </span>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-indigo-500"
                  />
                  <span className="text-[9px] text-slate-500 block">
                    Clientes só poderão agendar a partir deste horário.
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Horário de encerramento (Fechamento):
                  </span>
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-indigo-500"
                  />
                  <span className="text-[9px] text-slate-500 block">
                    Último horário de atendimento do dia.
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: HORÁRIO DE ALMOÇO / INTERVALO FIXO */}
            <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10.5px] font-extrabold uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span>3. Horário de Almoço / Pausa Fixa</span>
                </label>
                <button
                  type="button"
                  onClick={() => setTemAlmoco(!temAlmoco)}
                  className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    temAlmoco
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-slate-800 text-slate-500 border border-white/5"
                  }`}
                >
                  {temAlmoco ? "Ativado ✅" : "Sem Pausa ❌"}
                </button>
              </div>

              {temAlmoco && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Início do Almoço / Pausa:
                    </span>
                    <input
                      type="time"
                      value={intervaloInicio}
                      onChange={(e) => setIntervaloInicio(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Retorno do Almoço:
                    </span>
                    <input
                      type="time"
                      value={intervaloFim}
                      onChange={(e) => setIntervaloFim(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 4: HORÁRIOS RESERVADOS E HORÁRIOS NÃO DISPONÍVEIS */}
            <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-white/5 space-y-4">
              <div>
                <label className="text-[10.5px] font-extrabold uppercase text-purple-300 tracking-wider flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span>4. Horários Reservados & Horários Não Disponíveis</span>
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  Bloqueie horários específicos para clientes particulares, compromissos médicos, reuniões ou manutenção.
                </p>
              </div>

              {/* Lista dos bloqueios já cadastrados */}
              {bloqueios.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[9.5px] font-black uppercase text-slate-400 block">
                    Horários Bloqueados Atualmente ({bloqueios.length}):
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {bloqueios.map((b) => (
                      <div
                        key={b.id}
                        className="bg-slate-900 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-400" />
                          <span className="font-mono font-bold text-purple-300">
                            {b.horarioInicio} às {b.horarioFim}
                          </span>
                          <span className="text-white font-bold truncate">
                            {b.motivo}
                          </span>
                          {b.data ? (
                            <span className="text-[9.5px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                              {b.data.split("-").reverse().join("/")}
                            </span>
                          ) : (
                            <span className="text-[9.5px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded">
                              Recorrente
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveBloqueio(b.id)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Remover Bloqueio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/60 p-3 rounded-xl border border-dashed border-white/10 text-center text-xs text-slate-500">
                  Nenhum horário reservado ou bloqueado no momento.
                </div>
              )}

              {/* Formulário para Adicionar Novo Bloqueio */}
              <form onSubmit={handleAddBloqueio} className="bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 space-y-3">
                <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Novo Horário Reservado / Indisponível</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">
                      Data (Opcional):
                    </span>
                    <input
                      type="date"
                      value={novoBloqueioData}
                      onChange={(e) => setNovoBloqueioData(e.target.value)}
                      placeholder="Todos os dias"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">
                      Horário Início:
                    </span>
                    <input
                      type="time"
                      required
                      value={novoBloqueioInicio}
                      onChange={(e) => setNovoBloqueioInicio(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">
                      Horário Fim:
                    </span>
                    <input
                      type="time"
                      required
                      value={novoBloqueioFim}
                      onChange={(e) => setNovoBloqueioFim(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    required
                    value={novoBloqueioMotivo}
                    onChange={(e) => setNovoBloqueioMotivo(e.target.value)}
                    placeholder="Motivo (Ex: Horário Reservado, Consulta Médica, Folga)"
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-purple-600/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Bloquear Horário</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer com Salvar */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Minha Agenda 💾</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
