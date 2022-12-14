import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import metablock from 'rollup-plugin-userscript-metablock'
import CleanCSS from 'clean-css'
import { createFilter } from 'rollup-pluginutils'
import path from 'path'
import fs from 'fs'
import pkg from './package.json' assert { type: 'json' }
const port = pkg.config.port

export function importText (options = {}) {
  // https://rollupjs.org/guide/en/#example-transformer
  const filter = createFilter(options.include, options.exclude)
  return {
    name: 'importText',
    transform: function transform (code, filePath) {
      if (filter(filePath)) {
        const fileNameLowerCase = filePath.toLowerCase()
        if (options.css && fileNameLowerCase.endsWith('.css')) {
          if (!options.release) {
            const files = {}
            // TODO use file:/// instead of localhost? does this work on chrome?
            files['http://localhost:' + port + '/' + path.relative('.', filePath).split('\\').join('/')] = { styles: code }
            const cleanCss = new CleanCSS({ sourceMap: true }).minify(files)
            const map = Buffer.from(cleanCss.sourceMap.toString(), 'binary').toString('base64')
            code = cleanCss.styles + '\n/*# sourceMappingURL=data:application/json;base64,' + map + ' */'
          } else {
            const cleanCss = new CleanCSS().minify(code)
            code = cleanCss.styles
          }
        } else if (fileNameLowerCase.endsWith('.png')) {
          code = `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`
        } else if (fileNameLowerCase.endsWith('.jpg') || fileNameLowerCase.endsWith('.jpeg')) {
          code = `data:image/jpeg;base64,${fs.readFileSync(filePath).toString('base64')}`
        }
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: { mappings: '' }
        }
      }
    }
  }
}
export const importTextOptions = { include: ['**/*.html', '**/*.css', '**/*.png', '**/*.jpg'], css: true }

fs.mkdir('dist/', { recursive: true }, () => null)
const banner = `\

// ==OpenUserJS==
// @author      cuzi
// ==/OpenUserJS==

/*
${fs.readFileSync('./LICENSE', 'utf8')}*/

/* globals React, ReactDOM */`

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.user.js',
    format: 'iife',
    name: 'rollupUserScript',
    banner,
    sourcemap: true,
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM'
    }
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      ENVIRONMENT: JSON.stringify('production'),
      preventAssignment: true
    }),
    importText(importTextOptions),
    nodeResolve({ extensions: ['.js', '.ts', '.tsx'] }),
    commonjs({
      include: [
        'node_modules/**'
      ],
      exclude: [
        'node_modules/process-es6/**'
      ]
    }),
    babel({ babelHelpers: 'bundled' }),
    metablock({
      file: './meta.json',
      override: {
        version: pkg.version,
        description: pkg.description,
        homepage: pkg.homepage,
        author: pkg.author,
        license: pkg.license
      }
    })
  ],
  external: id => /^react(-dom)?$/.test(id)
}
