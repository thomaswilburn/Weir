var server = require("./Server.js");
var db = require("./Database.js");

server.route("/stream/status", function(req) {
	db.getUnreadCount(function(err, count) {
		req.reply({
			unread: count
		});
	});
});

server.route("/stream/unread", function(req) {
	db.getUnread(function(err, items) {
		req.reply({
			items: items
		})
	})
});
