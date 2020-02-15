// ==UserScript==
// @name          Bandcamp script (Deluxe Edition)
// @description   A discography player for bandcamp.com and manage your played albums
// @namespace     https://openuserjs.org/users/cuzi
// @copyright     2019, cuzi (https://openuserjs.org/users/cuzi)
// @license       MIT
// @version       0.15
// @require       https://unpkg.com/json5@2.1.0/dist/index.min.js
// @grant         GM.xmlHttpRequest
// @grant         GM.setValue
// @grant         GM.getValue
// @grant         GM.notification
// @grant         GM_download
// @grant         unsafeWindow
// @connect       bandcamp.com
// @connect       *.bandcamp.com
// @connect       bcbits.com
// @connect       *.bcbits.com
// @include       https://bandcamp.com/*
// @include       https://*.bandcamp.com/*
// ==/UserScript==

// ==OpenUserJS==
// @author        cuzi
// ==/OpenUserJS==

/* globals JSON5, GM, unsafeWindow, MouseEvent, Response */

// TODO repeat/shuffle buttons
// TODO genius lyrics?
// TODO test preorder albums and albums that are not streamable
// TODO run on all sites, not only bandcamp if (hostname is 'bandcamp' or definingFeature())
// TODO Mark as played automatically when played

const BACKUP_REMINDER_DAYS = 35
const TRALBUM_CACHE_HOURS = 2
const CHROME = navigator.userAgent.indexOf('Chrome') !== -1
const NOEMOJI = CHROME && navigator.userAgent.match(/Windows (NT)? [4-9]/i)

const allFeatures = {
  discographyplayer: {
    name: 'Enable player on discography page',
    default: true
  },
  albumPageVolumeBar: {
    name: 'Enable volume slider on album page',
    default: true
  },
  markasplayed: {
    name: 'Show "mark as played" link on discography player',
    default: true
  },
  markasplayedEverywhere: {
    name: 'Show "mark as played" link everywhere',
    default: true
  },
  /* markasplayedAuto: {
    name: '(NOT YET IMPLEMENTED) Automatically "mark as played" once a song was played for',
    default: false
  }, */
  thetimehascome: {
    name: 'Circumvent "The time has come to open thy wallet" limit',
    default: true
  },
  albumPageDownloadLinks: {
    name: 'Show download links on album page',
    default: true
  },
  discographyplayerDownloadLink: {
    name: 'Show download link on discography player',
    default: true
  },
  backupReminder: {
    name: 'Remind me to backup my played albums every month',
    default: true
  },
  nextSongNotifications: {
    name: 'Show a notification when a new song starts',
    default: false
  },
  discographyplayerPersist: {
    name: 'Recover discography player on next page',
    default: true
  },
  releaseReminder: {
    name: 'Show new releases that I have saved',
    default: true
  }
}

var player, audio, currentDuration, timeline, playhead, bufferbar
var onPlayHead = false

function humanDuration (duration) {
  let hours = parseInt(duration / 3600)
  if (!hours) {
    hours = ''
  } else {
    hours += ':'
  }
  duration %= 3600
  let minutes = parseInt(duration / 60)
  minutes = (minutes < 10 ? '0' : '') + minutes
  duration %= 60
  let seconds = parseInt(duration)
  if (duration - seconds >= 0.5) {
    seconds++
  }
  seconds = (seconds < 10 ? '0' : '') + seconds
  return `${hours}${minutes}:${seconds}`
}

function addLogVolume (mediaElement) {
  if (!Object.hasOwnProperty.call(mediaElement, 'logVolume')) {
    Object.defineProperty(mediaElement, 'logVolume', {
      get () {
        return Math.log((Math.E - 1) * this.volume + 1)
      },
      set (percentage) {
        this.volume = (Math.exp(percentage) - 1) / (Math.E - 1)
      }
    })
  }
}

function padd (n, width, filler) {
  let s
  for (s = n.toString(); s.length < width; s = filler + s) {}
  return s
}

function metricPrefix (n, decimals, k) {
  // From http://stackoverflow.com/a/18650828
  if (n <= 0) {
    return String(n)
  }
  k = k || 1000
  const dm = decimals <= 0 ? 0 : decimals || 2
  const sizes = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
  const i = Math.floor(Math.log(n) / Math.log(k))
  return parseFloat((n / Math.pow(k, i)).toFixed(dm)) + sizes[i]
}

function fixFilename (s) {
  const forbidden = '*"/\[]:|,<>?\n\t\0'.split('')
  forbidden.forEach(function (char){
    s = s.replace(char, '')
  })
  return s
}

function base64encode (s) {
  // from https://gist.github.com/stubbetje/229984
  const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('')
  const l = s.length
  let o = ''
  for (let i = 0; i < l; i++) {
    const byte0 = s.charCodeAt(i++) & 0xff
    const byte1 = s.charCodeAt(i++) & 0xff
    const byte2 = s.charCodeAt(i) & 0xff
    o += base64[byte0 >> 2]
    o += base64[((byte0 & 0x3) << 4) | (byte1 >> 4)]
    const t = i - l
    if (t >= 0) {
      if (t === 0) {
        o += base64[((byte1 & 0x0f) << 2) | (byte2 >> 6)]
        o += base64[64]
      } else {
        o += base64[64]
        o += base64[64]
      }
    } else {
      o += base64[((byte1 & 0x0f) << 2) | (byte2 >> 6)]
      o += base64[byte2 & 0x3f]
    }
  }
  return o
}

function timeSince (date) {
  // From https://stackoverflow.com/a/3177838/10367381
  const seconds = Math.floor((new Date() - date) / 1000)
  let interval = Math.floor(seconds / 31536000)
  if (interval > 1) {
    return interval + ' years'
  }
  interval = Math.floor(seconds / 2592000)
  if (interval > 1) {
    return interval + ' months'
  }
  interval = Math.floor(seconds / 86400)
  if (interval > 1) {
    return interval + ' days'
  }
  interval = Math.floor(seconds / 3600)
  if (interval > 1) {
    return interval + ' hours'
  }
  interval = Math.floor(seconds / 60)
  if (interval > 1) {
    return interval + ' minutes'
  }
  return Math.floor(seconds) + ' seconds'
}

function removeViaQuerySelector (parent, selector) {
  if (typeof selector === 'undefined') {
    selector = parent
    parent = document
  }
  for (let el = parent.querySelector(selector); el; el = parent.querySelector(selector)) {
    el.remove()
  }
}

function firstChildWithText (parent) {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i]
    if (node.nodeType === window.Node.TEXT_NODE && node.nodeValue.trim()) {
      return node
    } else if (node.childNodes.length) {
      const r = firstChildWithText(node)
      if (r) {
        return r
      }
    }
  }
  return false
}

const _dateOptions = { year: 'numeric', month: 'short', day: 'numeric' }
const _dateOptionsWithoutYear = { month: 'short', day: 'numeric' }
const _dateOptionsNumericWithoutYear = { year: '2-digit', month: '2-digit', day: '2-digit' }
function dateFormater (date) {
  if (date.getFullYear() === (new Date()).getFullYear()) {
    return date.toLocaleDateString(undefined, _dateOptionsWithoutYear)
  } else {
    return date.toLocaleDateString(undefined, _dateOptions)
  }
}
function dateFormaterRelease (date) {
  return date.toLocaleDateString(undefined, _dateOptionsWithoutYear) + ', ' + date.getFullYear()
}
function dateFormaterNumeric (date) {
  return date.toLocaleDateString(undefined, _dateOptionsNumericWithoutYear)
}

function getEnabledFeatures (enabledFeaturesValue) {
  for (const feature in allFeatures) {
    allFeatures[feature].enabled = allFeatures[feature].default
  }
  if (enabledFeaturesValue !== false) {
    const enabledFeatures = JSON.parse(enabledFeaturesValue)
    if (enabledFeatures.constructor === Object) {
      for (const feature in enabledFeatures) {
        if (feature in allFeatures) {
          allFeatures[feature].enabled = enabledFeatures[feature].enabled
        }
      }
    }
  }
  return allFeatures
}

function findUserProfileUrl () {
  if (document.querySelector('#collection-main a')) {
    return document.querySelector('#collection-main a').href
  }
  return 'https://bandcamp.com/login'
}

var ivRestoreVolume
function getStoredVolume (callbackIfVolumeExists) {
  GM.getValue('volume', '0.7').then(str => {
    return parseFloat(str)
  }).then(function storedVolumeLoaded (volume) {
    if (!Number.isNaN(volume) && volume > 0.0) {
      callbackIfVolumeExists(volume)
    }
  })
}
function restoreVolume () {
  getStoredVolume(function getStoredVolumeCallback (volume) {
    const restoreVolumeInterval = function restoreInterval () {
      const audios = document.querySelectorAll('audio,video')
      if (audios.length > 0) {
        let paused = true
        audios.forEach(function (media) {
          addLogVolume(media)
          paused = paused && media.paused
          media.logVolume = volume
        })
        if (!paused) {
          // Clear interval once audio is actually playing
          window.clearInterval(ivRestoreVolume)
        }
        // Update volume bar on tag player (by double clicking mute button)
        const muteWrapper = document.querySelector('.vol-icon-wrapper')
        if (muteWrapper) {
          const mouseDownEvent = new MouseEvent('mousedown', { view: window, bubbles: true, cancelable: true })
          muteWrapper.dispatchEvent(mouseDownEvent)
          muteWrapper.dispatchEvent(mouseDownEvent)
        }
      }
    }
    restoreVolumeInterval()
    ivRestoreVolume = window.setInterval(restoreVolumeInterval, 3000)
  })
  window.setTimeout(function clearRestoreInterval () {
    window.clearInterval(ivRestoreVolume)
  }, 10000)
}

function findPreviousAlbumCover (currentUrl) {
  const currentKey = albumKey(currentUrl)
  const as = document.querySelectorAll('.music-grid .music-grid-item a[href^="/album/"],.music-grid .music-grid-item a[href^="/track/"]')
  let last = false
  let found = false
  for (let i = 0; i < as.length; i++) {
    if (last && albumKey(as[i].href) === currentKey) {
      found = last
      break
    }
    last = as[i]
  }
  if (found) {
    return playAlbumFromCover.apply(found, null)
  }
  return false
}
function findNextAlbumCover (currentUrl) {
  const currentKey = albumKey(currentUrl)
  const as = document.querySelectorAll('.music-grid .music-grid-item a[href^="/album/"],.music-grid .music-grid-item a[href^="/track/"]')
  let isNext = false
  for (let i = 0; i < as.length; i++) {
    if (isNext) {
      playAlbumFromCover.apply(as[i], null)
      return true
    }
    if (albumKey(as[i].href) === currentKey) {
      isNext = true
    }
  }
  return false
}
function musicPlayerNextSong (next) {
  const current = player.querySelector('.playlist .playing')
  if (!next) {
    next = current.nextElementSibling
    while (next) {
      if ('file' in next.dataset) {
        break
      }
      next = next.nextElementSibling
    }
  }
  if (next) {
    current.classList.remove('playing')
    next.classList.add('playing')
    musicPlayerPlaySong(next)
  } else {
    // End of playlist reached
    if (findNextAlbumCover(current.dataset.albumUrl) === false) {
      const notloaded = player.querySelector('.playlist .playlistheading a.notloaded')
      if (notloaded) {
        // Unloaded albums in playlist
        const url = notloaded.href
        notloaded.remove()
        cachedTralbumData(url).then(function onCachedTralbumDataLoaded (TralbumData) {
          if (TralbumData) {
            addAlbumToPlaylist(TralbumData, 0)
          } else {
            playAlbumFromUrl(url)
          }
        })
      } else {
        audio.pause()
        audio.currentTime -= 1
        musicPlayerOnTimeUpdate()
        window.alert('End of playlist reached')
      }
    }
  }
}
var ivSlideInNextSong
function musicPlayerPlaySong (next, startTime) {
  currentDuration = next.dataset.duration
  player.querySelector('.durationDisplay .current').innerHTML = '-'
  player.querySelector('.durationDisplay .total').innerHTML = humanDuration(currentDuration)
  audio.src = next.dataset.file
  if (typeof startTime !== 'undefined' && startTime !== false) {
    audio.currentTime = startTime
  }
  bufferbar.classList.remove('bufferbaranimation')
  window.setTimeout(function bufferbaranimationWidth () {
    bufferbar.style.width = '0px'
    window.setTimeout(function bufferbaranimationClass () {
      bufferbar.classList.add('bufferbaranimation')
    }, 0)
  }, 0)

  const key = albumKey(next.dataset.albumUrl)

  // Meta
  const currentlyPlaying = document.querySelector('.currentlyPlaying')
  const nextInRow = player.querySelector('.nextInRow')
  nextInRow.querySelector('.cover').href = next.dataset.albumUrl
  nextInRow.querySelector('.cover img').src = next.dataset.albumCover
  nextInRow.querySelector('.info .link').href = next.dataset.albumUrl
  nextInRow.querySelector('.info .title').innerHTML = next.dataset.title
  nextInRow.querySelector('.info .artist').innerHTML = next.dataset.artist
  nextInRow.querySelector('.info .album').innerHTML = next.dataset.album

  // Favicon
  musicPlayerFavicon(next.dataset.albumCover.replace(/_\d.jpg$/, '_3.jpg'))

  // Wishlist
  const collectWishlist = player.querySelector('.collect-wishlist')
  collectWishlist.dataset.albumUrl = next.dataset.albumUrl
  player.querySelectorAll('.collect-wishlist>*').forEach(function (e) { e.style.display = 'none' })
  if (next.dataset.isPurchased === 'true') {
    player.querySelector('.collect-wishlist .wishlist-own').style.display = 'inline-block'
    collectWishlist.dataset.wishlist = 'own'
  } else if (next.dataset.inWishlist === 'true') {
    player.querySelector('.collect-wishlist .wishlist-collected').style.display = 'inline-block'
    collectWishlist.dataset.wishlist = 'collected'
  } else {
    player.querySelector('.collect-wishlist .wishlist-add').style.display = 'inline-block'
    collectWishlist.dataset.wishlist = 'add'
  }

  // Played/Listened
  const collectListened = player.querySelector('.collect-listened')
  if (allFeatures.markasplayed.enabled && collectListened) {
    collectListened.dataset.albumUrl = next.dataset.albumUrl
    player.querySelectorAll('.collect-listened>*').forEach(function (e) { e.style.display = 'none' })
    GM.getValue('myalbums', '{}').then(function myalbumsLoaded (str) {
      const myalbums = JSON.parse(str)
      if (key in myalbums && 'listened' in myalbums[key] && myalbums[key].listened) {
        player.querySelector('.collect-listened .listened').style.display = 'inline-block'
        const date = new Date(myalbums[key].listened)
        const since = timeSince(date)
        player.querySelector('.collect-listened .listened').title = since + ' ago\nClick to mark as NOT played'
        collectListened.dataset.listened = myalbums[key].listened
      } else {
        player.querySelector('.collect-listened .mark-listened').style.display = 'inline-block'
        collectListened.dataset.listened = false
      }
    })
  } else if (collectListened) {
    collectListened.remove()
  }

  // Notification
  if (allFeatures.nextSongNotifications.enabled && 'notification' in GM) {
    GM.notification({
      title: document.location.host,
      text: next.dataset.title + '\nby ' + next.dataset.artist + '\nfrom ' + next.dataset.album,
      image: next.dataset.albumCover,
      highlight: false,
      silent: true,
      timeout: 3000,
      onclick: musicPlayerNext
    })
  }

  // Download link
  const downloadLink = player.querySelector('.downloadlink')
  if (allFeatures.discographyplayerDownloadLink.enabled) {
    downloadLink.href = next.dataset.file
    downloadLink.download = next.dataset.trackNumber > 9 ? '' : '0' + next.dataset.trackNumber + '. ' + fixFilename(next.dataset.artist + ' - ' + next.dataset.title) + '.mp3'
    downloadLink.style.display = 'block'
  } else {
    downloadLink.style.display = 'none'
  }

  // Animate
  currentlyPlaying.style.marginLeft = -parseInt(currentlyPlaying.clientWidth + 1) + 'px'
  nextInRow.style.width = '99%'

  clearTimeout(ivSlideInNextSong)

  ivSlideInNextSong = window.setTimeout(function slideInSongInterval () {
    currentlyPlaying.remove()
    const clone = nextInRow.cloneNode(true)
    clone.style.width = '0%'
    clone.className = 'nextInRow'
    nextInRow.className = 'currentlyPlaying'
    nextInRow.parentNode.appendChild(clone)
  }, 7 * 1000)

  window.setTimeout(() => player.querySelector('.playlist .playing').scrollIntoView({ block: 'nearest' }), 200)
}

