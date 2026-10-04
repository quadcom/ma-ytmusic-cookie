(async () => {
  const $ = (id) => document.getElementById(id);
  const busy = (on) => { $("copy").disabled = on; $("send").disabled = on; $("provider").disabled = on; };
  const say = (text, cls) => { $("msg").textContent = text; $("msg").className = cls || ""; };

  // Reads the cookies the tab's own session would send to music.youtube.com.
  async function build() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const storeId = (tab && tab.cookieStoreId) || "firefox-default";
    const priv = storeId === "firefox-private" || !!(tab && tab.incognito);
    return { priv, ...(await YT_COOKIE.build(storeId)) };
  }

  // Returns the cookie value, or null after saying why it cannot be used.
  async function ready() {
    const c = await build();
    if (!c.count) { say("Open music.youtube.com in this window and sign in first.", "err"); return null; }
    if (!c.signedIn) { say("You are not signed in to YouTube Music in this window. Sign in there, then try again.", "err"); return null; }
    return c.value;
  }

  // Sets a check row's tick or warning icon, its class and its text.
  const row = (id, ok, text) => {
    const li = $(id);
    li.className = ok ? "ok" : "warn";
    li.querySelector(".icon").replaceWith(iconSvg(ok ? "ok" : "warn"));
    li.querySelector(".text").textContent = text;
  };

  try {
    const c = await build();
    row("st-window", c.priv, c.priv
      ? "Private window"
      : "Normal window - cookie will expire sooner, so use a private window if you can.");
    row("st-signed", c.signedIn, c.signedIn
      ? "Signed in to YouTube Music"
      : "Not signed in to YouTube Music in this window.");
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

  // Fourth row: only when automatic updates are on, and never on Android.
  try {
    const android = (await browser.runtime.getPlatformInfo()).os === "android";
    const a = (await browser.storage.local.get("auto")).auto;
    if (!android && a && a.enabled) {
      const t = a.lastPushAt
        ? new Date(a.lastPushAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "";
      $("st-auto").hidden = false;
      row("st-auto", !a.lastProblem, a.lastProblem
        ? "Automatic updates on - " + a.lastProblem
        : "Automatic updates on - " + (t ? "last sent " + t : "not sent yet"));
    }
  } catch (e) { /* the row is optional */ }

  const settings = await MA.loadSettings();
  const detail = $("ma-detail");
  const pill = (cls, text, icon) => {
    detail.replaceChildren();
    const el = document.createElement(cls === "warn" && !settings ? "a" : "span");
    el.className = "pill " + cls;
    if (icon) el.append(iconSvg(icon));
    el.append(text);
    detail.append(el);
    return el;
  };
  if (!settings) {
    const el = pill("warn", "Not set up");
    el.href = "#";
    el.addEventListener("click", (e) => { e.preventDefault(); browser.runtime.openOptionsPage(); });
  } else {
    // Runs on its own so a slow or absent server never holds up the rest of the popup.
    (async () => {
      try {
        if (!(await MA.hasPermission(settings.address))) throw new Error("no permission");
        const info = await MA.serverInfo(settings.address);
        pill("ok", String(info.server_version || "Connected"), "ok");
      } catch (e) {
        pill("warn", "Can't reach");
      }
    })();
  }
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
