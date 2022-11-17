const cpen322 = require('./cpen322-tester.js');
const path = require('path');
const fs = require('fs');
const express = require('express');
const ws = require('ws');
const broker = new ws.Server({port: 8000});
const Database = require('./Database.js');

function logRequest(req, res, next){
	console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}

const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

var db = new Database("mongodb://localhost:27017","cpen322-messenger");
var messageBlockSize = 10;


// express app
let app = express();

app.use(express.json()) 						// to parse application/json
app.use(express.urlencoded({ extended: true })) // to parse application/x-www-form-urlencoded
app.use(logRequest);							// logging for debug

// serve static files (client-side)
app.use('/', express.static(clientApp, { extensions: ['html'] }));
app.listen(port, () => {
	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});


/*-----------------------Assignment 3-------------------------*/

broker.on('connection', (clientsocket, req) => {
	clientsocket.onmessage = (msg) => {
		console.log(JSON.parse(msg.data).roomId);
		messages[JSON.parse(msg.data).roomId].push(JSON.parse(msg.data));
		broker.clients.forEach((client) => {
			if (client != clientsocket) {
			  	client.send(msg.data);
			}
		});


		if(messages[JSON.parse(msg.data).roomId].length == messageBlockSize){
			var conversation = {
				room_id: JSON.parse(msg.data).roomId,
				timestamp: Date.now(),
				messages: messages[JSON.parse(msg.data).roomId]
			};
	  
			db.addConversation(conversation).then((resolve) => {
				messages[JSON.parse(msg.data).roomId] = [];
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
  .get(function (req, res, next) {
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
  .post(function (req, res, next) {
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

	// if(req.body.name == undefined){
	// 	res.status(400).send("Server: Invalid Room Name");
	// }
	// else{ 
	// 	var messages_length = messages.length;
	// 	var newRoom = {id: messages_length.toString(), name: req.body.name, image: req.body.image};
	// 	chatrooms.push(newRoom);
	// 	messages.push([]);
	// 	res.status(200).send(JSON.stringify(newRoom));
	// }

});


app.route('/chat/:room_id')
  .get(function (req, res, next) {
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
.get(function (req, res, next) {
	db.getLastConversation(req.params.room_id, parseInt(req.query.before)).then((conversation) => {
		// console.log("====================");
		// console.log(conversation);
		//res.send(JSON.stringify(conversation));
		res.json(conversation);
	})
});

// cpen322.connect('http://52.43.220.29/cpen322/test-a3-server.js');
cpen322.connect('http://52.43.220.29/cpen322/test-a4-server.js');
cpen322.export(__filename, { app, messages, broker, db, messageBlockSize});