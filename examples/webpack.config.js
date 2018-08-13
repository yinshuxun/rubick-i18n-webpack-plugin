const RubickI18nWebpackPlugin = require('../index')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
console.log(path.resolve(__dirname))

const cwd = process.cwd()

module.exports = {
  mode: 'development',
  entry: {
    app: `${cwd}/examples/static/app.js`
  },
  output: {
    path: `${cwd}/examples/dist`,
    filename: 'app.js'
  },
  plugins: [
    new RubickI18nWebpackPlugin({
      entry: [`${cwd}/examples/static/app/**/*.i18n.json`, `${cwd}/examples/static/app_user/**/*.i18n.json`],
      outputDir: `${cwd}/examples/static/assets/i18n`,
      manifestBase: '/static/assets/i18n'
    }),
    new HtmlWebpackPlugin({
      template: `${cwd}/examples/static/index.html`,
      alwaysWriteToDisk: true,
      showErrors: true
    })
  ],
  devServer: {
    port: 9000,
    watchOptions: {
      poll: 1000,
      ignored: /node_modules/
    }
  }
}
