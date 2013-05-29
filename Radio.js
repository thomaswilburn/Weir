var EventEmitter = require("events").EventEmitter;

var ws = require("websocket.io");
var server = ws.listen(8081);

var sockets = [];

var cull = function() {
	sockets = sockets.filter(function(s) {
		return s.readyState != "closed";
	});
};

var radio = new EventEmitter;

server.on("connection", function(socket) {

	sockets.push(socket);

	socket.on("message", function(msg) {
		try {
			msg = JSON.parse(msg);
		} catch (e) {};
		radio.emit(msg.type, msg.data || {});
	});
	socket.on("close", function() {
		sockets = sockets.filter(function(item) {
			return item != socket;
		});
	});

});

radio.send = function(event, data) {
	cull();

	for (var i = 0; i < sockets.length; i++) {
		var socket = sockets[i];
		var json = JSON.stringify({
			type: message,
			data: data
		});
		socket.send(json);
	}
};

module.exports = radio;
