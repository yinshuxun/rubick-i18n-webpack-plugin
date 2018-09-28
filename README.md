> rubick i18n package 

`npm install rubick-i18n-webpack-plugin --save-dev`


[![NPM](https://img.shields.io/npm/v/angular-translate.svg)](https://www.npmjs.com/package/angular-translate) 
![License](https://img.shields.io/npm/l/angular-translate.svg) 
![Code Coverage](https://img.shields.io/codeclimate/coverage/github/angular-translate/angular-translate.svg)

# Usage
In your webpack config register and setup the plugin


```
var RubickI18nWebpackPlugin = require('rubick-i18n-webpack-plugin');

var webpackConfig = {
      plugins:[
            new RubickI18nWebpackPlugin({
                  entry: [`${cwd}/examples/static/app/**/*.i18n.json`, `${cwd}/examples/static/app_user/**/*.i18n.json`],
                  outputDir: `${cwd}/examples/static/assets/i18n`,
                  manifestBase: '/static/assets/i18n'
            })
      ]
}
```

    