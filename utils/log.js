var chalk = require('chalk')

function warn (s) {
  console.log(chalk.yellow('RubickI18nWebpackPlugin: ' + s))
}

function error (s) {
  console.log(chalk.red('RubickI18nWebpackPlugin: ' + s))
}

module.exports = {
  warn,
  error
}
