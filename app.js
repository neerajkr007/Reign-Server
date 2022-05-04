//const WebSocket = require('socket');
const express = require('express');
const app = express();
const serv = require('http').createServer(app);
serv.listen(process.env.PORT || 3000); 
const io = require('socket.io')(serv, { //8123 is the local port we are binding the demo server to
    pingInterval: 30005,		//An interval how often a ping is sent
    pingTimeout: 5000,		//The time a client has to respont to a ping before it is desired dead
    upgradeTimeout: 3000,		//The time a client has to fullfill the upgrade
    allowUpgrades: true,		//Allows upgrading Long-Polling to websockets. This is strongly recommended for connecting for WebGL builds or other browserbased stuff and true is the default.
    cookie: false,			//We do not need a persistence cookie for the demo - If you are using a load balöance, you might need it.
    serveClient: true,		//This is not required for communication with our asset but we enable it for a web based testing tool. You can leave it enabled for example to connect your webbased service to the same server (this hosts a js file).
    allowEIO3: false,			//This is only for testing purpose. We do make sure, that we do not accidentially work with compat mode.
    cors: {
      origin: "*"				//Allow connection from any referrer (most likely this is what you will want for game clients - for WebGL the domain of your sebsite MIGHT also work)
    }
  });
const { 
   v1: uuidv1,
   v4: uuidv4,
 } = require('uuid');

// const wss = new WebSocket.Server({ port: 8080 },()=>{
//     console.log('server started')
// })

// var https = require("https");
// setInterval(function() {
//     console.log("pinging myself")
//     //https.get("https://reign-socket-server.herokuapp.com/");
// }, 1200000); 


var User = function(id){
	var self = {
        id:id,
        FBUID: "",
        roomIDs: [],
        isMasterClient: false,
        isHost:false,
        socket: null,
        userName: ""
    } 
    return self;
}

var Room = function(id){
	var self = {
        id:id,
        members: {},
        isOpen: false,
        isNewGame: false,
        readyCount:0,
        hostName:"",
        isHostOnline:true,
        isCreatedByNewPlayer:false,
        size: ()=>
        {
            var count = 0;
            for (var key in self.members) {
                count++
            }
            return count
        }
    } 
    return self;
}

app.get('/', (req, res) =>
{
    console.log("page pinged")
    res.send('Hello World!');
});

var RoomList = {}

var UserList = {}

var AwayUserList = {}

console.log("room list is " + Object.keys(RoomList).length)

// wss.on('connection', (socket)=>{

//     socket.id = uuidv4()
//     console.log("socket connected with id " + socket.id);
   
//     var setupData = {OpCode:0, myID:socket.id}
    
//     socket.send(JSON.stringify(setupData));

//     var user = User(socket.id)
//     user.socket = socket;
//     UserList[user.id] = user;

//     for (var key in UserList) {
//         //console.log(key)
//         //console.log(UserList[key])
//     }
    
//     socket.on('message', (message)=>{

//         const obj = JSON.parse(message.toString());
//         //console.log(obj.OpCode);
        
//         if(obj.OpCode == 1)
//         {
//             var isRoomAvailable = false
//             for (var key in RoomList) 
//             {
//                 if(RoomList[key].size() == 1 && RoomList[key].isOpen)
//                 {
//                     // join this
//                     RoomList[key].members[1] = socket
//                     currentRoomID = key
//                     UserList[socket.id].isHost = false;
//                     isRoomAvailable = true
//                     break
//                 }
//             }
//             if(!isRoomAvailable)
//             {
//                 var room = Room(uuidv1())
//                 room.members[0] = socket;
//                 currentRoomID = room.id;
//                 UserList[socket.id].isHost = true;
//                 room.isOpen = true;
//                 RoomList[room.id] = room;
//             }
//             var _size = RoomList[currentRoomID].size()
//             console.log("room size is  " + _size + " total rooms count is ")
//             var _memberIDs = []
//             for (var i = 0; i < RoomList[currentRoomID].size(); i++){
//                 _memberIDs[i] = RoomList[currentRoomID].members[i].id
//             }
//             var roomData = {OpCode : 1, roomID : currentRoomID, size : _size, memberIDs : _memberIDs, hostID : false}
//             for (var key in RoomList[currentRoomID].members){
//                 roomData.isHost = UserList[RoomList[currentRoomID].members[key].id].isHost
//                 RoomList[currentRoomID].members[key].send(JSON.stringify(roomData));
//             }
//         }
//         else if(obj.OpCode >= 10)
//         {
//             console.log("relaying message with code " + obj.OpCode)
//             UserList[obj.targetSocketId].socket.send(message.toString())
//         }

