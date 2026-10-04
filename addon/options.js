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
  const { token, isAdmin } = await MA.finishSignIn(address, shortToken);
  $("token").value = token;
  await MA.saveSettings({ address, token, sync: $("sync").checked });
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

$("signin").addEventListener("click", () => attempt(async () => {
  const { address } = form();
  $("choice").hidden = true;
  $("account").hidden = true;
  if (!address || !(await MA.hasPermission(address).catch(() => false))) {
    return say("Enter the address and press Save first, then sign in.", "bad");
  }
  say("Asking Music Assistant how it signs people in.");
  const providers = await MA.loginProviders(address);
  const ha = providers.includes("homeassistant"), builtin = providers.includes("builtin");
  if (ha && builtin) {
    $("choice").hidden = false;
    return say("Choose how to sign in.");
  }
  if (ha) return signInHa();
  if (builtin) return showAccount();
  say("This Music Assistant offers no sign-in this add-on knows. Paste a token instead.", "bad");
}));

function showAccount() {
  $("account").hidden = false;
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
  say(cleared
    ? "Forgotten. The address and token are removed from this Firefox and from your synced settings."
    : "Forgotten. The address and token are removed from this Firefox profile.", "ok");
});
