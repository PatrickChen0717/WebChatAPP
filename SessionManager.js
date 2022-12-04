const crypto = require('crypto');

class SessionError extends Error {};

function SessionManager (){
	// default session length - you might want to
	// set this to something small during development
	const CookieMaxAgeMs = 600000;

	// keeping the session data inside a closure to keep them protected
	const sessions = {};

	// might be worth thinking about why we create these functions
	// as anonymous functions (per each instance) and not as prototype methods
	this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
        var session_id = crypto.randomBytes(20);
        var age = (maxAge == undefined) ? 1000 : maxAge;

        var data = {
            "username": username,
            "timestamp" : Date.now(),
            "session_id": session_id
        }

        sessions[session_id.toString('hex')] = data;

        response.cookie("cpen322-session", session_id.toString('hex'), {"maxAge": age})


        const Timeout = setTimeout(function(){
            delete sessions[session_id.toString('hex')];
        }, age);

	};

	this.deleteSession = (request) => {
		if (request.username != undefined){
            delete request.username;
        }
        
        if (request.session != undefined){
            if (sessions[request.session] != undefined){
                delete sessions[request.session];
            }

            delete request.session; 
        }

	};

	this.middleware = (request, response, next) => {
        // console.log("=========================");
		// console.log(request.headers.cookie);
        if(request.headers.cookie == undefined){
            next(new SessionError("Cookie not found"));
        }
        else{
            var session_id;
            var session_id_Arr = request.headers.cookie.split(";");
            // console.log(session_id_Arr);
            for(var i=0; i<session_id_Arr.length; i++){
                if(session_id_Arr[i].includes("cpen322-session")){
                    session_id = session_id_Arr[i].split("=")[1];
                    break;
                }
            }
            
            // console.log("session_id = ",session_id);

            if(sessions[session_id] == undefined){
                next(new SessionError("Session_id not found"));
            }
            else{
                request.username = sessions[session_id].username;
                request.session = session_id;
                next(); 
            } 
                     
        }


	};

	// this function is used by the test script.
	// you can use it if you want.
	this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;