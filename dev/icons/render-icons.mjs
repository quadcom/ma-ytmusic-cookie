import { writeFileSync } from "node:fs";
const [,, outDir] = process.argv;
const base = process.env.BOX_CDP; // the build box Chrome control port, e.g. http://<box>:9222
const tab = await (await fetch(base + "/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise((r) => (ws.onopen = r));
await send("Emulation.setDeviceMetricsOverride", { width: 400, height: 200, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
await send("Page.enable");
await send("Page.navigate", { url: "http://localhost:8770/icons.html" });
await new Promise((r) => setTimeout(r, 1500));
for (const [x, n] of [[0, 16], [20, 32], [60, 48], [120, 96], [230, 128]]) {
  const r = await send("Page.captureScreenshot", { format: "png", clip: { x, y: 0, width: n, height: n, scale: 1 } });
  writeFileSync(`${outDir}/icon-${n}.png`, Buffer.from(r.result.data, "base64"));
  console.log("icon-" + n + ".png");
}
await fetch(base + "/json/close/" + tab.id);
process.exit(0);