function musicPlayerPlay () {
  if (audio.paused) {
    audio.play()
    musicPlayerCookieChannelSendStop()
  } else {
    audio.pause()
  }
}
function musicPlayerStop () {
  if (!audio.paused) {
    audio.pause()
  }
}
function musicPlayerPrev () {
  musicPlayerShowBusy()
  const current = player.querySelector('.playlist .playing')
  let prev = current.previousElementSibling
  while (prev) {
    if ('file' in prev.dataset) {
      break
    }
    prev = prev.previousElementSibling
  }
  if (prev) {
    musicPlayerNextSong(prev)
  }
}
function musicPlayerNext () {
  musicPlayerShowBusy()
  musicPlayerNextSong()
}
function musicPlayerPrevAlbum () {
  audio.pause()
  window.setTimeout(function musicPlayerPrevAlbumTimeout () {
    musicPlayerShowBusy()
    const url = player.querySelector('.playlist .playing').dataset.albumUrl
    if (!findPreviousAlbumCover(url)) {
      // Find previous album in playlist
      let prev = false
      const as = player.querySelectorAll('.playlist .playlistheading a')
      for (let i = 0; i < as.length; i++) {
        if (albumKey(as[i].href) === albumKey(url)) {
          if (i > 0) {
            prev = as[i - 1]
          }
          break
        }
      }
      if (prev) {
        prev.parentNode.click()
      } else {
        // Just play first song in playlist
        player.querySelector('.playlist .playlistentry').click()
      }
    }
  }, 10)
}
function musicPlayerNextAlbum () {
  audio.pause()
  window.setTimeout(function musicPlayerNextAlbumTimeout () {
    musicPlayerShowBusy()
    const r = findNextAlbumCover(player.querySelector('.playlist .playing').dataset.albumUrl)
    if (r === false) {
      // Find next album in playlist
      let reachedPlaying = false
      let found = false
      const lis = player.querySelectorAll('.playlist li')
      for (let i = 0; i < lis.length; i++) {
        if (reachedPlaying && lis[i].classList.contains('playlistheading')) {
          lis[i].click()
          found = true
          break
        } else if (lis[i].classList.contains('playing')) {
          reachedPlaying = true
        }
      }
      if (!found) {
        audio.play()
        window.alert('End of playlist reached')
      }
    }
  }, 10)
}

function musicPlayerOnTimelineClick (ev) {
  musicPlayerMovePlayHead(ev)
  const timelineWidth = timeline.offsetWidth - playhead.offsetWidth
  const clickPercent = (ev.clientX - timeline.getBoundingClientRect().left) / timelineWidth
  audio.currentTime = currentDuration * clickPercent
}

function musicPlayerOnTimeUpdate () {
  const playpause = player.querySelector('.playpause')
  const timelineWidth = timeline.offsetWidth - playhead.offsetWidth
  const playPercent = timelineWidth * (audio.currentTime / currentDuration)
  playhead.style.marginLeft = playPercent + 'px'
  if (audio.currentTime === currentDuration) {
    playpause.querySelector('.play').style.display = 'none'
    playpause.querySelector('.busy').style.display = ''
    playpause.querySelector('.pause').style.display = 'none'
  } else if (audio.paused) {
    playpause.querySelector('.play').style.display = ''
    playpause.querySelector('.busy').style.display = 'none'
    playpause.querySelector('.pause').style.display = 'none'
    if (document.title.startsWith('\u25B6\uFE0E ')) {
      document.title = document.title.substring(3)
    }
  } else {
    playpause.querySelector('.play').style.display = 'none'
    playpause.querySelector('.busy').style.display = 'none'
    playpause.querySelector('.pause').style.display = ''
    if (!document.title.startsWith('\u25B6\uFE0E ')) {
      document.title = '\u25B6\uFE0E ' + document.title
    }
  }
  player.querySelector('.durationDisplay .current').innerHTML = humanDuration(audio.currentTime)
}

function musicPlayerUpdateBufferBar () {
  if (currentDuration) {
    if (audio.buffered.length > 0) {
      bufferbar.style.width = Math.min(100, 1 + parseInt(100 * audio.buffered.end(0) / currentDuration)) + '%'
    } else {
      bufferbar.style.width = '100%'
    }
  } else {
    bufferbar.style.width = '0px'
  }
}

function musicPlayerShowBusy (ev) {
  const playpause = player.querySelector('.playpause')
  playpause.querySelector('.play').style.display = 'none'
  playpause.querySelector('.busy').style.display = ''
  playpause.querySelector('.pause').style.display = 'none'
}

function musicPlayerMovePlayHead (event) {
  const newMargLeft = event.clientX - timeline.getBoundingClientRect().left
  const timelineWidth = timeline.offsetWidth - playhead.offsetWidth
  if (newMargLeft >= 0 && newMargLeft <= timelineWidth) {
    playhead.style.marginLeft = newMargLeft + 'px'
  }
  if (newMargLeft < 0) {
    playhead.style.marginLeft = '0px'
  }
  if (newMargLeft > timelineWidth) {
    playhead.style.marginLeft = timelineWidth + 'px'
  }
}
function musicPlayerOnPlayheadMouseDown () {
  onPlayHead = true
  window.addEventListener('mousemove', musicPlayerMovePlayHead, true)
  audio.removeEventListener('timeupdate', musicPlayerOnTimeUpdate, false)
}

function musicPlayerOnPlayheadMouseUp (event) {
  if (onPlayHead) {
    musicPlayerMovePlayHead(event)
    window.removeEventListener('mousemove', musicPlayerMovePlayHead, true)
    // change current time
    const timelineWidth = timeline.offsetWidth - playhead.offsetWidth

    const clickPercent = (event.clientX - timeline.getBoundingClientRect().left) / timelineWidth
    audio.currentTime = currentDuration * clickPercent
    audio.addEventListener('timeupdate', musicPlayerOnTimeUpdate, false)
  }
  onPlayHead = false
}

function musicPlayerOnVolumeClick (ev) {
  const volSlider = player.querySelector('.vol-slider')
  const sliderWidth = volSlider.offsetWidth
  const percent = (ev.clientX - volSlider.getBoundingClientRect().left) / sliderWidth
  audio.logVolume = percent > 0.9 ? 1.0 : percent
  GM.setValue('volume', audio.logVolume)
}
function musicPlayerOnVolumeWheel (ev) {
  ev.preventDefault()
  const direction = Math.min(Math.max(-1.0, ev.deltaY), 1.0)
  audio.logVolume = Math.min(Math.max(0.0, audio.logVolume - 0.05 * direction), 1.0)
  GM.setValue('volume', audio.logVolume)
}
function musicPlayerOnMuteClick (ev) {
  if (audio.logVolume < 0.01) {
    if ('lastvolume' in audio.dataset && audio.dataset.lastvolume) {
      audio.logVolume = audio.dataset.lastvolume
      GM.setValue('volume', audio.logVolume)
    } else {
      audio.logVolume = 1.0
    }
  } else {
    audio.dataset.lastvolume = audio.logVolume
    audio.logVolume = 0.0
  }
}

function musicPlayerOnVolumeChanged (ev) {
  const icons = ['\uD83D\uDD07', '\uD83D\uDD08', '\uD83D\uDD09', '\uD83D\uDD0A']
  const percent = audio.logVolume
  const volSlider = player.querySelector('.vol-slider')
  volSlider.querySelector('.vol-amt').style.width = parseInt(100 * percent) + '%'
  const volIconWrapper = player.querySelector('.vol-icon-wrapper')
  volIconWrapper.title = 'Mute (' + parseInt(percent * 100) + '%)'
  if (percent < 0.05) {
    volIconWrapper.innerHTML = icons[0]
  } else if (percent < 0.3) {
    volIconWrapper.innerHTML = icons[1]
  } else if (percent < 0.8) {
    volIconWrapper.innerHTML = icons[2]
  } else {
    volIconWrapper.innerHTML = icons[3]
  }
}

function musicPlayerOnEnded (ev) {
  musicPlayerNextSong()
  window.setTimeout(() => player.querySelector('.playlist .playing').scrollIntoView({ block: 'nearest' }), 200)
}
function musicPlayerOnPlaylistClick (ev) {
  musicPlayerNextSong(this)
}
function musicPlayerOnPlaylistHeadingClick (ev) {
  const a = this.querySelector('a[href]')
  if (a && a.classList.contains('notloaded')) {
    const url = a.href
    this.remove()
    cachedTralbumData(url).then(function onCachedTralbumDataLoaded (TralbumData) {
      if (TralbumData) {
        addAlbumToPlaylist(TralbumData, 0)
      } else {
        playAlbumFromUrl(url)
      }
    })
  } else if (a && this.nextElementSibling) {
    this.nextElementSibling.click()
  }
}
function musicPlayerFavicon (url) {
  removeViaQuerySelector(document.head, 'link[rel*=icon]')
  const link = document.createElement('link')
  link.type = 'image/x-icon'
  link.rel = 'shortcut icon'
  link.href = url
  document.head.appendChild(link)
}

function musicPlayerCollectWishlistClick (ev) {
  ev.preventDefault()

  if (player.querySelector('.collect-wishlist').dataset === 'own') {
    return
  }

  const url = player.querySelector('.collect-wishlist').dataset.albumUrl

  player.querySelectorAll('.collect-wishlist>*').forEach(function (e) { e.style.display = 'none' })

  window.open(url + '#collect-wishlist')
}

async function musicPlayerCollectListenedClick (ev) {
  ev.preventDefault()

  const collectListened = player.querySelector('.collect-listened')

  const url = collectListened.dataset.albumUrl

  setTimeout(function musicPlayerCollectListenedResetTimeout () {
    player.querySelectorAll('.collect-listened>*').forEach(function (e) { e.style.display = 'none' })
    player.querySelector('.collect-listened .listened-saving').style.display = 'inline-block'
    player.querySelector('.collect-listened').style.cursor = 'wait'
  }, 0)

  let albumData = await myAlbumsGetAlbum(url)
  if (!albumData) {
    albumData = await myAlbumsNewFromUrl(url, {})
  }

  if (albumData.listened) {
    albumData.listened = false
  } else {
    albumData.listened = (new Date()).toJSON()
  }

  collectListened.dataset.listened = albumData.listened

  await myAlbumsUpdateAlbum(albumData)

  player.querySelectorAll('.collect-listened>*').forEach(function (e) { e.style.display = 'none' })
  if (albumData.listened) {
    player.querySelector('.collect-listened .listened').style.display = 'inline-block'
  } else {
    player.querySelector('.collect-listened .mark-listened').style.display = 'inline-block'
  }
  player.querySelector('.collect-listened').style.cursor = ''

  makeAlbumLinksGreat()
}

function musicPlayerCookieChannel (onStopEventCb) {
  window.addEventListener('message', function onMessage (event) {
    // Receive messages from the cookie channel event handler
    if (event.origin === document.location.protocol + '//' + document.location.hostname &&
    event.data && typeof (event.data) === 'object' && 'discographyplayerCookiechannelPlaylist' in event.data &&
    event.data.discographyplayerCookiechannelPlaylist.length >= 2 && event.data.discographyplayerCookiechannelPlaylist[1] === 'stop') {
      onStopEventCb(event.data.discographyplayerCookiechannelPlaylist)
    }
  })
  var script = document.createElement('script')
  script.innerHTML = `
  var channel = new Cookie.CommChannel('playlist')
  channel.send('stop')
  channel.subscribe(function(a,b) {
    window.postMessage({'discographyplayerCookiechannelPlaylist': b}, document.location.href)
    })
  channel.startListening()
  window.addEventListener('message', function onMessage (event) {
    // Receive messages from the user script
    if (event.origin === document.location.protocol + '//' + document.location.hostname
    && event.data && typeof(event.data) === 'object' && 'discographyplayerCookiechannelPlaylist' in event.data
    && event.data.discographyplayerCookiechannelPlaylist === 'sendstop') {
      channel.send('stop')
    }
  })
  window.addEventListener('unload', function(event) {
    channel.cleanup()
  })
  `
  document.head.appendChild(script)
}
function musicPlayerCookieChannelSendStop (onStopEventCb) {
  window.postMessage({ discographyplayerCookiechannelPlaylist: 'sendstop' }, document.location.href)
}

function musicPlayerSaveState () {
  let startPlaybackIndex = false
  const playlistEntries = player.querySelectorAll('.playlist .playlistentry')
  for (let i = 0; i < playlistEntries.length; i++) {
    if (playlistEntries[i].classList.contains('playing')) {
      startPlaybackIndex = i
      break
    }
  }
  const startPlaybackTime = audio.currentTime
  return GM.setValue('musicPlayerState', JSON.stringify({
    time: (new Date().getTime()),
    htmlPlaylist: player.querySelector('.playlist').innerHTML,
    startPlayback: !audio.paused,
    startPlaybackIndex: startPlaybackIndex,
    startPlaybackTime: startPlaybackTime
  }))
}

function musicPlayerRestoreState (state) {
  if (!allFeatures.discographyplayerPersist.enabled) {
    return
  }
  if (state.time + 1000 * 30 < (new Date().getTime())) {
    // Saved state expires after 30 seconds
    return
  }

  // Re-create music player
  musicPlayerCreate()
  player.querySelector('.playlist').innerHTML = state.htmlPlaylist
  const playlistEntries = player.querySelectorAll('.playlist .playlistentry')
  playlistEntries.forEach(function addPlaylistEntryOnClick (li) {
    li.addEventListener('click', musicPlayerOnPlaylistClick)
  })
  player.querySelectorAll('.playlist .playlistheading').forEach(function addPlaylistHeadingEntryOnClick (li) {
    li.addEventListener('click', musicPlayerOnPlaylistHeadingClick)
  })
  if (state.startPlaybackIndex !== false) {
    player.querySelectorAll('.playlist .playing').forEach(function (el) {
      el.classList.remove('playing')
    })
    playlistEntries[state.startPlaybackIndex].classList.add('playing')
    window.setTimeout(() => player.querySelector('.playlist .playing').scrollIntoView({ block: 'nearest' }), 200)
  }
  // Start playback
  if (state.startPlayback && state.startPlaybackIndex !== false) {
    musicPlayerPlaySong(playlistEntries[state.startPlaybackIndex], state.startPlaybackTime)
  }
}

function musicPlayerToggleMinimize (ev, hide) {
  if (hide || player.style.bottom !== '-57px') {
    player.style.bottom = '-57px'
    this.classList.add('minimized')
  } else {
    player.style.bottom = '0px'
    this.classList.remove('minimized')
  }
}

function musicPlayerClose () {
  if (player) {
    player.style.display = 'none'
  }
  if (audio) {
    audio.pause()
  }
}

