const http = require('http');
const fs = require('fs');
const torrentStream = require("torrent-stream");
const engine = torrentStream('magnet:?xt=urn:btih:0de7397f926e17d3853690356de81ae6088ca079&dn=Silicon.Valley.S04E10.HDTV.x264-SVA%5Bettv%5D&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969');

const port = 8888;
const host = "localhost";

engine.on('ready', function() {
  const file = engine.files[0];
  console.log(file.length);
	console.log('filename:', file.name);
  const server = http.createServer(function (req, res) {

    const total = file.length;

    console.log(req.headers);

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
      res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mkv' });
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
