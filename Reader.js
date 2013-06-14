var cfg = require("./Config");
var Server = require("./Server");
var stream = require("./Stream");
var db = require("./Database");
var Hound = require("./Hound");
var console = require("./DevConsole");

//sets up the database if none exists
db.create();

var Reader = function() {
	Hound.setDB(db);
	Hound.start();
};

module.exports = Reader;
