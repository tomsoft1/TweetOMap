var express = require('express'),
app = express(),
http = require('http'),
server = http.createServer(app),
Twit = require('twit'),
io = require('socket.io').listen(server);

server.listen(8080);

// routing
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
app.use(express.static(__dirname + '/public'));

var world = [ '-180', '-90', '180', '90' ]
var currentBounds=world;
var total=0;
var totalSent=0;

var T = new Twit({
  consumer_key:         'OyBoq9N9n2AmCqkVLQ8PpKor8',
  consumer_secret:      'StmNJ3xlnKvLitgLDqq36Q5wr0RsGAJ5FDZI8W9Yul5sZpaI9a',
  access_token:         '2933552610-wji03WrMTSPG9rCP49n8ygem9ibUds3oUjLDBra',
  access_token_secret:  '0EBgwNQTYGLOVteqzkl0RPiVflpNPfhSKgBBNPAgfG3JE'
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
    total+=1;
    var coords=tweet.geo.coordinates;
    clients.forEach(function(socket){
      var currentBounds=bounds_for_socket[socket.id];

      if(currentBounds&&(coords[1]>currentBounds[0])&&(coords[0]>currentBounds[1])&&(coords[1]<currentBounds[2])&&(coords[0]<currentBounds[3])){
        //console.log(coords+" "+currentBounds);
        //console.log("...in");
        totalSent+=1;
        if(totalSent%100==0)console.log("Sent:"+totalSent);
        var smallTweet={
          text:tweet.text,
          user:{screen_name:tweet.user.screen_name,profile_image_url:tweet.user.profile_image_url,id_str:tweet.user.id_str},
          geo:tweet.geo
        };
       // console.log(smallTweet);
        socket.emit('stream',smallTweet);
      }
    });
  }
  });

var bounds_for_socket={};
var clients=[];
io.sockets.on('connection', function (socket) {
  socket.on('recenter',function(msg){
    console.log("recenter:"+msg);
    bounds_for_socket[this.id]=JSON.parse("["+msg+"]");
    console.log(bounds_for_socket);
  });
  socket.on('disconnect',function(socket){
    console.log("DISCONNET:"+this.id);
    //  Here we try to get the correct element in the client list
    for(var i=0;i<clients.length;i++){
      client=clients[i];
      if(client.client.id==this.id){clients.splice(i,1)}
    }
    delete bounds_for_socket[this.id];

    console.log("disconnect , there is still:"+clients.length+" connected ("+Object.keys(bounds_for_socket).length+')');
  });
  console.log("NEW ID:"+socket.id);
  clients.push(socket); // Update the list of connected clients
  currentBounds=JSON.parse(socket.handshake.query.bounds);
  bounds_for_socket[socket.id]=currentBounds;
  console.log('Connected, total:'+clients.length+' ('+Object.keys(bounds_for_socket).length+')');
});
;