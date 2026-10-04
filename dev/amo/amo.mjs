// Small AMO API v5 client: JWT (HS256) from the add-on's API key, read-only unless a write is named.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
const [iss, secret] = readFileSync(process.env.KEYS, "utf8").split(/\r?\n/).map((s) => s.trim());
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
export function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "HS256", typ: "JWT" }), body = b64({ iss, jti: crypto.randomUUID(), iat: now, exp: now + 60 });
  return head + "." + body + "." + crypto.createHmac("sha256", secret).update(head + "." + body).digest("base64url");
}
export const API = "https://addons.mozilla.org/api/v5/addons/addon/ytc@quadcom.ca/";
export async function amo(path, opt = {}) {
  const r = await fetch(API + path, { ...opt, headers: { Authorization: "JWT " + jwt(), ...(opt.headers || {}) } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}
if (process.argv[2] === "show") {
  const a = await amo("");
  const b = a.body;
  console.log("status", a.status, "| addon status:", b.status, "| slug:", b.slug, "| url:", b.url);
  console.log("name:", b.name?.["en-US"], "| summary set:", !!b.summary?.["en-US"], "| description set:", !!b.description?.["en-US"]);
  console.log("categories:", JSON.stringify(b.categories), "| homepage:", JSON.stringify(b.homepage?.url || b.homepage), "| support:", JSON.stringify(b.support_url?.url || b.support_url));
  console.log("current listed version:", b.current_version?.version, "| previews:", (b.previews || []).length);
  const v = await amo("versions/?filter=all_with_unlisted");
  for (const x of (v.body.results || []).slice(0, 4)) console.log("version", x.version, x.channel, x.file?.status, "license:", x.license?.slug);
}
