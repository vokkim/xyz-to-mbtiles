#!/usr/bin/env node
const _ = require('lodash')
const program = require('commander')
const Promise = require('bluebird')
const TmsToMbtiles = require('./src/tms-to-mbtiles')

const cmd = program
  .option('--output [mbtiles]', 'Output file')
  .option('--zoom [zoom]', 'Zoom level')
  .option('--minzoom [minzoom]', 'Min zoom level')
  .option('--maxzoom [maxzoom]', 'Max zoom level')
  .option('--concurrency [concurrency]', 'Number of concurrent requests')
  .option('--retry [retry]', 'Retry count to fetch for failed tiles')
  .option('--input [url]', 'tilemap URL')
  .option('--bbox [w s e n]', 'Latitude and longitude values, eg. "23.411 59.731 26.850 60.562"')
  .option('--header [header]', 'Header, eg. "Referer:https//mywebapp.com/', (val, memo) => memo.concat([val]), [])
  .option('--token [token]', 'Optional token for tilemap URL')
  .parse(process.argv)

if (!cmd.output) {
  throw 'Missing output file!'
}

if (_.isEmpty(cmd.bbox)) {
  throw 'Missing BBOX!'
}

if (!cmd.input) {
  throw 'Missing input URL!'
}

function parseHeaders() {
  if (!cmd.header) {
    return {}
  } else {
    const headers = _(cmd.header)
      .map(header => {
        var i = header.indexOf(':')
        return [_.trim(header.slice(0,i)), _.trim(header.slice(i+1))]
      })
      .value()
    return _.fromPairs(headers)
  }
}

const {lat, long, minzoom, maxzoom, output, input, token, retry, concurrency} = cmd
const layer = cmd.layer
const bbox = cmd.bbox.split(/[\s,]/).map(parseFloat)
console.log('Requested bounds:', bbox)
const zoom = parseInt(cmd.zoom)
const headers = parseHeaders()
console.log('Headers: ', headers)
TmsToMbtiles({
  mbtilesFile: output,
  tilemapUrl: input,
  token: token,
  layer,
  minzoom: parseInt(minzoom) || cmd.zoom,
  maxzoom: parseInt(maxzoom) || cmd.zoom,
  concurrency: parseInt(concurrency) || 15,
  bbox,
  headers,
  retryOnErrors: parseInt(retry) || 0
})
