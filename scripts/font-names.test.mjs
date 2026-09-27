// The glyph font is a subset of Astronomicon, whose licence (SIL OFL 1.1)
// reserves that name for the original: the subset is "Ulune Classic" in its
// own name table, in the styles, and wherever a reader sees its name.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url));

const KNOWN_TAGS = ["cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca", "prep"];

/** The name table's strings (Windows, Unicode) of a WOFF2 file: { nameID: text }. */
function woff2Names(buf) {
  assert.equal(buf.toString("latin1", 0, 4), "wOF2", "not a WOFF2 file");
  const numTables = buf.readUInt16BE(12);
  let at = 48;
  const base128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i += 1) {
      const byte = buf[at++];
      value = value * 128 + (byte & 0x7f);
      if (!(byte & 0x80)) return value;
    }
    throw new Error("bad UIntBase128");
  };
  const tables = [];
  for (let i = 0; i < numTables; i += 1) {
    const flags = buf[at++];
    let tag = KNOWN_TAGS[flags & 0x3f] ?? `#${flags & 0x3f}`;
    if ((flags & 0x3f) === 63) {
      tag = buf.toString("latin1", at, at + 4);
      at += 4;
    }
    const version = flags >> 6;
    const origLength = base128();
    const transformed = tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    const length = transformed ? base128() : origLength;
    tables.push({ tag, length });
  }
  const stream = brotliDecompressSync(buf.subarray(at));
  let offset = 0;
  for (const t of tables) {
    t.offset = offset;
    offset += t.length;
  }
  const name = tables.find((t) => t.tag === "name");
  assert.ok(name, "no name table");
  const n = stream.subarray(name.offset, name.offset + name.length);
  const count = n.readUInt16BE(2);
  const strings = n.readUInt16BE(4);
  const out = {};
  for (let i = 0; i < count; i += 1) {
    const r = 6 + i * 12;
    const [platform, , , nameId, length, off] = [0, 2, 4, 6, 8, 10].map((k) => n.readUInt16BE(r + k));
    if (platform !== 3) continue;
    const bytes = Buffer.from(n.subarray(strings + off, strings + off + length));
    out[nameId] = bytes.swap16().toString("utf16le");
  }
  return out;
}

test("the glyph font names itself Ulune Classic, and credits Astronomicon", () => {
  const names = woff2Names(read("src/assets/fonts/UluneClassic.woff2"));
  assert.equal(names[1], "Ulune Classic");
  assert.equal(names[4], "Ulune Classic Regular");
  assert.equal(names[6], "UluneClassic-Regular");
  for (const id of [1, 3, 4, 6, 16, 17]) {
    assert.doesNotMatch(names[id] ?? "", /Astronomicon/i, `name ${id}: ${names[id]}`);
  }
  // The original's copyright and licence stay with it.
  assert.match(names[0], /Roberto Corona/);
  assert.match(names[13], /Reserved Font Name/);
  assert.match(read("src/assets/fonts/UluneClassic-OFL.txt").toString(), /Reserved Font Name Astronomicon/);
});

test("the styles and the Look panel use the new name", () => {
  const css = read("src/styles.css").toString();
  assert.match(css, /font-family: "Ulune Classic";\s+src: url\("\.\/assets\/fonts\/UluneClassic\.woff2"\)/);
  assert.doesNotMatch(css, /font-family: "Astronomicon"/);
  const look = read("src/lib/i18n/catalog/look.ts").toString();
  assert.match(look, /lookGlyphsAstronomicon: \["Ulune Classic", "Ulune Classic"\]/);
});
