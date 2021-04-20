//
// @ThomasLandspurg Thomas.Landspurg@gmail.com 2014-2019
// Node.js client to search all tweet within a geographical zone and forwared them
// in real time using a socket
// http://blog.landspurg.net
//
// Updating for heroku
//
require('dotenv').config();
var express = require('express'),
app = express(),
http = require('http'),
server = http.createServer(app),
Twit = require('twit'),
io = require('socket.io').listen(server);

server.listen( process.env.PORT||8080);

// routing
app.get('/', function (req, res) {
  console.log(req.headers);
  res.sendFile(__dirname + '/index.html');
});
app.use(express.static(__dirname + '/public'));

var world = [ '-180', '-90', '180', '90' ];
var total=0;
var totalSent=0;

var T = new Twit({  // You need to setup your own twitter configuration here!
  consumer_key:    process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token:    process.env.ACCESS_TOKEN,
  access_token_secret:process.env.ACCESS_TOKEN_SECRET
});

var stream = T.stream('statuses/filter', { locations: world});
stream.on('error',function(error){
  console.log(error);
});
stream.on('limit', function (limitMessage) {
  console.log("Limit:"+JSON.stringify(limitMessage));
});
stream.on('tweet', function (tweet) {
  if(tweet.geo){
    console.log(tweet);
    total+=1;
    var coords=tweet.geo.coordinates;
    clients.forEach(function(socket){
      var currentBounds=bounds_for_socket[socket.id];

      if(currentBounds&&(coords[1]>currentBounds[0])&&(coords[0]>currentBounds[1])
                      &&(coords[1]<currentBounds[2])&&(coords[0]<currentBounds[3])){

        totalSent+=1;
        if(totalSent%100==0)console.log("Sent:"+totalSent);
        var smallTweet={
          text:tweet.text,
          user:{   screen_name:       tweet.user.screen_name,
                   profile_image_url: tweet.user.profile_image_url,
                   id_str:            tweet.user.id_str},
          geo:tweet.geo
        };
        socket.emit('stream',smallTweet);
      }
    });
  }
  });

var bounds_for_socket={}; // Will contains a hash association between socket_id -> map bound for this client
var clients=[];  // the list of connected clients
io.sockets.on('connection', function (socket) {
  socket.on('recenter',function(msg){
    console.log("recenter:"+msg);
    bounds_for_socket[this.id]=JSON.parse("["+msg+"]");
  });
  socket.on('disconnect',function(socket){
    //  Here we try to get the correct element in the client list
    for(var i=0;i<clients.length;i++){
      client=clients[i];
      if(client.client.id==this.id){clients.splice(i,1)}
    }
    delete bounds_for_socket[this.id];

    console.log("disconnect , there is still:"+clients.length+" connected ("+Object.keys(bounds_for_socket).length+')');
  });
  clients.push(socket); // Update the list of connected clients
  currentBounds=JSON.parse(socket.handshake.query.bounds);
  bounds_for_socket[socket.id]=currentBounds;
  console.log('Connected, total:'+clients.length+' ('+Object.keys(bounds_for_socket).length+')');
});
;
