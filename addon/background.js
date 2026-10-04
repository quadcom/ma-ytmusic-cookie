// Open the welcome page once, on first install, so the user learns the private-window step.
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") browser.tabs.create({ url: browser.runtime.getURL("welcome.html") });
});
