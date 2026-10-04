// Screenshot-only stand-in for the WebExtension API, with made-up example data. Never shipped.
(() => {
  const now = Date.now();
  const store = {
    ma: { address: "http://192.168.1.10:8095", token: "example", sync: true },
    auto: { enabled: true, lastPushAt: now - 42 * 60000, lastHash: "", lastProblem: "", lastProblemAt: 0, changesSeen: 7, lastChangeAt: now - 44 * 60000, lastHealthPushAt: 0, lastFreshTabAt: 0 },
  };
  const ok = (v) => Promise.resolve(v);
  const evt = () => ({ addListener() {}, removeListener() {} });
  window.browser = {
    storage: { local: { get: (k) => ok(typeof k === "string" ? { [k]: store[k] } : { ...store }), set: (o) => (Object.assign(store, o), ok()), remove: () => ok() },
               sync: { get: () => ok({}), set: () => ok(), remove: () => ok() }, onChanged: evt() },
    runtime: { getPlatformInfo: () => ok({ os: "win" }), sendMessage: () => ok({ ok: true }), openOptionsPage: () => ok(), getURL: (p) => p },
    permissions: { contains: () => ok(true), request: () => ok(true) },
    extension: { isAllowedIncognitoAccess: () => ok(true) },
    tabs: { query: () => ok([{ cookieStoreId: "firefox-default", incognito: false }]), create: () => ok({ id: 1 }), onUpdated: evt(), onRemoved: evt() },
    cookies: { getAll: () => ok([{ name: "SAPISID", value: "x", path: "/" }, { name: "__Secure-3PAPISID", value: "x", path: "/" }]) },
  };
  const realFetch = window.fetch;
  window.fetch = (url, opt) => {
    const u = String(url);
    const json = (v) => ok(new Response(JSON.stringify(v), { status: 200, headers: { "Content-Type": "application/json" } }));
    if (u.endsWith("/info")) return json({ server_id: "x", server_version: "2.10.5", base_url: "" });
    if (u.endsWith("/api")) {
      const cmd = JSON.parse(opt.body).command;
      if (cmd === "auth/providers") return json([{ provider_id: "builtin" }, { provider_id: "homeassistant" }]);
      if (cmd === "config/providers") return json([{ domain: "ytmusic", instance_id: "ytmusic--example", name: "YouTube Music" }]);
      return json(null);
    }
    return realFetch(url, opt);
  };
})();
