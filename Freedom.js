var xml2js = require("xml2js");
var server = require("./Server");
var db = require("./Database");
var pg = db.raw;
var Hound = require("./Hound");

var add = function(outline, tags) {
  //no tag support yet, working on it
  var query = pg.query("INSERT INTO feeds (title, url, site_url) VALUES ($1, $2, $3)",
    [outline.title, outline.xmlUrl, outline.htmlUrl],
    function(err, data) {
      if (err) console.log(err);
    }
  );
}

var iterate = function(node, tags) {
  //handle looping over children
  tags = tags || [];
  if (node instanceof Array) {
    return node.forEach(function(item) {
      iterate(item, tags)
    });
  }
  if (node.outline) {
    if (node.$ && node.$.text) tags.push(node.$.text);
    iterate(node.outline, tags);
  }
  if (node.$ && node.$.xmlUrl) {
    add(node.$, tags);
  }
};

server.route("/meta/import/opml", function(req) {
  xml2js.parseString(req.body, function(err, data) {
    if (err) {
      return req.reply({error: "Couldn't parse XML"});
    }
    
    iterate(data.opml.body);
    
    Hound.fetch();
    
    req.reply({status: "Import in progress"});
  });
});

server.route("/meta/export/opml", function(req) {
  //this is a terrible way to handle things, should either template or add a real XML builder
  var output = "";
  output += '<?xml version="1.0" encoding="UTF-8"?>';
  output += '<opml version="1.0">';
  output += '<head><title>Subscriptions from Weir</title></head>';
  output += '<body>';
  db.getFeeds(function(err, feeds) {
    for (var i = 0; i < feeds.length; i++) {
      var feed = feeds[i];
      var escape = function(str) {
        return str
          .replace(/"/g, "&quot;")
          .replace(/&/g, "&amp;")
          .replace(/'/g, "&apos;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      };
      output += '<outline text="' + escape(feed.title) + '" type="rss" xmlUrl="' + escape(feed.url) + '" htmlUrl="' + escape(feed.site_url) + '"/>\n';
    }
    output += '</body>';
    output += '</opml>';
    req.replyDirect({
      headers: {
        "Content-Type": "application/xml"
      },
      body: output
    });
  });
});
