// Builds the Cookie header value Music Assistant's YouTube Music provider wants, from one Firefox
// cookie store. Shared by the popup (the active tab's store) and the background watcher (the
// normal store). Plain script: pages and the background load it with <script> / "scripts".
const YT_COOKIE = {
  URL: "https://music.youtube.com/",

  async build(storeId) {
    let list;
    try {
      list = await browser.cookies.getAll({ url: YT_COOKIE.URL, storeId, firstPartyDomain: null });
    } catch (e) {
      // Firefox builds without first-party isolation reject the key.
      list = await browser.cookies.getAll({ url: YT_COOKIE.URL, storeId });
    }
    // Longer paths first, as the browser orders the Cookie header; the sort is stable.
    list.sort((a, b) => b.path.length - a.path.length);
    const signedIn = list.some((c) => c.name === "SAPISID" || c.name === "__Secure-3PAPISID");
    const value = list.map((c) => c.name + "=" + c.value).join("; ").trim();
    return { signedIn, count: list.length, value };
  },

  // SHA-256 of the header, so "is this the one already sent" can be answered without storing it.
  async hash(value) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  },
};
globalThis.YT_COOKIE = YT_COOKIE;
