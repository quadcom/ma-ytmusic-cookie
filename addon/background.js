// Open the welcome page once, on first install, so the user learns the private-window step.
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") browser.tabs.create({ url: browser.runtime.getURL("welcome.html") });
});

// Automatic updates: follow the YouTube login cookies in the normal Firefox and send each new set
// to Music Assistant. The cookie itself is never stored or logged; only its hash is kept.
const STORE = "firefox-default";
const MIN = 60 * 1000;
const RELEVANT = new Set(["SID", "HSID", "SSID", "APISID", "SAPISID", "__Secure-1PAPISID",
  "__Secure-3PAPISID", "__Secure-1PSID", "__Secure-3PSID", "__Secure-1PSIDTS", "__Secure-3PSIDTS", "LOGIN_INFO"]);
const DEFAULTS = { enabled: false, lastPushAt: 0, lastHash: "", lastProblem: "", lastProblemAt: 0,
  changesSeen: 0, lastChangeAt: 0, lastHealthPushAt: 0, lastFreshTabAt: 0 };

let busy = false;       // in-memory guard against overlapping pushes
let freshWaiter = null; // ends the fresh-login wait when a relevant cookie changes

async function getAuto() {
  const { auto } = await browser.storage.local.get("auto");
  return { ...DEFAULTS, ...(auto || {}) };
}

// Read-modify-write; only this script writes "auto".
async function patchAuto(patch) {
  const next = { ...(await getAuto()), ...patch };
  await browser.storage.local.set({ auto: next });
  return next;
}

const problem = (msg) => patchAuto({ lastProblem: msg, lastProblemAt: Date.now() });

async function startHealthAlarm() {
  await browser.alarms.create("ytc-health", { periodInMinutes: 5 });
}

async function restoreAlarms() {
  if ((await getAuto()).enabled) await startHealthAlarm();
}

// Settings, permission and cookie checks shared by every push. Throws a user-facing sentence.
async function prepare() {
  const settings = await MA.loadSettings();
  if (!settings) throw new Error("Music Assistant is not set up in this add-on yet.");
  if (!(await MA.hasPermission(settings.address))) {
    throw new Error("Open the add-on's settings and press Save so Firefox can reach Music Assistant.");
  }
  const cookie = await YT_COOKIE.build(STORE);
  if (!cookie.signedIn) throw new Error("Not signed in to YouTube in your normal Firefox.");
  return { settings, cookie, hash: await YT_COOKIE.hash(cookie.value) };
}

// Sends the cookie and records the outcome. Returns MA's success sentence.
async function send({ settings, cookie, hash }, extra) {
  const [provider] = await MA.findYtProviders(settings);
  const message = await MA.pushCookie(settings, provider.instance_id, cookie.value);
  await patchAuto({ ...extra, lastPushAt: Date.now(), lastHash: hash, lastProblem: "", lastProblemAt: 0 });
  return message;
}

// Runs fn unless another push is in flight; failures are recorded, never thrown.
async function guarded(fn) {
  if (busy) return { ok: false, message: "A push is already running." };
  busy = true;
  try {
    return { ok: true, message: await fn() };
  } catch (err) {
    await problem(err.message);
    return { ok: false, message: err.message };
  } finally {
    busy = false;
  }
}

async function maybePush() {
  if (!(await getAuto()).enabled) return;
  await guarded(async () => {
    const p = await prepare();
    const st = await getAuto();
    if (p.hash === st.lastHash) return "Nothing to do.";
    const wait = st.lastPushAt + 60 * MIN - Date.now();
    if (wait > 0) {
      await browser.alarms.create("ytc-debounce", { delayInMinutes: wait / MIN });
      return "Left for later.";
    }
    const [provider] = await MA.findYtProviders(p.settings);
    if (await MA.ytMusicPlaying(p.settings, provider.instance_id)) {
      await browser.alarms.create("ytc-debounce", { delayInMinutes: 5 });
      return "Waiting for playback to stop.";
    }
    return send(p, {});
  });
}

// Opens YouTube Music in a background tab so Google rotates the login, then waits for the change.
async function freshLogin() {
  await patchAuto({ lastFreshTabAt: Date.now() });
  const tab = await browser.tabs.create({ url: "https://music.youtube.com/", active: false });
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 60 * 1000);
    freshWaiter = () => { clearTimeout(timer); resolve(); };
  });
  freshWaiter = null;
  await browser.tabs.remove(tab.id).catch(() => {});
}

async function healthCheck() {
  const st0 = await getAuto();
  if (!st0.enabled) {
    await browser.alarms.clear("ytc-health");
    return;
  }
  const settings = await MA.loadSettings();
  if (!settings || !(await MA.hasPermission(settings.address))) return;
  const [provider] = await MA.findYtProviders(settings).catch(() => []);
  if (!provider || !(await MA.providerError(settings, provider.instance_id))) return;
  if (Date.now() - st0.lastHealthPushAt < 30 * MIN) return;
  await guarded(async () => {
    let p = await prepare();
    const st = await getAuto();
    if (p.hash !== st.lastHash) return send(p, { lastHealthPushAt: Date.now() });
    if (Date.now() - st.lastFreshTabAt < 60 * MIN) return "Waiting before another fresh login.";
    await freshLogin();
    p = await prepare();
    if (p.hash === (await getAuto()).lastHash) {
      throw new Error("YouTube did not give a fresh login; open music.youtube.com and sign in.");
    }
    return send(p, { lastHealthPushAt: Date.now() });
  });
}

browser.cookies.onChanged.addListener(async ({ cookie }) => {
  if (!cookie.domain.endsWith("youtube.com") || cookie.storeId !== STORE || !RELEVANT.has(cookie.name)) return;
  if (freshWaiter) freshWaiter();
  const st = await getAuto();
  if (!st.enabled) return;
  await patchAuto({ changesSeen: st.changesSeen + 1, lastChangeAt: Date.now() });
  await browser.alarms.create("ytc-debounce", { delayInMinutes: 2 });
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "ytc-debounce") return maybePush();
  if (alarm.name === "ytc-health") return healthCheck();
});

browser.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.type === "auto-set") {
    return (async () => {
      if ((await browser.runtime.getPlatformInfo()).os === "android") return { ok: false };
      await patchAuto({ enabled: !!msg.enabled });
      if (msg.enabled) {
        await startHealthAlarm();
        // A first send soon after switching on, rather than waiting for YouTube's next rotation.
        await browser.alarms.create("ytc-debounce", { delayInMinutes: 1 });
      }
      else await Promise.all([browser.alarms.clear("ytc-health"), browser.alarms.clear("ytc-debounce")]);
      return { ok: true };
    })();
  }
  if (msg.type === "auto-push-now") return guarded(async () => send(await prepare(), {}));
});

browser.runtime.onStartup.addListener(restoreAlarms);
browser.runtime.onInstalled.addListener(restoreAlarms);
