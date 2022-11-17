const { MongoClient, ObjectID } = require('mongodb');	// require the mongodb driver

/* helper: check valid mongodb.ObjectID */
const ObjectId = require('mongodb').ObjectId;
function isValidObjectId(id){
    
    if(ObjectId.isValid(id)){
        if((String)(new ObjectId(id)) === id)
            return true;
        return false;
    }
    return false;
}

/**
 * Uses mongodb v4.2+ - [API Documentation](http://mongodb.github.io/node-mongodb-native/4.2/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen322 app.
 */
function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
	this.connected = new Promise((resolve, reject) => {
		MongoClient.connect(
			mongoUrl,
			{
				useNewUrlParser: true
			},
			(err, client) => {
				if (err) reject(err);
				else {
					console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
					resolve(client.db(dbName));
				}
			}
		)
	});
	this.status = () => this.connected.then(
		db => ({ error: null, url: mongoUrl, db: dbName }),
		err => ({ error: err })
	);
}

Database.prototype.getRooms = function(){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
            if(db != null){
                var rooms = db.collection("chatrooms").find().toArray();
                resolve(rooms);
            }
            else{
                reject("DB access error");
            }
		})
	)
}

Database.prototype.getRoom = function(room_id){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
            if(db != null){
                var room = db.collection("chatrooms").find().toArray().then((rooms)=>{
                    var ret_arr = [];
                    for(var i=0;i<rooms.length;i++){
                        if(room_id == rooms[i]._id){
                            ret_arr.push(rooms[i]);
                        }
                    }

                    if(ret_arr.length == 0){
                        return null;
                    }

                    for(var i=0; i<ret_arr.length; i++){
                        if(isValidObjectId(ret_arr[i]._id)){
                            return ret_arr[i];
                        }
                    }
                    //console.log(ret_arr[0]);
                    return ret_arr[0];
                    
                });
                
                resolve(room);
            }
            else{
                reject("DB access error");
            }
		})
	)
}

Database.prototype.addRoom = function(room){
	return this.connected.then(db => 
		new Promise((resolve, reject) => {
            console.log("||||input:");
            console.log(room);
            if(room.name == undefined){
                reject("Room name not found");
            }
            else{
                var newRoom = room;
                if(newRoom._id == undefined){
                    newRoom._id = ObjectId().toString();
                    db.collection("chatrooms").insertOne(newRoom);
                    console.log("||||db:");
                    console.log(newRoom);
                    resolve(newRoom);
                }
                else{
                    db.collection("chatrooms").insertOne(newRoom);
                    resolve(newRoom);
                }          
            }
		})
	)
}

Database.prototype.getLastConversation = function(room_id, before){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
            var timebefore = (before == undefined) ? Date.now() : before;
            console.log(room_id+ "============timebore: "+ timebefore);
			db.collection("conversations").find().toArray().then((conversations)=>{
                var selected_conversation;
                var selected_time = 0;

                for(var i=0;i<conversations.length;i++){
                    //console.log(conversations[i]);
                    if(conversations[i].room_id  == room_id 
                        && conversations[i].timestamp < timebefore 
                        && conversations[i].timestamp >= selected_time){
                        //console.log("+++++add");
                        selected_time = conversations[i].timestamp;
                        selected_conversation = conversations[i];
                    }
                }
                
                // console.log("=========db========"+conversations.length);
                // console.log(typeof selected_conversation);
                // console.log(selected_conversation);
                if(selected_conversation == undefined){
                    resolve(null);
                }
                else{
                    resolve(selected_conversation);
                }
                
            },
            (error) => {console.log(error)});
		})
	)
}

Database.prototype.addConversation = function(conversation){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
            if(conversation.room_id == undefined || conversation.timestamp == undefined || conversation.messages == undefined){
                reject("conversation property not found");
            }
            else{
                db.collection("conversations").insertOne(conversation);
                resolve(conversation);
            }
		})
	)
}

module.exports = Database;


