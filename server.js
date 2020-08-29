var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);


app.use('/css',express.static(__dirname + '/static/css'));
app.use('/js',express.static(__dirname + '/static/js'));
app.use('/assets',express.static(__dirname + '/static/assets'));

app.get('/',function(req,res){
    res.sendFile(__dirname+'/index.html');
});



players = {}

io.on('connection', function (socket) {

    // create a new player and add it to our players object

    socket.on("login", function(data) {
        console.log('a user connected', data);
        var playerId = Math.floor(Math.random()*2**15)
        var player = {
            "user": data["user"],
            "id": playerId,
            "position": {
                "x": Math.floor(Math.random()*300),
                "y": Math.floor(Math.random()*300),
                "z": 0,
            }
        }
        players[socket.id] = player
        console.log(socket.id, players)
        // send the players object to the new player
        socket.emit('login', {"id":player["id"], "players": players});
        // update all other players of the new player
        socket.broadcast.emit('newPlayer', {"id":player["id"], "player": player});
    })
    // when a player disconnects, remove them from our players object
    socket.on('disconnect', function () {
        if (players[socket.id]) {
            var playerId = players[socket.id].id
            delete players[socket.id];
            console.log('user disconnected', playerId);
            socket.broadcast.emit('hello', playerId);
        }
    });


    socket.on('update', function(data){
        socket.broadcast.emit('update', data)
    })


});





server.listen(8081,"0.0.0.0", function(){ // Listens to port 8081
    console.log('Listening on '+server.address().port);
});


