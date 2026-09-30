import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { partnerRecommendations } from "@/lib/partner";

/**
 * GET /api/v1/partner/recommendations — the ClassProject partner API
 * (spec section 25.3). Requests are signed:
 *   X-Partner-Key:       client id
 *   X-Partner-Timestamp: unix seconds (rejected if older than 5 minutes)
 *   X-Partner-Signature: hex HMAC-SHA256(secret, METHOD + path + "?" + query + timestamp)
 * Only subject codes, a level and a language are accepted — never a learner id.
 *
 * Prototype credentials: key "classproject-demo", secret from
 * PARTNER_CLASSPROJECT_SECRET (default "demo-secret-change-me"). In development,
 * `?demo=1` skips the signature so the response can be viewed in a browser.
 */

const CLIENTS: Record<string, string> = {
  "classproject-demo": process.env.PARTNER_CLASSPROJECT_SECRET ?? "demo-secret-change-me",
};

const FORBIDDEN = ["student", "student_id", "user", "user_id", "name", "email", "school"];

export function GET(req: NextRequest) {
  const url = req.nextUrl;
  const params = new URLSearchParams(url.searchParams);
  const demo = process.env.NODE_ENV === "development" && params.get("demo") === "1";
  params.delete("demo");

  if (FORBIDDEN.some((f) => params.has(f))) return NextResponse.json({ error: "Learner identifiers are not accepted (spec section 25.5)." }, { status: 400 });

  if (!demo) {
    const key = req.headers.get("x-partner-key") ?? "";
    const ts = req.headers.get("x-partner-timestamp") ?? "";
    const sig = req.headers.get("x-partner-signature") ?? "";
    const secret = CLIENTS[key];
    if (!secret || !ts || !sig) return NextResponse.json({ error: "Missing or unknown partner credentials." }, { status: 401 });
    if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return NextResponse.json({ error: "Request expired." }, { status: 401 });
    const expected = createHmac("sha256", secret).update(`GET${url.pathname}?${params.toString()}${ts}`).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  const subjects = (params.get("subjects") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (!subjects.length) return NextResponse.json({ error: "subjects is required, e.g. subjects=EMATH,ICT" }, { status: 422 });
  const level = params.get("level")?.toUpperCase() ?? null;
  const limit = Math.min(24, Math.max(1, Number(params.get("limit") ?? 12) || 12));
  const items = partnerRecommendations({ subjects, level, limit, baseUrl: url.origin });
  return NextResponse.json(
    { generated_at: new Date().toISOString(), items },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
