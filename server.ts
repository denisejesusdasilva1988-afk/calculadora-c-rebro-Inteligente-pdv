import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import webpush from "web-push";

dotenv.config();

// Helper to call Gemini with a robust retry mechanism and model fallback
async function callGeminiWithFallbackAndRetry(
  ai: any,
  contents: string,
  systemInstruction: string,
  temperature: number
): Promise<string> {
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-3.5-flash",
    "gemini-2.5-pro"
  ];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let attempts = 3;
    let delay = 400; // start with 400ms delay

    while (attempts > 0) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature,
          },
        });
        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Retry] Attempt failed for model ${modelName}. Retries left: ${attempts - 1}. Error: ${err.message || err}`);
        
        attempts--;
        if (attempts > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        }
      }
    }
    console.warn(`[Gemini Fallback] Model ${modelName} failed or was overloaded. Trying next model...`);
  }

  throw lastError || new Error("Failed to generate content with any model or retry");
}

function isSimulatedToken(token: string): boolean {
  const t = (token || "").trim();
  if (!t) return true;
  const lower = t.toLowerCase();
  return (
    lower.includes("simulated") ||
    lower.includes("sandbox") ||
    lower.includes("placeholder") ||
    lower.startsWith("sim_") ||
    lower === "your_access_token"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // --- CONFIGURAÇÃO WEB PUSH (VAPID KEYS) ---
  let publicVapidKey = process.env.VAPID_PUBLIC_KEY || "";
  let privateVapidKey = process.env.VAPID_PRIVATE_KEY || "";

  const vapidKeysPath = path.join(process.cwd(), "vapid-keys.json");
  if (!publicVapidKey || !privateVapidKey) {
    if (fs.existsSync(vapidKeysPath)) {
      try {
        const keys = JSON.parse(fs.readFileSync(vapidKeysPath, "utf-8"));
        publicVapidKey = keys.publicKey;
        privateVapidKey = keys.privateKey;
      } catch (e) {
        console.error("Erro ao ler vapid-keys.json:", e);
      }
    }

    if (!publicVapidKey || !privateVapidKey) {
      try {
        const keys = webpush.generateVAPIDKeys();
        publicVapidKey = keys.publicKey;
        privateVapidKey = keys.privateKey;
        fs.writeFileSync(vapidKeysPath, JSON.stringify(keys, null, 2), "utf-8");
        console.log("[Push Notification] Novas chaves VAPID geradas com sucesso!");
      } catch (e) {
        console.error("Erro ao gerar/salvar chaves VAPID:", e);
      }
    }
  }

  if (publicVapidKey && privateVapidKey) {
    try {
      webpush.setVapidDetails(
        "mailto:suporte@calculadoracerebro.com.br",
        publicVapidKey,
        privateVapidKey
      );
      console.log("[Push Notification] VAPID configurado com sucesso.");
    } catch (e) {
      console.error("[Push Notification] Erro ao configurar VAPID:", e);
    }
  }

  const SUBSCRIPTIONS_FILE = path.join(process.cwd(), "push-subscriptions.json");

  function getSubscriptions(): any[] {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8"));
      } catch (e) {
        console.error("Erro ao ler push-subscriptions.json", e);
      }
    }
    return [];
  }

  function saveSubscriptions(subs: any[]) {
    try {
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), "utf-8");
    } catch (e) {
      console.error("Erro ao salvar push-subscriptions.json", e);
    }
  }

  // --- ENDPOINTS WEB PUSH ---
  app.get("/api/push/vapid-public-key", (req, res) => {
    res.json({ publicKey: publicVapidKey });
  });

  app.post("/api/push/subscribe", (req, res) => {
    try {
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Inscrição inválida" });
      }

      const subs = getSubscriptions();
      const exists = subs.some(s => s.endpoint === subscription.endpoint);
      if (!exists) {
        subs.push(subscription);
        saveSubscriptions(subs);
        console.log(`[Push Notification] Nova inscrição adicionada: ${subscription.endpoint}`);
      }

      res.status(201).json({ success: true, message: "Inscrito com sucesso!" });
    } catch (error: any) {
      console.error("[Push Subscribe Error]", error);
      res.status(500).json({ error: error.message || "Erro ao salvar inscrição" });
    }
  });

  app.post("/api/push/unsubscribe", (req, res) => {
    try {
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Inscrição inválida" });
      }

      let subs = getSubscriptions();
      subs = subs.filter(s => s.endpoint !== subscription.endpoint);
      saveSubscriptions(subs);
      console.log(`[Push Notification] Inscrição removida: ${subscription.endpoint}`);

      res.json({ success: true, message: "Removido com sucesso!" });
    } catch (error: any) {
      console.error("[Push Unsubscribe Error]", error);
      res.status(500).json({ error: error.message || "Erro ao remover inscrição" });
    }
  });

  app.post("/api/push/send", async (req, res) => {
    try {
      const { title, message, icon } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: "Título e mensagem são obrigatórios" });
      }

      const subs = getSubscriptions();
      console.log(`[Push Notification] Disparando para ${subs.length} inscritos...`);

      const payload = JSON.stringify({
        title,
        message,
        icon: icon || "/icon-192.png"
      });

      const promises = subs.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          return { endpoint: sub.endpoint, success: true };
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`[Push Notification] Removendo inscrição expirada: ${sub.endpoint}`);
            return { endpoint: sub.endpoint, success: false, expired: true };
          }
          console.error(`[Push Notification Error] Erro ao enviar para ${sub.endpoint}`, err);
          return { endpoint: sub.endpoint, success: false, error: err.message };
        }
      });

      const results = await Promise.all(promises);
      const expiredEndpoints = results.filter(r => r.expired).map(r => r.endpoint);
      if (expiredEndpoints.length > 0) {
        const remainingSubs = subs.filter(s => !expiredEndpoints.includes(s.endpoint));
        saveSubscriptions(remainingSubs);
      }

      const successCount = results.filter(r => r.success).length;
      res.json({
        success: true,
        sentCount: successCount,
        totalCount: subs.length,
        results
      });
    } catch (error: any) {
      console.error("[Push Send Error]", error);
      res.status(500).json({ error: error.message || "Erro ao disparar notificações" });
    }
  });

  // Rotas explícitas para download do zip da calculadora (suporta tanto a raiz quanto /public)
  const downloadZipHandler = (req: express.Request, res: express.Response) => {
    const possiblePaths = [
      path.join(process.cwd(), "public", "calculadora_supermercado_netlify.zip"),
      path.join(process.cwd(), "dist", "calculadora_supermercado_netlify.zip"),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", "attachment; filename=calculadora_supermercado_netlify.zip");
        return res.sendFile(filePath);
      }
    }

    res.status(404).send("Arquivo ZIP da calculadora não encontrado no servidor. Por favor, tente novamente.");
  };

  app.get("/calculadora_supermercado_netlify.zip", downloadZipHandler);
  app.get("/public/calculadora_supermercado_netlify.zip", downloadZipHandler);

  // --- Mercado Pago Secure Proxy API ---
  const activeSimulatedPayments = new Map<string, { createdAt: number; status: string }>();

  app.post("/api/mercado-pago/create-payment", async (req, res) => {
    try {
      const { amount, description, clientAccessToken } = req.body;
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Valor de pagamento inválido" });
      }

      // Use the provided customer token, or the server-side environment variable, or fallback to simulation
      const token = clientAccessToken?.trim() || process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || "";

      if (isSimulatedToken(token)) {
        // No Token: Return high-fidelity simulation
        const simId = "sim_mp_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
        activeSimulatedPayments.set(simId, {
          createdAt: Date.now(),
          status: "pending"
        });

        // Generate a standard simulated Pix key payload
        const simulatedPixKey = `00020101021226870014br.gov.bcb.pix2565pix.mercadopago.com/qr/v2/simulated-mp-pdv-cerebro-${simId}`;

        return res.json({
          success: true,
          isSimulation: true,
          paymentId: simId,
          qrCode: simulatedPixKey,
          qr_data: simulatedPixKey,
          type_response: {
            qr_data: simulatedPixKey
          },
          qrCodeBase64: "", // Will render via qrserver on frontend
          status: "pending",
          amount: parsedAmount,
          description: description || "Venda PDV"
        });
      }

      // Real integration with Mercado Pago
      console.log(`[Mercado Pago API] Iniciando pagamento real de R$ ${parsedAmount}`);
      const idempotencyKey = "pdv_mp_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          transaction_amount: parsedAmount,
          description: description || "Venda PDV Cérebro Inteligente",
          payment_method_id: "pix",
          payer: {
            email: "cliente_pdv@cerebrointeligente.com.br",
            first_name: "Cliente",
            last_name: "PDV"
          }
        })
      });

      const mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        if (mpResponse.status === 401 || mpResponse.status === 403) {
          console.log("[Mercado Pago Sandbox] Creating simulated payment.");
          // No Token / Invalid Token: Return high-fidelity simulation
          const simId = "sim_mp_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
          activeSimulatedPayments.set(simId, {
            createdAt: Date.now(),
            status: "pending"
          });

          const simulatedPixKey = `00020101021226870014br.gov.bcb.pix2565pix.mercadopago.com/qr/v2/simulated-mp-pdv-cerebro-${simId}`;

          return res.json({
            success: true,
            isSimulation: true,
            paymentId: simId,
            qrCode: simulatedPixKey,
            qr_data: simulatedPixKey,
            type_response: {
              qr_data: simulatedPixKey
            },
            qrCodeBase64: "", // Will render via qrserver on frontend
            status: "pending",
            amount: parsedAmount,
            description: description || "Venda PDV"
          });
        }
        console.error("[Mercado Pago API Error]", mpData);
        return res.status(mpResponse.status).json({
          error: mpData.message || "Erro na API do Mercado Pago",
          details: mpData
        });
      }

      const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code || "";
      const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || "";

      return res.json({
        success: true,
        isSimulation: false,
        paymentId: mpData.id?.toString(),
        qrCode,
        qr_data: qrCode,
        type_response: {
          qr_data: qrCode
        },
        qrCodeBase64,
        status: mpData.status || "pending"
      });

    } catch (err: any) {
      console.error("[Mercado Pago Create Exception]", err);
      res.status(500).json({ error: err.message || "Erro interno ao processar pagamento" });
    }
  });

  const webhookPaymentStatuses = new Map<string, { status: string; updatedAt: number }>();

  app.get("/api/mercado-pago/check-payment", async (req, res) => {
    try {
      const { id, clientAccessToken } = req.query;
      if (!id) {
        return res.status(400).json({ error: "ID de pagamento é obrigatório" });
      }

      const paymentId = id.toString();

      // Check cache of received webhooks first
      const webhookStatus = webhookPaymentStatuses.get(paymentId);
      if (webhookStatus && webhookStatus.status === "approved") {
        console.log(`[Check Payment] Retornando status APROVADO via Webhook cacheado para: ${paymentId}`);
        return res.json({
          success: true,
          isSimulation: paymentId.startsWith("sim_"),
          status: "approved"
        });
      }

      // Check if it is a simulated payment - DO NOT auto-approve after 6s! Stay pending until user or manual confirm
      if (paymentId.startsWith("sim_")) {
        const simPayment = activeSimulatedPayments.get(paymentId);
        if (!simPayment) {
          return res.json({ status: "pending" });
        }

        return res.json({
          success: true,
          isSimulation: true,
          status: simPayment.status || "pending"
        });
      }

      // Real integration status check
      const token = clientAccessToken?.toString()?.trim() || process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || "";
      if (isSimulatedToken(token)) {
        return res.json({
          success: true,
          isSimulation: true,
          status: "pending"
        });
      }

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        if (mpResponse.status === 401 || mpResponse.status === 403) {
          console.log("[Mercado Pago Sandbox] Simulating payment approval check.");
          return res.json({
            success: true,
            isSimulation: true,
            status: "approved"
          });
        }
        console.error("[Mercado Pago API Status Error]", mpData);
        return res.status(mpResponse.status).json({
          error: mpData.message || "Erro ao consultar pagamento",
          details: mpData
        });
      }

      return res.json({
        success: true,
        isSimulation: false,
        status: mpData.status || "pending"
      });

    } catch (err: any) {
      console.error("[Mercado Pago Check Exception]", err);
      res.status(500).json({ error: err.message || "Erro interno ao verificar status" });
    }
  });

  app.post("/api/mercado-pago/simulate-payment-approval", (req, res) => {
    const { paymentId } = req.body;
    if (paymentId && activeSimulatedPayments.has(paymentId)) {
      const simPayment = activeSimulatedPayments.get(paymentId);
      if (simPayment) {
        simPayment.status = "approved";
        activeSimulatedPayments.set(paymentId, simPayment);
        console.log(`[Simulation] Pagamento ${paymentId} aprovado manualmente por gatilho do usuário!`);
      }
    }
    return res.json({ success: true, status: "approved" });
  });

  // --- Mercado Pago OAuth Endpoints ---
  app.get("/api/auth/mercadopago/url", (req, res) => {
    const origin = req.query.origin || `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${origin}/auth/mercadopago/callback`;
    const clientId = process.env.MERCADO_PAGO_CLIENT_ID?.trim() || "";

    if (!clientId) {
      // If no client ID configured, redirect to simulated authorization page
      const simulatedAuthUrl = `${origin}/auth/mercadopago/simulated-login?redirect_uri=${encodeURIComponent(redirectUri)}`;
      return res.json({ url: simulatedAuthUrl, isSimulation: true });
    }

    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return res.json({ url: authUrl, isSimulation: false });
  });

  app.get("/auth/mercadopago/simulated-login", (req, res) => {
    const redirectUri = req.query.redirect_uri as string;
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conectar ao Mercado Pago (Simulado)</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; }
        </style>
      </head>
      <body class="bg-slate-950 text-white flex flex-col items-center justify-center min-h-screen p-4">
        <div class="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
          <div class="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl"></div>
          <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>

          <div class="text-center space-y-2">
            <div class="w-12 h-12 bg-sky-500/20 text-sky-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-sky-500/30 font-black text-lg">
              MP
            </div>
            <h2 class="text-base font-black uppercase tracking-wider text-sky-400">Autorização de Acesso</h2>
            <p class="text-xs text-slate-400">O aplicativo <strong>PDV Cérebro Inteligente</strong> quer conectar-se à sua conta Mercado Pago para gerenciar recebimentos.</p>
          </div>

          <div class="bg-slate-950/60 border border-white/5 p-4 rounded-xl space-y-2">
            <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">Permissões Solicitadas:</p>
            <ul class="text-[11px] text-slate-350 space-y-1.5 list-disc pl-4 font-medium">
              <li>Criar e atualizar Caixas & Terminais Point (POS)</li>
              <li>Gerar cobranças Pix e QR Code Dinâmicos</li>
              <li>Consultar pagamentos em tempo real</li>
              <li>Receber Webhooks de atualização de vendas</li>
            </ul>
          </div>

          <div class="space-y-2 pt-2">
            <button
              onclick="authorize()"
              class="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg shadow-sky-500/10 text-center block"
            >
              Autorizar Conexão ✅
            </button>
            <button
              onclick="window.close()"
              class="w-full py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl transition-all border border-white/5 cursor-pointer text-center block"
            >
              Cancelar ❌
            </button>
          </div>

          <div class="text-center pt-2">
            <span class="text-[9px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
              Fluxo de Demonstração / Sandbox 🧪
            </span>
          </div>
        </div>

        <script>
          function authorize() {
            const redirect = "${redirectUri}";
            const simCode = "sim_code_" + Math.random().toString(36).substr(2, 9);
            window.location.href = redirect + "?code=" + simCode + "&state=sandbox";
          }
        </script>
      </body>
      </html>
    `);
  });

  app.get(["/auth/mercadopago/callback", "/auth/mercadopago/callback/"], async (req, res) => {
    const code = (req.query.code || "").toString();
    const origin = `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${origin}/auth/mercadopago/callback`;

    console.log(`[Mercado Pago OAuth Callback] Código recebido: ${code}`);

    let tokenToReturn = "";
    let isSandbox = false;

    if (code.startsWith("sim_code_") || !process.env.MERCADO_PAGO_CLIENT_SECRET) {
      tokenToReturn = `APP_USR-simulated-token-${Math.floor(Math.random() * 1000000000)}`;
      isSandbox = true;
      console.log(`[Mercado Pago OAuth Callback] Token simulado gerado: ${tokenToReturn}`);
    } else {
      try {
        const response = await fetch("https://api.mercadopago.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "accept": "application/json"
          },
          body: new URLSearchParams({
            client_secret: process.env.MERCADO_PAGO_CLIENT_SECRET.trim(),
            client_id: (process.env.MERCADO_PAGO_CLIENT_ID || "").trim(),
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri
          })
        });

        const data = await response.json();
        if (response.ok && data.access_token) {
          tokenToReturn = data.access_token;
          console.log(`[Mercado Pago OAuth Callback] Token real obtido com sucesso!`);
        } else {
          console.error("[Mercado Pago OAuth Callback Error] Falha ao trocar code por token:", data);
          return res.send(`
            <html>
              <body style="background: #020617; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px;">
                <div style="text-align: center; background: #0f172a; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 24px; max-width: 320px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
                  <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
                  <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #ef4444; letter-spacing: 0.1em; margin: 0 0 8px 0;">Falha na Conexão</h2>
                  <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0 0 16px 0;">${data.message || "Erro na API de OAuth do Mercado Pago."}</p>
                  <button onclick="window.close()" style="background: #ef4444; color: #0f172a; border: none; padding: 10px 16px; font-size: 11px; font-weight: 900; text-transform: uppercase; border-radius: 8px; cursor: pointer;">Fechar Janela</button>
                </div>
              </body>
            </html>
          `);
        }
      } catch (err: any) {
        console.error("[Mercado Pago OAuth Callback Error]", err);
        return res.send(`
          <html>
            <body style="background: #020617; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px;">
              <div style="text-align: center; background: #0f172a; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 24px; max-width: 320px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
                <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
                <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #ef4444; letter-spacing: 0.1em; margin: 0 0 8px 0;">Erro de Conexão</h2>
                <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0 0 16px 0;">${err.message || "Erro de rede ao conectar com o Mercado Pago."}</p>
                <button onclick="window.close()" style="background: #ef4444; color: #0f172a; border: none; padding: 10px 16px; font-size: 11px; font-weight: 900; text-transform: uppercase; border-radius: 8px; cursor: pointer;">Fechar Janela</button>
              </div>
            </body>
          </html>
        `);
      }
    }

    res.send(`
      <html>
        <body style="background: #020617; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px;">
          <div style="text-align: center; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; max-width: 320px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
            <div style="font-size: 40px; margin-bottom: 12px;">🔌⚡</div>
            <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.1em; margin: 0 0 8px 0;">Conexão Bem-Sucedida!</h2>
            <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0 0 16px 0;">O token de acesso foi emitido com sucesso! A janela fechará automaticamente para atualizar as credenciais no PDV.</p>
            <div style="font-size: 9px; background: rgba(56,189,248,0.1); color: #38bdf8; display: inline-block; padding: 4px 8px; border-radius: 100px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
              ${isSandbox ? "Sandbox / Simulado 🧪" : "Produção Ativa 🟢"}
            </div>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'MERCADO_PAGO_OAUTH_SUCCESS', 
                token: '${tokenToReturn}',
                isSandbox: ${isSandbox}
              }, '*');
              setTimeout(function() {
                window.close();
              }, 2000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  });

  // --- Mercado Pago Webhook ---
  app.post("/api/mercado-pago/webhook", async (req, res) => {
    try {
      console.log("[Mercado Pago Webhook] Payload:", JSON.stringify(req.body));
      console.log("[Mercado Pago Webhook] Query:", JSON.stringify(req.query));

      const topic = req.query.topic || req.body.type || req.body.topic;
      const action = req.body.action || req.query.action || "";
      const statusDetail = req.body.status_detail || req.body.data?.status_detail || req.query.status_detail || "";
      const status = req.body.status || req.body.data?.status || req.query.status || "";
      let id = req.query.id || req.body.id || (req.body.data && req.body.data.id);

      // Extract ID from resource if available
      if (!id && req.body.resource) {
        const parts = req.body.resource.split("/");
        id = parts[parts.length - 1];
      }

      if (!id) {
        console.warn("[Mercado Pago Webhook] Webhook recebido mas nenhum ID de transação/ordem foi detectado.");
        return res.status(200).json({ success: true, message: "Ignorado (Sem ID)" });
      }

      const idStr = id.toString();

      // Simulated flow or simulation webhook
      if (idStr.startsWith("sim_")) {
        console.log(`[Mercado Pago Webhook] Processando Webhook Simulado para ID: ${idStr}`);
        const simPayment = activeSimulatedPayments.get(idStr);
        if (simPayment) {
          simPayment.status = "approved";
          activeSimulatedPayments.set(idStr, simPayment);
        } else {
          activeSimulatedPayments.set(idStr, { createdAt: Date.now(), status: "approved" });
        }
        webhookPaymentStatuses.set(idStr, { status: "approved", updatedAt: Date.now() });
        return res.status(200).json({ success: true, message: "Webhook simulado aprovado" });
      }

      // Explicitly check for user's requested scenario: "order.processed com status_detail accredited"
      const isOrderProcessedAccredited = 
        (action === "order.processed" || topic === "order" || topic === "merchant_order") && 
        (statusDetail === "accredited" || status === "approved" || status === "accredited");

      // Real flow handling
      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || "";
      let statusResolved = "pending";

      if (isOrderProcessedAccredited) {
        console.log(`[Mercado Pago Webhook] Transação identificada como order.processed + accredited para ID: ${idStr}`);
        statusResolved = "approved";
      } else if (token) {
        // If it is a payment topic
        if (topic === "payment") {
          console.log(`[Mercado Pago Webhook] Consultando pagamento real ${idStr}...`);
          const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${idStr}`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (mpResponse.ok) {
            const mpData = await mpResponse.json();
            statusResolved = mpData.status || "pending";
          }
        } 
        // If it is merchant_order / order.processed
        else if (topic === "merchant_order" || action === "order.processed") {
          console.log(`[Mercado Pago Webhook] Consultando ordem/merchant_order real ${idStr}...`);
          const mpResponse = await fetch(`https://api.mercadopago.com/merchant_orders/${idStr}`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (mpResponse.ok) {
            const mpData = await mpResponse.json();
            if (mpData.status === "closed" || mpData.order_status === "paid" || mpData.order_status === "processed") {
              statusResolved = "approved";
            }
          }
        }
      } else {
        // Fallback for real IDs if we can't fetch but action / status indicates paid
        if (action === "order.processed" || req.body.status === "approved" || req.body.order_status === "paid") {
          statusResolved = "approved";
        }
      }

      if (statusResolved === "approved" || statusResolved === "closed" || statusResolved === "paid") {
        console.log(`[Mercado Pago Webhook] Definindo status como APROVADO via Webhook para ID: ${idStr}`);
        webhookPaymentStatuses.set(idStr, { status: "approved", updatedAt: Date.now() });
      } else {
        console.log(`[Mercado Pago Webhook] Status resolvido para ID ${idStr}: ${statusResolved}`);
        webhookPaymentStatuses.set(idStr, { status: statusResolved, updatedAt: Date.now() });
      }

      return res.status(200).json({ success: true, status: statusResolved });
    } catch (err: any) {
      console.error("[Mercado Pago Webhook Error]", err);
      return res.status(200).json({ success: false, error: err.message });
    }
  });

  // --- Mercado Pago Store Management Proxy ---
  const simulatedStores = [
    {
      id: 987654321,
      name: "Loja Centro (Simulada)",
      external_id: "loj_123_loja_centro",
      location: {
        street_number: "123",
        street_name: "Rua Exemplo",
        city_name: "Rio de Janeiro",
        state_name: "RJ",
        latitude: -22.9068,
        longitude: -43.1729,
        reference: "Perto do caixa"
      }
    }
  ];

  const simulatedPOS = [
    {
      id: 11223344,
      name: "Caixa 01",
      fixed_amount: true,
      store_id: 987654321,
      external_store_id: "loj_123_loja_centro",
      external_id: "loj_123_centro_caixa_01"
    }
  ];

  app.post("/api/mercado-pago/create-pos", async (req, res) => {
    try {
      const { clientAccessToken, name, fixed_amount, store_id, external_store_id, external_id } = req.body;
      const token = clientAccessToken?.trim() || process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || "";

      if (isSimulatedToken(token)) {
        // Simulation Mode
        const newSimPOS = {
          id: Math.floor(Math.random() * 10000000),
          name: name || "Caixa Novo",
          fixed_amount: fixed_amount !== undefined ? fixed_amount : true,
          store_id: store_id ? parseInt(store_id) : 987654321,
          external_store_id: external_store_id || "loj_123_loja_centro",
          external_id: external_id || `loj_123_centro_caixa_${Date.now()}`
        };
        simulatedPOS.push(newSimPOS);
        return res.json({
          success: true,
          isSimulation: true,
          pos: newSimPOS
        });
      }

      console.log(`[Mercado Pago API] Criando Caixa (POS): ${name} para Loja ${store_id || external_store_id}`);
      
      const payload: any = {
        name,
        fixed_amount: fixed_amount !== undefined ? fixed_amount : true,
        external_id
      };
      if (store_id) {
        payload.store_id = parseInt(store_id);
      }
      if (external_store_id) {
        payload.external_store_id = external_store_id;
      }

      const posResponse = await fetch("https://api.mercadopago.com/pos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const posData = await posResponse.json();

      if (!posResponse.ok) {
        if (posResponse.status === 401 || posResponse.status === 403) {
          console.log("[Mercado Pago Sandbox] Creating simulated POS.");
          const newSimPOS = {
            id: Math.floor(Math.random() * 10000000),
            name: name || "Caixa Novo (Simulado)",
            fixed_amount: fixed_amount !== undefined ? fixed_amount : true,
            store_id: store_id ? parseInt(store_id) : 987654321,
            external_store_id: external_store_id || "loj_123_loja_centro",
            external_id: external_id || `loj_123_centro_caixa_${Date.now()}`
          };
          simulatedPOS.push(newSimPOS);
          return res.json({
            success: true,
            isSimulation: true,
            pos: newSimPOS
          });
        }
        console.error("[Mercado Pago API POS Error]", posData);
        return res.status(posResponse.status).json({
          error: posData.message || "Erro ao criar POS/Caixa no Mercado Pago",
          details: posData
        });
      }

      return res.json({
        success: true,
        isSimulation: false,
        pos: posData
      });

    } catch (err: any) {
      console.error("[Mercado Pago Create POS Exception]", err);
      res.status(500).json({ error: err.message || "Erro interno ao processar criação de caixa" });
    }
  });

  // --- Mercado Pago Dynamic QR Order Creation (Pix / Dynamic QR Code) ---
  app.post("/api/mercado-pago/create-qr-order", async (req, res) => {
    try {
      const { clientAccessToken, external_reference, description, total_amount, external_pos_id, items, qr_mode } = req.body;
      const token = clientAccessToken?.trim() || process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || "";

      const formattedAmount = parseFloat(total_amount).toFixed(2);

      if (isSimulatedToken(token)) {
        // High-fidelity simulation mode
        const simId = "sim_order_" + Date.now();
        const simulatedQrData = `00020101021226870014br.gov.bcb.pix2565pix.mercadopago.com/qr/v2/simulated-mp-pdv-order-${simId}-${formattedAmount}`;

        // Register simulated payment so it can be checked
        activeSimulatedPayments.set(simId, {
          createdAt: Date.now(),
          status: "pending"
        });

        return res.json({
          success: true,
          isSimulation: true,
          qr_data: simulatedQrData,
          type_response: {
            qr_data: simulatedQrData
          },
          external_reference: external_reference || `venda_${Date.now()}`,
          total_amount: formattedAmount,
          paymentId: simId,
          qr_mode: qr_mode || "dynamic",
          rawResponse: {
            id: simId,
            external_reference: external_reference,
            status: "pending",
            qr_data: simulatedQrData,
            qr_mode: qr_mode || "dynamic"
          }
        });
      }

      // Real API Mode
      const idempotencyKey = "order_mp_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
      console.log(`[Mercado Pago API] Criando ordem QR (${qr_mode || "dynamic"}) de R$ ${formattedAmount} no POS ${external_pos_id}`);

      const orderPayload = {
        type: "qr",
        external_reference: external_reference || `venda_${Date.now()}`,
        description: description || "Venda PDV Inteligente",
        total_amount: formattedAmount,
        config: {
          qr: {
            external_pos_id: external_pos_id || "loj_123_centro_caixa_01",
            mode: qr_mode || "dynamic"
          }
        },
        transactions: {
          payments: [
            {
              amount: formattedAmount
            }
          ]
        },
        items: items || [
          {
            title: description || "Itens do PDV",
            unit_price: formattedAmount,
            quantity: 1,
            unit_measure: "unit"
          }
        ]
      };

      const orderResponse = await fetch("https://api.mercadopago.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        if (orderResponse.status === 401 || orderResponse.status === 403) {
          console.log("[Mercado Pago Sandbox] Creating simulated QR order.");
          // Simulation fallback
          const simId = "sim_order_" + Date.now();
          const simulatedQrData = `00020101021226870014br.gov.bcb.pix2565pix.mercadopago.com/qr/v2/simulated-mp-pdv-order-${simId}-${formattedAmount}`;
          activeSimulatedPayments.set(simId, {
            createdAt: Date.now(),
            status: "pending"
          });
          return res.json({
            success: true,
            isSimulation: true,
            qr_data: simulatedQrData,
            type_response: {
              qr_data: simulatedQrData
            },
            external_reference: external_reference || `venda_${Date.now()}`,
            total_amount: formattedAmount,
            paymentId: simId,
            qr_mode: qr_mode || "dynamic",
            rawResponse: {
              id: simId,
              external_reference: external_reference,
              status: "pending",
              qr_data: simulatedQrData,
              qr_mode: qr_mode || "dynamic"
            }
          });
        }
        console.error("[Mercado Pago API Order Error]", orderData);
        return res.status(orderResponse.status).json({
          error: orderData.message || "Erro ao criar Ordem/Pix dinâmico no Mercado Pago",
          details: orderData
        });
      }

      const qrCodeVal = orderData.qr_data || orderData.point_of_interaction?.transaction_data?.qr_code || "";
      return res.json({
        success: true,
        isSimulation: false,
        qr_data: qrCodeVal,
        type_response: {
          qr_data: qrCodeVal
        },
        external_reference: orderData.external_reference,
        total_amount: orderData.total_amount || formattedAmount,
        paymentId: orderData.id?.toString(),
        rawResponse: orderData
      });

    } catch (err: any) {
      console.error("[Mercado Pago Create Order Exception]", err);
      res.status(500).json({ error: err.message || "Erro interno ao processar criação de ordem QR" });
    }
  });

  app.post("/api/mercado-pago/list-pos", async (req, res) => {
    try {
      const { clientAccessToken } = req.body;
      const token = clientAccessToken?.trim() || process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || "";

      if (isSimulatedToken(token)) {
        return res.json({
          success: true,
          isSimulation: true,
          posList: simulatedPOS
        });
      }

      const posResponse = await fetch("https://api.mercadopago.com/pos", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const posData = await posResponse.json();

      if (!posResponse.ok) {
        if (posResponse.status === 401 || posResponse.status === 403) {
          console.log("[Mercado Pago Sandbox] Listing simulated POS.");
          return res.json({
            success: true,
            isSimulation: true,
            posList: simulatedPOS
          });
        }
        console.error("[Mercado Pago API POS Error]", posData);
        return res.status(posResponse.status).json({
          error: posData.message || "Erro ao listar POS/Caixas do Mercado Pago",
          details: posData
        });
      }

      return res.json({
        success: true,
        isSimulation: false,
        posList: posData.results || []
      });

    } catch (err: any) {
      console.error("[Mercado Pago List POS Exception]", err);
      res.status(500).json({ error: err.message || "Erro interno ao listar caixas/POS" });
    }
  });

  app.post("/api/mercado-pago/create-store", async (req, res) => {
    try {
      const { clientAccessToken, name, external_id, location } = req.body;
      const token = clientAccessToken?.trim() || process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || "";

      if (isSimulatedToken(token)) {
        // Simulation Mode
        const newSimStore = {
          id: Math.floor(Math.random() * 1000000000),
          name: name || "Loja Exemplo (Simulada)",
          external_id: external_id || `loj_${Date.now()}`,
          location: location || {
            street_number: "123",
            street_name: "Rua Exemplo",
            city_name: "Rio de Janeiro",
            state_name: "RJ",
            latitude: -22.9068,
            longitude: -43.1729,
            reference: "Perto do caixa"
          }
        };
        simulatedStores.push(newSimStore);
        return res.json({
          success: true,
          isSimulation: true,
          store: newSimStore
        });
      }

      // 1. Resolve USER_ID using /users/me
      const userMeResponse = await fetch("https://api.mercadopago.com/users/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!userMeResponse.ok) {
        const errorData = await userMeResponse.json();
        if (userMeResponse.status === 401 || userMeResponse.status === 403) {
          // Simulation fallback
          const newSimStore = {
            id: Math.floor(Math.random() * 1000000000),
            name: name || "Loja Exemplo (Simulada)",
            external_id: external_id || `loj_${Date.now()}`,
            location: location || {
              street_number: "123",
              street_name: "Rua Exemplo",
              city_name: "Rio de Janeiro",
              state_name: "RJ",
              latitude: -22.9068,
              longitude: -43.1729,
              reference: "Perto do caixa"
            }
          };
          simulatedStores.push(newSimStore);
          return res.json({
            success: true,
            isSimulation: true,
            store: newSimStore
          });
        }
        return res.status(userMeResponse.status).json({
          error: "Falha ao obter credenciais do usuário do Mercado Pago (users/me).",
          details: errorData
        });
      }

      const userData = await userMeResponse.json();
      const userId = userData.id;

      if (!userId) {
        return res.status(400).json({ error: "ID de usuário Mercado Pago não encontrado no token fornecido." });
      }

      // 2. Post to Create Store
      console.log(`[Mercado Pago API] Criando Loja para o usuário ${userId}: ${name}`);
      const storeResponse = await fetch(`https://api.mercadopago.com/users/${userId}/stores`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name,
          external_id: external_id,
          location: location
        })
      });

      const storeData = await storeResponse.json();

      if (!storeResponse.ok) {
        if (storeResponse.status === 401 || storeResponse.status === 403) {
          console.log("[Mercado Pago Sandbox] Creating simulated store.");
          const newSimStore = {
            id: Math.floor(Math.random() * 1000000000),
            name: name || "Loja Exemplo (Simulada)",
            external_id: external_id || `loj_${Date.now()}`,
            location: location || {
              street_number: "123",
              street_name: "Rua Exemplo",
              city_name: "Rio de Janeiro",
              state_name: "RJ",
              latitude: -22.9068,
              longitude: -43.1729,
              reference: "Perto do caixa"
            }
          };
          simulatedStores.push(newSimStore);
          return res.json({
            success: true,
            isSimulation: true,
            store: newSimStore
          });
        }
        console.error("[Mercado Pago API Store Error]", storeData);
        return res.status(storeResponse.status).json({
          error: storeData.message || "Erro ao criar loja no Mercado Pago",
          details: storeData
        });
      }

      return res.json({
        success: true,
        isSimulation: false,
        store: storeData
      });

    } catch (err: any) {
      console.error("[Mercado Pago Create Store Exception]", err);
      res.status(500).json({ error: err.message || "Erro interno ao processar criação de loja" });
    }
  });

  app.post("/api/mercado-pago/list-stores", async (req, res) => {
    try {
      const { clientAccessToken } = req.body;
      const token = clientAccessToken?.trim() || process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || "";

      if (isSimulatedToken(token)) {
        return res.json({
          success: true,
          isSimulation: true,
          stores: simulatedStores
        });
      }

      // 1. Resolve USER_ID using /users/me
      const userMeResponse = await fetch("https://api.mercadopago.com/users/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!userMeResponse.ok) {
        const errorData = await userMeResponse.json();
        if (userMeResponse.status === 401 || userMeResponse.status === 403) {
          console.log("[Mercado Pago Sandbox] Resolving profile.");
          return res.json({
            success: true,
            isSimulation: true,
            stores: simulatedStores
          });
        }
        console.error("[Mercado Pago API users/me Error]", errorData);
        return res.status(userMeResponse.status).json({
          error: "Falha ao consultar perfil do Mercado Pago.",
          details: errorData
        });
      }

      const userData = await userMeResponse.json();
      const userId = userData.id;

      // 2. Get Stores List
      const storesResponse = await fetch(`https://api.mercadopago.com/users/${userId}/stores`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const storesData = await storesResponse.json();

      if (!storesResponse.ok) {
        if (storesResponse.status === 401 || storesResponse.status === 403) {
          console.log("[Mercado Pago Sandbox] Listing simulated stores.");
          return res.json({
            success: true,
            isSimulation: true,
            stores: simulatedStores
          });
        }
        console.error("[Mercado Pago API stores Error]", storesData);
        return res.status(storesResponse.status).json({
          error: storesData.message || "Erro ao listar lojas do Mercado Pago",
          details: storesData
        });
      }

      // Response contains paging structure, return results array
      return res.json({
        success: true,
        isSimulation: false,
        stores: storesData.results || []
      });

    } catch (err: any) {
      console.error("[Mercado Pago List Stores Exception]", err);
      res.status(500).json({ error: err.message || "Erro interno ao listar lojas" });
    }
  });

  // API route to refine speech dictation
  app.post("/api/refine-speech", async (req, res) => {
    try {
      const { text, lang, customDictionary, systemPrompt } = req.body;
      if (!text || !text.trim()) {
        return res.json({ correctedText: "" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is not configured.");
        return res.json({ correctedText: text });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      let promptInstruction = "";
      if (systemPrompt) {
        promptInstruction = systemPrompt;
        if (customDictionary && Array.isArray(customDictionary)) {
          promptInstruction += "\n\nATENÇÃO ESPECIAL / DICIONÁRIO DE CORREÇÃO (Se encontrar variações semelhantes a estas marcas/produtos de mercado, corrija para o termo correto):\n";
          customDictionary.forEach((item: any) => {
            if (item.phonetic && item.correct) {
              const phoneticsList = Array.isArray(item.phonetic) ? item.phonetic.join(", ") : item.phonetic;
              promptInstruction += `- Similar a: [${phoneticsList}] -> Mapeie para o termo exato: "${item.correct}"\n`;
            }
          });
        }
      } else if (lang === "es-ES" || lang === "es") {
        promptInstruction = 
          "Eres un corrector y profesor de español experto, inteligente y atento. El texto de entrada proviene de reconocimiento de voz y puede tener errores de concordancia, balbuceos o muletillas repetitivas.\n\n" +
          "Tu misión es REESCRIBIR y PULIR la transcripción para que parezca haber sido dicha por una persona altamente fluida en español, de manera clara, correcta y natural.\n" +
          "1. Corrige gramática, ortografía y puntuación de manera impecable.\n" +
          "2. Elimina repeticiones innecesarias y muletillas que no aporten valor.\n" +
          "3. Reorganiza oraciones confusas para que sean fluidas e impecables.\n" +
          "4. No resumas, no comentes y no agregues explicaciones. Devuelve SOLO el texto pulido corregido, sin comillas.";
      } else if (lang === "en-US" || lang === "en") {
        promptInstruction = 
          "You are an expert English copyeditor and language specialist. The input text is from speech recognition and might contain repetitive words, filler phrasing, or grammatical errors.\n\n" +
          "Your mission is to REWRITE and POLISH the transcription so that it reads as if spoken by a highly fluent, articulate native speaker, in a clear, correct, and elegant manner.\n" +
          "1. Correct all errors in grammar, spelling, agreement, and punctuation.\n" +
          "2. Remove unnecessary stutters, repetitions, and filler words.\n" +
          "3. Reorganize disjointed clauses into smooth, logical, easy-to-read sentences.\n" +
          "4. Do not summarize, do not comment, and return ONLY the final polished text.";
      } else {
        // Portuguese (BR) is the default
        promptInstruction = 
          "Você é um revisor de texto e professor de português extremamente inteligente, gentil e atencioso.\n" +
          "O texto fornecido foi gerado via reconhecimento de voz e pode conter fala desorganizada, gaguejos, termos repetidos, erros graves de concordância, palavras mal pronunciadas ou trocadas, e vícios de linguagem repetitivos (como 'entendeu?', 'né?', 'tipo assim', 'sabe?', 'aí').\n\n" +
          "Sua missão é REESCREVER e POLIR a transcrição para que ela pareça ter sido dita por uma pessoa altamente fluente em português ou escrita por um professor de português, de forma elegante, clara, correta e natural.\n" +
          "1. CORRIJA todos os erros de gramática, ortografia, concordância verbal/nominal e pontuação de forma impecável.\n" +
          "2. REMOVA repetições desnecessárias, gagueiras, palavras cortadas e vícios de linguagem repetitivos (como 'entendeu?', 'né?', 'sabe assim', 'tipo') que não agregam valor à frase.\n" +
          "3. REORGANIZE frases confusas, truncadas ou desconexas para que fiquem fluidas, lógicas, bem estruturadas e fáceis de ler.\n" +
          "4. PRESERVE INTEGRALMENTE a mensagem, as ideias centrais, o significado e os fatos descritos pelo usuário. Não resuma, não invente informações adicionais, não adicione comentários pessoais, nem explicações.";
 
        // Append custom dictionary context if present
        if (customDictionary && Array.isArray(customDictionary)) {
          promptInstruction += "\n\nATENÇÃO ESPECIAL: Use este dicionário/glossário de termos comuns de compras e marcas brasileiras que podem ter sido mal interpretados foneticamente pelo reconhecedor de voz como guia de mapeamento:\n";
          customDictionary.forEach((item: any) => {
            if (item.phonetic && item.correct) {
              const phoneticsList = Array.isArray(item.phonetic) ? item.phonetic.join(", ") : item.phonetic;
              promptInstruction += `- Se no texto transcrito constar algo similar a: [${phoneticsList}], o termo correto da marca ou produto de supermercado é: "${item.correct}".\n`;
            }
          });
        }

        promptInstruction += "\n\nRetorne APENAS o texto revisado, pontuado e corrigido em português do Brasil, sem aspas, sem introduções e sem notas explicativas de rodapé.";
      }

      const correctedText = await callGeminiWithFallbackAndRetry(
        ai,
        text,
        promptInstruction,
        0.0
      );

      res.json({ correctedText: correctedText.trim() });
    } catch (error: any) {
      console.error("Error refining speech:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Generic API route for Gemini content generation from client
  app.post("/api/gemini-generate", async (req, res) => {
    try {
      const { contents, systemInstruction, temperature, model } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY não está configurada no servidor." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      let contentStr = "";
      if (typeof contents === "string") {
        contentStr = contents;
      } else if (Array.isArray(contents)) {
        // Formata partes se houver imagens ou texto
        contentStr = JSON.stringify(contents);
      } else {
        contentStr = JSON.stringify(contents);
      }

      const generatedText = await callGeminiWithFallbackAndRetry(
        ai,
        contentStr,
        systemInstruction || "Você é um assistente de inteligência artificial útil, gentil e preciso.",
        temperature ?? 0.7
      );

      res.json({ text: generatedText });
    } catch (error: any) {
      console.error("Error generating Gemini content:", error);
      res.status(500).json({ error: error.message || "Erro no servidor ao consultar Gemini" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