//         //socket.send(message.toString())
//     })

//     socket.on('close', ()=>{
//         console.log("socket Disconnected")
//         if(currentRoomID != "")
//         {
//             if(RoomList[currentRoomID].size() == 1)
//             {
//                 delete RoomList[currentRoomID]
//                 var count = 0
//                 for(var key in RoomList)
//                 {
//                     count++
//                 }
//                 console.log("after deleting total rooms count is " + count)
//             }
//             else
//             {
//                 for (var i = 0; i < RoomList[currentRoomID].size(); i++)
//                 {
//                     if(RoomList[currentRoomID].members[i].id == socket.id)
//                     {
//                         if(i == 0)
//                         {
//                             RoomList[currentRoomID].members[0] = RoomList[currentRoomID].members[1]
//                             delete RoomList[currentRoomID].members[1]
//                         }
//                         else
//                         {
//                             delete RoomList[currentRoomID].members[1]
//                         }
//                     }
//                 }
//                 var count = 0
//                 for(var key in RoomList)
//                 {
//                     count++
//                 }
//                 console.log("after deleting room size is  " + RoomList[currentRoomID].size() + " total rooms count is " + count)
//             }
            
//         }
//         delete UserList[socket.id];
//     })
// })

// wss.on('listening', ()=>{
//     console.log("listening to port 8080");
// })


