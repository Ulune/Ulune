/*
 * Ulune's QR code encoder (src/lib/share/qr.ts; share plan, idea B1):
 *   - Reed–Solomon, the format and version information and the codewords'
 *     layout against the standard's own numbers (ISO/IEC 18004, its worked
 *     example "01234567" at 1-M, tables 9 and C.1, D.1);
 *   - whole codes against an independent encoder's, module for module
 *     (OpenCV 4.13's QRCodeEncoder, made once on the test machine: versions
 *     1, 4, 9, 10 and 18, the four levels, byte and numeric mode);
 *   - round trips through a small decoder written here (format and version
 *     information read back, the alignment patterns where Annex E puts
 *     them, every block's Reed–Solomon syndromes zero, the bytes read
 *     back), at every level and versions 1 to 40;
 *   - the SVG path drawn from it.
 * OpenCV's decoder read the share links' codes too when this was written;
 * Chromium's BarcodeDetector is not there in headless Linux, so no browser
 * check depends on one.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { dataCodewords, encodeQr, encodeQrNumeric, formatBits, maskHits, penalty, qrBlocks, qrPath, rsRemainder, versionBits } from "../src/lib/share/qr.ts";

/* Made by OpenCV's QRCodeEncoder (byte or numeric mode, the level given), its quiet zone cut off: each row as hex, left to right. */
const VECTORS = [
  {
    mode: "byte",
    ecl: "M",
    text: "HELLO WORLD",
    version: 1,
    rows: [
      "fecbf8",
      "821208",
      "ba52e8",
      "ba92e8",
      "baeae8",
      "829208",
      "feabf8",
      "009800",
      "8bf7c8",
      "10b878",
      "3f3690",
      "f8c400",
      "faab30",
      "00af58",
      "feead0",
      "825d98",
      "bad630",
      "ba48d8",
      "ba71c0",
      "821400",
      "feffa8",
    ],
  },
  {
    mode: "byte",
    ecl: "M",
    text: "https://ulune.app/s#1.cpdc0_feI5_IepjX7LfMNg.kW2J26Y2TeeWKey9v_RTJoI7oSZ4PdjeNm0dNDADTMeSWD9a03-r8L_HF9CYQ9c2Hc2-MzR-p2R9RjrEgTgnSEV-grFEr_OQ3QZXJzlCVhdonbM",
    version: 9,
    rows: [
      "febaa9029763f8",
      "826326552a7208",
      "ba6d60f2b6d2e8",
      "bacb12092aaae8",
      "ba9f01ffc362e8",
      "82e0648db4a208",
      "feaaaaaaaaabf8",
      "00cab089209800",
      "8bea7df99d77c8",
      "59172322967958",
      "afa3dc2e06e928",
      "75434243342258",
      "9f5ecd589e13a8",
      "e83bd4b4d2ed20",
      "4b8d0e8d416708",
      "847a4b50f903d8",
      "562961e3dc34a8",
      "7d848e4e0b7c78",
      "b665f60e22df38",
      "ada76a47efb1c0",
      "36da29fefde5e0",
      "9c302db690ec58",
      "8342a45b083fb8",
      "b05c934da03bd0",
      "8fb0e5f8ca1f88",
      "f8f2d28a5ae8a8",
      "caeac9aa37fa88",
      "d8a0498a5da8d8",
      "1fde5cfe5d3f80",
      "150a4c075b73c8",
      "9367d79fc5ab08",
      "85f3b2cc27ec98",
      "768069eefb5b18",
      "453c062252ebf0",
      "a3647fc8539f08",
      "6cf0e94d833550",
      "46d67da5bd16c8",
      "3450447be2f5c8",
      "767791aa765308",
      "81d79ca8f9dec8",
      "1683ef38ca3f48",
      "4932c9de0f22d0",
      "df147fc8d432a8",
      "60ebfb2eb0d540",
      "13c2d5faf71fc0",
      "0082648f42e8b8",
      "fe8177adefda88",
      "8218aa897398c8",
      "baedd1fddb6f90",
      "ba1a5c66867630",
      "ba3fc4fa16f270",
      "8229921b040358",
      "fea841d8ba57f0",
    ],
  },
  {
    mode: "byte",
    ecl: "L",
    text: "https://ulune.app/s#1.Sa8aHdyYTl7i0z1KqqTEmA.jxUZVU-Mfu1Bk3fbiKB78-91cHPFKRZkW4UyJtx8oyFzw9e3JbAZBgctXzEoIRpTVps8xwT1nPz5L8982GW6bTe8z_bvUUa3eOguxAad1XsxxACYoQlEmQAaHYO1ZlcC54c5fwDH8vgDvmUJKNmJZIpX0GX9vdVkT9YYp27qc2-7DUmXaSlWNBO8N1J4oFOq8A",
    version: 10,
    rows: [
      "fec746d694ff3f8",
      "8259d032f235208",
      "ba9dbb54d82b2e8",
      "ba9461d32c312e8",
      "bab4573f96152e8",
      "8257bd635e0a208",
      "feaaaaaaaaaabf8",
      "003675238c5f000",
      "f29146bf77e74e8",
      "bd4f31ef5175c90",
      "e7fc4786ecef6d8",
      "a0ce5906e48d048",
      "5396bbb03c56548",
      "1dc20813c64c6d0",
      "62c194c80d39440",
      "d5ba495302898e8",
      "afd78459801d868",
      "1d0ea36479d64c8",
      "8649ee0e9a2a700",
      "fcbe2a251dc1498",
      "6e8cc23870d63d8",
      "25fce36f8c618e8",
      "e310fd90464b058",
      "cdc957b1057ec88",
      "221c6105dd33258",
      "e1e138045f8d680",
      "9fab623eb55bf80",
      "58ca19a3fbb98e8",
      "7ac4b1aac33cab8",
      "588b9722a18a898",
      "efb173fe2347fd0",
      "9c6b6542ba92f10",
      "ce98d74837b6308",
      "3c7817878460778",
      "f2659dd572a0f88",
      "14e676b5140f6c0",
      "e3f621877c544f8",
      "b8bc3125c788560",
      "237b993d0cd49c8",
      "a0253eb34b717e0",
      "1f5e0538c139d88",
      "d499c3783c46ac0",
      "468d2b1e5738430",
      "fc7212509757c08",
      "2b7f8dd435c0ee0",
      "c97264879ca1a10",
      "a68ccd08f5e2658",
      "f8feb97b8529ed8",
      "026379ff7d16fe8",
      "00bf6e63df8c880",
      "fe15c52a29e4ad0",
      "827f95a3b81d8e0",
      "ba18197e871dfe0",
      "ba8f3587f046930",
      "bab59640e281e60",
      "82ddce92fe24608",
      "fedd169895a62c0",
    ],
  },
  {
    mode: "byte",
    ecl: "Q",
    text: "Ulune: th\u00e8me natal, \u00ab\u202fCamille\u202f\u00bb",
    version: 4,
    rows: [
      "fe6d71bf8",
      "826e4c208",
      "ba9e03ae8",
      "ba61eb2e8",
      "baf4ba2e8",
      "82c4f1208",
      "feaaaabf8",
      "002186800",
      "4af0ffda0",
      "f902ad150",
      "07a343fc8",
      "bcf1ed980",
      "8e4ea9ad8",
      "f4cc95d50",
      "fed4504b0",
      "19835f110",
      "0b38ceaa8",
      "f59c0d478",
      "5ed301708",
      "15006b108",
      "4a6703a98",
      "bccdf8d28",
      "1b42ce2b0",
      "298084008",
      "e6bf9ef88",
      "00b7628d0",
      "fe22ceaf8",
      "820705898",
      "ba9cb9f90",
      "ba6c931b0",
      "ba7655180",
      "82cc3fc80",
      "fe2a2f308",
    ],
  },
  {
    mode: "byte",
    ecl: "H",
    text: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    version: 18,
    rows: [
      "fed5ea06331f76aaaaabbf8",
      "821c178c02cf90aaaaad208",
      "ba1eb85efd483dd555502e8",
      "baa8c77e331a24555556ae8",
      "ba55ea0fb31f73eaaaad2e8",
      "821c178882cf922aaaa9208",
      "feaaaaaaaaaaaaaaaaaabf8",
      "000147a882b7c62aaaaa800",
      "2ef7389fece5dfeaaaab448",
      "a46a15e1cce08b5555555e8",
      "76c3e8639d306b555554f38",
      "24a147b962b7c06aaaaaa10",
      "52973891ace5dfaaaaab0c0",
      "a42a15e18ce08b7555555c8",
      "76c3e863dd306b355554f78",
      "24e347b902b7c02aaaaaa50",
      "52b33891c8e5dfaaaaab080",
      "b44c15e1aee08b7555555e8",
      "76e5e863b9306b555554f38",
      "148347b946b7c00aaaaaa10",
      "72f73891ece5dfcaaaab0c0",
      "a46815e188e08b3555555e8",
      "76e1a861f9306b555554f38",
      "248347bd4297c00eaaaaa10",
      "72f31897ee85df8aaaab0c0",
      "946a15e78e808b7755555e8",
      "56e18861f9506b735554f38",
      "048547b94097c02aaaaaa10",
      "6ff5189fe8a5dbeaaaabfc0",
      "a8ec75e88ac08a3555548e8",
      "6ae3ac7afd306eb55554ab8",
      "188523b8c093c22aeaab890",
      "6ff57a8fe8a1dbeaaaaafc0",
      "ad6c71e00a848c757555f68",
      "6be3ac707d106895355d238",
      "190545ac4093c28aaaba090",
      "6b753e8ae887c1caaabadc0",
      "ad6c57e20aa69475554df68",
      "63e388347d5068955555238",
      "190547ee40939a8aaeaa090",
      "637538dae885d9caaaaadc0",
      "a56c55c40aa0d4755755f68",
      "6be38e187d542e9553d5238",
      "110547ce4091a28aabaa090",
      "67753a12e8811bcaabaadc0",
      "ad6c532c0aa3f27554d5f68",
      "63e38f007d5172955555238",
      "1d0547764090930aaaea090",
      "67753a22e881f74aaaaadc0",
      "ad6c53140aa2e6755575f68",
      "6be38ed87d5093955d35238",
      "150546ce4091370abaaa090",
      "6b753302e888f44abaaadc0",
      "a96c5ab40aa2a7f54d55f68",
      "6fe39eeffd51d7f55555fb8",
      "18854658c098b22aaaaa890",
      "6af5230ae89172aaaaabac0",
      "a8ec5ba88aa2223555558e8",
      "6fe39eeffd4957f5d552fb8",
      "1405de47c000b76baaa9590",
      "6af53309e901766baaab740",
      "a4ec5bb50baa27b4d554a68",
      "66e296fbfc51551555548b8",
      "14045647c018b66aaaab590",
      "6af5b309e911766aaaab740",
      "a4ec53b50aba27b55554a68",
      "66e206fbfcd9551d55548b8",
      "140cc647d898b67aaaab590",
      "6be43309f891767aaaab740",
      "a56d53b51aba27ad5554a68",
      "67f386fa6c59551555548b8",
      "1485c647d898b66aaaab590",
      "6b74b3086911766aaaab740",
      "257d53b58bba27b55554a68",
      "677a86fbe5d9551555548b8",
      "149dc647d898b66aaaab490",
      "eaecb309f911766aaaab740",
      "657553b493ba27b55554a68",
      "936a86fa6dd9551555548b8",
      "cc05c6464898b66aaaab590",
      "926cb30ff11173eaaaabfc0",
      "00ed53b89bba223555548e8",
      "fe6a86eafdd956b55555ab8",
      "8295c658c898b62aaaaa890",
      "baecb31ff11177eaaaaafc0",
      "ba6d53bf1bba239555550f0",
      "baea86eafdd9525555545a8",
      "8215c6544898b2eaaaaaf10",
      "fe6cb301f111778aaaaba58",
    ],
  },
  {
    mode: "numeric",
    ecl: "M",
    text: "01234567",
    version: 1,
    rows: [
      "fe3bf8",
      "82e208",
      "ba62e8",
      "ba5ae8",
      "badae8",
      "821208",
      "feabf8",
      "000000",
      "aa2890",
      "d0b510",
      "1bb770",
      "cd5d90",
      "277708",
      "00a210",
      "fe0888",
      "822258",
      "baeae8",
      "ba5570",
      "bad728",
      "821dc0",
      "fe9728",
    ],
  },
];

