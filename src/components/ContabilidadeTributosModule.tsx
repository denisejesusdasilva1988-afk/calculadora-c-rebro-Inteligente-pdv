import React, { useState, useMemo } from "react";
import {
  Calculator,
  Landmark,
  FileText,
  DollarSign,
  Users,
  Percent,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Clock,
  Wine,
  Wrench,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Briefcase,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight
} from "lucide-react";

interface ContabilidadeTributosProps {
  onBack?: () => void;
  formatCurrency?: (val: number) => string;
  monthlyRevenueDefault?: number;
  showNotification?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export function ContabilidadeTributosModule({
  onBack,
  formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`,
  monthlyRevenueDefault = 0,
  showNotification = () => {}
}: ContabilidadeTributosProps) {
  // Sub-abas do módulo
  const [activeTab, setActiveTab] = useState<"tributos" | "funcionarios" | "tempo_dinheiro" | "bar_doses" | "livro_caixa">("tributos");

  // ==========================================
  // ESTADO 1: TRIBUTOS FEDERAIS & SIMPLES NACIONAL / MEI
  // ==========================================
  const [regime, setRegime] = useState<"mei" | "simples_comercio" | "simples_servicos">("simples_comercio");
  const [faturamentoMes, setFaturamentoMes] = useState<number>(monthlyRevenueDefault > 0 ? monthlyRevenueDefault : 18500);
  const [faturamento12Meses, setFaturamento12Meses] = useState<number>(18500 * 12);
  const [ramoMei, setRamoMei] = useState<"comercio" | "servicos" | "ambos">("comercio");
  const [temSubstituicaoTributaria, setTemSubstituicaoTributaria] = useState<boolean>(true); // Ex: bebidas, cigarros

  // Cálculos Tributários
  const tributosCalc = useMemo(() => {
    if (regime === "mei") {
      // MEI 2024/2026: 5% do Salário Mínimo (R$ 1.412 = R$ 70,60 INSS) + R$ 1 ICMS + R$ 5 ISS
      const inss = 70.60;
      const icms = ramoMei === "comercio" || ramoMei === "ambos" ? 1.00 : 0;
      const iss = ramoMei === "servicos" || ramoMei === "ambos" ? 5.00 : 0;
      const totalDas = inss + icms + iss;
      const limiteMensalMei = 81000 / 12; // R$ 6.750/mês
      const estrapolou = faturamentoMes > limiteMensalMei;
      const excesso = Math.max(0, faturamentoMes - limiteMensalMei);

      return {
        impostoNome: "DAS MEI (Documento de Arrecadação do Simples)",
        aliquotaEfetiva: (totalDas / (faturamentoMes || 1)) * 100,
        impostoTotal: totalDas,
        detalhe: [
          { nome: "INSS Previdência (5% S.M.)", valor: inss },
          { nome: "ICMS Estadual (Comércio)", valor: icms },
          { nome: "ISS Municipal (Serviços)", valor: iss }
        ],
        limiteAnual: 81000,
        limiteMensal: limiteMensalMei,
        estrapolou,
        excesso,
        alerta: estrapolou 
          ? `Atenção: Seu faturamento mensal (${formatCurrency(faturamentoMes)}) ultrapassou o teto médio do MEI de ${formatCurrency(limiteMensalMei)}/mês! Prepare a migração para ME no Simples Nacional.` 
          : "Faturamento 100% enquadrado no limite do MEI."
      };
    }

    if (regime === "simples_comercio") {
      // Tabela Anexo I - Comércio (Lei Complementar 123/2006)
      // Faixa 1: Até 180.000 -> 4,00%
      // Faixa 2: 180.000,01 a 360.000 -> 7,30% (dedução R$ 5.940)
      // Faixa 3: 360.000,01 a 720.000 -> 9,50% (dedução R$ 13.860)
      let aliquotaNominal = 0.04;
      let parcelaDeduzir = 0;
      const rbt12 = faturamento12Meses || (faturamentoMes * 12);

      if (rbt12 <= 180000) {
        aliquotaNominal = 0.04;
        parcelaDeduzir = 0;
      } else if (rbt12 <= 360000) {
        aliquotaNominal = 0.073;
        parcelaDeduzir = 5940;
      } else if (rbt12 <= 720000) {
        aliquotaNominal = 0.095;
        parcelaDeduzir = 13860;
      } else {
        aliquotaNominal = 0.107;
        parcelaDeduzir = 22500;
      }

      // Fórmula oficial da alíquota efetiva: ((RBT12 * Aliq) - Parcela) / RBT12
      let aliqEfetiva = ((rbt12 * aliquotaNominal) - parcelaDeduzir) / rbt12;
      
      // Redução por Substituição Tributária (ST) de ICMS em Bebidas/Autopeças (cerca de 33% da alíquota do Simples é ICMS)
      let descontoST = 0;
      if (temSubstituicaoTributaria) {
        descontoST = aliqEfetiva * 0.335; // Abate a parcela de ICMS cobrada antecipadamente na fábrica
      }
      const aliqFinal = Math.max(0.02, aliqEfetiva - descontoST);
      const valorDas = faturamentoMes * aliqFinal;

      return {
        impostoNome: "DAS Simples Nacional (Anexo I - Comércio / Bar / Mercearia)",
        aliquotaEfetiva: aliqFinal * 100,
        aliquotaNominal: aliquotaNominal * 100,
        impostoTotal: valorDas,
        economiaST: faturamentoMes * descontoST,
        detalhe: [
          { nome: "CPP (Previdência Patronal)", valor: valorDas * 0.415 },
          { nome: "ICMS (Comércio Estadual)", valor: temSubstituicaoTributaria ? 0 : valorDas * 0.34 },
          { nome: "PIS / COFINS (Federal)", valor: valorDas * 0.15 },
          { nome: "CSLL / IRPJ (Lucro)", valor: valorDas * 0.095 }
        ],
        limiteAnual: 4800000,
        limiteMensal: 400000,
        estrapolou: false,
        excesso: 0,
        alerta: temSubstituicaoTributaria 
          ? "Economia ativada: Bebidas e cigarros já tiveram ICMS pago na fábrica (ST). Você não deve pagar ICMS duplicado no Simples!"
          : "Dica: Em bares e depósitos, ative a segregação de ICMS ST de bebidas para não pagar imposto repetido."
      };
    }

    // regime === "simples_servicos" (Oficina mecânica, Pintura, Pedreiro, etc.)
    // Anexo III - Serviços
    let aliquotaNominal = 0.06;
    let parcelaDeduzir = 0;
    const rbt12 = faturamento12Meses || (faturamentoMes * 12);

    if (rbt12 <= 180000) {
      aliquotaNominal = 0.06;
      parcelaDeduzir = 0;
    } else if (rbt12 <= 360000) {
      aliquotaNominal = 0.112;
      parcelaDeduzir = 9360;
    } else {
      aliquotaNominal = 0.135;
      parcelaDeduzir = 17640;
    }

    const aliqEfetiva = ((rbt12 * aliquotaNominal) - parcelaDeduzir) / rbt12;
    const valorDas = faturamentoMes * aliqEfetiva;

    return {
      impostoNome: "DAS Simples Nacional (Anexo III - Prestadores de Serviços e Oficinas)",
      aliquotaEfetiva: aliqEfetiva * 100,
      aliquotaNominal: aliquotaNominal * 100,
      impostoTotal: valorDas,
      economiaST: 0,
      detalhe: [
        { nome: "ISS (Prefeitura Municipal)", valor: valorDas * 0.32 },
        { nome: "CPP (Previdência Patronal)", valor: valorDas * 0.43 },
        { nome: "PIS / COFINS / CSLL / IRPJ", valor: valorDas * 0.25 }
      ],
      limiteAnual: 4800000,
      limiteMensal: 400000,
      estrapolou: false,
      excesso: 0,
      alerta: "Serviços de mecânica e obras pagam ISS no município e CPP no Simples. Mão de obra pura não paga ICMS estadual."
    };
  }, [regime, faturamentoMes, faturamento12Meses, ramoMei, temSubstituicaoTributaria]);

  // ==========================================
  // ESTADO 2: FOLHA DE PAGAMENTO, DIÁRIAS & RESCISÃO
  // ==========================================
  const [tipoContrato, setTipoContrato] = useState<"clt" | "diarista" | "freelancer">("clt");
  const [salarioBase, setSalarioBase] = useState<number>(1518.00); // Salário Mínimo Nacional
  const [diasTrabalhados, setDiasTrabalhados] = useState<number>(26);
  const [horasExtras50, setHorasExtras50] = useState<number>(4);
  const [horasExtras100, setHorasExtras100] = useState<number>(8); // Domingos e feriados
  const [adicionalNoturnoHoras, setAdicionalNoturnoHoras] = useState<number>(0);
  const [diasFalta, setDiasFalta] = useState<number>(0);
  const [valeTransporte, setValeTransporte] = useState<boolean>(true);
  const [nomeFuncionario, setNomeFuncionario] = useState<string>("Carlos Eduardo (Balcão/Mecânico)");
  const [cargoFuncionario, setCargoFuncionario] = useState<string>("Auxiliar de Operações");

  // Rescisão
  const [mesesTrabalhados, setMesesTrabalhados] = useState<number>(14);
  const [motivoRescisao, setMotivoRescisao] = useState<"sem_justa_causa" | "pedido_demissao">("sem_justa_causa");
  const [avisoPrevio, setAvisoPrevio] = useState<"indenizado" | "trabalhado">("indenizado");

  const folhaCalc = useMemo(() => {
    if (tipoContrato === "diarista" || tipoContrato === "freelancer") {
      const valorDiaria = salarioBase;
      const totalDiarias = valorDiaria * diasTrabalhados;
      const extraDomingo = horasExtras100 * (valorDiaria / 8 * 1.5);
      const totalPagar = totalDiarias + extraDomingo;
      return {
        bruto: totalPagar,
        descontos: 0,
        liquido: totalPagar,
        diariaMedia: valorDiaria,
        horaMedia: valorDiaria / 8,
        detalhes: [
          { nome: `${diasTrabalhados} diárias de ${formatCurrency(valorDiaria)}`, valor: totalDiarias },
          { nome: "Adicional de horas / domingos combinados", valor: extraDomingo }
        ]
      };
    }

    // CLT (Cálculo Oficial)
    const valorHora = salarioBase / 220;
    const valorDiaria = salarioBase / 30;
    const valorExtra50 = horasExtras50 * (valorHora * 1.5);
    const valorExtra100 = horasExtras100 * (valorHora * 2.0); // 100% no domingo
    const valorNoturno = adicionalNoturnoHoras * (valorHora * 0.2); // +20%
    const dsrSobreExtras = ((valorExtra50 + valorExtra100) / 25) * 5; // DSR aproximado

    const bruto = salarioBase + valorExtra50 + valorExtra100 + valorNoturno + dsrSobreExtras;

    // Desconto INSS 2024/2026 progressivo (faixa 1: 7,5% até R$ 1.412)
    let inss = bruto * 0.075;
    if (bruto > 1412) {
      inss = 1412 * 0.075 + (bruto - 1412) * 0.09;
    }
    // Vale transporte limitado a 6% do salário base
    const descontoVT = valeTransporte ? salarioBase * 0.06 : 0;
    const descontoFaltas = diasFalta * valorDiaria;
    const totalDescontos = inss + descontoVT + descontoFaltas;
    const liquido = Math.max(0, bruto - totalDescontos);

    // FGTS patronal (8%)
    const fgts = bruto * 0.08;

    // Custo real da empresa (com 13º e férias proporcionais = aprox + 30%)
    const custoEmpresaTotal = bruto + fgts + (bruto * 0.0833) + (bruto * 0.1111);

    return {
      bruto,
      inss,
      descontoVT,
      descontoFaltas,
      descontos: totalDescontos,
      liquido,
      fgts,
      custoEmpresaTotal,
      valorHora,
      valorDiaria,
      detalhes: [
        { nome: "Salário Base Mensal", valor: salarioBase },
        { nome: `Horas Extras 50% (${horasExtras50}h)`, valor: valorExtra50 },
        { nome: `Horas Extras 100% Domingo (${horasExtras100}h)`, valor: valorExtra100 },
        { nome: "DSR sobre Horas Extras", valor: dsrSobreExtras },
        { nome: "Adicional Noturno (20%)", valor: valorNoturno }
      ]
    };
  }, [tipoContrato, salarioBase, diasTrabalhados, horasExtras50, horasExtras100, adicionalNoturnoHoras, diasFalta, valeTransporte]);

  // Cálculo da Rescisão
  const rescisaoCalc = useMemo(() => {
    const valorDia = salarioBase / 30;
    const diasSaldoSalario = 15; // meio mês como exemplo
    const saldoSalario = valorDia * diasSaldoSalario;
    
    // 13º proporcional
    const mesesAno = mesesTrabalhados % 12 || 12;
    const decimoTerceiro = (salarioBase / 12) * mesesAno;

    // Férias proporcionais + 1/3
    const feriasProp = (salarioBase / 12) * mesesAno;
    const tercoFerias = feriasProp / 3;

    // Aviso Prévio (30 dias + 3 dias por ano)
    const anosCompletos = Math.floor(mesesTrabalhados / 12);
    const diasAviso = Math.min(90, 30 + (anosCompletos * 3));
    const valorAvisoPrevio = avisoPrevio === "indenizado" && motivoRescisao === "sem_justa_causa"
      ? (salarioBase / 30) * diasAviso 
      : 0;

    // Multa 40% FGTS
    const saldoFgtEstimado = (salarioBase * 0.08) * mesesTrabalhados;
    const multaFgts = motivoRescisao === "sem_justa_causa" ? saldoFgtEstimado * 0.40 : 0;

    const totalRescisao = saldoSalario + decimoTerceiro + feriasProp + tercoFerias + valorAvisoPrevio;

    return {
      diasAviso,
      saldoSalario,
      decimoTerceiro,
      feriasComTerco: feriasProp + tercoFerias,
      valorAvisoPrevio,
      multaFgts,
      totalPagarAoFuncionario: totalRescisao,
      custoTotalComMultaFgts: totalRescisao + multaFgts
    };
  }, [salarioBase, mesesTrabalhados, motivoRescisao, avisoPrevio]);

  // ==========================================
  // ESTADO 3: OFICINA, MECÂNICO, PEDREIRO ("TEMPO É DINHEIRO")
  // ==========================================
  const [servicoNome, setServicoNome] = useState<string>("Troca de Embreagem de Moto / Cabeçote");
  const [valorCobrado, setValorCobrado] = useState<number>(200);
  const [diasGastos, setDiasGastos] = useState<number>(3);
  const [numAjudantes, setNumAjudantes] = useState<number>(2);
  const [diariaAjudante, setDiariaAjudante] = useState<number>(80);
  const [gastoMarmitaDia, setGastoMarmitaDia] = useState<number>(25);
  const [custoFixoDiaOficina, setCustoFixoDiaOficina] = useState<number>(45); // Luz, ferramentas, aluguel
  const [lucroDesejadoMestre, setLucroDesejadoMestre] = useState<number>(150); // O que o dono quer tirar por dia limpo

  const tempoDinheiroCalc = useMemo(() => {
    const custoAjudantes = diasGastos * (numAjudantes * diariaAjudante);
    const custoAlimentacao = diasGastos * (gastoMarmitaDia * (numAjudantes + 1));
    const custoFixoTotal = diasGastos * custoFixoDiaOficina;
    const custoTotalReal = custoAjudantes + custoAlimentacao + custoFixoTotal;
    
    // Lucro que realmente sobrou
    const lucroReal = valorCobrado - custoTotalReal;
    const margemRealPct = (lucroReal / (valorCobrado || 1)) * 100;

    // Quanto ele DEVERIA ter cobrado para sobrar o lucro que ele merece
    const precoJustoMinimo = custoTotalReal + (lucroDesejadoMestre * diasGastos);

    return {
      custoAjudantes,
      custoAlimentacao,
      custoFixoTotal,
      custoTotalReal,
      lucroReal,
      margemRealPct,
      tevePrejuizo: lucroReal < 0,
      precoJustoMinimo,
      diariaRealQueSobrouParaDono: lucroReal / diasGastos
    };
  }, [valorCobrado, diasGastos, numAjudantes, diariaAjudante, gastoMarmitaDia, custoFixoDiaOficina, lucroDesejadoMestre]);

  // ==========================================
  // ESTADO 4: BAR, DESTILADOS (51, DREHER) & BALDE DE CERVEJA
  // ==========================================
  const [bebidaNome, setBebidaNome] = useState<string>("Cachaça 51 / Dreher (1000ml)");
  const [precoGarrafa, setPrecoGarrafa] = useState<number>(16.50);
  const [precoDoseVenda, setPrecoDoseVenda] = useState<number>(3.50);
  const [mlGarrafa, setMlGarrafa] = useState<number>(1000);
  const [mlDose, setMlDose] = useState<number>(55); // 50ml + chorinho de 5ml
  // Teste da garrafa real
  const [dosesServidasContador, setDosesServidasContador] = useState<number>(16);

  // Balde de Cerveja
  const [fardoPreco, setFardoPreco] = useState<number>(48.00); // 12 un cracudinha
  const [unidadesNoFardo, setUnidadesNoFardo] = useState<number>(12);
  const [precoAvulso, setPrecoAvulso] = useState<number>(7.00);
  const [precoBaldePromo, setPrecoBaldePromo] = useState<number>(25.00);
  const [qtdBalde, setQtdBalde] = useState<number>(4);
  const [custoGeloBalde, setCustoGeloBalde] = useState<number>(2.00);

  const barCalc = useMemo(() => {
    // Teórico
    const dosesTeoricas = Math.floor(mlGarrafa / mlDose);
    const custoDoseTeorica = precoGarrafa / dosesTeoricas;
    const lucroDoseTeorica = precoDoseVenda - custoDoseTeorica;
    const apuradoGarrafaTeorica = dosesTeoricas * precoDoseVenda;
    const lucroGarrafaTeorica = apuradoGarrafaTeorica - precoGarrafa;

    // Prático (com chorinho contado no balcão)
    const custoDoseReal = precoGarrafa / (dosesServidasContador || 1);
    const apuradoGarrafaReal = dosesServidasContador * precoDoseVenda;
    const lucroGarrafaReal = apuradoGarrafaReal - precoGarrafa;

    // Balde de cerveja
    const custoUnidadeCerveja = fardoPreco / (unidadesNoFardo || 1);
    const custoBalde = (custoUnidadeCerveja * qtdBalde) + custoGeloBalde;
    const lucroBalde = precoBaldePromo - custoBalde;
    const margemBalde = (lucroBalde / precoBaldePromo) * 100;
    const valorAvulsoEquivalente = precoAvulso * qtdBalde;
    const descontoClienteBalde = valorAvulsoEquivalente - precoBaldePromo;

    return {
      dosesTeoricas,
      custoDoseTeorica,
      lucroDoseTeorica,
      apuradoGarrafaTeorica,
      lucroGarrafaTeorica,
      custoDoseReal,
      apuradoGarrafaReal,
      lucroGarrafaReal,
      // Balde
      custoUnidadeCerveja,
      custoBalde,
      lucroBalde,
      margemBalde,
      valorAvulsoEquivalente,
      descontoClienteBalde
    };
  }, [mlGarrafa, mlDose, precoGarrafa, precoDoseVenda, dosesServidasContador, fardoPreco, unidadesNoFardo, precoAvulso, precoBaldePromo, qtdBalde, custoGeloBalde]);

  // Função para imprimir relatório / recibo
  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-4 pb-12 animate-fadeIn text-slate-100">
      {/* HEADER PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 rounded-2xl border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-black rounded-full uppercase tracking-wider border border-indigo-500/30 flex items-center gap-1.5">
                <Landmark className="w-3 h-3 text-indigo-400" />
                Aba 5 • Escritório do Proprietário
              </span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[9.5px] font-bold rounded-full border border-amber-500/30">
                O Leão & CLT
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Contabilidade, Tributos & Precificação Estratégica 🏛️⚖️
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-sans max-w-2xl">
              Cálculo exato de tributos da Receita Federal (MEI / Simples), folha de funcionários com horas extras e diárias, recibos assináveis e a fórmula real de <strong>Tempo é Dinheiro</strong> para não quebrar.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handlePrintDocument}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Imprimir Relatório</span>
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow"
              >
                Voltar ao Início
              </button>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO DE SUB-ABAS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-5 border-t border-white/5 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab("tributos")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "tributos"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>1. O Leão (MEI & Simples Nacional)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("funcionarios")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "funcionarios"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Funcionários, Diárias & Rescisão</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tempo_dinheiro")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "tempo_dinheiro"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>3. Oficina & Obra: Tempo é Dinheiro</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bar_doses")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "bar_doses"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Wine className="w-3.5 h-3.5" />
            <span>4. Bar, Doses de 51 & Baldes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("livro_caixa")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "livro_caixa"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>5. Livro Caixa & Direitos do Consumidor</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* ABA 1: TRIBUTOS FEDERAIS & O LEÃO */}
      {/* ========================================== */}
      {activeTab === "tributos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
          {/* PAINEL DE CONFIGURAÇÃO DE IMPOSTOS */}
          <div className="lg:col-span-1 bg-slate-900/90 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider">
              <Landmark className="w-4 h-4" />
              <span>Enquadramento Tributário</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Regime da Empresa:
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRegime("mei")}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                      regime === "mei"
                        ? "bg-indigo-600/30 border-indigo-500 text-white"
                        : "bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="font-black flex items-center justify-between">
                      <span>MEI (Microempreendedor)</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">Taxa Fixa</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Teto anual até R$ 81.000 (R$ 6.750/mês)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegime("simples_comercio")}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                      regime === "simples_comercio"
                        ? "bg-indigo-600/30 border-indigo-500 text-white"
                        : "bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="font-black flex items-center justify-between">
                      <span>Simples Nacional (Comércio / Bar / Pet)</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">Anexo I</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Alíquota inicial de 4% sobre a venda bruta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegime("simples_servicos")}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                      regime === "simples_servicos"
                        ? "bg-indigo-600/30 border-indigo-500 text-white"
                        : "bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="font-black flex items-center justify-between">
                      <span>Simples Nacional (Oficinas & Serviços)</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">Anexo III</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Alíquota inicial de 6% sobre mão de obra</span>
                  </button>
                </div>
              </div>

              {regime === "mei" && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Atividade Principal do MEI:
                  </label>
                  <select
                    value={ramoMei}
                    onChange={(e) => setRamoMei(e.target.value as any)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  >
                    <option value="comercio">Comércio / Bar / Lanchonete (+ R$ 1 ICMS)</option>
                    <option value="servicos">Oficina / Pintura / Serviços (+ R$ 5 ISS)</option>
                    <option value="ambos">Comércio e Serviços (+ R$ 6 ICMS + ISS)</option>
                  </select>
                </div>
              )}

              {regime === "simples_comercio" && (
                <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                      Vende Bebidas / Cigarro (ICMS-ST)?
                    </label>
                    <input
                      type="checkbox"
                      checked={temSubstituicaoTributaria}
                      onChange={(e) => setTemSubstituicaoTributaria(e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                    />
                  </div>
                  <p className="text-[9.5px] text-slate-400 leading-normal">
                    Se você vende cerveja, refrigerante ou cigarro, o imposto ICMS já foi recolhido pela fábrica. Isso <strong>reduz cerca de 33% do seu DAS</strong> legalmente!
                  </p>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Faturamento Deste Mês (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">R$</span>
                  <input
                    type="number"
                    value={faturamentoMes}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFaturamentoMes(val);
                      setFaturamento12Meses(val * 12);
                    }}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-[9.5px] text-slate-400 block mt-1">
                  Média anual estimada: {formatCurrency(faturamentoMes * 12)}
                </span>
              </div>
            </div>
          </div>

          {/* PAINEL DE RESULTADOS DO IMPOSTO */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/90 border border-white/10 p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">
                    {tributosCalc.impostoNome}
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Guia do Imposto Devido (DAS Mensal)
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total a Recolher</span>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {formatCurrency(tributosCalc.impostoTotal)}
                  </span>
                </div>
              </div>

              {/* CARD DE ALÍQUOTA E METRICAS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Alíquota Efetiva</span>
                  <span className="text-base font-black text-white font-mono">
                    {tributosCalc.aliquotaEfetiva.toFixed(2)}%
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Faturamento Bruto</span>
                  <span className="text-base font-black text-white font-mono">
                    {formatCurrency(faturamentoMes)}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Sobrou Limpo (Pós-Imposto)</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {formatCurrency(faturamentoMes - tributosCalc.impostoTotal)}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Economia Tributária</span>
                  <span className="text-base font-black text-sky-400 font-mono">
                    {formatCurrency(tributosCalc.economiaST || 0)}
                  </span>
                </div>
              </div>

              {/* DETALHAMENTO DE DESTINO DO IMPOSTO */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Para onde vai cada centavo do seu imposto:
                </span>
                <div className="space-y-1.5">
                  {tributosCalc.detalhe.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-800/40 rounded-lg border border-white/5">
                      <span className="text-slate-300 font-medium">{item.nome}</span>
                      <span className="font-mono font-bold text-white">{formatCurrency(item.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AVISO DO CONTADOR INTELIGENTE */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                tributosCalc.estrapolou
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                  : "bg-indigo-500/10 border-indigo-500/30 text-indigo-200"
              }`}>
                <ShieldCheck className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <strong className="block font-black uppercase tracking-wide">
                    Conselho do Contador Digital:
                  </strong>
                  <p className="leading-relaxed text-slate-300">
                    {tributosCalc.alerta}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 2: FUNCIONÁRIOS, DIÁRIAS & RESCISÃO */}
      {/* ========================================== */}
      {activeTab === "funcionarios" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
          <div className="lg:col-span-1 bg-slate-900/90 border border-white/10 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>Dados do Colaborador</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Nome do Funcionário / Prestador:
                </label>
                <input
                  type="text"
                  value={nomeFuncionario}
                  onChange={(e) => setNomeFuncionario(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Modalidade de Pagamento:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTipoContrato("clt")}
                    className={`py-2 px-1 text-[10px] font-black rounded-lg border uppercase tracking-wider transition-all cursor-pointer ${
                      tipoContrato === "clt" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-white/5 text-slate-400"
                    }`}
                  >
                    CLT Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoContrato("diarista")}
                    className={`py-2 px-1 text-[10px] font-black rounded-lg border uppercase tracking-wider transition-all cursor-pointer ${
                      tipoContrato === "diarista" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-white/5 text-slate-400"
                    }`}
                  >
                    Diarista
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoContrato("freelancer")}
                    className={`py-2 px-1 text-[10px] font-black rounded-lg border uppercase tracking-wider transition-all cursor-pointer ${
                      tipoContrato === "freelancer" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-white/5 text-slate-400"
                    }`}
                  >
                    Freelancer
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  {tipoContrato === "clt" ? "Salário Base (R$):" : "Valor por Diária (R$):"}
                </label>
                <input
                  type="number"
                  value={salarioBase}
                  onChange={(e) => setSalarioBase(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Horas Extras 50% (Normais):
                  </label>
                  <input
                    type="number"
                    value={horasExtras50}
                    onChange={(e) => setHorasExtras50(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Horas Extras 100% (Domingo):
                  </label>
                  <input
                    type="number"
                    value={horasExtras100}
                    onChange={(e) => setHorasExtras100(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                  />
                </div>
              </div>

              {tipoContrato === "clt" && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-bold text-slate-300">Descontar Vale Transporte (6%)?</span>
                  <input
                    type="checkbox"
                    checked={valeTransporte}
                    onChange={(e) => setValeTransporte(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* HOLERITE & RECIBO DE PAGAMENTO */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/90 border border-white/10 p-5 rounded-2xl space-y-4 print:border-black print:bg-white print:text-black">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">
                    Demonstrativo de Pagamento Oficial
                  </span>
                  <h3 className="text-base font-black text-white">
                    Recibo de Salário / Diária • {nomeFuncionario}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Líquido a Pagar</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {formatCurrency(folhaCalc.liquido)}
                  </span>
                </div>
              </div>

              {/* TABELA DE PROVENTOS E DESCONTOS */}
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[9px] font-black">
                    <tr>
                      <th className="p-2.5 text-left">Descrição</th>
                      <th className="p-2.5 text-right">Vencimentos (+)</th>
                      <th className="p-2.5 text-right">Descontos (-)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {folhaCalc.detalhes.map((item, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="p-2.5 text-slate-300 font-sans">{item.nome}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">+{formatCurrency(item.valor)}</td>
                        <td className="p-2.5 text-right text-slate-500">-</td>
                      </tr>
                    ))}
                    {tipoContrato === "clt" && (
                      <>
                        <tr className="hover:bg-white/5">
                          <td className="p-2.5 text-slate-300 font-sans">INSS Previdência Social</td>
                          <td className="p-2.5 text-right text-slate-500">-</td>
                          <td className="p-2.5 text-right font-bold text-rose-400">-{formatCurrency(folhaCalc.inss || 0)}</td>
                        </tr>
                        {valeTransporte && (
                          <tr className="hover:bg-white/5">
                            <td className="p-2.5 text-slate-300 font-sans">Vale Transporte (Teto 6%)</td>
                            <td className="p-2.5 text-right text-slate-500">-</td>
                            <td className="p-2.5 text-right font-bold text-rose-400">-{formatCurrency(folhaCalc.descontoVT || 0)}</td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-800/60 font-mono font-black border-t border-white/10">
                    <tr>
                      <td className="p-2.5 text-slate-200 uppercase font-sans text-[10px]">Totais</td>
                      <td className="p-2.5 text-right text-emerald-400">+{formatCurrency(folhaCalc.bruto)}</td>
                      <td className="p-2.5 text-right text-rose-400">-{formatCurrency(folhaCalc.descontos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ÁREA DE ASSINATURA */}
              <div className="pt-8 border-t border-dashed border-white/20 grid grid-cols-2 gap-6 text-center text-xs text-slate-400">
                <div>
                  <div className="border-b border-white/30 mb-1.5 h-6"></div>
                  <span className="font-bold text-slate-200">Assinatura da Empresa / Empregador</span>
                </div>
                <div>
                  <div className="border-b border-white/30 mb-1.5 h-6"></div>
                  <span className="font-bold text-slate-200">{nomeFuncionario}</span>
                  <span className="block text-[10px] text-slate-400">Recebi e dou plena quitação</span>
                </div>
              </div>
            </div>

            {/* SIMULADOR DE RESCISÃO TRABALHISTA */}
            <div className="bg-slate-900/90 border border-white/10 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Calculadora de Rescisão Trabalhista (Demissão)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{mesesTrabalhados} meses de casa</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-800/60 rounded-lg">
                  <span className="text-[9px] text-slate-400 block font-bold">Férias + 1/3</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(rescisaoCalc.feriasComTerco)}</span>
                </div>
                <div className="p-2 bg-slate-800/60 rounded-lg">
                  <span className="text-[9px] text-slate-400 block font-bold">13º Proporcional</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(rescisaoCalc.decimoTerceiro)}</span>
                </div>
                <div className="p-2 bg-slate-800/60 rounded-lg">
                  <span className="text-[9px] text-slate-400 block font-bold">Aviso Prévio ({rescisaoCalc.diasAviso}d)</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(rescisaoCalc.valorAvisoPrevio)}</span>
                </div>
                <div className="p-2 bg-slate-800/60 rounded-lg">
                  <span className="text-[9px] text-slate-400 block font-bold">Multa 40% FGTS</span>
                  <span className="font-mono font-bold text-amber-400">{formatCurrency(rescisaoCalc.multaFgts)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 text-xs font-bold border-t border-white/5">
                <span className="text-slate-300">Custo Total Estimado da Rescisão:</span>
                <span className="text-base text-rose-400 font-mono font-black">{formatCurrency(rescisaoCalc.custoTotalComMultaFgts)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 3: OFICINA & OBRA: TEMPO É DINHEIRO */}
      {/* ========================================== */}
      {activeTab === "tempo_dinheiro" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
          <div className="lg:col-span-1 bg-slate-900/90 border border-white/10 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>O Caso da Oficina / Empreitada</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Serviço / Conserto Realizado:
                </label>
                <input
                  type="text"
                  value={servicoNome}
                  onChange={(e) => setServicoNome(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Valor que Cobrou do Cliente (R$):
                </label>
                <input
                  type="number"
                  value={valorCobrado}
                  onChange={(e) => setValorCobrado(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Quantos Dias Levou:
                  </label>
                  <input
                    type="number"
                    value={diasGastos}
                    onChange={(e) => setDiasGastos(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Quantos Ajudantes:
                  </label>
                  <input
                    type="number"
                    value={numAjudantes}
                    onChange={(e) => setNumAjudantes(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Diária do Ajudante (R$):
                  </label>
                  <input
                    type="number"
                    value={diariaAjudante}
                    onChange={(e) => setDiariaAjudante(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Marmita / Almoço Dia (R$):
                  </label>
                  <input
                    type="number"
                    value={gastoMarmitaDia}
                    onChange={(e) => setGastoMarmitaDia(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Lucro que o Patrão Merece Tirar por Dia (R$):
                </label>
                <input
                  type="number"
                  value={lucroDesejadoMestre}
                  onChange={(e) => setLucroDesejadoMestre(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className={`p-5 rounded-2xl border ${
              tempoDinheiroCalc.tevePrejuizo 
                ? "bg-rose-950/40 border-rose-500/40 text-white" 
                : "bg-slate-900/90 border-white/10 text-white"
            }`}>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider block ${
                    tempoDinheiroCalc.tevePrejuizo ? "text-rose-400" : "text-emerald-400"
                  }`}>
                    {tempoDinheiroCalc.tevePrejuizo ? "🚨 ALERTA VERMELHO: PAGANDO PARA TRABALHAR!" : "Resultado da Operação"}
                  </span>
                  <h3 className="text-lg font-black">
                    Diagnóstico Financeiro do Serviço
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Lucro Líquido Real</span>
                  <span className={`text-2xl font-black font-mono ${
                    tempoDinheiroCalc.tevePrejuizo ? "text-rose-400" : "text-emerald-400"
                  }`}>
                    {formatCurrency(tempoDinheiroCalc.lucroReal)}
                  </span>
                </div>
              </div>

              {/* DETALHES DE GASTO OCULTO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Diárias Pagas a Ajudantes</span>
                  <span className="text-base font-black text-white font-mono">
                    {formatCurrency(tempoDinheiroCalc.custoAjudantes)}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">{numAjudantes} ajudantes x {diasGastos} dias</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Marmitas e Bebidas</span>
                  <span className="text-base font-black text-white font-mono">
                    {formatCurrency(tempoDinheiroCalc.custoAlimentacao)}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Alimentação diária</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Custo Total que Saiu do Bolso</span>
                  <span className="text-base font-black text-rose-400 font-mono">
                    {formatCurrency(tempoDinheiroCalc.custoTotalReal)}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Sem contar o seu tempo</span>
                </div>
              </div>

              {/* RECOMENDAÇÃO DO PREÇO JUSTO */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                  <Sparkles className="w-4 h-4" />
                  <span>Quanto Você DEVERIA Ter Cobrado por esse Serviço:</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {formatCurrency(tempoDinheiroCalc.precoJustoMinimo)}
                  </span>
                  <span className="text-xs text-amber-300">
                    (Para pagar custos e sobrar {formatCurrency(lucroDesejadoMestre)}/dia pro seu sustento)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  O cliente chora, mas quem fica 3 dias mexendo numa moto e cobra só {formatCurrency(valorCobrado)} está tirando dinheiro do leite dos próprios filhos. 
                  Com {diasGastos} dias de trabalho, o valor mínimo de mão de obra precisa cobrir os ajudantes e o tempo que a oficina ficou ocupada!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 4: BAR, DOSES DE 51 & BALDES DE CERVEJA */}
      {/* ========================================== */}
      {activeTab === "bar_doses" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-left">
          {/* CALCULADORA DE DOSES DE 51 COM CHORINHO */}
          <div className="bg-slate-900/90 border border-white/10 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Wine className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">
                  Dose de Garrafa (51, Dreher, Conhaque)
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full">
                O Teste da Garrafa Real
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Preço Pago na Garrafa (R$):
                </label>
                <input
                  type="number"
                  value={precoGarrafa}
                  onChange={(e) => setPrecoGarrafa(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Preço da Dose no Balcão (R$):
                </label>
                <input
                  type="number"
                  value={precoDoseVenda}
                  onChange={(e) => setPrecoDoseVenda(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                />
              </div>
            </div>

            {/* CONTADOR DO TESTE DA GARRAFA REAL */}
            <div className="bg-slate-800/70 p-4 rounded-xl border border-white/5 space-y-2.5">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                Contador de Doses Servidas (Para quem não tem copo dosador):
              </span>
              <p className="text-[9.5px] text-slate-400 leading-normal">
                Abra uma garrafa teste. Cada vez que servir uma dose com seu chorinho normal no balcão, dê um toque no botão:
              </p>
              
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDosesServidasContador(Math.max(1, dosesServidasContador - 1))}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-mono font-black text-lg text-white cursor-pointer"
                >
                  -1
                </button>
                <div className="text-center">
                  <span className="text-3xl font-black text-white font-mono">{dosesServidasContador}</span>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Doses Reais da Garrafa</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDosesServidasContador(dosesServidasContador + 1)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-mono font-black text-lg text-white cursor-pointer"
                >
                  +1 Dose
                </button>
              </div>
            </div>

            {/* APURAÇÃO REAL DA GARRAFA */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-800/60 rounded-xl">
                <span className="text-[8.5px] text-slate-400 uppercase font-bold block">Custo por Dose</span>
                <span className="text-xs font-black text-white font-mono">{formatCurrency(barCalc.custoDoseReal)}</span>
              </div>
              <div className="p-2.5 bg-slate-800/60 rounded-xl">
                <span className="text-[8.5px] text-slate-400 uppercase font-bold block">Apurado na Garrafa</span>
                <span className="text-xs font-black text-white font-mono">{formatCurrency(barCalc.apuradoGarrafaReal)}</span>
              </div>
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <span className="text-[8.5px] text-emerald-400 uppercase font-bold block">Lucro Limpo</span>
                <span className="text-xs font-black text-emerald-400 font-mono">+{formatCurrency(barCalc.lucroGarrafaReal)}</span>
              </div>
            </div>
          </div>

          {/* SIMULADOR DE BALDE DE CERVEJA (CRACUDINHA / LITRINHO) */}
          <div className="bg-slate-900/90 border border-white/10 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  Balde de Cerveja (Cracudinha / Litrinho)
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded-full">
                Combo com Gelo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Custo do Fardo (12 un):
                </label>
                <input
                  type="number"
                  value={fardoPreco}
                  onChange={(e) => setFardoPreco(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Preço da Unidade Avulsa:
                </label>
                <input
                  type="number"
                  value={precoAvulso}
                  onChange={(e) => setPrecoAvulso(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Preço do Balde na Promoção:
                </label>
                <input
                  type="number"
                  value={precoBaldePromo}
                  onChange={(e) => setPrecoBaldePromo(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Cervejas no Balde (un):
                </label>
                <input
                  type="number"
                  value={qtdBalde}
                  onChange={(e) => setQtdBalde(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-800/60 rounded-xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">4 garrafas avulsas a {formatCurrency(precoAvulso)} dariam:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(barCalc.valorAvulsoEquivalente)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Desconto que o cliente ganha no combo:</span>
                <span className="font-mono font-bold text-amber-400">-{formatCurrency(barCalc.descontoClienteBalde)}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-slate-300 font-bold">Lucro Limpo no Balde com Gelo:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">+{formatCurrency(barCalc.lucroBalde)} ({barCalc.margemBalde.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 5: LIVRO CAIXA & DIREITOS DO CONSUMIDOR */}
      {/* ========================================== */}
      {activeTab === "livro_caixa" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-left">
          {/* DIREITOS DO CONSUMIDOR (COMO NÃO LEVAR PROCESSO DO PROCON) */}
          <div className="bg-slate-900/90 border border-white/10 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider border-b border-white/10 pb-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-black text-white">
                Como Não Levar Processo e Multa do Procon (CDC)
              </h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5 space-y-1">
                <strong className="text-amber-300 block font-bold">1. Preço Diferente no Cartão vs PIX (Lei 13.455/2017)</strong>
                <p className="text-slate-300">
                  É 100% legal dar desconto no PIX ou cobrar preço diferente no cartão de crédito, <strong>mas é obrigatório ter uma placa visível</strong> informando aos clientes as diferentes taxas!
                </p>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5 space-y-1">
                <strong className="text-amber-300 block font-bold">2. Taxa de Serviço de 10% em Bares e Restaurantes</strong>
                <p className="text-slate-300">
                  A gorjeta de 10% é estritamente <strong>opcional</strong>. Não pode constar como obrigatória na comanda nem constranger o cliente se ele pedir para retirar.
                </p>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5 space-y-1">
                <strong className="text-amber-300 block font-bold">3. Preço Visível em Todos os Produtos (Decreto 5.903/2006)</strong>
                <p className="text-slate-300">
                  Tudo que estiver na prateleira, balcão ou vitrine deve ter etiqueta de preço à vista. Deixar sem preço dá multa pesada do Procon.
                </p>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5 space-y-1">
                <strong className="text-amber-300 block font-bold">4. Tara da Embalagem na Balança</strong>
                <p className="text-slate-300">
                  Em açougues, frios e lanchonetes de peso, a embalagem ou pratinho de isopor deve ser descontado na balança (botão TARA). Cobrar o peso do isopor como carne é infração grave.
                </p>
              </div>
            </div>
          </div>

          {/* DICAS DE ECONOMIA REAL & DESPERDÍCIO */}
          <div className="bg-slate-900/90 border border-white/10 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider border-b border-white/10 pb-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-black text-white">
                Dicas de Ouro: Onde o Comércio Mais Sangra Dinheiro
              </h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5 space-y-1">
                <strong className="text-emerald-300 block font-bold">🥬 O Desperdício Invisível (Alface, Tomate e Pão)</strong>
                <p className="text-slate-300">
                  Em lanchonetes de hambúrguer, o prejuízo costuma estar nos vegetais que murcham e vão para o lixo. Se comprar 10 caixas e estragar 2, seu custo unitário subiu 25% sem você perceber!
                </p>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5 space-y-1">
                <strong className="text-emerald-300 block font-bold">🥩 Quebra de Desossa no Açougue</strong>
                <p className="text-slate-300">
                  Comprou uma peça de 20kg por R$ 500 (R$ 25/kg) e tirou 4kg de osso e sebo? Agora você tem 16kg de carne que custaram R$ 500. Seu custo real subiu para R$ 31,25/kg! Se vender achando que pagou 25, quebra.
                </p>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5 space-y-1">
                <strong className="text-emerald-300 block font-bold">🥤 Suco Natural vs Suco de Pacotinho</strong>
                <p className="text-slate-300">
                  Um copo de suco de pacotinho custa R$ 0,35 para fazer e você vende a R$ 4,00. O suco natural de laranja custa R$ 2,20 e você vende a R$ 8,00. Em dinheiro no bolso, o natural deixa R$ 5,80 de lucro, enquanto o pacotinho deixa R$ 3,65. Trabalhar mais no natural dobra sua renda!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
