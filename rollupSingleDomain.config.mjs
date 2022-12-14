import metablock from 'rollup-plugin-userscript-metablock'
import config from './rollupRelease.config.js'
import pkg from './package.json' assert { type: 'json' }
import meta from './meta.json' assert { type: 'json' }

config.output.file = 'dist/release-bandcamp.com-only.user.js'

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
          'https://bandcamp.com/*',
          'https://*.bandcamp.com/*',
          'https://campexplorer.io/'
        ]
      }
    })
  }
}

export default config
