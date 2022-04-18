//const WebSocket = require('socket');
const serv = require('http').createServer();
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

var User = function(id){
	var self = {
        id:id,
        FBUID: "",
        roomIDs: [],
        isMasterClient: false,
        isHost:false,
        socket: null
    } 
    return self;
}

var Room = function(id){
	var self = {
        id:id,
        members: {},
        isOpen: false,
        readyCount:0,
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

var RoomList = {}

var UserList = {}

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
        UserList[socket.id].FBUID = data;
    })

    socket.on("fetchOpponentUID", (data)=>{
        var dataToSend = {otherPlayerFBUID: "", roomID: data}
        for(var key in RoomList[data].members)
        {
            if(RoomList[data].members[key].id != socket.id)
            {
               dataToSend.otherPlayerFBUID = UserList[RoomList[data].members[key].id].FBUID
            }
        }
        socket.emit("fetchOpponentUID", dataToSend);
        //UserList[data.targetSocketId].socket.emit("showPossibleMoves_RPC");
    })

    socket.on("enterMatchMaking", (data)=>{
        enterMatchMaking(socket, false);
    })

    socket.on("createNewRoomForPassive_RPC", (data)=>{
        enterMatchMaking(socket, true, data.isUserOnline, data.roomID);
    })

    socket.on("startNewMatch_RPC", (data) =>{
        RoomList[data.roomID].readyCount++;
        console.log("ready count " + RoomList[data.roomID].readyCount)
        data.readyCount = RoomList[data.roomID].readyCount
        for(var key in RoomList[data.roomID].members)
        {
            RoomList[data.roomID].members[key].emit("startNewMatch_RPC", data);
            
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

    
    socket.on("getAllSpawnIDsfromOtherPlayer", (data)=>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("sendAllSpawnIDsToOtherPlayer", data);
                //UserList[data.targetSocketId].socket.emit("showPossibleMoves_RPC");
            }
        }
    })

    socket.on("sendPieceUIDs", (data)=>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("receivedPieceUIDs", data);
                //UserList[data.targetSocketId].socket.emit("showPossibleMoves_RPC");
            }
        }
    })

    socket.on("showPossibleMoves_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                console.log("sending show rpc from " + socket.id + " to " + RoomList[data.roomID].members[key].id + " room id is " + data.roomID)
                RoomList[data.roomID].members[key].emit("showPossibleMoves_RPC", data);
                //UserList[data.targetSocketId].socket.emit("showPossibleMoves_RPC");
            }
        }
    })

    socket.on("hidePossibleMoves_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                console.log("sending hide rpc from " + socket.id + " to " + RoomList[data.roomID].members[key].id + " room id is " + data.roomID)
                RoomList[data.roomID].members[key].emit("hidePossibleMoves_RPC", data);
                //UserList[data.targetSocketId].socket.emit("showPossibleMoves_RPC");
            }
        }
    })

    socket.on("SpawnPiece_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("SpawnPiece_RPC", data);
                //UserList[data.targetSocketId].socket.emit("showPossibleMoves_RPC");
            }
        }
    })

    socket.on("spawnNewPiece_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("spawnNewPiece_RPC", data);
                //UserList[data.targetSocketId].socket.emit("showPossibleMoves_RPC");
            }
        }
    })

    socket.on("skipTurn_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("skipTurn_RPC", data);
                //UserList[data.targetSocketId].socket.emit("showPossibleMoves_RPC");
            }
        }
    })

    socket.on("undoLastMove_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("undoLastMove_RPC", data);
                //UserList[data.targetSocketId].socket.emit("showPossibleMoves_RPC");
            }
        }
    })

    socket.on("MoveHere_RPC", (data) =>{
        for(var key in RoomList[data.roomID].members)
        {
            if(RoomList[data.roomID].members[key].id != socket.id)
            {
                RoomList[data.roomID].members[key].emit("MoveHere_RPC", data);
                //UserList[data.targetSocketId].socket.emit("showPossibleMoves_RPC");
            }
        }
    })

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

function enterMatchMaking(socket, isPassiveMatchMaking, dontCreateRoom, roomKey) 
{
    console.log(isPassiveMatchMaking + " " + dontCreateRoom + " " + roomKey)
    var isRoomAvailable = false
    var newRoomID = ""
    for (var key in RoomList) 
    {
        if(!isPassiveMatchMaking)
        {
            if (RoomList[key].size() == 1 && RoomList[key].isOpen && RoomList[key].members[0].id != socket.id) 
            {
                // join this room
                RoomList[key].members[1] = socket
                newRoomID = key
                UserList[socket.id].roomIDs[UserList[socket.id].roomIDs.length] = key
                UserList[socket.id].isHost = false;
                isRoomAvailable = true
                break
            }
        }
        else
        {
            if(dontCreateRoom && roomKey == key)
            {
                RoomList[roomKey].members[1] = socket
                newRoomID = roomKey
                UserList[socket.id].roomIDs[UserList[socket.id].roomIDs.length] = roomKey
                UserList[socket.id].isHost = false;
                isRoomAvailable = true
            }
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
        RoomList[room.id] = room;
    }
    var _size = RoomList[newRoomID].size()

    var count = 0

    for (var key in RoomList) 
    {
        count++
    }

    console.log("room size is  " + _size + " total rooms count is " + count)

    var _memberIDs = []
    for (var i = 0; i < RoomList[newRoomID].size(); i++) 
    {
        _memberIDs[i] = RoomList[newRoomID].members[i].id
    }
    var roomData = { roomID: newRoomID, size: _size, memberIDs: _memberIDs, hostID: false, isPassive: false}
    for (var key in RoomList[newRoomID].members) 
    {
        roomData.isHost = UserList[RoomList[newRoomID].members[key].id].isHost
        if(dontCreateRoom == undefined)
        {
            RoomList[newRoomID].members[key].emit("enteredMatchMaking", roomData);
        }
        else
        {
            if(dontCreateRoom)
            {
                roomData.isPassive = true
                RoomList[newRoomID].members[key].emit("enteredMatchMaking", roomData);
            }
            else
            {
                roomData.isPassive = false
                RoomList[newRoomID].members[key].emit("enteredMatchMaking", roomData);
            }
        }
    }
}

function manageDisconnect(socket)
{
    console.log("socket Disconnected")
    if (UserList[socket.id].roomIDs != []) {
        for(var currentRoomID of UserList[socket.id].roomIDs)
        {
            if (RoomList[currentRoomID].size() == 1) {
                delete RoomList[currentRoomID]
                var count = 0
                for (var key in RoomList) {
                    count++
                }
                console.log("after deleting total rooms count is " + count)
            }
            else {
                for (var i = 0; i < RoomList[currentRoomID].size(); i++) {
                    if (RoomList[currentRoomID].members[i].id == socket.id) {
                        if (i == 0) {
                            RoomList[currentRoomID].members[0] = RoomList[currentRoomID].members[1]
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
                console.log("after deleting room size is  " + RoomList[currentRoomID].size() + " total rooms count is " + count)
            }
        }
        

    }
    delete UserList[socket.id];
}