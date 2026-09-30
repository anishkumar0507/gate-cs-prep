// Vercel serverless function: lets the site use Claude without exposing the API key.
// GET  /api/claude  -> {ok, accessCode}  (is the proxy configured?)
// POST /api/claude  {messages, effort, code?} -> streamed plain text, then "\u0000" + {"stop_reason": ...}
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR || 30);
const MAX_INPUT_CHARS = 60000;
const EFFORTS = new Set(["low", "medium", "high"]);
const hits = new Map(); // best-effort, per warm instance

function allowedOrigin(req) {
  const list = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.length) return true;
  const origin = req.headers.origin || "";
  return list.includes(origin);
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (recent.length >= PER_HOUR) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function validMessages(m) {
  if (!Array.isArray(m) || !m.length || m.length > 30) return false;
  let chars = 0;
  for (const x of m) {
    if (!x || (x.role !== "user" && x.role !== "assistant") || typeof x.content !== "string") return false;
    chars += x.content.length;
  }
  return chars <= MAX_INPUT_CHARS && m[0].role === "user";
}

export default async function handler(req, res) {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "not_configured" });
  if (req.method === "GET") return res.status(200).json({ ok: true, accessCode: !!process.env.ACCESS_CODE });
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!allowedOrigin(req)) return res.status(403).json({ error: "origin" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (process.env.ACCESS_CODE && body.code !== process.env.ACCESS_CODE) return res.status(401).json({ error: "access_code" });
  if (!validMessages(body.messages)) return res.status(400).json({ error: "bad_request" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return res.status(429).json({ error: "rate_limited" });

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  let started = false;
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: EFFORTS.has(body.effort) ? body.effort : "medium" },
      messages: body.messages,
    });
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        if (!started) {
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
          started = true;
        }
        res.write(ev.delta.text);
      }
    }
    const msg = await stream.finalMessage();
    if (!started) res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    res.end("\u0000" + JSON.stringify({ stop_reason: msg.stop_reason }));
  } catch (e) {
    const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError && e.status ? 502 : 500;
    if (!started) return res.status(status).json({ error: status === 429 ? "rate_limited" : "upstream" });
    res.end("\u0000" + JSON.stringify({ stop_reason: "error" }));
  }
}
