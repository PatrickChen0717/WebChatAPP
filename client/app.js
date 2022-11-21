var profile = {username: "Patrick"};
var Service = {
    origin: window.location.origin,
    getAllRooms : function(){
        var xhr = new XMLHttpRequest();
        xhr.open("GET",this.origin + "/chat");
        xhr.send();
        var action =  new Promise ((resolve,reject) => {
            xhr.onload = function(){
                if(xhr.status == 200){
                    console.log(xhr.responseText);
                    var obj = JSON.parse(xhr.responseText);
                    var res = [];
                    for(var i in obj){
                        res.push(obj[i]);
                    }
                    resolve(res);
                }
                else {
                    var error = new Error(xhr.responseText);
                    console.log(error);
                    reject(error);
                }
            };
            xhr.onerror = function(){
                var error = new Error(xhr.responseText);
                console.log(error);
                reject(error);
            };  
        });
        return action;
    },
    addRoom: function(data){
        var xhr = new XMLHttpRequest();
        xhr.open('POST', this.origin + "/chat", true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.send(JSON.stringify(data));
        var action =  new Promise ((resolve,reject) => {
            xhr.onload = function(){
                if(xhr.status != 200){
                    var error = new Error(xhr.responseText);
                    //console.log(error);
                    reject(error);
                }
            };
            xhr.onerror = function(){
                var error = new Error(xhr.responseText);
                //console.log(error);
                reject(error);
            };  
            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    resolve(JSON.parse(xhr.response));
                }
            }
        });
        return action;
    },
    getLastConversation: function(roomId,before){
        var xhr = new XMLHttpRequest();
        xhr.open("GET",this.origin + "/chat/"+ roomId +"/messages?before="+ before);
        xhr.send();
        var action = new Promise ((resolve,reject) => {
            xhr.onload = function(){
                resolve(xhr.responseText);
            }
        })
        return action.then((conversation)=>{
            return JSON.parse(conversation);
        });
    }
};

function* makeConversationLoader(room){
    var last_conversation = room;

    while(room.canLoadConversation == true){
        yield new Promise ((resolve,reject) => {
            room.canLoadConversation = false;
           
            Service.getLastConversation(room.id, last_conversation.timestamp).then((new_last) =>{
                last_conversation = new_last;
                
                if(last_conversation == null){
                    room.canLoadConversation = false;
                    resolve(null);
                }
                else{
                    room.canLoadConversation = true;
                    room.addConversation(last_conversation);
                    resolve(last_conversation);
                }
            });
        });

    }
}

function main(){
   // console.log("Entered Main");
    var socket = new WebSocket("ws://localhost:3000");
    
   
    var lobby = new Lobby();
    var lobbyView = new LobbyView(lobby);
    var chatView = new ChatView(socket);
    var profileView = new ProfileView();
    
    socket.addEventListener('message', (msg) => {
        var message = JSON.parse(msg.data);
        
        lobby.getRoom(message.roomId).addMessage(message.username, message.text);
    });

    var refreshLobby = function(){
        Service.getAllRooms().then((newRooms)=>{
            
            console.log(lobby.rooms);
            for(var i=0;i<newRooms.length;i++){
                // console.log("newRooms:");
                // console.log(newRooms[i]);
                if(newRooms[i]._id in lobby.rooms){
                    lobby.rooms[newRooms[i]._id].name = newRooms[i].name;
                    lobby.rooms[newRooms[i]._id].image = newRooms[i].image;
                    lobby.rooms[newRooms[i]._id].messages = newRooms[i].messages;
                }
                else{
                    lobby.addRoom(newRooms[i]._id, newRooms[i].name, newRooms[i].image, newRooms[i].messages);
                    //lobby.rooms[i] = new Room(newRooms[i].id,newRooms[i].name,newRooms[i].image,newRooms[i].messages)
                }
            }
        });
    }
    refreshLobby();
    setInterval(refreshLobby,5000);

   
    function renderRoute(){
        var address = window.location.hash;
        //console.log(address);

        if(address === "#/"){
            var page_view = document.getElementById("page-view");
            console.log("Called renderRoute: index");
            emptyDOM (page_view);
            lobbyView.redrawList();
            page_view.appendChild(lobbyView.elem);
            
        }
        else if(address.includes("#/chat/")){//"#/chat/room-1"
            var page_view = document.getElementById("page-view");

            var address_arr = address.split("/");
            var extracted_room;

            if(address_arr[address_arr.length-1].includes("-")){
                //var address_arr = address_arr[address_arr.length-1].split("-");
                var extracted_room = lobby.getRoom(address_arr[2]);
            }else{
                var extracted_room = lobby.getRoom(address_arr[2]);
            }
            
            if(extracted_room != null){
                chatView.setRoom(extracted_room);
            }
            
            emptyDOM (page_view);
            page_view.appendChild(chatView.elem);
        }
        else if(address == "#/profile"){
            var page_view = document.getElementById("page-view");
            //console.log("Called renderRoute: profile");
            emptyDOM (page_view);
            page_view.appendChild(profileView.elem);
        }

    }

    
    renderRoute();

    window.addEventListener("popstate", renderRoute);


    //Test exposure  
    cpen322.export(arguments.callee, {
        renderRoute: renderRoute,
        refreshLobby: refreshLobby,
        socket: socket,
        lobby: lobby,
        lobbyView: lobbyView,
        chatView: chatView,
        profileView: profileView
    });
}