function musicPlayerCreate () {
  if (player) {
    player.style.display = 'block'
    return
  }

  musicPlayerCookieChannel(musicPlayerStop)

  const img1px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mOsmLZvJgAFwQJn5VVZ5QAAAABJRU5ErkJggg=='

  const listenedListUrl = findUserProfileUrl() + '#listened-tab'

  const checkSymbol = NOEMOJI ? '✓' : '✔'

  player = document.createElement('div')
  document.body.appendChild(player)
  player.id = 'discographyplayer'
  player.innerHTML = `
<div class="col col25 nowPlaying">
  <div class="currentlyPlaying">
    <a class="cover" target="_blank" href="#">
      <img src="${img1px}">
    </a>
    <div class="info">
      <a class="link" target="_blank" href="#">
        <div class="title">◧◩◨▧■□▩</div>
        <div class="artist">by <span>◩▧◧□ ◩◨▧ ■◩▩</span></div>
        <div>from <span class="album">◨■■▩ ▧◨□</span></div>
      </a>
    </div>
  </div>
  <div class="nextInRow">
    <a class="cover" target="_blank" href="#">
      <img src="${img1px}">
    </a>
    <div class="info">
      <a class="link" target="_blank" href="#">
        <div class="title">◧◩◨▧■□▩</div>
        <div>by <span class="artist">◩▧◧□ ◩◨▧ ■◩▩</span></div>
        <div>from <span class="album">◨■■▩ ▧◨□</span></div>
      </a>
    </div>
  </div>
</div>
<div class="col col25 colcontrols">
  <audio autoplay="autoplay" preload="auto"></audio>
  <div class="audioplayer">
    <div id="timeline">
      <div id="bufferbar" class="bufferbaranimation"></div>
      <div id="playhead"></div>
    </div>
    <div class="controls">

      <div class="prevalbum" title="Previous album">
        <div class="arrowbutton prevalbum-icon"></div>
      </div>

      <div class="prev" title="Previous song">
        <div class="arrowbutton prev-icon"></div>
      </div>

      <div class="playpause" title="Play/Pause">
        <div class="play" style="display: none;"></div>
        <div class="busy" style="display: none;"></div>
        <div class="pause" style=""></div>
      </div>

      <div class="next" title="Next song">
        <div class="arrowbutton next-icon"></div>
      </div>

      <div class="nextalbum" title="Next album">
        <div class="arrowbutton nextalbum-icon"></div>
      </div>
    </div>
    <div class="durationDisplay"><span class="current">-</span>/<span class="total">-</span></div>

    <a class="downloadlink" title="Download mp3">
      ⭳
    </a>
    <br class="clb">
  </div>
</div>
<div class="col col35">
  <ol class="playlist"></ol>
</div>
<div class="col col15 colcontrols colvolumecontrols">

  <div class="vol">
      <div class="vol-icon-wrapper" title="Mute">
          🔊
      </div>
      <div class="vol-slider">
          <div class="vol-amt" style="width: 100%;"></div>
          <div class="vol-bg"></div>
      </div>
  </div>

  <div class="collect">
    <div class="collect-wishlist">
      <a class="wishlist-default" href="https://bandcamp.com/wishlist">Wishlist</a>

      <span class="wishlist-add" title="Add this album to your wishlist">
        <span class="bc-ui2 icon add-item-icon"></span>
        <span class="add-item-label">Add to wishlist</span>
      </span>
      <span class="wishlist-collected" title="Remove this album from your wishlist">
        <span class="bc-ui2 icon collected-item-icon"></span>
        <span>In Wishlist</span>
      </span>
      <span class="wishlist-own" title="You own this album">
        <span class="bc-ui2 icon own-item-icon"></span>
        <span>You own this</span>
      </span>
      <span class="wishlist-saving">
        Saving....
      </span>
    </div>
    <div class="collect-listened">
      <a class="listened-default" href="${listenedListUrl}">
        Played albums
        </a>
      <span class="listened" title="Mark album as NOT played">
        <span class="listened-symbol">${checkSymbol}</span>
        <span class="listened-label">Played</span>
      </span>
      <span class="mark-listened" title="Mark album as played">
        <span class="mark-listened-symbol">${checkSymbol}</span>
        <span class="mark-listened-label">Mark as played</span>
      </span>
      <span class="listened-saving">
        Saving...
      </span>
    </div>
  </div>

  <br class="cll">
  <div class="minimizebutton">
    <span class="minimized" title="Maximize player">&uarr;</span>
    <span class="maximized" title="Minimize player">&darr;</span>
  </div>
  <div class="closebutton" title="Close player">x</div>
</div>`

  document.head.appendChild(document.createElement('style')).innerHTML = `
.cll{
  clear:left;
}
.clb{
  clear:both;
}
#discographyplayer{
  z-index:1010;
  position:fixed;
  bottom:0px;
  height:83px;
  width:100%;
  padding-top:3px;
  background:white;
  color:#505958;
  border-top: 1px solid rgba(0,0,0,0.15);
  font-family:"Helvetica Neue", Helvetica, Arial, sans-serif;
  transition: bottom 500ms
}
#discographyplayer .nowPlaying .info,#discographyplayer .nowPlaying .cover {
    display: inline-block;
    vertical-align: top;
}
#discographyplayer .nowPlaying img {
    width: 60px;
    height: 60px;
    margin-top: 4px;
    margin-left: 4px;
    margin-bottom: 4px;
}
#discographyplayer .nowPlaying .info {
    line-height: 18px;
    margin-left: 8px;
    margin-top: 8px;
    max-width: calc(100% - 76px);
}
#discographyplayer .currentlyPlaying{
  display:inline-block;
  vertical-align: top;
  overflow: hidden;
  transition: margin-left 3s ease-in-out;
  width:99%;
}
#discographyplayer .nextInRow {
  display:inline-block;
  vertical-align: top;
  width:0%;
  overflow: hidden;
  transition: width 6s ease-in-out;
}
#discographyplayer .durationDisplay{
  margin-top:24px;
  float:left;
}
#discographyplayer .downloadlink:link{
  display:block;
  float:right;
  margin-top: 10px;
  font-size:15px;
  padding: 0px 3px;
  border:1px solid rgb(6, 135, 245);
  transition: color 300ms ease-in-out, border-color 300ms ease-in-out;
}
#discographyplayer .downloadlink:hover{
  text-decoration:none
}
#discographyplayer .downloadlink.downloading{
  color:#f0f;
  border-color:#f0f;
  animation: downloadrotation 3s infinite linear;
  cursor:wait;
}
@keyframes downloadrotation {
  from {transform: rotate(0deg)}
  to {transform: rotate(359deg)}
}
#discographyplayer .controls{
  margin-top: 10px;
  width: auto;
  float:left;
}
#discographyplayer .controls > *{
  display:inline-block;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  padding: 11px;
  margin-right: 4px;
  height: 18px;
  width: 17px;
}
#discographyplayer .playpause .play {
  width: 0;
  height: 0;
  border-top: 9px inset transparent;
  border-bottom: 9px inset transparent;
  border-left: 15px solid rgb(34, 34, 34);
  cursor: pointer;
  margin-left: 2px;
}
#discographyplayer .playpause .pause {
  border: 0;
  border-left: 5px solid #2d2d2d;
  border-right: 5px solid #2d2d2d;
  height: 18px;
  width: 4px;
  margin-right: 2px;
  margin-left: 1px;
}
#discographyplayer .playpause .busy {
  background-image: url(/img/playerbusy-noborder.gif);
  background-position: 50% 50%;
  background-repeat: no-repeat;
  border: none;
  height: 30px;
  margin: 0px 0px 0px -3px;
  width: 25px;
  overflow: hidden;
  background-size: contain;
}
#discographyplayer .arrowbutton {
  border: 0;
  height: 13px;
  width: 20px;
  margin-top: 4px;
  background: url(/img/nextprev.png) 0px 0px / 40px 12px no-repeat transparent;
  background-position-x: 0px;
  cursor: pointer;
}
#discographyplayer .arrowbutton.next-icon {
  background-position: 100% 0px;
}
#discographyplayer .arrowbutton.prev-icon {

}
#discographyplayer .arrowbutton.prevalbum-icon {
  border-right: 3px solid #2d2d2d;
}
#discographyplayer .arrowbutton.nextalbum-icon {
  background-position: 100% 0px;
  border-left: 3px solid #2d2d2d;
}
#timeline{
  width: 100%;
  background: rgba(50,50,50,0.4);
  margin-top:5px;
  border-left:1px solid black;
  border-right:1px solid black;
}
#playhead{
  width:10px;
  height:10px;
  border-radius: 50%;
  background:rgba(50,50,50,1.0);;
  cursor:pointer;
}
.bufferbaranimation{
  transition: width 1s;
}
#bufferbar{
  position:absolute;
  width:0px;
  height:10px;
  background:rgba(0,0,0,0.1);
}
#discographyplayer .playlist{
  width:100%;
  display:inline-block;
  max-height:80px;
  overflow:auto;
  list-style:none;
  margin:0px;
  padding: 0px 5px 0px 5px;
  scrollbar-color: rgba(50,50,50,0.4) white;
}
#discographyplayer .playlist .playlistentry {
  cursor:pointer;
  margin:1px 0px
}
#discographyplayer .playlist .playlistentry .duration {
  float:right
}
#discographyplayer .playlist .playing{
  background:#619aa950
}
#discographyplayer .playlist .playlistheading{
  background:rgba(50,50,50,0.4);
  margin:3px 0px
}
#discographyplayer .playlist .playlistheading a:link,#discographyplayer .playlist .playlistheading a:hover,#discographyplayer .playlist .playlistheading a:visited{
  color:#EEE;
  cursor:pointer
}
#discographyplayer .playlist .playlistheading a.notloaded{
  color:#CCC
}
#discographyplayer .playlist .playlistheading.notloaded{
  cursor:copy
}
#discographyplayer .vol{
  float:left;
  position: relative;
  width: 100px;
  margin-left: 1em;
  margin-top: 1em;
}
#discographyplayer .vol-icon-wrapper{
  font-size: 20px;
  cursor: pointer;
  width:27px;
}
#discographyplayer .vol-slider {
  width: 60px;
  height: 10px;
  position: relative;
  cursor: pointer;
}
#discographyplayer .vol > * {
  display: inline-block;
  vertical-align: middle;
}
#discographyplayer .vol-bg {
  background: rgba(50, 50, 50, 0.4);
  width: 100%;
  margin-top: 4px;
  height: 3px;
  position: absolute;
}
#discographyplayer .vol-amt {
  margin-top: 4px;
  height: 3px;
  position: absolute;
  background: rgba(50, 50, 50, 1);
}
#discographyplayer .vol-control-outer {
  height: 100%;
  position: relative;
  margin-left: -3px;
  margin-right: 5px;
}
#discographyplayer .collect{
  float:left;
  margin-left: 1em;
}
#discographyplayer .collect-wishlist {
  cursor:default;
  margin-top:0.5em;
}
#discographyplayer .collect-wishlist .wishlist-add {
  cursor:pointer;
}
#discographyplayer .collect-listened {
  cursor:pointer;
  margin-top:0.5em;
  margin-left: 2px;
}
#discographyplayer .collect .icon{
  height: 13px;
  width: 14px;
  display: inline-block;
  position: relative;
  top: 2px;
}
#discographyplayer .collect .add-item-icon{
  background-position: 0px -73px;
}
#discographyplayer .collect .collected-item-icon{
  background-position: -28px -73px;
}
#discographyplayer .collect .own-item-icon{
  background-position: -42px -73px;
}
#discographyplayer .collect .wishlist-add,#discographyplayer .collect .wishlist-collected,#discographyplayer .collect .wishlist-own,#discographyplayer .collect .wishlist-saving{
  display:none;
}
#discographyplayer .collect .wishlist-add:hover .add-item-icon{
  background-position: -56px -73px;
}
#discographyplayer .collect .wishlist-add:hover .add-item-label{
  text-decoration:underline;
}
#discographyplayer .collect .listened,#discographyplayer .collect .mark-listened, #discographyplayer .collect .listened-saving{
  display:none;
}
#discographyplayer .collect .listened .listened-symbol{
  color:rgb(0,220,50);
  text-shadow:1px 0px #DDD,-1px 0px #DDD,0px -1px #DDD,0px 1px #DDD
}
#discographyplayer .collect .mark-listened .mark-listened-symbol{
  color:#FFF;
  text-shadow:1px 0px #959595,-1px 0px #959595,0px -1px #959595,0px 1px #959595
}
#discographyplayer .collect .mark-listened:hover .mark-listened-symbol{
  text-shadow:1px 0px #0AF,-1px 0px #0AF,0px -1px #0AF,0px 1px #0AF
}
#discographyplayer .collect .mark-listened:hover .mark-listened-label {
  text-decoration:underline;
}
#discographyplayer .closebutton,#discographyplayer .minimizebutton {
  position: absolute;
  top: 1px;
  right: 1px;
  border: 1px solid #505958;
  color: #505958;
  font-size: 10px;
  box-shadow: 0px 0px 2px #505958;
  cursor: pointer;
  opacity:0.0;
  transition: opacity 300ms;
  min-width:8px;
  min-height:13px;
  text-align:center;
}
#discographyplayer .minimizebutton {
  right:13px;
}
#discographyplayer .minimizebutton .minimized {
  display:none
}
#discographyplayer .minimizebutton.minimized .maximized {
  display:none
}
#discographyplayer .minimizebutton.minimized .minimized {
  display:inline
}
#discographyplayer:hover .closebutton, #discographyplayer:hover .minimizebutton {
  opacity:1.0
}
#discographyplayer .col {
  float: left;
  min-height: 1px;
  position: relative;
}
#discographyplayer .col25 {
  width: 25%;
}
#discographyplayer .col35 {
  width: 35%;
}
#discographyplayer .col30 {
  width: 30%;
}
#discographyplayer .col15 {
  width: 14%;
}
#discographyplayer .col20 {
  width: 20%;
}
#discographyplayer .colcontrols {
  user-select: none
}
#discographyplayer .colvolumecontrols {
  margin-left:10px
}

`

  audio = player.querySelector('audio')
  addLogVolume(audio)
  getStoredVolume(function setVolumeCallback (volume) { audio.logVolume = volume })
  playhead = player.querySelector('#playhead')
  bufferbar = player.querySelector('#bufferbar')
  timeline = player.querySelector('#timeline')

  player.querySelector('.minimizebutton').addEventListener('click', musicPlayerToggleMinimize)
  player.querySelector('.closebutton').addEventListener('click', musicPlayerClose)

  audio.addEventListener('ended', musicPlayerOnEnded)
  audio.addEventListener('timeupdate', musicPlayerOnTimeUpdate)
  audio.addEventListener('volumechange', musicPlayerOnVolumeChanged)
  audio.addEventListener('canplaythrough', function onCanPlayThrough () {
    currentDuration = audio.duration
    player.querySelector('.durationDisplay .total').innerHTML = humanDuration(currentDuration)
  })

  timeline.addEventListener('click', musicPlayerOnTimelineClick, false)
  playhead.addEventListener('mousedown', musicPlayerOnPlayheadMouseDown, false)
  window.addEventListener('mouseup', musicPlayerOnPlayheadMouseUp, false)

  player.querySelector('.prevalbum').addEventListener('click', musicPlayerPrevAlbum)
  player.querySelector('.prev').addEventListener('click', musicPlayerPrev)
  player.querySelector('.playpause').addEventListener('click', musicPlayerPlay)
  player.querySelector('.next').addEventListener('click', musicPlayerNext)
  player.querySelector('.nextalbum').addEventListener('click', musicPlayerNextAlbum)

  player.querySelector('.vol-slider').addEventListener('click', musicPlayerOnVolumeClick)
  player.querySelector('.vol').addEventListener('wheel', musicPlayerOnVolumeWheel, false)
  player.querySelector('.vol-icon-wrapper').addEventListener('click', musicPlayerOnMuteClick)

  player.querySelector('.collect-wishlist').addEventListener('click', musicPlayerCollectWishlistClick)
  player.querySelector('.collect-listened').addEventListener('click', musicPlayerCollectListenedClick)

  player.querySelector('.downloadlink').addEventListener('click', function onDownloadLinkClick (ev) {
    const addSpinner = (el) => el.classList.add('downloading')
    const removeSpinner = (el) => el.classList.remove('downloading')
    downloadMp3FromLink(ev, this, addSpinner, removeSpinner)
  })
  if (NOEMOJI) {
    player.querySelector('.downloadlink').innerHTML = '↓'
  }

  window.addEventListener('unload', function onPageUnLoad (ev) {
    if (allFeatures.discographyplayerPersist.enabled && player.style.display !== 'none' && !audio.paused) {
      addAllAlbumsAsHeadings()
      musicPlayerSaveState()
    }
  })

  window.setInterval(musicPlayerUpdateBufferBar, 1200)
}

function addHeadingToPlaylist (title, url, albumLoaded) {
  musicPlayerCreate()
  let content = document.createTextNode('💽 ' + title)
  if (url) {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.appendChild(content)
    content = a
    a.className = albumLoaded ? 'loaded' : 'notloaded'
    a.title = 'Open album page'
  }
  const li = document.createElement('li')
  li.appendChild(content)
  li.className = 'playlistheading'
  if (!albumLoaded) {
    li.className += ' notloaded'
    li.title = 'Load album into playlist'
  }
  li.addEventListener('click', musicPlayerOnPlaylistHeadingClick)
  player.querySelector('.playlist').appendChild(li)
}

function addToPlaylist (startPlayback, data) {
  musicPlayerCreate()

  const li = document.createElement('li')
  li.appendChild(document.createTextNode((data.trackNumber > 9 ? '' : '0') + data.trackNumber + '. ' + data.artist + ' - ' + data.title))
  const span = document.createElement('span')
  span.className = 'duration'
  span.appendChild(document.createTextNode(humanDuration(data.duration)))
  li.appendChild(span)
  li.value = data.trackNumber
  li.dataset.file = data.file
  li.dataset.title = data.title
  li.dataset.trackNumber = data.trackNumber
  li.dataset.duration = data.duration
  li.dataset.artist = data.artist
  li.dataset.album = data.album
  li.dataset.albumUrl = data.albumUrl
  li.dataset.albumCover = data.albumCover
  li.dataset.inWishlist = data.inWishlist
  li.dataset.isPurchased = data.isPurchased

  li.addEventListener('click', musicPlayerOnPlaylistClick)
  li.className = 'playlistentry'
  player.querySelector('.playlist').appendChild(li)

  if (startPlayback) {
    player.querySelectorAll('.playlist .playing').forEach(function (el) {
      el.classList.remove('playing')
    })
    li.classList.add('playing')
    musicPlayerPlaySong(li)
    window.setTimeout(() => player.querySelector('.playlist .playing').scrollIntoView({ block: 'nearest' }), 200)
  }
}

function addAlbumToPlaylist (TralbumData, startPlaybackIndex) {
  let i = 0
  const artist = TralbumData.artist
  const album = TralbumData.current.title
  const albumUrl = document.location.protocol + '//' + albumKey(TralbumData.url)
  const albumCover = `https://f4.bcbits.com/img/a${TralbumData.art_id}_2.jpg`
  addHeadingToPlaylist(album, 'url' in TralbumData ? TralbumData.url : false, true)
  let streamable = 0
  for (const key in TralbumData.trackinfo) {
    const track = TralbumData.trackinfo[key]
    if (!track.file) {
      continue
    }
    const trackNumber = track.track_num
    const file = track.file[Object.keys(track.file)[0]]
    const title = track.title
    const duration = track.duration
    const inWishlist = 'tralbum_collect_info' in TralbumData && 'is_collected' in TralbumData.tralbum_collect_info && TralbumData.tralbum_collect_info.is_collected
    const isPurchased = 'tralbum_collect_info' in TralbumData && 'is_purchased' in TralbumData.tralbum_collect_info && TralbumData.tralbum_collect_info.is_purchased
    addToPlaylist(startPlaybackIndex === i++, {
      file: file,
      title: title,
      trackNumber: trackNumber,
      duration: duration,
      artist: artist,
      album: album,
      albumUrl: albumUrl,
      albumCover: albumCover,
      inWishlist: inWishlist,
      isPurchased: isPurchased
    })
    streamable++
  }
  if (streamable === 0) {
    const li = document.createElement('li')
    li.appendChild(document.createTextNode((NOEMOJI ? '\u27C1' : '\uD83D\uDE22') + ' Album is not streamable'))
    player.querySelector('.playlist').appendChild(li)
  }
  player.querySelectorAll('.playlist .playlistheading a.notloaded').forEach(function (el) {
    // Move unloaded items to the end
    el.parentNode.parentNode.appendChild(el.parentNode)
  })
}

