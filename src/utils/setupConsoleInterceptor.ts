/**
 * Interceptador antecipado de console para silenciar erros de cota e backoff do Firestore
 * Este módulo deve ser importado na LINHA 1 do main.tsx para executar antes de qualquer outro import.
 */

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function isQuotaMessage(msg: any): boolean {
  if (!msg) return false;
  const str = typeof msg === "string" ? msg : (msg?.message || String(msg || ""));
  const lower = str.toLowerCase();
  return (
    lower.includes("resource-exhausted") ||
    lower.includes("quota limit exceeded") ||
    lower.includes("quota exceeded") ||
    lower.includes("free daily write units") ||
    lower.includes("using maximum backoff delay") ||
    lower.includes("firestore (12.12.0): firebaseerror")
  );
}

console.error = function (...args: any[]) {
  for (const arg of args) {
    if (isQuotaMessage(arg)) {
      try {
        sessionStorage.setItem("firestore_quota_paused", "true");
        localStorage.setItem("firestore_quota_paused_until", (Date.now() + 12 * 60 * 60 * 1000).toString());
      } catch {}
      return;
    }
  }
  originalConsoleError.apply(console, args);
};

console.warn = function (...args: any[]) {
  for (const arg of args) {
    if (isQuotaMessage(arg)) {
      return;
    }
  }
  originalConsoleWarn.apply(console, args);
};

export {};
