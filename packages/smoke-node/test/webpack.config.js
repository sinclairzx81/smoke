const { join, dirname, basename } = require('path')

const input  = join(__dirname,  'index.ts')
const output = join(__dirname, '../public/test/index.js')

module.exports = {
  entry: input,
  output: {
    filename: basename(output),
    path: dirname(output)
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'ts-loader', exclude: /node_modules/ }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  }
}