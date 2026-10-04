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

  // Looks for Music Assistant at its usual default addresses. MA's /info allows any origin, so no
  // site permission is needed. Returns the first answering candidate in list order, or null.
  async findServer() {
    const candidates = ["http://homeassistant.local:8095", "http://homeassistant:8095",
      "http://music-assistant.local:8095", "http://localhost:8095"];
    const probe = async (address) => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 3000);
      try {
        const res = await fetch(address + "/info", { signal: ctl.signal });
        if (!res.ok) return null;
        const info = await res.json();
        if (!info || !info.server_id || !info.server_version) return null;
        const baseUrl = typeof info.base_url === "string" ? info.base_url.replace(/\/+$/, "") : "";
        return { address, version: info.server_version, baseUrl };
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    };
    return (await Promise.all(candidates.map(probe))).find(Boolean) || null;
  },

  _unreachable(address) {
    return `Can't reach Music Assistant at ${address}. Check the address and that you are on a network that can reach it.`;
  },

  async call(settings, command, args) {
    let res;
    // The sign-in commands run before any token exists, so the header is left off when there is none.
    const headers = { "Content-Type": "application/json" };
    if (settings.token) headers.Authorization = "Bearer " + settings.token;
    try {
      res = await fetch(settings.address + "/api", {
        method: "POST",
        headers,
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

  async loginProviders(address) {
    const list = await MA.call({ address }, "auth/providers");
    return (list || []).map((p) => p.provider_id);
  },

  // Opens Home Assistant's sign-in page in a tab and resolves with the short-lived token Music
  // Assistant appends to the return address. The nonce ties the answer to this attempt.
  async signInWithHomeAssistant(address) {
    const nonce = crypto.randomUUID();
    const returnUrl = address + "/?ytc_signin=" + nonce;
    const r = await MA.call({ address }, "auth/authorization_url", { provider_id: "homeassistant", return_url: returnUrl });
    const url = r && r.authorization_url;
    if (!url) throw new Error((r && r.error) || "This Music Assistant offers no sign-in this add-on knows. Paste a token instead.");
    const tab = await browser.tabs.create({ url });
    return new Promise((resolve, reject) => {
      let timer;
      const done = (fn, value, closeTab) => {
        clearTimeout(timer);
        browser.tabs.onUpdated.removeListener(onUpdated);
        browser.tabs.onRemoved.removeListener(onRemoved);
        if (closeTab) browser.tabs.remove(tab.id).catch(() => {});
        fn(value);
      };
      const onUpdated = (id, changeInfo, t) => {
        if (id !== tab.id) return;
        const u = changeInfo.url || (t && t.url);
        if (!u || !u.startsWith(returnUrl)) return;
        let code = null;
        try { code = new URL(u).searchParams.get("code"); } catch { /* treated as no code */ }
        if (code) done(resolve, code, true);
      };
      const onRemoved = (id) => {
        if (id === tab.id) done(reject, new Error("Sign-in was closed before it finished. Press Sign in to try again."), false);
      };
      timer = setTimeout(() => done(reject, new Error("Sign-in timed out. Press Sign in to try again."), true), 5 * 60 * 1000);
      browser.tabs.onUpdated.addListener(onUpdated);
      browser.tabs.onRemoved.addListener(onRemoved);
    });
  },

  async signInWithAccount(address, username, password) {
    const r = await MA.call({ address }, "auth/login", { username, password, provider_id: "builtin", device_name: "YT Music Cookie add-on" });
    if (!r || !r.success || !r.access_token) {
      const why = r && r.error ? String(r.error).replace(/\.*$/, "") : "Music Assistant did not accept that sign-in";
      throw new Error(why + ". Check the username and password and press Sign in again.");
    }
    return r.access_token;
  },

  // Swaps the short-lived sign-in token for a long-lived one named after this platform, so the
  // user can tell devices apart in Music Assistant's token list, then ends the short session.
  async finishSignIn(address, shortToken) {
    const os = (await browser.runtime.getPlatformInfo()).os;
    const short = { address, token: shortToken };
    const token = await MA.call(short, "auth/token/create", { name: "YT Music Cookie add-on (" + os + ")" });
    if (typeof token !== "string" || !token) throw new Error("Sign-in did not finish. Press Sign in to try again.");
    const me = await MA.call({ address, token }, "auth/me");
    await MA.call(short, "auth/logout").catch(() => {});
    return { token, isAdmin: !!me && me.role === "admin" };
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
