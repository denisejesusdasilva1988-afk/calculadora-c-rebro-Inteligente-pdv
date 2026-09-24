import os

file_path = './src/components/PDVModule.tsx'
content = open(file_path).read()

start_marker = '          {/* KPI: SAIDAS / SANGRIAS / GASTOS TOTAL */}'
end_marker = '      {/* 3.3 PAINEL DE MENTORIA ESTRATÉGICA & DIAGNÓSTICO DO COMÉRCIO (A CABEÇA DO DONO) */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

replacement = """          {/* KPI: SAIDAS / SANGRIAS / GASTOS TOTAL */}
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between min-h-[95px]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black uppercase text-slate-300 tracking-wider">Saídas & Despesas</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold font-mono text-rose-400 mt-1">
                -{formatCurrency(stats.totalOutflow)}
              </h3>
              <span className="text-[10.5px] font-bold uppercase text-slate-300 tracking-wide mt-1 block">
                Gasto operacional e sangria física
              </span>
            </div>
          </div>

        </div>
      )}

      {/* 3.2 CONTROLE DE TURNO & FECHAMENTO DIÁRIO CARD */}
      {!onlyCheckout && (
        <div id="pdv-shift-control-card" className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-5 mb-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isCashRegisterOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'} shrink-0`}>
              {isCashRegisterOpen ? <Unlock className="w-5 h-5 animate-pulse" /> : <Lock className="w-5 h-5" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                Controle de Turno & Fechamento Diário
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                  isCashRegisterOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                }`}>
                  ● {isCashRegisterOpen ? 'Caixa Aberto / Ativo' : 'Caixa Fechado'}
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-400 leading-normal max-w-xl">
                {isCashRegisterOpen 
                  ? "O expediente está em andamento. Ao final do expediente, feche o caixa para arquivar as vendas de hoje, registrar a contagem de moedas e notas da gaveta e definir o troco inicial de amanhã."
                  : "O expediente está encerrado. Defina o valor inicial na gaveta de dinheiro (fundo de troco) para abrir um novo turno e liberar o registro de vendas!"
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
            {isCashRegisterOpen ? (
              <>
                <button
                  type="button"
                  id="btn-main-close-shift"
                  onClick={() => {
                    setPhysicalCashInput(stats.currentDrawerCash.toFixed(2).replace(".", ","));
                    setNextDayFloatInput(initialCash.toFixed(2).replace(".", ","));
                    setIsClosingCashierModalOpen(true);
                  }}
                  className="px-6 py-4 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-400/35"
                >
                  <Lock className="w-4 h-4 text-black" />
                  Fechar Caixa / Novo Dia 🔓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("pdv-audit-and-ledger");
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-4 bg-slate-950 border border-white/15 hover:border-white/25 text-slate-200 hover:text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Ver Histórico 📁
                </button>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative min-w-[120px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-mono font-bold text-[11px]">R$</span>
                  <input
                    type="text"
                    id="input-quick-opening-float"
                    value={openingFloatInput}
                    onChange={(e) => setOpeningFloatInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500/50 pl-8 pr-3 py-2 rounded-xl outline-none text-emerald-400 font-mono font-bold text-xs transition-all"
                    placeholder="100,00"
                  />
                </div>
                <button
                  type="button"
                  id="btn-main-open-shift"
                  onClick={() => {
                    const val = parsePortugueseNumber(openingFloatInput) || 0;
                    handleOpenCashier(val);
                  }}
                  className="px-6 py-4 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-400/35"
                >
                  <Unlock className="w-4 h-4 text-black" />
                  Abrir Novo Caixa 🌅
                </button>
              </div>
            )}
          </div>
        </div>
      )}

"""

new_content = content[:start_idx] + replacement + content[end_idx:]
with open(file_path, 'w') as f:
    f.write(new_content)
print("SUCCESS")
