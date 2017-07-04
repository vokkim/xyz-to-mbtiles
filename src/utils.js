function tileColumnToLongitude(column, zoom) {
  return (column/Math.pow(2,zoom)*360-180)
}
function tileRowToLatitude(row, zoom) {
  const n = Math.PI-2*Math.PI*row/Math.pow(2,zoom)
  return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))))
}

function longitudeToTileColumn(lon, zoom) {
  return (Math.floor((lon+180)/360*Math.pow(2,zoom)))
}
 function latitudeToTileRow(lat,zoom) {
  return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)))
}

module.exports = {
  tileColumnToLongitude,
  tileRowToLatitude,
  longitudeToTileColumn,
  latitudeToTileRow
}