function addAllAlbumsAsHeadings () {
  const as = document.querySelectorAll('.music-grid .music-grid-item a[href^="/album/"],.music-grid .music-grid-item a[href^="/track/"]')
  const lis = player.querySelectorAll('.playlist .playlistentry')

  const isAlreadyInPlaylist = function (url) {
    for (let i = 0; i < lis.length; i++) {
      if (albumKey(lis[i].dataset.albumUrl) === albumKey(url)) {
        return true
      }
    }
    return false
  }

  for (let i = 0; i < as.length; i++) {
    const url = as[i].href
    // Check if already in playlist
    if (!isAlreadyInPlaylist(url)) {
      const title = ('textContent' in as[i].dataset ? as[i].dataset.textContent : as[i].querySelector('.title').textContent).trim()
      addHeadingToPlaylist(title, url, false)
    }
  }
}

function getTralbumData (url, cb) {
  return new Promise(function getTralbumDataPromise (resolve, reject) {
    GM.xmlHttpRequest({
      method: 'GET',
      url: url,
      onload: function getTralbumDataOnLoad (response) {
        if (!response.responseText || response.responseText.indexOf('400 Bad Request') !== -1) {
          let msg = ''
          try {
            msg = response.responseText.split('<center>')[1].split('</center>')[0]
          } catch (e) {
            msg = response.responseText
          }
          window.alert('An error occured. Please clear your cookies of bandcamp.com and try again.\n\nOriginal error:\n' + msg)
          reject(response)
          return
        }
        const TralbumData = JSON5.parse(response.responseText.split('var TralbumData =')[1].split('\n};\n')[0].replace(/"\s+\+\s+"/, '') + '\n}')
        correctTralbumData(TralbumData)
        resolve(TralbumData)
      },
      onerror: function getTralbumDataOnError (response) {
        console.log('getTralbumData(' + url + ') Error: ' + response.status + '\nResponse:\n' + response.responseText)
        reject(response)
      }
    })
  })
}
function correctTralbumData (TralbumData) {
  // Corrections for single tracks
  if (TralbumData.current.type === 'track' && TralbumData.current.title.toLowerCase().indexOf('single') === -1) {
    TralbumData.current.title += ' - Single'
  }
  for (let i = 0; i < TralbumData.trackinfo.length; i++) {
    if (TralbumData.trackinfo[i].track_num === null) {
      TralbumData.trackinfo[i].track_num = i + 1
    }
  }
  return TralbumData
}

function albumKey (url) {
  if (url.startsWith('/')) {
    url = document.location.hostname + url
  }
  if (url.indexOf('://') !== -1) {
    url = url.split('://')[1]
  }
  if (url.indexOf('#') !== -1) {
    url = url.split('#')[0]
  }
  if (url.indexOf('?') !== -1) {
    url = url.split('?')[0]
  }
  return url
}

async function storeTralbumData (TralbumData) {
  const expires = TRALBUM_CACHE_HOURS * 3600000
  const cache = JSON.parse(await GM.getValue('tralbumdata', '{}'))
  for (const prop in cache) {
    // Delete cached values, that are older than 2 hours
    if ((new Date()).getTime() - (new Date(cache[prop].time)).getTime() > expires) {
      delete cache[prop]
    }
  }
  TralbumData.time = (new Date()).toJSON()
  cache[albumKey(TralbumData.url)] = TralbumData
  await GM.setValue('tralbumdata', JSON.stringify(cache))
}

async function cachedTralbumData (url) {
  const expires = TRALBUM_CACHE_HOURS * 3600000
  const key = albumKey(url)
  const cache = JSON.parse(await GM.getValue('tralbumdata', '{}'))
  for (const prop in cache) {
    // Delete cached values, that are older than 2 hours
    if ((new Date()).getTime() - (new Date(cache[prop].time)).getTime() > expires) {
      delete cache[prop]
      continue
    }
    if (prop === key) {
      return cache[prop]
    }
  }
  return false
}

function playAlbumFromCover (ev) {
  let parent = this
  for (let j = 0; parent.tagName !== 'A' && j < 20; j++) {
    parent = parent.parentNode
  }
  const url = parent.href
  parent.querySelector('img')
  parent.classList.add('discographyplayer_currentalbum')

  // Check if already in playlist
  if (player) {
    musicPlayerCreate()
    const lis = player.querySelectorAll('.playlist .playlistentry')
    for (let i = 0; i < lis.length; i++) {
      if (albumKey(lis[i].dataset.albumUrl) === albumKey(url)) {
        lis[i].click()
        return
      }
    }
  }

  // Load data
  cachedTralbumData(url).then(function onCachedTralbumDataLoaded (TralbumData) {
    if (TralbumData) {
      addAlbumToPlaylist(TralbumData, 0)
    } else {
      playAlbumFromUrl(url)
    }
  })
}

function playAlbumFromUrl (url) {
  getTralbumData(url).then(function onGetTralbumDataLoaded (TralbumData) {
    storeTralbumData(TralbumData)
    addAlbumToPlaylist(TralbumData, 0)
  }).catch(function onGetTralbumDataError (e) {
    window.alert('Could not load album data from url:\n' + url + '\n' + e)
  })
}

async function myAlbumsGetAlbum (url) {
  const key = albumKey(url)
  const data = JSON.parse(await GM.getValue('myalbums', '{}'))

  if (key in data) {
    return data[key]
  } else {
    return false
  }
}

async function myAlbumsUpdateAlbum (albumData) {
  const key = albumKey(albumData.url)
  const data = JSON.parse(await GM.getValue('myalbums', '{}'))

  if (key in data) {
    data[key] = Object.assign(data[key], albumData)
  } else {
    data[key] = albumData
  }

  await GM.setValue('myalbums', JSON.stringify(data))
}

async function myAlbumsNewFromUrl (url, fallback) {
  // Get data from cache or load from url
  url = albumKey(url)
  const albumData = fallback || {}
  let TralbumData = await cachedTralbumData(url)
  if (!TralbumData) {
    try {
      TralbumData = await getTralbumData(document.location.protocol + '//' + url)
    } catch (e) {
      console.log('myAlbumsNewFromUrl() Could not load album data from url:\n' + url)
    }
    if (TralbumData) {
      storeTralbumData(TralbumData)
    }
  }
  if (TralbumData) {
    albumData.artist = TralbumData.artist
    albumData.title = TralbumData.current.title
    albumData.albumCover = `https://f4.bcbits.com/img/a${TralbumData.art_id}_2.jpg`
    albumData.releaseDate = TralbumData.current.release_date
  }
  albumData.url = url
  albumData.listened = false
  return albumData
}

function makeAlbumCoversGreat () {
  document.head.appendChild(document.createElement('style')).innerHTML = `
.music-grid-item .art-play {
  position: absolute;
  width: 74px;
  height: 54px;
  left: 50%;
  top: 50%;
  margin-left: -36px;
  margin-top: -27px;
  opacity: 0;
  transition: opacity 0.2s;
}
.music-grid-item .art-play-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background: #000;
  border-radius: 4px;
}
.music-grid-item .art-play-icon {
    position: absolute;
    width: 0;
    height: 0;
    left: 28px;
    top: 17px;
    border-width: 10px 0 10px 17px;
    border-color: transparent transparent transparent #fff;
    border-style: dashed dashed dashed solid;
}
.music-grid-item:hover .art-play {
  opacity: 0.6;
}
`
  const onclick = function onclick (ev) {
    ev.preventDefault()
    playAlbumFromCover.apply(this, ev)
  }
  const artPlay = document.createElement('div')
  artPlay.className = 'art-play'
  artPlay.innerHTML = '<div class="art-play-bg"></div><div class="art-play-icon"></div>'

  // Albums and single tracks
  const imgs = document.querySelectorAll('.music-grid .music-grid-item a[href^="/album/"] img,.music-grid .music-grid-item a[href^="/track/"] img')
  for (let i = 0; i < imgs.length; i++) {
    imgs[i].addEventListener('click', onclick)

    // Add play overlay
    const clone = artPlay.cloneNode(true)
    clone.addEventListener('click', onclick)
    imgs[i].parentNode.appendChild(clone)
  }
}

async function makeAlbumLinksGreat (parentElement) {
  const doc = parentElement || document
  const myalbums = JSON.parse(await GM.getValue('myalbums', '{}'))

  if (!('makeAlbumLinksGreat' in document.head.dataset)) {
    document.head.dataset.makeAlbumLinksGreat = true
    document.head.appendChild(document.createElement('style')).innerHTML = `
    .bdp_check_onlinkhover_container { z-index:1002; position:absolute; display:none }
    .bdp_check_onlinkhover_container_shown { display:block; background-color:rgba(255,255,255,0.9); padding:0px 2px 0px 0px; border-radius:5px  }
    .bdp_check_onlinkhover_container:hover { position:absolute; transition: all 300ms linear; background-color:rgba(255,255,255,0.9); padding:0px 10px 0px 7px; border-radius:5px }
    .bdp_check_onchecked_container { z-index:-1; position:absolute; opacity:0.0; margin-top:-2px}
    a:hover .bdp_check_onchecked_container { z-index:1002; position:absolute; transition: opacity 300ms linear; opacity:1.0}

    .bdp_check_onlinkhover_symbol {color:rgba(0,0,50,0.7)}
    .bdp_check_onlinkhover_text {color:rgba(0,0,50,0.7)}
    .bdp_check_onlinkhover_container:hover .bdp_check_onlinkhover_symbol { color:rgba(0,0,100,1.0) }
    .bdp_check_onlinkhover_container:hover .bdp_check_onlinkhover_text { color:rgba(0,100,0,1.0)}
    .bdp_check_onchecked_symbol { color:rgba(0,100,0,0.8) }
    .bdp_check_onchecked_text { color:rgba(150,200,150,0.8) }

    a:hover .bdp_check_onchecked_symbol { text-shadow: 1px 1px #fff; color:rgba(0,50,0,1.0); transition: all 300ms linear }
    a:hover .bdp_check_onchecked_text { text-shadow: 1px 1px #000; color:rgba(200,255,200,0.8); transition: all 300ms linear }

    `
  }

  const excluded = [...document.querySelectorAll('#carousel-player .now-playing a')]
  excluded.push(...document.querySelectorAll('#discographyplayer a'))
  excluded.push(...document.querySelectorAll('#pastreleases a'))

  /*
  <div class="bdp_check_container bdp_check_onlinkhover_container"><span class="bdp_check_onlinkhover_symbol">\u2610</span> <span class="bdp_check_onlinkhover_text">Check</span></div>
  <div class="bdp_check_container bdp_check_onlinkhover_container"><span class="bdp_check_onlinkhover_symbol">\u1f5f9</span> <span class="bdp_check_onlinkhover_text">Check</span></div>
  <span class="bdp_check_onchecked_symbol">\u2611</span> TITLE <div class="bdp_check_container bdp_check_onchecked_container"><span class="bdp_check_onchecked_text">Played</span></div>
  */

  const onClickSetListened = async function onClickSetListenedAsync (ev) {
    ev.preventDefault()

    let parent = this
    for (let j = 0; parent.tagName !== 'A' && j < 20; j++) {
      parent = parent.parentNode
    }
    setTimeout(function showSavingLabel () {
      parent.style.cursor = 'wait'
      parent.querySelector('.bdp_check_container').innerHTML = 'Saving...'
    }, 0)

    const url = parent.href
    let albumData = await myAlbumsGetAlbum(url)
    if (!albumData) {
      albumData = await myAlbumsNewFromUrl(url, { title: this.dataset.textContent })
    }
    albumData.listened = (new Date()).toJSON()

    await myAlbumsUpdateAlbum(albumData)

    makeAlbumLinksGreat()
    parent.style.cursor = ''
  }
  const onClickRemoveListened = async function onClickRemoveListenedAsync (ev) {
    ev.preventDefault()

    let parent = this
    for (let j = 0; parent.tagName !== 'A' && j < 20; j++) {
      parent = parent.parentNode
    }
    setTimeout(function showSavingLabel () {
      parent.style.cursor = 'wait'
      parent.querySelector('.bdp_check_container').innerHTML = 'Saving...'
    }, 0)

    const url = parent.href
    const albumData = await myAlbumsGetAlbum(url)
    if (albumData) {
      albumData.listened = false
      await myAlbumsUpdateAlbum(albumData)
    }

    makeAlbumLinksGreat()
    parent.style.cursor = ''
  }
  const mouseOverLink = function onMouseOverLink (ev) {
    const bdpCheckOnlinkhoverContainer = this.querySelector('.bdp_check_onlinkhover_container')
    if (bdpCheckOnlinkhoverContainer) {
      bdpCheckOnlinkhoverContainer.classList.add('bdp_check_onlinkhover_container_shown')
    }
  }
  const mouseOutLink = function onMouseOutLink (ev) {
    const a = this
    a.dataset.iv = setTimeout(function mouseOutLinkTimeout () {
      const div = a.querySelector('.bdp_check_onlinkhover_container')
      if (div) {
        div.classList.remove('bdp_check_onlinkhover_container_shown')
        div.dataset.iv = a.dataset.iv
      }
    }, 1000)
  }
  const mouseMoveLink = function onMouseLoveLink (ev) {
    if ('iv' in this.dataset) {
      window.clearTimeout(this.dataset.iv)
    }
  }
  const mouseOverDivCheck = function onMouseOverDivCheck (ev) {
    const bdpCheckOnlinkhoverSymbol = this.querySelector('.bdp_check_onlinkhover_symbol')
    if (bdpCheckOnlinkhoverSymbol) {
      bdpCheckOnlinkhoverSymbol.innerText = NOEMOJI ? '\u2611' : '\uD83D\uDDF9'
    }
    if ('iv' in this.dataset) {
      window.clearTimeout(this.dataset.iv)
    }
  }
  const mouseOutDivCheck = function onMouseOutDivCheck (ev) {
    const bdpCheckOnlinkhoverSymbol = this.querySelector('.bdp_check_onlinkhover_symbol')
    if (bdpCheckOnlinkhoverSymbol) {
      bdpCheckOnlinkhoverSymbol.innerText = '\u2610'
    }
  }
  const divCheck = document.createElement('div')
  divCheck.setAttribute('class', 'bdp_check_container bdp_check_onlinkhover_container')
  divCheck.setAttribute('title', 'Mark as played')
  divCheck.innerHTML = '<span class="bdp_check_onlinkhover_symbol">\u2610</span> <span class="bdp_check_onlinkhover_text">Check</span>'

  const divChecked = document.createElement('div')
  divChecked.setAttribute('class', 'bdp_check_container bdp_check_onchecked_container')
  divChecked.innerHTML = '<span class="bdp_check_onchecked_text">Played</span>'

  const spanChecked = document.createElement('span')
  spanChecked.appendChild(document.createTextNode('\u2611 '))
  spanChecked.setAttribute('class', 'bdp_check_onchecked_symbol')

  const a = doc.querySelectorAll('a[href*="/album/"],.music-grid .music-grid-item a[href^="/track/"]')
  let lastKey = ''
  for (let i = 0; i < a.length; i++) {
    if (excluded.indexOf(a[i]) !== -1) {
      continue
    }

    const key = albumKey(a[i].href)
    if (key === lastKey) {
      // Skip multiple consequent links to same album
      continue
    }
    const textContent = a[i].textContent.trim()
    if (!textContent) {
      // Skip album covers only
      continue
    }
    let div
    if (a[i].dataset.textContent) {
      removeViaQuerySelector(a[i], '.bdp_check_onlinkhover_container')
      removeViaQuerySelector(a[i], '.bdp_check_onchecked_container')
      removeViaQuerySelector(a[i], '.bdp_check_onchecked_symbol')
    } else {
      a[i].dataset.textContent = textContent
      a[i].addEventListener('mouseover', mouseOverLink)
      a[i].addEventListener('mousemove', mouseMoveLink)
      a[i].addEventListener('mouseout', mouseOutLink)
    }
    if (key in myalbums && 'listened' in myalbums[key] && myalbums[key].listened) {
      div = divChecked.cloneNode(true)
      div.addEventListener('click', onClickRemoveListened)
      const date = new Date(myalbums[key].listened)
      const since = timeSince(date)
      const dateStr = dateFormater(date)
      div.title = since + ' ago\nClick to mark as NOT played'
      div.querySelector('.bdp_check_onchecked_text').appendChild(document.createTextNode(' ' + dateStr))
      const span = spanChecked.cloneNode(true)
      span.title = since + ' ago\nClick to mark as NOT played'
      span.addEventListener('click', onClickRemoveListened)

      const firstText = firstChildWithText(a[i]) || a[i].firstChild
      firstText.parentNode.insertBefore(span, firstText)
    } else {
      div = divCheck.cloneNode(true)
      div.addEventListener('mouseover', mouseOverDivCheck)
      div.addEventListener('mouseout', mouseOutDivCheck)
      div.addEventListener('click', onClickSetListened)
    }
    a[i].appendChild(div)
    lastKey = key
  }
}
function removeTheTimeHasComeToOpenThyHeartWallet () {
  if ('theTimeHasComeToOpenThyHeartWallet' in document.head.dataset) {
    return
  }
  document.head.dataset.theTimeHasComeToOpenThyHeartWallet = true
  document.head.appendChild(document.createElement('script')).innerHTML = `
    function removeViaQuerySelector (parent, selector) {
      if (typeof selector === 'undefined') {
        selector = parent
        parent = document
      }
      for (let el = parent.querySelector(selector); el; el = parent.querySelector(selector)) {
        el.remove()
      }
    }
    if (TralbumData.play_cap_data) {
      TralbumData.play_cap_data.streaming_limit = 100
      TralbumData.play_cap_data.streaming_limits_enabled = false
    }
    for(let i = 0; i < TralbumData.trackinfo.length; i++) {
      TralbumData.trackinfo[i].is_capped = false
      TralbumData.trackinfo[i].play_count = 1
    }
    /* // Alternative would be create new player
    TralbumLimits.onPlayerInit = () => true
    TralbumLimits.updatePlayCounts = () => true
    Player.init(TralbumData, AlbumPage.onPlayerInit);
    */
    Player.update(TralbumData)
    // Hide popup (not really needed, but won't hurt)
    window.setInterval(function() {
      if(document.getElementById('play-limits-dialog-cancel-btn')) {
        document.getElementById('play-limits-dialog-cancel-btn').click()
        window.setTimeout(function() {
          removeViaQuerySelector(document, '.ui-dialog.ui-widget')
          removeViaQuerySelector(document, '.ui-widget-overlay')
        }, 100)
      }
    }, 3000)
  `
}

