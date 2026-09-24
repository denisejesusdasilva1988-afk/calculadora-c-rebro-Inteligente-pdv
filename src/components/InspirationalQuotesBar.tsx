import React, { useState, useEffect } from "react";
import { Sparkles, Heart, Quote, RefreshCw } from "lucide-react";

interface InspirationalQuote {
  quote: string;
  author: string;
  tag: "Fé & Palavra" | "Poder da Mente" | "Sabedoria & Filosofia" | "Prosperidade & Sucesso";
}

const INSPIRATIONAL_QUOTES: InspirationalQuote[] = [
  {
    quote: "Consagra ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos.",
    author: "Provérbios 16:3",
    tag: "Fé & Palavra"
  },
  {
    quote: "Tudo o que a mente humana pode conceber e acreditar, ela pode conquistar. Cultive pensamentos de vitória.",
    author: "Napoleon Hill (O Poder da Mente)",
    tag: "Poder da Mente"
  },
  {
    quote: "O trabalho digno e honesto engrandece a alma. Faça o que precisa ser feito com amor e excelência todos os dias.",
    author: "Sabedoria Milenar",
    tag: "Prosperidade & Sucesso"
  },
  {
    quote: "Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.",
    author: "Josué 1:9",
    tag: "Fé & Palavra"
  },
  {
    quote: "A mente que se abre a uma nova ideia jamais voltará ao seu tamanho original. Acredite na sua capacidade de crescer.",
    author: "Albert Einstein",
    tag: "Poder da Mente"
  },
  {
    quote: "A bênção do Senhor enriquece, e não acrescenta dores. Trabalhe com retidão e o fruto virá.",
    author: "Provérbios 10:22",
    tag: "Fé & Palavra"
  },
  {
    quote: "Você tem poder sobre sua mente, não sobre os acontecimentos externos. Perceba isso e você encontrará grande força.",
    author: "Marco Aurélio",
    tag: "Sabedoria & Filosofia"
  },
  {
    quote: "Tudo posso naquele que me fortalece. Nenhuma batalha é grande demais para quem persevera com fé.",
    author: "Filipenses 4:13",
    tag: "Fé & Palavra"
  },
  {
    quote: "A persistência é o caminho do êxito. Cada cliente atendido com carinho é uma semente de prosperidade plantada.",
    author: "O Poder da Mente",
    tag: "Prosperidade & Sucesso"
  },
  {
    quote: "O coração em paz dá vida ao corpo, e a mente focada no bem atrai a abundância e afasta o medo.",
    author: "Provérbios 14:30",
    tag: "Fé & Palavra"
  },
  {
    quote: "Não espere o momento perfeito. Comece com o que você tem, onde você está, e faça o seu melhor.",
    author: "Arthur Ashe",
    tag: "Poder da Mente"
  },
  {
    quote: "O segredo do progresso é começar com fé, manter o foco na meta e agradecer por cada vitória diária.",
    author: "Fé & Razão",
    tag: "Prosperidade & Sucesso"
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
    "Prosperidade & Sucesso": "bg-amber-500/15 text-amber-300 border-amber-500/30"
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
