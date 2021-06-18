var FeedParser = require("feedparser");
var request = require("request");
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

var requestFeed = function(url, headers) {
  // console.log("Requesting", url);
  return new Promise(function(ok, fail) {
    var r = request({
      url,
      headers,
      jar: false,
      timeout: cfg.requestTimeout * 1000 || 30,
      encoding: null
    });

    r.pause();

    r.on("error", err => fail(r));
    r.on("response", ok);
  });
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

var readResponse = function(response) {
  return new Promise(ok => {
    var buffer = "";
    response.on("data", d => buffer += d.toString("utf-8"));
    response.on("end", () => ok(buffer));
    response.resume();
  });
};

var fetch = async function () {
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
          var headers = makeHeaders(row);

          try {
            var response = await requestFeed(row.url, headers);
            var r = response.request;
            // console.log(row.url, response.statusCode);
            if (response.statusCode !== 200) {
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

            try {
              var encoding = response.headers["content-encoding"];
              // default to uncompressed input for the parser
              var input = response;
              var compressed = encoding && encoding.indexOf("gzip") > -1;
              var body = "";
              // if compressed, feed it to the unzipper and use that as input
              if (compressed) {
                var unzipper = zlib.createGunzip();
                unzipper.on("error", function (err) {
                  console.log(row.url, err);
                  return ok();
                });
                r.pipe(unzipper);
                r.resume();
                body = await readResponse(unzipper);
              } else {
                body = await readResponse(response);
              }
              
              var [ meta, articles ] = await parseFeed(body);
              database.setFeedResult(row.id, 200);
              saveItems(row.id, meta, articles);
            } catch (err) {
              console.log("Broken feed:", err, row.url);
              database.setFeedResult(row.id, 0);
            }
          } catch (r) {
            if (r.response && r.response.statusCode == 304) {
              //some servers send 304 badly
              database.setFeedResult(row.id, 304);
            } else {
              console.log("Request error:", row.url, r);
              database.setFeedResult(row.id, 0);
            }
          }
          // this step is basically always considered a success for flow purposes
          ok();

        })
      );
      await Promise.all(work);
    }
  }

  Hound.busy = false;
  Hound.emit("fetch:end");
  console.log("All done!");
  var interval = (cfg.updateInterval || 15) * 60 * 1000;
  setTimeout(fetch, interval);
  
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
  var response = await requestFeed(url, headers);
  
  if (response.statusCode !== 200) {
    throw {
      error: "Invalid response",
      statusCode: data.statusCode,
      statusText: data.statusText
    };
  }

  var body = await readResponse(response);

  var [ meta ] = await parseFeed(body);
  return {
    title: meta.title,
    site_url: meta.link,
    url: url
  };

};

Hound.fetch = fetch;
Hound.setDB = setDB;
Hound.start = fetch;
Hound.getMeta = getMeta;

module.exports = Hound;