function makeCarouselPlayerGreatAgain () {
  if (player) {
    // Hide/minimize discography player
    const closePlayerOnCarouselIv = window.setInterval(function closePlayerOnCarouselInterval () {
      if (!document.getElementById('carousel-player') || document.getElementById('carousel-player').getClientRects()[0].bottom - window.innerHeight > 0) {
        return
      }
      if (player.style.display === 'none') {
        // Put carousel player back down in normal position, because discography player is hidden forever
        document.getElementById('carousel-player').style.bottom = '0px'
        window.clearInterval(closePlayerOnCarouselIv)
      } else if (!player.style.bottom) {
        // Minimize discography player and push carousel player up above the minimized player
        musicPlayerToggleMinimize.call(player.querySelector('.minimizebutton'), null, true)
        document.getElementById('carousel-player').style.bottom = (player.clientHeight - 57) + 'px'
      }
    }, 5000)
  }

  let addListenedButtonToCarouselPlayerLast = null
  const addListenedButtonToCarouselPlayer = function listenedButtonOnCarouselPlayer () {
    const url = document.querySelector('#carousel-player .now-playing .info a') ? albumKey(document.querySelector('#carousel-player .now-playing .info a').href) : null
    if (url && addListenedButtonToCarouselPlayerLast === url) {
      return
    }
    addListenedButtonToCarouselPlayerLast = url

    removeViaQuerySelector('#carousel-player .carousellistenedstatus')

    const a = document.createElement('a')
    a.className = 'carousellistenedstatus'
    a.addEventListener('click', ev => ev.preventDefault())
    document.querySelector('#carousel-player .controls-extra').insertBefore(a, document.querySelector('#carousel-player .controls-extra').firstChild)
    a.innerHTML = '<span class="listenedstatus">Loading...</span>'
    a.href = 'https://' + url
    makeAlbumLinksGreat(a.parentNode).then(function () {
      removeViaQuerySelector(a, '.listenedstatus')
      const span = document.createElement('span')
      span.addEventListener('click', function () {
        const span = this
        span.parentNode.querySelector('.bdp_check_container').click()
        window.setTimeout(function () {
          if (span.parentNode.querySelector('.bdp_check_container').textContent.indexOf('Played') !== -1) {
            span.parentNode.innerHTML = 'Listened'
          } else {
            span.parentNode.innerHTML = 'Unplayed'
          }
        }, 3000)
      })
      if (a.querySelector('.bdp_check_onchecked_text')) {
        span.className = 'listenedstatus listened'
        span.innerHTML = '<span class="listened-symbol">✓</span> <span class="listened-label">Played</span>'
      } else {
        span.className = 'listenedstatus mark-listened'
        span.innerHTML = '<span class="mark-listened-symbol">✓</span> <span class="mark-listened-label">Mark as played</span>'
      }
      a.insertBefore(span, a.firstChild)
      a.dataset.textContent = document.querySelector('#carousel-player .now-playing .info a .artist span').textContent + ' - ' + document.querySelector('#carousel-player .now-playing .info a .title').textContent
    })
  }

  window.setInterval(function addListenedButtonToCarouselPlayerInterval () {
    if (!document.getElementById('carousel-player') || document.getElementById('carousel-player').getClientRects()[0].bottom - window.innerHeight > 0) {
      return
    }
    addListenedButtonToCarouselPlayer()
  }, 2000)

  document.head.appendChild(document.createElement('style')).innerHTML = `
  #carousel-player a.carousellistenedstatus:link,#carousel-player a.carousellistenedstatus:visited,#carousel-player a.carousellistenedstatus:hover{
    text-decoration:none;
    cursor:default
  }
  #carousel-player .listened .listened-symbol{
    color:rgb(0,220,50);
    text-shadow:1px 0px #DDD,-1px 0px #DDD,0px -1px #DDD,0px 1px #DDD
  }
  #carousel-player .mark-listened .mark-listened-symbol{
    color:#FFF;
    text-shadow:1px 0px #959595,-1px 0px #959595,0px -1px #959595,0px 1px #959595
  }
  #carousel-player .mark-listened:hover .mark-listened-symbol{
    text-shadow:1px 0px #0AF,-1px 0px #0AF,0px -1px #0AF,0px 1px #0AF
  }
  `
}

async function addListenedButtonToCollectControls () {
  const lastLi = document.querySelector('.share-panel-wrapper-desktop ul li')
  if (!lastLi) {
    window.setTimeout(addListenedButtonToCollectControls, 300)
    return
  }

  const checkSymbol = NOEMOJI ? '✓' : '✔'

  const myalbums = JSON.parse(await GM.getValue('myalbums', '{}'))

  const key = albumKey(document.location.href)
  const listened = key in myalbums && 'listened' in myalbums[key] && myalbums[key].listened

  const onClickSetListened = async function onClickSetListenedAsync (ev) {
    ev.preventDefault()

    let parent = this
    for (let j = 0; parent.tagName !== 'LI' && j < 20; j++) {
      parent = parent.parentNode
    }
    setTimeout(function showSavingLabel () { parent.style.cursor = 'wait'; parent.innerHTML = 'Saving...' }, 0)

    const url = document.location.href
    let albumData = await myAlbumsGetAlbum(url)
    if (!albumData) {
      albumData = await myAlbumsNewFromUrl(url, { title: this.dataset.textContent })
    }
    albumData.listened = (new Date()).toJSON()

    await myAlbumsUpdateAlbum(albumData)

    addListenedButtonToCollectControls()
  }
  const onClickRemoveListened = async function onClickRemoveListenedAsync (ev) {
    ev.preventDefault()

    let parent = this
    for (let j = 0; parent.tagName !== 'LI' && j < 20; j++) {
      parent = parent.parentNode
    }
    setTimeout(function showSavingLabel () {
      parent.style.cursor = 'wait'
      parent.innerHTML = 'Saving...'
    }, 0)

    const url = document.location.href
    const albumData = await myAlbumsGetAlbum(url)
    if (albumData) {
      albumData.listened = false
      await myAlbumsUpdateAlbum(albumData)
    }

    addListenedButtonToCollectControls()
  }

  removeViaQuerySelector('#discographyplayer_sharepanel')

  const li = lastLi.parentNode.appendChild(document.createElement('li'))
  const button = li.appendChild(document.createElement('span'))
  const icon = button.appendChild(document.createElement('span'))
  const a = button.appendChild(document.createElement('a'))

  li.setAttribute('id', 'discographyplayer_sharepanel')
  a.addEventListener('click', (ev) => ev.preventDefault())
  icon.className = 'sharepanelchecksymbol'

  if (listened) {
    const date = new Date(listened)
    const since = timeSince(date)

    button.title = since + '\nClick to mark as NOT played'
    button.addEventListener('click', onClickRemoveListened)

    icon.style.color = 'rgb(0,220,50)'
    icon.style.textShadow = '1px 0px #DDD,-1px 0px #DDD,0px -1px #DDD,0px 1px #DDD'
    icon.style.paddingRight = '5px'
    icon.appendChild(document.createTextNode(checkSymbol))

    a.appendChild(document.createTextNode('Played'))

    li.appendChild(document.createTextNode(' - '))

    const link = li.appendChild(document.createElement('span'))
    const viewLink = link.appendChild(document.createElement('a'))
    viewLink.href = findUserProfileUrl() + '#listened-tab'
    viewLink.title = 'View list of played albums'
    viewLink.appendChild(document.createTextNode('view'))
  } else {
    button.title = 'Click to mark as played'
    button.addEventListener('click', onClickSetListened)
    try {
      icon.style.color = window.getComputedStyle(document.getElementById('pgBd')).backgroundColor
      icon.style.textShadow = '1px 0px #959595,-1px 0px #959595,0px -1px #959595,0px 1px #959595'
      icon.style.paddingRight = '5px'
    } catch (e) {
      icon.style.color = '#959595'
      icon.style.fontWeight = 700
    }
    icon.appendChild(document.createTextNode(checkSymbol))

    a.appendChild(document.createTextNode('Unplayed'))
  }
}

function makeListenedListTabLink () {
  const grid = document.getElementById('grids').appendChild(document.createElement('div'))
  grid.className = 'grid'
  grid.id = 'listened-grid'

  const inner = grid.appendChild(document.createElement('div'))
  inner.className = 'inner'
  inner.innerHTML = 'Loading...'

  const li = document.querySelector('ol#grid-tabs').appendChild(document.createElement('li'))
  li.id = 'listenedlisttablink'
  li.dataset.tab = 'listened'
  li.setAttribute('data-grid-id', 'listened-grid')
  const span = li.appendChild(document.createElement('span'))
  span.className = 'tab-title'
  span.appendChild(document.createTextNode('played'))

  const count = span.appendChild(document.createElement('span'))
  count.className = 'count'
  GM.getValue('myalbums', '{}').then(function myalbumsLoaded (str) {
    let n = 0
    const myalbums = JSON.parse(str)
    for (const key in myalbums) {
      if (myalbums[key].listened) {
        n++
      }
    }
    count.appendChild(document.createTextNode(n))
  })
  li.addEventListener('click', showListenedListTab)

  return li
}

async function showListenedListTab () {
  if (document.getElementById('owner-controls')) document.getElementById('owner-controls').style.display = 'none'
  if (document.getElementById('wishlist-controls')) document.getElementById('wishlist-controls').style.display = 'none'

  const grid = document.getElementById('listened-grid')
  const gridActive = document.querySelector('#grids .grid.active')
  if (gridActive && gridActive !== grid) {
    gridActive.classList.remove('active')
  }
  grid.classList.add('active')

  const tabLink = document.getElementById('listenedlisttablink')
  const tabLinkActive = document.querySelector('#grid-tab li.active')
  if (tabLinkActive && tabLinkActive !== tabLink) {
    tabLinkActive.classList.remove('active')
  }
  tabLink.classList.add('active')

  if (grid.querySelector('.collection-items')) {
    return
  }

  grid.innerHTML = ''

  const collectionItems = grid.appendChild(document.createElement('div'))
  collectionItems.className = 'collection-items'

  const collectionGrid = collectionItems.appendChild(document.createElement('ol'))
  collectionGrid.className = 'collection-grid'

  const myalbums = JSON.parse(await GM.getValue('myalbums', '{}'))

  for (const key in myalbums) {
    const albumData = myalbums[key]

    if (!albumData.listened) {
      continue
    }

    const artist = albumData.artist || 'Unkown artist'
    const title = albumData.title || 'Unkown title'
    const albumCover = albumData.albumCover || 'https://bandcamp.com/img/0.gif'
    const url = key
    const date = new Date(albumData.listened)
    const since = timeSince(date)
    const dateStr = dateFormater(date)
    let releaseDate
    if ('releaseDate' in albumData) {
      releaseDate = dateFormaterRelease(new Date(albumData.releaseDate))
    } else {
      releaseDate = 'Unknown'
    }

    const li = collectionGrid.appendChild(document.createElement('li'))
    li.className = 'collection-item-container'
    li.innerHTML = `
      <div class="collection-item-gallery-container">
        <span class="bc-ui2 collect-item-icon-alt"></span>
        <div class="collection-item-art-container">
          <img class="collection-item-art" alt="" src="${albumCover}">
        </div>
        <div class="collection-title-details">
          <a target="_blank" href="https://${url}" class="item-link">
            <div class="collection-item-title">${title}</div>
            <div class="collection-item-artist">by ${artist}</div>
          </a>
        </div>
        <div class="collection-item-fav-track">
          <span title="${since} ago" class="favoriteTrackLabel">played</span>
          <div title="${since} ago">
            <span class="fav-track-link">${dateStr}</span>
          </div>
          <span class="favoriteTrackLabel">released</span>
          <div>
            <span class="fav-track-link">${releaseDate}</span>
          </div>
        </div>
      </div>
    `
  }
}

function addVolumeBarToAlbumPage () {
  // Do not add if one of these scripts already added a volume bar
  // https://openuserjs.org/scripts/cuzi/Bandcamp_Volume_Bar
  // https://openuserjs.org/scripts/Mranth0ny62/Bandcamp_Volume_Bar
  // https://openuserjs.org/scripts/ArtificialInput/Bandcamp_Volume_Bar
  // https://greasyfork.org/en/scripts/11047-bandcamp-volume-bar/
  // https://greasyfork.org/en/scripts/38012-bandcamp-volume-bar/
  if (document.querySelector('.volumeControl')) {
    return false
  }

  document.head.appendChild(document.createElement('style')).innerHTML = `
    /* Hide if inline_player is hidden */
    .hidden .volumeButton,.hidden .volumeControl,.hidden .volumeLabel{
      display:none
    }

    .volumeButton {
      display: inline-block;
      user-select:none;
      background: #fff;
      border: 1px solid #d9d9d9;
      border-radius: 2px;
      cursor: pointer;
      min-height: 50px;
      min-width: 54px;
      text-align:center;
      margin-top:5px;
    }

    .volumeSymbol {
      margin-top: 16px;
      font-size: 30px;
      color:#222;
      font-weight:bolder;
      transform: rotate(-90deg);
      text-shadow: rgb(255, 255, 255) 0px 0px 0px;
      transition: text-shadow linear 300ms;
    }
    .volumeControl {
      display:inline-block;
      user-select:none;
      top:5px;
    }
    .volumeLabel {
      display:inline-block;
    }
  `

  const playbutton = document.querySelector('#trackInfoInner .playbutton')
  const volumeButton = playbutton.cloneNode(true)
  document.querySelector('#trackInfoInner .inline_player').appendChild(volumeButton)
  volumeButton.classList.replace('playbutton', 'volumeButton')
  volumeButton.style.width = playbutton.clientWidth + 'px'
  const volumeSymbol = volumeButton.appendChild(document.createElement('div'))
  volumeSymbol.className = 'volumeSymbol'
  volumeSymbol.appendChild(document.createTextNode(CHROME ? '\uD83D\uDD5B' : '\u23F2'))

  const progbar = document.querySelector('#trackInfoInner .progbar_cell .progbar')
  const volumeBar = progbar.cloneNode(true)
  document.querySelector('#trackInfoInner .inline_player').appendChild(volumeBar)
  volumeBar.classList.add('volumeControl')
  volumeBar.style.width = Math.max(200, progbar.clientWidth) + 'px'
  const thumb = volumeBar.querySelector('.thumb')
  thumb.setAttribute('id', 'deluxe_thumb')
  const progbarFill = volumeBar.querySelector('.progbar_fill')

  const volumeLabel = document.createElement('div')
  document.querySelector('#trackInfoInner .inline_player').appendChild(volumeLabel)
  volumeLabel.classList.add('volumeLabel')

  let dragging = false
  let dragPos
  const width100 = volumeBar.clientWidth - (thumb.clientWidth + 2) // 2px border
  const rot0 = CHROME ? -180 : -90
  const rot100 = CHROME ? 350 : 265 - rot0
  const blue0 = 180
  const blue100 = 75
  const green0 = 90
  const green100 = 100
  const audioAlbumPage = document.querySelector('audio')
  addLogVolume(audioAlbumPage)
  const volumeBarPos = volumeBar.getBoundingClientRect().left

  const displayVolume = function updateDisplayVolume () {
    const level = audioAlbumPage.logVolume
    volumeLabel.innerHTML = parseInt(level * 100.0) + '%'
    thumb.style.left = (width100 * level) + 'px'
    progbarFill.style.width = parseInt(level * 100.0) + '%'
    volumeSymbol.style.transform = 'rotate(' + ((level * rot100) + rot0) + 'deg)'
    if (level > 0.005) {
      volumeSymbol.style.textShadow = 'rgb(0, ' + ((level * green100) + green0) + ', ' + ((level * blue100) + blue0) + ') 0px 0px 4px'
      volumeSymbol.style.color = '#03a'
    } else {
      volumeSymbol.style.textShadow = 'rgb(255, 255, 255) 0px 0px 0px'
      volumeSymbol.style.color = '#222'
    }
  }

  thumb.addEventListener('mousedown', function thumbMouseDown (ev) {
    if (ev.button === 0) {
      dragging = true
      dragPos = ev.offsetX
    }
  })
  volumeBar.addEventListener('mouseup', function thumbMouseUp (ev) {
    if (ev.button !== 0) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()

    if (!dragging) {
      // Click on volume bar without dragging:
      audioAlbumPage.muted = false
      audioAlbumPage.logVolume = Math.max(0.0, Math.min(1.0, (ev.pageX - volumeBarPos) / width100))
      displayVolume()
    }
    dragging = false
    GM.setValue('volume', audioAlbumPage.logVolume)
  })
  document.addEventListener('mouseup', function documentMouseUp (ev) {
    if (ev.button === 0 && dragging) {
      dragging = false
      ev.preventDefault()
      ev.stopPropagation()
      GM.setValue('volume', audioAlbumPage.logVolume)
    }
  })
  document.addEventListener('mousemove', function documentMouseMove (ev) {
    if (ev.button === 0 && dragging) {
      ev.preventDefault()
      ev.stopPropagation()
      audioAlbumPage.muted = false
      audioAlbumPage.logVolume = Math.max(0.0, Math.min(1.0, ((ev.pageX - volumeBarPos) - dragPos) / width100))
      displayVolume()
    }
  })
  const onWheel = function onMouseWheel (ev) {
    ev.preventDefault()
    const direction = Math.min(Math.max(-1.0, ev.deltaY), 1.0)
    audioAlbumPage.logVolume = Math.min(Math.max(0.0, audioAlbumPage.logVolume - 0.05 * direction), 1.0)
    displayVolume()
    GM.setValue('volume', audioAlbumPage.logVolume)
  }
  volumeButton.addEventListener('wheel', onWheel, false)
  volumeBar.addEventListener('wheel', onWheel, false)
  volumeButton.addEventListener('click', function onVolumeButtonClick (ev) {
    if (audioAlbumPage.logVolume < 0.01) {
      if ('lastvolume' in audioAlbumPage.dataset && audioAlbumPage.dataset.lastvolume) {
        audioAlbumPage.logVolume = audioAlbumPage.dataset.lastvolume
        GM.setValue('volume', audioAlbumPage.logVolume)
      } else {
        audioAlbumPage.logVolume = 1.0
      }
    } else {
      audioAlbumPage.dataset.lastvolume = audioAlbumPage.logVolume
      audioAlbumPage.logVolume = 0.0
    }
    displayVolume()
  })

  displayVolume()

  window.clearInterval(ivRestoreVolume)
}

