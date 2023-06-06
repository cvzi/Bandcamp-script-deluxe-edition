// ==UserScript==
// @name            Bandcamp script (Deluxe Edition) [dev]
// @description     A discography player for bandcamp.com and manager for your played albums
// @namespace       https://openuserjs.org/users/cuzi
// @supportURL      https://github.com/cvzi/Bandcamp-script-deluxe-edition/issues
// @icon            https://raw.githubusercontent.com/cvzi/Bandcamp-script-deluxe-edition/master/images/icon.png
// @contributionURL https://github.com/cvzi/Bandcamp-script-deluxe-edition#donate
// @require         https://unpkg.com/json5@2.1.0/dist/index.min.js
// @require         https://openuserjs.org/src/libs/cuzi/GeniusLyrics.js
// @require         https://unpkg.com/react@18/umd/react.development.js
// @require         https://unpkg.com/react-dom@18/umd/react-dom.development.js
// @run-at          document-start
// @match           https://*/*
// @match           https://bandcamp.com/*
// @exclude         https://bandcamp.com/videoframe*
// @exclude         https://bandcamp.com/EmbeddedPlayer*
// @connect         bandcamp.com
// @connect         *.bandcamp.com
// @connect         bcbits.com
// @connect         *.bcbits.com
// @connect         genius.com
// @connect         *
// @version         1.28.0
// @homepage        https://github.com/cvzi/Bandcamp-script-deluxe-edition
// @author          cuzi
// @license         MIT
// @grant           GM.xmlHttpRequest
// @grant           GM.setValue
// @grant           GM.getValue
// @grant           GM.notification
// @grant           GM_download
// @grant           GM.registerMenuCommand
// @grant           GM_registerMenuCommand
// @grant           GM_addStyle
// @grant           GM_setClipboard
// @grant           unsafeWindow
// ==/UserScript==
/*  globals GM */

'use strict';

(function () {
  const url = `http://localhost:8125/dist/bundle.user.js?${Date.now()}`
  new Promise(function loadBundleFromServer (resolve, reject) {
    const req = GM.xmlHttpRequest({
      method: 'GET',
      url,
      onload: function (r) {
        if (r.status !== 200) {
          return reject(r)
        }
        resolve(r.responseText)
      },
      onerror: e => reject(e)
    })
    if (req && 'catch' in req) {
      req.catch(e => { /* ignore */ })
    }
  }).catch(function (e) {
    const log = function (obj, b) {
      let prefix = 'loadBundleFromServer: '
      try {
        prefix = GM.info.script.name + ': '
      } catch (e) {}
      if (b) {
        console.log(prefix + obj, b)
      } else {
        console.log(prefix, obj)
      }
    }
    if (e && 'status' in e) {
      if (e.status <= 0) {
        log('Server is not responding')
        GM.getValue('scriptlastsource3948218', false).then(function (src) {
          if (src) {
            log('%cExecuting cached script version', 'color: Crimson; font-size:x-large;')
            /* eslint-disable no-eval */
            eval(src)
          }
        })
      } else {
        log('HTTP status: ' + e.status)
      }
    } else {
      log(e)
    }
  }).then(function (s) {
    if (s) {
      /* eslint-disable no-eval */
      eval(`${s}
//# sourceURL=${url}`)
      GM.setValue('scriptlastsource3948218', s)
    }
  })
})()