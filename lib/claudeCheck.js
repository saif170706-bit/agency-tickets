// Spørger Claude Code CLI'en om en stak virksomheder har egen hjemmeside.
//
// Bruges som sidste lag i lead-tjekket: har CVR ikke et URL-felt, er der
// ikke andet tilbage end at søge på nettet — og de gratis søgemaskiner
// svarer enten med skrald eller med en CAPTCHA.
//
// CLI'en er en almindelig npm-afhængighed (@anthropic-ai/claude-code), så
// den følger med deployet. Den autentificerer med CLAUDE_CODE_OAUTH_TOKEN,
// som laves én gang lokalt med `claude setup-token` og lægges i Railway.
// Uden det token slår laget fra i stedet for at fejle — så opfører systemet
// sig præcis som før: virksomheder det ikke kunne afgøre bliver liggende.

const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const BATCH_SIZE = 10;
const TIMEOUT_MS = 3 * 60 * 1000;

function cliPath() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const bin = process.platform === "win32" ? "claude.cmd" : "claude";
  const local = path.join(process.cwd(), "node_modules", ".bin", bin);
  return fs.existsSync(local) ? local : bin;
}

// På serveren autentificerer CLI'en med et token i miljøet. Kører man lokalt,
// er man allerede logget ind i CLI'en, og så peger CLAUDE_BIN bare på den.
function isAvailable() {
  return Boolean(
    process.env.CLAUDE_CODE_OAUTH_TOKEN ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.CLAUDE_BIN
  );
}

function buildPrompt(companies) {
  const list = companies
    .map(
      (c, i) =>
        `${i + 1}. id=${c.id} — ${c.navn}${c.by ? `, ${c.by}` : ""}${
          c.branchetekst ? ` (${c.branchetekst})` : ""
        }`
    )
    .join("\n");

  return `Afgør for hver dansk virksomhed nedenfor om den har sin EGEN hjemmeside på eget domæne.

Søg på nettet efter hver enkelt. Følgende tæller IKKE som egen hjemmeside:
Facebook, Instagram, LinkedIn, krak.dk, degulesider.dk, proff.dk, findsmiley.dk,
cvr-opslag, virksomhedsdatabaser, booking-portaler (fx bookingtid, timify),
markedspladser, eller en side der tilhører en anden virksomhed med lignende navn.

Sæt sikkerhed til "hoej" kun når du enten har bekræftet at siden tilhører netop
denne virksomhed, eller har søgt grundigt og intet fundet. Er du i tvivl, brug
"lav" — så bliver virksomheden liggende til senere i stedet for at blive gættet
forkert.

${list}

Svar udelukkende med et JSON-array, uden kodeblok og uden forklaring:
[{"id":"...","harHjemmeside":true,"url":"https://...","sikkerhed":"hoej"}]`;
}

function runCli(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      cliPath(),
      ["-p", prompt, "--allowedTools", "WebSearch,WebFetch", "--output-format", "json"],
      {
        cwd: os.tmpdir(), // neutral mappe: ingen projekt-CLAUDE.md læses ind
        windowsHide: true,
        // Uden lukket stdin venter CLI'en på input den aldrig får
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Claude-tjek timede ud"));
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(err.trim() || `CLI afsluttede med kode ${code}`));
      resolve(out);
    });
  });
}

// Modellen pakker af og til svaret i en kodeblok trods instruksen.
function parseVerdicts(raw) {
  const envelope = JSON.parse(raw);
  if (envelope.is_error) throw new Error(envelope.result || "CLI returnerede en fejl");
  const text = String(envelope.result || "");
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Intet JSON-array i svaret");
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error("Svaret var ikke et array");
  return parsed;
}

// Kører et minimalt opslag, så man kan se om CLI'en overhovedet virker på
// serveren. Uden den er eneste symptom at en søgning står stille.
async function selfTest() {
  const info = {
    cli: cliPath(),
    cliFindes: fs.existsSync(cliPath()),
    harToken: Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN),
    harApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
    tilgaengelig: isAvailable(),
  };
  if (!info.tilgaengelig) {
    return { ...info, ok: false, fejl: "Hverken CLAUDE_CODE_OAUTH_TOKEN eller ANTHROPIC_API_KEY er sat" };
  }
  const start = Date.now();
  try {
    const raw = await runCli("Svar kun med ordet OK.");
    const envelope = JSON.parse(raw);
    return {
      ...info,
      ok: !envelope.is_error,
      svar: String(envelope.result || "").slice(0, 200),
      sekunder: Math.round((Date.now() - start) / 1000),
    };
  } catch (e) {
    return { ...info, ok: false, fejl: e.message, sekunder: Math.round((Date.now() - start) / 1000) };
  }
}

// companies: [{id, navn, by, branchetekst}]
// Returnerer et Map fra id til {found, checked, url, method}. Virksomheder
// CLI'en ikke kunne afgøre udelades — kaldstedet behandler dem som utjekkede.
// onError giver kaldstedet besked når et opslag fejler, så fejlen kan nå
// skærmen. Havner den kun i serverloggen, ser en fejlet søgning bare ud
// som om den står stille.
async function checkWithClaude(companies, onError = () => {}) {
  const out = new Map();
  if (!companies.length) return out;
  if (!isAvailable()) {
    onError("Claude-opslag er ikke sat op på serveren (CLAUDE_CODE_OAUTH_TOKEN mangler).");
    return out;
  }

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    let verdicts;
    try {
      verdicts = parseVerdicts(await runCli(buildPrompt(batch)));
    } catch (e) {
      console.error(`Claude-tjek fejlede for ${batch.length} virksomheder: ${e.message}`);
      onError(`Opslag fejlede for ${batch.length} virksomheder: ${e.message}`);
      continue; // batchen forbliver utjekket og ryger i verifikationskøen
    }

    const byId = new Map(batch.map((c) => [String(c.id), c]));
    for (const v of verdicts) {
      const id = String(v?.id ?? "");
      if (!byId.has(id) || v.sikkerhed === "lav") continue;
      out.set(id, {
        found: Boolean(v.harHjemmeside),
        checked: true,
        url: v.harHjemmeside && typeof v.url === "string" ? v.url : null,
        method: "claude-soegning",
      });
    }
  }

  return out;
}

module.exports = { checkWithClaude, isAvailable, selfTest, BATCH_SIZE };