window.addEventListener("load", main);

class Room{
    constructor(id, name, image, messages) {
        this._id = id;
        this.name = name;
        this.image = (image == undefined) ? "assets/everyone-icon.png" : image;
        this.messages = (messages == undefined) ? [] : messages;

        
        this.timestamp = Date.now();
        this.canLoadConversation = true;

        this.getLastConversation = makeConversationLoader(this);
    }
    addMessage(username, text){
        if(text == "" || text.trim().length === 0){
            return;
        }
        else{
            var message = {username:username, text:text};
            //console.log("new message: "+ username +" "+ text);
            this.messages.push(message);
        }

        if(typeof this.onNewMessage == 'function'){
            this.onNewMessage(message);
        }
    }
    addConversation(conversation){
        var conversation_arr = conversation.messages;
        for(var i=0;i<conversation_arr.length;i++){
            this.messages.push(conversation_arr[i]);
        }
        this.onFetchConversation(conversation);
    }
};


class Lobby{
    constructor() {
        this.rooms = {
            // 0: new Room(0,"Everyone in CPEN400A","assets/everyone-icon.png",[]),
            // 1: new Room(1,"minecraft","assets/canucks.png",[]),
            // 2: new Room(2,"Canucks","assets/minecraft.jpg",[]),
            // 3: new Room(3,"Bibimbap","assets/bibimbap.jpg",[])
        };

        //console.log(this.rooms);
    }
    getRoom(roomId){
        if(this.rooms[roomId] != null){
            //console.log(this.rooms[roomId]);
            return this.rooms[roomId];
        }
        return ;
    }
    addRoom(id, name, image, messages){
        //console.log("called: addRoom")
        if(name != ""){
            //console.log(new Room(id, name, image, messages));
            //console.log("added");
            this.rooms[id] = new Room(id, name, image, messages);
            //console.log(this.rooms);
            if(typeof this.onNewRoom === 'function'){
                this.onNewRoom(this.rooms[id]);
            }
        }
    }
};



class LobbyView {
    constructor(lobby) {
        this.lobby = lobby;
        this.elem = createDOM(
            `<div class="content" >
                <ul class="room-list" >
                    <li>
                        <img src="assets/everyone-icon.png">
                        <a href="#/chat/room-1">Everyone in CPEN400A</a>
                    </li>
                    <li>
                        <img src="assets/minecraft.jpg">
                        <a href="#/chat/room-2">Minecraft</a>
                    </li>
                    <li>
                        <img src="assets/canucks.png">
                        <a href="#/chat/room-3">Canucks</a>
                    </li>
                    <li>
                        <img src="assets/bibimbap.jpg">
                        <a href="#/chat/room-4">Bibimbap</a>
                    </li>
                </ul>
        
                <div class="page-control">
                    <input type="text" placeholder="New Room Name">
                    <button class="indexBtn">Add Room</button>
                </div> 
            </div>`
        );
        this.listElem = this.elem.querySelector("ul.room-list");
        this.inputElem = this.elem.querySelector("input");
        this.buttonElem = this.elem.querySelector("button");

        var self = this;

        this.lobby.onNewRoom = function(room){
            self.redrawList();
        }

        console.log("rendering list");
        console.log(this.lobby.rooms); 
        this.redrawList();

        this.buttonElem.addEventListener("click",function (){
            Service.addRoom({name: self.inputElem.value, image: "assets/everyone-icon.png"}).then(
                (result) => { self.lobby.addRoom(result._id, result.name, result.image, result.messages);},
                (error) => {console.log(error);}
            );
            self.inputElem.value = '';
        })
    }

    redrawList(){
        //console.log(this.lobby.rooms); 
        // console.log("length: " + Object.keys(this.lobby.rooms).length);

        emptyDOM(this.listElem);
        for (var i=0; i<Object.keys(this.lobby.rooms).length; i++){
            console.log(this.lobby.rooms[i]);
            var room_string = `<li>
                                <img src="`+ Object.keys(this.lobby.rooms)[i].image +`">
                                <a href="#/chat/`+ Object.keys(this.lobby.rooms)[i] +`">`+Object.keys(this.lobby.rooms)[i].name+`</a>
                            </li>`       
            this.listElem.appendChild(createDOM(room_string));
        }
    }
};

