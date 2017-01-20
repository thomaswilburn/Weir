var Weir = require("./Module");

//Weir.Server talks to the DB and gets stream updates
Weir.service("Weir.Server", [
  require("./Service.Request"),
  require("./Service.Sanitize"),
  require("./Service.LocalSettings"),
  "$q",
  require("./Service.Events"),
  function(Request, Sanitize, Settings, $q, Events) {
    var ask = Request.ask;

    var stream = {
      items: [],
      unread: 0,
      total: 0,
      cursor: 0,
      currentItem: null,
      updatedAt: new Date(),
      loading: false
    };

    var updateStatus = function(data) {
      stream.unread = data.unread || 0;
      stream.total = data.total || stream.total;
      stream.updatedAt = new Date();
      Events.fire("status");
    };
    
    var updateItems = function(data) {
      if (!data.items) return;
      data.items.forEach(function(item) {
        item.content = Sanitize.prepare(item.content, item.site);
      });
      stream.items = data.items;
      stream.cursor = null;
      if (Settings.get().stream.startActive && stream.items.length) {
        facade.activate(stream.items[0]);
      }
      Events.fire("refresh");
    };

    var facade = {
      stream: stream,
      markAsRead: function(item) {
        if (item.read) return;
        item.read = true;
        ask({
          url: "./stream/mark",
          params: {
            item: item.id
          }
        }).then(function() {
          stream.unread--;
          Events.fire("status");
        });
      },
      markAll: function() {
        var ids = stream.items.map(function(item) {
          return item.id;
        });
        stream.loading = true;
        var promise = ask({
          url: "./stream/markRefresh",
          params: {
            items: ids.join(","),
            limit: Settings.get().stream.length
          }
        }).then(function(data) {
          stream.loading = false;
          updateItems(data);
          updateStatus(data);
        });
        return promise;
      },
      refresh: function() {
        stream.loading = true;
        var promise = ask({
          url: "./stream/unread",
          params: {
            limit: Settings.get().stream.length
          }
        }).then(function(data) {
          stream.loading = false;
          updateStatus(data);
          updateItems(data);
        });
        return promise;
      },
      stats: function() {
        ask({
          url: "./stream/status"
        }).then(function(data) {
          updateStatus(data);
        });
      },
      activate: function(item) {
        //check to see if this is the current item
        if (item == stream.currentItem) {
          return;
        }
        if (stream.currentItem) {
          stream.currentItem.read = true;
        }
        facade.markAsRead(item);
        stream.cursor = stream.items.indexOf(item);
        stream.currentItem = item;
        Events.fire("activated");
        return item;
      },
      next: function() {
        if (stream.cursor === null) stream.cursor = -1;
        var index = stream.cursor + 1;
        var item = stream.items[index];
        if (item) {
          return facade.activate(item);
        }
        return false;
      },
      previous: function() {
        var index = stream.cursor - 1;
        var item = stream.items[index];
        if (item) {
          return facade.activate(item);
        }
        return false;
      }
    }
    
    var auto = function() {
      var interval = Settings.get().stream.autoRefresh;
      if (interval) {
        facade.stats();
        //this won't work correctly yet without a refresh if it's changed
        setTimeout(auto, interval * 60 * 1000);
      }
    };
    
    facade.refresh().then(function() {
      //only kick off polling after first request
      //in case TOTP is in effect
      auto();
    });

    return facade;

}]);

module.exports = "Weir.Server";
