const cpen322 = require('./cpen322-tester.js');
const path = require('path');
const fs = require('fs');
const express = require('express');
const ws = require('ws');
const broker = new ws.Server({port: 8000});
const Database = require('./Database.js');
const SessionManager = require('./SessionManager.js');
const crypto = require('crypto');

function logRequest(req, res, next){
	console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}

const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

var db = new Database("mongodb://localhost:27017","cpen322-messenger");
var messageBlockSize = 10;
var sessionManager = new SessionManager();

// express app
let app = express();

app.use(express.json()) 						// to parse application/json
app.use(express.urlencoded({ extended: true })) // to parse application/x-www-form-urlencoded
app.use(logRequest);							// logging for debug

// serve static files (client-side)

app.listen(port, () => {
	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});


/*-----------------------Assignment 3-------------------------*/
function sanitize(string) { // https://stackoverflow.com/questions/2794137/sanitizing-user-input-before-adding-it-to-the-dom-in-javascript
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
	};
	const reg = /[&<>]/ig;
	return string.replace(reg, (match)=>(map[match]));
}
	

broker.on('connection', (clientsocket, req) => {

	var cookies = req.headers.cookie;
	if (cookies == undefined){
		clientsocket.close();
		return;
	}
	else{
		var username = sessionManager.getUsername(cookies.split("=")[1]);
		if(username == null){
			clientsocket.close();
			return;
		}
	}
	

	clientsocket.onmessage = (msg) => {
		console.log( sessionManager.getUsername(cookies.split("=")[1]));
		var message = JSON.parse(msg.data);
		message.username = sessionManager.getUsername(cookies.split("=")[1]);

		
		message.text = sanitize(message.text);
		
		console.log("============broker=============");
		console.log("|"+message.text+"|");
		
		messages[message.roomId].push(message);
		broker.clients.forEach((client) => {
			if (client != clientsocket) {
			  	client.send(JSON.stringify(message));
			}
		});


		if(messages[message.roomId].length == messageBlockSize){
			var conversation = {
				room_id: message.roomId,
				timestamp: Date.now(),
				messages: messages[message.roomId]
			};
	  
			db.addConversation(conversation).then((resolve) => {
				messages[message.roomId] = [];
			})
		}
	}
});


// var chatrooms = [
// 	{id: "0",name: "Everyone in CPEN400A", image: "assets/everyone-icon.png"},
// 	{id: "1",name: "minecraft",image: "assets/canucks.png"},
// 	{id: "2",name: "Canucks",image: "assets/minecraft.jpg"},
// 	{id: "3",name: "Bibimbap",image: "assets/bibimbap.jpg"}
// ]

var messages = {};
db.getRooms().then((newRooms)=>{
					for(var i=0; i<newRooms.length; i++){
						console.log(newRooms[i]._id);
						messages[newRooms[i]._id] = [];
					}
				},
				(error)=>{console.log(error)});



app.route('/chat')
  .get(sessionManager.middleware, function (req, res, next) {
	db.getRooms().then((newRooms)=>{
		var arr = [];
		var arr_count = 0;
		for(var i=0; i<newRooms.length; i++){
			arr[arr_count] = {_id: newRooms[i]._id, 
							name: newRooms[i].name, 
							image: newRooms[i].image, 
							messages: messages[newRooms[i]._id]};
			arr_count++;
		}
		//console.log(arr);
		res.json(arr);
	},
	(error)=>{console.log(error)});
  })
  .post(sessionManager.middleware, function (req, res, next) {
	db.addRoom(req.body).then((newRoom)=>{
		if(newRoom.name == undefined){
			res.status(404).send("HTTP 400 Bad Request");
		}
		else{
			//messages.push([]);
			messages[newRoom._id] = [];
			newRoom.messages = messages[newRoom._id];
			
			res.status(200).send(newRoom);
		}
	},
	(error)=>{res.status(400).send("HTTP 400 Bad Request")});

});


app.route('/chat/:room_id')
  .get(sessionManager.middleware, function (req, res, next) {
	db.getRoom(req.params.room_id).then((Room)=>{
		//console.log("||||server:");
		console.log(Room);
		if(Room != null){
			res.status(200).send(JSON.stringify(Room));
		}
		else{
			res.status(404).send("Room "+ req.params.room_id +" was not found");
		}

	},
	(error)=>{console.log(error)})
})


app.route('/chat/:room_id/messages')
.get(sessionManager.middleware, function (req, res, next) {
	db.getLastConversation(req.params.room_id, parseInt(req.query.before)).then((conversation) => {
		// console.log("====================");
		// console.log(conversation);
		//res.send(JSON.stringify(conversation));
		res.json(conversation);
	})
});

app.route('/login')
.post(function (req, res, next) {
	db.getUser(req.body.username).then((user)=>{
		if(user == null || user == undefined){
			res.redirect('/login');
		}
		else{
			if(isCorrectPassword(req.body.password, user.password)){
				sessionManager.createSession(res, user.username); 
				res.redirect('/');
			}
			else{
				res.redirect('/login');
			}
		}
	},
	(error)=>{res.status(400).send("HTTP 400 Bad Request")});

});

app.route('/profile')
.get(sessionManager.middleware, function (req, res, next) {
	var cookie = req.headers.cookie;
	console.log("Enter /profile: "+ cookie);

	if(cookie != undefined){
		if(sessionManager.getUsername(cookie.split("=")[1]) != null){
			var username_val = sessionManager.getUsername(cookie.split("=")[1]);
			console.log("username found = "+username_val);
			res.send(JSON.stringify({username: username_val}));
		}
	}

})

app.route('/logout')
.get(sessionManager.middleware, function (req, res, next) {
	sessionManager.deleteSession(req);
	res.redirect("/login");
})


app.get('/app.js', sessionManager.middleware);
app.get('/index', sessionManager.middleware);
app.get('/index.html', sessionManager.middleware);
app.get('/', sessionManager.middleware);

app.use(errorHandler);

app.use('/', express.static(clientApp, { extensions: ['html'] }));


function isCorrectPassword(password, saltedHash){
	// console.log("password = "+password);
	// console.log("saltedHash = "+saltedHash);
	var salt_password = password + saltedHash.substring(0,20);

	var pw = crypto
			.createHash('sha256')
			.update(salt_password)
			.digest('base64');

	return pw == saltedHash.substring(20);
}

function errorHandler (err, req, res, next) {
	if(err instanceof SessionManager.Error)
		if(req.headers.accept == 'application/json'){
			res.status(401).send(err.message);
		}
		else{
			res.redirect('/login');
		}
	else{
		res.status(500).send(err.message);
	}
}

// cpen322.connect('http://52.43.220.29/cpen322/test-a3-server.js');
cpen322.connect('http://52.43.220.29/cpen322/test-a4-server.js');
cpen322.connect('http://52.43.220.29/cpen322/test-a5-server.js');

cpen322.export(__filename, { app, messages, broker, db, messageBlockSize, sessionManager, isCorrectPassword});