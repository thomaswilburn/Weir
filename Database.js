//Postgres abstraction

var cfg = require("./Config");
var console = require("./DevConsole");
var url = require("url");

var pg = require("pg");
var psql = new pg.Client({
  user: cfg.database.user,
  password: cfg.database.password,
  database: cfg.database.db
});

var db = {
  raw: psql,

  //setup
  create: function() {
    return new Promise((ok, fail) => {
      psql.query("SELECT * FROM pg_catalog.pg_tables WHERE tablename = 'feeds';", function(err, data) {
        if (err || !data.rows.length) {
          psql.query("CREATE TABLE feeds (id SERIAL, title TEXT, url TEXT, site_url TEXT, pulled TIMESTAMPTZ, last_result INTEGER, etag TEXT);");
          psql.query("CREATE TABLE stories (id SERIAL, feed INTEGER, title TEXT, url TEXT, author TEXT, content TEXT, guid TEXT, read BOOLEAN DEFAULT false, published TIMESTAMPTZ DEFAULT now());");
          
          //We don't use the database for server-side options yet (possibly ever)
          //psql.query("CREATE TABLE options (name TEXT, value TEXT);");
          
          //This table will store auth tokens from the TOTP for a month
          psql.query("CREATE TABLE auth (session TEXT, expires DATE DEFAULT (now() + INTERVAL '30 days'));");
        };
      })
    });
  },

  //get all feeds for listing with unread counts, etc.
  getFeeds: async function() {
    var data = await psql.query("SELECT * FROM feeds;");
    return data.rows || [];
  },
  
  //get feeds with extra data (unread count, etc)
  getFeedsDetailed: async function(c) {
    var q = `
      select f.id, f.title, f.url, f.site_url, f.last_result, f.pulled, s.count
        from feeds as f 
        left outer join (
          select count(id), feed from stories group by feed
        ) as s on s.feed = f.id;`;
    var data = await psql.query(q);
    return data ? data.rows : [];
  },

  //get a single feed item
  getFeed: async function(id) {
    var data = await psql.query("SELECT * FROM feeds WHERE id = $1;", [id]);
    return data ? data.rows[0] : null;
  },

  //update a feed with its last fetch result code
  setFeedResult: function(id, status, etag = "") {
    return psql.query("UPDATE feeds SET last_result = $1, pulled = $2, etag = $4 WHERE id = $3;", 
      [status, new Date(), id, etag]);
  },
  
  //get story GUID and dates
  getIdentifiers: async function(feed, c) {
    var data = await psql.query("SELECT guid, title FROM stories WHERE feed = $1;", [feed]);
    return data ? data.rows : [];
  },

  //get unread items from all feeds up to limit
  getUnread: async function(limit = cfg.displayLimit || 15) {
    var q = "SELECT s.*, f.title as feed, f.site_url AS site FROM stories AS s, feeds AS f WHERE s.read = false AND s.feed = f.id ORDER BY published DESC LIMIT $1";
    var data = await psql.query(q, [limit]);
    return data ? data.rows : [];
  },
  
  //get items for a specific feed
  getFeedItems: function(feed, c) {
  
  },

  //add an item for a specific feed
  addItem: function(feed, article) {
    //if there's no pubdate, we use null 
    var date = article.pubDate || article.date || null;
    //check the URL as well
    var q = psql.query(`
      INSERT INTO stories (feed, title, url, author, content, guid, published) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [feed, article.title, article.link, article.author, article.description, article.guid, date]
    );
    q.catch(() => console.log(article.link, article.pubDate));
    return q;
  },
  
  updateItem: function(id, article) {
    return psql.query("UPDATE stories SET content = $2, published = $3 WHERE id = $1",
      [id, article.description, article.date], c);
  },
  
  //subscribe to a URL
  subscribe: async function(metadata) {
    var data = await psql.query(`
      INSERT INTO feeds (title, url, site_url)
      VALUES ($1, $2, $3)
      RETURNING id;`,
      [metadata.title, metadata.url, metadata.site_url]
    );
    return data ? data.rows[0] : {};
  },
  
  //unsubscribe from a feed
  unsubscribe: async function(id) {
    var fQuery = psql.query("DELETE FROM feeds WHERE id = $1;", [id]);
    var sQuery = psql.query("DELETE FROM stories WHERE feed = $1;", [id]);
    var [ feeds, stories ] = await Promise.all([fQuery, sQuery]);
    if (!feeds[0] && !stories[0]) {
      return {
        result: "success",
        removedFeeds: feeds[1].rowCount,
        removedStories: stories[1].rowCount
      };
    }
  },
  
  //mark item as read or unread (default read)
  mark: function(item, unread = false) {
    var q = "UPDATE stories SET read = $1 WHERE id = $2";
    return psql.query(q, [!unread, item]);
  },
  
  getUnreadCount: async function(c) {
    var q = "SELECT count(read) FROM stories WHERE read = false;";
    var data = await psql.query(q);
    return data ? data.rows[0].count : 0;
  },

  getTotal: async function(c) {
    var q = "SELECT count(read) FROM stories;";
    var data = await psql.query(q);
    return data ? data.rows[0].count : 0;
  },

  //preferred over individual calls to getUnreadCount and getTotal
  getStatus: async function(c) {
    var q = "SELECT COUNT(CASE WHEN read THEN null ELSE 1 END) AS unread, COUNT(read) AS total, MAX(id) AS last FROM stories;";
    var data = await psql.query(q);
    return data && data.rows[0];
  },
  
  //cull old database items
  reapStories: async function(c) {
    //this is ugly, but intervals do not work particularly well when parameterized
    var days = (cfg.expirationDate + 2 || 33) + " days";
    var q = "DELETE FROM stories WHERE published IS NOT null AND published < now() - '" + days + "'::INTERVAL;";
    try {
      var data = await psql.query(q);
      if (data && data.rowCount) {
        console.log("Deleted " + data.rowCount + " old stories.");
      }
      return data && data.rowCount;
    } catch (err) {
      console.log("Error deleting stories:", err);
    }
  },
  
  setAuthToken: function(session, c) {
    //the database will take care of the expiration date, because Postgres is awesome.
    var q = "INSERT INTO auth (session) VALUES ($1)";
    return psql.query(q, [session]);
  },
  
  getAuthToken: async function(session, c) {
    var q = "SELECT COUNT(session) FROM auth WHERE session = $1;";
    db.reapSessions();
    var data = await psql.query(q, [session]);
    var [ result ] = data.rows;
    return result.count > 0;
  },
  
  reapSessions: async function(c) {
    var q = "DELETE FROM auth WHERE expires < now()";
    var data = await psql.query(q);
    return data && data.rowCount;
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
