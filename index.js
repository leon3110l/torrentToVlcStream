const http = require('http');
const fs = require('fs');

const path = "/home/leon/Videos/manifest.mp4";

const port = 8888;
const host = "localhost";

const server = http.createServer(function (req, res) {

  const stat = fs.statSync(path);
  const total = stat.size;

  console.log(req.headers);

  if (req.headers.range) {   // meaning client (browser) has moved the forward/back slider
                                         // which has sent this request back to this server logic ... cool
    const range = req.headers.range;
    const parts = range.replace(/bytes=/, "").split("-");
    const partialstart = parts[0];
    const partialend = parts[1];

    const start = parseInt(partialstart, 10);
    const end = partialend ? parseInt(partialend, 10) : total-1;
    const chunksize = (end-start)+1;
    console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

    const file = fs.createReadStream(path, {start: start, end: end});
    res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
    file.pipe(res);

  } else {

    console.log('ALL: ' + total);
    res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'video/mp4' });
    fs.createReadStream(path).pipe(res);
  }
}).listen(port, host);

console.log("Server running at http://" + host + ":" + port + "/");

const { spawn } = require('child_process');
const ls = spawn('vlc', ["http://" + host + ":" + port + "/"]); // open the stream in vlc

ls.on('close', (code) => {
  // close the server
  server.close();
});
