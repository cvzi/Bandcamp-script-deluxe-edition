import config from './rollup.config.js'
const pkg = require('./package.json')
const CleanCSS = require('clean-css')
const { createFilter } = require('rollup-pluginutils')

// No source mapping for CSS files
function importText (options = {}) {
  const filter = createFilter(options.include, options.exclude)
  return {
    name: 'importText',
    transform: function transform (code, id) {
      if (filter(id)) {
        if (options.css && id.endsWith('.css')) {
          const cleanCss = new CleanCSS().minify(code)
          code = cleanCss.styles
        }
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: { mappings: '' }
        }
      }
    }
  }
}

// Replace importText plugin
for (let i = 0; i < config.plugins.length; i++) {
  if ('name' in config.plugins[i] && config.plugins[i].name === 'importText') {
    config.plugins[i] = importText({ include: ['**/*.md', '**/*.css'], css: true })
  }
}

config.output.file = `dist/release-${pkg.version}.user.js`
config.output.sourcemap = false

export default config
