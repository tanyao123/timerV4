var express = require('express'),   
	mongoose = require('mongoose'),
	config = require('./server/configure'),
	crypto = require("crypto"),
	app = express(); 

mongoose.connect('mongodb://localhost/timer')

app.set('port', process.env.PORT || 3640); 
app.set('views', __dirname + '/views'); 
app = config(app);
 app.get('/', function(req, res){ 
    res.send('Hello World'); 
	res.render('timer');
 });
var server = app.listen(app.get('port'), function() {   
	console.log('Server up: http://localhost:' + app.get('port')); 
}); 

var User = require('./models/user')
var Timer = require('./models/timer')
var io = require('socket.io').listen(server);

var onlineUsers = {};
var onlineCount = 0;

io.on('connection', function (socket) {
  console.log("connected");
  socket.on('login', function(obj){
  	socket.username = obj.username;
  	if(!onlineUsers.hasOwnProperty(obj.username)){
  		onlineUsers[obj.username] = obj.username;
  		onlineCount++;
  	}
  	io.emit('login', {onlineUsers:onlineUsers, onlineCount: onlineCount})
  	console.log(onlineUsers);
  });
  socket.on('disconnect', function(){
  	if(onlineUsers.hasOwnProperty(socket.username)){
  		var obj = {username: socket.username};
  		delete onlineUsers[socket.username];
  		onlineCount--;
  		io.emit('logout', {onlineUsers: onlineUsers, onlineCount: onlineCount});
  	}
  });
  socket.on('change', function(obj){
  	console.log(obj);
  	var username = socket.username;
  	var timerNum = obj.timerNum;
  	var doneTime = obj.doneTime || 0;
  	var state = obj.state || 0;
  	var timerName = obj.timerName || username;
  	Timer.update({username: username, timerNum},{state: state, doneTime: doneTime, timerName: timerName}, function(err){
  		if(err){
  			return;
  		}
  		io.emit('changeComplete', obj);
  	})
  })
});






