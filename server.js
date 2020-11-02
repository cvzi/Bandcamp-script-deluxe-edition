import { red, green, cyan, bold } from 'colorette'
import rollupConfig from './rollup.config.js'
const path = require('path')
const fs = require('fs')

// Create the userscript for development 'dist/dev.user.js'
console.log(cyan(`generate [dev] userscript ${bold('package.json')}, ${bold('meta.json')}, ${bold('dev.user.js')} → ${bold('dist/dev.user.js')}...`))
const metablock = require('rollup-plugin-userscript-metablock')
const pkg = require('./package.json')
const meta = require('./meta.json')
const devScriptOutFile = 'dist/dev.user.js'
const devScriptInFile = 'dev.user.js'
const devScriptContent = fs.readFileSync(devScriptInFile, 'utf8')
const grants = 'grant' in meta ? meta.grant : []
if (grants.indexOf('GM.xmlHttpRequest') === -1) {
  grants.push('GM.xmlHttpRequest')
}
const connects = 'connect' in meta ? meta.connect : []
if (connects.indexOf('localhost') === -1) {
  connects.push('localhost')
}
const devMetablock = metablock({
  file: './meta.json',
  override: {
    name: pkg.name + ' [dev]',
    version: pkg.version,
    description: pkg.description,
    homepage: pkg.homepage,
    author: pkg.author,
    license: pkg.license,
    grant: grants,
    connect: connects
  }
})
const outContent = devMetablock.renderChunk(devScriptContent)
fs.writeFileSync(devScriptOutFile, outContent)
console.log(green(`created ${bold(devScriptOutFile)}. Please install in Tampermonkey http://localhost:8124/dev.user.js`))

// Start web server
const handler = require('serve-handler')
const http = require('http')

const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: 'dist/'
  })
})

server.listen(8124, () => {
  console.log('Running webserver at http://localhost:8124')
})

// Start rollup watch
const rollup = require('rollup')

const watcher = rollup.watch(rollupConfig)

watcher.on('event', event => {
  if (event.code === 'BUNDLE_START') {
    console.log(cyan(`bundles ${bold(event.input)} → ${bold(event.output.map(fullPath => path.relative(path.resolve(__dirname), fullPath)).join(', '))}...`))
  } else if (event.code === 'BUNDLE_END') {
    console.log(green(`created ${bold(event.output.map(fullPath => path.relative(path.resolve(__dirname), fullPath)).join(', '))} in ${event.duration}s`))
  } else if (event.code === 'ERROR') {
    console.log(bold(red('⚠ Error')))
    console.log(event.error)
  }
})

// stop watching
watcher.close()
