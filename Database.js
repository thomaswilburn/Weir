//Postgres abstraction

var cfg = require("./Config");
var Manos = require("./Manos");

var pg = require("pg");
var psql = new pg.Client({
  user: cfg.database.user,
  password: cfg.database.password,
  database: cfg.database.db
});

var db = {
  //setup
  create: function(c) {
    psql.query("SELECT * FROM pg_catalog.pg_tables WHERE tablename = 'feeds';", function(err, data) {
      if (err || !data.rows.length) {
        psql.query("CREATE TABLE feeds (id SERIAL, title TEXT, url TEXT, pulled TIMESTAMP, last_result INTEGER");
        psql.query("CREATE TABLE stories (id SERIAL, title TEXT, url TEXT, author TEXT, content TEXT, guid TEXT, read BOOLEAN, published TIMESTAMP DEFAULT now() NOT NULL");
        psql.query("CREATE TABLE options (name TEXT, value TEXT)");
      };
    })
    
  },

  //get all feeds for listing with unread counts, etc.
  getFeeds: function(c) {
    var q = psql.query("SELECT * FROM feeds", function(err, data) {
      if (c) c(err, data.rows);
    });
  },

  //get a single feed item
  getFeed: function(id, c) {
    var q = psql.query("SELECT * FROM feeds WHERE id = " + (id * 1), function(err, data) {
      c(err, data.rows[0]);
    });
  },

  //update a feed with its last fetch result code
  setFeedResult: function(id, status) {
    psql.query("UPDATE feeds SET last_result = " + (status * 1) + " WHERE id = " + (id * 1));
  },
  
  //get story GUID and dates
  getIdentifiers: function(feed, c) {
    var q = psql.query("SELECT guid, published FROM stories WHERE feed = " + (feed * 1), function(err, data) {
      return c(err, data.rows);
    });
  },

  //get unread items from all feeds up to limit
  getUnread: function(limit, c) {
    if (typeof limit == "function") {
      c = limit;
      limit = cfg.displayLimit || 15;
    }
    var q = "SELECT s.*, f.title AS feed FROM stories AS s, feeds AS f WHERE s.read = false AND s.feed = f.id ORDER BY published DESC LIMIT " + limit;
    psql.query(q, function(err, data) {
      c(err, data && data.rows);
    });
  },
  
  //get items for a specific feed
  getItems: function(feed, c) {
  
  },

  //add an item for a specific feed
  addItem: function(feed, article, c) {
    //if there's no pubdate, we need to 
    var date = article.date || article.pubDate || new Date(2000, 0, 1);
    var q = psql.query("INSERT INTO stories (feed, title, url, author, content, guid, published) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [feed, article.title, article.link, article.author, article.description, article.guid, date]);
    q.on("error", console.log.bind(console, article.link, article.pubDate));
    if (c) return c();
  },
  
  //subscribe to a URL
  subscribe: function(url, c) {
  
  },
  
  //unsubscribe from a feed
  unsubscribe: function(feed, c) {
  
  },
  
  //mark item as read or unread (default read)
  mark: function(item, unread, c) {
    if (typeof unread == "function") {
      c = unread;
      unread = false;
    }
    var q = "UPDATE stories SET read = " + (!unread) + " WHERE id = " + (item * 1);
    psql.query(q, function(err, data) {
      if (c) c(err);
    });
  },
  
  getUnreadCount: function(c) {
    var q = "SELECT count(title) FROM stories WHERE read = false;";
    psql.query(q, function(err, data) {
      c(err, data && data.rows[0].count);
    });
  },

  getTotal: function(c) {
    var q = "SELECT count(title) FROM stories;";
    psql.query(q, function(err, data) {
      c(err, data && data.rows[0].count);
    });
  },
  
  //cull old database items
  reap: function(age, c) {
  
  },

  getStatus: function(c) {
    Manos.when(
      db.getUnreadCount,
      db.getTotal,
      function(unread, total) {
        c(unread[0] || total[0], {
          unread: unread[1],
          total: total[1]
        });
      }
    );
  }
  
};

psql.connect(function(err) {
  if (err) console.log(err);
});

module.exports = db;