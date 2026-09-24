import React, { useState, useMemo } from "react";
import { 
  Layers, 
  Plus, 
  Trash2, 
  Calendar, 
  Search, 
  AlertTriangle, 
  CheckCircle,
  Clock, 
  Info,
  Scale,
  Sparkles,
  RefreshCw,
  XCircle
} from "lucide-react";

export interface RawMaterial {
  id: string;
  name: string;
  stockQty: number;
  unit: string; // kg, g, l, ml, unid, etc.
  costPrice: number;
  expiryDate?: string; // YYYY-MM-DD
}

export interface RecipeItem {
  materialId: string;
  quantity: number; // e.g. 0.150 for 150g of a kg-unit material
}

interface RecipesModuleProps {
  rawMaterials: RawMaterial[];
  setRawMaterials: React.Dispatch<React.SetStateAction<RawMaterial[]>>;
  productRecipes: Record<string, RecipeItem[]>;
  setProductRecipes: React.Dispatch<React.SetStateAction<Record<string, RecipeItem[]>>>;
  allProducts: { id: string; name: string; category?: string; price: number }[];
  formatCurrency: (value: number) => string;
  showNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export const RecipesModule: React.FC<RecipesModuleProps> = ({
  rawMaterials,
  setRawMaterials,
  productRecipes,
  setProductRecipes,
  allProducts,
  formatCurrency,
  showNotification,
}) => {
  const [activeTab, setActiveTab] = useState<"insumos" | "receitas" | "validade">("insumos");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states for raw materials
  const [materialName, setMaterialName] = useState("");
  const [materialQty, setMaterialQty] = useState("");
  const [materialUnit, setMaterialUnit] = useState("unid");
  const [materialCost, setMaterialCost] = useState("");
  const [materialExpiry, setMaterialExpiry] = useState("");

  // Form states for recipes
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [recipeQuantity, setRecipeQuantity] = useState("");

  // Filter raw materials
  const filteredMaterials = useMemo(() => {
    return rawMaterials.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rawMaterials, searchQuery]);

  // Handle Raw Material registration
  const handleRegisterMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim() || !materialQty.trim() || !materialCost.trim()) {
      showNotification("Por favor, preencha o nome, quantidade e preço de custo!", "error");
      return;
    }

    const qty = parseFloat(materialQty.replace(",", "."));
    const cost = parseFloat(materialCost.replace(",", "."));

    if (isNaN(qty) || qty < 0) {
      showNotification("Quantidade inválida!", "error");
      return;
    }
    if (isNaN(cost) || cost < 0) {
      showNotification("Preço de custo inválido!", "error");
      return;
    }

    const newMaterial: RawMaterial = {
      id: "mat_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      name: materialName.trim(),
      stockQty: qty,
      unit: materialUnit,
      costPrice: cost,
      expiryDate: materialExpiry || undefined,
    };

    const updated = [newMaterial, ...rawMaterials];
    setRawMaterials(updated);
    localStorage.setItem("pdv_raw_materials", JSON.stringify(updated));

    showNotification(`Insumo "${materialName}" cadastrado com sucesso! 🌾`, "success");
    
