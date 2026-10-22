/**
 * Gerenciador e Disjuntor Inteligente de Cota do Firestore (Free Tier / Spark / Enterprise)
 * 
 * Evita repetições infinitas de gravação quando a cota diária gratuita do projeto
 * for excedida (resource-exhausted / quota limit exceeded).
 * Permite que a aplicação continue funcionando 100% normalmente em modo Local / Offline-First.
 */

const PROJECT_ID = "gen-lang-client-0249941704";
const DATABASE_ID = "ai-studio-a0856db2-5062-4085-bc64-2e37e513e1fd";

let memoryQuotaPaused = false;

/**
 * Verifica se o erro retornado pelo Firestore é de estouro de cota (leitura ou gravação)
 */
export const isQuotaExhaustedError = (err: any): boolean => {
  if (!err) return false;
  const code = err?.code || "";
  const msg = err?.message || String(err);
  const combined = (code + " " + msg).toLowerCase();

  return (
    code === "resource-exhausted" ||
    combined.includes("resource-exhausted") ||
    combined.includes("quota limit exceeded") ||
    combined.includes("quota exceeded") ||
    combined.includes("free daily write units") ||
    combined.includes("free daily read units") ||
    combined.includes("free tier database") ||
    combined.includes("quota metric")
  );
};

/**
 * Retorna a URL direta do console do Firebase para gerenciamento da cota / upgrade
 */
export const getFirestoreUpgradeUrl = (): string => {
  return `https://console.firebase.google.com/project/${PROJECT_ID}/firestore/databases/${DATABASE_ID}/data?openUpgradeDialog=true`;
};

/**
 * Verifica se as gravações no Firestore estão pausadas temporariamente por estouro de cota
 */
export const getIsFirestoreQuotaPaused = (): boolean => {
  if (memoryQuotaPaused) return true;
  try {
    const sessionVal = sessionStorage.getItem("firestore_quota_paused");
    if (sessionVal === "true") {
      memoryQuotaPaused = true;
      return true;
    }
    const pausedUntil = localStorage.getItem("firestore_quota_paused_until");
    if (pausedUntil && Number(pausedUntil) > Date.now()) {
      memoryQuotaPaused = true;
      return true;
    }
  } catch {}
  return false;
};

/**
 * Marca o disjuntor de cota como ativado para proteger a aplicação
 */
export const markFirestoreQuotaPaused = (showNotice = true): void => {
  memoryQuotaPaused = true;
  try {
    sessionStorage.setItem("firestore_quota_paused", "true");
    // Pausa por 4 horas ou até reiniciar o dia
    localStorage.setItem("firestore_quota_paused_until", (Date.now() + 4 * 60 * 60 * 1000).toString());
  } catch {}

  console.warn(
    `[Firestore Quota Circuit-Breaker] Limite diário de gravações gratuitas atingido.\n` +
    `O app agora está operando no modo Local / Offline-First com máxima velocidade.\n` +
    `As cotas gratuitas resetam diariamente pelo Google Cloud. Detalhes: ${getFirestoreUpgradeUrl()}`
  );
};

/**
 * Reseta o estado do disjuntor (útil para testes manuais ou nova sessão)
 */
export const resetFirestoreQuotaState = (): void => {
  memoryQuotaPaused = false;
  try {
    sessionStorage.removeItem("firestore_quota_paused");
    localStorage.removeItem("firestore_quota_paused_until");
  } catch {}
};
