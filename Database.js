//Postgres abstraction

var cfg = require("./Config");
var Manos = require("./Manos");
var console = require("./DevConsole");

var pg = require("pg");
var psql = new pg.Client({
  user: cfg.database.user,
  password: cfg.database.password,
  database: cfg.database.db
});

var db = {
  raw: psql,

  //setup
  create: function(c) {
    psql.query("SELECT * FROM pg_catalog.pg_tables WHERE tablename = 'feeds';", function(err, data) {
      if (err || !data.rows.length) {
        psql.query("CREATE TABLE feeds (id SERIAL, title TEXT, url TEXT, site_url TEXT, pulled TIMESTAMPTZ, last_result INTEGER);");
        psql.query("CREATE TABLE stories (id SERIAL, feed INTEGER, title TEXT, url TEXT, author TEXT, content TEXT, guid TEXT, read BOOLEAN DEFAULT false, published TIMESTAMPTZ DEFAULT now());");
        
        //We don't use the database for server-side options yet (possibly ever)
        //psql.query("CREATE TABLE options (name TEXT, value TEXT);");
        
        //This table will store auth tokens from the TOTP for a month
        psql.query("CREATE TABLE auth (session TEXT, expires DATE DEFAULT (now() + INTERVAL '30 days'));");
      };
    })
    
  },

  //get all feeds for listing with unread counts, etc.
  getFeeds: function(c) {
    psql.query("SELECT * FROM feeds;", function(err, data) {
      if (c) c(err, data ? data.rows : []);
    });
  },
  
  //get feeds with extra data (unread count, etc)
  getFeedsDetailed: function(c) {
    var q = "select f.id, f.title, f.url, f.site_url, f.last_result, f.pulled, s.count " +
      "from feeds as f left outer join " +
      "(select count(id), feed from stories group by feed) as s on s.feed = f.id;";
    psql.query(q, function(err, data) {
      c(err, data ? data.rows : []);
    });
  },

  //get a single feed item
  getFeed: function(id, c) {
    psql.query("SELECT * FROM feeds WHERE id = $1;", [id], function(err, data) {
      c(err, data ? data.rows[0] : null);
    });
  },

  //update a feed with its last fetch result code
  setFeedResult: function(id, status) {
    psql.query("UPDATE feeds SET last_result = $1, pulled = $2 WHERE id = $3;", 
      [status, new Date(), id]);
  },
  
  //get story GUID and dates
  getIdentifiers: function(feed, c) {
    psql.query("SELECT guid, published FROM stories WHERE feed = $1;", [feed], function(err, data) {
      return c(err, data ? data.rows : []);
    });
  },

  //get unread items from all feeds up to limit
  getUnread: function(limit, c) {
    if (typeof limit == "function") {
      c = limit;
      limit = cfg.displayLimit || 15;
    }
    var q = "SELECT s.*, f.title as feed, f.site_url AS site FROM stories AS s, feeds AS f WHERE s.read = false AND s.feed = f.id ORDER BY published DESC LIMIT $1";
    psql.query(q, [limit], function(err, data) {
      c(err, data ? data.rows : []);
    });
  },
  
  //get items for a specific feed
  getFeedItems: function(feed, c) {
  
  },

  //add an item for a specific feed
  addItem: function(feed, article, c) {
    //if there's no pubdate, we use null 
    var date = article.date || article.pubDate || null;
    var q = psql.query("INSERT INTO stories (feed, title, url, author, content, guid, published) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [feed, article.title, article.link, article.author, article.description, article.guid, date]);
    q.on("error", console.log.bind(console, article.link, article.pubDate));
    if (c) return c();
  },
  
  //subscribe to a URL
  subscribe: function(metadata, c) {
    psql.query("INSERT INTO feeds (title, url, site_url) VALUES ($1, $2, $3) RETURNING id;", [metadata.title, metadata.url, metadata.site_url], 
      function(err, data) {
        c(err, data ? data.rows[0] : {});
    });
  },
  
  //unsubscribe from a feed
  unsubscribe: function(id, c) {
    Manos.when(
      function(done) {
        psql.query("DELETE FROM feeds WHERE id = $1;", [id], done);
      },
      function(done) {
        psql.query("DELETE FROM stories WHERE feed = $1;", [id], done);
      },
      function(feeds, stories) {
        if (!feeds[0] && !stories[0]) {
          return c(null, {
            result: "success",
            removedFeeds: feeds[1].rowCount,
            removedStories: stories[1].rowCount
          });
        }
        c({err: feeds[0] || stories[0]});
      }
    );
  },
  
  //mark item as read or unread (default read)
  mark: function(item, unread, c) {
    if (typeof unread == "function") {
      c = unread;
      unread = false;
    }
    var q = "UPDATE stories SET read = $1 WHERE id = $2";
    psql.query(q, [!unread, item], function(err, data) {
      if (c) c(err);
    });
  },
  
  getUnreadCount: function(c) {
    var q = "SELECT count(read) FROM stories WHERE read = false;";
    psql.query(q, function(err, data) {
      c(err, data && data.rows[0].count);
    });
  },

  getTotal: function(c) {
    var q = "SELECT count(read) FROM stories;";
    psql.query(q, function(err, data) {
      c(err, data && data.rows[0].count);
    });
  },
  
  //preferred over individual calls to getUnreadCount and getTotal
  getStatus: function(c) {
    var q = "SELECT COUNT(CASE WHEN read THEN null ELSE 1 END) AS unread, COUNT(read) AS total from stories;";
    psql.query(q, function(err, data) {
      c(err, data && data.rows[0]);
    });
  },
  
  //cull old database items
  reapStories: function(c) {
    var q = "DELETE FROM stories WHERE published IS NOT null AND published < now() - $1::INTERVAL;";
    psql.query(q, [cfg.expirationDate || 30 + " days"], function(err, data) {
      if (data && data.rowCount) {
        console.log("Deleted " + data.rowCount + " old stories.");
      }
      if (c) c(err, data && data.rowCount);
    });
  },
  
  setAuthToken: function(session, c) {
    //the database will take care of the expiration date, because Postgres is awesome.
    var q = "INSERT INTO auth (session) VALUES ($1)";
    psql.query(q, [session], function(err) {
      c(err);
    });
  },
  
  getAuthToken: function(session, c) {
    var q = "SELECT COUNT(session) FROM auth WHERE session = $1;";
    db.reapSessions();
    psql.query(q, [session], function(err, data) {
      //if token not found, reject this session
      if (err || data.rows.pop().count == 0) {
        return c(false);
      }
      c(true);
    });
  },
  
  reapSessions: function(c) {
    var q = "DELETE FROM auth WHERE expires < now()";
    psql.query(q, function(err, data) {
      if (c) c(err, data && data.rowCount);
    });
  }
  
};

psql.connect(function(err) {
  if (err) console.log(err);
});

//cull on a timer--say, once an hour?
var cull = function() {
  //console.log("Culling database...");
  db.reapSessions();
  db.reapStories();
  setTimeout(cull, 60 * 60 * 1000);
};
cull();

module.exports = db;