    // Reset form
    setMaterialName("");
    setMaterialQty("");
    setMaterialUnit("unid");
    setMaterialCost("");
    setMaterialExpiry("");
  };

  // Handle adding raw material to a product recipe
  const handleAddToRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedMaterialId || !recipeQuantity.trim()) {
      showNotification("Selecione o produto, o insumo e a quantidade!", "error");
      return;
    }

    const qty = parseFloat(recipeQuantity.replace(",", "."));
    if (isNaN(qty) || qty <= 0) {
      showNotification("Quantidade da receita inválida!", "error");
      return;
    }

    const currentRecipe = productRecipes[selectedProductId] || [];
    // Check if material is already in this recipe
    if (currentRecipe.some(r => r.materialId === selectedMaterialId)) {
      showNotification("Este insumo já faz parte da receita deste produto! Caso queira alterar, remova-o primeiro.", "warning");
      return;
    }

    const updatedRecipeItem: RecipeItem = {
      materialId: selectedMaterialId,
      quantity: qty,
    };

    const updatedRecipes = {
      ...productRecipes,
      [selectedProductId]: [...currentRecipe, updatedRecipeItem],
    };

    setProductRecipes(updatedRecipes);
    localStorage.setItem("pdv_product_recipes", JSON.stringify(updatedRecipes));

    showNotification("Insumo vinculado à receita do produto com sucesso! 📝⚙️", "success");
    setRecipeQuantity("");
  };

  // Remove material from a recipe
  const handleRemoveFromRecipe = (productId: string, materialId: string) => {
    const currentRecipe = productRecipes[productId] || [];
    const updated = currentRecipe.filter(r => r.materialId !== materialId);
    
    const updatedRecipes = { ...productRecipes };
    if (updated.length === 0) {
      delete updatedRecipes[productId];
    } else {
      updatedRecipes[productId] = updated;
    }

    setProductRecipes(updatedRecipes);
    localStorage.setItem("pdv_product_recipes", JSON.stringify(updatedRecipes));
    showNotification("Insumo removido da ficha técnica.", "info");
  };

  // Delete raw material entirely
  const handleDeleteMaterial = (id: string, name: string) => {
    if (confirm(`Excluir definitivamente o insumo "${name}"? Isso também o removerá de todas as receitas vinculadas!`)) {
      const updatedMaterials = rawMaterials.filter(m => m.id !== id);
      setRawMaterials(updatedMaterials);
      localStorage.setItem("pdv_raw_materials", JSON.stringify(updatedMaterials));

      // Clean up recipes
      const updatedRecipes = { ...productRecipes };
      Object.keys(updatedRecipes).forEach(prodId => {
        updatedRecipes[prodId] = updatedRecipes[prodId].filter(r => r.materialId !== id);
        if (updatedRecipes[prodId].length === 0) {
          delete updatedRecipes[prodId];
        }
      });
      setProductRecipes(updatedRecipes);
      localStorage.setItem("pdv_product_recipes", JSON.stringify(updatedRecipes));

      showNotification("Insumo excluído de todo o sistema.", "warning");
    }
  };

  // Expiration Date Classifications
  const expirationAlerts = useMemo(() => {
    const today = new Date();
    const alerts: {
      id: string;
      name: string;
      type: "Produto" | "Insumo";
      expiryDate: string;
      daysRemaining: number;
      status: "expired" | "critical" | "warning" | "ok";
    }[] = [];

    // Classify raw materials with expiry date
    rawMaterials.forEach(m => {
      if (!m.expiryDate) return;
      const exp = new Date(m.expiryDate);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: "expired" | "critical" | "warning" | "ok" = "ok";
      if (diffDays <= 0) status = "expired";
      else if (diffDays <= 7) status = "critical";
      else if (diffDays <= 30) status = "warning";

      alerts.push({
        id: m.id,
        name: m.name,
        type: "Insumo",
        expiryDate: m.expiryDate,
        daysRemaining: diffDays,
        status,
      });
    });

    // Sort by days remaining (expired first)
    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [rawMaterials]);

  // Active products dropdown list
  const productOptions = useMemo(() => {
    return allProducts.sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts]);

  return (
    <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl text-left space-y-5 shadow-2xl">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Gestão de Receitas, Insumos & Validade 🌾🧪
          </h3>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">
            Cadastre matérias-primas e controle a receita técnica de seus produtos. Ao fechar uma venda, os insumos são descontados automaticamente! Monitore datas de validade para evitar perdas!
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-1 bg-slate-950 p-1.5 rounded-xl border border-white/5">
        {(["insumos", "receitas", "validade"] as const).map((tab) => {
          const label = tab === "insumos" ? "🌾 Matéria-Prima / Insumos" : tab === "receitas" ? "📝 Ficha Técnica / Receitas" : "🚨 Alertas de Validade & Vencimento";
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: INSUMOS */}
      {activeTab === "insumos" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Register Form */}
          <form onSubmit={handleRegisterMaterial} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase block">Nome do Insumo *</label>
              <input
                type="text"
                placeholder="Ex: Farinha de Trigo Especial"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase block">Quantidade em Estoque *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: 50"
                  value={materialQty}
                  onChange={(e) => setMaterialQty(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none font-bold font-mono text-right"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase block">Unidade de Medida</label>
              <select
                value={materialUnit}
                onChange={(e) => setMaterialUnit(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-bold"
              >
                <option value="unid">Unidade (unid)</option>
                <option value="kg">Quilo (kg)</option>
                <option value="g">Grama (g)</option>
                <option value="l">Litro (l)</option>
                <option value="ml">Mililitro (ml)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase block">Preço de Custo R$ *</label>
              <input
                type="text"
                placeholder="Ex: 4,50"
                value={materialCost}
                onChange={(e) => setMaterialCost(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none font-bold font-mono text-right"
                required
              />
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase block">Data de Validade (Opcional)</label>
              <input
                type="date"
                value={materialExpiry}
                onChange={(e) => setMaterialExpiry(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none font-bold font-mono"
              />
            </div>

            <div className="col-span-1 sm:col-span-3 flex items-end justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-550 text-slate-950 font-black text-[10px] rounded-xl uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                Cadastrar Insumo
              </button>
            </div>
          </form>

          {/* List Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Buscar insumo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg pl-7 pr-2.5 py-1 text-[10px] text-white font-bold outline-none uppercase"
            />
          </div>

          {/* Insumos List */}
          <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-[8.5px] font-black uppercase tracking-wider border-b border-white/5">
                  <th className="p-3">Nome do Insumo</th>
                  <th className="p-3 text-right">Estoque Inicial</th>
                  <th className="p-3">Unid</th>
                  <th className="p-3 text-right">Custo Unitário</th>
                  <th className="p-3 text-right">Custo Total</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-[10.5px]">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-mono font-medium">
                      Nenhum insumo ou matéria-prima cadastrada nesta busca.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((m) => {
                    const totalCost = m.stockQty * m.costPrice;
                    return (
                      <tr key={m.id} className="hover:bg-white/[0.02] text-slate-300 font-medium">
                        <td className="p-3 font-bold text-white">{m.name}</td>
                        <td className="p-3 text-right font-mono font-bold text-cyan-400">{m.stockQty.toFixed(3).replace(/\.000$/, "")}</td>
                        <td className="p-3 text-slate-400 font-mono font-bold uppercase">{m.unit}</td>
                        <td className="p-3 text-right font-mono text-emerald-400">{formatCurrency(m.costPrice)}</td>
                        <td className="p-3 text-right font-mono text-emerald-400 font-bold">{formatCurrency(totalCost)}</td>
                        <td className="p-3 font-mono text-[9.5px]">
                          {m.expiryDate ? (
                            (() => {
                              const [y, mo, d] = m.expiryDate.split("-");
                              return `${d}/${mo}/${y}`;
                            })()
                          ) : (
                            <span className="text-slate-500 font-sans">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteMaterial(m.id, m.name)}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded transition-all active:scale-90"
                            title="Deletar insumo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RECEITAS / FICHA TÉCNICA */}
      {activeTab === "receitas" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-slate-950/35 p-4 rounded-xl border border-white/5 space-y-4">
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block">📝 Criar ou Alterar Ficha Técnica</span>
            
            <form onSubmit={handleAddToRecipe} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[8.5px] text-slate-400 font-bold uppercase block">Selecione o Produto de Venda</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none font-bold"
                >
                  <option value="">-- Escolher Produto --</option>
                  {productOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8.5px] text-slate-400 font-bold uppercase block">Insumo Utilizado</label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none font-bold"
                >
                  <option value="">-- Escolher Insumo --</option>
                  {rawMaterials.map(m => (
                    <option key={m.id} value={m.id}>{m.name.toUpperCase()} ({m.unit})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8.5px] text-slate-400 font-bold uppercase block">Quantidade Necessária por Unidade Vendida</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Ex: 0.150 ou 1"
                    value={recipeQuantity}
                    onChange={(e) => setRecipeQuantity(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none font-bold font-mono text-right"
                  />
                  <span className="absolute right-3 text-[10px] font-bold text-slate-500 uppercase">
                    {rawMaterials.find(m => m.id === selectedMaterialId)?.unit || ""}
                  </span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-555 text-slate-950 font-black text-[10px] rounded-lg uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  Vincular Insumo à Receita
                </button>
              </div>
            </form>
          </div>

          {/* Active Product Recipes overview */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">📦 Fichas Técnicas Ativas no Sistema</span>
            
            {Object.keys(productRecipes).length === 0 ? (
              <div className="bg-slate-950/40 p-8 rounded-xl border border-dashed border-white/5 text-center text-slate-500 font-mono text-[10.5px]">
                Nenhum produto possui ficha técnica cadastrada ainda. Use o formulário acima para vincular insumos!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {Object.keys(productRecipes).map((prodId) => {
                  const product = allProducts.find(p => p.id === prodId);
                  const items = productRecipes[prodId] || [];
                  if (!product) return null;

                  // Calculate raw cost of recipe
                  const totalCost = items.reduce((sum, item) => {
                    const material = rawMaterials.find(m => m.id === item.materialId);
                    return sum + (material ? material.costPrice * item.quantity : 0);
                  }, 0);

                  const profitMargin = product.price > 0 ? ((product.price - totalCost) / product.price) * 100 : 0;

                  return (
                    <div key={prodId} className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3 text-left">
                      <div className="flex justify-between items-start border-b border-white/5 pb-2">
                        <div>
                          <span className="text-[11.5px] font-black text-white uppercase block leading-none">{product.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Venda: {formatCurrency(product.price)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-slate-500 uppercase block font-bold">Custo Insumos</span>
                          <span className="text-[11.5px] font-mono font-black text-rose-450">{formatCurrency(totalCost)}</span>
                        </div>
                      </div>

                      {/* Recipe Ingredients list */}
                      <div className="space-y-1.5">
                        {items.map((it) => {
                          const mat = rawMaterials.find(m => m.id === it.materialId);
                          if (!mat) return null;
                          return (
                            <div key={it.materialId} className="flex justify-between items-center text-[10px] text-slate-300 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full shrink-0"></span>
                                <span className="text-slate-200 uppercase">{mat.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-cyan-400">{it.quantity.toString()} {mat.unit}</span>
                                <button
                                  onClick={() => handleRemoveFromRecipe(prodId, it.materialId)}
                                  className="text-slate-500 hover:text-red-400 p-0.5 rounded"
                                  title="Remover da receita"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[9px]">
                        <span className="text-slate-400 font-semibold uppercase">Margem Operacional Insumo:</span>
                        <span className={`font-black font-mono ${profitMargin >= 50 ? "text-emerald-400" : profitMargin >= 25 ? "text-amber-400" : "text-rose-400"}`}>
                          {profitMargin.toFixed(1)}% {profitMargin >= 25 ? "✓ Lucrativo" : "⚠️ Margem Estreita"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ALERTAS DE VALIDADE */}
      {activeTab === "validade" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-2">
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block">📊 Painel Geral de Vencimentos</span>
            <p className="text-[9.5px] text-slate-400 leading-relaxed font-sans">
              O sistema monitora automaticamente as datas de validade inseridas nos insumos e produtos. Evite multas de vigilância e perdas de estoque agindo proativamente com antecedência!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Status counts */}
            <div className="bg-slate-950 p-3 rounded-lg border border-red-500/20 text-center space-y-1">
              <span className="text-[8px] text-red-400 font-black uppercase tracking-wider block">🚫 Expirados / Vencidos</span>
              <span className="text-[20px] font-mono font-black text-red-400">
                {expirationAlerts.filter(a => a.status === "expired").length}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-amber-500/20 text-center space-y-1">
              <span className="text-[8px] text-amber-400 font-black uppercase tracking-wider block">⚠️ Vencendo em 7 Dias</span>
              <span className="text-[20px] font-mono font-black text-amber-400">
                {expirationAlerts.filter(a => a.status === "critical").length}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-cyan-500/25 text-center space-y-1">
              <span className="text-[8px] text-cyan-400 font-black uppercase tracking-wider block">📦 Total Itens Rastreados</span>
              <span className="text-[20px] font-mono font-black text-cyan-400">
                {expirationAlerts.length}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {expirationAlerts.length === 0 ? (
              <div className="bg-slate-950/40 p-8 rounded-xl border border-dashed border-white/5 text-center text-slate-500 font-mono text-[10.5px]">
                Nenhuma data de validade ativa rastreada. Preencha o vencimento ao cadastrar novos insumos!
              </div>
            ) : (
              <div className="space-y-2.5">
                {expirationAlerts.map((alert) => {
                  const isExpired = alert.status === "expired";
                  const isCritical = alert.status === "critical";
                  const isWarning = alert.status === "warning";

                  const [y, mo, d] = alert.expiryDate.split("-");
                  const formattedExpiry = `${d}/${mo}/${y}`;

                  return (
                    <div 
                      key={alert.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-left ${
                        isExpired 
                          ? "bg-red-500/10 border-red-500/30 text-red-200" 
                          : isCritical 
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-200 animate-pulse" 
                            : isWarning 
                              ? "bg-slate-950 border-white/5 text-slate-300"
                              : "bg-slate-950/40 border-white/5 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Calendar className={`w-4 h-4 shrink-0 ${isExpired ? "text-red-400" : isCritical ? "text-amber-400" : "text-cyan-400"}`} />
                        <div>
                          <span className="text-[11px] font-black uppercase text-white block">{alert.name}</span>
                          <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block">Tipo: {alert.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 justify-between sm:justify-end w-full sm:w-auto">
                        <div className="text-right">
                          <span className="text-[8px] text-slate-500 block uppercase font-bold">Data de Vencimento</span>
                          <span className="text-[10.5px] font-mono font-bold text-white block">{formattedExpiry}</span>
                        </div>

                        <div className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider shrink-0 text-center">
                          {isExpired ? (
                            <span className="text-red-400">🚨 VENCIDO HÁ {Math.abs(alert.daysRemaining)} DIA(S)</span>
                          ) : isCritical ? (
                            <span className="text-amber-400">⚠️ VENCE EM {alert.daysRemaining} DIAS!</span>
                          ) : (
                            <span className="text-cyan-400">✓ VÁLIDO POR MAIS {alert.daysRemaining} DIAS</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