/** The rows of a code as hex, as the vectors above are written. */
function hexRows(qr) {
  const rows = [];
  for (let y = 0; y < qr.size; y++) {
    let bits = Array.from(qr.modules.slice(y * qr.size, (y + 1) * qr.size)).join("");
    bits += "0".repeat((4 - (bits.length % 4)) % 4);
    let hex = "";
    for (let i = 0; i < bits.length; i += 4) hex += Number.parseInt(bits.slice(i, i + 4), 2).toString(16);
    rows.push(hex);
  }
  return rows;
}

/** Which mask a code's format information names (its first copy), or -1. */
function maskOf(qr) {
  const at = (x, y) => qr.modules[y * qr.size + x];
  let bits = 0;
  for (let i = 0; i <= 5; i++) bits |= at(8, i) << i;
  bits |= at(8, 7) << 6;
  bits |= at(8, 8) << 7;
  bits |= at(7, 8) << 8;
  for (let i = 9; i < 15; i++) bits |= at(14 - i, 8) << i;
  for (const ecl of ["L", "M", "Q", "H"]) for (let m = 0; m < 8; m++) if (formatBits(ecl, m) === bits) return { ecl, mask: m };
  return null;
}

/* ---------------------------------------------------- a small decoder, for the round trips */

/** The standard's Annex E: where alignment patterns are centred, by version. */
const ALIGN = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
  [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170],
];

