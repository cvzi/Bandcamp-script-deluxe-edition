/*
Compatibility adaptions for Violentmonkey https://github.com/violentmonkey/violentmonkey
*/

if (typeof GM.registerMenuCommand !== 'function') {
  if (typeof GM_registerMenuCommand === 'function') {
    GM.registerMenuCommand = GM_registerMenuCommand
  } else {
    console.warn('Neither GM.registerMenuCommand nor GM_registerMenuCommand are available')
  }
}
