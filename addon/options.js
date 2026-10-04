const $ = (id) => document.getElementById(id);

function say(text, kind) {
  $("status").textContent = text;
  $("status").className = "status " + (kind || "");
}

function form() {
  return { address: $("address").value.trim().replace(/\/+$/, ""), token: $("token").value.trim(), sync: $("sync").checked };
}

function showBadge() {
  $("badge").hidden = !$("token").value.trim();
}

// Shows the sign-in buttons Music Assistant offers; both stay disabled until its answer is known.
async function refreshProviders() {
  const { address } = form();
  $("signin-ha").hidden = false;
  $("signin-builtin").hidden = false;
  $("signin-ha").disabled = true;
  $("signin-builtin").disabled = true;
  $("account").hidden = true;
  const hint = $("signin-hint");
  hint.hidden = false;
  hint.textContent = "Enter the address and press Save first, then sign in.";
  if (!address || !(await MA.hasPermission(address).catch(() => false))) return;
  let providers;
  try {
    providers = await MA.loginProviders(address);
  } catch (err) {
    hint.textContent = err.message;
    return;
  }
  if (form().address !== address) return;
  const ha = providers.includes("homeassistant"), builtin = providers.includes("builtin");
  if (!ha && !builtin) {
    hint.textContent = "This Music Assistant offers no sign-in this add-on knows. Paste a token instead.";
    return;
  }
  $("signin-ha").hidden = !ha;
  $("signin-builtin").hidden = !builtin;
  $("signin-ha").disabled = false;
  $("signin-builtin").disabled = false;
  hint.hidden = true;
}

MA.loadSettings().then(async (s) => {
  if (!s) return;
  $("address").value = s.address;
  $("token").value = s.token;
  $("sync").checked = s.sync;
  showBadge();
  if (s.fromSync && !(await MA.hasPermission(s.address).catch(() => false))) {
    say("Settings arrived from your other Firefox. Press Save to let this Firefox reach the server.");
  }
  refreshProviders();
});

$("find").addEventListener("click", async () => {
  $("use-base").hidden = true;
  $("find").disabled = true;
  say("Looking for Music Assistant at the usual addresses.");
  try {
    const found = await MA.findServer();
    if (!found) {
      return say("No Music Assistant found at the usual addresses. Type its address instead, for example http://192.168.1.10:8095.", "bad");
    }
    $("address").value = found.address;
    say(`Found Music Assistant ${found.version} at ${found.address}. Press Save.`, "ok");
    if (/^https:\/\//i.test(found.baseUrl) && found.baseUrl !== found.address) {
      $("use-base").textContent = `Use ${found.baseUrl} instead (works away from home)`;
      $("use-base").dataset.address = found.baseUrl;
      $("use-base").hidden = false;
    }
  } finally {
    $("find").disabled = false;
  }
});

$("use-base").addEventListener("click", () => {
  $("address").value = $("use-base").dataset.address;
  $("use-base").hidden = true;
  say("Address filled in. Press Save.");
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
    showBadge();
    refreshProviders();
  } catch (err) {
    say(err.message, "bad");
  }
});

async function testConnection() {
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
}

$("test").addEventListener("click", testConnection);

// Turns a short-lived sign-in token into this Firefox's own long-lived one, saves it and checks it.
async function completeSignIn(address, shortToken) {
  const previous = ((await MA.loadSettings()) || {}).token;
  const { token, isAdmin } = await MA.finishSignIn(address, shortToken);
  $("token").value = token;
  await MA.saveSettings({ address, token, sync: $("sync").checked });
  if (previous && previous !== token) await MA.revokeOwnToken(address, previous);
  showBadge();
  if (!isAdmin) {
    return say("Signed in, but this account is not a Music Assistant admin, so it cannot change YouTube Music's sign-in. Sign in with an admin account.", "bad");
  }
  say("Signed in. This Firefox now has its own Music Assistant token.", "ok");
  await testConnection();
}

// Runs one sign-in attempt; the password never outlives it.
async function attempt(fn) {
  try {
    await fn();
  } catch (err) {
    say(err.message, "bad");
  } finally {
    $("password").value = "";
  }
}

function showAccount() {
  $("account").hidden = false;
  $("username").focus();
  say("Enter your Music Assistant username and password, then press Sign in.");
}

async function signInHa() {
  const { address } = form();
  say("Sign in on the Home Assistant page that just opened.");
  await completeSignIn(address, await MA.signInWithHomeAssistant(address));
}

$("signin-ha").addEventListener("click", () => attempt(signInHa));
$("signin-builtin").addEventListener("click", showAccount);

$("signin-account").addEventListener("click", () => attempt(async () => {
  const { address } = form();
  say("Signing in.");
  await completeSignIn(address, await MA.signInWithAccount(address, $("username").value.trim(), $("password").value));
}));

$("forget").addEventListener("click", async () => {
  const cleared = await MA.forget();
  $("address").value = "";
  $("token").value = "";
  showBadge();
  refreshProviders();
  say(cleared
    ? "Forgotten. The address and token are removed from this Firefox and from your synced settings."
    : "Forgotten. The address and token are removed from this Firefox profile.", "ok");
});

// Automatic updates: the background owns the "auto" state; this page only reads it and sends two messages.
const when = (ms) => new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function showAuto(a) {
  a = a || {};
  $("auto").checked = !!a.enabled;
  $("auto-last").textContent = a.lastPushAt ? "Last sent: " + when(a.lastPushAt) : "Not sent yet";
  $("auto-problem").hidden = !a.lastProblem;
  $("auto-problem").textContent = a.lastProblem ? "Last problem: " + a.lastProblem : "";
  $("auto-seen").textContent = "YouTube cookie changes seen: " + (a.changesSeen || 0) +
    (a.lastChangeAt ? " (last " + when(a.lastChangeAt) + ")" : "");
}

function autoSay(text, kind) {
  $("auto-msg").textContent = text;
  $("auto-msg").className = "status " + (kind || "");
}

(async () => {
  try {
    if ((await browser.runtime.getPlatformInfo()).os === "android") return;
  } catch (e) { /* assume desktop */ }
  $("auto-card").hidden = false;
  showAuto((await browser.storage.local.get("auto")).auto);
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.auto) showAuto(changes.auto.newValue);
  });
  $("auto").addEventListener("change", async () => {
    const enabled = $("auto").checked;
    try {
      const r = await browser.runtime.sendMessage({ type: "auto-set", enabled });
      if (r && r.ok) autoSay(enabled ? "Automatic updates are on." : "Automatic updates are off.", "ok");
      else throw new Error((r && r.message) || "Could not change the setting.");
    } catch (err) {
      $("auto").checked = !enabled;
      autoSay(err.message, "bad");
    }
  });
  $("auto-now").addEventListener("click", async () => {
    $("auto-now").disabled = true;
    autoSay("Sending...");
    try {
      const r = await browser.runtime.sendMessage({ type: "auto-push-now" });
      autoSay((r && r.message) || (r && r.ok ? "Sent." : "Could not send."), r && r.ok ? "ok" : "bad");
    } catch (err) {
      autoSay(err.message, "bad");
    }
    $("auto-now").disabled = false;
  });
})();
