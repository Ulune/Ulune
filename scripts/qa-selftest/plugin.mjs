// The self-test runs' reports (src/lib/qa-selftest.ts): a page opened with
// `?qa=<suite>` in development posts its report here, and it is kept in
// `.qa-selftest/reports/`. Off unless `.qa-selftest/` exists in the project
// root; local requests only; serve only (nothing of this is in a build).
import fs from "node:fs";
import path from "node:path";

const LOCAL = /^(127\.|::1$|::ffff:127\.)/;

export function qaSelftestPlugin() {
  return {
    name: "ulune:qa-selftest",
    apply: "serve",
    configureServer(server) {
      const dir = path.join(server.config.root, ".qa-selftest");
      server.middlewares.use("/__qa/report", (req, res) => {
        if (req.method !== "POST" || !LOCAL.test(req.socket.remoteAddress ?? "") || !fs.existsSync(dir)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        let body = "";
        req.setEncoding("utf8");
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 4_000_000) req.destroy();
        });
        req.on("end", () => {
          try {
            const report = JSON.parse(body);
            const suite = String(report?.suite ?? "run").replace(/[^\w-]/g, "_").slice(0, 32);
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            const out = path.join(dir, "reports");
            fs.mkdirSync(out, { recursive: true });
            fs.writeFileSync(path.join(out, `${stamp}-${suite}.json`), JSON.stringify(report, null, 2));
            res.statusCode = 204;
          } catch {
            res.statusCode = 400;
          }
          res.end();
        });
      });
    },
  };
}
