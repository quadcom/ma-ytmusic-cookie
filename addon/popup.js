(async () => {
  const $ = (id) => document.getElementById(id);
  const URL_YT = "https://music.youtube.com/";
  const busy = (on) => { $("copy").disabled = on; $("send").disabled = on; $("provider").disabled = on; };
  const say = (text, cls) => { $("msg").textContent = text; $("msg").className = cls || ""; };

  // Reads the cookies the tab's own session would send to music.youtube.com.
  async function build() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const storeId = (tab && tab.cookieStoreId) || "firefox-default";
    const priv = storeId === "firefox-private" || !!(tab && tab.incognito);
    let list;
    try {
      list = await browser.cookies.getAll({ url: URL_YT, storeId, firstPartyDomain: null });
    } catch (e) {
      // Firefox builds without first-party isolation reject the key.
      list = await browser.cookies.getAll({ url: URL_YT, storeId });
    }
    // Longer paths first, as the browser orders the Cookie header; the sort is stable.
    list.sort((a, b) => b.path.length - a.path.length);
    const signedIn = list.some((c) => c.name === "SAPISID" || c.name === "__Secure-3PAPISID");
    const value = list.map((c) => c.name + "=" + c.value).join("; ").trim();
    return { priv, signedIn, count: list.length, value };
  }

  // Returns the cookie value, or null after saying why it cannot be used.
  async function ready() {
    const c = await build();
    if (!c.count) { say("Open music.youtube.com in this window and sign in first.", "err"); return null; }
    if (!c.signedIn) { say("You are not signed in to YouTube Music in this window. Sign in there, then try again.", "err"); return null; }
    return c.value;
  }

  try {
    const c = await build();
    $("st-window").textContent = c.priv
      ? "Window: private"
      : "Window: normal - cookie will expire sooner, so use a private window if you can.";
    $("st-signed").textContent = "Signed in: " + (c.signedIn ? "yes" : "no");
    $("st-count").textContent = "Cookies found: " + c.count;
  } catch (err) {
    say("Could not read this window's cookies. Reload the add-on and try again.", "err");
  }
  try {
    if (!(await browser.extension.isAllowedIncognitoAccess())) $("hint-private").hidden = false;
  } catch (e) { /* the hint is optional */ }

  $("copy").addEventListener("click", async () => {
    busy(true);
    try {
      const value = await ready();
      if (value) {
        await navigator.clipboard.writeText(value);
        say("Copied. Paste it into Music Assistant > Settings > Providers > YouTube Music. Then close this private window without signing out.", "ok");
      }
    } catch (err) {
      say(err.message, "err");
    }
    busy(false);
  });

  const settings = await MA.loadSettings();
  if (settings) {
    $("send").hidden = false;
    $("send").addEventListener("click", async () => {
      busy(true);
      try {
        // Settings that arrived by sync do not carry the site permission with them.
        if (!(await MA.hasPermission(settings.address))) {
          say("Open this add-on's Music Assistant settings and press Save to let this Firefox reach the server.", "err");
          return;
        }
        const value = await ready();
        if (!value) return;
        say("Sending...");
        const select = $("provider");
        if (select.hidden) {
          const found = await MA.findYtProviders(settings);
          if (!found.length) {
            say("YouTube Music is not set up in Music Assistant yet. Add it there once, then use this button.", "err");
            return;
          }
          if (found.length > 1) {
            select.replaceChildren(...found.map((p) => new Option(p.name, p.instance_id)));
            select.hidden = false;
            say("Choose a YouTube Music provider, then press Send to Music Assistant again.");
            return;
          }
          select.replaceChildren(new Option(found[0].name, found[0].instance_id));
        }
        const id = select.value;
        say(await MA.pushCookie(settings, id, value), "ok");
        setTimeout(async () => {
          try {
            const text = await MA.providerError(settings, id);
            if (text) say("Music Assistant says: " + text, "err");
          } catch (e) { say(e.message, "err"); }
        }, 5000);
      } catch (err) {
        say(err.message, "err");
      } finally {
        busy(false);
      }
    });
  }

  $("settings").addEventListener("click", (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });
})();
