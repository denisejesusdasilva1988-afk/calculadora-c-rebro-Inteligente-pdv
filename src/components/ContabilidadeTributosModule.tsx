import React, { useState, useMemo, useEffect } from "react";
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
  ArrowUpRight,
  Save,
  Share2,
  Beer,
  Plus,
  Minus,
  Check,
  Zap,
  Hammer
} from "lucide-react";

interface ContabilidadeTributosProps {
  key?: React.Key;
  onBack?: () => void;
  formatCurrency?: (val: number) => string;
  monthlyRevenueDefault?: number;
  showNotification?: (msg: string, type?: any) => void;
  initialTab?: "tributos" | "funcionarios" | "tempo_dinheiro" | "bar_doses" | "livro_caixa";
}

export const ContabilidadeTributosModule: React.FC<ContabilidadeTributosProps> = ({
  onBack,
  formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`,
  monthlyRevenueDefault = 0,
  showNotification = (_msg?: string, _type?: any) => {},
  initialTab = "tributos"
}) => {
  // Sub-abas do módulo com sincronização em localStorage
  const [activeTab, setActiveTab] = useState<"tributos" | "funcionarios" | "tempo_dinheiro" | "bar_doses" | "livro_caixa">(() => {
    try {
      const saved = localStorage.getItem("contabilidade_active_tab");
      if (saved && ["tributos", "funcionarios", "tempo_dinheiro", "bar_doses", "livro_caixa"].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return initialTab || "tributos";
  });

  const handleSelectTab = (tab: "tributos" | "funcionarios" | "tempo_dinheiro" | "bar_doses" | "livro_caixa") => {
    setActiveTab(tab);
    try {
      localStorage.setItem("contabilidade_active_tab", tab);
    } catch {}
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // ==========================================
  // ESTADO 1: TRIBUTOS FEDERAIS & SIMPLES NACIONAL / MEI
  // ==========================================
  const [empresaCnpjCnae, setEmpresaCnpjCnae] = useState<string>(() => {
    try {
      return localStorage.getItem("pdv_empresa_cnae_cnpj") || "";
    } catch { return ""; }
  });
  const [selectedCnaePreset, setSelectedCnaePreset] = useState<string>("");
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

  // Rescisão Trabalhista Completa & Editável
  const [dataAdmissao, setDataAdmissao] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().slice(0, 10);
  });
  const [dataDemissao, setDataDemissao] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [motivoRescisao, setMotivoRescisao] = useState<"sem_justa_causa" | "com_justa_causa" | "pedido_demissao" | "acordo_comum">("sem_justa_causa");
  const [avisoPrevio, setAvisoPrevio] = useState<"indenizado" | "trabalhado" | "dispensado">("indenizado");
  const [temFeriasVencidas, setTemFeriasVencidas] = useState<boolean>(false);

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

  // Cálculo da Rescisão Trabalhista com Datas e Regras Oficiais CLT
  const rescisaoCalc = useMemo(() => {
    let diffDays = 0;
    let diffMonths = 0;
    let diffYears = 0;
    let diasTrabalhadosMesRescisao = 30;

    try {
      const dAdm = new Date(dataAdmissao + "T12:00:00");
      const dDem = new Date(dataDemissao + "T12:00:00");
      if (!isNaN(dAdm.getTime()) && !isNaN(dDem.getTime()) && dDem >= dAdm) {
        const msDiff = dDem.getTime() - dAdm.getTime();
        diffDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));
        diffMonths = Math.max(1, Math.floor(diffDays / 30.4375));
        diffYears = Math.floor(diffMonths / 12);
        diasTrabalhadosMesRescisao = Math.min(30, Math.max(1, dDem.getDate()));
      } else {
        diffMonths = 14;
        diffYears = 1;
        diffDays = 425;
        diasTrabalhadosMesRescisao = 15;
      }
    } catch {
      diffMonths = 14;
      diffYears = 1;
      diffDays = 425;
    }

    const valorDia = salarioBase / 30;
    const saldoSalario = valorDia * diasTrabalhadosMesRescisao;

    // 13º proporcional no ano corrente da demissão (contando meses com >= 15 dias)
    let mesesNoAno = 1;
    try {
      const dDem = new Date(dataDemissao + "T12:00:00");
      const dAdm = new Date(dataAdmissao + "T12:00:00");
      const mesmoAno = dAdm.getFullYear() === dDem.getFullYear();
      const mesInicio = mesmoAno ? dAdm.getMonth() + 1 : 1;
      const mesFim = dDem.getMonth() + 1;
      const diasUltimoMes = dDem.getDate();
      mesesNoAno = Math.max(1, mesFim - mesInicio + (diasUltimoMes >= 15 ? 1 : 0));
    } catch {
      mesesNoAno = diffMonths % 12 || 12;
    }
    const decimoTerceiro = (salarioBase / 12) * Math.min(12, mesesNoAno);

    // Férias proporcionais + 1/3 (meses no período aquisitivo atual)
    const mesesPeriodoAquisitivo = diffMonths % 12 || 12;
    const feriasProp = (salarioBase / 12) * Math.min(12, mesesPeriodoAquisitivo);
    const tercoFeriasProp = feriasProp / 3;

    // Férias vencidas integrais (+ 1/3) se houver
    const feriasVencidas = temFeriasVencidas ? salarioBase : 0;
    const tercoFeriasVencidas = temFeriasVencidas ? salarioBase / 3 : 0;

    // Aviso Prévio Proporcional (Lei 12.506/2011: 30 dias + 3 dias por ano completo trabalhado, até 90 dias)
    const diasAviso = Math.min(90, 30 + (diffYears * 3));
    let valorAvisoPrevio = 0;
    if (motivoRescisao === "sem_justa_causa") {
      if (avisoPrevio === "indenizado") {
        valorAvisoPrevio = (salarioBase / 30) * diasAviso;
      }
    } else if (motivoRescisao === "acordo_comum") {
      if (avisoPrevio === "indenizado") {
        valorAvisoPrevio = ((salarioBase / 30) * diasAviso) * 0.5; // Art. 484-A CLT: 50%
      }
    }

    // FGTS & Multa Rescisória
    const saldoFgtsEstimado = (salarioBase * 0.08) * diffMonths;
    let percentualMulta = 0;
    if (motivoRescisao === "sem_justa_causa") {
      percentualMulta = 0.40;
    } else if (motivoRescisao === "acordo_comum") {
      percentualMulta = 0.20;
    }
    const multaFgts = saldoFgtsEstimado * percentualMulta;

    // Regras de Verbas Líquidas
    let totalVerbas = saldoSalario;
    if (motivoRescisao === "com_justa_causa") {
      totalVerbas = saldoSalario + feriasVencidas + tercoFeriasVencidas;
    } else if (motivoRescisao === "pedido_demissao") {
      totalVerbas = saldoSalario + decimoTerceiro + feriasProp + tercoFeriasProp + feriasVencidas + tercoFeriasVencidas;
    } else if (motivoRescisao === "acordo_comum") {
      totalVerbas = saldoSalario + (decimoTerceiro * 0.5) + feriasProp + tercoFeriasProp + feriasVencidas + tercoFeriasVencidas + valorAvisoPrevio;
    } else {
      totalVerbas = saldoSalario + decimoTerceiro + feriasProp + tercoFeriasProp + feriasVencidas + tercoFeriasVencidas + valorAvisoPrevio;
    }

    return {
      diasTrabalhadosTotal: diffDays,
      mesesTrabalhadosTotal: diffMonths,
      anosTrabalhadosTotal: diffYears,
      diasTrabalhadosMesRescisao,
      diasAviso,
      saldoSalario,
      decimoTerceiro,
      feriasComTerco: feriasProp + tercoFeriasProp,
      feriasVencidasComTerco: feriasVencidas + tercoFeriasVencidas,
      valorAvisoPrevio,
      saldoFgtsEstimado,
      multaFgts,
      totalPagarAoFuncionario: totalVerbas,
      custoTotalComMultaFgts: totalVerbas + multaFgts
    };
  }, [salarioBase, dataAdmissao, dataDemissao, motivoRescisao, avisoPrevio, temFeriasVencidas]);

  // ==========================================
  // ESTADO 3: OFICINA, MECÂNICO, PEDREIRO ("TEMPO É DINHEIRO")
  // ==========================================
  // Alternância entre: Serviços Rápidos (Mecânica com minutos/ajudante) vs Obra/Diárias Longas
  const [modoOficina, setModoOficina] = useState<"rapido" | "diaria">("rapido");

  // Modo Serviços Rápidos (Oficina Mecânica Real com ajudante e peças)
  const [servicoNome, setServicoNome] = useState<string>("Troca de Pastilhas de Freio + Sangria");
  const [tempoMecanicoMin, setTempoMecanicoMin] = useState<number>(45); // Mecânico faz o serviço principal
  const [tempoAjudanteMin, setTempoAjudanteMin] = useState<number>(30); // Ajudante sangra / lava peças
  const [valorHoraMecanico, setValorHoraMecanico] = useState<number>(50); // R$ 50/hora
  const [valorHoraAjudante, setValorHoraAjudante] = useState<number>(15); // R$ 15/hora
  const [custoFixoHoraOficina, setCustoFixoHoraOficina] = useState<number>(10); // R$ 10/hora luz/compressor/aluguel
  const [custoPecasServico, setCustoPecasServico] = useState<number>(120); // Pastilhas, fluido, óleo
  const [margemPecasPct, setMargemPecasPct] = useState<number>(25); // +25% na peça
  const [margemMaoDeObraPct, setMargemMaoDeObraPct] = useState<number>(30); // +30% lucro mão de obra
  const [servicosRapidosPorDia, setServicosRapidosPorDia] = useState<number>(4); // Oficina atende 4 a 6 carros no dia

  // Modo Obra Longa / Diárias (Empreitada / Retífica completa)
  const [valorCobrado, setValorCobrado] = useState<number>(650);
  const [diasGastos, setDiasGastos] = useState<number>(2);
  const [numAjudantes, setNumAjudantes] = useState<number>(1);
  const [diariaAjudante, setDiariaAjudante] = useState<number>(80);
  const [gastoMarmitaDia, setGastoMarmitaDia] = useState<number>(25);
  const [custoFixoDiaOficina, setCustoFixoDiaOficina] = useState<number>(45);
  const [lucroDesejadoMestre, setLucroDesejadoMestre] = useState<number>(180);

  const tempoDinheiroCalc = useMemo(() => {
    if (modoOficina === "rapido") {
      // 1. Custo Real da Mão de Obra deste Serviço Específico (fracionado por minutos)
      const custoTempoMecanico = (tempoMecanicoMin / 60) * valorHoraMecanico;
      const custoTempoAjudante = (tempoAjudanteMin / 60) * valorHoraAjudante;
      const custoFixoTempo = (tempoMecanicoMin / 60) * custoFixoHoraOficina;
      const custoMaoDeObraPuro = custoTempoMecanico + custoTempoAjudante + custoFixoTempo;

      // 2. Preço de Venda da Mão de Obra com Margem Justa (que o cliente realmente aceita pagar)
      const precoMaoDeObraSugerido = custoMaoDeObraPuro * (1 + margemMaoDeObraPct / 100);

      // 3. Peças com Margem
      const precoPecasVenda = custoPecasServico * (1 + margemPecasPct / 100);
      const lucroPecas = precoPecasVenda - custoPecasServico;

      // 4. Preço Total Cobrado do Cliente
      const precoTotalServico = precoMaoDeObraSugerido + precoPecasVenda;
      const custoTotalReal = custoMaoDeObraPuro + custoPecasServico;
      const lucroLimpoServico = precoTotalServico - custoTotalReal;

      // 5. Projeção Diária com múltiplos serviços
      const faturamentoDiaProjetado = precoTotalServico * servicosRapidosPorDia;
      const lucroLimpoDiaProjetado = lucroLimpoServico * servicosRapidosPorDia;

      return {
        modo: "rapido" as const,
        custoTempoMecanico,
        custoTempoAjudante,
        custoFixoTempo,
        custoMaoDeObraPuro,
        precoMaoDeObraSugerido,
        precoPecasVenda,
        lucroPecas,
        precoTotalServico,
        custoTotalReal,
        lucroReal: lucroLimpoServico,
        margemRealPct: precoTotalServico > 0 ? (lucroLimpoServico / precoTotalServico) * 100 : 0,
        tevePrejuizo: lucroLimpoServico < 0,
        precoJustoMinimo: precoTotalServico,
        diariaRealQueSobrouParaDono: lucroLimpoDiaProjetado,
        faturamentoDiaProjetado,
        lucroLimpoDiaProjetado
      };
    }

    // Modo Diária / Obra Longa
    const custoAjudantes = diasGastos * (numAjudantes * diariaAjudante);
    const custoAlimentacao = diasGastos * (gastoMarmitaDia * (numAjudantes + 1));
    const custoFixoTotal = diasGastos * custoFixoDiaOficina;
    const custoTotalReal = custoAjudantes + custoAlimentacao + custoFixoTotal;
    
    const lucroReal = valorCobrado - custoTotalReal;
    const margemRealPct = (lucroReal / (valorCobrado || 1)) * 100;
    const precoJustoMinimo = custoTotalReal + (lucroDesejadoMestre * diasGastos);

    return {
      modo: "diaria" as const,
      custoAjudantes,
      custoAlimentacao,
      custoFixoTotal,
      custoTotalReal,
      lucroReal,
      margemRealPct,
      tevePrejuizo: lucroReal < 0,
      precoJustoMinimo,
      diariaRealQueSobrouParaDono: lucroReal / (diasGastos || 1),
      faturamentoDiaProjetado: valorCobrado,
      lucroLimpoDiaProjetado: lucroReal,
      // Fallback props for quick service references
      custoTempoMecanico: 0,
      custoTempoAjudante: 0,
      custoFixoTempo: 0,
      custoMaoDeObraPuro: 0,
      precoMaoDeObraSugerido: valorCobrado,
      precoPecasVenda: 0,
      lucroPecas: 0,
      precoTotalServico: valorCobrado
    };
  }, [
    modoOficina,
    tempoMecanicoMin,
    tempoAjudanteMin,
    valorHoraMecanico,
    valorHoraAjudante,
    custoFixoHoraOficina,
    custoPecasServico,
    margemPecasPct,
    margemMaoDeObraPct,
    servicosRapidosPorDia,
    valorCobrado,
    diasGastos,
    numAjudantes,
    diariaAjudante,
    gastoMarmitaDia,
    custoFixoDiaOficina,
    lucroDesejadoMestre
  ]);

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

        {/* NAVEGAÇÃO DE SUB-ABAS TOUCH */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-5 border-t border-white/5 mt-4">
          <button
            type="button"
            onClick={() => handleSelectTab("tributos")}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer touch-manipulation select-none active:scale-95 ${
              activeTab === "tributos"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>1. O Leão (MEI & Simples Nacional)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("funcionarios")}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer touch-manipulation select-none active:scale-95 ${
              activeTab === "funcionarios"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400"
                : "bg-slate-800/80 text-blue-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Funcionários, Diárias & Rescisão 👥</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("tempo_dinheiro")}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer touch-manipulation select-none active:scale-95 ${
              activeTab === "tempo_dinheiro"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 ring-2 ring-amber-400"
                : "bg-slate-800/80 text-amber-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>3. Oficina & Obra: Tempo é Dinheiro 🔧⏱️</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("bar_doses")}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer touch-manipulation select-none active:scale-95 ${
              activeTab === "bar_doses"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400"
                : "bg-slate-800/80 text-emerald-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Beer className="w-4 h-4" />
            <span>4. Bar, Doses de 51 & Baldes 🍻</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("livro_caixa")}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer touch-manipulation select-none active:scale-95 ${
              activeTab === "livro_caixa"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400"
                : "bg-slate-800/80 text-purple-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>5. Livro Caixa & Direitos do Consumidor 📖</span>
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
              <span>Enquadramento Tributário & CNAE</span>
            </div>

            {/* Aviso Legal & Preventivo Obrigatório */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-200 text-[10.5px] leading-relaxed space-y-1">
              <strong className="block font-black uppercase text-amber-300 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Aviso Legal Preventivo da Contadora Digital:</span>
              </strong>
              <p className="text-slate-300 text-[10px]">
                Esta calculadora atua como um cérebro contábil de apoio à decisão para planejamento e provisionamento financeiro. Devido a possíveis alíquotas municipais de ISS, créditos estaduais de ICMS ou acordos sindicais, os cálculos <strong>são estimativos e podem conter pequenas variações</strong>. Consulte sempre seu escritório de contabilidade credenciado no CRC para guias e declarações oficiais.
              </p>
            </div>

            {/* Campo CNAE ou CNPJ e Presets de Segmentos */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-2">
              <label className="text-[10px] font-black text-amber-300 uppercase tracking-wider block">
                CNAE Principal ou CNPJ da Empresa:
              </label>
              <input
                type="text"
                value={empresaCnpjCnae}
                onChange={(e) => {
                  setEmpresaCnpjCnae(e.target.value);
                  localStorage.setItem("pdv_empresa_cnae_cnpj", e.target.value);
                }}
                placeholder="Ex: 9602-5/01 (Salão) ou 4781-4/00 (Brechó)"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-amber-400"
              />

              {/* Botões de CNAE Rápido por Segmento */}
              <div className="pt-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">
                  Atividades & CNAEs Mais Utilizados:
                </span>
                <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                  {[
                    { label: "✂️ Cabeleireiro / Salão", cnae: "9602-5/01", regime: "simples_servicos" as const },
                    { label: "👗 Brechó / Roupas", cnae: "4781-4/00", regime: "simples_comercio" as const },
                    { label: "🔧 Mecânica / Oficina", cnae: "4520-0/01", regime: "simples_servicos" as const },
                    { label: "💈 Barbearia Masculina", cnae: "9602-5/01", regime: "simples_servicos" as const },
                    { label: "🦷 Consultório Odonto", cnae: "8630-5/04", regime: "simples_servicos" as const },
                    { label: "🍰 Doces / Festas", cnae: "5620-1/04", regime: "simples_comercio" as const },
                    { label: "🛒 Minimercado / Padaria", cnae: "4712-1/00", regime: "simples_comercio" as const },
                    { label: "🧠 Psicologia / T.O.", cnae: "8650-0/03", regime: "simples_servicos" as const }
                  ].map((p, idx) => (
                    <button
                      key={`${p.cnae}_${idx}`}
                      type="button"
                      onClick={() => {
                        setEmpresaCnpjCnae(`${p.cnae} - ${p.label}`);
                        setSelectedCnaePreset(p.cnae);
                        setRegime(p.regime);
                        localStorage.setItem("pdv_empresa_cnae_cnpj", `${p.cnae} - ${p.label}`);
                        showNotification(`CNAE ${p.cnae} aplicado! Regime configurado para ${p.regime === "simples_comercio" ? "Comércio (Anexo I)" : "Serviços (Anexo III)"}. 🏛️`, "info");
                      }}
                      className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-amber-400/40 text-slate-300 hover:text-white rounded-lg text-left transition-all truncate cursor-pointer"
                      title={`${p.label} (CNAE ${p.cnae})`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
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
              {/* Presets Rápidos Touch de Funções */}
              <div>
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Preenchimento Rápido com 1 Toque:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "🛠️ Ajudante Diarista", nome: "Ajudante Geral", tipo: "diarista" as const, valor: 100, extras: 0 },
                    { label: "👤 Vendedor Balcão", nome: "Vendedor Balconista", tipo: "clt" as const, valor: 1518, extras: 4 },
                    { label: "🔧 Mecânico Geral", nome: "Mecânico Geral", tipo: "clt" as const, valor: 2400, extras: 8 },
                    { label: "🍹 Garçom / Barman", nome: "Garçom / Barman", tipo: "freelancer" as const, valor: 130, extras: 0 },
                    { label: "🍰 Confeiteira / Cozinha", nome: "Confeiteira", tipo: "clt" as const, valor: 1800, extras: 2 }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNomeFuncionario(preset.nome);
                        setTipoContrato(preset.tipo);
                        setSalarioBase(preset.valor);
                        setHorasExtras50(preset.extras);
                        showNotification(`Preset "${preset.label}" aplicado! 👤`, "info");
                      }}
                      className="px-2 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/5 rounded-lg text-left text-[10px] text-slate-300 hover:text-white truncate transition-all touch-manipulation cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Nome do Funcionário / Prestador:
                </label>
                <input
                  type="text"
                  value={nomeFuncionario}
                  onChange={(e) => setNomeFuncionario(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-400"
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
                    className={`py-2 px-1 min-h-[40px] text-[10px] font-black rounded-lg border uppercase tracking-wider transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      tipoContrato === "clt" ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30" : "bg-slate-800 border-white/5 text-slate-400"
                    }`}
                  >
                    CLT Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoContrato("diarista")}
                    className={`py-2 px-1 min-h-[40px] text-[10px] font-black rounded-lg border uppercase tracking-wider transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      tipoContrato === "diarista" ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30" : "bg-slate-800 border-white/5 text-slate-400"
                    }`}
                  >
                    Diarista
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoContrato("freelancer")}
                    className={`py-2 px-1 min-h-[40px] text-[10px] font-black rounded-lg border uppercase tracking-wider transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      tipoContrato === "freelancer" ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30" : "bg-slate-800 border-white/5 text-slate-400"
                    }`}
                  >
                    Freelancer
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {tipoContrato === "clt" ? "Salário Base (R$):" : "Valor por Diária (R$):"}
                  </label>
                  <span className="text-xs font-mono font-black text-emerald-400">{formatCurrency(salarioBase)}</span>
                </div>
                <input
                  type="number"
                  value={salarioBase}
                  onChange={(e) => setSalarioBase(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                />
                {/* Touch Steppers de Salário */}
                <div className="grid grid-cols-4 gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setSalarioBase(Math.max(0, salarioBase - 100))}
                    className="py-1.5 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg text-[10px] font-bold text-slate-300 border border-white/5 touch-manipulation cursor-pointer"
                  >
                    -100
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalarioBase(Math.max(0, salarioBase - 50))}
                    className="py-1.5 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg text-[10px] font-bold text-slate-300 border border-white/5 touch-manipulation cursor-pointer"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalarioBase(salarioBase + 50)}
                    className="py-1.5 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg text-[10px] font-bold text-slate-300 border border-white/5 touch-manipulation cursor-pointer"
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalarioBase(salarioBase + 100)}
                    className="py-1.5 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg text-[10px] font-bold text-slate-300 border border-white/5 touch-manipulation cursor-pointer"
                  >
                    +100
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Horas Extras 50%:
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setHorasExtras50(Math.max(0, horasExtras50 - 1))}
                      className="w-8 h-8 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-xs text-white">{horasExtras50}h</span>
                    <button
                      type="button"
                      onClick={() => setHorasExtras50(horasExtras50 + 1)}
                      className="w-8 h-8 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Horas Extras 100% (Dom):
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setHorasExtras100(Math.max(0, horasExtras100 - 1))}
                      className="w-8 h-8 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-xs text-white">{horasExtras100}h</span>
                    <button
                      type="button"
                      onClick={() => setHorasExtras100(horasExtras100 + 1)}
                      className="w-8 h-8 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {tipoContrato === "clt" && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-bold text-slate-300">Descontar Vale Transporte (6%)?</span>
                  <input
                    type="checkbox"
                    checked={valeTransporte}
                    onChange={(e) => setValeTransporte(e.target.checked)}
                    className="w-5 h-5 accent-indigo-500 rounded cursor-pointer touch-manipulation"
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

              {/* BOTÕES TOUCH DE ENVIO & IMPRESSÃO */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `🧾 *COMPROVANTE DE PAGAMENTO DE SALÁRIO / DIÁRIA*\n` +
                      `👤 *Colaborador:* ${nomeFuncionario}\n` +
                      `📋 *Contrato:* ${tipoContrato.toUpperCase()}\n` +
                      `💰 *Valor Líquido:* ${formatCurrency(folhaCalc.liquido)}\n` +
                      `📅 *Data:* ${new Date().toLocaleDateString("pt-BR")}\n\n` +
                      `_Calculadora Cérebro Inteligente - Gestão & Contabilidade_`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                    showNotification("Abrindo WhatsApp para enviar comprovante...", "info");
                  }}
                  className="flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 touch-manipulation min-h-[44px]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar Recibo no WhatsApp 📱</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 touch-manipulation min-h-[44px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Recibo 🖨️</span>
                </button>
              </div>
            </div>

            {/* CALCULADORA COMPLETA DE RESCISÃO TRABALHISTA (CLT) */}
            <div className="bg-slate-900/90 border border-amber-500/30 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Cálculo Oficial de Rescisão Trabalhista (CLT)
                  </span>
                  <h4 className="text-sm font-black text-white">
                    {nomeFuncionario} • {rescisaoCalc.anosTrabalhadosTotal} ano(s), {rescisaoCalc.mesesTrabalhadosTotal % 12} mês(es) e {rescisaoCalc.diasTrabalhadosTotal % 30} dia(s)
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[9.5px] text-slate-400 block font-bold uppercase">Total a Pagar ao Colaborador</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {formatCurrency(rescisaoCalc.totalPagarAoFuncionario)}
                  </span>
                </div>
              </div>

              {/* CAMPOS DE DATA E MOTIVO DA DEMISSÃO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                <div>
                  <label className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider block mb-1">
                    📅 Início (Assinou Carteira):
                  </label>
                  <input
                    type="date"
                    value={dataAdmissao}
                    onChange={(e) => setDataAdmissao(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider block mb-1">
                    📅 Último Dia na Empresa:
                  </label>
                  <input
                    type="date"
                    value={dataDemissao}
                    onChange={(e) => setDataDemissao(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider block mb-1">
                    Motivo do Término:
                  </label>
                  <select
                    value={motivoRescisao}
                    onChange={(e) => setMotivoRescisao(e.target.value as any)}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-amber-400"
                  >
                    <option value="sem_justa_causa">Dispensa Sem Justa Causa (Pela Empresa)</option>
                    <option value="pedido_demissao">Pedido de Demissão (Pelo Funcionário)</option>
                    <option value="com_justa_causa">Dispensa Com Justa Causa</option>
                    <option value="acordo_comum">Acordo Mútuo (Art. 484-A CLT)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider block mb-1">
                    Aviso Prévio:
                  </label>
                  <select
                    value={avisoPrevio}
                    onChange={(e) => setAvisoPrevio(e.target.value as any)}
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-amber-400"
                  >
                    <option value="indenizado">Indenizado pela Empresa (Paga em Dinheiro)</option>
                    <option value="trabalhado">Trabalhado pelo Funcionário</option>
                    <option value="dispensado">Dispensado / Não Aplicável</option>
                  </select>
                </div>
              </div>

              {/* OPÇÃO DE FÉRIAS VENCIDAS */}
              <div className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                <label className="text-xs text-slate-300 font-bold flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={temFeriasVencidas}
                    onChange={(e) => setTemFeriasVencidas(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>Possui 1 período de Férias Vencidas não gozadas (+ 1/3 Constitucional)?</span>
                </label>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {temFeriasVencidas ? `+ ${formatCurrency(rescisaoCalc.feriasVencidasComTerco)}` : "Não"}
                </span>
              </div>

              {/* DISCRIMINAÇÃO DETALHADA DAS VERBAS RESCISÓRIAS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 block font-bold">Saldo de Salário ({rescisaoCalc.diasTrabalhadosMesRescisao}d)</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(rescisaoCalc.saldoSalario)}</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 block font-bold">13º Salário Proporcional</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(rescisaoCalc.decimoTerceiro)}</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 block font-bold">Férias Prop. + 1/3</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(rescisaoCalc.feriasComTerco)}</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 block font-bold">Aviso Prévio ({rescisaoCalc.diasAviso}d Lei 12.506)</span>
                  <span className="font-mono font-bold text-emerald-400">{formatCurrency(rescisaoCalc.valorAvisoPrevio)}</span>
                </div>
              </div>

              {/* FGTS E CUSTO TOTAL EMPRESA */}
              <div className="bg-slate-950/90 p-3 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black block">Multa Rescisória do FGTS (Guia GRRF / Caixa):</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-amber-400 font-bold">
                      {motivoRescisao === "sem_justa_causa" ? "Multa 40%: " : motivoRescisao === "acordo_comum" ? "Multa 20%: " : "Sem Multa: "}
                      {formatCurrency(rescisaoCalc.multaFgts)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">(Saldo base FGTS estimado: {formatCurrency(rescisaoCalc.saldoFgtsEstimado)})</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">Custo Total para a Empresa:</span>
                  <span className="text-base text-rose-400 font-mono font-black">{formatCurrency(rescisaoCalc.custoTotalComMultaFgts)}</span>
                </div>
              </div>

              {/* BOTÕES DE COMPARTILHAMENTO DE RESCISÃO */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const motivoLabel = motivoRescisao === "sem_justa_causa" ? "Dispensa Sem Justa Causa" :
                      motivoRescisao === "pedido_demissao" ? "Pedido de Demissão" :
                      motivoRescisao === "com_justa_causa" ? "Dispensa Com Justa Causa" : "Acordo Mútuo (Art. 484-A)";
                    
                    const text = `📋 *DEMONSTRATIVO DE RESCISÃO CONTRATUAL (CLT)*\n` +
                      `👤 *Colaborador:* ${nomeFuncionario}\n` +
                      `📅 *Período Trabalhado:* ${dataAdmissao.split("-").reverse().join("/")} até ${dataDemissao.split("-").reverse().join("/")}\n` +
                      `⏱️ *Tempo Total:* ${rescisaoCalc.anosTrabalhadosTotal} ano(s), ${rescisaoCalc.mesesTrabalhadosTotal % 12} mês(es) e ${rescisaoCalc.diasTrabalhadosTotal % 30} dia(s)\n` +
                      `📄 *Motivo:* ${motivoLabel}\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `• Saldo de Salário (${rescisaoCalc.diasTrabalhadosMesRescisao} dias): ${formatCurrency(rescisaoCalc.saldoSalario)}\n` +
                      `• 13º Salário Proporcional: ${formatCurrency(rescisaoCalc.decimoTerceiro)}\n` +
                      `• Férias Proporcionais + 1/3: ${formatCurrency(rescisaoCalc.feriasComTerco)}\n` +
                      (temFeriasVencidas ? `• Férias Vencidas + 1/3: ${formatCurrency(rescisaoCalc.feriasVencidasComTerco)}\n` : "") +
                      `• Aviso Prévio Proporcional (${rescisaoCalc.diasAviso} dias): ${formatCurrency(rescisaoCalc.valorAvisoPrevio)}\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `💰 *TOTAL LÍQUIDO DA RESCISÃO:* ${formatCurrency(rescisaoCalc.totalPagarAoFuncionario)}\n` +
                      (rescisaoCalc.multaFgts > 0 ? `🏛️ *Multa FGTS na Caixa:* ${formatCurrency(rescisaoCalc.multaFgts)}\n` : "") +
                      `\n_Calculadora Cérebro Inteligente • Gestão & Contabilidade_`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                    showNotification("Rescisão pronta para envio no WhatsApp! 📱", "success");
                  }}
                  className="flex-1 py-2.5 px-3 bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-600/20 touch-manipulation"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartilhar Rescisão no WhatsApp 📲</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-white/10 touch-manipulation"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Rescisão 🖨️</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 3: OFICINA MECÂNICA & OBRAS: TEMPO É DINHEIRO */}
      {/* ========================================== */}
      {activeTab === "tempo_dinheiro" && (
        <div className="space-y-4 text-left">
          {/* SELETOR DE MODO DA OFICINA: SERVIÇOS RÁPIDOS DO DIA vs OBRA LONGA/RETÍFICA */}
          <div className="bg-slate-900 border border-white/10 p-1.5 rounded-2xl flex gap-1.5">
            <button
              type="button"
              onClick={() => setModoOficina("rapido")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95 ${
                modoOficina === "rapido"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>1. Serviços Rápidos do Dia (Minutos, Ajudante & Peças) ⚡</span>
            </button>
            <button
              type="button"
              onClick={() => setModoOficina("diaria")}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95 ${
                modoOficina === "diaria"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Hammer className="w-4 h-4" />
              <span>2. Empreitada / Obra Longa (Dias) 🏗️</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* PAINEL ESQUERDO: CONFIGURAÇÃO DO SERVIÇO */}
            <div className="lg:col-span-1 bg-slate-900/90 border border-white/10 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between text-amber-400 font-black text-xs uppercase tracking-wider border-b border-white/10 pb-2">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-4 h-4" />
                  {modoOficina === "rapido" ? "Serviço Rápido de Oficina" : "Empreitada / Retífica Longa"}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  {modoOficina === "rapido" ? "Minutos / Horas" : "Dias de Trabalho"}
                </span>
              </div>

              {/* PRESETS RÁPIDOS DE OFICINA COM RATEIO MECÂNICO + AJUDANTE + PEÇAS */}
              <div>
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Presets Rápidos de Oficina (1 Toque):
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {modoOficina === "rapido" ? (
                    [
                      { label: "🚗 Troca de Óleo + Filtro", nome: "Troca de Óleo e Filtro de Óleo", tMec: 30, tAjud: 10, pecas: 130, margP: 25, margM: 30 },
                      { label: "🛑 Pastilhas de Freio", nome: "Troca de Pastilhas e Sangria de Freio", tMec: 45, tAjud: 30, pecas: 120, margP: 25, margM: 35 },
                      { label: "⚙️ Correia Dentada", nome: "Troca de Correia Dentada e Tensor", tMec: 150, tAjud: 60, pecas: 260, margP: 20, margM: 35 },
                      { label: "🔩 Kit Embreagem", nome: "Troca de Embreagem e Atuador", tMec: 210, tAjud: 90, pecas: 380, margP: 20, margM: 35 },
                      { label: "🔌 Scanner & Injeção", nome: "Diagnóstico Computadorizado / Scanner", tMec: 30, tAjud: 0, pecas: 0, margP: 0, margM: 40 },
                      { label: "🔋 Bateria & Alternador", nome: "Troca de Bateria e Teste do Alternador", tMec: 25, tAjud: 10, pecas: 340, margP: 20, margM: 30 }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setServicoNome(preset.nome);
                          setTempoMecanicoMin(preset.tMec);
                          setTempoAjudanteMin(preset.tAjud);
                          setCustoPecasServico(preset.pecas);
                          setMargemPecasPct(preset.margP);
                          setMargemMaoDeObraPct(preset.margM);
                          showNotification(`Preset "${preset.label}" aplicado! 🚗🔧`, "info");
                        }}
                        className="px-2 py-1.5 min-h-[38px] bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/5 rounded-lg text-left text-[10px] text-amber-300 hover:text-white truncate transition-all touch-manipulation cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))
                  ) : (
                    [
                      { label: "🔧 Retífica de Motor", nome: "Retífica Completa de Motor", cobrado: 2200, dias: 3, ajudantes: 1, diaria: 90, marmita: 25 },
                      { label: "🔨 Funilaria & Pintura", nome: "Funilaria e Pintura Geral", cobrado: 1800, dias: 4, ajudantes: 1, diaria: 90, marmita: 25 },
                      { label: "🧱 Reforma de Alvenaria", nome: "Reforma de Alvenaria / Pedreiro", cobrado: 3500, dias: 5, ajudantes: 2, diaria: 90, marmita: 30 },
                      { label: "⚡ Elétrica Completa", nome: "Revisão e Chicote Elétrico Geral", cobrado: 950, dias: 2, ajudantes: 1, diaria: 80, marmita: 25 }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setServicoNome(preset.nome);
                          setValorCobrado(preset.cobrado);
                          setDiasGastos(preset.dias);
                          setNumAjudantes(preset.ajudantes);
                          setDiariaAjudante(preset.diaria);
                          setGastoMarmitaDia(preset.marmita);
                          showNotification(`Preset "${preset.label}" aplicado! 🏗️`, "info");
                        }}
                        className="px-2 py-1.5 min-h-[38px] bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/5 rounded-lg text-left text-[10px] text-amber-300 hover:text-white truncate transition-all touch-manipulation cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* NOME DO SERVIÇO */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Serviço / Reparo:
                </label>
                <input
                  type="text"
                  value={servicoNome}
                  onChange={(e) => setServicoNome(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-amber-400"
                />
              </div>

              {modoOficina === "rapido" ? (
                /* INPUTS DO MODO RÁPIDO (MINUTOS DE CADA UM E PEÇAS) */
                <div className="space-y-3.5">
                  {/* Tempo Mecânico vs Ajudante */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-white/5">
                    <div>
                      <label className="text-[9.5px] font-black text-amber-300 uppercase tracking-wider block mb-1">
                        👨‍🔧 Mecânico (Minutos):
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTempoMecanicoMin(Math.max(10, tempoMecanicoMin - 15))}
                          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-center font-mono font-bold text-xs text-white">{tempoMecanicoMin} min</span>
                        <button
                          type="button"
                          onClick={() => setTempoMecanicoMin(tempoMecanicoMin + 15)}
                          className="w-8 h-8 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-400 block text-center mt-1">
                        R$ {valorHoraMecanico}/h ({formatCurrency((tempoMecanicoMin / 60) * valorHoraMecanico)})
                      </span>
                    </div>

                    <div>
                      <label className="text-[9.5px] font-black text-blue-300 uppercase tracking-wider block mb-1">
                        🤝 Ajudante (Minutos):
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTempoAjudanteMin(Math.max(0, tempoAjudanteMin - 15))}
                          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-center font-mono font-bold text-xs text-white">{tempoAjudanteMin} min</span>
                        <button
                          type="button"
                          onClick={() => setTempoAjudanteMin(tempoAjudanteMin + 15)}
                          className="w-8 h-8 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-400 block text-center mt-1">
                        R$ {valorHoraAjudante}/h ({formatCurrency((tempoAjudanteMin / 60) * valorHoraAjudante)})
                      </span>
                    </div>
                  </div>

                  {/* Peças e Margem sobre Peças */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider">
                        Custo das Peças / Fluídos (R$):
                      </label>
                      <span className="text-xs font-mono font-black text-emerald-400">{formatCurrency(custoPecasServico)}</span>
                    </div>
                    <input
                      type="number"
                      value={custoPecasServico}
                      onChange={(e) => setCustoPecasServico(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white font-mono outline-none"
                    />
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => setCustoPecasServico(Math.max(0, custoPecasServico - 50))}
                        className="py-1 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg text-[9.5px] font-bold text-slate-300 border border-white/5 cursor-pointer"
                      >
                        -50
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustoPecasServico(Math.max(0, custoPecasServico - 20))}
                        className="py-1 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg text-[9.5px] font-bold text-slate-300 border border-white/5 cursor-pointer"
                      >
                        -20
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustoPecasServico(custoPecasServico + 20)}
                        className="py-1 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg text-[9.5px] font-bold text-slate-300 border border-white/5 cursor-pointer"
                      >
                        +20
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustoPecasServico(custoPecasServico + 50)}
                        className="py-1 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg text-[9.5px] font-bold text-slate-300 border border-white/5 cursor-pointer"
                      >
                        +50
                      </button>
                    </div>

                    <div className="flex justify-between items-center pt-1 text-[10px]">
                      <span className="text-slate-400">Margem sobre a Peça:</span>
                      <span className="font-mono font-bold text-amber-300">+{margemPecasPct}% (Venda: {formatCurrency(tempoDinheiroCalc.precoPecasVenda)})</span>
                    </div>
                  </div>

                  {/* Volume de Serviços no Dia */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Quantidade de Serviços Rápidos Feitos no Dia:
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setServicosRapidosPorDia(Math.max(1, servicosRapidosPorDia - 1))}
                        className="w-8 h-8 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="flex-1 text-center font-mono font-bold text-xs text-white">{servicosRapidosPorDia} serviços por dia</span>
                      <button
                        type="button"
                        onClick={() => setServicosRapidosPorDia(servicosRapidosPorDia + 1)}
                        className="w-8 h-8 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* INPUTS DO MODO OBRA LONGA (DIAS DE TRABALHO) */
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Valor Cobrado na Empreitada (R$):
                      </label>
                      <span className="text-xs font-mono font-black text-emerald-400">{formatCurrency(valorCobrado)}</span>
                    </div>
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
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDiasGastos(Math.max(1, diasGastos - 1))}
                          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-center font-mono font-bold text-xs text-white">{diasGastos}d</span>
                        <button
                          type="button"
                          onClick={() => setDiasGastos(diasGastos + 1)}
                          className="w-8 h-8 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Quantos Ajudantes:
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setNumAjudantes(Math.max(0, numAjudantes - 1))}
                          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-center font-mono font-bold text-xs text-white">{numAjudantes}</span>
                        <button
                          type="button"
                          onClick={() => setNumAjudantes(numAjudantes + 1)}
                          className="w-8 h-8 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PAINEL DIREITO: DIAGNÓSTICO FINANCEIRO & ORÇAMENTO OFICIAL */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900/90 border border-white/10 p-5 rounded-2xl text-white space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                      {modoOficina === "rapido" ? "Preço Justo ao Cliente (Sem Cobrar Preço Altíssimo)" : "Resultado da Empreitada"}
                    </span>
                    <h3 className="text-lg font-black text-white">
                      {servicoNome}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      {modoOficina === "rapido" ? "Preço Sugerido ao Cliente" : "Lucro Real do Serviço"}
                    </span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {formatCurrency(tempoDinheiroCalc.precoTotalServico)}
                    </span>
                  </div>
                </div>

                {/* RATEIO DA MÃO DE OBRA E PEÇAS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5">
                    <span className="text-[9px] text-amber-400 uppercase font-black block">Mecânico Especializado</span>
                    <span className="text-base font-black text-white font-mono mt-0.5 block">
                      {formatCurrency(tempoDinheiroCalc.custoTempoMecanico || 0)}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{tempoMecanicoMin} min de serviço</span>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5">
                    <span className="text-[9px] text-blue-400 uppercase font-black block">Auxiliar / Ajudante</span>
                    <span className="text-base font-black text-white font-mono mt-0.5 block">
                      {formatCurrency(tempoDinheiroCalc.custoTempoAjudante || 0)}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{tempoAjudanteMin} min desmontar/lavar</span>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5">
                    <span className="text-[9px] text-purple-400 uppercase font-black block">Peças / Fluídos (Venda)</span>
                    <span className="text-base font-black text-purple-300 font-mono mt-0.5 block">
                      {formatCurrency(tempoDinheiroCalc.precoPecasVenda || 0)}
                    </span>
                    <span className="text-[9px] text-emerald-400 block mt-0.5">Lucro: +{formatCurrency(tempoDinheiroCalc.lucroPecas || 0)}</span>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5">
                    <span className="text-[9px] text-emerald-400 uppercase font-black block">Lucro Limpo Deste Serviço</span>
                    <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                      {formatCurrency(tempoDinheiroCalc.lucroReal)}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Margem: {tempoDinheiroCalc.margemRealPct.toFixed(0)}%</span>
                  </div>
                </div>

                {/* PROJEÇÃO DO DIA DA OFICINA (MÚLTIPLOS SERVIÇOS) */}
                <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-950/80 to-emerald-950/40 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Projeção do Caixa do Dia ({servicosRapidosPorDia} Serviços Concluídos):
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      Entrada no Caixa: <strong className="text-white font-black">{formatCurrency(tempoDinheiroCalc.faturamentoDiaProjetado || 0)}</strong>
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-white/10 flex-wrap gap-2">
                    <span className="text-xs text-slate-300">
                      Lucro Líquido Real que SOBRA LIMPO no Bolso do Dono hoje:
                    </span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {formatCurrency(tempoDinheiroCalc.lucroLimpoDiaProjetado || 0)} / dia
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Cobrando <strong>{formatCurrency(tempoDinheiroCalc.precoTotalServico)}</strong> por serviço rápido (preço justo que qualquer cliente aceita pagar sem reclamar), atendendo {servicosRapidosPorDia} carros no dia, a oficina fatura bem e você não toma prejuízo!
                  </p>
                </div>

                {/* BOTÕES DE COMPARTILHAMENTO DE ORÇAMENTO / OS */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `🔧 *ORDEM DE SERVIÇO & ORÇAMENTO - OFICINA MECÂNICA*\n` +
                        `🚗 *Serviço:* ${servicoNome}\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `👨‍🔧 *Mão de Obra do Mecânico:* ${formatCurrency(tempoDinheiroCalc.custoTempoMecanico || 0)} (${tempoMecanicoMin} min)\n` +
                        (tempoAjudanteMin > 0 ? `🤝 *Ajudante / Desmontagem:* ${formatCurrency(tempoDinheiroCalc.custoTempoAjudante || 0)} (${tempoAjudanteMin} min)\n` : "") +
                        (custoPecasServico > 0 ? `⚙️ *Peças & Fluídos Aplicados:* ${formatCurrency(tempoDinheiroCalc.precoPecasVenda || 0)}\n` : "") +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `💰 *VALOR TOTAL DO SERVIÇO:* ${formatCurrency(tempoDinheiroCalc.precoTotalServico)}\n` +
                        `📅 *Data:* ${new Date().toLocaleDateString("pt-BR")}\n\n` +
                        `_Oficina Mecânica Especializada • Gestão Inteligente_`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                      showNotification("Orçamento de oficina pronto para envio no WhatsApp! 📱", "success");
                    }}
                    className="flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 touch-manipulation min-h-[44px]"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Enviar Orçamento no WhatsApp 📲</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="py-3 px-4 bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-600/20 touch-manipulation min-h-[44px]"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir OS da Oficina 🖨️</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 4: BAR, DOSES DE 51 & BALDES DE CERVEJA */}
      {/* ========================================== */}
      {activeTab === "bar_doses" && (
        <div className="space-y-4 text-left">
          {/* PRESETS RÁPIDOS DE BEBIDAS DO BAR */}
          <div className="bg-slate-900/90 border border-white/10 p-3.5 rounded-2xl">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Cardápio Rápido do Bar com 1 Toque:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { label: "🥃 Cachaça 51", nome: "Cachaça 51 (965ml)", garrafa: 16.50, dose: 4.00, doses: 18, fardo: 48, avulso: 7, balde: 25, qtd: 4 },
                { label: "🥃 Velho Barreiro", nome: "Velho Barreiro (910ml)", garrafa: 15.00, dose: 3.50, doses: 18, fardo: 48, avulso: 7, balde: 25, qtd: 4 },
                { label: "🥃 Dreher / Conhaque", nome: "Dreher / Conhaque (900ml)", garrafa: 22.00, dose: 5.00, doses: 16, fardo: 48, avulso: 7, balde: 25, qtd: 4 },
                { label: "🍸 Vodka Smirnoff", nome: "Vodka Smirnoff (998ml)", garrafa: 42.00, dose: 8.00, doses: 18, fardo: 48, avulso: 7, balde: 25, qtd: 4 },
                { label: "🥃 Whisky Red Label", nome: "Whisky Red Label (1L)", garrafa: 92.00, dose: 15.00, doses: 18, fardo: 48, avulso: 7, balde: 25, qtd: 4 },
                { label: "🍺 Balde 4 Cracudinhas", nome: "Balde 4 Cracudinhas", garrafa: 16.50, dose: 4.00, doses: 18, fardo: 38.00, avulso: 5.00, balde: 18.00, qtd: 4 },
                { label: "🍺 Balde 5 Litrinhos", nome: "Balde 5 Litrinhos", garrafa: 16.50, dose: 4.00, doses: 18, fardo: 45.00, avulso: 6.00, balde: 26.00, qtd: 5 }
              ].map((b, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setBebidaNome(b.nome);
                    setPrecoGarrafa(b.garrafa);
                    setPrecoDoseVenda(b.dose);
                    setDosesServidasContador(b.doses);
                    setFardoPreco(b.fardo);
                    setPrecoAvulso(b.avulso);
                    setPrecoBaldePromo(b.balde);
                    setQtdBalde(b.qtd);
                    showNotification(`Preset "${b.label}" carregado! 🍻`, "info");
                  }}
                  className="px-2 py-2 min-h-[38px] bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/5 rounded-lg text-left text-[10px] text-emerald-300 hover:text-white truncate transition-all touch-manipulation cursor-pointer"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CALCULADORA DE DOSES DE 51 COM CHORINHO */}
            <div className="bg-slate-900/90 border border-white/10 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Wine className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-white">
                    {bebidaNome}
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full">
                  O Teste da Garrafa Real
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">
                      Preço da Garrafa:
                    </label>
                    <span className="text-xs font-mono font-bold text-white">{formatCurrency(precoGarrafa)}</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    value={precoGarrafa}
                    onChange={(e) => setPrecoGarrafa(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setPrecoGarrafa(Math.max(1, precoGarrafa - 1))}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[10px] font-bold border border-white/5 touch-manipulation"
                    >
                      - R$1
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrecoGarrafa(precoGarrafa + 1)}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[10px] font-bold border border-white/5 touch-manipulation"
                    >
                      + R$1
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">
                      Dose no Balcão:
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400">{formatCurrency(precoDoseVenda)}</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    value={precoDoseVenda}
                    onChange={(e) => setPrecoDoseVenda(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono outline-none"
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setPrecoDoseVenda(Math.max(0.5, precoDoseVenda - 0.5))}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[10px] font-bold border border-white/5 touch-manipulation"
                    >
                      - 0,50
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrecoDoseVenda(precoDoseVenda + 0.5)}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[10px] font-bold border border-white/5 touch-manipulation"
                    >
                      + 0,50
                    </button>
                  </div>
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
                    className="px-4 py-3 min-h-[48px] min-w-[54px] bg-slate-700 hover:bg-slate-600 active:scale-95 rounded-xl font-mono font-black text-lg text-white cursor-pointer touch-manipulation flex items-center justify-center"
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
                    className="px-4 py-3 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl font-mono font-black text-base text-white cursor-pointer touch-manipulation flex items-center justify-center gap-1 shadow-lg shadow-emerald-600/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>1 Dose</span>
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
                  <Beer className="w-5 h-5 text-amber-400" />
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
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setFardoPreco(Math.max(1, fardoPreco - 2))}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[10px] font-bold border border-white/5 touch-manipulation"
                    >
                      - R$2
                    </button>
                    <button
                      type="button"
                      onClick={() => setFardoPreco(fardoPreco + 2)}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[10px] font-bold border border-white/5 touch-manipulation"
                    >
                      + R$2
                    </button>
                  </div>
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
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setPrecoAvulso(Math.max(0.5, precoAvulso - 0.5))}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[10px] font-bold border border-white/5 touch-manipulation"
                    >
                      - 0,50
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrecoAvulso(precoAvulso + 0.5)}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[10px] font-bold border border-white/5 touch-manipulation"
                    >
                      + 0,50
                    </button>
                  </div>
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
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setPrecoBaldePromo(Math.max(1, precoBaldePromo - 1))}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[10px] font-bold border border-white/5 touch-manipulation"
                    >
                      - R$1
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrecoBaldePromo(precoBaldePromo + 1)}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[10px] font-bold border border-white/5 touch-manipulation"
                    >
                      + R$1
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Cervejas no Balde (un):
                  </label>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setQtdBalde(Math.max(1, qtdBalde - 1))}
                      className="w-9 h-9 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-sm text-white">{qtdBalde} un</span>
                    <button
                      type="button"
                      onClick={() => setQtdBalde(qtdBalde + 1)}
                      className="w-9 h-9 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold rounded-lg touch-manipulation flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-xl border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{qtdBalde} garrafas avulsas a {formatCurrency(precoAvulso)} dariam:</span>
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

              {/* BOTÃO TOUCH DE WHATSAPP DO BAR */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const text = `🍻 *TABELA DE PREÇOS DO BALCÃO & BAR*\n` +
                      `🥃 *${bebidaNome}:* ${formatCurrency(precoDoseVenda)} a dose\n` +
                      `🍺 *Balde com ${qtdBalde} Cervejas + Gelo:* ${formatCurrency(precoBaldePromo)}\n` +
                      `🍺 *Cerveja Avulsa:* ${formatCurrency(precoAvulso)}\n` +
                      `📅 *Atualizado em:* ${new Date().toLocaleDateString("pt-BR")}\n\n` +
                      `_Calculadora Cérebro Inteligente - Bar & Adega_`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                    showNotification("Abrindo WhatsApp para enviar cardápio...", "info");
                  }}
                  className="w-full py-3 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 touch-manipulation min-h-[44px]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartilhar Preços do Bar no WhatsApp 📱</span>
                </button>
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
