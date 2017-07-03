const http = require('http');
const fs = require('fs');
const torrentStream = require("torrent-stream");
const engine;

const arguments = process.argv;
let options = {path: __dirname + "/tmp/"};
for (var i = 0; i < arguments.length; i++) {
  let val = arguments[i];
  // have a different path to save
  if (val.indexOf("-o") != -1) {
    options.path = arguments[i + 1];
  } else if (val.indexOf("magnet:") != -1) {
    engine = torrentStream(val, options); // you should always have the magnet link at the end of the command or it will ignore some options
  }
}

// video formats
const formats = ["mkv", "avi", "mp4"];

// host options
const port = 8888;
const host = "localhost";

// when the engine is ready look for the video file download it and play/stream it in vlc
engine.on('ready', function() {
  // look for a video file
  const file = engine.files.find(x => {
    for (var i = 0; i < formats.length; i++) {
      if (x.name.indexOf(formats[i]) != -1) {
        return true
      }
    }
  }); // download the file with a video extension
  const server = http.createServer(function (req, res) {
    // get file length
    const total = file.length;

    if (req.headers.range) {   // when client has moved the forward/back slider
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, "").split("-");
      const partialstart = parts[0];
      const partialend = parts[1];

      const start = parseInt(partialstart, 10);
      const end = partialend ? parseInt(partialend, 10) : total-1;
      const chunksize = (end-start)+1;
      console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

      const fileStream = file.createReadStream({start: start, end: end});
      res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video' });
      fileStream.pipe(res);

    } else {

      console.log('ALL: ' + total);
      res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'video/mp4' });
      file.createReadStream().pipe(res);
    }
  }).listen(port, host);

  console.log("Server running at http://" + host + ":" + port + "/");

  const { spawn } = require('child_process');
  const ls = spawn('vlc', ["http://" + host + ":" + port + "/"]); // open the stream in vlc

  ls.on('close', (code) => {
    // close the server
    server.close();
  });
});
