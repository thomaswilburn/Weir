var FeedParser = require('feedparser');
var request = require('request');
var pg = require('pg');
var EventEmitter = require('events').EventEmitter;
var cfg = require("./Config");
var Manos = require("./Manos");
var console = require("./DevConsole");

var noop = function() {};

var database = null;

var setDB = function(db) {
  database = db;
};

var feedsPerFetch = 4;

var fetch = function() {
  if (Hound.busy) return;
  Hound.busy = true;
  Hound.emit("fetch:start");
  console.log("Starting fetch...");
  database.getFeeds(function(err, rows) {
    //awkward
    if (rows.length == 0) {
      Hound.busy = false;
      return;
    }

    var done = function() {
      Hound.busy = false;
      Hound.emit("fetch:end");
      console.log("All done!");
      var interval = (cfg.updateInterval || 15) * 60 * 1000;
      setTimeout(fetch, interval);
    }

    var pull = function() {

      var chunk = rows.slice(0, feedsPerFetch);
      rows = rows.slice(feedsPerFetch);

      if (!chunk.length) {
        return done();
      }

      var schedule = [];

      chunk.forEach(function(row) {
        schedule.push(function(c) {

          var r = request({
            url: row.url,
            headers: {
              "If-Modified-Since": row.pulled && row.pulled.toGMTString(),
              "Connection": "close"
            },
            jar: false,
            timeout: cfg.requestTimeout * 1000 || 30
          });
          
          r.on("error", function(err) {
            if (r.response && r.response.statusCode == 304) {
              //some servers send 304 badly
              database.setFeedResult(row.id, 304);
              return c();
            }
            console.log("Request error:", row.url, err.code);
            database.setFeedResult(row.id, 0);
            c();
          });
          
          r.on("response", function(response) {

            if (response.statusCode !== 200) {
              //Not Modified isn't an error
              if (response.statusCode !== 304) {
                console.log("Unsuccessful request:", row.url);
              }
              database.setFeedResult(row.id, response.statusCode);
              return c();
            };

            var parser = new FeedParser();

            parser.on('complete', function(meta, articles) {
              Hound.busy = false;
              database.setFeedResult(row.id, 200);
              saveItems(row.id, meta, articles);
              c();
            });

            parser.on("error", function() {
              console.log("Broken feed:", row.url);
              database.setFeedResult(row.id, 0);
              c();
            });

            r.pipe(parser);

          });

        });

      });

      //at the end, call back again for more feeds
      schedule.push(pull);

      Manos.when.apply(null, schedule);

    };

    pull();

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
      var date = article.pubDate instanceof Date ? article.pubDate.getTime() : null;
      //don't add old articles, assuming a pubdate is available
      if (date && date < Date.now() - (cfg.expirationDate * 1000 * 60 * 60 * 24)) {
        return;
      }
      var unique = marks.every(function(item) {
        var published = item.published instanceof Date ? item.published.getTime() : null;
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
Hound.start = fetch;

module.exports = Hound;
