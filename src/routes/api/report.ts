import { createFileRoute } from "@tanstack/react-router";
import { cleanReport, REPORT_LIMITS } from "@/lib/report-shape";

/**
 * Where the page's error reports arrive (lib/error-report.ts). A report is
 * cleaned again (lib/report-shape.ts) and becomes one line in the server's
 * log, "[ulune:report] {…}"; nothing else is kept, and no address or header
 * is read but the two below. Only this site's own pages may send one (the
 * browser says so in Sec-Fetch-Site), at most 2 KB, at most 60 a minute for
 * each server instance; the Vercel Firewall limits each visitor on top.
 */
const PER_MINUTE = 60;
let windowStart = 0;
let inWindow = 0;

/** A fixed window per server instance: no visitor is told apart. */
function takeReportSlot(now: number): boolean {
  if (now - windowStart >= 60_000) {
    windowStart = now;
    inWindow = 0;
  }
  inWindow += 1;
  return inWindow <= PER_MINUTE;
}

/** The body, or null past the limit (whatever Content-Length claimed). */
async function readUpTo(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

const answer = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const site = request.headers.get("sec-fetch-site");
        if (site && site !== "same-origin") return answer(403);
        if (Number(request.headers.get("content-length") ?? 0) > REPORT_LIMITS.bytes) return answer(413);
        if (!takeReportSlot(Date.now())) return answer(429);
        const body = await readUpTo(request, REPORT_LIMITS.bytes);
        if (body === null) return answer(413);
        const report = cleanReport(body);
        if (!report) return answer(400);
        console.error(`[ulune:report] ${JSON.stringify(report)}`);
        return answer(204);
      },
    },
  },
});
