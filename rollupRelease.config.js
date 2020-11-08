import config from './rollup.config.js'
const pkg = require('./package.json')

config.output.file = `dist/release-${pkg.version}.user.js`
config.output.sourcemap = false

export default config
