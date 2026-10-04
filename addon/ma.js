// Music Assistant client. Plain script: the popup and options page load it with <script>.
const MA = {
  // Firefox does not honour a site permission that names a port (measured: the call is blocked),
  // so the permission covers the whole host.
  sitePattern(address) {
    const u = new URL(address);
    return u.protocol + "//" + u.hostname + "/*";
  },

  hasPermission(address) {
    return browser.permissions.contains({ origins: [MA.sitePattern(address)] });
  },

  // storage.sync can be missing or throw (sync off, private profile); a failure means "no synced copy".
  async _syncGet() {
    try { return (await browser.storage.sync.get("ma")).ma || null; } catch { return null; }
  },

  async _syncSet(value) {
    try {
      if (value) await browser.storage.sync.set({ ma: value });
      else await browser.storage.sync.remove("ma");
    } catch { /* the local copy still holds the settings */ }
  },

  // The synced copy wins when complete, so a new token saved on one device reaches the others.
  async loadSettings() {
    const { ma } = await browser.storage.local.get("ma");
    const local = ma && ma.address && ma.token ? { address: ma.address, token: ma.token } : null;
    if (ma && ma.sync === false) return local && { ...local, sync: false, fromSync: false };
    const s = await MA._syncGet();
    if (s && s.address && s.token) return { address: s.address, token: s.token, sync: true, fromSync: true };
    // Settings saved before sync existed (1.0.2 and older) seed the synced copy on first read.
    if (local) await MA._syncSet(local);
    return local && { ...local, sync: true, fromSync: false };
  },

  async saveSettings({ address, token, sync }) {
    address = String(address || "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\/./i.test(address)) {
      throw new Error("Enter the address with http:// or https:// in front, for example http://192.168.1.10:8095.");
    }
    token = String(token || "").trim();
    sync = sync !== false;
    await browser.storage.local.set({ ma: { address, token, sync } });
    await MA._syncSet(sync ? { address, token } : null);
  },

  // Returns true when a synced copy was cleared as well.
  async forget() {
    const { ma } = await browser.storage.local.get("ma");
    await browser.storage.local.remove("ma");
    if (ma && ma.sync === false) return false;
    await MA._syncSet(null);
    return true;
  },

  async serverInfo(address) {
    let res;
    try {
      res = await fetch(address + "/info");
    } catch {
      throw new Error(MA._unreachable(address));
    }
    if (!res.ok) throw new Error(`Music Assistant returned an error (${res.status}): ${(await res.text()).trim()}.`);
    return res.json();
  },

  _unreachable(address) {
    return `Can't reach Music Assistant at ${address}. Check the address and that you are on a network that can reach it.`;
  },

  async call(settings, command, args) {
    let res;
    try {
      res = await fetch(settings.address + "/api", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + settings.token },
        body: JSON.stringify({ message_id: crypto.randomUUID(), command, args: args || {} }),
      });
    } catch {
      throw new Error(MA._unreachable(settings.address));
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Music Assistant refused the token. Make a long-lived token in Music Assistant (Settings > Profile), not in Home Assistant, and save it in this add-on's settings.");
    }
    if (!res.ok) throw new Error(`Music Assistant returned an error (${res.status}): ${(await res.text()).trim()}.`);
    return res.json();
  },

  async findYtProviders(settings) {
    const list = await MA.call(settings, "config/providers");
    const found = (list || []).filter((p) => p.domain === "ytmusic")
      .map((p) => ({ instance_id: p.instance_id, name: p.name || "YouTube Music" }));
    if (!found.length) {
      throw new Error("YouTube Music is not set up in Music Assistant yet. Add it there once, then use this button.");
    }
    return found;
  },

  // A flow step can report "progress" while MA works; wait up to 15 s for it to move on.
  async _settle(settings, step) {
    for (let i = 0; i < 15 && step.type === "progress"; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      step = await MA.call(settings, "config/flows/get", { flow_id: step.flow_id });
    }
    return step;
  },

  async pushCookie(settings, instanceId, cookie) {
    let flowId = null;
    try {
      let step = await MA.call(settings, "config/providers/reconfigure", { instance_id: instanceId });
      flowId = step.flow_id;
      step = await MA._settle(settings, step);
      if (step.type === "abort") {
        flowId = null;
        throw new Error(step.reason || "Music Assistant stopped the sign-in. Use the Copy button instead.");
      }
      const entries = step.entries || [];
      if (step.type !== "form" || !entries.some((e) => e.key === "cookie")) {
        throw new Error("This Music Assistant version changed how YouTube Music signs in. Use the Copy button instead.");
      }
      // Secure fields come back null; the other fields keep their current values.
      const values = {};
      for (const e of entries) values[e.key] = e.value;
      values.cookie = cookie;

      step = await MA.call(settings, "config/flows/submit", { flow_id: flowId, values });
      step = await MA._settle(settings, step);
      if (step.type === "finish") {
        flowId = null;
        return "Sent. Music Assistant is reloading YouTube Music.";
      }
      if (step.type === "abort") {
        flowId = null;
        throw new Error(step.reason || "Music Assistant stopped the sign-in. Use the Copy button instead.");
      }
      if (step.type === "form" && step.errors && Object.keys(step.errors).length) {
        const errs = Array.isArray(step.errors) ? step.errors : Object.values(step.errors);
        throw new Error(`Music Assistant did not accept the cookie: ${errs.join(", ")}.`);
      }
      throw new Error(`Music Assistant answered with an unexpected "${step.type}" step. Use the Copy button instead.`);
    } catch (err) {
      if (flowId) await MA.call(settings, "config/flows/abort", { flow_id: flowId }).catch(() => {});
      throw err;
    }
  },

  async providerError(settings, instanceId) {
    try {
      const p = await MA.call(settings, "config/providers/get", { instance_id: instanceId });
      return typeof p.last_error === "string" && p.last_error ? p.last_error : null;
    } catch {
      return null;
    }
  },
};
globalThis.MA = MA;
