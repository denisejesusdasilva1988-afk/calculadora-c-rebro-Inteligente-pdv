import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  X,
  FileCode2,
} from "lucide-react";

interface PlayStorePwaHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (msg: string, type?: "success" | "error" | "info") => void;
}

interface DiagnosticItem {
  id: string;
  label: string;
  detail: string;
  status: "ok" | "warn" | "error" | "loading";
}

function normalizeSha256(raw: string): string {
  const cleanHex = raw.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (cleanHex.length !== 64) {
    return raw.trim().toUpperCase();
  }
  const pairs: string[] = [];
  for (let i = 0; i < 64; i += 2) {
    pairs.push(cleanHex.slice(i, i + 2));
  }
  return pairs.join(":");
}

function isValidSha256(raw: string): boolean {
  const cleanHex = raw.replace(/[^a-fA-F0-9]/g, "");
  return cleanHex.length === 64;
}

export const PlayStorePwaHelperModal: React.FC<PlayStorePwaHelperModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const [checks, setChecks] = useState<DiagnosticItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [packageName, setPackageName] = useState("com.calculadora.cerebro.pdv");
  const [sha256Input, setSha256Input] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const normalizedSha256 = useMemo(() => normalizeSha256(sha256Input), [sha256Input]);
  const sha256Ready = useMemo(() => isValidSha256(sha256Input), [sha256Input]);

  const generatedAssetLinks = useMemo(() => {
    const fingerprint = sha256Ready
      ? normalizedSha256
      : "COLE_AQUI_SUA_CHAVE_SHA256_DO_GOOGLE_PLAY_CONSOLE";
    return JSON.stringify(
      [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: packageName.trim() || "com.calculadora.cerebro.pdv",
            sha256_cert_fingerprints: [fingerprint],
          },
        },
      ],
      null,
      2
    );
  }, [packageName, normalizedSha256, sha256Ready]);

  const copyValue = async (id: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
      onNotify?.(`${label} copiado! 📋`, "success");
    } catch {
      onNotify?.("Não foi possível copiar automaticamente.", "error");
    }
  };

  const runDiagnostics = async () => {
    setIsChecking(true);
    const results: DiagnosticItem[] = [];

    const isHttps =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost";
    results.push({
      id: "https",
      label: "Conexão Segura (HTTPS)",
      detail: isHttps
        ? `Ativo em ${window.location.origin}`
        : "O domínio público precisa estar em HTTPS (ex: https://calculadoracerebro.com.br).",
      status: isHttps ? "ok" : "error",
    });

    try {
      const mRes = await fetch(`./manifest.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (mRes.ok) {
        const m = await mRes.json();
        const hasIcons =
          Array.isArray(m.icons) &&
          m.icons.some((i: any) => String(i.sizes).includes("192")) &&
          m.icons.some((i: any) => String(i.sizes).includes("512")) &&
          m.icons.some((i: any) => String(i.purpose || "").includes("maskable"));
        const hasScreenshots =
          Array.isArray(m.screenshots) && m.screenshots.length >= 2;
        results.push({
          id: "manifest",
          label: "Web App Manifest (manifest.json)",
          detail:
            hasIcons && hasScreenshots
              ? `Nome: "${m.short_name}" • Ícones 192/512 + Maskable + ${m.screenshots.length} prints OK.`
              : "Manifest encontrado, mas faltam ícones 192/512 maskable ou screenshots.",
          status: hasIcons && hasScreenshots ? "ok" : "warn",
        });
      } else {
        results.push({
          id: "manifest",
          label: "Web App Manifest (manifest.json)",
          detail: `Erro HTTP ${mRes.status} ao ler manifest.json.`,
          status: "error",
        });
      }
    } catch {
      results.push({
        id: "manifest",
        label: "Web App Manifest (manifest.json)",
        detail: "Não foi possível carregar /manifest.json.",
        status: "error",
      });
    }

    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        results.push({
          id: "sw",
          label: "Service Worker (Modo Offline)",
          detail:
            reg && (reg.active || reg.waiting || reg.installing)
              ? `Ativo no escopo ${reg.scope}`
              : "Service Worker registrado apenas fora do modo preview/editor.",
          status: reg ? "ok" : "warn",
        });
      } else {
        results.push({
          id: "sw",
          label: "Service Worker (Modo Offline)",
          detail: "Navegador atual sem suporte a Service Worker.",
          status: "warn",
        });
      }
    } catch {
      results.push({
        id: "sw",
        label: "Service Worker (Modo Offline)",
        detail: "Verificação indisponível neste ambiente.",
        status: "warn",
      });
    }

    try {
      const aRes = await fetch(`./.well-known/assetlinks.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (aRes.ok) {
        const data = await aRes.json();
        const first = Array.isArray(data) ? data[0] : null;
        const pkg = first?.target?.package_name || "";
        const fp = first?.target?.sha256_cert_fingerprints?.[0] || "";
        if (pkg && !packageName) setPackageName(pkg);

        const isPlaceholder =
          !fp || fp.includes("COLE_AQUI") || !isValidSha256(fp);

        results.push({
          id: "assetlinks",
          label: "Digital Asset Links (.well-known/assetlinks.json)",
          detail: isPlaceholder
            ? `Pacote "${pkg}" pronto, mas falta colar a chave SHA-256 da Play Console / PWABuilder.`
            : `Configurado para ${pkg} (${fp.slice(0, 17)}...)`,
          status: isPlaceholder ? "warn" : "ok",
        });
      } else {
        results.push({
          id: "assetlinks",
          label: "Digital Asset Links (.well-known/assetlinks.json)",
          detail: `Erro HTTP ${aRes.status} ao acessar /.well-known/assetlinks.json.`,
          status: "error",
        });
      }
    } catch {
      results.push({
        id: "assetlinks",
        label: "Digital Asset Links (.well-known/assetlinks.json)",
        detail: "Falha ao ler /.well-known/assetlinks.json.",
        status: "error",
      });
    }

    try {
      const pRes = await fetch(`./privacy.html?t=${Date.now()}`, {
        cache: "no-store",
      });
      results.push({
        id: "privacy",
        label: "Política de Privacidade (privacy.html)",
        detail: pRes.ok
          ? "Página acessível em /privacy.html para informar na Play Console."
          : `Erro HTTP ${pRes.status} em /privacy.html.`,
        status: pRes.ok ? "ok" : "error",
      });
    } catch {
      results.push({
        id: "privacy",
        label: "Política de Privacidade (privacy.html)",
        detail: "Não foi possível verificar /privacy.html.",
        status: "warn",
      });
    }

    setChecks(results);
    setIsChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  const handleDownloadAssetLinks = () => {
    const blob = new Blob([generatedAssetLinks + "\n"], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assetlinks.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify?.(
      "Arquivo assetlinks.json baixado! Coloque dentro da pasta .well-known/ antes de subir no site.",
      "success"
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-emerald-500/30 rounded-[2rem] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                Configuração PWA para Google Play Store
              </h2>
              <p className="text-xs text-slate-400">
                Checklist técnico, links oficiais e gerador do{" "}
                <span className="text-emerald-400 font-mono">assetlinks.json</span> (TWA / PWABuilder)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Diagnostics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Diagnóstico Técnico do App
            </h3>
            <button
              type="button"
              onClick={runDiagnostics}
              disabled={isChecking}
              className="text-[10px] font-black uppercase px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
              Reverificar
            </button>
          </div>

          <div className="space-y-2">
            {checks.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/70 border border-white/5"
              >
                {item.status === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      item.status === "error" ? "text-red-400" : "text-amber-400"
                    }`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white">{item.label}</p>
                  <p className="text-[11px] text-slate-400 leading-snug break-words">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Copy URLs */}
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-white/10">
          <h3 className="text-xs font-black uppercase tracking-wider text-sky-400">
            Dados Prontos para Colar no PWABuilder &amp; Play Console
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              {
                id: "url",
                title: "URL do App (PWABuilder)",
                val: "https://calculadoracerebro.com.br",
              },
              {
                id: "pkg",
                title: "ID do Pacote Android",
                val: "com.calculadora.cerebro.pdv",
              },
              {
                id: "priv",
                title: "Política de Privacidade",
                val: "https://calculadoracerebro.com.br/privacy.html",
              },
              {
                id: "terms",
                title: "Termos de Uso",
                val: "https://calculadoracerebro.com.br/terms.html",
              },
            ].map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-white/5"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {row.title}
                  </span>
                  <span className="text-[11px] font-mono text-white truncate block">
                    {row.val}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(row.id, row.val, row.title)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-[10px] font-bold shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copiedId === row.id ? "Copiado" : "Copiar"}
                </button>
              </div>
            ))}
          </div>

          <a
            href="https://www.pwabuilder.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <span>Abrir PWABuilder.com para Gerar o .AAB da Play Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* AssetLinks Generator */}
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-amber-500/20">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Gerar assetlinks.json (Tira a barra de endereço do Chrome no App)
            </h3>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Depois de criar o app no <strong>Google Play Console</strong> (em{" "}
            <em>Testar e lançar → Configuração → Integridade do app → Assinatura de apps</em>),
            copie a <strong>Impressão digital do certificado SHA-256</strong> e cole abaixo:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Nome do Pacote (Package ID)
              </label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500"
                placeholder="com.calculadora.cerebro.pdv"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Chave SHA-256 (Google Play Console)
              </label>
              <input
                type="text"
                value={sha256Input}
                onChange={(e) => setSha256Input(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500"
                placeholder="Ex: 14:6D:E9:83:C5:73:06:50..."
              />
            </div>
          </div>

          {sha256Input.trim() && !sha256Ready && (
            <p className="text-[11px] text-amber-400 font-semibold">
              A chave SHA-256 precisa ter 64 caracteres hexadecimais (ex: 32 pares separados por :).
            </p>
          )}

          <pre className="bg-slate-900 border border-white/10 rounded-xl p-3 text-[10px] font-mono text-emerald-300 overflow-x-auto">
            {generatedAssetLinks}
          </pre>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() =>
                copyValue("assetjson", generatedAssetLinks, "JSON do assetlinks.json")
              }
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadAssetLinks}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar assetlinks.json
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs uppercase tracking-wider cursor-pointer"
        >
          Fechar Assistente
        </button>
      </div>
    </div>
  );
};
