glob = require 'glob'
path = require 'path'
fs = require 'fs'
async = require 'async'
assert = require 'assert'
PNG = require 'png-js'
{PSD} = require "../../lib/psd"

module.exports = {
  tearDown: (done)->
    if fs.existsSync TMP_FILE
      fs.unlinkSync TMP_FILE
    done()
}

metaCommands = [
  "Title"
  "ExportsTo"
  "Size"
]

toCamelCase = (attr) ->
  attr.replace /_([a-z])/gi, (s, group) -> group.toUpperCase()

isMetaCommand = (v) -> v in metaCommands

compareImages =  (test, expectedPath, actualPath, cb) ->
  async.parallel([
      (cb) ->
        PNG.decode expectedPath, (pixels) -> cb(null, pixels)
      , (cb) ->
        PNG.decode actualPath,   (pixels) -> cb(null, pixels)
    ], (err, result) ->
      test.deepEqual result[0], result[1], "Output file matches control"
      cb()
  )

performMetaAssertion = (test, obj, command, v, cb) ->
  switch command
    when "_size"
      test.equal val, obj[key].length for own key, val of v
      cb()
    when "_exports_to"
      test.ok obj.image?
      obj.image.toFileSync TMP_FILE
      @compareImages test, path.resolve(ROOT, v), TMP_FILE, cb
    else cb()

assertAttribute = (test, obj, k, v)->
  return (cb)->
    k = toCamelCase k

    if isMetaCommand(k)
      performMetaAssertion test, obj, k, v, cb
    else
      assert.ok obj[k], "Attribute exists: #{k}"
      if Array.isArray v
        index = 0
        async.eachSeries v, (i, cb)->
          assertAttributes test, obj[k][index++], i, cb
        , cb
      else if typeof v is "object"
        assertAttributes test, obj[k], v, cb
      else if typeof v is "string"
        test.equal v, obj[k], "Attribute #{v} === #{obj[k]}"
        cb()
      else cb()


assertAttributes = (test, obj, hash = {}, cb) ->
  tests = []

  for k, v of hash
    tests.push assertAttribute(test, obj, k, v)

  async.series tests, cb

TMP_FILE = path.resolve __dirname, "out.png"
ROOT = path.resolve __dirname, "../psd.tp/"

files = glob.sync "**/*.json", {cwd: ROOT}
files?.forEach (file)->
  module.exports[file.substr(0, file.length-5)] = (test)->

    testData = require(path.resolve(ROOT, file))

    test.ok testData._file, "Input file provided"

    psd = PSD.fromFile path.resolve ROOT, testData._file
    psd.parse()

    test.ok psd.header, "Header successfully parsed"
    test.ok psd.layers, "Layers successfully parsed"
    test.ok psd.image, "Image successfully parsed"

    psd.toFileSync TMP_FILE

    async.series([
      (cb)->
        if testData._exports_to?
          compareImages test, path.resolve(ROOT, testData._exports_to), TMP_FILE, cb
        else cb()
      (cb)-> 
        assertAttributes test, psd, testData.psd, cb
    ], (err)->
      if err then throw new Error(err)
      test.done()
    )