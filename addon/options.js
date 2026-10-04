const $ = (id) => document.getElementById(id);

function say(text, kind) {
  $("status").textContent = text;
  $("status").className = kind || "";
}

// Firefox does not honour a site permission that names a port (measured: the call is blocked),
// so the permission covers the whole host.
function sitePattern(address) {
  const u = new URL(address);
  return u.protocol + "//" + u.hostname + "/*";
}

function form() {
  return { address: $("address").value.trim().replace(/\/+$/, ""), token: $("token").value.trim() };
}

MA.loadSettings().then((s) => {
  if (s) { $("address").value = s.address; $("token").value = s.token; }
});

$("save").addEventListener("click", async () => {
  const { address, token } = form();
  try {
    // permissions.request needs the click gesture, so it runs before any other await.
    let origin = null;
    try { origin = sitePattern(address); } catch { /* saveSettings reports the bad address */ }
    const granted = origin ? await browser.permissions.request({ origins: [origin] }) : true;
    await MA.saveSettings({ address, token });
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
    if (!(await browser.permissions.contains({ origins: [sitePattern(address)] }))) {
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
  await browser.storage.local.remove("ma");
  $("address").value = "";
  $("token").value = "";
  say("Forgotten. The address and token are no longer stored in this Firefox profile.", "ok");
});
