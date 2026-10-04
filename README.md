# YT Music Cookie for Music Assistant

**Get your YouTube Music login into Music Assistant without the fuss.**

Music Assistant's YouTube Music provider needs your login "cookie" as one line of text. Other cookie exporters produce a Netscape `cookies.txt` file, and Music Assistant cannot use that. This Firefox add-on gives you the right format instead. You can copy it, or send it straight into Music Assistant.

It helps anyone who runs Music Assistant and wants YouTube Music in it, especially people doing this from a phone.

## Install

- **Firefox Add-ons store (link coming).** Once it is listed, tap Install on the store page. This works on Android and desktop.
- **On Android, before it is listed:**
  1. Download the signed `.xpi` file from the [GitHub Releases page](https://github.com/quadcom/ma-ytmusic-cookie/releases).
  2. In Firefox, open Settings > About Firefox.
  3. Tap the Firefox logo 5 times.
  4. Go back to Settings and tap "Install extension from file".
  5. Choose the `.xpi` file.

Then allow it in private windows: open the add-on's settings in Firefox and turn on "Run in private windows" (on Android, "Run in private browsing"). The add-on cannot see a private window until you do.

## Use it in one minute

1. Open a **private window** (or private tab).
2. Go to music.youtube.com and sign in.
3. Open any playlist in your library.
4. Tap the add-on's button, then choose **Copy** or **Send**.
   - **Copy** puts the login on your clipboard. Paste it into Music Assistant > Settings > Providers > YouTube Music.
   - **Send** puts it straight into Music Assistant for you.
5. Close the private window **without signing out**. Signing out, or browsing normally with the same account, can make Google replace the cookie and stop your copy working.

## Set up Send (once)

After you install, a welcome page opens and walks you through this. You can also open the add-on's settings and do it yourself:

1. Press **Find my server**. The add-on tries homeassistant.local and a few other usual addresses. If it does not find yours, type your **Music Assistant address**, for example `http://192.168.1.10:8095`.
2. Press **Save** and allow Firefox to reach your server when it asks.
3. Press **Sign in with Home Assistant** (a Home Assistant login page opens in a tab and closes by itself), or **Music Assistant account** to use a Music Assistant username and password.

The add-on then makes its own long-lived Music Assistant token for this device. There is nothing to copy or paste. The account must be a Music Assistant admin.

If you would rather use a token you made yourself, choose "Paste a token instead". Make it in Music Assistant (Settings > Profile > Long-lived access tokens), not in Home Assistant.

Press **Test connection** to check it. By default the address and sign-in sync, encrypted by Firefox, between your desktop Firefox installs signed in to the same Firefox account with add-on data sync on; untick the box in the settings to keep them on this device only. Firefox for Android has no add-on sync, so sign in once on your phone too.

## Good to know

- **Android:** if the mobile site misbehaves, use "Request desktop site" in Firefox's menu.
- **"401 Unauthorized" in Music Assistant** means the cookie has expired. Repeat the steps above to get a fresh one.

## Privacy

The cookie is a full login to your Google account. Treat it like a password.

- The add-on never stores the cookie.
- It only sends the cookie to the Music Assistant address you set, and only when you press Send.
- It does not send anything anywhere else.

## Licence

MIT. See [LICENSE](LICENSE).

Not affiliated with Google, YouTube, Home Assistant, Music Assistant or the Open Home Foundation.
