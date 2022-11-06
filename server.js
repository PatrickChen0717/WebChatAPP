const cpen322 = require('./cpen322-tester.js');
const path = require('path');
const fs = require('fs');
const express = require('express');
const ws = require('ws');
const broker = new ws.Server({port: 8000});

function logRequest(req, res, next){
	console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}

const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

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
	}
});


var chatrooms = [
	{id: "0",name: "Everyone in CPEN400A", image: "assets/everyone-icon.png"},
	{id: "1",name: "minecraft",image: "assets/canucks.png"},
	{id: "2",name: "Canucks",image: "assets/minecraft.jpg"},
	{id: "3",name: "Bibimbap",image: "assets/bibimbap.jpg"}
]

var messages = [
	["0"],
	["1"],
	["2"],
	["3"]
]

app.route('/chat')
  .get(function (req, res, next) {
	var arr = [];
	var arr_count = 0;
	for (var i=0; i<chatrooms.length; i++){
		arr[arr_count] = {id: chatrooms[i].id, 
						name: chatrooms[i].name, 
						image: chatrooms[i].image, 
						messages: messages[i]};
		arr_count++;
	}
    res.json(arr);
  })
  .post(function (req, res, next) {
	if(req.body.name == undefined){
		res.status(400).send("Server: Invalid Room Name");
	}
	else{
		var messages_length = messages.length;
		var newRoom = {id: messages_length.toString(), name: req.body.name, image: req.body.image};
		chatrooms.push(newRoom);
		messages.push([]);
		res.status(200).send(JSON.stringify(newRoom));
	}

});

cpen322.connect('http://52.43.220.29/cpen322/test-a3-server.js');
cpen322.export(__filename, { app, chatrooms, messages, broker});