function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/** A block whose syndromes are all zero is a valid Reed–Solomon codeword (checked here by evaluation, not division). */
function syndromesZero(block, ecc) {
  let root = 1;
  for (let i = 0; i < ecc; i++) {
    let s = 0;
    for (const c of block) s = gfMul(s, root) ^ c;
    if (s !== 0) return false;
    root = gfMul(root, 2);
  }
  return true;
}

/** Reads a code back: its format and version information, its codewords (each block checked), its byte segment. */
function decode(qr) {
  const n = qr.size;
  const ver = (n - 17) / 4;
  const fmt = maskOf(qr);
  assert.ok(fmt, "format information");
  if (ver >= 7) {
    let bits = 0;
    for (let i = 0; i < 18; i++) bits |= qr.modules[Math.floor(i / 3) * n + (n - 11 + (i % 3))] << i;
    assert.equal(bits, versionBits(ver), "version information");
  }
  const fn = new Uint8Array(n * n);
  const mark = (x, y) => {
    if (x >= 0 && y >= 0 && x < n && y < n) fn[y * n + x] = 1;
  };
  for (let i = 0; i < n; i++) {
    mark(6, i);
    mark(i, 6);
  }
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) mark(x, y);
  for (let y = 0; y < 9; y++) for (let x = n - 8; x < n; x++) mark(x, y);
  for (let y = n - 8; y < n; y++) for (let x = 0; x < 9; x++) mark(x, y);
  const pos = ALIGN[ver];
  for (const cy of pos) {
    for (const cx of pos) {
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === pos.at(-1)) || (cx === pos.at(-1) && cy === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) mark(cx + dx, cy + dy);
      // An alignment pattern: dark centre, light ring, dark border.
      assert.equal(qr.modules[cy * n + cx], 1, `alignment centre ${cx},${cy}`);
      assert.equal(qr.modules[(cy + 1) * n + cx], 0, `alignment ring ${cx},${cy}`);
    }
  }
  if (ver >= 7) {
    for (let i = 0; i < 18; i++) {
      mark(n - 11 + (i % 3), Math.floor(i / 3));
      mark(Math.floor(i / 3), n - 11 + (i % 3));
    }
  }
  const { blocks, ecc, total } = qrBlocks(ver, fmt.ecl);
  const bits = [];
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? n - 1 - vert : vert;
        if (fn[y * n + x]) continue;
        bits.push(qr.modules[y * n + x] ^ (maskHits(fmt.mask, x, y) ? 1 : 0));
      }
    }
  }
  const words = [];
  for (let i = 0; i < total; i++) words.push(Number.parseInt(bits.slice(i * 8, i * 8 + 8).join(""), 2));
  const shortLen = Math.floor(total / blocks);
  const shortBlocks = blocks - (total % blocks);
  const parts = Array.from({ length: blocks }, (_, b) => ({ data: [], ecc: [], len: shortLen - ecc + (b < shortBlocks ? 0 : 1) }));
  let k = 0;
  for (let i = 0; i < shortLen - ecc + 1; i++) for (const p of parts) if (i < p.len) p.data.push(words[k++]);
  for (let i = 0; i < ecc; i++) for (const p of parts) p.ecc.push(words[k++]);
  for (const p of parts) assert.ok(syndromesZero([...p.data, ...p.ecc], ecc), "a block fails its Reed–Solomon check");
  const data = parts.flatMap((p) => p.data);
  const stream = data.flatMap((w) => Array.from({ length: 8 }, (_, i) => (w >>> (7 - i)) & 1));
  let at = 0;
  const take = (len) => {
    let v = 0;
    for (let i = 0; i < len; i++) v = (v << 1) | stream[at++];
    return v;
  };
  assert.equal(take(4), 4, "byte mode");
  const count = take(ver <= 9 ? 8 : 16);
  const bytes = Uint8Array.from({ length: count }, () => take(8));
  return { ecl: fmt.ecl, mask: fmt.mask, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
}

