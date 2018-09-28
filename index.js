'use strict'
var fs = require('fs-extra')
var glob = require('glob')
var path = require('path')
var crypto = require('crypto')
var helper = require('./utils/helper')
var log = require('./utils/log')

class RubickI18nWebpackPlugin {
  constructor(options) {
    options = options || {}
    this.isDev = process.env.NODE_ENV !== 'production'
    this.entry = options.entry
    this.manifestBase = options.manifestBase
    this.outputDir = options.outputDir
    this.translates = {}
    this.assetsToEmit = {}
    this.prevTimestamps = {}
    this.startTime = Date.now()
    this.fileDependencies = []
    this.localsPrefix = ['zh_cn', 'en']
    this.localsPrefix.forEach(local => {
      this.translates[local] = {}
    })
  }

  apply(compiler) {
    const emitDependencies = (compilation, done) => {
      // register dependencies at webpack
      if (compilation.fileDependencies.add) {
        // webpack@4
        this.fileDependencies.forEach(compilation.fileDependencies.add, compilation.fileDependencies)
      } else {
        compilation.fileDependencies = compilation.fileDependencies.concat(this.fileDependencies)
      }
      this.emitGeneratedFiles(compilation);

      return done()
    }

    const compile = (compilation, done) => {
      if (!this.dependenciesUpdated(compilation)) {
        return done()
      }
      this.localsPrefix.forEach(local => {
        this.translates[local] = {}
      })
      this.compileAllEntryFiles(compilation.compiler.outputPath, done)
      return undefined
    }
    // webpack 4 support
    if (compiler.hooks) {
      compiler.hooks.make.tapAsync('RubickI18nWebpackPlugin', compile)
      compiler.hooks.emit.tapAsync('RubickI18nWebpackPlugin', emitDependencies)
    } else {
      compiler.plugin('make', compile)
      compiler.plugin('emit', emitDependencies)
    }
  }

  dependenciesUpdated(compilation) {
    // NOTE: fileTimestamps will be an `object` or `Map` depending on the webpack version
    const fileTimestamps = compilation.fileTimestamps
    const fileNames = fileTimestamps.has ? Array.from(fileTimestamps.keys()) : Object.keys(fileTimestamps)
    const changedFiles = fileNames.filter((watchfile) => {
      const prevTimestamp = this.prevTimestamps[watchfile]
      const nextTimestamp = fileTimestamps.has ? fileTimestamps.get(watchfile) : fileTimestamps[watchfile]
      this.prevTimestamps[watchfile] = nextTimestamp
      return (prevTimestamp || this.startTime) < (nextTimestamp || Infinity)
    })

    // diff may be zero on initial build, thus also rebuild if there are no changes
    return changedFiles.length === 0 || this.containsOwnDependency(changedFiles)
  }

  /**
   * @param  {Array} list     - list of changed files as absolute paths
   * @return {Boolean} true, if a file is a dependency of this i18n Plugin build
   */
  containsOwnDependency(list) {
    for (let i = 0; i < list.length; i += 1) {
      if (this.fileDependencies.includes(list[i])) {
        return true
      }
    }
    return false
  }

  /**
       *  compile entry files
       *  @param {string} outputPath -
       */
  compileAllEntryFiles(outputPath, done) {
    glob(this.entry.length === 1 ? `${this.entry.join(',')}{/**/*,}` : `{${this.entry.join(',')}}{/**/*,}`, (err, entryFilesArray) => {
      if (err) {
        throw err
      }
      if (entryFilesArray.length === 0) {
        log.warn(`no valid entry files found for ${this.entry} -- aborting`)
        return
      }
      entryFilesArray.forEach((filepath) => this.compileEntryFile(filepath))
      this.distI18nFile(outputPath)
      // enforce new line after plugin has finished
      done()
    })
  }

  /**
       *  wirte **.i18n.json and manifest.json to output directory
       *  @param {string} outputDir -
       */
  distI18nFile(outputPath) {
    var manifestJson = {}
    fs.emptyDirSync(this.outputDir)
    if (this.isDev) {
      this.checkMissingKey()
    }
    this.localsPrefix.forEach(key => {
      var contentString = JSON.stringify(this.translates[key])
      var baseName = this.isDev ? '.dev.json' : `.${this.hasherContentString(contentString)}.json`
      manifestJson[key] = `${this.manifestBase}/${key}${baseName}`
      var targetFilepath = `${this.outputDir}/${key}${baseName}`
      this.distFileFun(targetFilepath, outputPath, contentString)
    })
    var manifestFilePath = `${this.outputDir}/manifest.json`
    this.distFileFun(manifestFilePath, outputPath, JSON.stringify(manifestJson))
    this.translates = Object.assign({}, this.translates)
  }

  distFileFun(targetFilepath, outputPath, result) {
    //test
    if (targetFilepath.includes(outputPath)) {
      // change the destination path relative to webpacks output folder and emit it via webpack
      targetFilepath = targetFilepath.replace(outputPath, "").replace(/^\/*/, "");
      this.assetsToEmit[targetFilepath] = {
        source: () => result,
        size: () => result.length
      };
    } else {
      // @legacy: if the filepath lies outside the actual webpack destination folder, simply write that file.
      // There is no wds-support here, because of watched assets being emitted again
      fs.outputFileSync(targetFilepath, result, "utf-8");
    }
  }

  duplicatKeyCheck(baseTrans, newTrans, filePath) {
    var duplicationKeys = helper.intersection(Object.keys(baseTrans), Object.keys(newTrans))
    if (duplicationKeys.length) {
      log.warn(`${filePath} has translation key duplicates: ${duplicationKeys.join(', ')} `)
    }
  }

  checkMissingKey() {
    var missingKey = helper.difference(Object.keys(this.translates['en']), Object.keys(this.translates['zh_cn']))
    if (missingKey.length) {
      log.warn(`has translation key missing: ${missingKey.join(', ')} `)
    }
  }

  hasherContentString(contentString) {
    const hasher = crypto.createHash('md5')
    hasher.update(contentString)
    // 6 digits should be enough
    return hasher.digest('hex').substr(0, 6)
  }

  compileEntryFile(entryFile) {
    try {
      this.fileDependencies.push(entryFile)
      var content = JSON.parse(fs.readFileSync(entryFile, 'utf-8'))
      this.localsPrefix.forEach(local => {
        if (path.basename(entryFile).indexOf(local) !== -1) {
          if (this.isDev) {
            this.duplicatKeyCheck(this.translates[local], content, entryFile)
          }
          Object.assign(this.translates[local], content)
        }
      })
    } catch (e) {
      log.error(`invalid json file ${entryFile}`)
    }
  }

  registerGeneratedFile(filepath, content) {
    this.assetsToEmit[path.basename(filepath)] = {
      source: () => content,
      size: () => content.length
    };
  }

  /**
   * Resets list of generated files
   */
  clearGeneratedFiles() {
    this.assetsToEmit = {};
  }

  /**
   * Notifies webpack-dev-server of generated files
   * @param  {Compilation} compilation
   */
  emitGeneratedFiles(compilation) {
    Object.keys(this.assetsToEmit).forEach((filename) => {
      compilation.assets[filename] = this.assetsToEmit[filename];
    });
  }
}

module.exports = RubickI18nWebpackPlugin
