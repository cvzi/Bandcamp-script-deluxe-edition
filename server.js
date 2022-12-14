const { red, green, cyan, bold, italic } = require('colorette')
const { loadConfigFile } = require('rollup/dist/loadConfigFile.js')
const path = require('path')
const fs = require('fs')
const http = require('http')
const handler = require('serve-handler')
const rollup = require('rollup')
const metablock = require('rollup-plugin-userscript-metablock')
const assert = require('assert').strict
const util = require('util')

const pkg = require('./package.json')
const meta = require('./meta.json')

const httpGetStatus = util.promisify((url, cb) => http.get(url, (res) => cb(null, res.statusCode)))

console.log('👀 watch & serve 🤲\n###################\n')

const port = pkg.config.port
const destDir = 'dist/'
const devScriptInFile = 'dev.user.js'

const hyperlink = (url, title) => `\u001B]8;;${url}\u0007${title || url}\u001B]8;;\u0007`

fs.mkdir('dist/', { recursive: true }, () => null)

// Start web server
const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: '.'
  })
})
server.listen(port, () => {
  console.log(`Running webserver at ${hyperlink(`http://localhost:${port}`)}`)
})

// Create the userscript for development 'dist/dev.user.js'
const devScriptOutFile = path.join(destDir, devScriptInFile)
console.log(cyan(`generate development userscript ${bold('package.json')}, ${bold('meta.json')}, ${bold(devScriptInFile)} → ${bold(devScriptOutFile)}...`))
const devScriptContent = fs.readFileSync(devScriptInFile, 'utf8').replace(/%PORT%/gm, port.toString())
const grants = 'grant' in meta ? meta.grant : []
if (grants.indexOf('GM.xmlHttpRequest') === -1) {
  grants.push('GM.xmlHttpRequest')
}
if (grants.indexOf('GM.setValue') === -1) {
  grants.push('GM.setValue')
}
if (grants.indexOf('GM.getValue') === -1) {
  grants.push('GM.getValue')
}
const devMetablock = metablock({
  file: './meta.json',
  override: {
    name: meta.name + ' [dev]',
    version: pkg.version,
    description: pkg.description,
    homepage: pkg.homepage,
    author: pkg.author,
    license: pkg.license,
    grant: grants
  }
})

const result = devMetablock.renderChunk(devScriptContent, null, { sourcemap: false })
const outContent = typeof result === 'string' ? result : result.code
fs.writeFileSync(devScriptOutFile, outContent)
console.log(green(`created ${bold(devScriptOutFile)}. Please install in Tampermonkey: `) + hyperlink(`http://localhost:${port}/${destDir}${devScriptInFile}`))

let outFiles = []
loadConfigFile(path.resolve(__dirname, 'rollup.config.mjs')).then(
  async ({ options, warnings }) => {
    // Start rollup watch
    const watcher = rollup.watch(options)

    // Run tests
    if (process.argv.indexOf('--test') !== -1) {
      console.log(italic('\n###### Test Mode ######\n'))
      setTimeout(async function () {
        console.log(italic('Running tests...'))
        assert.equal(await httpGetStatus(`http://localhost:${port}/${destDir}${devScriptInFile}`), 200, `http://localhost:${port}/${destDir}${devScriptInFile}`)
        if (outFiles) {
          for (let i = 0; i < outFiles.length; i++) {
            const urlPath = outFiles[i].replace(/\\/, '/')
            console.log(`Checking http://localhost:${port}/${urlPath}`)
            assert.equal(await httpGetStatus(`http://localhost:${port}/${urlPath}`), 200, `http://localhost:${port}/${urlPath}`)
          }
        }
        console.log(italic('Stopping server and watcher after 10 seconds and exiting.'))
        watcher.close()
        server.close()
      }, 10000)
    }

    watcher.on('event', event => {
      if (event.code === 'BUNDLE_START') {
        console.log(cyan(`bundles ${bold(event.input)} → ${bold(event.output.map(fullPath => path.relative(path.resolve(__dirname), fullPath)).join(', '))}...`))
      } else if (event.code === 'BUNDLE_END') {
        outFiles = event.output.map(fullPath => path.relative(path.resolve(__dirname), fullPath))
        console.log(green(`created ${bold(event.output.map(fullPath => path.relative(path.resolve(__dirname), fullPath)).join(', '))} in ${event.duration}ms`))
      } else if (event.code === 'ERROR') {
        console.log(bold(red('⚠ Error')))
        console.log(event.error)
      }
      if ('result' in event && event.result) {
        event.result.close()
      }
    })

    // stop watching
    watcher.close()
  }
)