function clickAddToWishlist () {
  const wishButton = document.querySelector('#collect-item>*')
  if (!wishButton) {
    window.setTimeout(clickAddToWishlist, 300)
    return
  }
  wishButton.click()
  if (document.querySelector('#collection-main a')) {
    // if logged in, the click should be successful, so try to close the window
    window.setTimeout(window.close, 1000)
  }
}

function addReleaseDateButton () {
  const meta = document.querySelector('*[itemprop="datePublished"]')
  if (!meta || !meta.content) {
    return // no release date found
  }
  const TralbumData = unsafeWindow.TralbumData
  const now = new Date()
  const releaseDate = new Date(TralbumData.current.release_date)
  const days = parseInt(Math.ceil((releaseDate - now) / (1000 * 60 * 60 * 24)))
  if (releaseDate < now) {
    return // Release date is in the past
  }
  const key = albumKey(TralbumData.url)

  document.head.appendChild(document.createElement('style')).innerHTML = `
  .releaseReminderButton {
    font-size:13px;
    font-weight:700;
    cursor:pointer;
    transition: border 500ms, padding 500ms
  }
  .releaseReminderButton.active {
    border-radius:5px;
    padding:0px 5px;
    border:#3fb32f66 solid 2px
  }
  .releaseReminderButton:hover .releaseLabel {
    text-decoration:underline
  }
  `

  const div = document.querySelector('.share-collect-controls').appendChild(document.createElement('div'))
  div.style = 'margin-top:4px'
  const span = div.appendChild(document.createElement('span'))
  span.className = 'custom-link-color releaseReminderButton'
  span.title = 'Releases ' + dateFormaterRelease(releaseDate)
  const daysStr = days === 1 ? 'tomorrow' : (`in ${days} days`)
  span.innerHTML = `<span>\u23F0</span> <span class="releaseLabel">Notify <time datetime="${releaseDate.toISOString()}">${daysStr}</time></span>`
  span.addEventListener('click', (ev) => toggleReleaseReminder(ev, span))

  GM.getValue('releasereminder', '{}').then(function (str) {
    const releaseReminderData = JSON.parse(str)
    if (key in releaseReminderData) {
      span.classList.add('active')
      span.innerHTML = `<span>\u23F0</span> <span class="releaseLabel">Reminder set (<time datetime="${releaseDate.toISOString()}">${daysStr}</time>)</span>`
    }
  })
}

async function toggleReleaseReminder (ev, span) {
  const TralbumData = unsafeWindow.TralbumData
  const key = albumKey(TralbumData.url)
  const releaseReminderData = JSON.parse(await GM.getValue('releasereminder', '{}'))
  if (key in releaseReminderData) {
    delete releaseReminderData[key]
  } else {
    releaseReminderData[key] = {
      albumCover: `https://f4.bcbits.com/img/a${TralbumData.art_id}_2.jpg`,
      releaseDate: TralbumData.current.release_date,
      artist: TralbumData.artist,
      title: TralbumData.current.title
    }
  }
  await GM.setValue('releasereminder', JSON.stringify(releaseReminderData))

  if (span) {
    const releaseDate = new Date(TralbumData.current.release_date)
    const now = new Date()
    const days = parseInt(Math.ceil((releaseDate - now) / (1000 * 60 * 60 * 24)))
    const daysStr = days === 1 ? 'tomorrow' : (`in ${days} days`)
    if (key in releaseReminderData) {
      span.classList.add('active')
      span.innerHTML = `<span>\u23F0</span> <span class="releaseLabel">Reminder set (<time datetime="${releaseDate.toISOString()}">${daysStr}</time>)</span>`
    } else {
      span.classList.remove('active')
      span.innerHTML = `<span>\u23F0</span> <span class="releaseLabel">Notify <time datetime="${releaseDate.toISOString()}">${daysStr}</time></span>`
    }
  }
}
async function removeReleaseReminder (ev) {
  ev.preventDefault()
  const key = this.parentNode.dataset.key
  const releaseReminderData = JSON.parse(await GM.getValue('releasereminder', '{}'))
  if (key in releaseReminderData) {
    delete releaseReminderData[key]
    await GM.setValue('releasereminder', JSON.stringify(releaseReminderData))
  }
  this.parentNode.remove()
}
function maximizePastReleases () {
  document.getElementById('pastreleases').style.opacity = 0.0
  window.setTimeout(() => showPastReleases(null, true), 500)
  document.getElementById('pastreleases').removeEventListener('click', maximizePastReleases)
}
async function showPastReleases (ev, forceShow) {
  let hideDate = await GM.getValue('pastreleaseshidden', false)
  const releaseReminderData = JSON.parse(await GM.getValue('releasereminder', '{}'))
  const releases = []
  let pastReleasesCounter = 0
  const now = new Date()
  now.setHours(23)
  now.setMinutes(59)
  for (const key in releaseReminderData) {
    releaseReminderData[key].key = key
    releaseReminderData[key].date = new Date(releaseReminderData[key].releaseDate)
    releaseReminderData[key].past = now >= releaseReminderData[key].date
    if (releaseReminderData[key].past) {
      pastReleasesCounter++
    }
    releases.push(releaseReminderData[key])
  }
  releases.sort((a, b) => b.date - a.date)

  if (releases.length === 0 || pastReleasesCounter === 0) {
    return
  }

  if (!document.getElementById('pastreleases')) {
    document.head.appendChild(document.createElement('style')).innerHTML = `
    #pastreleases {
      position:fixed;
      bottom:1%;
      left:10px;
      background:#d5dce4;
      color:#033162;
      font-size:10pt;
      border:1px solid #033162;
      z-index:200;
      opacity:0.0;
      transition: opacity 700ms;
      overflow:auto
    }
    #pastreleases .tablediv {
      display: table;
      position:relative;
    }
    #pastreleases .entry,#pastreleases .header {
      display:table-row
    }
    #pastreleases .entry > *,#pastreleases .header > * {
      display:table-cell;
      line-height:21pt
    }
    #pastreleases .upcoming {
      cursor:pointer;
      font-size:x-small
    }
    #pastreleases .controls {
      cursor:pointer;
      position:absolute;
      top:0px;
      right:1px;
      line-height:11pt
    }
    #pastreleases .entry:link {
      position:relative;
      border-top:1px solid #033162;
      color:#033162;
      text-decoration:none
    }
    #pastreleases .entry:nth-child(odd) {
      background:#c5ccd4
    }
    #pastreleases .entry:hover,#pastreleases .entry:visited {
      color:#033162;
      text-decoration:none
    }
    #pastreleases .entry.future {
      display:none;
      background:#9fc2ea;
    }
    #pastreleases .entry.future:nth-child(odd) {
      background:#8fc2e1;
    }
    #pastreleases .entry .image {
      background-size:contain;
      width:21pt;
      height:21pt
    }
    #pastreleases .entry:hover .image {
      display:block;
      position:fixed;
      bottom:10px;
      top:50%;
      left:50%;
      margin-right:-50%;
      transform:translate(-50%, -50%);
      width:350px;
      height:350px;
      background:black;
      border:5px solid white;
    }
    #pastreleases .entry time {
      padding-right: 2px
    }
    #pastreleases .entry .title {
      padding-left: 2px;
      border-left: 1px solid #47a2bd
    }
    #pastreleases .remove {
      font-family:sans-serif;
      color:#97174e;
      font-size: small;
      padding-right:3px
    }
    `
  }
  const div = document.body.appendChild(document.getElementById('pastreleases') || document.createElement('div'))
  div.setAttribute('id', 'pastreleases')
  div.style.maxHeight = (document.documentElement.clientHeight - 50) + 'px'
  div.style.maxWidth = (document.documentElement.clientWidth - 100) + 'px'
  window.setTimeout(function () {
    div.style.opacity = 1.0
  }, 200)
  div.innerHTML = ''

  const table = div.appendChild(document.createElement('div'))
  table.classList.add('tablediv')

  const firstRow = table.appendChild(document.createElement('div'))
  firstRow.classList.add('header')
  firstRow.appendChild(document.createTextNode('\u23F0'))
  firstRow.appendChild(document.createElement('span'))

  if (!forceShow && hideDate && !isNaN(hideDate = new Date(hideDate)) && (new Date() - hideDate) < 1000 * 60 * 60) {
    firstRow.appendChild(document.createTextNode(`${pastReleasesCounter} release` + (pastReleasesCounter === 1 ? '' : 's')))
    table.addEventListener('click', maximizePastReleases)
    return
  } else {
    GM.setValue('pastreleaseshidden', '')
  }

  const upcoming = firstRow.appendChild(document.createElement('span'))
  if (releases.length !== pastReleasesCounter) {
    upcoming.appendChild(document.createTextNode(' Show upcoming'))
    upcoming.classList.add('upcoming')
    upcoming.addEventListener('click', function () {
      document.querySelectorAll('#pastreleases .future').forEach(function (el) {
        el.style.display = 'table-row'
      })
      this.remove()
    })
  }

  const controls = firstRow.appendChild(document.createElement('span'))
  controls.classList.add('controls')

  const refresh = controls.appendChild(document.createElement('span'))
  refresh.setAttribute('title', 'Update')
  refresh.addEventListener('click', function () {
    document.getElementById('pastreleases').style.opacity = 0.0
    window.setTimeout(() => showPastReleases(null, true), 1200)
  })
  refresh.appendChild(document.createTextNode(NOEMOJI ? 'Refresh' : '⟳'))

  const close = controls.appendChild(document.createElement('span'))
  close.setAttribute('title', 'Hide')
  close.addEventListener('click', function () {
    GM.setValue('pastreleaseshidden', new Date().toJSON())
    document.getElementById('pastreleases').style.opacity = 0.0
    window.setTimeout(function () {
      document.getElementById('pastreleases').remove()
    }, 700)
  })
  close.appendChild(document.createTextNode('X'))

  releases.forEach(function (release) {
    const days = parseInt(Math.ceil((release.date - now) / (1000 * 60 * 60 * 24)))
    const daysStr = days === 1 ? 'tomorrow' : (`in ${days} days`)
    let title = `${release.artist} - ${release.title}`

    const entry = table.appendChild(document.createElement('a'))
    entry.setAttribute('title', title)
    entry.dataset.key = release.key
    entry.classList.add('entry')
    entry.classList.add(release.past ? 'past' : 'future')
    entry.setAttribute('href', document.location.protocol + '//' + release.key)
    entry.setAttribute('target', '_blank')

    const removeButton = entry.appendChild(document.createElement('span'))
    removeButton.setAttribute('title', 'Remove album')
    removeButton.classList.add('remove')
    removeButton.appendChild(document.createTextNode(NOEMOJI ? 'X' : '╳'))
    removeButton.addEventListener('click', removeReleaseReminder)

    const time = entry.appendChild(document.createElement('time'))
    time.setAttribute('datetime', release.date.toISOString())
    time.setAttribute('title', 'Releases ' + dateFormaterRelease(release.date))
    if (release.past) {
      time.appendChild(document.createTextNode(dateFormaterNumeric(release.date)))
    } else {
      time.appendChild(document.createTextNode(daysStr))
    }

    const span = entry.appendChild(document.createElement('span'))
    span.classList.add('title')
    title = title.length < 60 ? title : (title.substr(0, 57) + '…')
    span.appendChild(document.createTextNode(' ' + title))

    const image = entry.appendChild(document.createElement('div'))
    image.classList.add('image')
    image.style.backgroundRepeat = 'no-repeat'
    image.style.backgroundSize = 'contain'
    image.style.backgroundImage = `url(${release.albumCover})`
  })
}

