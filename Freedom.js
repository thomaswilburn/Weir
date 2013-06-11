var xml2js = require("xml2js");
var server = require("./Server");
var pg = require("./Database").raw;
var Hound = require("./Hound");

var add = function(outline, tags) {
  //no tag support yet, working on it
  var query = pg.query("INSERT INTO feeds (title, url) VALUES ($1, $2)",
    [outline.title, outline.xmlUrl],
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