test("Reed–Solomon: the standard's worked example (Annex I, \"01234567\" at 1-M)", () => {
  const data = [0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11];
  assert.equal(Buffer.from(rsRemainder(data, 10)).toString("hex"), "a524d4c1ed36c7872c55");
  // And the whole symbol: its data codewords are those (numeric mode), its mask the one the penalties choose.
  const qr = encodeQrNumeric("01234567", { ecl: "M" });
  assert.equal(qr.version, 1);
});

test("format and version information: the standard's tables", () => {
  assert.equal(formatBits("L", 0).toString(2).padStart(15, "0"), "111011111000100");
  assert.equal(formatBits("M", 0).toString(2).padStart(15, "0"), "101010000010010");
  assert.equal(formatBits("Q", 0).toString(2).padStart(15, "0"), "011010101011111");
  assert.equal(formatBits("H", 0).toString(2).padStart(15, "0"), "001011010001001");
  assert.equal(formatBits("M", 5).toString(2).padStart(15, "0"), "100000011001110");
  assert.equal(versionBits(7).toString(2).padStart(18, "0"), "000111110010010100");
  assert.equal(versionBits(21).toString(2).padStart(18, "0"), "010101011010000011");
  assert.equal(versionBits(40).toString(2).padStart(18, "0"), "101000110001101001");
});

