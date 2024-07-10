var FeedParser = require("feedparser");
var fetch = require("node-fetch");
var pg = require("pg");
var EventEmitter = require("events").EventEmitter;
var cfg = require("./Config");
var console = require("./DevConsole");
var zlib = require("zlib");
var stream = require("stream");
var url = require("url");

var database = null;

var setDB = function (db) {
  database = db;
};

var feedsPerFetch = cfg.feedsPerFetch || 4;
// add an hour to the window for modifications
// some blogs don't generate immediately after publication, which leads to a race
var ifModifiedBuffer = 1000 * 60 * 60;

var Hound = new EventEmitter();

var makeHeaders = function (row) {
  var { pulled, etag } = row;
  var ims = pulled ? new Date(pulled - ifModifiedBuffer) : new Date(0);
  var headers = {
    Connection: "close",
    "Accept-Encoding": "gzip",
    "User-Agent": "Wier RSS reader"
  };
  if (etag) {
    headers["If-None-Match"] = etag;
  } else {
    headers["If-Modified-Since"] = ims.toUTCString();
  }
  return headers;
};

var parseFeed = function(input) {
  return new Promise(function(ok, fail) {
    var parser = new FeedParser();
    parser.on("error", fail);
    parser.on("complete", (meta, articles) => ok([meta, articles]));
    parser.write(input);
    parser.end();
  });
};

var release = async function () {
  if (Hound.busy) return;
  Hound.busy = true;
  Hound.emit("fetch:start");
  console.log("Starting fetch...");

  var rows = await database.getFeeds();

  //awkward
  if (rows.length == 0) {
    return done();
  }

  var chunks = [];
  for (var i = 0; i < rows.length; i += feedsPerFetch) {
    chunks.push(rows.slice(i, i + feedsPerFetch));
  }

  for (var chunk of chunks) {
    var work = [];
    for (var row of chunk) {
      work.push(
        new Promise(async (ok, fail) => {

          try {
            var headers = makeHeaders(row);
            var response = await fetch(row.url, { headers, timeout: 10 * 1000 });
            var etag = response.headers.get("etag");
            if (etag) {
              // etag = etag.match(/"([^"]+)"/)?.[1];
            }

            // console.log(row.url, response.status);
            if (response.status !== 200) {
              // Not Modified isn't an error
              if (response.status !== 304) {
                console.log(
                  "Unsuccessful request:",
                  row.url,
                  response.status,
                  response.statusText
                );
              }
              database.setFeedResult(row.id, response.status, etag);
              return ok();
            }

            var body = await response.text();
            var [ meta, articles ] = await parseFeed(body);
            database.setFeedResult(row.id, 200, etag);
            saveItems(row.id, meta, articles);
          } catch (err) {
            console.log("Hound request/parse error:", row.url, err);
            database.setFeedResult(row.id, 0);
          }
          // this step is basically always considered a success for flow purposes
          ok();

        })
      );
      await Promise.allSettled(work);
    }
  }

  Hound.busy = false;
  Hound.emit("fetch:end");
  console.log("All done!");
  var interval = (cfg.updateInterval || 15) * 60 * 1000;
  setTimeout(release, interval);
  
};

var saveItems = async function (feed, meta, articles) {
  var added = 0;
  var marks = await database.getIdentifiers(feed);
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

var getMeta = async function (url) {

  var headers = { "User-Agent": "Weir RSS Reader" };
  var response = await fetch(url, { headers });

  if (response.status !== 200) {
    throw {
      error: "Invalid response",
      statusCode: data.statusCode,
      statusText: data.statusText
    };
  }

  var body = await response.text();

  var [ meta ] = await parseFeed(body);
  return {
    title: meta.title,
    site_url: meta.link,
    url: url
  };

};

Hound.fetch = release;
Hound.setDB = setDB;
Hound.start = release;
Hound.getMeta = getMeta;

module.exports = Hound;
