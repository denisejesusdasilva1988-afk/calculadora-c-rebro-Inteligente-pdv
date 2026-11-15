import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
  X,
  Info
} from "lucide-react";

interface PlasticRecyclingGuidePanelProps {
  onJumpToScaleCategory?: (materialId: string) => void;
}

type GuideFilterGroup =
  | "todos"
  | "mercado"
  | "ovos_uvas"
  | "limpeza"
  | "eletronicos_casa";

interface MarketProductGuideItem {
  id: string;
  product: string;
  emoji: string;
  group: Exclude<GuideFilterGroup, "todos">;
  plasticType: "PET (Código 1)" | "Plástico Duro (PEAD 2 / PP 5)" | "Alto Impacto (PS / PSAI 6)" | "Atenção / Conferir Fundo";
  materialIdTarget: string;
  materialLabel: string;
  howToIdentify: string;
  yardTip: string;
}

const MARKET_PRODUCTS_GUIDE: MarketProductGuideItem[] = [
  {
    id: "prod_uva_morango",
    product: "Caixas plásticas transparentes de Uvas, Morango e Tomate-cereja",
    emoji: "🍇",
    group: "ovos_uvas",
    plasticType: "PET (Código 1)",
    materialIdTarget: "scrap_pet",
    materialLabel: "PET (Garrafas PET)",
    howToIdentify:
      "Bandeja transparente brilhante (tipo 'abre e fecha'). Na maioria das vezes tem o número 1 (PET) gravado no fundo e dobra sem rachar seco.",
    yardTip:
      "Isso é PET Termoformado (Bandeja). Alguns compradores pagam preço de 'PET Misto/Bandeja' diferente da garrafa de refrigerante — vale separar ou confirmar antes de misturar no fardo de PET Cristal."
  },
  {
    id: "prod_ovos_fino",
    product: "Plásticos finos de Ovos (Caixinhas transparentes de 6, 12 ou 20 ovos)",
    emoji: "🥚",
    group: "ovos_uvas",
    plasticType: "Atenção / Conferir Fundo",
    materialIdTarget: "scrap_pet",
    materialLabel: "PET ou Alto Impacto (conferir)",
    howToIdentify:
      "Faça o Teste da Dobra: se dobrar sem quebrar fácil e tiver símbolo 1, é PET. Se dobrar e RACHAR fazendo 'crec' e ficando branco na dobra (ou tiver símbolo 6), é Alto Impacto (PS)! Se tiver símbolo 3, é PVC.",
    yardTip:
      "Nunca misture caixa de ovo de PVC (3) ou PS (6) dentro do saco de PET garrafa, porque estraga o lote."
  },
  {
    id: "prod_ketchup_mostarda",
    product: "Frascos de Ketchup e Mostarda (tipo squeeze que aperta)",
    emoji: "🍅",
    group: "mercado",
    plasticType: "Atenção / Conferir Fundo",
    materialIdTarget: "scrap_plastico_duro",
    materialLabel: "PET (1) ou Plástico Duro PP/PEAD (2/5)",
    howToIdentify:
      "Olhe embaixo do frasco: marcas transparentes brilhosas (ex: frasco cristal que volta rápido) costumam ser PET (1). Frascos opacos/foscos coloridos (vermelho/amarelo fosco) costumam ser PP (5) ou PEAD (2) — Plástico Duro.",
    yardTip:
      "Sempre esvazie ou passe uma água rápida para tirar resto de molho. A tampinha flip-top é quase sempre PP (Plástico Duro)!"
  },
  {
    id: "prod_maionese",
    product: "Potes de Maionese (tradicional branco ou pote transparente novo)",
    emoji: "🥣",
    group: "mercado",
    plasticType: "Plástico Duro (PEAD 2 / PP 5)",
    materialIdTarget: "scrap_plastico_duro",
    materialLabel: "Plásticos Duros (PEAD / PP)",
    howToIdentify:
      "O pote tradicional branco/leitoso é PP (Código 5 — Plástico Duro). Já os potes novos 100% transparentes estilo vidro são PET (Código 1). A tampa colorida é sempre PP/PEAD (Plástico Duro).",
    yardTip:
      "Retire o excesso de maionese e o lacre de alumínio da boca antes de pesar."
  },
  {
    id: "prod_potes_doces",
    product: "Potes de Doces (doce de leite, goiabada, sorvete, paçoca, açaí)",
    emoji: "🍮",
    group: "mercado",
    plasticType: "Plástico Duro (PEAD 2 / PP 5)",
    materialIdTarget: "scrap_plastico_duro",
    materialLabel: "Plásticos Duros (PEAD / PP)",
    howToIdentify:
      "Potes brancos, coloridos ou foscos de sorvete/doce de leite/goiabada são PP (5 - Plástico Duro). Já potes 100% transparentes duros com boca de rosca larga (tipo pote de paçoca/mel/bala) costumam ser PET (1).",
    yardTip:
      "Pote de sorvete e tampa são um dos melhores plásticos duros (PP limpo) para prensar!"
  },
  {
    id: "prod_margarina",
    product: "Potes de Margarina, Manteiga e Requeijão",
    emoji: "🧈",
    group: "mercado",
    plasticType: "Plástico Duro (PEAD 2 / PP 5)",
    materialIdTarget: "scrap_plastico_duro",
    materialLabel: "Plásticos Duros (PEAD / PP)",
    howToIdentify:
      "Quase 100% dos potes de margarina e suas tampas têm o número 5 (PP — Polipropileno). São firmes, não racham fácil e boiam na água.",
    yardTip:
      "Plástico Duro (PP) excelente. Só cuide para não ter restos pesados de comida dentro."
  },
  {
    id: "prod_iogurte",
    product: "Potinhos de Iogurte, Danone, Chambinho e Sobremesa Láctea",
    emoji: "🥛",
    group: "mercado",
    plasticType: "Alto Impacto (PS / PSAI 6)",
    materialIdTarget: "scrap_alto_impacto",
    materialLabel: "Plásticos Alto Impacto (PS / PSAI)",
    howToIdentify:
      "A maioria das bandejinhas que destacam 4 ou 6 potinhos juntos quebra seco ao dobrar ('crec') e tem código 6 (PS — Alto Impacto). Garrafinhas maiores de iogurte (tipo 1L) geralmente já são PEAD (2) ou PP (5).",
    yardTip:
      "Se quebrar seco ao apertar/dobrar, separe no Alto Impacto (PS) — não misture com balde/margarina (PP)."
  },
  {
    id: "prod_refri_agua_oleo",
    product: "Garrafas de Refrigerante, Água Mineral, Suco e Óleo de Cozinha",
    emoji: "🧴",
    group: "mercado",
    plasticType: "PET (Código 1)",
    materialIdTarget: "scrap_pet",
    materialLabel: "PET (Garrafas PET)",
    howToIdentify:
      "Transparente, verde ou azul com um pontinho redondo ('umbigo') no meio do fundo e símbolo 1 (PET). Garrafa de óleo também é PET, mas engordurada.",
    yardTip:
      "Separe PET Cristal (transparente) de PET Verde e de PET Óleo quando puder — PET Cristal limpo vale mais! Tire as tampinhas porque as tampinhas são Plástico Duro (PEAD/PP)."
  },
  {
    id: "prod_limpeza",
    product: "Galões de Água Sanitária (Qboa), Amaciante, Sabão Líquido, Shampoo",
    emoji: "🧼",
    group: "limpeza",
    plasticType: "Plástico Duro (PEAD 2 / PP 5)",
    materialIdTarget: "scrap_plastico_duro",
    materialLabel: "Plásticos Duros (PEAD / PP)",
    howToIdentify:
      "Frasco grosso opaco com uma linha reta/costura de solda atravessando o fundo (sopro). Tem símbolo 2 (PEAD / HDPE). A tampa geralmente é PP (5).",
    yardTip:
      "É o 'Plástico Duro Sopro (PEAD)' clássico de todo ferro-velho — muito valorizado!"
  },
  {
    id: "prod_baldes_cadeiras",
    product: "Baldes, Bacias, Cestos, Engradados de Cerveja e Cadeiras Plásticas",
    emoji: "🪣",
    group: "limpeza",
    plasticType: "Plástico Duro (PEAD 2 / PP 5)",
    materialIdTarget: "scrap_plastico_duro",
    materialLabel: "Plásticos Duros (PEAD / PP)",
    howToIdentify:
      "Plástico grosso e rígido, geralmente com marca de ponto de injeção no fundo e código 5 (PP) ou 2 (PEAD). Não quebra seco facilmente ao dobrar a borda.",
    yardTip:
      "Retire a alça de ferro dos baldes de obra antes de pesar como plástico duro puro (o ferro da alça vai para o Ferro!)."
  },
  {
    id: "prod_geladeira_eletro",
    product: "Partes brancas internas de Geladeira, Carcaça de Impressora / TV / Monitor",
    emoji: "❄️",
    group: "eletronicos_casa",
    plasticType: "Alto Impacto (PS / PSAI 6)",
    materialIdTarget: "scrap_alto_impacto",
    materialLabel: "Plásticos Alto Impacto (PS / PSAI)",
    howToIdentify:
      "O forro branco interno da porta da geladeira e muitas gavetas quebradiças são PSAI (Poliestireno Alto Impacto — código 6). Se dobrar um pedacinho na ponta, faz marca branca e quebra seco.",
    yardTip:
      "Carcaças de TV de tubo, computador e partes internas de geladeira vão para Alto Impacto (PSAI / ABS), separado do balde/bacia comum (PP)."
  },
  {
    id: "prod_cds_dvds_caixinhas",
    product: "CDs, DVDs e Caixinhas transparentes rígidas de CD/Acrílico fino",
    emoji: "💿",
    group: "eletronicos_casa",
    plasticType: "Alto Impacto (PS / PSAI 6)",
    materialIdTarget: "scrap_papeis_midias",
    materialLabel: "Papéis, CDs, DVDs e Livros",
    howToIdentify:
      "A caixinha transparente dura que trinca fácil ao apertar é PS Cristal (Alto Impacto código 6). Já o disco brilhante do CD/DVD em si é Policarbonato (código 7).",
    yardTip:
      "Os discos CDs e DVDs vão na categoria 'Papéis, CDs, DVDs e Livros'. Já as caixinhas rígidas quebradiças vão no 'Alto Impacto (PS)'!"
  },
  {
    id: "prod_isopor",
    product: "Bandejas de Isopor de Frios/Carne e Copinhos Descartáveis Rígidos",
    emoji: "🥡",
    group: "mercado",
    plasticType: "Alto Impacto (PS / PSAI 6)",
    materialIdTarget: "scrap_alto_impacto",
    materialLabel: "Plásticos Alto Impacto (PS / PSAI)",
    howToIdentify:
      "Copo descartável rígido transparente ou branco (que racha ao apertar) é PS (Código 6). Bandeja de isopor também é da família PS (EPS expandido).",
    yardTip:
      "Atenção: quase nenhum ferro-velho compra bandejinha de isopor suja de carne/frios junto com plástico duro — mantenha isopor separado e consulte seu comprador!"
  }
];

