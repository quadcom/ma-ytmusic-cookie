
async function checkIncognito() {
  const el = document.getElementById("incognito-status");
  let allowed = false;
  try {
    allowed = await browser.extension.isAllowedIncognitoAccess();
  } catch (e) {
    allowed = false;
  }
  el.className = "status-line " + (allowed ? "ok" : "warn");
  const text = document.createElement("span");
  text.textContent = allowed ? "Allowed. The add-on can read private windows." : "Not allowed yet.";
  el.replaceChildren(iconSvg(allowed ? "ok" : "warn"), text);
}

document.getElementById("open-options").addEventListener("click", () => {
  browser.runtime.openOptionsPage();
});
window.addEventListener("focus", checkIncognito);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkIncognito();
});
checkIncognito();