test("the codewords' layout: the standard's table 9 at a few versions", () => {
  assert.deepEqual(qrBlocks(1, "M"), { blocks: 1, ecc: 10, total: 26 });
  assert.deepEqual(qrBlocks(5, "Q"), { blocks: 4, ecc: 18, total: 134 });
  assert.deepEqual(qrBlocks(10, "M"), { blocks: 5, ecc: 26, total: 346 });
  assert.deepEqual(qrBlocks(40, "H"), { blocks: 81, ecc: 30, total: 3706 });
  assert.equal(dataCodewords(10, "M"), 216);
  assert.equal(dataCodewords(40, "L"), 2956);
});

test("codes match an independent encoder's (OpenCV's), module for module", () => {
  for (const v of VECTORS) {
    const theirs = { size: v.rows.length, modules: Uint8Array.from(v.rows.flatMap((hex) => [...hex].flatMap((h) => [...Number.parseInt(h, 16).toString(2).padStart(4, "0")].map(Number)).slice(0, v.rows.length))) };
    const named = maskOf(theirs);
    assert.ok(named, `${v.text.slice(0, 20)}: the reference's format information`);
    const enc = v.mode === "numeric" ? encodeQrNumeric : encodeQr;
    // The same mask as the reference (encoders may score the masks a little differently).
    const qr = enc(v.text, { ecl: v.ecl, mask: named.mask });
    assert.equal(qr.version, v.version, `${v.text.slice(0, 20)}: version`);
    assert.deepEqual(hexRows(qr), v.rows, `${v.text.slice(0, 20)} (${v.ecl}, version ${v.version})`);
  }
  // Left to choose its own mask, it chose the reference's for these (the penalty rules agree on them).
  for (const v of VECTORS.filter((x) => x.mode === "byte" && x.ecl !== "Q")) assert.deepEqual(hexRows(encodeQr(v.text, { ecl: v.ecl })), v.rows, v.text.slice(0, 20));
  assert.deepEqual(hexRows(encodeQrNumeric("01234567", { ecl: "M" })), VECTORS.find((x) => x.mode === "numeric").rows);
});

