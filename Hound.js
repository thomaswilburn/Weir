var FeedParser = require("feedparser");
var request = require("request");
var pg = require("pg");
var EventEmitter = require("events").EventEmitter;
var cfg = require("./Config");
var Manos = require("./Manos");
var console = require("./DevConsole");
var zlib = require("zlib");
var stream = require("stream");
var url = require("url");

var noop = function () {};

var database = null;

var setDB = function (db) {
  database = db;
};

var feedsPerFetch = cfg.feedsPerFetch || 4;

var Hound = new EventEmitter();

var makeHeaders = function (row) {
  return {
    "If-Modified-Since":
      (row.pulled && row.pulled.toUTCString()) || new Date(0).toUTCString(),
    Connection: "close",
    "Accept-Encoding": "gzip",
    "User-Agent": "Wier RSS reader"
  };
};

var fetch = async function () {
  if (Hound.busy) return;
  Hound.busy = true;
  Hound.emit("fetch:start");
  console.log("Starting fetch...");

  var done = function () {
    Hound.busy = false;
    Hound.emit("fetch:end");
    console.log("All done!");
    var interval = (cfg.updateInterval || 15) * 60 * 1000;
    setTimeout(fetch, interval);
  };

  var rows = await database.getFeeds();

  //awkward
  if (rows.length == 0) {
    return done();
  }

  var chunks = [];
  for (var i = 0; i < rows.length; i += feedsPerFetch) {
    chunks.push(rows.slice(i, feedsPerFetch));
  }

  for (var chunk of chunks) {
    var work = [];
    for (var row of chunk) {
      work.push(
        new Promise((ok, fail) => {
          var headers = makeHeaders(row);

          var r = request({
            url: row.url,
            headers: headers,
            jar: false,
            timeout: cfg.requestTimeout * 1000 || 30,
            encoding: null
          });

          r.on("error", function (err) {
            if (r.response && r.response.statusCode == 304) {
              //some servers send 304 badly
              database.setFeedResult(row.id, 304);
              return ok();
            }
            console.log("Request error:", row.url, err.code);
            database.setFeedResult(row.id, 0);
            ok();
          });

          r.on("response", function (response, body) {
            if (response.statusCode !== 200) {
              // console.log(row.url, response.statusCode);
              //Not Modified isn't an error
              if (response.statusCode !== 304) {
                console.log(
                  "Unsuccessful request:",
                  row.url,
                  response.statusCode
                );
              }
              database.setFeedResult(row.id, response.statusCode);
              return ok();
            }

            var parser = new FeedParser();

            parser.on("complete", function (meta, articles) {
              database.setFeedResult(row.id, 200);
              saveItems(row.id, meta, articles);
              ok();
            });

            parser.on("error", function () {
              console.log("Broken feed:", row.url);
              database.setFeedResult(row.id, 0);
              ok();
            });

            var encoding = response.headers["content-encoding"];
            if (encoding && encoding.indexOf("gzip") > -1) {
              var unzipper = zlib.createGunzip();
              unzipper.pipe(parser);
              unzipper.on("error", function (err) {
                console.log(row.url, err);
                ok();
              });
              r.pipe(unzipper);
              return;
            }

            r.pipe(parser);
          });
        })
      );
      await Promise.all(work);
    }
  }
};

var saveItems = async function (feed, meta, articles) {
  var added = 0;
  var marks = database.getIdentifiers(feed);
  var max = cfg.feedMax || 20;
  if (articles.length > max) {
    articles = articles.slice(0, max);
  }
  var expires = Date.now() - cfg.expirationDate * 1000 * 60 * 60 * 24;
  //console.log(feed, "markers", marks);
  for (var article of articles) {
    var date;
    //some feeds swap "pubDate" and "updated" which is stupid thanks guys
    var published =
      article.pubDate < article.date ? article.pubDate : article.date;
    if (published instanceof Date) {
      date = published.getTime();
    } else {
      date = null;
    }
    //fix bad link URLs
    var link = url.parse(article.link || article.meta.link || "");
    if (!link.host) {
      article.link = url.resolve(meta.link, link.href);
    }
    //don't add old articles
    if (date && date < expires) {
      return;
    }
    //we match on title and guid, which should be enough to prevent repeats
    //but won't catch new content that someone adds later
    //we still need to work out a call to update the text of an item if updated
    var unique = marks.every(function (item) {
      return item.title != article.title && item.guid != article.guid;
    });
    if (unique) {
      //console.log("New story found:", article.title)
      database.addItem(feed, article);
      added++;
    }
  }
  if (added) console.log("Added", added, "items from", meta.title);
};

var getMeta = function (url) {
  return new Promise((ok, fail) => {
    var r;

    try {
      r = request({
        url: url,
        headers: {
          "User-Agent": "Weir RSS Reader"
        }
      });
    } catch (e) {
      fail({ error: "Invalid URL" });
      return;
    }

    r.on("error", c);

    r.on("response", function (data) {
      if (data.statusCode !== 200) {
        return fail({
          error: "Invalid response",
          statusCode: data.statusCode,
          statusText: data.statusText
        });
      }

      var parser = new FeedParser();

      parser.on("error", function () {
        fail({ error: "Couldn't parse feed." });
      });

      parser.on("complete", function (meta) {
        ok({
          title: meta.title,
          site_url: meta.link,
          url: url
        });
      });

      r.pipe(parser);
    });
  });
};

Hound.fetch = fetch;
Hound.setDB = setDB;
Hound.start = fetch;
Hound.getMeta = getMeta;

module.exports = Hound;
