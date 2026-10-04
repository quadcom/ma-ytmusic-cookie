# Developer tools

Helpers used while building and releasing the add-on. Not part of the add-on and not for users.
Each reads private values (Music Assistant address, build box address, AMO key file) from
environment variables; the real values are listed in `~/.claude/machine.md` ("YT Music Cookie"
rows), never in this repository. How and when to use each: `CLAUDE.md`, "Routines".

- `amo/amo.mjs` - Mozilla add-ons API v5 client (JWT from the key file in `KEYS`); `node amo.mjs show`.
- `amo/amo-previews.mjs` - uploads store screenshots and captions, sets the listing slug.
- `screenshots/` - `shim.js` stands in for the WebExtension API with example data so the shipping
  pages render in Chrome; `store-popup.html` frames the popup for the store; `gallery.html` shows
  the set.
- `icons/` - renders `addon/icons/logo.svg` to transparent PNGs in the build box Chrome (`BOX_CDP`).
- `firefox-test/` - headless Firefox checks over WebDriver BiDi; `user.js` pins the add-on UUID.
- `watch-ma-playback.mjs` - read-only Music Assistant player watcher (`MA_URL`, `MA_TOKEN`).
