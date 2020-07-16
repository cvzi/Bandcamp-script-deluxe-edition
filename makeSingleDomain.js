var fs = require('fs')
fs.readFile(process.argv[2], 'utf8', function (err, content) {
  if (err) {
    console.log(err)
    return process.exit(1)
  }
  content = content.replace(/Bandcamp script \(Deluxe Edition\)/g, 'Bandcamp script (bandcamp.com only)')
  content = content.replace(/\/\/ @connect\s+\*\n/gm, '')
  content = content.replace(/\/\/ @include(\s+)https:\/\/\*$/gm, `// @include$1https://bandcamp.com/*
// @include$1https://*.bandcamp.com/*
// @include$1https://campexplorer.io/`)
  fs.writeFile(process.argv[3], content, 'utf8', function (err) {
    if (err) {
      console.log(err)
      return process.exit(1)
    }
  })
})