function mainMenu (startBackup) {
  document.head.appendChild(document.createElement('style')).innerHTML = `
    .deluxemenu {
      position:fixed;
      height:auto;
      overflow:auto;
      top:20px;
      left:20px;
      z-index:200;
      padding:5px;
      transition: left 1s;
      border:2px solid black;
      border-radius:10px;
      color:black;
      background:white;
    }
    .deluxemenu input{
      box-shadow: 2px 2px 5px #5555;
      transition: box-shadow 500ms;
    }
  `

  if (startBackup === true) {
    exportMenu()
    return
  }

  if (document.querySelector('.deluxemenu')) {
    return
  }

  // Blur background
  if (document.getElementById('centerWrapper')) { document.getElementById('centerWrapper').style.filter = 'blur(4px)' }

  const main = document.body.appendChild(document.createElement('div'))
  main.className = 'deluxemenu'
  main.innerHTML = `<h2>Bandcamp script (Deluxe Edition)</h2>
  Source code license: <a href="https://github.com/cvzi/Bandcamp-script-deluxe-edition/blob/master/LICENSE">MIT</a><br>
  Support: <a href="https://github.com/cvzi/Bandcamp-script-deluxe-edition">github.com/cvzi/Bandcamp-script-deluxe-edition</a><br>
  OUJS.org: <a href="https://openuserjs.org/scripts/cuzi/Bandcamp_script_(Deluxe_Edition)">openuserjs.org/scripts/cuzi/Bandcamp_script_(Deluxe_Edition)</a><br>
  Libraries used:<br>
   * <a href="https://json5.org/">JSON5 - JSON for Humans</a> (MIT license)
   <h3>Options</h3>
  `

  window.setTimeout(function moveMenuIntoView () {
    main.style.maxHeight = (document.documentElement.clientHeight - 40) + 'px'
    main.style.maxWidth = (document.documentElement.clientWidth - 40) + 'px'
    main.style.left = Math.max(20, 0.5 * (document.body.clientWidth - main.clientWidth)) + 'px'
  }, 0)

  Promise.all([
    GM.getValue('volume', '0.7'),
    GM.getValue('myalbums', '{}'),
    GM.getValue('tralbumdata', '{}'),
    GM.getValue('enabledFeatures', false),
    GM.getValue('markasplayedThreshold', '10s')
  ]).then(function allPromisesLoaded (values) {
    // let volume = parseFloat(values[0])
    // volume = Number.isNaN(volume) ? 0.7 : volume
    const myalbums = JSON.parse(values[1])
    const tralbumdata = JSON.parse(values[2])
    getEnabledFeatures(values[3])
    const markasplayedThreshold = values[4]

    const checkboxOnChange = async function onCheckboxChange () {
      const input = this
      getEnabledFeatures(await GM.getValue('enabledFeatures', false))
      allFeatures[input.name].enabled = input.checked
      await GM.setValue('enabledFeatures', JSON.stringify(allFeatures))
      input.style.boxShadow = '2px 2px 5px #0a0f'
      window.setTimeout(function resetBoxShadowTimeout () {
        input.style.boxShadow = ''
      }, 3000)
    }

    const thresholdOnChange = async function onThresholdChange () {
      const input = this
      let value = input.value.trim()
      const m = value.match(/^(\d+)(s|%)$/)
      if (m && parseInt(m[1]) >= 0 && (m[2] === 's' || parseInt(m[1]) <= 100)) {
        value = m[1] + m[2]
      } else if (value.match(/^\d+$/) && parseInt(value.split('\n')[0]) >= 0) {
        value = value.split('\n')[0] + 's'
      } else {
        window.alert('Format does not match!\nChoose either a time in seconds e.g. 10s or a percentage e.g. 50%')
        return
      }

      await GM.setValue('markasplayedThreshold', value)
      input.value = value
      input.style.boxShadow = '2px 2px 5px #0a0f'
      window.setTimeout(function resetBoxShadowTimeout () {
        input.style.boxShadow = ''
      }, 3000)
    }

    for (const feature in allFeatures) {
      const div = main.appendChild(document.createElement('div'))
      const checkbox = div.appendChild(document.createElement('input'))
      checkbox.type = 'checkbox'
      checkbox.id = 'feature_' + feature
      checkbox.name = feature
      checkbox.checked = allFeatures[feature].enabled
      const label = div.appendChild(document.createElement('label'))
      label.setAttribute('for', 'feature_' + feature)
      label.innerHTML = allFeatures[feature].name
      checkbox.addEventListener('change', checkboxOnChange)

      if (feature === 'markasplayedAuto') {
        main.appendChild(document.createTextNode(' '))
        const inputThreshold = div.appendChild(document.createElement('input'))
        inputThreshold.type = 'text'
        inputThreshold.value = markasplayedThreshold
        inputThreshold.size = 3
        inputThreshold.title = 'For example: 10s or 50%'
        inputThreshold.id = 'feature_' + feature + '_threshold'
        div.appendChild(document.createTextNode(' '))
        const label = div.appendChild(document.createElement('label'))
        label.setAttribute('for', 'feature_' + feature + '_threshold')
        label.innerHTML = 'seconds or percentage.'
        inputThreshold.addEventListener('change', thresholdOnChange)
      }
    }

    // Bottom buttons
    main.appendChild(document.createElement('br'))
    main.appendChild(document.createElement('br'))
    const buttons = main.appendChild(document.createElement('div'))

    const closeButton = buttons.appendChild(document.createElement('button'))
    closeButton.appendChild(document.createTextNode('Close'))
    closeButton.style.color = 'black'
    closeButton.addEventListener('click', function onCloseButtonClick () {
      document.querySelector('.deluxemenu').remove()
      // Un-blur background
      if (document.getElementById('centerWrapper')) {
        document.getElementById('centerWrapper').style.filter = ''
      }
    })

    const bytes = metricPrefix(JSON.stringify(tralbumdata).length - 2, 1, 1024) + 'Bytes'
    const clearCacheButton = buttons.appendChild(document.createElement('button'))
    clearCacheButton.appendChild(document.createTextNode('Clear cache (' + bytes + ')'))
    clearCacheButton.style.color = 'black'
    clearCacheButton.addEventListener('click', function onClearCacheButtonClick () {
      GM.setValue('tralbumdata', '{}').then(function showClearedLabel () {
        clearCacheButton.innerHTML = 'Cleared'
      })
    })

    let myalbumsLength = 0
    for (const key in myalbums) {
      if (myalbums[key].listened) {
        myalbumsLength++
      }
    }
    const exportButton = buttons.appendChild(document.createElement('button'))
    exportButton.appendChild(document.createTextNode('Export played albums (' + myalbumsLength + ')'))
    exportButton.style.color = 'black'
    exportButton.addEventListener('click', function onExportButtonClick () {
      document.querySelector('.deluxemenu').remove()
      exportMenu()
    })
  })
  window.setTimeout(function moveMenuIntoView () {
    main.style.maxHeight = (document.documentElement.clientHeight - 40) + 'px'
    main.style.maxWidth = (document.documentElement.clientWidth - 40) + 'px'
    main.style.left = Math.max(20, 0.5 * (document.body.clientWidth - main.clientWidth)) + 'px'
  }, 0)
}

function exportMenu (showClearButton) {
  document.head.appendChild(document.createElement('style')).innerHTML = `
    .deluxeexportmenu table {
    }

    .deluxeexportmenu table tr>td {
      color:black
    }
    .deluxeexportmenu table tr>td:nth-child(3) {
      color:silver
    }
    .deluxeexportmenu textarea.animated{
      box-shadow: 2px 2px 5px #5555;
      transition: box-shadow 500ms;
    }
    .deluxeexportmenu .drophint {
      position:absolute;
      top:10%;
      left:30%;
      color:#0097ff;
      font-size:3em;
      display:none;
    }
  `

  // Blur background
  if (document.getElementById('centerWrapper')) { document.getElementById('centerWrapper').style.filter = 'blur(4px)' }

  const main = document.body.appendChild(document.createElement('div'))
  main.className = 'deluxeexportmenu deluxemenu'
  main.innerHTML = `<h2>Export played albums</h2>
  <h1 class="drophint">Drop to restore from backup</h1>
  Available fields per album:<br>
  <table>
    <tr>
      <td>%artist%</td>
      <td>Artist name</td>
      <td>Jay-X</td>
    </tr>
    <tr>
      <td>%title%</td>
      <td>Song title</td>
      <td>Classic song</td>
    </tr>
    <tr>
      <td>%cover%</td>
      <td>Cover image url</td>
      <td>https://f4.bcbits.com/img/a2588527047_2.jpg</td>
    </tr>
    <tr>
      <td>%url%</td>
      <td>Album url</td>
      <td>petrolgirls.bandcamp.com/album/cut-stitch</td>
    </tr>
    <tr>
      <td>%releaseDate% / %releaseUnix% / %releaseTimestamp%</td>
      <td>Release date</td>
      <td>2019-02-07T14:01:59.100Z / 1549548119 / 1549548119100</td>
    </tr>
    <tr>
      <td>%listenedDate% / %listenedUnix% / %listenedTimestamp%</td>
      <td>Played/Listened date</td>
      <td>2019-02-07T02:17:21.315Z / 1549505841 / 1549505841315</td>
    </tr>
    <tr>
      <td>%releaseY% / %releaseYYYY%</td>
      <td>Release: Year</td>
      <td>19 / 2019</td>
    </tr>
    <tr>
      <td>%releaseM% / %releaseMM% / %releaseMon% / %releaseMonth%</td>
      <td>Release: Month</td>
      <td>2 / 02 / Feb / February</td>
    </tr>
    <tr>
      <td>%releaseD% / %releaseDD%</td>
      <td>Release: Day of month</td>
      <td>7 / 07</td>
    </tr>
    <tr>
      <td>%releaseDay%</td>
      <td>Release: Day of week</td>
      <td>Friday</td>
    </tr>
    <tr>
      <td>%listenedY% / %listenedYYYY%</td>
      <td>Played: Year</td>
      <td>19 / 2019</td>
    </tr>
    <tr>
      <td>%listenedM% / %listenedMM% / %listenedMon% / %listenedMonth%</td>
      <td>Played: Month</td>
      <td>2 / 02 / Feb / February</td>
    </tr>
    <tr>
      <td>%listenedD% / %listenedDD%</td>
      <td>Played: Day of month</td>
      <td>7 / 07</td>
    </tr>
    <tr>
      <td>%listenedDay%</td>
      <td>Played: Day of week</td>
      <td>Friday</td>
    </tr>

  </table>
  `
  const drophint = main.querySelector('.drophint')

  window.setTimeout(function moveMenuIntoView () {
    main.style.maxHeight = (document.documentElement.clientHeight - 40) + 'px'
    main.style.maxWidth = (document.documentElement.clientWidth - 40) + 'px'
    main.style.left = Math.max(20, 0.5 * (document.body.clientWidth - main.clientWidth)) + 'px'
  }, 0)

  GM.getValue('myalbums', '{}').then(function myalbumsLoaded (myalbumsStr) {
    const myalbums = JSON.parse(myalbumsStr)
    const listenedAlbums = []
    for (const key in myalbums) {
      if (myalbums[key].listened) {
        listenedAlbums.push(myalbums[key])
      }
    }
    main.querySelector('h2').appendChild(document.createTextNode(' (' + listenedAlbums.length + ' records)'))

    let format = '%artist% - %title%'

    const formatAlbum = function formatAlbumStr (format, myAlbum) {
      const releaseDate = new Date(myAlbum.releaseDate)
      const listenedDate = new Date(myAlbum.listened)
      const fields = {
        '%artist%': () => myAlbum.artist,
        '%title%': () => myAlbum.title,
        '%cover%': () => myAlbum.albumCover,
        '%url%': () => myAlbum.url,
        '%releaseDate%': () => releaseDate.toISOString(),
        '%listenedDate%': () => listenedDate.toISOString(),
        '%releaseUnix%': () => parseInt(releaseDate.getTime() / 1000),
        '%listenedUnix%': () => parseInt(listenedDate.getTime() / 1000),
        '%releaseTimestamp%': () => releaseDate.getTime(),
        '%listenedTimestamp%': () => listenedDate.getTime(),
        '%releaseY%': () => releaseDate.getFullYear().toString().substring(2),
        '%releaseYYYY%': () => releaseDate.getFullYear(),
        '%releaseM%': () => releaseDate.getMonth() + 1,
        '%releaseMM%': () => padd(releaseDate.getMonth() + 1, 2, '0'),
        '%releaseMon%': () => releaseDate.toLocaleString(undefined, { month: 'short' }),
        '%releaseMonth%': () => releaseDate.toLocaleString(undefined, { month: 'long' }),
        '%releaseD%': () => releaseDate.getDate(),
        '%releaseDD%': () => padd(releaseDate.getDate(), 2, '0'),
        '%releaseDay%': () => releaseDate.toLocaleString(undefined, { weekday: 'long' }),
        '%listenedY%': () => listenedDate.getFullYear().toString().substring(2),
        '%listenedYYYY%': () => listenedDate.getFullYear(),
        '%listenedM%': () => listenedDate.getMonth() + 1,
        '%listenedMM%': () => padd(listenedDate.getMonth() + 1, 2, '0'),
        '%listenedMon%': () => listenedDate.toLocaleString(undefined, { month: 'short' }),
        '%listenedMonth%': () => listenedDate.toLocaleString(undefined, { month: 'long' }),
        '%listenedD%': () => listenedDate.getDate(),
        '%listenedDD%': () => padd(listenedDate.getDate(), 2, '0'),
        '%listenedDay%': () => listenedDate.toLocaleString(undefined, { weekday: 'long' }),
        '%json%': () => JSON.stringify(myAlbum),
        '%json5%': () => JSON5.stringify(myAlbum)
      }

      for (const field in fields) {
        if (format.includes(field)) {
          try {
            format = format.replace(field, fields[field]())
          } catch (e) {
            console.log('Could not format replace "' + field + '": ' + e)
          }
        }
      }
      return format
    }

    const sortBy = function sortByCmp (sortKey) {
      const cmps = {
        playedAsc: function playedAsc (a, b) {
          return -cmps.playedDesc(a, b)
        },
        playedDesc: function playedDesc (a, b) {
          try {
            return new Date(b.listened) - new Date(a.listened)
          } catch (e) {
            return 0
          }
        },
        releasedAsc: function releasedAsc (a, b) {
          return -cmps.releasedDesc(a, b)
        },
        releasedDesc: function releasedDesc (a, b) {
          try {
            return new Date(b.releaseDate) - new Date(a.releaseDate)
          } catch (e) {
            return 0
          }
        },
        artist: function artist (a, b, fallbackToTitle) {
          const d = a.artist.localeCompare(b.artist)
          if (d === 0 && fallbackToTitle) {
            return cmps.title(a, b, false)
          } else {
            return d
          }
        },
        title: function title (a, b, fallbackToArtist) {
          const d = a.title.localeCompare(b.title)
          if (d === 0 && fallbackToArtist) {
            return cmps.artist(a, b, false)
          } else {
            return d
          }
        }
      }

      listenedAlbums.sort(cmps[sortKey])
    }

    const generate = function generateStr () {
      const textarea = document.getElementById('export_output')
      window.setTimeout(function generateStrAnimation () {
        textarea.classList.remove('animated')
        textarea.style.boxShadow = '2px 2px 5px #00af'
      }, 0)

      let str
      if (format === '%backup%') {
        str = myalbumsStr
      } else {
        const sortSelect = document.getElementById('sort_select')
        sortBy(sortSelect.options[sortSelect.selectedIndex].value)

        str = []
        for (let i = 0; i < listenedAlbums.length; i++) {
          str.push(formatAlbum(format, listenedAlbums[i]))
        }
        str = str.join(navigator.platform.startsWith('Win') ? '\r\n' : '\n')
      }
      window.setTimeout(function generateStrAnimationSuccess () {
        textarea.value = str
        textarea.classList.add('animated')
        textarea.style.boxShadow = '2px 2px 5px #0a0f'
      }, 50)

      window.setTimeout(function generateStrResetAnimation () {
        textarea.style.boxShadow = ''
      }, 3000)
      return str
    }

    const inputFormatOnChange = async function onInputFormatChange () {
      const input = this
      const formatExample = document.getElementById('format_example')
      format = input.value

      formatExample.value = listenedAlbums.length > 0 ? formatAlbum(format, listenedAlbums[0]) : ''
      formatExample.style.boxShadow = '2px 2px 5px #0a0f'

      window.setTimeout(function resetBoxShadow () {
        formatExample.style.boxShadow = ''
      }, 3000)
    }

    const importData = function importDate (data) {
      GM.getValue('myalbums', '{}').then(function myalbumsLoaded (myalbumsStr) {
        let myalbums = JSON.parse(myalbumsStr)
        myalbums = Object.assign(myalbums, data)
        return GM.setValue('myalbums', JSON.stringify(myalbums))
      }).then(function myalbumsSaved () {
        document.getElementById('exportmenu_close').click()
        window.setTimeout(() => exportMenu(true), 50)
      })
    }
    const handleFiles = async function handleFilesAsync (fileList) {
      if (fileList.length === 0) {
        console.log('fileList is empty')
        return
      }

      let data
      try {
        data = await (new Response(fileList[0])).json()
      } catch (e) {
        window.alert('Could not load file:\n' + e)
        return
      }

      const n = Object.keys(data).length
      if (window.confirm('Found ' + n + ' albums. Continue import and overwrite existing albums?')) {
        importData(data)
      }
    }

    const inputTable = main.appendChild(document.createElement('table'))
    let tr
    let td

    tr = inputTable.appendChild(document.createElement('tr'))
    td = tr.appendChild(document.createElement('td'))
    const label = td.appendChild(document.createElement('label'))
    label.setAttribute('for', 'export_format')
    label.appendChild(document.createTextNode('Format:'))

    td = tr.appendChild(document.createElement('td'))
    const inputFormat = td.appendChild(document.createElement('input'))
    inputFormat.type = 'text'
    inputFormat.value = format
    inputFormat.id = 'export_format'
    inputFormat.style.width = '600px'
    inputFormat.addEventListener('change', inputFormatOnChange)
    inputFormat.addEventListener('keyup', inputFormatOnChange)

    tr = inputTable.appendChild(document.createElement('tr'))

    td = tr.appendChild(document.createElement('td'))
    td.appendChild(document.createTextNode('Example:'))

    td = tr.appendChild(document.createElement('td'))
    const inputExample = td.appendChild(document.createElement('input'))
    inputExample.type = 'text'
    inputExample.value = listenedAlbums.length > 0 ? formatAlbum(format, listenedAlbums[0]) : ''
    inputExample.readonly = true
    inputExample.id = 'format_example'
    inputExample.style.width = '600px'

    td = tr.appendChild(document.createElement('td'))
    td.appendChild(document.createTextNode('Sort by:'))

    td = tr.appendChild(document.createElement('td'))
    const sortSelect = td.appendChild(document.createElement('select'))
    sortSelect.id = 'sort_select'
    sortSelect.innerHTML = `
      <option value="playedDesc">Recent play first</option>
      <option value="playedAsc">Recent play last</option>
      <option value="releasedDesc">Recent release first</option>
      <option value="releasedAsc">Recent release last</option>
      <option value="artist">Artist A-Z</option>
      <option value="title">Title A-Z</option>
    `

    tr = inputTable.appendChild(document.createElement('tr'))
    td = tr.appendChild(document.createElement('td'))
    td.setAttribute('colspan', '2')
    const generateButton = td.appendChild(document.createElement('button'))
    generateButton.appendChild(document.createTextNode('Generate'))
    generateButton.addEventListener('click', (ev) => generate())
    const exportButton = td.appendChild(document.createElement('button'))
    exportButton.appendChild(document.createTextNode('Export to file'))
    exportButton.addEventListener('click', function onExportFileButtonClick () {
      const dateSuffix = (new Date()).toISOString().split('T')[0]
      document.getElementById('export_download_link').download = 'bandcampPlayedAlbums_' + dateSuffix + '.txt'
      document.getElementById('export_download_link').href = 'data:text/plain,' + encodeURIComponent(generate())
      window.setTimeout(() => document.getElementById('export_download_link').click(), 50)
    })
    const backupButton = td.appendChild(document.createElement('button'))
    backupButton.appendChild(document.createTextNode('Backup'))
    backupButton.addEventListener('click', function onBackupButtonClick () {
      format = '%backup%'
      document.getElementById('export_format').value = format
      document.getElementById('format_example').value = 'JSON dictionary'
      const dateSuffix = (new Date()).toISOString().split('T')[0]
      document.getElementById('export_download_link').download = 'bandcampPlayedAlbums_' + dateSuffix + '.json'
      document.getElementById('export_download_link').href = 'data:application/json,' + encodeURIComponent(generate())
      document.getElementById('export_clear_button').style.display = ''
      GM.setValue('myalbums_lastbackup', Object.keys(myalbums).length + '#####' + (new Date()).toJSON())
      window.setTimeout(() => document.getElementById('export_download_link').click(), 50)
    })
    const restoreButton = td.appendChild(document.createElement('button'))
    restoreButton.appendChild(document.createTextNode('Restore'))
    restoreButton.addEventListener('click', function onBackupButtonClick () {
      inputFile.click()
    })

    const clearButton = td.appendChild(document.createElement('button'))
    clearButton.appendChild(document.createTextNode('Clear played albums'))
    clearButton.id = 'export_clear_button'
    if (showClearButton !== true) {
      clearButton.style.display = 'none'
    }
    clearButton.addEventListener('click', function onClearButtonClick () {
      if (window.confirm('Remove all played albums?\n\nThis cannot be undone.')) {
        if (window.confirm('Are you sure? Delete all played albums?')) {
          GM.setValue('myalbums', '{}').then(function myalbumsSaved () {
            document.getElementById('exportmenu_close').click()
            window.setTimeout(exportMenu, 50)
          })
        }
      }
    })

    const downloadA = td.appendChild(document.createElement('a'))
    downloadA.id = 'export_download_link'
    downloadA.href = '#'
    downloadA.download = 'bandcamp_played_albums.txt'
    downloadA.target = '_blank'

    const inputFile = td.appendChild(document.createElement('input'))
    inputFile.type = 'file'
    inputFile.id = 'input_file'
    inputFile.accept = '.txt,plain/text,.json,application/json'
    inputFile.style.display = 'none'
    inputFile.addEventListener('change', function onFileChanged (ev) {
      handleFiles(this.files)
    }, false)
    main.addEventListener('dragenter', function dragenter (ev) {
      ev.stopPropagation()
      ev.preventDefault()
      main.style.backgroundColor = '#c6daf9'
      drophint.style.left = (main.clientWidth / 2 - drophint.clientWidth / 2) + 'px'
      drophint.style.display = 'block'
    }, false)
    main.addEventListener('dragleave', function dragleave (ev) {
      main.style.backgroundColor = 'white'
      drophint.style.display = 'none'
    }, false)
    main.addEventListener('dragover', function dragover (ev) {
      ev.stopPropagation()
      ev.preventDefault()
      main.style.backgroundColor = '#c6daf9'
      drophint.style.display = 'block'
    }, false)
    main.addEventListener('drop', function drop (ev) {
      ev.stopPropagation()
      ev.preventDefault()
      main.style.backgroundColor = 'white'
      drophint.style.display = 'none'
      handleFiles(ev.dataTransfer.files)
    }, false)

    tr = inputTable.appendChild(document.createElement('tr'))
    td = tr.appendChild(document.createElement('td'))
    td.setAttribute('colspan', '3')
    const textarea = td.appendChild(document.createElement('textarea'))
    textarea.id = 'export_output'
    textarea.style.width = Math.max(500, main.clientWidth - 50) + 'px'

    // Bottom buttons
    main.appendChild(document.createElement('br'))
    main.appendChild(document.createElement('br'))
    const buttons = main.appendChild(document.createElement('div'))

    const closeButton = buttons.appendChild(document.createElement('button'))
    closeButton.appendChild(document.createTextNode('Close'))
    closeButton.id = 'exportmenu_close'
    closeButton.style.color = 'black'
    closeButton.addEventListener('click', function onCloseButtonClick () {
      document.querySelector('.deluxeexportmenu').remove()
      // Un-blur background
      if (document.getElementById('centerWrapper')) {
        document.getElementById('centerWrapper').style.filter = ''
      }
    })
  })
  window.setTimeout(function moveMenuIntoView () {
    main.style.maxHeight = (document.documentElement.clientHeight - 40) + 'px'
    main.style.maxWidth = (document.documentElement.clientWidth - 40) + 'px'
    main.style.left = Math.max(20, 0.5 * (document.body.clientWidth - main.clientWidth)) + 'px'
  }, 0)
}