var ChatView = class {
    constructor(socket) {
        this.elem = createDOM(
        `<div class="content">
            <h4 class="room-name">Everyone in CPEN400A</h4>
            <div class="message-list">

                <div class="message">
                    <span class="message-user">UserA</span>
                    <span class="message-text">Hello</span>
                </div>

                <div class="message my-message">
                    <span class="message-user">Me</span>
                    <span class="message-text">Hi</span>
                </div>

            </div>
            <div class="page-control">
                <textarea></textarea>
                <button class="chatBtn">Send</button>
            </div>
        </div>`
        );
        this.titleElem = this.elem.querySelector("h4");
        this.chatElem = this.elem.querySelector("div.message-list");
        this.inputElem = this.elem.querySelector("textarea");
        this.buttonElem = this.elem.querySelector("button");
        this.room = null;
        this.socket = socket;
        var chatview_self = this;

        this.buttonElem.addEventListener("click", function() {
            chatview_self.sendMessage();
        });

        this.inputElem.addEventListener("keyup", (e) => {
            if(e.keyCode === 13){
                if(!e.shiftKey){
                    chatview_self.sendMessage();
                }
            }
        });

        this.chatElem.addEventListener('wheel', (event) => {
            console.log(chatview_self.room);
            
            if(event.deltaY < 0 && this.chatElem.scrollTop <= 0 && chatview_self.room.canLoadConversation == true){
				this.room.getLastConversation.next();
			}
        });
    }
    sendMessage(){
        //console.log("send message");
        if(this.room != null){
            //console.log(profile.username +" "+ this.inputElem.value);
            this.room.addMessage(profile.username, this.inputElem.value);
            
            var message = {roomId: this.room._id, username: profile.username, text: this.inputElem.value};
            this.socket.send(JSON.stringify(message));

            this.inputElem.value = '';
        }
    }
    setRoom(room){
        this.room = room;   
        console.log("Check:==================");
        console.log(room);
        this.titleElem.innerHTML = this.room.name;
        //console.log(this.room.name);

        var chatview_self = this;
        this.room.onNewMessage = function (message){
            //console.log("called onNewMessage");
              //console.log("1:"+ profile.username +"    "+this.room.messages[i].text);
            var message_string = `<div class="message my-message">
                                    <span class="message-user">`+ message.username +`</span>
                                    <span class="message-text">`+ message.text +`</span>
                                </div>`    
            chatview_self.chatElem.appendChild(createDOM(message_string));
        };

        emptyDOM(this.chatElem);
        //console.log(this.room.messages);
        for(var i=0; i<this.room.messages.length; i++){
            if(this.room.messages[i].username == profile.username){
                var message_string = `<div class="message my-message">
                                        <span class="message-user">`+ this.room.messages[i].username +`</span>
                                        <span class="message-text">`+ this.room.messages[i].text +`</span>
                                    </div>`       
                                    //console.log(message_string);
                this.chatElem.appendChild(createDOM(message_string));
            }
            else{
                var message_string = `<div class="message">
                                        <span class="message-user">`+ this.room.messages[i].username +`</span>
                                        <span class="message-text">`+ this.room.messages[i].text +`</span>
                                    </div>`       
                                    //console.log(message_string);
                this.chatElem.appendChild(createDOM(message_string));
            }
        }

        this.room.onFetchConversation = (conversation) => {
            console.log(conversation)
            var scroll_below = this.chatElem.scrollHeight;

            var message_html = "";

            for(var i=0;i<conversation.messages.length;i++){
                if(conversation.messages[i].username == profile.username){
                    message_html = message_html + `<div class="message my-message">
                                            <span class="message-user">`+ conversation.messages[i].username +`</span>
                                            <span class="message-text">`+ conversation.messages[i].text +`</span>
                                        </div>`       
                                        
                   // message_html = message_string + message_html;
                }
                else{
                    message_html = message_html + `<div class="message">
                                            <span class="message-user">`+ conversation.messages[i].username +`</span>
                                            <span class="message-text">`+ conversation.messages[i].text +`</span>
                                        </div>`       
                                        
                   // message_html = message_string + message_html;
                }
            }

            this.chatElem.innerHTML = message_html + this.chatElem.innerHTML;

			var scroll_above = this.chatElem.scrollHeight;
			this.chatElem.scrollTop = scroll_above - scroll_below;
        }
    }
};


var ProfileView = class {
    constructor() {
        this.elem = createDOM(
        `<div class="content">
            <div class="profile-form">
                <div class="form-field">
                    <label>Username</label>
                    <input type="text">
                </div>
                <div class="form-field">
                    <label>Password</label>
                    <input type="password">
                </div>
                <div class="form-field">
                    <label>Avatar Image</label>
                    <img src="assets/profile-icon.png">
                    <input type="file">
                </div>
            </div>

            <div class="page-control">
                <button class="profileBtn">Save</button>
            </div> 
        </div>`
        );
    }
};



/*-------------------Helper Function--------------------*/

function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
    let template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}

/*-------------------Assignment 3------------------------*/
