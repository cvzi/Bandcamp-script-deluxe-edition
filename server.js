const path = require('path')
const fs = require('fs')
const http = require('http')
const handler = require('serve-handler')
import { red, green, cyan, bold } from 'colorette'
const rollup = require('rollup')
const metablock = require('rollup-plugin-userscript-metablock')

const pkg = require('./package.json')
const meta = require('./meta.json')
import rollupConfig from './rollup.config.js'

console.log('👀 watch & serve 🤲\n###################\n')

const port = 8124
const destDir =  'dist/'
const devScriptInFile = 'dev.user.js'

const hyperlink = (url, title) => `\u001B]8;;${url}\u0007${title || url}\u001B]8;;\u0007`

fs.mkdir('dist/', { recursive: true }, () => null)

// Start web server
const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: destDir
  })
})
server.listen(port, () => {
  console.log(`Running webserver at ${hyperlink(`http://localhost:${port}`)}`)
})

// Create the userscript for development 'dist/dev.user.js'
const devScriptOutFile = path.join(destDir, devScriptInFile)
console.log(cyan(`generate development userscript ${bold('package.json')}, ${bold('meta.json')}, ${bold(devScriptInFile)} → ${bold(devScriptOutFile)}...`))
const devScriptContent = fs.readFileSync(devScriptInFile, 'utf8')
const grants = 'grant' in meta ? meta.grant : []
if (grants.indexOf('GM.xmlHttpRequest') === -1) {
  grants.push('GM.xmlHttpRequest')
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
    grant: grants
  }
})

const result = devMetablock.renderChunk(devScriptContent, null, {sourcemap:false})
const outContent = typeof result === 'string' ? result : result.code
fs.writeFileSync(devScriptOutFile, outContent)
console.log(green(`created ${bold(devScriptOutFile)}. Please install in Tampermonkey: `) + hyperlink(`http://localhost:${port}/${devScriptInFile}`))

// Start rollup watch
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
