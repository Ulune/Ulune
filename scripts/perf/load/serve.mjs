// Serves the production build (.vercel/output, from `npm run build`) the way
// Vercel does: static files with brotli and immutable /assets, everything
// else through the server function. Writes nothing in the repo: the
// function runs with scripts/perf/.out/load as its working directory.
// node scripts/perf/load/serve.mjs [port=9311]
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { mkdirSync, symlinkSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { ROOT, OUT } from "../paths.mjs";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";
const BUILD = join(ROOT, ".vercel/output");
const STATIC = join(BUILD, "static");
const CWD = join(OUT, "load");
mkdirSync(CWD, { recursive: true });
// The chart engine finds its files from the working directory, as on Vercel
// (/var/task holds ephe/ and swisseph.wasm): link them in.
for (const name of ["ephe", "swisseph.wasm"]) {
  const from = join(BUILD, "functions/__server.func", name);
  const to = join(CWD, name);
  if (existsSync(from) && !existsSync(to)) symlinkSync(from, to);
}
process.chdir(CWD);
const mod = await import(pathToFileURL(join(BUILD, "functions/__server.func/index.mjs")).href);
const handler = mod.default;
const TYPES = { ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".map": "application/json", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };
const cache = new Map();
const port = Number(process.argv[2] || 9311);
function compress(buf, type, ae, q = 5) {
  if (!/text|javascript|json|svg|css|manifest/.test(type)) return [buf, null];
  if (/br/.test(ae)) return [brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: q } }), "br"];
  if (/gzip/.test(ae)) return [gzipSync(buf), "gzip"];
  return [buf, null];
}
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const file = join(STATIC, decodeURIComponent(url.pathname));
    const ae = String(req.headers["accept-encoding"] || "");
    if (url.pathname !== "/" && file.startsWith(STATIC) && existsSync(file) && statSync(file).isFile()) {
      const type = TYPES[extname(file)] || "application/octet-stream";
      const key = file + "|" + (/br/.test(ae) ? "br" : /gzip/.test(ae) ? "gz" : "id");
      let entry = cache.get(key);
      if (!entry) { entry = compress(readFileSync(file), type, ae, 11); cache.set(key, entry); }
      const headers = { "content-type": type, "content-length": entry[0].length };
      if (entry[1]) headers["content-encoding"] = entry[1];
      headers["cache-control"] = url.pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate";
      res.writeHead(200, headers); res.end(entry[0]); return;
    }
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    const r = await handler.fetch(new Request(url, { method: req.method, headers, body: req.method === "GET" || req.method === "HEAD" ? undefined : body }), { waitUntil() {} });
    const buf = Buffer.from(await r.arrayBuffer());
    const type = r.headers.get("content-type") || "";
    const [out, enc] = compress(buf, type, ae);
    const h = {}; r.headers.forEach((v, k) => { if (k !== "content-length" && k !== "content-encoding") h[k] = v; });
    if (enc) h["content-encoding"] = enc;
    h["content-length"] = out.length;
    res.writeHead(r.status, h); res.end(out);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(port, "127.0.0.1", () => console.log("listening", port));