io.on('connection', (socket) => {
	socket.id = uuidv4()
    console.log("socket connected with id " + socket.id);

    setupNewSocket(socket);

    socket.on("setMyFBUID", (data)=>{
        UserList[socket.id].FBUID = data.FBUID;
        UserList[socket.id].userName = data.userName;
    })

    socket.on("fetchOpponentUID", (data)=>{
        var dataToSend = {otherPlayerFBUID: "", roomID: data.roomID, matchID: data.matchID, otherPlayerUserName:""}
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                if(UserList[RoomList[data.roomID].members[key].id] != undefined)
                {
                    dataToSend.otherPlayerFBUID = UserList[RoomList[data.roomID].members[key].id].FBUID
                    dataToSend.otherPlayerUserName = UserList[RoomList[data.roomID].members[key].id].userName
                }
                else
                {
                    if(AwayUserList[RoomList[data.roomID].members[key].id] != undefined)
                    {
                        dataToSend.otherPlayerFBUID = AwayUserList[RoomList[data.roomID].members[key].id].FBUID
                        dataToSend.otherPlayerUserName = AwayUserList[RoomList[data.roomID].members[key].id].userName
                    }
                }
            }
        }
        socket.emit("fetchOpponentUID", dataToSend);
    })

    socket.on("enterMatchMaking", (data)=>{
        enterMatchMaking(socket, false, false);
    })

    socket.on("enterMatchMakingFromServerBrowser", (roomID)=>
    {
        RoomList[roomID].members[1] = socket
        UserList[socket.id].roomIDs[UserList[socket.id].roomIDs.length] = roomID
        UserList[socket.id].isHost = false;
        var _memberIDs = []
        for (var i = 0; i < RoomList[roomID].size(); i++) 
        {
            _memberIDs[i] = RoomList[roomID].members[i].id
        }
        var roomData = { roomID: roomID, size: RoomList[roomID].size(), memberIDs: _memberIDs, hostID: false, isPassive: false}
        for (var key in RoomList[roomID].members) 
        {
            roomData.isHost = UserList[RoomList[roomID].members[key].id].isHost
            RoomList[roomID].members[key].emit("enteredMatchMaking", roomData);
        }
    })

    socket.on("createNewRoomForPassive_RPC", (data)=>{
        enterMatchMaking(socket, true, false, data.isUserOnline, data.roomID);
    })

    socket.on("createNewRoomForNewGame", (data)=>{
        enterMatchMaking(socket, false, true);
    //     {var room = Room(uuidv1())
    //     room.members[0] = socket;
    //     newRoomID= room.id;
    //     UserList[socket.id].roomIDs[UserList[socket.id].roomIDs.length] = newRoomID
    //     UserList[socket.id].isHost = true;
    //     room.isOpen = true;
    //     room.isNewGame = true
    //     room.hostName = UserList[socket.id].userName;
    //     RoomList[room.id] = room;
    //     var _size = RoomList[newRoomID].size()

    //     var count = 0

    //     for (var key in RoomList) 
    //     {
    //         count++
    //     }

    //     console.log("new room id is " + newRoomID)
    //     console.log("room size is  " + _size + " total rooms count is " + count)

    //     var _memberIDs = []
    //     for (var i = 0; i < RoomList[newRoomID].size(); i++) 
    //     {
    //         _memberIDs[i] = RoomList[newRoomID].members[i].id
    //     }
    //     var roomData = { roomID: newRoomID, size: _size, memberIDs: _memberIDs, isHost: true, isPassive: true}
    //     RoomList[newRoomID].members[0].emit("enteredMatchMaking", roomData);
    // }
    })

    socket.on("joinNewGameRoom", (data)=>{
        if(RoomList[data.matchID] != undefined)
        {
            console.log("joining the same room as earlier")
            delete AwayUserList[RoomList[data.matchID].members[0].id]
            
            RoomList[data.matchID].members[0] = socket;
            UserList[socket.id].roomIDs[UserList[socket.id].roomIDs.length] = data.matchID
            UserList[socket.id].isHost = true;
            RoomList[data.matchID].hostName = UserList[socket.id].userName;
            RoomList[data.matchID].isHostOnline = true
            
            var _size = RoomList[data.matchID].size()
            var _memberIDs = []
            for (var i = 0; i < RoomList[data.matchID].size(); i++) 
            {
                _memberIDs[i] = RoomList[data.matchID].members[i].id
            }
            var roomData = { roomID: data.matchID, size: _size, memberIDs: _memberIDs, isHost: true, isPassive: RoomList[data.matchID].isNewGame, isNewGame: RoomList[data.matchID].isNewGame}
            socket.emit("enteredMatchMaking", roomData);
        }
    })

    socket.on("startNewMatch_RPC", (data) =>{
        if(!data.shouldReadyUp || (data.shouldReadyUp && RoomList[data.roomID].readyCount != 1))
        {
            RoomList[data.roomID].readyCount++;
        }
        console.log("ready count " + RoomList[data.roomID].readyCount + " is this a new game ? " + RoomList[data.roomID].isNewGame + " should ready up ? " + !data.shouldReadyUp + " my id is " + socket.id)
        data.readyCount = RoomList[data.roomID].readyCount
        if(RoomList[data.roomID].isNewGame)
        {
            data.askForFBUID = true;
        }
        else
        {
            data.askForFBUID = false;
        }
        for(var key in RoomList[data.roomID].members)
        {
            RoomList[data.roomID].members[key].emit("startNewMatch_RPC", data);
        }
        if(RoomList[data.roomID].isNewGame && Object.keys(RoomList[data.roomID].members).length == 2)
        {
            console.log("room " + data.roomID + " is no longer a new game");
            RoomList[data.roomID].isNewGame = false;
        }
    })

    socket.on("getASpawnID", (data)=>{
        var id = uuidv4();
        data.pieceUID = id
        for(var key in RoomList[data.roomID].members)
        {
            RoomList[data.roomID].members[key].emit("gotASpawnID", data);
        }
    })

    socket.on("getRoomsList", (data) => 
    {
        var _roomData = []
        for (var key in RoomList)
        {
            if(RoomList[key].isOpen)
            {
                _roomData[_roomData.length] = {roomID: key, hostName: RoomList[key].hostName, size: RoomList[key].size()}
            }
        }
        var __roomData = {roomData : _roomData}
        socket.emit("getRoomsList", __roomData);
    })
    
    socket.on("getAllSpawnIDsfromOtherPlayer", (data)=>{
        console.log("received")
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                console.log("sending to " + RoomList[data.roomID].members[key].id)
                RoomList[data.roomID].members[key].emit("sendAllSpawnIDsToOtherPlayer", data);
            }
        }
    })



    socket.on("sendPieceUIDs", (data)=>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("receivedPieceUIDs", data);
            }
        }
    })

    socket.on("getLatestDataFromOnlineUser", (data)=>{
        for(var key in UserList)
        {
            if (UserList[key].FBUID == data.opponentFBUID && socket != UserList[key].socket) 
            {
                UserList[key].socket.emit("getLatestDataFromOnlineUser", data);
                break;
            }
        }
    })

    socket.on("sendLatestData", (data)=>{
        for(var key in UserList)
        {
            if (UserList[key].FBUID == data.opponentFBUID && socket != UserList[key].socket) 
            {
                UserList[key].socket.emit("sendLatestData", data);
                break; 
            }
        }
    })

    socket.on("testingForTheBug", (data)=>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("testingForTheBug", data);
            }
        }
    })

    socket.on("showPossibleMoves_SocketMessage", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("showPossibleMoves_SocketMessage", data);
            }
        }
    })

    socket.on("hidePossibleMoves_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("hidePossibleMoves_RPC", data);
            }
        }
    })

    socket.on("SpawnPiece_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("SpawnPiece_RPC", data);
            }
        }
    })

    socket.on("spawnNewPiece_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("spawnNewPiece_RPC", data);
            }
        }
    })

    socket.on("skipTurn_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("skipTurn_RPC", data);
            }
        }
    })

    socket.on("undoLastMove_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("undoLastMove_RPC", data);
            }
        }
    })

    socket.on("MoveHere_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("MoveHere_RPC", data);
            }
        }
    })

    socket.on('leaveRoom', (roomID) => {
        if(RoomList[roomID])
        {
            leaveRoom(socket, roomID);
        }
	});

	socket.on('disconnect', (data) => {
        manageDisconnect(socket);
	});

});


