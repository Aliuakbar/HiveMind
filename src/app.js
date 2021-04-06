const express = require('express');
const path = require('path');

const app = express();
const gc = require('./server/gamecontroler.js');

// Create a simple Express application
app.configure(function() {
    // Turn down the logging activity
    app.use(express.logger('dev'));

    // Serve static html, js, css, and image files from the 'client' directory
    app.use(express.static(path.join(__dirname, 'client')));
});
// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});
// Create a Node.js based http server on port 8080
const server = require('http').createServer(app).listen(process.env.PORT || 8080);

const io = require('socket.io').listen(server);

// Reduce the logging output of Socket.IO
// io.set('log level',1);

// Listen for Socket.IO Connections. Once connected, start the game logic.
io.sockets.on('connection', function (socket) {
    //console.log('client connected');
    gc.initGame(io, socket);
});