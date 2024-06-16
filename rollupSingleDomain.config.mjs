import metablock from 'rollup-plugin-userscript-metablock'
import config from './rollupRelease.config.mjs'
import pkg from './package.json' with { type: 'json' }
import meta from './meta.json' with { type: 'json' }

config.output.file = 'dist/release-bandcamp.com-only.user.js'

for (let i = 0; i < config.plugins.length; i++) {
  if (config.plugins[i] instanceof Promise) {
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
        match: [
          'https://bandcamp.com/*',
          'https://*.bandcamp.com/*',
          'https://campexplorer.io/*'
        ]
      }
    })
  }
}

export default config
