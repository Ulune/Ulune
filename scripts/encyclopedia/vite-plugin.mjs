/*
 * The encyclopedia's data as modules the site imports, one piece each
 * (src/encyclopedia/data.ts imports them): built from content/encyclopedia by
 * build.mjs when the dev server or the production build starts, and again in
 * development whenever an entry file changes. Each piece is its own module, so
 * the client gets each page, card pack and search index as its own small file
 * when it is first used, and the server bundles them all (nothing is read
 * from the repository's disk once built: Vercel's function has no
 * content/ folder).
 *
 *   virtual:ulune-encyclopedia/index                    the term index
 *   virtual:ulune-encyclopedia/loaders                  how to load each piece below
 *   virtual:ulune-encyclopedia/pages/<lang>/<tradition> how to load each page of a tradition
 *   virtual:ulune-encyclopedia/page/<lang>/<id>         one page
 *   virtual:ulune-encyclopedia/cards/<lang>/<tradition> a tradition's card texts
 *   virtual:ulune-encyclopedia/search/<lang>            a language's search index
 *   virtual:ulune-encyclopedia/homes/<lang>             the encyclopedia's home
 *   virtual:ulune-encyclopedia/lexicon/<lang>           the words a reading's text links, by tradition
 *   virtual:ulune-encyclopedia/tradition/<lang>/<id>    a tradition's home
 *
 * A mistake in an entry fails the production build with its file and line,
 * and in development fails the encyclopedia's pages with the same message
 * (the rest of the site goes on working). A warning (a term linked twice in
 * one paragraph) is said with its file and line, and builds go on.
 */
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { resolve, sep } from "node:path";
import { buildEncyclopedia, CONTENT_DIR, formatErrors, readContent } from "./build.mjs";

const PREFIX = "virtual:ulune-encyclopedia/";
const encHome = (lang) => (lang === "fr" ? "/encyclopedie" : "/encyclopedia");
const RESOLVED = `\0${PREFIX}`;

/** A module whose default export is `value`, parsed from a JSON string (faster to start than an object literal). */
const jsonModule = (value) => `export default JSON.parse(${JSON.stringify(JSON.stringify(value))});\n`;

/** `{ "en/astrology": () => import("virtual:…/cards/en/astrology"), … }` as code; `name` gives each key's module. */
const loaderMap = (kind, keys, name = (k) => k) =>
  `{\n${keys.map((k) => `  ${JSON.stringify(k)}: () => import(${JSON.stringify(`${PREFIX}${kind}/${name(k)}`)}),`).join("\n")}\n}`;

/** The pages of one language and tradition, by id ("en/astrology" → ["saturn", …]). */
function shardOf(data, lang, tradition) {
  return Object.keys(data.pages)
    .filter((k) => k.startsWith(`${lang}/`))
    .map((k) => k.slice(lang.length + 1))
    .filter((id) => data.index.terms[id][0] === tradition);
}

