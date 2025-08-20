const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const odbc = require("odbc");
require("dotenv").config();
const path = require("path");

// 🔹 Credenciales de conexión
const credentials = [
  { ip: process.env.DB_MPIO3_IP, pass: process.env.DB_MPIO3_PASS, name: process.env.DB_MPIO3_NAME },
  { ip: process.env.DB_MPIO4_IP, pass: process.env.DB_MPIO4_PASS, name: process.env.DB_MPIO4_NAME },
  { ip: process.env.DB_MPIOACT_IP, pass: process.env.DB_MPIOACT_PASS, name: process.env.DB_MPIOACT_NAME },
  { ip: process.env.DB_MPIOAF_IP, pass: process.env.DB_MPIOAF_PASS, name: process.env.DB_MPIOAF_NAME },
  { ip: process.env.DB_MPIOPRE_IP, pass: process.env.DB_MPIOPRE_PASS, name: process.env.DB_MPIOPRE_NAME },
  { ip: process.env.DB_MPIOAE_IP, pass: process.env.DB_MPIOAE_PASS, name: process.env.DB_MPIOAE_NAME },
  { ip: process.env.DB_MPIOPRU_I, pass: process.env.DB_MPIOPRU_PASS, name: process.env.DB_MPIOPRU_NAME },
];

// 🔹 Cliente de WhatsApp
const client = new Client({
 puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process' // <- opcional, a veces ayuda en servidores pequeños
        ],
    },
  authStrategy: new LocalAuth({
    clientId: "bot-alarma",
    dataPath: path.join(__dirname,".wwebjs_auth")

  }),
});

// Mostrar QR para iniciar sesión
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

// Cuando el cliente está listo
client.on("ready", () => {
  console.log("✅ Cliente WhatsApp listo");

  // Ejecutar inmediatamente
  checkDatabases();

  // Repetir cada 10 segundos
  setInterval(() => {
    checkDatabases();
  }, 10000); // 10 segundos
});

// Iniciar cliente
client.initialize();

// 🔹 Verificar todas las bases de datos
async function checkDatabases() {
  for (const cred of credentials) {
    await consultaSybase(cred.ip, cred.pass, cred.name);
  }
}

// 🔹 Consulta a Sybase
async function consultaSybase(ip, pass, name) {
  let connectionString;

  try {
    connectionString =
      `Driver={${process.env.DRIVER}};` +
      `Server=${ip};` +
      `Port=5000;` +
      `Database=${process.env.NAME_DB};` +
      `UID=${process.env.USER};` +
      `PWD=${pass};`+
      `TDS_Version=5.0;`;

    //const connection = await odbc.connect(connectionString);
    //await connection.query("sp_who2");
    console.log(`[ o ] ${name}`);
    //await connection.close();
  } catch (err) {
    console.error(`[ x ] ${name}`);
    sendAlert(ip, name, err.message);
  }
}

// 🔹 Enviar alerta por WhatsApp
function sendAlert(ip, name, error) {
  const number = `${process.env.PHONE}@c.us`;
  const message = `❗❗❗ Falla en servidor ❗❗❗ 
⚠️ Server: ${name} 
🌐 IP: ${ip} 
❌ Error: ${error}
🔎 https://monitoreodb.juarez.gob.mx/`;

  client.sendMessage(number, message);
}
