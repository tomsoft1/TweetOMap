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

var T = new Twit({
  consumer_key:         'OyBoq9N9n2AmCqkVLQ8PpKor8',
  consumer_secret:      'StmNJ3xlnKvLitgLDqq36Q5wr0RsGAJ5FDZI8W9Yul5sZpaI9a',
  access_token:         '2933552610-wji03WrMTSPG9rCP49n8ygem9ibUds3oUjLDBra',
  access_token_secret:  '0EBgwNQTYGLOVteqzkl0RPiVflpNPfhSKgBBNPAgfG3JE'
});

//if(stream)stream.close();
console.log("Starting twitter with:"+world);
var stream = T.stream('statuses/filter', { locations: world});
stream.on('error',function(error){
  console.log(error);
});
stream.on('limit', function (limitMessage) {
  console.log("Limit:"+limitMessage);
});
stream.on('tweet', function (tweet) {
  var mediaUrl;
  if(tweet.geo){
    var coords=tweet.geo.coordinates;
    if((coords[1]>currentBounds[0])&&(coords[0]>currentBounds[1])&&(coords[1]<currentBounds[2])&&(coords[0]<currentBounds[3])){
      console.log(coords+" "+currentBounds);
      console.log("...in");
      // console.log(tweet);
      //console.log(io);
      //console.log(JSON.stringify(tweet.geo)+" "+tweet.text);
      var smallTweet={
           text:tweet.text,
           user:{screen_name:tweet.user.screen_name,profile_image_url:tweet.user.profile_image_url,id_str:tweet.user.id_str},
           geo:tweet.geo
      };
      io.sockets.emit('stream',smallTweet);
    }
  }
});

var bounds_for_socket={};

io.sockets.on('connection', function (socket) {
  socket.on('recenter',function(msg){
    console.log("recenter:"+msg);
    currentBounds=JSON.parse("["+msg+"]");
  });
  socket.on('disconnect',function(socket){
    console.log("disconnect");
    console.log(io.sockets);
  });
  console.log('Connected');
  console.log(socket.id);
  currentBounds=JSON.parse(socket.handshake.query.bounds);
  bounds_for_socket[socket.id]=currentBounds;
    console.log(bounds_for_socket);
});
;