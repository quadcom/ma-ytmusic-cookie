const $ = (id) => document.getElementById(id);

function say(text, kind) {
  $("status").textContent = text;
  $("status").className = kind || "";
}

function form() {
  return { address: $("address").value.trim().replace(/\/+$/, ""), token: $("token").value.trim(), sync: $("sync").checked };
}

MA.loadSettings().then(async (s) => {
  if (!s) return;
  $("address").value = s.address;
  $("token").value = s.token;
  $("sync").checked = s.sync;
  if (s.fromSync && !(await MA.hasPermission(s.address).catch(() => false))) {
    say("Settings arrived from your other Firefox. Press Save to let this Firefox reach the server.");
  }
});

$("show").addEventListener("click", () => {
  const hidden = $("token").type === "password";
  $("token").type = hidden ? "text" : "password";
  $("show").textContent = hidden ? "Hide" : "Show";
});

$("save").addEventListener("click", async () => {
  const { address, token, sync } = form();
  try {
    // permissions.request needs the click gesture, so it runs before any other await.
    let origin = null;
    try { origin = MA.sitePattern(address); } catch { /* saveSettings reports the bad address */ }
    const granted = origin ? await browser.permissions.request({ origins: [origin] }) : true;
    await MA.saveSettings({ address, token, sync });
    if (!granted) return say("Firefox needs permission to reach that address. Press Save again and allow it.", "bad");
    say("Saved. Press Test connection to check it works.", "ok");
  } catch (err) {
    say(err.message, "bad");
  }
});

$("test").addEventListener("click", async () => {
  const { address, token } = form();
  say("Testing the connection.");
  try {
    // Without the site permission Firefox blocks the call and it looks like the server is down.
    if (!(await MA.hasPermission(address))) {
      return say("Press Save first and allow Firefox to reach that address, then test again.", "bad");
    }
    const info = await MA.serverInfo(address);
    await MA.findYtProviders({ address, token });
    say(`Connected to Music Assistant ${info.server_version}; YouTube Music found.`, "ok");
  } catch (err) {
    say(err.message, "bad");
  }
});

$("forget").addEventListener("click", async () => {
  const cleared = await MA.forget();
  $("address").value = "";
  $("token").value = "";
  say(cleared
    ? "Forgotten. The address and token are removed from this Firefox and from your synced settings."
    : "Forgotten. The address and token are removed from this Firefox profile.", "ok");
});
