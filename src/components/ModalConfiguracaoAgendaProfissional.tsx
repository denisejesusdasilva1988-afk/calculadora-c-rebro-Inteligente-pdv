/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Configuração Completa da Agenda do Profissional
 * Permite ao proprietário ou ao próprio profissional (Barbeiro, Salão, Manicure, etc.)
 * total autonomia e dependência para configurar:
 * 1. Horário de abertura da agenda (hora início)
 * 2. Horário de fechamento da agenda (hora fim)
 * 3. Dias da semana de atendimento (Terça a Sábado, Segunda a Sexta, etc.)
 * 4. Horário de almoço e pausas
 * 5. Horários reservados e horários indisponíveis personalizados
 */

import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  Calendar as CalendarIcon,
  Coffee,
  Lock,
  Plus,
  Trash2,
  Check,
  Shield,
  Sparkles,
  Scissors,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  ProfissionalBarbearia,
  HorarioBloqueadoProfissional
} from "./BarbeariaSalaoEventosModule";

interface ModalConfiguracaoAgendaProfissionalProps {
  isOpen: boolean;
  onClose: () => void;
  profissional: ProfissionalBarbearia;
  onSave: (profissionalAtualizado: ProfissionalBarbearia) => void;
  showNotification?: (msg: string, type: "success" | "error" | "info") => void;
}

const DIAS_NOMES = [
  { dia: 1, label: "Seg", full: "Segunda-feira" },
  { dia: 2, label: "Ter", full: "Terça-feira" },
  { dia: 3, label: "Qua", full: "Quarta-feira" },
  { dia: 4, label: "Qui", full: "Quinta-feira" },
  { dia: 5, label: "Sex", full: "Sexta-feira" },
  { dia: 6, label: "Sáb", full: "Sábado" },
  { dia: 0, label: "Dom", full: "Domingo" }
];

const OPCOES_HORAS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
  "22:00", "22:30", "23:00"
];

