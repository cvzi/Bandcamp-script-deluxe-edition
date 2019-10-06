// ==UserScript==
// @name          Bandcamp script (Deluxe Edition)
// @description   A discography player for bandcamp.com and manage your played albums
// @namespace     https://openuserjs.org/users/cuzi
// @copyright     2019, cuzi (https://openuserjs.org/users/cuzi)
// @license       MIT
// @version       0.4
// @require       https://unpkg.com/json5@2.1.0/dist/index.min.js
// @grant         GM.xmlHttpRequest
// @grant         GM.setValue
// @grant         GM.getValue
// @include       https://bandcamp.com/*
// @include       https://*.bandcamp.com/*
// ==/UserScript==

// ==OpenUserJS==
// @author        cuzi
// ==/OpenUserJS==

/* globals JSON5, GM, MouseEvent */

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
  }).then(function (volume) {
    if (!Number.isNaN(volume) && volume > 0.0) {
      callbackIfVolumeExists(volume)
    }
  })
}
function restoreVolume () {
  getStoredVolume(function (volume) {
    const restoreVolumeInterval = function () {
      const audios = document.querySelectorAll('audio')
      if (audios.length > 0) {
        let paused = true
        audios.forEach(function (audio) {
          paused = paused && audio.paused
          audio.volume = volume
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
    ivRestoreVolume = window.setInterval(restoreVolumeInterval, 700)
  })
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
      return playAlbumFromCover.apply(as[i], null)
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
    current.className = current.className.replace('playing', '')
    next.className += ' playing'
    musicPlayerPlaySong(next)
  } else {
    // End of playlist reached
    if (findNextAlbumCover(current.dataset.albumUrl) === false) {
      window.alert('End of playlist reached')
    }
  }
}
var ivSlideInNextSong
function musicPlayerPlaySong (next) {
  currentDuration = next.dataset.duration
  player.querySelector('.durationDisplay .current').innerHTML = '-'
  player.querySelector('.durationDisplay .total').innerHTML = humanDuration(currentDuration)
  audio.src = next.dataset.file
  bufferbar.classList.remove('bufferbaranimation')
  window.setTimeout(function () {
    bufferbar.style.width = '0px'
    window.setTimeout(function () {
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
  collectListened.dataset.albumUrl = next.dataset.albumUrl
  player.querySelectorAll('.collect-listened>*').forEach(function (e) { e.style.display = 'none' })
  GM.getValue('myalbums', '{}').then(function (str) {
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

  // Animate
  currentlyPlaying.style.marginLeft = -parseInt(currentlyPlaying.clientWidth + 1) + 'px'
  nextInRow.style.width = '99%'

  clearTimeout(ivSlideInNextSong)

  ivSlideInNextSong = window.setTimeout(function () {
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
  window.setTimeout(function () {
    musicPlayerShowBusy()
    findPreviousAlbumCover(player.querySelector('.playlist .playing').dataset.albumUrl)
  }, 10)
}
function musicPlayerNextAlbum () {
  audio.pause()
  window.setTimeout(function () {
    musicPlayerShowBusy()
    findNextAlbumCover(player.querySelector('.playlist .playing').dataset.albumUrl)
  }, 10)
}

function musicPlayerOnTimelineClick (ev) {
  musicPlayerMovePlayHead(ev)
  const timelineWidth = timeline.offsetWidth - playhead.offsetWidth
  const clickPercent = (ev.clientX - timeline.getBoundingClientRect().left) / timelineWidth
  audio.currentTime = currentDuration * clickPercent
}

function musicPlayerOnTimeUpdate (ev) {
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
  audio.volume = percent > 0.9 ? 1.0 : percent
  GM.setValue('volume', audio.volume)
}
function musicPlayerOnVolumeWheel (ev) {
  ev.preventDefault()
  const direction = Math.min(Math.max(-1.0, ev.deltaY), 1.0)
  audio.volume = Math.min(Math.max(0.0, audio.volume - 0.05 * direction), 1.0)
  GM.setValue('volume', audio.volume)
}
function musicPlayerOnMuteClick (ev) {
  if (audio.volume < 0.01) {
    if ('lastvolume' in audio.dataset && audio.dataset.lastvolume) {
      audio.volume = audio.dataset.lastvolume
      GM.setValue('volume', audio.volume)
    } else {
      audio.volume = 1.0
    }
  } else {
    audio.dataset.lastvolume = audio.volume
    audio.volume = 0.0
  }
}

function musicPlayerOnVolumeChanged (ev) {
  const icons = ['\uD83D\uDD07', '\uD83D\uDD08', '\uD83D\uDD09', '\uD83D\uDD0A']
  const percent = audio.volume
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

  const listened = collectListened.dataset.listened !== 'false'

  const url = collectListened.dataset.albumUrl

  setTimeout(function () {
    player.querySelectorAll('.collect-listened>*').forEach(function (e) { e.style.display = 'none' })
    player.querySelector('.collect-listened .listened-saving').style.display = 'inline-block'
    player.querySelector('.collect-listened').style.cursor = 'wait'
  }, 0)

  let albumData = await myAlbumsGetAlbum(url)
  if (!albumData) {
    albumData = await myAlbumsNewFromUrl(url, {})
  }
  if (listened) {
    albumData.listened = false
  } else {
    albumData.listened = (new Date()).toJSON()
  }

  await myAlbumsUpdateAlbum(albumData)

  player.querySelectorAll('.collect-listened>*').forEach(function (e) { e.style.display = 'none' })
  if (listened) {
    player.querySelector('.collect-listened .mark-listened').style.display = 'inline-block'
  } else {
    player.querySelector('.collect-listened .listened').style.display = 'inline-block'
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

function musicPlayerCreate () {
  if (player) {
    return
  }

  musicPlayerCookieChannel(musicPlayerStop)

  const img1px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mOsmLZvJgAFwQJn5VVZ5QAAAABJRU5ErkJggg=='

  const listenedListUrl = findUserProfileUrl() + '#listened-tab'

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
<div class="col col25">
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
    <br class="cll">
  </div>
</div>
<div class="col col35">
  <ol class="playlist"></ol>
</div>
<div class="col col15">

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
        <span class="listened-symbol">✔</span>
        <span class="listened-label">Played</span>
      </span>
      <span class="mark-listened" title="Mark album as played">
        <span class="mark-listened-symbol">✔</span>
        <span class="mark-listened-label">Mark as played</span>
      </span>
      <span class="listened-saving">
        Saving...
      </span>
    </div>
  </div>

  <br class="cll">

</div>`

  document.head.appendChild(document.createElement('style')).innerHTML = `
.cll{
  clear:left;
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
  font-family:"Helvetica Neue", Helvetica, Arial, sans-serif
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
  margin-top:24px
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
  margin-right: 14px;
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
  color:#EEE
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

`

  audio = player.querySelector('audio')
  getStoredVolume(function (volume) { audio.volume = volume })
  playhead = player.querySelector('#playhead')
  bufferbar = player.querySelector('#bufferbar')
  timeline = player.querySelector('#timeline')

  audio.addEventListener('ended', musicPlayerOnEnded)
  audio.addEventListener('timeupdate', musicPlayerOnTimeUpdate)
  audio.addEventListener('volumechange', musicPlayerOnVolumeChanged)
  audio.addEventListener('canplaythrough', function () {
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

  window.setInterval(musicPlayerUpdateBufferBar, 1200)
}

function addHeadingToPlaylist (title, url) {
  musicPlayerCreate()
  let content = document.createTextNode('💽 ' + title)
  if (url) {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.appendChild(content)
    content = a
  }
  const li = document.createElement('li')
  li.appendChild(content)
  li.className = 'playlistheading'
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
      el.className = el.className.replace('playing', '')
    })
    li.className += ' playing'
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
  addHeadingToPlaylist(album, 'url' in TralbumData ? TralbumData.url : false)
  let streamable = 0
  for (var key in TralbumData.trackinfo) {
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
    li.appendChild(document.createTextNode('\uD83D\uDE22 Album is not streamable'))
    player.querySelector('.playlist').appendChild(li)
  }
}

function getTralbumData (url, cb) {
  return new Promise(function (resolve, reject) {
    GM.xmlHttpRequest({
      method: 'GET',
      url: url,
      onload: function (response) {
        const TralbumData = JSON5.parse(response.responseText.split('var TralbumData =')[1].split('\n};\n')[0].replace(/"\s+\+\s+"/, '') + '\n}')
        correctTralbumData(TralbumData)
        resolve(TralbumData)
      },
      onerror: function (response) {
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
  const cache = JSON.parse(await GM.getValue('tralbumdata', '{}'))
  for (const prop in cache) {
    // Delete cached values, that are older than 2 hours
    if ((new Date()).getTime() - (new Date(cache[prop].time)).getTime() > 2 * 60 * 60 * 1000) {
      delete cache[prop]
    }
  }
  TralbumData.time = (new Date()).toJSON()
  cache[albumKey(TralbumData.url)] = TralbumData
  await GM.setValue('hovercache', JSON.stringify(cache))
}

async function cachedTralbumData (url) {
  const key = albumKey(url)
  const cache = JSON.parse(await GM.getValue('tralbumdata', '{}'))
  for (const prop in cache) {
    // Delete cached values, that are older than 2 hours
    if ((new Date()).getTime() - (new Date(cache[prop].time)).getTime() > 2 * 60 * 60 * 1000) {
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

  parent.className += ' discographyplayer_currentalbum'

  // Check if already in playlist
  if (player) {
    const lis = player.querySelectorAll('.playlist .playlistentry')
    for (let i = 0; i < lis.length; i++) {
      if (lis[i].dataset.albumUrl === url) {
        lis[i].click()
        return
      }
    }
  }

  // Load data
  cachedTralbumData(url).then(function (TralbumData) {
    if (TralbumData) {
      addAlbumToPlaylist(TralbumData, 0)
    } else {
      playAlbumFromUrl(url)
    }
  })
}

function playAlbumFromUrl (url) {
  getTralbumData(url).then(function (TralbumData) {
    storeTralbumData(TralbumData)
    addAlbumToPlaylist(TralbumData, 0)
  }).catch(function (e) {
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

async function makeAlbumLinksGreat () {
  const myalbums = JSON.parse(await GM.getValue('myalbums', '{}'))

  if (!(makeAlbumLinksGreat in document.head.dataset)) {
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

  /*
  <div class="bdp_check_container bdp_check_onlinkhover_container"><span class="bdp_check_onlinkhover_symbol">\u2610</span> <span class="bdp_check_onlinkhover_text">Check</span></div>
  <div class="bdp_check_container bdp_check_onlinkhover_container"><span class="bdp_check_onlinkhover_symbol">\u1f5f9</span> <span class="bdp_check_onlinkhover_text">Check</span></div>
  <span class="bdp_check_onchecked_symbol">\u2611</span> TITLE <div class="bdp_check_container bdp_check_onchecked_container"><span class="bdp_check_onchecked_text">Played</span></div>
  */

  const onClickSetListened = async function (ev) {
    ev.preventDefault()

    let parent = this
    for (let j = 0; parent.tagName !== 'A' && j < 20; j++) {
      parent = parent.parentNode
    }
    setTimeout(function () { parent.style.cursor = 'wait'; parent.querySelector('.bdp_check_container').innerHTML = 'Saving...' }, 0)

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
  const onClickRemoveListened = async function (ev) {
    ev.preventDefault()

    let parent = this
    for (let j = 0; parent.tagName !== 'A' && j < 20; j++) {
      parent = parent.parentNode
    }
    setTimeout(function () { parent.style.cursor = 'wait'; parent.querySelector('.bdp_check_container').innerHTML = 'Saving...' }, 0)

    const url = parent.href
    const albumData = await myAlbumsGetAlbum(url)
    if (albumData) {
      albumData.listened = false
      await myAlbumsUpdateAlbum(albumData)
    }

    makeAlbumLinksGreat()
    parent.style.cursor = ''
  }
  const mouseOverLink = function (ev) {
    if (this.querySelector('.bdp_check_onlinkhover_container')) {
      this.querySelector('.bdp_check_onlinkhover_container').className += ' bdp_check_onlinkhover_container_shown'
    }
  }
  const mouseOutLink = function (ev) {
    const a = this
    setTimeout(function () {
      const div = a.querySelector('.bdp_check_onlinkhover_container')
      if (div) {
        div.className = div.className.replace(' bdp_check_onlinkhover_container_shown', '')
      }
    }, 1000)
  }
  const mouseOverDivCheck = function (ev) {
    this.querySelector('.bdp_check_onlinkhover_symbol').innerText = '\uD83D\uDDF9'
  }
  const mouseOutDivCheck = function (ev) {
    this.querySelector('.bdp_check_onlinkhover_symbol').innerText = '\u2610'
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

  const a = document.querySelectorAll('a[href*="/album/"],.music-grid .music-grid-item a[href^="/track/"]')
  let lastKey = ''
  for (let i = 0; i < a.length; i++) {
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
    TralbumData.play_cap_data.streaming_limit = 100
    TralbumData.play_cap_data.streaming_limits_enabled = false
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

async function addListenedButtonToCollectControls () {
  const lastLi = document.querySelector('.share-panel-wrapper-desktop ul li')
  if (!lastLi) {
    window.setTimeout(addListenedButtonToCollectControls, 300)
    return
  }
  const myalbums = JSON.parse(await GM.getValue('myalbums', '{}'))

  const key = albumKey(document.location.href)
  const listened = key in myalbums && 'listened' in myalbums[key] && myalbums[key].listened

  const onClickSetListened = async function (ev) {
    ev.preventDefault()

    let parent = this
    for (let j = 0; parent.tagName !== 'LI' && j < 20; j++) {
      parent = parent.parentNode
    }
    setTimeout(function () { parent.style.cursor = 'wait'; parent.innerHTML = 'Saving...' }, 0)

    const url = document.location.href
    let albumData = await myAlbumsGetAlbum(url)
    if (!albumData) {
      albumData = await myAlbumsNewFromUrl(url, { title: this.dataset.textContent })
    }
    albumData.listened = (new Date()).toJSON()

    await myAlbumsUpdateAlbum(albumData)

    addListenedButtonToCollectControls()
  }
  const onClickRemoveListened = async function (ev) {
    ev.preventDefault()

    let parent = this
    for (let j = 0; parent.tagName !== 'LI' && j < 20; j++) {
      parent = parent.parentNode
    }
    setTimeout(function () { parent.style.cursor = 'wait'; parent.innerHTML = 'Saving...' }, 0)

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

  if (listened) {
    const date = new Date(listened)
    const since = timeSince(date)

    button.title = since + '\nClick to mark as NOT played'
    button.addEventListener('click', onClickRemoveListened)

    icon.style.color = 'rgb(0,220,50)'
    icon.style.textShadow = '1px 0px #DDD,-1px 0px #DDD,0px -1px #DDD,0px 1px #DDD'
    icon.style.paddingRight = '5px'
    icon.appendChild(document.createTextNode('\u2714'))

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
    icon.appendChild(document.createTextNode('\u2714'))

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
  li.dataset.tab = 'listened'
  li.setAttribute('data-grid-id', 'listened-grid')
  const span = li.appendChild(document.createElement('span'))
  span.className = 'tab-title'
  span.appendChild(document.createTextNode('played'))

  const count = span.appendChild(document.createElement('span'))
  count.className = 'count'
  GM.getValue('myalbums', '{}').then(function (str) {
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
          <a target="_blank" href="${url}" class="item-link">
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

  const firefox = navigator.userAgent.indexOf('Chrome') === -1

  const playbutton = document.querySelector('#trackInfoInner .playbutton')
  const volumeButton = playbutton.cloneNode(true)
  document.querySelector('#trackInfoInner .inline_player').appendChild(volumeButton)
  volumeButton.classList.replace('playbutton', 'volumeButton')
  volumeButton.style.width = playbutton.clientWidth + 'px'
  const volumeSymbol = volumeButton.appendChild(document.createElement('div'))
  volumeSymbol.className = 'volumeSymbol'
  volumeSymbol.appendChild(document.createTextNode(firefox ? '\u23F2' : '\uD83D\uDD5B'))

  const progbar = document.querySelector('#trackInfoInner .progbar_cell .progbar')
  const volumeBar = progbar.cloneNode(true)
  document.querySelector('#trackInfoInner .inline_player').appendChild(volumeBar)
  volumeBar.classList.add('volumeControl')
  volumeBar.style.width = progbar.clientWidth + 'px'
  const thumb = volumeBar.querySelector('.thumb')
  thumb.setAttribute('id', 'deluxe_thumb')
  const progbarFill = volumeBar.querySelector('.progbar_fill')

  const volumeLabel = document.createElement('div')
  document.querySelector('#trackInfoInner .inline_player').appendChild(volumeLabel)
  volumeLabel.classList.add('volumeLabel')

  let dragging = false
  let dragPos
  const width100 = volumeBar.clientWidth - (thumb.clientWidth + 2) // 2px border
  const rot0 = firefox ? -90 : -180
  const rot100 = firefox ? 265 - rot0 : 350
  const blue0 = 180
  const blue100 = 75
  const green0 = 90
  const green100 = 100
  const audioAlbumPage = document.querySelector('audio')
  const volumeBarPos = volumeBar.getBoundingClientRect().left

  const displayVolume = function () {
    const level = audioAlbumPage.volume
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

  thumb.addEventListener('mousedown', function (ev) {
    if (ev.button === 0) {
      dragging = true
      dragPos = ev.offsetX
    }
  })
  volumeBar.addEventListener('mouseup', function (ev) {
    if (ev.button !== 0) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()

    if (!dragging) {
      // Click on volume bar without dragging:
      audio.muted = false
      audio.volume = Math.max(0.0, Math.min(1.0, (ev.pageX - volumeBarPos) / width100))
      displayVolume()
    }
    dragging = false
    GM.setValue('volume', audio.volume)
  })
  document.addEventListener('mouseup', function (ev) {
    if (ev.button === 0 && dragging) {
      dragging = false
      ev.preventDefault()
      ev.stopPropagation()
      GM.setValue('volume', audioAlbumPage.volume)
    }
  })
  document.addEventListener('mousemove', function (ev) {
    if (ev.button === 0 && dragging) {
      ev.preventDefault()
      ev.stopPropagation()
      audioAlbumPage.muted = false
      audioAlbumPage.volume = Math.max(0.0, Math.min(1.0, ((ev.pageX - volumeBarPos) - dragPos) / width100))
      displayVolume()
    }
  })
  const onWheel = function (ev) {
    ev.preventDefault()
    const direction = Math.min(Math.max(-1.0, ev.deltaY), 1.0)
    audioAlbumPage.volume = Math.min(Math.max(0.0, audioAlbumPage.volume - 0.05 * direction), 1.0)
    displayVolume()
    GM.setValue('volume', audio.volume)
  }
  volumeButton.addEventListener('wheel', onWheel, false)
  volumeBar.addEventListener('wheel', onWheel, false)
  volumeButton.addEventListener('click', function (ev) {
    if (audioAlbumPage.volume < 0.01) {
      if ('lastvolume' in audioAlbumPage.dataset && audioAlbumPage.dataset.lastvolume) {
        audioAlbumPage.volume = audioAlbumPage.dataset.lastvolume
        GM.setValue('volume', audioAlbumPage.volume)
      } else {
        audioAlbumPage.volume = 1.0
      }
    } else {
      audioAlbumPage.dataset.lastvolume = audioAlbumPage.volume
      audioAlbumPage.volume = 0.0
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

if (document.querySelector('.music-grid .music-grid-item a[href^="/album/"] img')) {
  // Discography page
  makeAlbumCoversGreat()
}

if (document.querySelector('.inline_player')) {
  // Album page with player
  removeTheTimeHasComeToOpenThyHeartWallet()
  window.setTimeout(addVolumeBarToAlbumPage, 3000)
}

if (document.querySelector('.share-panel-wrapper-desktop')) {
  // Album page with Share,Embed,Wishlist links
  addListenedButtonToCollectControls()
  if (document.location.hash === '#collect-wishlist') {
    clickAddToWishlist()
  }
}

if (document.querySelector('ol#grid-tabs li') && document.querySelector('.fan-bio-pic-upload-container')) {
  const listenedTabLink = makeListenedListTabLink()
  if (document.location.hash === '#listened-tab') {
    window.setTimeout(function () {
      document.querySelector('#grid-tabs .active').classList.remove('active')
      document.querySelector('#grids .grid.active').classList.remove('active')
      listenedTabLink.classList.add('active')
      listenedTabLink.click()
    }, 500)
  }
}

restoreVolume()

makeAlbumLinksGreat()
