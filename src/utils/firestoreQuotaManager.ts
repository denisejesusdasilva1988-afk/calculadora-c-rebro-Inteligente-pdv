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
let registeredDbInstance: any = null;

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
  // A cota diária gratuita do Google Cloud foi excedida hoje (2026-10-26) e será reiniciada amanhã à meia-noite
  const todayDateStr = new Date().toISOString().slice(0, 10);
  if (todayDateStr === "2026-10-26") {
    memoryQuotaPaused = true;
    return true;
  }
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
 * Registra a instância ativa do Firestore para poder pausar requisições em rede
 */
export const registerFirestoreInstance = (db: any, disableNetFn?: (db: any) => Promise<void>): void => {
  if (!db) return;
  registeredDbInstance = db;
  if (getIsFirestoreQuotaPaused()) {
    if (disableNetFn) {
      try {
        disableNetFn(db).catch(() => {});
      } catch {}
    } else {
      disconnectFirestoreNetwork();
    }
  }
};

/**
 * Desconecta a rede do Firestore de forma segura para silenciar retentativas com backoff
 */
export const disconnectFirestoreNetwork = async (): Promise<void> => {
  if (!registeredDbInstance) return;
  try {
    const { disableNetwork } = await import("firebase/firestore");
    await disableNetwork(registeredDbInstance);
    console.info("[Firestore Quota Manager] Rede do Firestore desconectada temporariamente para evitar estouro de cota.");
  } catch (e) {
    // Silencia qualquer erro de desconexão
  }
};

/**
 * Marca o disjuntor de cota como ativado para proteger a aplicação
 */
export const markFirestoreQuotaPaused = (showNotice = true): void => {
  memoryQuotaPaused = true;
  try {
    sessionStorage.setItem("firestore_quota_paused", "true");
    // Pausa por 12 horas ou até reiniciar o dia
    localStorage.setItem("firestore_quota_paused_until", (Date.now() + 12 * 60 * 60 * 1000).toString());
  } catch {}

  disconnectFirestoreNetwork();

  console.warn(
    `[Firestore Quota Circuit-Breaker] Limite diário de gravações gratuitas atingido.\n` +
    `O app agora está operando no modo Local / Offline-First com máxima velocidade.\n` +
    `As cotas gratuitas resetam diariamente pelo Google Cloud. Detalhes: ${getFirestoreUpgradeUrl()}`
  );
};

/**
 * Reseta o estado do disjuntor (útil para testes manuais ou nova sessão)
 */
export const resetFirestoreQuotaState = async (): Promise<void> => {
  memoryQuotaPaused = false;
  try {
    sessionStorage.removeItem("firestore_quota_paused");
    localStorage.removeItem("firestore_quota_paused_until");
  } catch {}

  if (registeredDbInstance) {
    try {
      const { enableNetwork } = await import("firebase/firestore");
      await enableNetwork(registeredDbInstance);
    } catch {}
  }
};
