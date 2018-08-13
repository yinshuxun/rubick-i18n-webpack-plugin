'use strict'
var fs = require('fs-extra')
var glob = require('glob')
var crypto = require('crypto')
var helper = require('./utils/helper')
var log = require("./utils/log")

class RubickI18nWebpackPlugin {
    constructor(options) {
        options = options || {}
        this.isDev = process.env.NODE_ENV === 'development'
        this.entry = options.entry
        this.manifestBase = options.manifestBase
        this.outputDir = options.outputDir
        this.translates = {}
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
            return done()
        }

        const compile = (compilation, done) => {
            this.localsPrefix.forEach(local => {
                this.translates[local] = {}
            })
            this.compileAllEntryFiles(this.outputDir, done)
            return undefined
        }
        // webpack 4 support
        if (compiler.hooks) {
            compiler.hooks.make.tapAsync('HandlebarsRenderPlugin', compile)
            compiler.hooks.emit.tapAsync('HandlebarsRenderPlugin', emitDependencies)
        } else {
            compiler.plugin('make', compile)
            compiler.plugin('emit', emitDependencies)
        }
    }

    /**
       *  compile entry files
       *  @param {string} outputPathDir -
       */
    compileAllEntryFiles(outputPathDir, done) {
        glob(this.entry.length === 1 ? `${this.entry.join(',')}{/**/*,}` : `{${this.entry.join(',')}}{/**/*,}`, (err, entryFilesArray) => {
            if (err) {
                throw err
            }
            if (entryFilesArray.length === 0) {
                log.warn(`no valid entry files found for ${this.entry} -- aborting`)
                return
            }
            entryFilesArray.forEach((filepath) => this.compileEntryFile(filepath))
            this.distI18nFile(outputPathDir)
            // enforce new line after plugin has finished
            done()
        })
    }

    /**
       *  wirte **.i18n.json and manifest.json to output directory
       *  @param {string} outputDir -
       */
    distI18nFile(outputDir) {
        var manifestJson = {}
        fs.emptyDirSync(outputDir)
        if (this.isDev) {
            this.checkMissingKey()
        }
        this.localsPrefix.forEach(key => {
            var contentString = JSON.stringify(this.translates[key])
            var baseName = this.isDev ? '.dev.json' : `.${this.hasherContentString(contentString)}.json`
            manifestJson[key] = `${this.manifestBase}/${key}${baseName}`
            fs.writeFileSync(`${outputDir}/${key}${baseName}`, contentString)
        })
        fs.writeFileSync(`${outputDir}/manifest.json`, JSON.stringify(manifestJson))
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
                if (entryFile.indexOf(local) !== -1) {
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
}

module.exports = RubickI18nWebpackPlugin
