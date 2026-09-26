import { parseGrokJson, isRawModelParseError } from "../src/lib/chart/parse-grok-json.ts";

const missingComma = `{
  "portraitTitle": "Feu sous la glace",
  "portrait": "Vous entrez par l'Ascendant.",
  "sections": [
    { "title": "Identité", "body": "Le Soleil en Verseau." }
    { "title": "Synthèse", "body": "Tenez le cap." }
  ]
}`;

const truncated = `{
  "portraitTitle": "Feu",
  "portrait": "Le Bélier se lève.",
  "sections": [
    { "title": "Identité", "body": "Le Soleil en`;

const tagged = `@@TITLE@@
Feu sous la glace
@@PORTRAIT@@
Le Bélier se lève. Le Soleil en Verseau tient le cap.
@@SECTION@@ Identité — le Soleil, la Lune, l'Ascendant
Le Soleil en Verseau, maison VIII.
@@SECTION@@ Synthèse
Tenez le cap, sans durcir.
@@END@@`;

const taggedTruncated = `@@TITLE@@
Feu
@@PORTRAIT@@
Le Bélier se lève.
@@SECTION@@ Identité
Le Soleil en Verseau, maison VIII.
@@SECTION@@ Le maître du thème
Mars en`;

const markdown = `# Feu sous la glace
Le Bélier se lève.

## Identité
Le Soleil en Verseau.

## Synthèse
Tenez le cap.`;

const parsed = parseGrokJson(missingComma);
if (!parsed.sections || parsed.sections.length !== 2) {
  throw new Error("missing comma repair failed: " + JSON.stringify(parsed));
}

const rescued = parseGrokJson(truncated);
if (!rescued.portrait || !/Bélier/.test(rescued.portrait)) {
  throw new Error("truncated salvage failed: " + JSON.stringify(rescued));
}

const fromTags = parseGrokJson(tagged);
if (fromTags.sections?.length !== 2 || !/Bélier/.test(fromTags.portrait)) {
  throw new Error("tagged parse failed: " + JSON.stringify(fromTags));
}

const fromTruncTags = parseGrokJson(taggedTruncated);
if (!fromTruncTags.portrait || fromTruncTags.sections?.length < 1) {
  throw new Error("tagged truncated failed: " + JSON.stringify(fromTruncTags));
}

const fromMd = parseGrokJson(markdown);
if (fromMd.sections?.length !== 2 || fromMd.portraitTitle !== "Feu sous la glace") {
  throw new Error("markdown parse failed: " + JSON.stringify(fromMd));
}

const leak = "Expected ',' or ']' after array element in JSON at position 8110 (line 32 column 6)";
if (!isRawModelParseError(leak)) {
  throw new Error("raw parse error not detected");
}

console.log("GROK_JSON_OK", parsed.sections.length, fromTags.sections.length, rescued.portrait.slice(0, 24));
