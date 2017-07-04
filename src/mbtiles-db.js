const sqlite3 = require('sqlite3')
const _ = require('lodash')
const Promise = require('bluebird')

function init(dbFile) {

  const db = new sqlite3.Database(dbFile)

  function insertTiles(tiles) {
    return new Promise((resolve, reject) => {
      db.serialize(function() {
        const preparedStatement = db.prepare("INSERT INTO tiles VALUES (?,?,?,?)")
        _.each(tiles, t => {
          if (t) {
            preparedStatement.run(t.z, t.x, t.y, t.data)
          }
        })
        preparedStatement.finalize(resolve)
      })
    })
  }

  function createMetadata({description, bbox, maxzoom, minzoom}) {
    console.log('Insert metadata ...')
    db.run('INSERT INTO metadata VALUES(?,?)', ['bounds', _.flatten(bbox).join(',')])
    db.run('INSERT INTO metadata VALUES(?,?)', ['maxzoom', maxzoom])
    db.run('INSERT INTO metadata VALUES(?,?)', ['minzoom', minzoom])
    db.run('INSERT INTO metadata VALUES(?,?)', ['name', `xyz-to-mbtiles`])
    db.run('INSERT INTO metadata VALUES(?,?)', ['type', 'overlay'])
    db.run('INSERT INTO metadata VALUES(?,?)', ['version', '1'])
    db.run('INSERT INTO metadata VALUES(?,?)', ['description', description])
    db.run('INSERT INTO metadata VALUES(?,?)', ['format', 'png'])
  }

  function close() {
    db.close()
  }

  function initTables() {
    db.serialize(function() {
      db.run('CREATE TABLE metadata (name text, value text);')
      db.run('CREATE UNIQUE INDEX name ON metadata (name);')

      db.run('CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);')
      db.run('CREATE UNIQUE INDEX tile_index on tiles (zoom_level, tile_column, tile_row);')
      db.run('PRAGMA synchronous=OFF')
    })
  }

  return {
    initTables,
    insertTiles,
    createMetadata,
    close
  }
}

module.exports = init