export const PlasticRecyclingGuidePanel: React.FC<PlasticRecyclingGuidePanelProps> = ({
  onJumpToScaleCategory
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<GuideFilterGroup>("todos");

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MARKET_PRODUCTS_GUIDE.filter((item) => {
      if (groupFilter !== "todos" && item.group !== groupFilter) return false;
      if (!q) return true;
      const text = `${item.product} ${item.plasticType} ${item.howToIdentify} ${item.yardTip}`.toLowerCase();
      return text.includes(q);
    });
  }, [searchQuery, groupFilter]);

  return (
    <div className="space-y-6 text-left">
      {/* CABEÇALHO DO GUIA */}
      <div className="bg-slate-900 border border-cyan-500/35 rounded-3xl p-5 sm:p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/35">
            Guia Prático de Balcão • D.W Reciclagem
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            PET vs Plástico Duro vs Alto Impacto
          </span>
        </div>
        <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400 shrink-0" />
          Como Separar Plásticos e Embalagens de Mercado Sem Erro
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Explicação direta para usar no portão: o que é <strong>PET</strong>, o que é <strong>Plástico Duro (PEAD / PP)</strong>, o que é <strong>Alto Impacto (PS)</strong> e onde entra cada embalagem do dia a dia (doces, ketchup, mostarda, maionese, ovos, uvas, geladeira e limpeza).
        </p>
      </div>

      {/* OS 3 GRANDES GRUPOS DETALHADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. PET */}
        <div className="bg-slate-900 border-2 border-sky-500/40 rounded-3xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-3xl p-2 bg-sky-500/15 rounded-2xl border border-sky-500/30">🧴</span>
            <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
              CÓDIGO 1 • PET
            </span>
          </div>
          <h4 className="text-base font-black text-white">1. O que é Plástico PET?</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            É o plástico das <strong>garrafas transparentes, verdes e azuis</strong> (refrigerante, água, suco, óleo) e também de muitas <strong>bandejas transparentes fininhas de mercado</strong> (uvas, morangos, alguns potes cristal e embalagens de ovos).
          </p>
          <div className="p-3 bg-slate-950 rounded-2xl border border-white/10 space-y-1.5 text-[11.5px] text-slate-300">
            <div className="font-black text-sky-300">🔍 Como reconhecer na hora:</div>
            <ul className="space-y-1 list-disc pl-4">
              <li><strong>Umbigo no fundo:</strong> garrafa PET soprada tem um pontinho redondo bem no centro do fundo.</li>
              <li><strong>Brilho e transparência:</strong> parece um "vidro leve" e volta quando aperta.</li>
              <li><strong>Teste da água:</strong> o PET <strong>afunda na água</strong>.</li>
              <li><strong>Dica de lucro:</strong> tire a tampinha (a tampa vai para Plástico Duro!). Separe PET Cristal de PET Óleo se o seu comprador pagar mais pelo limpo.</li>
            </ul>
          </div>
          {onJumpToScaleCategory && (
            <button
              type="button"
              onClick={() => onJumpToScaleCategory("scrap_pet")}
              className="w-full min-h-[44px] bg-sky-500/20 hover:bg-sky-500 hover:text-slate-950 text-sky-200 font-black text-xs uppercase rounded-xl border border-sky-500/40 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 transition-all"
            >
              <Scale className="w-4 h-4" />
              <span>Pesar no PET</span>
            </button>
          )}
        </div>

        {/* 2. PLÁSTICO DURO (PEAD 2 / PP 5) */}
        <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-3xl p-2 bg-emerald-500/15 rounded-2xl border border-emerald-500/30">🪣</span>
            <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              CÓDIGOS 2 & 5 • PEAD / PP
            </span>
          </div>
          <h4 className="text-base font-black text-white">2. O que é Plástico Duro?</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            No ferro-velho, "Plástico Duro" reúne dois plásticos primos muito fortes: o <strong>PEAD (Código 2 - Sopro)</strong> e o <strong>PP (Código 5 - Injetado)</strong>. Eles são firmes, opacos ou leitosos, e <strong>dobram sem quebrar seco</strong>.
          </p>
          <div className="p-3 bg-slate-950 rounded-2xl border border-white/10 space-y-1.5 text-[11.5px] text-slate-300">
            <div className="font-black text-emerald-300">🔍 Os 2 tipos dentro do Plástico Duro:</div>
            <ul className="space-y-1 list-disc pl-4">
              <li><strong>PEAD (Código 2 - Sopro):</strong> tem uma <strong>linha/costura reta no fundo</strong> — galão de água sanitária, amaciante, sabão líquido, shampoo, engradado, tampa de garrafa.</li>
              <li><strong>PP (Código 5 - Pote/Balde):</strong> pote de margarina, pote de doce/sorvete, maionese tradicional, baldes, bacias, cadeiras e tampas de potes.</li>
              <li><strong>Teste da água:</strong> tanto PEAD quanto PP <strong>BOIAM na água</strong>!</li>
            </ul>
          </div>
          {onJumpToScaleCategory && (
            <button
              type="button"
              onClick={() => onJumpToScaleCategory("scrap_plastico_duro")}
              className="w-full min-h-[44px] bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-200 font-black text-xs uppercase rounded-xl border border-emerald-500/40 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 transition-all"
            >
              <Scale className="w-4 h-4" />
              <span>Pesar no Plástico Duro</span>
            </button>
          )}
        </div>

        {/* 3. ALTO IMPACTO (PS / PSAI 6) */}
        <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-3xl p-2 bg-amber-500/15 rounded-2xl border border-amber-500/30">🥛</span>
            <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              CÓDIGO 6 • PS / PSAI
            </span>
          </div>
          <h4 className="text-base font-black text-white">3. O que é Alto Impacto?</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            É o <strong>Poliestireno Alto Impacto (PSAI ou PS — Código 6)</strong>. Ele parece plástico duro por fora, mas é <strong>quebradiço</strong>! É o famoso plástico de <strong>potinho de iogurte/Danone, copo descartável rígido e forro interno branco de geladeira</strong>.
          </p>
          <div className="p-3 bg-slate-950 rounded-2xl border border-white/10 space-y-1.5 text-[11.5px] text-slate-300">
            <div className="font-black text-amber-300">🔍 Como reconhecer na hora (Regra de Ouro):</div>
            <ul className="space-y-1 list-disc pl-4">
              <li><strong>Teste da Dobra ("Faz Crec"):</strong> dobrou com força? Ele <strong>esbranquiça na dobra e RACHA / QUEBRA seco</strong>! (O PP/PEAD dobra sem quebrar).</li>
              <li><strong>Onde aparece:</strong> potinhos de iogurte, copos descartáveis, gavetas/forro da porta da geladeira, carcaça de impressora/TV antiga, caixinha dura de CD.</li>
              <li><strong>Por que separar:</strong> ele <strong>afunda na água</strong> e estraga o lote se cair junto com balde/margarina (PP/PEAD).</li>
            </ul>
          </div>
          {onJumpToScaleCategory && (
            <button
              type="button"
              onClick={() => onJumpToScaleCategory("scrap_alto_impacto")}
              className="w-full min-h-[44px] bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-200 font-black text-xs uppercase rounded-xl border border-amber-500/40 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 transition-all"
            >
              <Scale className="w-4 h-4" />
              <span>Pesar no Alto Impacto</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 TESTES RÁPIDOS DE PORTÃO + TABELA 1 A 7 */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h4 className="text-base font-black text-white">
            3 Testes Rápidos no Portão + Tabela dos Números (1 a 7)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-cyan-500/25 space-y-1">
            <div className="text-xs font-black text-cyan-300">1️⃣ Teste da Dobra ("Faz Crec?")</div>
            <p className="text-xs text-slate-300">
              Dobrou e <strong>rachou seco</strong> fazendo barulho = <strong>Alto Impacto (PS 6)</strong>. Dobrou firme e <strong>não quebrou</strong> = <strong>Plástico Duro (PP 5 / PEAD 2)</strong>.
            </p>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-emerald-500/25 space-y-1">
            <div className="text-xs font-black text-emerald-300">2️⃣ Teste do Fundo da Embalagem</div>
            <p className="text-xs text-slate-300">
              Tem <strong>pontinho redondo no meio</strong> + transparente = <strong>PET (1)</strong>. Tem <strong>linha reta de solda</strong> + opaco = <strong>PEAD (2)</strong>.
            </p>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-amber-500/25 space-y-1">
            <div className="text-xs font-black text-amber-300">3️⃣ Teste do Balde d'Água</div>
            <p className="text-xs text-slate-300">
              <strong>Boia na água:</strong> Plástico Duro (PEAD 2, PP 5) e Sacola (PEBD 4). <strong>Afunda na água:</strong> PET (1), Alto Impacto (PS 6) e PVC (3).
            </p>
          </div>
        </div>

        {/* Símbolos 1 a 7 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {[
            { num: "1", code: "PET", desc: "Garrafas, óleo, caixa de uva", color: "border-sky-500/40 text-sky-300" },
            { num: "2", code: "PEAD", desc: "Duro: cloro, amaciante, tampa", color: "border-emerald-500/40 text-emerald-300" },
            { num: "3", code: "PVC", desc: "Cano, filme. Não misturar!", color: "border-rose-500/40 text-rose-300" },
            { num: "4", code: "PEBD", desc: "Sacola, plástico mole/filme", color: "border-teal-500/40 text-teal-300" },
            { num: "5", code: "PP", desc: "Duro: margarina, doce, balde", color: "border-emerald-500/40 text-emerald-300" },
            { num: "6", code: "PS / PSAI", desc: "Alto Impacto: iogurte, geladeira", color: "border-amber-500/40 text-amber-300" },
            { num: "7", code: "OUTROS", desc: "CD/DVD, pacote metalizado", color: "border-slate-500/40 text-slate-300" }
          ].map((item) => (
            <div
              key={item.num}
              className={`p-2.5 bg-slate-950 rounded-xl border ${item.color} text-center space-y-0.5`}
            >
              <div className="text-lg font-mono font-black">♺ {item.num}</div>
              <div className="text-[11px] font-black">{item.code}</div>
              <div className="text-[10px] text-slate-400 leading-tight">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BUSCADOR DE PRODUTOS DO MERCADO */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
              Consulta Instantânea de Embalagens
            </span>
            <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
              <Layers className="w-5 h-5 text-emerald-400" />
              Produtos Normais do Mercado: O Que É Cada Um?
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {filteredProducts.length} exemplos prontos
          </span>
        </div>

        {/* Barra de busca e filtros */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o produto: ketchup, maionese, mostarda, ovo, uva, doce, iogurte, geladeira..."
              className="w-full min-h-[48px] bg-slate-950 border border-cyan-500/35 rounded-xl pl-10 pr-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "todos", label: "Todos os Produtos" },
                { id: "mercado", label: "🥫 Doces, Molhos & Mercado" },
                { id: "ovos_uvas", label: "🍇 Uvas, Ovos & Bandejas" },
                { id: "limpeza", label: "🧼 Limpeza, Baldes & Tampas" },
                { id: "eletronicos_casa", label: "❄️ Geladeira, TV, CD/DVD" }
              ] as const
            ).map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => setGroupFilter(grp.id)}
                className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-black border cursor-pointer touch-manipulation select-none active:scale-95 transition-all ${
                  groupFilter === grp.id
                    ? "bg-emerald-500 text-slate-950 border-emerald-400"
                    : "bg-slate-950 text-slate-300 border-white/10 hover:text-white"
                }`}
              >
                {grp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de cards explicativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredProducts.map((item) => {
            const badgeStyle =
              item.plasticType.startsWith("PET")
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                : item.plasticType.startsWith("Plástico Duro")
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : item.plasticType.startsWith("Alto Impacto")
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-rose-500/20 text-rose-200 border-rose-500/40";

            return (
              <div
                key={item.id}
                className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl p-2 bg-slate-900 rounded-xl shrink-0">{item.emoji}</span>
                      <div>
                        <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                          {item.plasticType}
                        </span>
                        <h5 className="text-sm font-black text-white mt-1 leading-snug">
                          {item.product}
                        </h5>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-white/5">
                    <div>
                      <strong className="text-cyan-300">Como conferir:</strong> {item.howToIdentify}
                    </div>
                    <div className="text-amber-200/95 flex items-start gap-1.5 pt-1 border-t border-white/5">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Dica no ferro-velho:</strong> {item.yardTip}
                      </span>
                    </div>
                  </div>
                </div>

                {onJumpToScaleCategory && (
                  <button
                    type="button"
                    onClick={() => onJumpToScaleCategory(item.materialIdTarget)}
                    className="w-full min-h-[42px] px-3 py-2 bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 font-black text-xs rounded-xl border border-cyan-500/35 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 transition-all"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Ir pesar em: {item.materialLabel}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-6 text-center bg-slate-950 rounded-2xl border border-white/10 text-slate-400 text-sm">
            Nenhum item encontrado para "{searchQuery}". Limpe a busca para ver todos os produtos do mercado!
          </div>
        )}

        {/* Alerta de plásticos sem valor / que não devem ser misturados */}
        <div className="p-4 bg-rose-950/30 border border-rose-500/35 rounded-2xl flex items-start gap-3 text-xs text-rose-100">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-black text-rose-300 uppercase">
              Atenção para não perder valor no lote:
            </div>
            <p className="leading-relaxed">
              <strong>1)</strong> Embalagens metalizadas (salgadinho, café a vácuo, biscoito brilhante por dentro) são <strong>BOPP / Laminado (Código 7)</strong> — quase nunca vão junto com PET ou Plástico Duro.{" "}
              <strong>2)</strong> Sacolas de mercado e pacotes transparentes moles de arroz/feijão são <strong>Plástico Mole / Filme (PEBD 4)</strong> — se juntar, separe do Plástico Duro!{" "}
              <strong>3)</strong> Galão de óleo de motor/veneno agrícola é contaminado e precisa ir separado do plástico duro limpo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
