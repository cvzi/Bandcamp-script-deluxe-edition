'use strict';

(function () {
  new Promise(function test (resolve, reject) {
    GM.xmlHttpRequest({
      url: `http://localhost:8124/bundle.user.js?${Date.now()}`,
      onload: function (r) {
        if (r.status !== 200) {
          return reject(r)
        }
        resolve(r.responseText)
      },
      onerror: e => reject(e)
    }).catch(e => { /* ignore */ })
  }).then(function (s) {
    eval(s) // eslint-disable-line no-eval
    return true
  }).catch(function (e) {
    const log = function (obj) {
      try {
        console.log(GM.info.script.name + ': ' + obj)
      } catch (e) {
        console.log('loadBundleFromServer', obj)
      }
    }
    if (e && 'status' in e) {
      if (e.status <= 0) {
        log('Server is not responding')
      } else {
        log('HTTP status: ' + e.status)
      }
    } else {
      log(e)
    }
  })
})()
