const gulp = require('gulp')
const crypto = require('crypto')
const glob = require('glob')
const fs = require('fs')
const File = require('vinyl')
const path = require('path')
const _ = require('lodash')
const mergeStream = require('merge2')

// Load gulp plugins magically
const _gulp = require('gulp-load-plugins')()

const i18nPathBase = 'static/assets/i18n'
const gutil = _gulp.util
const env = gutil.env.type

const isDev = env !== 'production' && process.argv[2] !== 'build'

gulp.task('clean', () =>
  gulp
    .src(['static/assets/**/*.*', '.awcache/*'], { read: true })
    .pipe(_gulp.clean({ force: true }))
)

gulp.task('clean:translation', () =>
  gulp
    .src(['static/assets/i18n/*.*.json'], { read: true })
    .pipe(_gulp.clean({ force: true }))
)

gulp.task('watch:translation', () =>
  gulp.watch(
    [
      'static/app/**/*.i18n.json',
      'static/app2/**/*.i18n.json',
      'static/app_user/**/*.i18n.json'
    ],
    ['translation:build']
  )
)

gulp.task('translation:manifest', buildTranslationManifest)

gulp.task('translation:build', ['clean:translation'], () =>
  mergeStream(buildTranslationFile('zh_cn'), buildTranslationFile('en'))
)

gulp.task('translation', ['translation:build'], buildTranslationManifest)

// get all translateKeys
gulp.task('getUselessKeys', getUselessKeys)

function getUselessKeys () {
  if (!isDev) {
    return
  }
  let translationKeys = []
  let fileString = ''

  const ignoreStartWith = [
    'nav_',
    'catalog_',
    'status_',
    'cloud_',
    'build_',
    'event_',
    'image_',
    'integration_',
    'pipeline_',
    'job_',
    'region_',
    'load_balancer_',
    'unit_',
    'metric_',
    'storage_volume_',
    'account_status_'
  ]

  glob('static/**/*.?(js|ts|html)', (er, files) => {
    files.forEach(file => {
      fileString += _.trim(fs.readFileSync(file, 'utf-8'))
    })
  })

  gulp
    .src([
      'static/app/**/*.i18n.json',
      'static/app2/**/*.i18n.json',
      'static/app_user/**/*.i18n.json'
    ])
    .pipe(_gulp.plumber())
    .pipe(
      _gulp.mergeJson({
        fileName: '',
        edit: parsedJson => {
          translationKeys = _.uniq(
            translationKeys.concat(Object.keys(parsedJson))
          )
          return parsedJson
        }
      })
    )
    .pipe(
      _gulp.tap(() => {
        const ignoredKeys = translationKeys.filter(key => {
          if (
            !fileString.match("'" + key + "'") &&
            !fileString.match('"' + key + '"') &&
            (ignoreStartWith.some(str => key.startsWith(str)) ||
              key.match(/%\(/))
          ) {
            return true
          }
        })
        const uselessKeys = translationKeys.filter(key => {
          if (
            !fileString.match("'" + key + "'") &&
            !fileString.match('"' + key + '"') &&
            !ignoredKeys.includes(key)
          ) {
            return true
          }
        })
        fs.writeFileSync(
          './uselessTranslations/uselessKeys.txt',
          uselessKeys.join(',\n')
        )
        fs.writeFileSync(
          './uselessTranslations/ignoredKeys.txt',
          ignoredKeys.join(',\n')
        )
      })
    )
}

gulp.task('build', ['translation'])

gulp.task('default', ['translation', 'watch:translation'], next => next())

/**
 * Group all translation files for a local key and add a hash to the output
 * @param localKey
 */
function buildTranslationFile (localKey) {
  // Existing translation keys:
  const keys = []
  return gulp
    .src([
      `static/app/**/${localKey}.i18n.json`,
      `static/app2/**/${localKey}.i18n.json`,
      `static/app_user/**/${localKey}.i18n.json`
    ])
    .pipe(_gulp.plumber())
    .pipe(
      _gulp.mergeJson({
        fileName: `${localKey}`,
        edit: (parsedJson, file) => {
          // Log any duplicate keys here:
          const newKeys = Object.keys(parsedJson)
          const duplicates = _.intersection(newKeys, keys)
          if (!_.isEmpty(duplicates)) {
            gutil.log(
              gutil.colors.red(
                `${file.path} has translation key duplicates: ${duplicates}`
              )
            )
            gutil.log(gutil.colors.bgRed(duplicates.join(', ')))
          }
          Array.prototype.push.apply(keys, Object.keys(parsedJson))
          return parsedJson
        }
      })
    )
    .pipe(
      _gulp.map(file => {
        if (!isDev) {
          const contentString = file.contents.toString('utf8')
          const hasher = crypto.createHash('md5')
          hasher.update(contentString)
          // 6 digits should be enough
          const hash = hasher.digest('hex').substr(0, 6)
          file.basename += `.${hash}.json`
        } else {
          file.basename += '.dev.json'
        }
        return file
      })
    )
    .pipe(_gulp.plumber.stop())
    .pipe(gulp.dest(i18nPathBase))
}

function buildTranslationManifest () {
  const localeToKeys = {} // translation locale -> all keys
  let allKeys = []
  return gulp
    .src(`${i18nPathBase}/*.*.json`)
    .pipe(
      _gulp.map(file => {
        const [key] = path.basename(file.path).split('.')
        const kv = {}
        kv[key] = '/' + path.relative(__dirname, file.path)
        localeToKeys[key] = Object.keys(
          JSON.parse(file.contents.toString('utf8'))
        )
        allKeys = _.union(allKeys, localeToKeys[key])
        // Resulting manifest file should be:
        // {zh_cn: path, en: path}
        return new File({
          contents: Buffer.from(JSON.stringify(kv))
        })
      })
    )
    .pipe(
      _gulp.mergeJson({
        fileName: 'manifest.json'
      })
    )
    .pipe(gulp.dest(i18nPathBase))
    .pipe(
      _gulp.tap(() => {
        Object.entries(localeToKeys).forEach(([localeKey, translationKeys]) => {
          const missingKeys = _.difference(allKeys, translationKeys)
          if (missingKeys.length > 0) {
            gutil.log(
              gutil.colors.yellow(
                `Locale ${gutil.colors.bgRed(
                  localeKey
                )} is missing keys: ${missingKeys.join(', ')}`
              )
            )
          }
        })
      })
    )
}

gulp.task('demo', ['translation', 'watch:translation'])

gulp.task('demo-build', ['translation'])