function setupNewSocket(socket)
{
    var user = User(socket.id)
    user.socket = socket;
    UserList[user.id] = user;
    var setupData = {myID:socket.id}
    socket.emit("setMyId", setupData);
}

function enterMatchMaking(socket, isPassiveMatchMaking, isNewGame, dontCreateRoom, roomKey) 
{
    console.log(isPassiveMatchMaking + " " + dontCreateRoom + " " + roomKey)
    var isRoomAvailable = false
    var newRoomID = ""
    if(!isPassiveMatchMaking)
    {
        for (var key in RoomList) 
        {            
            if (RoomList[key].size() == 1 && RoomList[key].isOpen && RoomList[key].members[0].id != socket.id) 
            {
                // join this room
                console.log("joining room")
                RoomList[key].members[1] = socket
                newRoomID = key
                UserList[socket.id].roomIDs[UserList[socket.id].roomIDs.length] = key
                UserList[socket.id].isHost = false;
                if(!RoomList[newRoomID].isNewGame)
                {
                    RoomList[newRoomID].isNewGame = isNewGame;
                }
                RoomList[newRoomID].isOpen = false;
                isRoomAvailable = true
                break
            }
        }
    }
    else
    {
        if(dontCreateRoom)
        {
            if(Object.keys(RoomList[roomKey].members).length == 2)
            {
                if(UserList[RoomList[roomKey].members[1].id] == undefined)
                {
                    console.log(RoomList[roomKey].members[1].id + " is dead so replaced by " + socket.id)
                    RoomList[roomKey].members[1] = socket
                }
                else if(UserList[RoomList[roomKey].members[0].id] == undefined)
                {
                    console.log(RoomList[roomKey].members[0].id + " is dead so replaced by 2 " + socket.id)
                    RoomList[roomKey].members[0] = socket
                }
                else
                {
                    console.log("no changes")
                    RoomList[roomKey].members[1] = socket
                }
            }
            else
            {
                RoomList[roomKey].members[1] = socket
            }
            RoomList[roomKey].isNewGame = false;
            newRoomID = roomKey
            UserList[socket.id].roomIDs[UserList[socket.id].roomIDs.length] = roomKey
            UserList[socket.id].isHost = false;
            isRoomAvailable = true
            RoomList[roomKey].isHostOnline = true
        }
    }
    
    if (!isRoomAvailable) 
    {
        // create one here
        var room = Room(uuidv1())
        room.members[0] = socket;
        newRoomID= room.id;
        UserList[socket.id].roomIDs[UserList[socket.id].roomIDs.length] = newRoomID
        UserList[socket.id].isHost = true;
        room.isOpen = !isPassiveMatchMaking;
        room.isNewGame = isNewGame
        room.hostName = UserList[socket.id].userName;
        RoomList[room.id] = room;
        if(UserList[socket.id].roomIDs.length == 1)
        {
            RoomList[newRoomID].isCreatedByNewPlayer = true
        }
    }
    var _size = RoomList[newRoomID].size()

    var count = Object.keys(RoomList).length

    console.log("new room id is " + newRoomID)
    console.log("room size is  " + _size + " total rooms count is " + count)

    var _memberIDs = []

    for (var i = 0; i < RoomList[newRoomID].size(); i++) 
    {
        _memberIDs[i] = RoomList[newRoomID].members[i].id
    }
    var roomData = { roomID: newRoomID, size: _size, memberIDs: _memberIDs, isHost: false, isPassive: false, isNewGame: RoomList[newRoomID].isNewGame}
    for (var key in RoomList[newRoomID].members) 
    {
        roomData.forceSetOnline = false;
        if(UserList[RoomList[newRoomID].members[key].id] != undefined)
        {
            roomData.isHost = UserList[RoomList[newRoomID].members[key].id].isHost
            if(roomData.isNewGame && RoomList[newRoomID].isCreatedByNewPlayer && Object.keys(RoomList[newRoomID].members).length == 2)
            {
                if(key == 1)
                {
                    console.log("setting true for active player " + RoomList[newRoomID].members[key].id);
                    roomData.forceSetOnline = true;
                }
            }
        }
        else
        {
            roomData.isHost = AwayUserList[RoomList[newRoomID].members[key].id].isHost
        }
        
        if(dontCreateRoom == undefined)
        {
            roomData.isPassive = RoomList[newRoomID].isNewGame
            if(!roomData.isNewGame)
            {
                console.log("setting force online for 2 new players ");
                roomData.forceSetOnline = true;
            }
            if(roomData.isNewGame && Object.keys(RoomList[newRoomID].members).length == 2)
            {
                if(RoomList[newRoomID].members[key].id != socket.id)
                {
                    if(UserList[RoomList[newRoomID].members[key].id] != undefined)
                    {
                        roomData.otherPlayerFBUID = UserList[RoomList[newRoomID].members[key].id].FBUID
                    }
                    else
                    {
                        if(AwayUserList[RoomList[newRoomID].members[key].id] != undefined)
                        {
                            roomData.otherPlayerFBUID = AwayUserList[RoomList[newRoomID].members[key].id].FBUID
                        }
                    }
                }
            }
            console.log("1 : " + roomData)
            RoomList[newRoomID].members[key].emit("enteredMatchMaking", roomData);
        }
        else
        {
            if(dontCreateRoom)
            {
                roomData.isPassive = true
                console.log("2 : " + roomData)
                RoomList[newRoomID].members[key].emit("enteredMatchMaking", roomData);
            }
            else
            {
                roomData.isPassive = false
                console.log("3 : " + roomData)
                RoomList[newRoomID].members[key].emit("enteredMatchMaking", roomData);
            }
        }
    }
}

