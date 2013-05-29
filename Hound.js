var FeedParser = require('feedparser');
var request = require('request');
var pg = require('pg');
var EventEmitter = require('events').EventEmitter;

var noop = function() {};

var database = null;

var setDB = function(db) {
	database = db;
};

var feedSlice = 3;

var fetch = function() {
	if (Hound.busy) return;
	Hound.busy = true;
	Hound.emit("fetch:start");
	database.getFeeds(function(err, rows) {
		console.log(rows.length);
		rows = rows.filter(function(row, i) {
			return i.toString().split("").pop() == feedSlice;
		});
		feedSlice = (feedSlice + 1) % 10;
		console.log("Pulling", rows.length, "feeds");
		rows.forEach(function(row) {
			var r = request(row.url);
			r.on("error", console.log.bind(console, row.url));
			r.on("response", function(response) {
				if (response.statusCode !== 200) return;
				var parser = new FeedParser();
				parser.on('complete', function(meta, articles) {
					Hound.busy = false;
					saveItems(row.id, meta, articles);
				});
				parser.on("error", function() {
					console.log("Broken feed:", row.url);
				});
				r.pipe(parser);
			});
		});
	});
};

var saveItems = function(feed, meta, articles) {
	database.getIdentifiers(feed, function(err, marks) {
		//console.log(feed, "markers", marks);
		articles.forEach(function(article) {
			var date = article.pubDate instanceof Date ? article.pubDate.getTime() : 0;
			var unique = marks.every(function(item) {
				var published = item.published instanceof Date ? item.published.getTime() : 0;
				return published != date && item.guid != article.guid;
			});
			if (unique) {
				//console.log("New story found:", article.title)
				database.addItem(feed, article);
			}
		});
	});
};

var Hound = new EventEmitter();
Hound.fetch = fetch;
Hound.setDB = setDB;

module.exports = Hound;