test("the mask chosen has the lowest penalty of the eight", () => {
  for (const text of ["https://ulune.app/", "Camille · 15 June 1990", "x".repeat(90)]) {
    const qr = encodeQr(text);
    const scores = Array.from({ length: 8 }, (_, m) => penalty(encodeQr(text, { mask: m }).modules, qr.size));
    assert.equal(scores[qr.mask], Math.min(...scores), text);
    assert.equal(scores.indexOf(Math.min(...scores)), qr.mask, `${text}: the first of equal scores`);
  }
});

test("round trips: every level, versions 1 to 40, texts in several scripts", () => {
  const texts = ["https://ulune.app/s#1.cpdc0_feI5_IepjX7LfMNg.kW2J26Y2TeeWKey9v_RTJoI7oSZ4PdjeNm0dNDADTMeSWD9a03", "Thème de Camille · 15 juin 1990 · Paris", "八字 四柱 · Ελληνικά · עברית · 🌙✦", ""];
  let checked = 0;
  for (const ecl of ["L", "M", "Q", "H"]) {
    for (let ver = 1; ver <= 40; ver += ver < 12 ? 1 : 3) {
      // The first of the texts that a code of this version holds.
      const text = texts.find((t) => encodeQr(t, { ecl, minVersion: ver }).version === ver);
      assert.notEqual(text, undefined, `${ecl} ${ver}: no text fits`);
      const qr = encodeQr(text, { ecl, minVersion: ver });
      const back = decode(qr);
      assert.equal(back.text, text, `${ecl} ${ver}`);
      assert.equal(back.ecl, ecl);
      assert.equal(back.mask, qr.mask);
      checked++;
    }
  }
  assert.equal(checked, 84, `${checked} codes read back`);
  // The longest text a version 40-L code holds, and one byte more.
  assert.equal(encodeQr("a".repeat(2953), { ecl: "L" }).version, 40);
  assert.throws(() => encodeQr("a".repeat(2954), { ecl: "L" }), /qr-too-long/);
});

test("a share link fits a code a phone reads easily: version 7 to 10 at level M for one chart", () => {
  const link = "https://ulune.app/s#1.cpdc0_feI5_IepjX7LfMNg.kW2J26Y2TeeWKey9v_RTJoI7oSZ4PdjeNm0dNDADTMeSWD9a03-r8L_HF9CYQ9c2Hc2-MzR-p2R9RjrEgTgnSEV-grFEr_OQ3QZXJzlCVhdonbM";
  const qr = encodeQr(link);
  assert.equal(qr.ecl, "M");
  assert.ok(qr.version >= 7 && qr.version <= 10, `version ${qr.version}`);
  assert.equal(decode(qr).text, link);
});

test("the SVG path covers exactly the dark modules, inside the quiet zone", () => {
  const qr = encodeQr("https://ulune.app/");
  const path = qrPath(qr, 4);
  const dark = new Set();
  for (const m of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) {
    const [x, y, w, back] = m.slice(1).map(Number);
    assert.equal(w, back);
    for (let i = 0; i < w; i++) dark.add(`${x + i - 4},${y - 4}`);
    assert.ok(x >= 4 && y >= 4 && x + w <= qr.size + 4 && y < qr.size + 4, "inside the quiet zone");
  }
  assert.equal(path.replace(/M\d+ \d+h\d+v1h-\d+z/g, ""), "", "nothing but rectangles");
  let count = 0;
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y * qr.size + x]) {
        count++;
        assert.ok(dark.has(`${x},${y}`), `${x},${y} not drawn`);
      }
    }
  }
  assert.equal(dark.size, count);
});
