
# XYZ to MBTiles utility

NodeJS utility to fetch map tiles to [MBTiles](https://github.com/mapbox/mbtiles-spec) format.

Modified copy of spaghetti from [wmts-to-mbtiles](https://github.com/vokkim/wmts-to-mbtiles).

## Usage
```
  Usage: xyz-to-mbtiles [options]

  Options:

    -h, --help                   output usage information
    --output [mbtiles]           Output file
    --zoom [zoom]                Zoom level
    --format [format]            Tile format (png)
    --minzoom [minzoom]          Min zoom level
    --maxzoom [maxzoom]          Max zoom level
    --concurrency [concurrency]  Number of concurrent requests
    --retry [retry]              Retry count to fetch for failed tiles
    --input [url]                tilemap URL
    --bbox [w s e n]             Latitude and longitude values, eg. "23.411 59.731 26.850 60.562"
    --header [header]            Header, eg. "Referer:https//mywebapp.com/
    --token [token]              Optional token for tilemap URL
```

Example:
```
xyz-to-mbtiles \
  --input 'https://tileservice.com/{z}/{x}/{y}?authToken={token}' \
  --output 'output.mbtiles' \
  --header 'Referer:https://tileservice.com/' \
  --header 'Origin:https://tileservice.com' \
  --retry 3 \
  --minzoom 4 \
  --maxzoom 16 \
  --token 'MYTOKEN' \
  --bbox '23.411,59.731,26.850,60.562'
```

For easy bbox, use for example: http://bboxfinder.com/

### Preview result

Install [mbview](https://github.com/mapbox/mbview):

    npm install -g mbview

Run `mbview`:
  
    mbview --port 4999 output.mbtiles


## License

MIT
