# rubick-i18n-webpack-plugin
i18n plugin for alauda rubick

# Usage
```
npm install rubick-i18n-webpack-plugin --save-dev

new RubickI18nWebpackPlugin({
      entry: [`${cwd}/examples/static/app/**/*.i18n.json`, `${cwd}/examples/static/app_user/**/*.i18n.json`],
      outputDir: `${cwd}/examples/static/assets/i18n`,
      manifestBase: '/static/assets/i18n'
}),

```

    