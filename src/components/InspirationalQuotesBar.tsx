import React, { useState, useEffect } from "react";
import { Sparkles, Heart, Quote, RefreshCw } from "lucide-react";

interface InspirationalQuote {
  quote: string;
  author: string;
  tag: "Fé & Palavra" | "Poder da Mente" | "Sabedoria & Filosofia" | "Prosperidade & Sucesso" | "Ânimo & Coragem";
}

const INSPIRATIONAL_QUOTES: InspirationalQuote[] = [
  {
    quote: "Consagra ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos.",
    author: "Provérbios 16:3",
    tag: "Fé & Palavra"
  },
  {
    quote: "Dias de movimento calmo no balcão não definem o seu valor; são momentos de preparar o coração, organizar a casa e semear com amor para a colheita que vem amanhã.",
    author: "Força no Comércio & Sabedoria",
    tag: "Ânimo & Coragem"
  },
  {
    quote: "Tudo o que a mente humana pode conceber e acreditar, ela pode conquistar. Cultive pensamentos de vitória mesmo nos dias difíceis.",
    author: "Napoleon Hill (O Poder da Mente)",
    tag: "Poder da Mente"
  },
  {
    quote: "Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.",
    author: "Josué 1:9",
    tag: "Fé & Palavra"
  },
  {
    quote: "Não é porque as coisas são difíceis que não temos coragem; é porque não temos coragem que elas são difíceis. Levante a cabeça e siga em frente!",
    author: "Sêneca (Filósofo Estoico)",
    tag: "Sabedoria & Filosofia"
  },
  {
    quote: "Aqueles que esperam no Senhor renovam as suas forças. Voam alto como águias; correm e não ficam exaustos, andam e não se cansam.",
    author: "Isaías 40:31",
    tag: "Fé & Palavra"
  },
  {
    quote: "A persistência é o caminho do êxito. Cada cliente atendido com carinho, paciência e atenção é uma semente de prosperidade plantada.",
    author: "Mente Vencedora",
    tag: "Prosperidade & Sucesso"
  },
  {
    quote: "Você tem poder sobre sua mente, não sobre os acontecimentos externos. Mantenha a serenidade interior e nenhuma tempestade apagará a sua luz.",
    author: "Marco Aurélio (Meditações)",
    tag: "Sabedoria & Filosofia"
  },
  {
    quote: "Tudo posso naquele que me fortalece. Nenhuma batalha é grande demais para quem persevera com fé e trabalho honesto.",
    author: "Filipenses 4:13",
    tag: "Fé & Palavra"
  },
  {
    quote: "Quem observa apenas o vento nunca semeará, e o que olha para as nuvens nunca colherá. Faça a sua parte com fé hoje, independente do tempo!",
    author: "Eclesiastes 11:4",
    tag: "Fé & Palavra"
  },
  {
    quote: "Somos o que fazemos repetidamente. A excelência, a honestidade e a vitória diária não são um ato isolado, mas sim um hábito construído a cada manhã.",
    author: "Aristóteles",
    tag: "Sabedoria & Filosofia"
  },
  {
    quote: "O coração em paz dá vida ao corpo, e a mente focada no bem atrai a abundância e afasta todo medo ou desânimo.",
    author: "Provérbios 14:30",
    tag: "Fé & Palavra"
  },
  {
    quote: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento. Reconhece-o em teus passos e Ele endireitará os teus caminhos.",
    author: "Provérbios 3:5-6",
    tag: "Fé & Palavra"
  },
  {
    quote: "O rio atinge os seus objetivos porque aprendeu a contornar pedras e obstáculos. Jamais desanime diante da calmaria temporária de um dia.",
    author: "Reflexão Filosófica",
    tag: "Sabedoria & Filosofia"
  },
  {
    quote: "A bênção do Senhor é que enriquece, e Ele não acrescenta dores com ela. Trabalhe com retidão, atenda com verdade e o fruto virá.",
    author: "Provérbios 10:22",
    tag: "Fé & Palavra"
  },
  {
    quote: "Não espere o momento perfeito para ser grato e feliz. Comece com o que você tem nas mãos agora, onde você está, e dê o seu melhor.",
    author: "O Poder da Gratidão",
    tag: "Poder da Mente"
  },
  {
    quote: "Que a graça e a luz do Senhor estejam sobre nós; confirma e abençoa a obra de nossas mãos todos os dias!",
    author: "Salmos 90:17",
    tag: "Fé & Palavra"
  },
  {
    quote: "A paciência e a fé sustentam o comerciante prudente. Dias nublados também passam e o sol da prosperidade volta a brilhar.",
    author: "Sabedoria Prática",
    tag: "Ânimo & Coragem"
  }
];

export function InspirationalQuotesBar() {
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Escolhe uma frase baseada na hora atual do dia para trocar naturalmente a cada hora
    const hour = new Date().getHours();
    return hour % INSPIRATIONAL_QUOTES.length;
  });

  const [isAnimating, setIsAnimating] = useState(false);

  // Troca de mensagem a cada hora automaticamente
  useEffect(() => {
    const timer = setInterval(() => {
      const hour = new Date().getHours();
      setCurrentIndex(hour % INSPIRATIONAL_QUOTES.length);
    }, 1000 * 60 * 15); // Checa a cada 15 min

    return () => clearInterval(timer);
  }, []);

  const handleNextQuote = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % INSPIRATIONAL_QUOTES.length);
      setIsAnimating(false);
    }, 200);
  };

  const current = INSPIRATIONAL_QUOTES[currentIndex];

  const tagColors: Record<string, string> = {
    "Fé & Palavra": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    "Poder da Mente": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    "Sabedoria & Filosofia": "bg-purple-500/15 text-purple-300 border-purple-500/30",
    "Prosperidade & Sucesso": "bg-amber-500/15 text-amber-300 border-amber-500/30",
    "Ânimo & Coragem": "bg-rose-500/15 text-rose-300 border-rose-500/30"
  };

  return (
    <aside 
      aria-label="Palavra de Inspiração e Fé"
      className="w-full max-w-4xl mx-auto my-4 px-3"
    >
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/20 rounded-2xl p-3.5 sm:p-4 shadow-lg shadow-emerald-950/20 backdrop-blur-md relative overflow-hidden text-left transition-all">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                  <span>Palavra do Dia & Força Mental</span>
                  <Heart className="w-2.5 h-2.5 text-pink-400 fill-pink-400 inline" />
                </span>
                <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border ${tagColors[current.tag] || "text-slate-400"}`}>
                  {current.tag}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextQuote}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 rounded-lg text-[9.5px] font-bold uppercase tracking-wider transition-all border border-white/5 hover:border-emerald-500/30 cursor-pointer self-end sm:self-auto"
            title="Sortear nova frase de incentivo"
          >
            <RefreshCw className={`w-3 h-3 ${isAnimating ? "animate-spin" : ""}`} />
            <span>Outra Mensagem</span>
          </button>
        </div>

        <div className={`mt-2.5 transition-opacity duration-200 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
          <blockquote className="text-xs sm:text-sm text-slate-200 font-medium italic leading-relaxed flex items-start gap-1.5">
            <Quote className="w-3.5 h-3.5 text-emerald-400/60 shrink-0 mt-0.5" />
            <span>"{current.quote}"</span>
          </blockquote>
          <p className="text-right text-[10px] font-black uppercase text-emerald-400/90 tracking-wider mt-1.5">
            — {current.author}
          </p>
        </div>
      </div>
    </aside>
  );
}