export function encyclopediaPlugin() {
  let root = process.cwd();
  let built = null;

  const contentDir = () => resolve(root, CONTENT_DIR);
  const build = () => {
    if (!built) {
      const { errors, warnings, data } = buildEncyclopedia(readContent(contentDir()));
      const warning = warnings.length ? `The encyclopedia's entries have ${warnings.length} warning(s):\n${formatErrors(warnings)}` : null;
      built = errors.length ? { error: `The encyclopedia's entries have ${errors.length} mistake(s):\n${formatErrors(errors)}`, warning } : { data, warning };
    }
    return built;
  };

  return {
    name: "ulune:encyclopedia",
    configResolved(config) {
      root = config.root;
    },
    buildStart() {
      const { error, warning } = build();
      if (warning) this.warn(warning);
      // The production build stops here; the dev server says it once and goes on serving the rest.
      if (error && this.environment?.mode !== "dev") this.error(error);
      else if (error) this.warn(error);
    },
    resolveId(id) {
      if (id.startsWith(PREFIX)) return `\0${id}`;
      return null;
    },
    load(id) {
      if (!id.startsWith(RESOLVED)) return null;
      const { error, data } = build();
      if (error) throw new Error(error);
      const path = id.slice(RESOLVED.length);
      if (path === "index") return jsonModule(data.index);
      if (path === "loaders") {
        // The pages by language and tradition: opening a page costs its tradition's list, not every page's.
        const shards = [...new Set(Object.keys(data.pages).map((k) => `${k.split("/")[0]}/${data.index.terms[k.split("/")[1]][0]}`))];
        return [
          `export const pages = ${loaderMap("pages", shards)};`,
          `export const cards = ${loaderMap("cards", Object.keys(data.cards))};`,
          `export const search = ${loaderMap("search", Object.keys(data.search))};`,
          `export const homes = ${loaderMap("homes", Object.keys(data.homes))};`,
          `export const traditions = ${loaderMap("tradition", Object.keys(data.traditionHomes))};`,
          `export const lexicon = ${loaderMap("lexicon", Object.keys(data.lexicon))};`,
          "",
        ].join("\n");
      }
      const [kind, ...rest] = path.split("/");
      const key = rest.join("/");
      if (kind === "pages") {
        const [lang, tradition] = rest;
        return `export default ${loaderMap("page", shardOf(data, lang, tradition), (id) => `${lang}/${id}`)};\n`;
      }
      const piece = { page: data.pages, cards: data.cards, search: data.search, homes: data.homes, tradition: data.traditionHomes, lexicon: data.lexicon }[kind]?.[key];
      if (piece === undefined) throw new Error(`No encyclopedia module "${path}"`);
      return jsonModule(piece);
    },
    // What "Keep the encyclopedia on this device" downloads (part 21), by
    // language: every piece of the encyclopedia's data, and the code and
    // fonts its pages need, as this build named them.
    generateBundle(_options, bundle) {
      if (this.environment?.name && this.environment.name !== "client") return;
      const { data } = build();
      if (!data) return;
      const chunks = Object.values(bundle).filter((c) => c.type === "chunk");
      const byName = new Map(Object.values(bundle).map((c) => [c.fileName, c]));
      const url = (f) => `/${f}`;
      const files = { en: new Set(), fr: new Set(), shared: new Set() };
      const closure = (start, into) => {
        const todo = [...start];
        while (todo.length) {
          const f = todo.pop();
          if (into.has(f)) continue;
          into.add(f);
          const c = byName.get(f);
          if (c?.type !== "chunk") continue;
          todo.push(...c.imports);
          for (const css of c.viteMetadata?.importedCss ?? []) into.add(css);
          // The encyclopedia's own code it loads later (a card, "In your chart", the dial): kept too.
          for (const d of c.dynamicImports) {
            const dc = byName.get(d);
            if (dc?.type === "chunk" && dc.facadeModuleId && !dc.facadeModuleId.startsWith(RESOLVED) && /[/\\]src[/\\]encyclopedia[/\\]/.test(dc.facadeModuleId)) todo.push(d);
          }
        }
      };
      for (const c of chunks) {
        const id = c.facadeModuleId ?? "";
        if (id.startsWith(RESOLVED)) {
          const path = id.slice(RESOLVED.length);
          const lang = /^(?:page|pages|cards|tradition)\/(en|fr)\/|^(?:search|homes|lexicon)\/(en|fr)$/.exec(path);
          const into = new Set();
          closure([c.fileName], into);
          for (const f of into) files[lang ? (lang[1] ?? lang[2]) : "shared"].add(f);
        } else if (c.isEntry || /[/\\]src[/\\](?:routes[/\\]encyclop|encyclopedia[/\\])/.test(id)) {
          closure([c.fileName], files.shared);
        }
      }
      // The fonts the pages draw with.
      for (const a of Object.values(bundle)) if (a.type === "asset" && /\.woff2$/.test(a.fileName)) files.shared.add(a.fileName);
      for (const lang of ["en", "fr"]) for (const f of files[lang]) files.shared.delete(f);
      // What the download weighs over the network (compressed, as the files are served).
      const size = (set) =>
        [...set].reduce((n, f) => {
          const c = byName.get(f);
          const body = c?.type === "chunk" ? c.code : c?.source;
          if (body == null) return n;
          return n + (/\.woff2$/.test(f) ? body.length : gzipSync(body).length);
        }, 0);
      const list = (set) => [...set].sort().map(url);
      const homes = (lang) => [encHome(lang), ...Object.keys(data.traditionHomes).filter((k) => k.startsWith(`${lang}/`)).map((k) => `${encHome(lang)}/${data.traditionHomes[k].home}`)];
      const manifest = {
        files: { en: list(files.en), fr: list(files.fr), shared: list(files.shared) },
        bytes: { en: size(files.en), fr: size(files.fr), shared: size(files.shared) },
        pages: { en: homes("en"), fr: homes("fr") },
      };
      const version = createHash("sha256").update(JSON.stringify(manifest.files)).digest("hex").slice(0, 12);
      this.emitFile({ type: "asset", fileName: "encyclopedia-offline.json", source: `${JSON.stringify({ version, ...manifest })}\n` });
    },
    configureServer(server) {
      const dir = contentDir();
      server.watcher.add(dir);
      let timer = null;
      const rebuild = () => {
        timer = null;
        built = null;
        const { error, warning } = build();
        if (warning) server.config.logger.warn(warning, { timestamp: true });
        if (error) server.config.logger.error(error, { timestamp: true });
        else server.config.logger.info("[encyclopedia] rebuilt", { timestamp: true });
        // Every environment (the page and the server's renderer) drops the old pieces and starts again.
        for (const env of Object.values(server.environments)) {
          for (const mod of env.moduleGraph.idToModuleMap.values()) {
            if (mod.id?.startsWith(RESOLVED)) env.moduleGraph.invalidateModule(mod);
          }
          env.hot.send({ type: "full-reload" });
        }
      };
      // Many files saved at once (a whole family) make one rebuild.
      const onChange = (file) => {
        if (!resolve(file).startsWith(dir + sep) && resolve(file) !== dir) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(rebuild, 150);
      };
      server.watcher.on("add", onChange);
      server.watcher.on("change", onChange);
      server.watcher.on("unlink", onChange);
    },
  };
}
