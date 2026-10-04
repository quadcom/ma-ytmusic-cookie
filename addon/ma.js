// Music Assistant client. Plain script: the popup and options page load it with <script>.
const MA = {
  async loadSettings() {
    const { ma } = await browser.storage.local.get("ma");
    return ma && ma.address && ma.token ? { address: ma.address, token: ma.token } : null;
  },

  async saveSettings({ address, token }) {
    address = String(address || "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\/./i.test(address)) {
      throw new Error("Enter the address with http:// or https:// in front, for example http://192.168.1.10:8095.");
    }
    await browser.storage.local.set({ ma: { address, token: String(token || "").trim() } });
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
      throw new Error("Music Assistant refused the token. Make a new long-lived token in your Music Assistant profile and save it in this add-on's settings.");
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
