var profile = {username: "Patrick"};

function main(){
   // console.log("Entered Main");

    var lobby = new Lobby();
    var lobbyView = new LobbyView(lobby);
    var chatView = new ChatView();
    var profileView = new ProfileView();

    function renderRoute(){
        var address = window.location.hash;
        //console.log(address);

        if(address === "#/"){
            var page_view = document.getElementById("page-view");
            //console.log("Called renderRoute: index");
            emptyDOM (page_view);
            page_view.appendChild(lobbyView.elem);
        }
        else if(address.includes("#/chat/")){//"#/chat/room-1"
            var page_view = document.getElementById("page-view");

            var address_arr = address.split("/");
            var extracted_room = lobby.getRoom(address_arr[address_arr.length-1]);
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
        lobby: lobby,
        lobbyView: lobbyView,
        chatView: chatView,
        profileView: profileView
    });
}

window.addEventListener("load", main);


class Room{
    constructor(id, name, image, messages) {
        this.id = id;
        this.name = name;
        this.image = (image == undefined) ? "assets/everyone-icon.png" : image;
        this.messages = (messages == undefined) ? [] : messages;
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
};


class Lobby{
    constructor() {
        this.rooms = {
            0: new Room(0,"Everyone in CPEN400A","assets/everyone-icon.png",[]),
            1: new Room(1,"minecraft","assets/canucks.png",[]),
            2: new Room(2,"Canucks","assets/minecraft.jpg",[]),
            3: new Room(3,"Bibimbap","assets/bibimbap.jpg",[])
        }

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
                        <a href="#/chat/room-1">Minecraft</a>
                    </li>
                    <li>
                        <img src="assets/canucks.png">
                        <a href="#/chat/room-1">Canucks</a>
                    </li>
                    <li>
                        <img src="assets/bibimbap.jpg">
                        <a href="#/chat/room-1">Bibimbap</a>
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

        this.redrawList();

        this.buttonElem.addEventListener("click",function (){
            self.lobby.addRoom(self.lobby.rooms.length, self.inputElem.value);
            self.inputElem.value = '';
        })
    }

    redrawList(){
        //console.log(this.lobby.rooms); 
        // console.log("length: " + Object.keys(this.lobby.rooms).length);

        emptyDOM(this.listElem);
        for (var i=0; i<Object.keys(this.lobby.rooms).length; i++){
            var room_string = `<li>
                                <img src="`+ Object.keys(this.lobby.rooms)[i].image +`">
                                <a href="#/chat/`+ Object.keys(this.lobby.rooms)[i] +`">`+Object.keys(this.lobby.rooms)[i].name+`</a>
                            </li>`       
            this.listElem.appendChild(createDOM(room_string));
        }
    }
};

var ChatView = class {
    constructor() {
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
    }
    sendMessage(){
        //console.log("send message");
        if(this.room != null){
            //console.log(profile.username +" "+ this.inputElem.value);
            this.room.addMessage(profile.username, this.inputElem.value);
            this.inputElem.value = '';
        }
    }
    setRoom(room){
        this.room = room;   
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
