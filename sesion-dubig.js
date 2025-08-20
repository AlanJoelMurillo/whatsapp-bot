// main-debug.js
process.on('unhandledRejection', (r) => console.error('UNHANDLED REJECTION:', r));
process.on('uncaughtException', (e) => console.error('UNCAUGHT EXCEPTION:', e));

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");

const DATA_PATH = path.resolve(__dirname, ".wwebjs_auth");
const SESSION_DIR = path.join(DATA_PATH, "session-bot-alarma");

// ⚙️ Usa Chromium del sistema para evitar problemas de binarios/dep. embebidas
const CHROME = process.env.CHROME_PATH || "/usr/bin/chromium"; // cambia a /usr/bin/chromium-browser si aplica

console.log("⛳ __dirname:", __dirname);
console.log("⛳ process.cwd():", process.cwd());
console.log("⛳ DATA_PATH:", DATA_PATH);
console.log("⛳ SESSION_DIR:", SESSION_DIR);
console.log("⛳ CHROME_PATH:", CHROME);

// Asegura que la carpeta base exista y que hay permisos de escritura
try {
  fs.mkdirSync(DATA_PATH, { recursive: true });
  fs.accessSync(DATA_PATH, fs.constants.R_OK | fs.constants.W_OK);
  console.log("✅ DATA_PATH accesible para lectura/escritura");
} catch (e) {
  console.error("❌ DATA_PATH SIN permisos:", e.message);
}

function dumpSessionDir(tag) {
  try {
    if (!fs.existsSync(SESSION_DIR)) {
      console.log(`[${tag}] (aún no existe) ${SESSION_DIR}`);
      return;
    }
    console.log(`\n[${tag}] Contenido de ${SESSION_DIR}:`);
    const walk = (dir, depth = 0) => {
      const items = fs.readdirSync(dir);
      for (const it of items) {
        const p = path.join(dir, it);
        const s = fs.statSync(p);
        const pad = "  ".repeat(depth);
        console.log(`${pad}${s.isDirectory() ? "📁" : "📄"} ${it}`);
        if (s.isDirectory()) walk(p, depth + 1);
      }
    };
    walk(SESSION_DIR);
    console.log("");
  } catch (e) {
    console.error(`[${tag}] Error listando sesión:`, e.message);
  }
}

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "bot-alarma",
    dataPath: DATA_PATH, // 🔒 ruta absoluta y estable
  }),
  puppeteer: {
    headless: true,
    executablePath: CHROME, // 🔧 fuerza Chromium del sistema
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      // ⚠️ quita '--single-process' en debug: a veces rompe en ciertos kernels
    ],
  },
  // restartOnAuthFail puede ayudar a recuperar, pero si hay fallo de base mejor verlo explotar
  // restartOnAuthFail: true,
});

// === Eventos clave para saber en qué estado estamos ===
client.on("qr", (qr) => {
  console.log("📲 Escanea este QR:");
  qrcode.generate(qr, { small: true });
  dumpSessionDir("qr");
});

client.on("authenticated", () => {
  console.log("🔐 authenticated()");
  dumpSessionDir("authenticated");
});

client.on("auth_failure", (msg) => {
  console.error("❌ auth_failure:", msg);
  dumpSessionDir("auth_failure");
});

client.on("remote_session_saved", () => {
  console.log("💾 remote_session_saved (multi-dispositivo)");
  dumpSessionDir("remote_session_saved");
});

client.on("loading_screen", (percent, message) => {
  console.log(`⏳ loading_screen: ${percent}% - ${message}`);
});

client.on("change_state", (state) => {
  console.log("🔄 change_state:", state);
});

client.on("ready", async () => {
  console.log("✅ ready()");
  dumpSessionDir("ready");

  try {
    const st = await client.getState();
    console.log("📡 client.getState():", st);
  } catch (e) {
    console.error("getState() error:", e.message);
  }

  // Cierra tras 5s en modo prueba para verificar persistencia al reiniciar
  setTimeout(() => {
    console.log("🛑 Cerrando proceso de prueba… vuelve a ejecutar y confirma que NO pide QR.");
    process.exit(0);
  }, 5000);
});

client.on("disconnected", (reason) => {
  console.error("🔌 disconnected:", reason);
  dumpSessionDir("disconnected");
});

console.log("🚀 initialize()…");
client.initialize().catch((e) => {
  console.error("initialize() ERROR:", e);
  dumpSessionDir("initialize_error");
});