function manageDisconnect(socket)
{
    console.log("socket Disconnected")
    if (UserList[socket.id].roomIDs != []) {
        leaveRoom(socket)
    }
    delete UserList[socket.id];
}

function leaveRoom(socket, roomID)
{
    // user disconnects
    if(roomID == undefined)
    {
        for (var currentRoomID of UserList[socket.id].roomIDs) {
            if (RoomList[currentRoomID].size() == 1 && !RoomList[currentRoomID].isNewGame) {
                delete RoomList[currentRoomID]
                var count = 0
                for (var key in RoomList) {
                    count++
                }
                console.log("after leaving room total rooms count is " + count)
            }
            else if(RoomList[currentRoomID].size() == 1 && RoomList[currentRoomID].isNewGame)
            {
                RoomList[currentRoomID].isHostOnline = false
                AwayUserList[socket.id] = UserList[socket.id]
            }
            else if(RoomList[currentRoomID].size() == 2)
            {
                for (var i = 0; i < RoomList[currentRoomID].size(); i++) {
                    if(!RoomList[currentRoomID].isHostOnline)
                    {
                        delete RoomList[currentRoomID]
                        break
                    }
                    if (RoomList[currentRoomID].members[i].id == socket.id) {
                        RoomList[currentRoomID].isOpen = false
                        if (i == 0) {
                            RoomList[currentRoomID].members[0] = RoomList[currentRoomID].members[1];
                            RoomList[currentRoomID].hostName = RoomList[currentRoomID].members[0].userName; 
                            delete RoomList[currentRoomID].members[1]
                        }
                        else {
                            delete RoomList[currentRoomID].members[1]
                        }
                    }
                }
                var count = 0
                for (var key in RoomList) {
                    count++
                }
                console.log("after deleting room (size was 2) total rooms count is " + count)
            }
        }
    
    }
    else
    {
        if (RoomList[roomID].size() == 1) {
            delete RoomList[roomID]
            var count = 0
            for (var key in RoomList) {
                count++
            }
            console.log("after leaving room total rooms count is " + count)
        }
        else {
            for (var i = 0; i < RoomList[roomID].size(); i++) {
                if (RoomList[roomID].members[i].id == socket.id) {
                    if (i == 0) {
                        RoomList[roomID].members[0] = RoomList[roomID].members[1]
                        RoomList[roomID].hostName = RoomList[roomID].members[0].userName; 
                        delete RoomList[roomID].members[1]
                    }
                    else {
                        delete RoomList[roomID].members[1]
                    }
                }
            }
            var count = 0
            for (var key in RoomList) {
                count++
            }
            console.log("after leaving room size is  " + RoomList[currentRoomID].size() + " total rooms count is " + count)
        }
    }
}