export const ModalConfiguracaoAgendaProfissional: React.FC<ModalConfiguracaoAgendaProfissionalProps> = ({
  isOpen,
  onClose,
  profissional,
  onSave,
  showNotification = (_msg?: string, _type?: "success" | "error" | "info") => {}
}) => {
  // Horário de abertura e fechamento
  const [horaInicio, setHoraInicio] = useState(profissional.horaInicio || "08:00");
  const [horaFim, setHoraFim] = useState(profissional.horaFim || "20:00");

  // Dias de atendimento (array de números: 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sáb)
  const [diasSemana, setDiasSemana] = useState<number[]>(
    profissional.diasSemana && profissional.diasSemana.length > 0
      ? profissional.diasSemana
      : [1, 2, 3, 4, 5, 6] // Padrão Seg a Sáb
  );

  // Intervalo de Almoço
  const [temAlmoco, setTemAlmoco] = useState<boolean>(
    Boolean(profissional.intervaloInicio && profissional.intervaloFim)
  );
  const [intervaloInicio, setIntervaloInicio] = useState(profissional.intervaloInicio || "12:00");
  const [intervaloFim, setIntervaloFim] = useState(profissional.intervaloFim || "13:30");
  const [intervaloMotivo, setIntervaloMotivo] = useState(profissional.intervaloMotivo || "Horário de almoço");

  // Bloqueios personalizados (Horários Reservados / Indisponíveis)
  const [bloqueios, setBloqueios] = useState<HorarioBloqueadoProfissional[]>(
    profissional.bloqueiosPersonalizados || []
  );

  // Duração de Atendimento por Cliente (Total Acesso Livre para o Profissional)
  const [duracaoPadraoMinutos, setDuracaoPadraoMinutos] = useState<number>(
    Number(profissional.duracaoPadraoMinutos) || 40
  );

  // Estado do formulário de novo bloqueio
  const [novoInicio, setNovoInicio] = useState("14:00");
  const [novoFim, setNovoFim] = useState("15:00");
  const [novoMotivo, setNovoMotivo] = useState("Horário Reservado");
  const [novaData, setNovaData] = useState("");
  const [novoTipo, setNovoTipo] = useState<"reservado" | "indisponivel" | "almoco" | "folga">("reservado");

  // Sincronizar estados sempre que o profissional ou abertura da modal mudar
  useEffect(() => {
    if (profissional && isOpen) {
      setHoraInicio(profissional.horaInicio || "08:00");
      setHoraFim(profissional.horaFim || "20:00");
      setDiasSemana(
        profissional.diasSemana && profissional.diasSemana.length > 0
          ? [...profissional.diasSemana]
          : [1, 2, 3, 4, 5, 6]
      );
      setTemAlmoco(Boolean(profissional.intervaloInicio && profissional.intervaloFim));
      setIntervaloInicio(profissional.intervaloInicio || "12:00");
      setIntervaloFim(profissional.intervaloFim || "13:30");
      setIntervaloMotivo(profissional.intervaloMotivo || "Horário de almoço");
      setBloqueios(profissional.bloqueiosPersonalizados ? [...profissional.bloqueiosPersonalizados] : []);
      setDuracaoPadraoMinutos(Number(profissional.duracaoPadraoMinutos) || 40);
    }
  }, [profissional, isOpen]);

  if (!isOpen) return null;

  const toggleDia = (diaNum: number) => {
    setDiasSemana((prev) => {
      if (prev.includes(diaNum)) {
        if (prev.length === 1) {
          showNotification("O profissional precisa atender ao menos 1 dia por semana!", "error");
          return prev;
        }
        return prev.filter((d) => d !== diaNum);
      } else {
        return [...prev, diaNum].sort((a, b) => a - b);
      }
    });
  };

  const setPresetDias = (preset: "ter-sab" | "seg-sab" | "seg-sex" | "todos") => {
    switch (preset) {
      case "ter-sab":
        setDiasSemana([2, 3, 4, 5, 6]);
        break;
      case "seg-sab":
        setDiasSemana([1, 2, 3, 4, 5, 6]);
        break;
      case "seg-sex":
        setDiasSemana([1, 2, 3, 4, 5]);
        break;
      case "todos":
        setDiasSemana([0, 1, 2, 3, 4, 5, 6]);
        break;
    }
  };

  const handleAddBloqueio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoInicio || !novoFim) {
      showNotification("Selecione os horários de início e fim do bloqueio.", "error");
      return;
    }
    if (novoInicio >= novoFim) {
      showNotification("O horário de início deve ser menor que o de término.", "error");
      return;
    }

    const novo: HorarioBloqueadoProfissional = {
      id: "blq_" + Date.now(),
      horarioInicio: novoInicio,
      horarioFim: novoFim,
      motivo: novoMotivo.trim() || "Horário Indisponível",
      data: novaData.trim() || "",
      tipo: novoTipo
    };

    setBloqueios((prev) => [...prev, novo]);
    setNovoMotivo("Horário Reservado");
    setNovaData("");
    showNotification("Bloqueio adicionado à sua agenda! ✅", "success");
  };

  const handleRemoveBloqueio = (id: string) => {
    setBloqueios((prev) => prev.filter((b) => b.id !== id));
    showNotification("Bloqueio removido com sucesso.", "info");
  };

  const handleSalvarTudo = () => {
    if (horaInicio >= horaFim) {
      showNotification("O horário de abertura precisa ser mais cedo que o de fechamento!", "error");
      return;
    }

    const atualizado: ProfissionalBarbearia = {
      ...profissional,
      horaInicio,
      horaFim,
      diasSemana,
      duracaoPadraoMinutos: Number(duracaoPadraoMinutos) || 40,
      intervaloInicio: temAlmoco ? intervaloInicio : "",
      intervaloFim: temAlmoco ? intervaloFim : "",
      intervaloMotivo: temAlmoco ? intervaloMotivo : "",
      bloqueiosPersonalizados: bloqueios
    };

    onSave(atualizado);
    showNotification(`Agenda e tempo de atendimento de ${profissional.nome} salvos! ⏱️📅`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-black text-sm sm:text-base tracking-tight">
                  Configurar Agenda & Horários
                </h3>
                <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  Autonomia Total
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Profissional: <strong className="text-amber-300">{profissional.nome}</strong> ({profissional.especialidade})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-left custom-scrollbar">
          {/* Card Explicativo de Dependência & Autonomia */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 p-3.5 rounded-2xl border border-amber-500/30 text-xs text-slate-300 space-y-1">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Liberdade Total para o Profissional
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Aqui o barbeiro, manicure ou profissional define exatamente seus dias de trabalho, horários de abertura e fechamento, pausas para almoço e horários bloqueados. Tudo o que configurar aqui reflete instantaneamente no portal de agendamento dos clientes!
            </p>
          </div>

          {/* 1. DIAS DA SEMANA QUE O PROFISSIONAL ATENDE */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                <span>Dias da Semana em que Abre a Agenda</span>
              </label>

              {/* Botões Rápidos */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPresetDias("ter-sab")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 touch-manipulation text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Ter-Sáb
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDias("seg-sab")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 touch-manipulation text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Seg-Sáb
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDias("todos")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 touch-manipulation text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Todos
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
              {DIAS_NOMES.map((d) => {
                const ativo = diasSemana.includes(d.dia);
                return (
                  <button
                    key={d.dia}
                    type="button"
                    onClick={() => toggleDia(d.dia)}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border touch-manipulation active:scale-95 select-none ${
                      ativo
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-950/50"
                        : "bg-slate-900/80 text-slate-500 border-white/5 hover:border-white/10 opacity-60"
                    }`}
                    title={d.full}
                  >
                    <span className="text-xs font-black uppercase tracking-tight">{d.label}</span>
                    <span className="text-[9px] font-bold">
                      {ativo ? "Abre ✅" : "Folga ⛔"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400">
              Nos dias marcados como <strong>Folga</strong>, os clientes verão que o profissional não atende nessa data.
            </p>
          </div>

          {/* 2. HORÁRIO DE ABERTURA E FECHAMENTO */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/5 space-y-3">
            <label className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Horário de Funcionamento da Agenda</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400">
                  ⏰ Hora que Abre a Agenda (Primeiro Horário):
                </span>
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-500 font-mono"
                  />
                  <select
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-28 bg-slate-900 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-300 font-bold outline-none focus:border-amber-500"
                  >
                    {OPCOES_HORAS.map((h) => (
                      <option key={`ini_${h}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400">
                  🛑 Hora que Fecha a Agenda (Último Horário):
                </span>
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-500 font-mono"
                  />
                  <select
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="w-28 bg-slate-900 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-300 font-bold outline-none focus:border-amber-500"
                  >
                    {OPCOES_HORAS.map((h) => (
                      <option key={`fim_${h}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Horários antes de <strong>{horaInicio}</strong> e após <strong>{horaFim}</strong> aparecerão como <em>Indisponíveis</em> para agendamento.
            </p>
          </div>

          {/* 3. DURAÇÃO DE ATENDIMENTO POR CLIENTE (ACESSO TOTALMENTE LIVRE) */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Quanto Tempo Para Cada Cliente? (Duração Padrão)</span>
              </label>
              <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                Livre para o Profissional
              </span>
            </div>

            <p className="text-[11px] text-slate-300">
              O profissional tem acesso 100% livre para definir a duração de cada atendimento ou consulta. Selecione um atalho rápido ou digite os minutos exatos:
            </p>

            {/* Presets Rápidos */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { min: 15, label: "15 min" },
                { min: 20, label: "20 min" },
                { min: 30, label: "30 min" },
                { min: 40, label: "40 min" },
                { min: 45, label: "45 min" },
                { min: 50, label: "50 min" },
                { min: 60, label: "1 hora" },
                { min: 75, label: "1h15" },
                { min: 90, label: "1h30" },
                { min: 120, label: "2 horas" }
              ].map((preset) => (
                <button
                  key={preset.min}
                  type="button"
                  onClick={() => setDuracaoPadraoMinutos(preset.min)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border touch-manipulation active:scale-95 ${
                    Number(duracaoPadraoMinutos) === preset.min
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-950/40 ring-2 ring-cyan-400/30"
                      : "bg-slate-900 text-slate-400 border-white/5 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Input Livre de Minutos */}
            <div className="flex items-center gap-3 bg-slate-900/90 p-3 rounded-xl border border-white/10">
              <span className="text-xs font-bold text-slate-300">
                Ou digite a duração exata:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={duracaoPadraoMinutos}
                  onChange={(e) => setDuracaoPadraoMinutos(Math.max(5, Number(e.target.value) || 15))}
                  className="w-24 bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-black outline-none focus:border-cyan-400 text-center"
                />
                <span className="text-xs text-slate-400 font-bold">minutos por cliente</span>
              </div>
            </div>
          </div>

          {/* 4. INTERVALO DE ALMOÇO / PAUSA */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-2">
                <Coffee className="w-4 h-4 text-orange-400" />
                <span>Pausa para Almoço / Refeição</span>
              </label>

              <button
                type="button"
                onClick={() => setTemAlmoco(!temAlmoco)}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer touch-manipulation active:scale-95 ${
                  temAlmoco
                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                    : "bg-slate-800 text-slate-400 border border-white/5"
                }`}
              >
                {temAlmoco ? "Almoço Ativo ✅" : "Sem Pausa Fixa ❌"}
              </button>
            </div>

            {temAlmoco && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-400">Início do Almoço:</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="time"
                      value={intervaloInicio}
                      onChange={(e) => setIntervaloInicio(e.target.value)}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-orange-500 font-mono"
                    />
                    <select
                      value={intervaloInicio}
                      onChange={(e) => setIntervaloInicio(e.target.value)}
                      className="w-28 bg-slate-900 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-300 font-bold outline-none focus:border-orange-500"
                    >
                      {OPCOES_HORAS.map((h) => (
                        <option key={`alm_ini_${h}`} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-400">Fim do Almoço:</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="time"
                      value={intervaloFim}
                      onChange={(e) => setIntervaloFim(e.target.value)}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-orange-500 font-mono"
                    />
                    <select
                      value={intervaloFim}
                      onChange={(e) => setIntervaloFim(e.target.value)}
                      className="w-28 bg-slate-900 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-300 font-bold outline-none focus:border-orange-500"
                    >
                      {OPCOES_HORAS.map((h) => (
                        <option key={`alm_fim_${h}`} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. HORÁRIOS RESERVADOS E HORÁRIOS NÃO DISPONÍVEIS (BLOQUEIOS) */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>Horários Reservados & Bloqueios Específicos</span>
              </label>
              <span className="text-[10px] text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                {bloqueios.length} cadastrados
              </span>
            </div>

            {/* Lista de Bloqueios Existentes */}
            {bloqueios.length > 0 ? (
              <div className="space-y-2">
                {bloqueios.map((b) => (
                  <div
                    key={b.id}
                    className="bg-slate-900 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{b.horarioInicio} às {b.horarioFim}</span>
                          {b.data && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                              Dia: {b.data.split("-").reverse().join("/")}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-purple-300/80">{b.motivo}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBloqueio(b.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Excluir bloqueio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-3 rounded-xl bg-slate-900/40 border border-dashed border-white/5 text-slate-500 text-[11px]">
                Nenhum horário bloqueado adicional. A agenda funcionará normalmente nos horários livres.
              </div>
            )}

            {/* Formulário para Adicionar Novo Bloqueio */}
            <form onSubmit={handleAddBloqueio} className="bg-slate-900/90 p-3.5 rounded-2xl border border-white/10 space-y-3">
              <span className="text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1.5">
                <Plus className="w-3 h-3" /> Bloquear Novo Horário:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Início:</span>
                  <select
                    value={novoInicio}
                    onChange={(e) => setNovoInicio(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                  >
                    {OPCOES_HORAS.map((h) => (
                      <option key={`nv_ini_${h}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Término:</span>
                  <select
                    value={novoFim}
                    onChange={(e) => setNovoFim(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                  >
                    {OPCOES_HORAS.map((h) => (
                      <option key={`nv_fim_${h}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Data Específica (Opcional):</span>
                  <input
                    type="date"
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={novoMotivo}
                  onChange={(e) => setNovoMotivo(e.target.value)}
                  placeholder="Motivo (Ex: Consulta Médica, Horário Reservado VIP, Curso)"
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bloquear</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/90 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvarTudo}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvar Configuração da Agenda</span>
          </button>
        </div>
      </div>
    </div>
  );
};
