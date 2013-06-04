var FeedParser = require('feedparser');
var request = require('request');
var pg = require('pg');
var EventEmitter = require('events').EventEmitter;
var cfg = require("./Config.js");

var noop = function() {};

var database = null;

var setDB = function(db) {
  database = db;
};

var feedSlice = 0;

var fetch = function() {
  if (Hound.busy) return;
  Hound.busy = true;
  Hound.emit("fetch:start");
  database.getFeeds(function(err, rows) {
    //trim feeds down to 1/10, so as not to request everything at once
    rows = rows.filter(function(row, i) {
      return i.toString().split("").pop() == feedSlice;
    });
    feedSlice = (feedSlice + 1) % 10;
    rows.forEach(function(row) {
      var r = request(row.url);
      r.on("error", function(err) {
        console.log("Request error:", row.url, err);
        if (err.code == "ENOTFOUND" || err.code == "EHOSTUNREACH") {
          database.setFeedResult(row.id, 0);
        }
      });
      r.on("response", function(response) {
        if (response.statusCode !== 200) {
          console.log("Unsuccessful request:", row.url);
          database.setFeedResult(row.id, response.statusCode);
          return;
        };
        var parser = new FeedParser();
        parser.on('complete', function(meta, articles) {
          Hound.busy = false;
          database.setFeedResult(row.id, 200);
          saveItems(row.id, meta, articles);
        });
        parser.on("error", function() {
          console.log("Broken feed:", row.url);
          database.setFeedResult(row.id, 0);
        });
        r.pipe(parser);
      });
    });
  });
};

var saveItems = function(feed, meta, articles) {
  var added = 0;
  database.getIdentifiers(feed, function(err, marks) {
    var max = cfg.feedMax || 20;
    if (articles.length > max) {
      articles = articles.slice(0, max);
    }
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
        added++;
      }
    });
    //if (added) console.log("Added", added, "items from", meta.title);
  });
};

var Hound = new EventEmitter();
Hound.fetch = fetch;
Hound.setDB = setDB;

module.exports = Hound;
