const http = require('http');
const torrentStream = require("torrent-stream");
const { spawn } = require('child_process');
let engine;

const args = process.argv;
let options = {path: __dirname + "/tmp/"}; // default save path
for (var i = 0; i < args.length; i++) {
  let val = args[i];
  // have a different path to save
  if (val.indexOf("-o") != -1) {
    options.path = args[i + 1];
  } else if (val.indexOf("magnet:") != -1) {
    engine = torrentStream(val, options); // you should always have the magnet link at the end of the command or it will ignore some options, and it needs quotes around it
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
        return true;
      }
    }
  }); // download the file with a video extension
  const server = http.createServer(function (req, res) {
    // get file length
    const total = file.length;

    if (req.headers.range) {   // when client has moved the forward/back slider
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, "").split("-");
      const partialStart = parts[0];
      const partialEnd = parts[1];

      const start = parseInt(partialStart, 10);
      const end = partialEnd ? parseInt(partialEnd, 10) : total-1;
      const chunkSize = (end-start)+1;
      console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunkSize);

      const fileStream = file.createReadStream({start: start, end: end});
      res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunkSize, 'Content-Type': 'video/webm' });
      stream(fileStream, res);

    } else {

      console.log('ALL: ' + total);
      res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'video/webm' });
      const fileStream = file.createReadStream();
      stream(fileStream, res);

    }
  }).listen(port, host);

  console.log("Server running at http://" + host + ":" + port + "/");

  // const { spawn } = require('child_process');
  // const vlc = spawn('vlc', ["http://" + host + ":" + port + "/"]); // open the stream in vlc
  //
  // vlc.on('close', (code) => {
  //   // close the server
  //   server.close();
  // });
});

function stream(fileStream, res) {
  const ffmpeg = spawn('ffmpeg', ["-i", "pipe:0", "-f", "webm", "-vcodec", "libvpx", "-b:v", "4000K", "-speed", "10", "pipe:1"]);
  ffmpeg.stderr.on("data", (data) => {
    console.log(data.toString("utf8"));
  });
  fileStream.pipe(ffmpeg.stdin);
  ffmpeg.stdout.pipe(res);
}
