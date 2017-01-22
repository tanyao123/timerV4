var User = require('../models/user')
var Timer = require('../models/timer')
var crypto = require("crypto")
var io = require('socket.io')
module.exports = {  

   test: function(req, res){
      res.render('test');
   },
	
	index: function(req, res) { 
      var username = req.cookies.username || '';
      if(username != ''){
         User.find({username: username}, function(err, user){
            var lastTime = user[0].lastAccess
            var all = {loginid: username, lastTime: lastTime};
            res.render('main', all);
         })
      }else{
         res.render('main');
      }
   },    
   about: function(req, res) { 
      var username = req.cookies.username || '';
      if(username != ''){
         User.find({username: username}, function(err, user){
            var lastTime = user[0].lastAccess;
            var all = {loginid: username, lastTime: lastTime};
            res.render('about', all);
         })   
      }else{
         res.render('about');
      }    
   },
   loginForm: function(req, res) {      
		res.render('loginform');
   },
   logout: function(req, res) { 
      var username = req.cookies.username || '';
      res.clearCookie("username");
      User.find({username: username},function(err, user){
         console.log(user);
         User.update({username: username}, {visits: 0}, function(err){  //decrease the visits number to insure that user can normally login
            if(err) return;
         })
      })
      res.render('main');
   },
   loginFormSubmit: function(req, res) {
      var md5 = crypto.createHash('md5');       //hashed the password
      var username = req.body.username;
      var password = req.body.password;
      md5.update(password);
      var passwordHashed = md5.digest('hex');      //hased the password and use it to compare with the record in the database
      User.find({username: username},function(err, user){
         if(err){
            res.send({code: -1});
         }else if(user.length == 0){
            res.send({code: 0});
         }else if(passwordHashed != user[0].password){
            res.send({code: 2});
         }else if(user[0].visits >= 1){
            res.send({code: 3});
         }else{
            var visits = user[0].visits + 1;
            User.update({username: username}, {visits:visits, lastAccess: Date()}, function(err){
               if(err) return;
            })
            res.setHeader("Set-Cookie",["username=" + username]);
            res.send({code: 1});
         }
      })
   },
   timer: function (req, res) {
      var username = req.cookies.username;
      if(typeof username === undefined){
         res.send("You should log in first!");
      }else{
         var loginid={loginid:username};
         User.find({username: username}, function(err, user){
            if(user.length == 0){
               res.send("You should log in first");
            }else{
               User.find({username: username}, function(err, user){
                  var lastTime = user[0].lastAccess;
                  var loginid = {loginid: username}
                  Timer.find({username: username}, function(err, user){
                     var timerName = {}
                     timerName.one = user[0].timerName;
                     timerName.two = user[1].timerName;
                     timerName.three = user[2].timerName;
                     var all = {loginid: loginid, lastTime: lastTime, timerName: timerName}
                     res.render('timer',all);
                  })
               })
            }
         })
      }
   },
   register: function (req, res) {
   		res.render('register');
   },
   registerUser: function(req, res){
   	var md5 = crypto.createHash('md5');
		var username = req.body.username;
		var password = req.body.password;
      var email = req.body.email;
		md5.update(password);	
		var passwordHashed = md5.digest('hex');		
      User.find({username: username}, function(err, user){
         if (user.length == 0) {
            var user = new User({
               username: username,
               password: passwordHashed,
               email: email
            })
            user.save(function(err, user){
               if (err) {
                  console.error(err);
                  return;
               }else{
                  console.log(user);
                  res.send({code: 1});
               }
            })
            for(var i=0;i<3;i++){
               var timer = new Timer({
                  username: username,
                  timerName: username,
                  timerNum: i
               })
               timer.save(function(err, timer){
                  if(err){
                     return;
                  }
               })
            }
         }else{
            res.send({code: 2});
         }
      })
   },
   hanleState: function (req, res) {    
      var state = req.body.state;
      var timerNum = req.body.timerNum;
      var username = req.body.username;
      var doneTime = req.body.doneTime || -1;
      var timerNumber = req.body.timerNumber || 0;
      var hour = req.body.timerHour;
      var minute = req.body.timerMinute;
      var second = req.body.timerSecond;
      Timer.update({username: username, timerNum: timerNum}, {state: state, doneTime: doneTime, timerNumber: timerNumber,timerHour: hour, timerSecond: second, timerMinute: minute}, function(err){
         if(err) return;
      })
      Timer.find({username: username, timerNum: timerNum}, function(err, timer){
         console.log(timer[0].state);
      })
      res.send(state);
   },

   updateNumber: function(req, res){
      var timerNum = req.body.timerNum;
      var username = req.body.username;
      var hour = req.body.timerHour;
      var minute = req.body.timerMinute;
      var second = req.body.timerSecond;
      Timer.update({username: username, timerNum: timerNum}, {timerHour: hour, timerSecond: second, timerMinute: minute}, function(err){
         if(err) return;
      })
      Timer.find({username: username, timerNum: timerNum}, function(err, timer){
         //console.log(timer[0].timerSecond);
      })
   },

   getState: function(req, res){
      var username = req.body.username;
      Timer.find({username: username}, function(err, timer){
         var timerState = [];
         var timerHour = [];
         var timerMinute = [];
         var timerSecond = [];
         for(var i = 0; i < timer.length; i ++){
            timerState.push(timer[i].state);
            timerHour.push(timer[i].timerHour);
            timerMinute.push(timer[i].timerMinute);
            timerSecond.push(timer[i].timerSecond);
         }
         var data = {timerState: timerState, timerHour: timerHour, timerMinute: timerMinute, timerSecond: timerSecond};
         res.send(data);
      })
   },

   getTimer: function(req, res){
      var check = req.cookies.username || '';
      var username = req.params.username;
      var timernum = req.params.timernum;
      if(check != '' && check == username){
         console.log(username);
         Timer.find({username: username, timerNum: timernum}, function(err, timer){
            console.log(timer);
            if(timer != undefined){
               var data = {
                  username: timer[0].username,
                  timerName: timer[0].timerName,
                  timerNum: timer[0].timerNum,
                  timerHour: timer[0].timerHour,
                  timerMinute: timer[0].timerMinute,
                  timerSecond: timer[0].timerSecond,
                  doneTime: timer[0].doneTime,
                  state: timer[0].state
               }
               res.send(data);
            }else{
               res.send({status:-1});
            }
         })
      }else{
         res.send({status:-1, msg:"You do not have the permission"});
      }
   },

   setTimer: function(req, res){
      var check = req.cookies.username || '';
      var username = req.params.username;
      var timernum = req.params.timernum;
      if(check != '' && check == username){
         var doneTime = req.body.doneTime;
         var state = req.body.state;
         var timerName = req.body.timerName;
         Timer.update({username: username, timerNum: timernum}, {doneTime: doneTime, state: state, timerName: timerName}, function(err){
            if(err){
               return;
            }
            Timer.find({username: username, timerNum: timernum}, function(err, timer){
               var data = {
                  username: timer[0].username,
                  timerName: timer[0].timerName,
                  timerNum: timer[0].timerNum,
                  timerHour: timer[0].timerHour,
                  timerMinute: timer[0].timerMinute,
                  timerSecond: timer[0].timerSecond,
                  doneTime: timer[0].doneTime,
                  state: timer[0].state
               }
               res.send(data);
            })
         })
      }else{
         res.send({status:-1, msg:"You do not have the permission"});
      }
   },
   
}; 
 console.log("sssshome");

