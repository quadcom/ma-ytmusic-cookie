# PLAN_YTC_02 - Reuse the Music Assistant settings on another Firefox

**Status:** proposed (2026-10-04). Nothing built.

## Goal

Adrian's request (2026-10-04): set the add-on up on a second Firefox (phone, another computer)
without making a new Music Assistant token. Two ways, both on the settings page:

1. **Copy / show the saved token** - works on any Firefox, any account.
2. **Sync** - opt-in; the address and token follow the user's Firefox account to every Firefox
   signed in to it.

Not "across users": Firefox Sync only moves data between installs signed in to the same Firefox
account. Sharing with another person stays a manual copy.

## Decision (Adrian, 2026-10-04)

"An automatic sync is preferable to a manual copy." Sync (part 2) is the main route.
Proposed consequence, awaiting his yes: sync **on by default**; part 1 shrinks to just the **Show**
toggle on the token field (so the token can still be copied by hand if sync does not reach the
phone); the `ytc1:` Copy/Paste settings line and the `clipboardRead` permission are dropped.

## 1. Copy and show (superseded in part by the decision above - only the Show toggle stays)

`addon/options.html` / `addon/options.js`:

- A **Show** toggle next to the token field: switches `type="password"` <-> `type="text"`.
- A **Copy settings** button: puts one line on the clipboard,
  `ytc1:<base64url of JSON {"address": ..., "token": ...}>`. One paste carries both fields.
- A **Paste settings** button: reads the clipboard (`navigator.clipboard.readText()`, needs the
  `clipboardRead` permission) and fills both fields when the text starts with `ytc1:`; the user
  still presses Save (Save is where Firefox asks for the site permission, which has to come from a
  click). If the clipboard has no `ytc1:` line: "The clipboard does not hold settings copied from
  this add-on. Copy them on the other Firefox first."
- The `ytc1:` prefix is a version tag so a future format change can be told apart.
- Line under the buttons: "This line contains your token. Paste it only into your own Firefox."

Reasoning: base64 is not protection, and does not pretend to be; it only keeps the line in one
piece through chat apps and notes.

## 2. Sync across the user's own Firefox installs

- Checkbox **"Sync these settings to my other Firefox devices"**, on by default (per the decision
  above; was "off" in the first draft).
- On: settings are written to `browser.storage.sync` key `"ma"` (as well as `storage.local`);
  `MA.loadSettings()` reads local first, then sync. Off: the sync copy is removed.
- On a new install, if `storage.sync` already has `"ma"`, the settings page fills in from it and
  says "Settings arrived from your other Firefox. Press Save to let this Firefox reach the server."
  (The site permission is per install and cannot sync; it still needs one click.)
- The popup's Send button also appears when only the sync copy exists, but the send refuses with
  that same sentence until Save has granted the permission (existing "Press Save first" check moved
  into a shared helper in `ma.js`).
- Help text: "Firefox Sync encrypts this with your Firefox account before it leaves the device. It
  only reaches Firefox installs signed in to the same account with add-on data sync turned on."

Facts (reasoned from Mozilla docs, not yet tested here):
- `storage.sync` data is end-to-end encrypted by Firefox Sync with the account's keys.
- It needs the user signed in to a Firefox account with sync on; otherwise it behaves as local
  storage, so nothing breaks.
- Limits: 8 KB per item, 100 KB total; the settings are about 0.5 KB.
- Android: Firefox for Android's support for syncing `storage.sync` is **unverified**; test with
  Adrian's Pixel. If it does not sync there, the Copy/Paste route still covers the phone.

## Refusals

- Paste with a malformed `ytc1:` line (bad base64, missing field) -> no fields changed; "That
  settings line is damaged. Copy it again on the other Firefox."
- Sync never pushes settings that fail `MA.saveSettings` validation.

## Version and changelog

Ships as the next version (1.0.3 if built before the AMO listing, so the store gets it from day
one). Changelog lines: "Copy your Music Assistant settings to another Firefox in one line." and
"Optionally sync the settings to your other Firefox devices."

## Open questions (waiting on Adrian)

1. ~~Both parts, or only one?~~ Answered 2026-10-04: sync preferred over manual copy.
2. Confirm: sync on by default, keep only the Show toggle, drop Copy/Paste settings line?
