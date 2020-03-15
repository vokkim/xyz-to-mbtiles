const request = require('request')
const _ = require('lodash')
const fs = require('fs')
const url = require('url')
const Promise = require('bluebird')
const HttpAgent = require('agentkeepalive')
const {longitudeToTileColumn, latitudeToTileRow, tileColumnToLongitude, tileRowToLatitude} = require('./utils')
const mbtilesDb = require('./mbtiles-db')
let allErrors = []

module.exports = function({mbtilesFile, tilemapUrl, minzoom, maxzoom, bbox, headers, token, retryOnErrors, concurrency, format}) {
  const keepaliveAgent = tilemapUrl.includes('https') ? new HttpAgent.HttpsAgent({maxSockets: concurrency}) : new HttpAgent({maxSockets: concurrency})
  const db = mbtilesDb(mbtilesFile)
  db.initTables()

  db.createMetadata({description: '', bbox, minzoom, maxzoom, format})

  function getAllZoomLevels(retryCount) {
    if (!minzoom || !maxzoom || maxzoom < minzoom) {
      const e = `Bad zoom configs: ${JSON.stringify({minzoom, maxzoom})}`
      throw new Error(e)
    }
    const previousErrors = _.cloneDeep(allErrors)
    cleanErrors(mbtilesFile + '.errors')
    return Promise.mapSeries(_.range(minzoom, maxzoom+1), z => getTiles({zoom: z, bbox, onlyErrors: retryCount !== 0, previousErrors}))
      .then(result => {
        if (_.isEmpty(allErrors) || retryCount >= retryOnErrors) {
          console.log('DONE')
          console.log(`Remaining errors: ${allErrors.length}`)
        } else {
          console.log(`First pass DONE, retrying errors: ${allErrors.length}`)
          return getAllZoomLevels(retryCount + 1)
        }
      })
  }

  getAllZoomLevels(0)


  function getTiles({zoom, bbox, onlyErrors, previousErrors}) {
    const rows = determineRowsToFetch(zoom, bbox)
    const allColumns = determineColumnsToFetch(zoom, bbox)
    if (rows.length === 0 || allColumns.length === 0) {
      throw 'BBOX too small'
    }
    !onlyErrors && console.log(`Fetching level ${zoom} tiles: ${_.first(allColumns)}-${_.last(allColumns)} x ${_.first(rows)}-${_.last(rows)}`)
    !onlyErrors && console.log(`Total size ${allColumns.length} x ${rows.length} = ${allColumns.length * rows.length} tiles`)
    const tilesDone = Promise.mapSeries(rows, (row, i) => {
      const columns = onlyErrors ? _(previousErrors).filter(e => e.zoom === zoom && e.row === row).map('column').value() : allColumns
      return fetchRow(row, columns)
        .then(columns => {
          console.log(`Row ${zoom} ${i+1}/${rows.length} done`)
          const errors = _.filter(columns, c => c.error)
          const success = _.filter(columns, c => !c.error)
          if (!_.isEmpty(errors)) {
            allErrors = allErrors.concat(errors)
            appendToErrorsFile({errors: errors, file: mbtilesFile + '.errors'})
            console.log('Errors now ', allErrors.length)
          }
          return success
        })
        .then(db.insertTiles)
    })
    return tilesDone

    function fetchRow(row, columns) {
      return Promise.all(_.map(columns, col => fetchSingleTile(row, col)))
    }

    function fetchSingleTile(row, column) {
      const tileUrl = createTileUrl({
        tilemapUrl,
        zoom,
        row,
        column,
        token
      })

      const source = (i) => {
        return new Promise((resolve, reject) => {
          request({uri: tileUrl, agent: keepaliveAgent, encoding: null, headers, gzip: true}, (error, response, body) => {
            if (error) {
              console.log(`Error! ${zoom}/${column}/${row}`, _.get(error, 'code', error))
              return resolve({error: true, zoom, column, row})
            }
            if (!response) {
              console.log(`No response! ${zoom}/${column}/${row}`)
              return resolve({error: true, zoom, column, row})
            }
            if (response.statusCode !== 200) {
              console.log(`Fail ${response.statusCode} ${zoom}/${column}/${row}`)
              return resolve({error: true, zoom, column, row})
            }
            const y = (1 << zoom) - 1 - row // mbtiles needs flipped y coordinate
            resolve({z: zoom, y, x: column, data: response.body})
          })
        })
      }

      return retry({source, retries: 1})
    }
  }
}

function determineRowsToFetch(zoom, requestedBbox) {
  function getRow(lat) {
    return latitudeToTileRow(lat, zoom)
  }
  const row0 = getRow(requestedBbox[3])
  const row1 = getRow(requestedBbox[1]) + 1
  return _.range(row0, row1)
}

function determineColumnsToFetch(zoom, requestedBbox) {
  function getColumn(lon) {
    return longitudeToTileColumn(lon, zoom)
  }
  const col0 = getColumn(requestedBbox[0])
  const col1 = getColumn(requestedBbox[2]) + 1
  return _.range(col0, col1)
}

function createTileUrl({tilemapUrl, zoom, row, column, token}) {
  return tilemapUrl.replace('{z}', zoom).replace('{x}', column).replace('{y}', row).replace('{token}', token)
}


function retry({source, retries = 0}) {
  var retriesDone = 0
  function run() {
    const result = source(retriesDone + 1)
    return result.catch(e => {
      console.log('Retry failed', retriesDone)
      if (retriesDone < retries) {
        retriesDone = retriesDone + 1
        return run()
      } else {
        return Promise.reject(e)
      }
    })
  }
  return run()
}
function cleanErrors(file) {
  allErrors = []
  try {
    fs.unlinkSync(file)
  } catch (e) {}
}
function appendToErrorsFile({errors, file}) {
  fs.appendFileSync(file, _.map(errors, e => `${e.zoom}/${e.column}/${e.row}`).join('\n') + '\n')
}
