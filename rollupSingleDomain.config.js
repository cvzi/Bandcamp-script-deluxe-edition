import metablock from 'rollup-plugin-userscript-metablock'
import config from './rollupRelease.config.js'
const pkg = require('./package.json')
const meta = require('./meta.json')

config.output.file = `dist/release-${pkg.version}-bandcamp.com-only.user.js`

for (let i = 0; i < config.plugins.length; i++) {
  if ('renderChunk' in config.plugins[i] && !('name' in config.plugins[i])) {
    config.plugins[i] = metablock({
      file: './meta.json',
      override: {
        name: 'Bandcamp script (bandcamp.com only)',
        version: pkg.version,
        description: pkg.description,
        homepage: pkg.homepage,
        author: pkg.author,
        license: pkg.license,
        connect: meta.connect.filter(s => s !== '*'),
        include: [
          'https://bandcamp.com/',
          'https://*.bandcamp.com/*',
          'https://campexplorer.io/'
        ]
      }
    })
  }
}

export default config
