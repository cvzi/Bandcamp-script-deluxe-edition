# Bandcamp-script-deluxe-edition

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

A discography player for bandcamp.com and manager for your played albums

This is a userscript. It's primarily designed for Firefox with [Greasemonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/) and Chrome with [Tampermonkey](https://www.tampermonkey.net/). 
General information about userscripts and how to use them can be found at [openuserjs.org/about/Userscript-Beginners-HOWTO](https://openuserjs.org/about/Userscript-Beginners-HOWTO).

If you already have a userscript extension installed, you can click **[here](https://openuserjs.org/install/cuzi/Bandcamp_script_(Deluxe_Edition).user.js) to install** this script.

Since **Firefox 71** you may need to [change a setting in about:config](https://support.mozilla.org/en-US/kb/about-config-editor-firefox) to enable all features:  
The `dom.media.mediasession.enabled` preference needs to be set to true.

Features:
 *   player on discography pages (similar to the player on tag pages)
 *   manage your 'played/listened' albums by clicking on a '✔ Mark as played' link
 *   Export/backup played/listened albums
 *   circumvent the "The time has come to open thy wallet" limit
 *   volume slider on album pages
 *   shuffle/repeat on album page
 *   Download mp3 from discography player
 *   Download mp3 from album page
 *   Desktop notifications on song change (disabled by default, enable in script settings in the top right corner)
 *   Control playback with hardware multimedia keys or remote control (only Chrome)
 *   Set reminders for upcoming releases
 *   Minimize/Close player
 *   Settings to disable individual functions
 *   Works on [campexplorer.io](https://campexplorer.io/)

Discography player:

![Screenshot of discography page](screenshots/screenshotDiscographyPage.webp)

Album page:

![Screenshot of album page](screenshots/screenshotAlbumPage.webp)

[Changelog](CHANGELOG.md)

[License](LICENSE)
