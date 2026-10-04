import { readFileSync } from "node:fs";
import { amo } from "./amo.mjs";
const dir = process.env.SHOTS;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Retries once after AMO's throttle window when it answers 429.
const call = async (path, opt) => { let r = await amo(path, opt); if (r.status === 429) { await wait(200000); r = await amo(path, opt); } return r; };
const files = [["1-popup", "One tap sends your YouTube Music login to Music Assistant."], ["2-welcome", "A welcome page walks you through setup after install."],
  ["3-settings", "Find my server, then sign in through Home Assistant or a Music Assistant account."], ["4-automatic", "Optional automatic updates on a computer keep the login fresh."]];
await wait(200000);
const have = (await call("")).body.previews || [];
console.log("previews already there:", have.length);
for (const [i, [name, caption]] of files.entries()) {
  if (i < have.length) continue;
  const fd = new FormData();
  fd.append("image", new Blob([readFileSync(`${dir}/${name}.png`)], { type: "image/png" }), name + ".png");
  fd.append("position", String(i));
  const up = await call("previews/", { method: "POST", body: fd });
  console.log(name, "upload", up.status, up.body.id || JSON.stringify(up.body).slice(0, 150));
  await wait(200000);
  if (up.body.id) {
    const cap = await call(`previews/${up.body.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption: { "en-US": caption } }) });
    console.log(name, "caption", cap.status);
    await wait(200000);
  }
}
const s = await call("", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: "yt-music-cookie-for-music-assistant" }) });
console.log("slug", s.status, s.body.slug || JSON.stringify(s.body).slice(0, 200), s.body.url || "");
