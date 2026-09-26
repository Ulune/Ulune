import { parseGrokJson } from "../src/lib/chart/parse-grok-json.ts";

const dump = `Thème natal — zodiaque tropical, maisons Placidus
Nom: Sample B
Naissance : 1987-11-03 à 23:10 locale (Europe/Oslo)
Lieu: Oslo, Norway (59.9139, 10.7522)
ANGLES
ASC 2° Lion (maître du thème: le Soleil)
MC  24° Bélier
PLANÈTES
Le Soleil 11° Scorpion · maison IV
La Lune 9° Taureau · maison X
Mars 17° Balance · maison III
ASPECTS MAJEURS
le Soleil en opposition à la Lune · orbe 2,1°`;

const system = `Tu es un astrologue natal précis. Vouvoiement. Français natif.
Réponds UNIQUEMENT avec les balises. Pas de JSON. Pas de markdown.`;

const user = `Interprétation natale.

${dump}

Format exact :
@@TITLE@@
courte épithète
@@PORTRAIT@@
2 paragraphes
@@SECTION@@ Identité
texte
@@SECTION@@ Synthèse
texte
@@END@@

Chaque section : 3 phrases. Interdit : JSON, accolades.`;

const res = await fetch("https://api.x.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.XAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: "grok-4.5",
    reasoning_effort: "low",
    max_tokens: 1400,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  }),
});

if (!res.ok) {
  const err = await res.text();
  throw new Error(`xAI ${res.status}: ${err.slice(0, 400)}`);
}

const body = await res.json();
const text = body.choices?.[0]?.message?.content ?? "";
if (!text) throw new Error("empty model content");

let parsed;
try {
  parsed = parseGrokJson(text);
} catch (err) {
  console.error("RAW_START\n", text.slice(0, 800), "\nRAW_END");
  throw err;
}

const portrait = parsed.portrait ?? "";
const sections = parsed.sections ?? [];
if (portrait.length < 40) {
  console.error("PARSED", parsed);
  throw new Error("portrait too short");
}
if (!/vous|votre|thème|ascendant|soleil|lune|bélier|verseau/i.test(`${portrait} ${sections[0]?.body ?? ""}`)) {
  console.error("PARSED", parsed);
  throw new Error("reading does not look French");
}
if (/Expected ','|JSON at position/.test(JSON.stringify(parsed))) {
  throw new Error("parser leaked a JSON error");
}

console.log(
  "GROK_FR_OK",
  parsed.portraitTitle ?? "",
  sections.length,
  portrait.slice(0, 80).replace(/\n/g, " "),
);