function checkBackupStatus () {
  GM.getValue('myalbums_lastbackup', '').then(function myalbumsLastBackupLoaded (value) {
    if (!value || !value.includes('#####')) {
      // Set current date (install date) as initial value
      GM.setValue('myalbums_lastbackup', '0#####' + (new Date()).toJSON())
      return
    }
    const parts = value.split('#####')
    const n0 = parseInt(parts[0])
    const lastBackup = new Date(parts[1])
    if ((new Date()) - lastBackup > BACKUP_REMINDER_DAYS * 86400000) {
      GM.getValue('myalbums', '{}').then(function myalbumsLoaded (str) {
        const n1 = Object.keys(JSON.parse(str)).length
        if (Math.abs(n0 - n1) > 10) {
          showBackupHint(lastBackup, Math.abs(n0 - n1))
        }
      })
    }
  })
}

function showBackupHint (lastBackup, changedRecords) {
  const since = timeSince(lastBackup)

  document.head.appendChild(document.createElement('style')).innerHTML = `
    .backupreminder {
      position:fixed;
      height:auto;
      overflow:auto;
      top:110%;
      left:40%;
      z-index:200;
      padding:5px;
      transition: top 1s;
      border:2px solid black;
      border-radius:10px;
      color:black;
      background:white;
    }
  `

  // Blur background
  if (document.getElementById('centerWrapper')) { document.getElementById('centerWrapper').style.filter = 'blur(4px)' }

  const main = document.body.appendChild(document.createElement('div'))
  main.className = 'backupreminder'
  main.innerHTML = `<h2>Bandcamp script (Deluxe Edition)</h2>
  <h1>Backup reminder</h1>
  <p>
    Your last backup was ${since} ago. Since then, you played ${changedRecords} albums.
  </p>
  `

  main.appendChild(document.createElement('br'))
  const buttons = main.appendChild(document.createElement('div'))

  const closeButton = buttons.appendChild(document.createElement('button'))
  closeButton.appendChild(document.createTextNode('Close'))
  closeButton.id = 'backupreminder_close'
  closeButton.style.color = 'black'
  closeButton.addEventListener('click', function onCloseButtonClick () {
    document.querySelector('.backupreminder').remove()
    // Un-blur background
    if (document.getElementById('centerWrapper')) {
      document.getElementById('centerWrapper').style.filter = ''
    }
  })

  buttons.appendChild(document.createTextNode(' '))

  const backupButton = buttons.appendChild(document.createElement('button'))
  backupButton.appendChild(document.createTextNode('Start backup'))
  backupButton.style.color = '#0687f5'
  backupButton.addEventListener('click', function backupButtonClick () {
    document.getElementById('backupreminder_close').click()
    mainMenu(true)
  })

  buttons.appendChild(document.createTextNode(' '))

  const ignoreButton = buttons.appendChild(document.createElement('button'))
  ignoreButton.appendChild(document.createTextNode('Disable reminder'))
  ignoreButton.style.color = 'black'
  ignoreButton.addEventListener('click', async function ignoreButtonClick () {
    getEnabledFeatures(await GM.getValue('enabledFeatures', false))
    if (allFeatures.backupReminder.enabled) {
      allFeatures.backupReminder.enabled = false
    }
    await GM.setValue('enabledFeatures', JSON.stringify(allFeatures))
    document.getElementById('backupreminder_close').click()
  })

  window.setTimeout(function moveMenuIntoView () {
    main.style.maxHeight = (document.documentElement.clientHeight - 40) + 'px'
    main.style.maxWidth = (document.documentElement.clientWidth - 40) + 'px'
    main.style.left = Math.max(20, 0.5 * (document.documentElement.clientWidth - main.clientWidth)) + 'px'
    main.style.top = Math.max(20, 0.3 * document.documentElement.clientHeight) + 'px'
  }, 0)
}

function downloadMp3FromLink (ev, a, addSpinner, removeSpinner) {
  const url = a.href

  if (GM_download) {
    // Use Tampermonkey GM_download function
    ev.preventDefault()
    addSpinner(a)
    GM_download({
      url: url,
      name: a.download || 'default.mp3',
      onerror: function downloadMp3FromLinkOnError () {
        window.alert('Could not download via GM_download')
        document.location.href = url
      },
      ontimeout: function downloadMp3FromLinkOnTimeout () {
        window.alert('Could not download via GM_download. Time out.')
        document.location.href = url
      },
      onload: function downloadMp3FromLinkOnLoad () {
        window.setTimeout(() => removeSpinner(a), 500)
      }
    })
  }

  if (!url.startsWith('http') || navigator.userAgent.indexOf('Chrome') !== -1) {
    // Just open the link normally (no prevent default)
    addSpinner(a)
    window.setTimeout(() => removeSpinner(a), 1000)
    return
  }

  // Use GM.xmlHttpRequest to download and offer data uri
  ev.preventDefault()

  addSpinner(a)

  GM.xmlHttpRequest({
    method: 'GET',
    overrideMimeType: 'text/plain; charset=x-user-defined',
    url: url,
    onload: function onMp3Load (response) {
      a.href = 'data:audio/mpeg;base64,' + base64encode(response.responseText)
      window.setTimeout(() => a.click(), 10)
    },
    onerror: function onMp3LoadError (response) {
      window.alert('Could not download via GM.xmlHttpRequest')
      document.location.href = url
    }
  })
}

function addDownloadLinksToAlbumPage () {
  document.head.appendChild(document.createElement('style')).innerHTML = `
  .download-col .downloaddisk:hover {
    text-decoration:none
  }
  /* From http://www.designcouch.com/home/why/2013/05/23/dead-simple-pure-css-loading-spinner/ */
  .downspinner {
    height:16px;
    width:16px;
    margin:0px auto;
    position:relative;
    display:inline-block;
    animation: spinnerrotation 3s infinite linear;
    cursor:wait;
  }
  @keyframes spinnerrotation {
    from {transform: rotate(0deg)}
    to {transform: rotate(359deg)}
  }`

  const addSpiner = function downloadLinksOnAlbumPageAddSpinner (el) {
    el.style = ''
    el.classList.add('downspinner')
  }

  const removeSpinner = function downloadLinksOnAlbumPageRemoveSpinner (el) {
    el.classList.remove('downspinner')
    el.style = 'background:#1cea1c; border-radius:5px; padding:1px; opacity:0.5'
  }

  const TralbumData = unsafeWindow.TralbumData
  if (TralbumData && TralbumData.hasAudio && !TralbumData.freeDownloadPage && TralbumData.trackinfo) {
    var hoverdiv = document.querySelectorAll('.download-col div')
    if (hoverdiv.length > 0) {
      // Album page
      for (let i = 0; i < TralbumData.trackinfo.length; i++) {
        const t = TralbumData.trackinfo[i]
        for (var prop in t.file) {
          const mp3 = t.file[prop].replace(/^\/\//, 'http://')
          const a = document.createElement('a')
          a.className = 'downloaddisk'
          a.href = mp3
          a.download = (t.track_num == null ? '' : (t.track_num > 9 ? '' : '0' + t.track_num + '. ')) + fixFilename(TralbumData.artist + ' - ' + t.title) + '.mp3'
          a.title = 'Download ' + prop
          a.appendChild(document.createTextNode(NOEMOJI ? '\u2193' : '\uD83D\uDCBE'))
          a.addEventListener('click', function onDownloadLinkClick (ev) {
            downloadMp3FromLink(ev, this, addSpiner, removeSpinner)
          })
          hoverdiv[i].appendChild(a)
          break
        }
      }
    } else if (document.querySelector('#trackInfo .download-link')) {
      // Single track page
      const t = TralbumData.trackinfo[0]
      const mp3 = t.file[Object.keys(t.file)[0]].replace(/^\/\//, 'http://')
      const a = document.createElement('a')
      a.className = 'downloaddisk'
      a.href = mp3
      a.download = (t.track_num == null ? '' : (t.track_num > 9 ? '' : '0' + t.track_num + '. ')) + fixFilename(TralbumData.artist + ' - ' + t.title) + '.mp3'
      a.title = 'Download ' + prop
      a.appendChild(document.createTextNode(NOEMOJI ? '\u2193' : '\uD83D\uDCBE'))
      a.addEventListener('click', function onDownloadLinkClick (ev) {
        downloadMp3FromLink(ev, this, addSpiner, removeSpinner)
      })
      document.querySelector('#trackInfo .download-link').parentNode.appendChild(a)
    }
  }
}

function addMainMenuButtonToUserNav () {
  const userNav = document.getElementById('user-nav')
  const li = userNav.insertBefore(document.createElement('li'), userNav.firstChild)
  li.className = 'menubar-item hoverable'
  li.title = 'userscript settings - Bandcamp script (Deluxe Edition)'
  const a = li.appendChild(document.createElement('a'))
  a.className = 'settingssymbol'
  a.style.fontSize = '24px'
  if (NOEMOJI) {
    a.appendChild(document.createTextNode('\u26ED'))
  } else {
    a.appendChild(document.createTextNode('\u2699\uFE0F'))
  }
  li.addEventListener('click', () => mainMenu())
}

const maintenanceContent = document.querySelector('.content')
if (maintenanceContent && maintenanceContent.textContent.indexOf('are offline') !== -1) {
  console.log('Maintenance detected')
} else {
  if (NOEMOJI) {
    document.head.appendChild(document.createElement('style')).innerHTML = '@font-face{font-family:Symbola;src:local("Symbola Regular"),local("Symbola"),url(https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/font/Symbola.woff2) format("woff2"),url(https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/font/Symbola.woff) format("woff"),url(https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/font/Symbola.ttf) format("truetype"),url(https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/font/Symbola.otf) format("opentype"),url(https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/font/Symbola.svg#Symbola) format("svg")}' +
      '.sharepanelchecksymbol,.bdp_check_onlinkhover_symbol,.bdp_check_onchecked_symbol,.volumeSymbol,.downloaddisk,.downloadlink,#user-nav .settingssymbol,.listened-symbol,.mark-listened-symbol,.minimizebutton{font-family:Symbola,Quivira,"Segoe UI Symbol","Segoe UI Emoji",Arial,sans-serif}' +
      '.downloaddisk,.downloadlink{font-weight: bolder}'
  }
  GM.getValue('enabledFeatures', false).then(function onEnabledFeaturesLoad (value) {
    getEnabledFeatures(value)

    if (allFeatures.releaseReminder.enabled) {
      showPastReleases()
    }

    if (allFeatures.discographyplayer.enabled && document.querySelector('.music-grid .music-grid-item a[href^="/album/"] img')) {
      // Discography page
      makeAlbumCoversGreat()
    }

    if (document.querySelector('.inline_player')) {
      // Album page with player
      if (allFeatures.thetimehascome.enabled) {
        removeTheTimeHasComeToOpenThyHeartWallet()
      }
      if (allFeatures.albumPageVolumeBar.enabled) {
        window.setTimeout(addVolumeBarToAlbumPage, 3000)
      }
      if (allFeatures.albumPageDownloadLinks.enabled) {
        window.setTimeout(addDownloadLinksToAlbumPage, 500)
      }
    }

    if (document.querySelector('.share-panel-wrapper-desktop')) {
      // Album page with Share,Embed,Wishlist links

      if (allFeatures.markasplayedEverywhere.enabled) {
        addListenedButtonToCollectControls()
      }

      if (document.location.hash === '#collect-wishlist') {
        clickAddToWishlist()
      }

      if (document.querySelector('*[itemprop="datePublished"]')) {
        addReleaseDateButton()
      }
    }

    if (document.getElementById('user-nav')) {
      addMainMenuButtonToUserNav()
    }

    if (document.getElementById('carousel-player') || document.querySelector('.play-carousel')) {
      window.setTimeout(makeCarouselPlayerGreatAgain, 5000)
    }

    if (document.querySelector('ol#grid-tabs li') && document.querySelector('.fan-bio-pic-upload-container')) {
      const listenedTabLink = makeListenedListTabLink()
      if (document.location.hash === '#listened-tab') {
        window.setTimeout(function resetGridTabs () {
          document.querySelector('#grid-tabs .active').classList.remove('active')
          document.querySelector('#grids .grid.active').classList.remove('active')
          listenedTabLink.classList.add('active')
          listenedTabLink.click()
        }, 500)
      }
    }

    if (allFeatures.albumPageVolumeBar.enabled) {
      restoreVolume()
    }

    if (allFeatures.markasplayedEverywhere.enabled) {
      makeAlbumLinksGreat()
    }

    if (allFeatures.backupReminder.enabled) {
      checkBackupStatus()
    }

    GM.getValue('musicPlayerState', '{}').then(function restoreState (s) {
      if (s !== '{}') {
        GM.setValue('musicPlayerState', '{}')
        musicPlayerRestoreState(JSON.parse(s))
      }
    })
  })
}
