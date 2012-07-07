fs = require 'fs'

{PSD} = require __dirname + '/../lib/psd.js'

PSD.DEBUG = true

if process.argv.length is 2
  console.log "Please specify an input file"
  process.exit()

psd = PSD.fromFile process.argv[2]
psd.parse()

data = psd.toJSON()

output = data.layerMask.layers[0].adjustments.typeTool.text.EngineData
index = output.indexOf("Embedded Image")
console.log output.charCodeAt index - 2

fs.writeFile __dirname + "/output.txt", output, (err) ->
  console.log "TypeTool data written to output.txt"