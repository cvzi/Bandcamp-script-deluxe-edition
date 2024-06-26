import config, { importText, importTextOptions } from './rollup.config.mjs'
import pkg from './package.json' with { type: 'json' }

// Replace importText plugin
for (let i = 0; i < config.plugins.length; i++) {
  if ('name' in config.plugins[i] && config.plugins[i].name === 'importText') {
    importTextOptions.release = true
    config.plugins[i] = importText(importTextOptions)
  }
}

config.output.file = `dist/release-${pkg.version}.user.js`
config.output.sourcemap = false

export default config
