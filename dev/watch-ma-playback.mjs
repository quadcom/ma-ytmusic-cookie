// Read-only: polls MA once a second and prints player state changes and the YouTube Music
// provider's error, so the effect of a cookie push on playback can be seen. Runs for N seconds.
const [,, secs = "600"] = process.argv;
const token = process.env.MA_TOKEN, base = process.env.MA_URL; // e.g. http://<ma-host>:8095
const call = async (command, args = {}) => {
  const r = await fetch(base + "/api", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ message_id: "w", command, args }) });
  if (!r.ok) throw new Error(command + " " + r.status);
  return r.json();
};
const t0 = Date.now(); const stamp = () => new Date().toLocaleTimeString("en-GB");
let last = "";
const ytId = (await call("config/providers")).find((p) => p.domain === "ytmusic")?.instance_id;
console.log(stamp(), "watching; ytmusic provider", ytId);
while (Date.now() - t0 < Number(secs) * 1000) {
  try {
    const players = await call("players/all");
    const active = players.filter((p) => ["playing", "paused"].includes(p.playback_state || p.state));
    const line = active.map((p) => {
      const m = p.current_media || {};
      return `${p.name}: ${p.playback_state || p.state} "${(m.title || "").slice(0, 40)}" [${m.uri ? m.uri.split("://")[0] : ""}] t=${Math.round(p.elapsed_time ?? m.elapsed_time ?? 0)}`;
    }).join(" | ") || "nothing playing";
    const prov = await call("config/providers/get", { instance_id: ytId });
    const full = line + " || yt error: " + (prov.last_error || "none");
    const norm = full.replace(/t=\d+/g, "t=*");
    if (norm !== last) { console.log(stamp(), full); last = norm; }
  } catch (e) { console.log(stamp(), "poll error", e.message); }
  await new Promise((r) => setTimeout(r, 1000));
}
console.log(stamp(), "done");
