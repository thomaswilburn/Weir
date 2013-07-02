(function() {

  var Weir = angular.module("Weir");

  //Weir.Server talks to the DB and gets stream updates
  Weir.service("Weir.Server", [
    "Weir.Request",
    "Weir.Sanitize",
    "Weir.LocalSettings",
    "$q",
    "Weir.Events",
    function(Request, Sanitize, Settings, $q, Events) {
      var ask = Request.ask;

      var stream = {
        items: [],
        unread: 0,
        total: 0,
        cursor: 0,
        currentItem: null,
        updatedAt: new Date()
      };

      var updateStatus = function(data) {
        stream.unread = data.unread || 0;
        stream.total = data.total || stream.total;
        stream.updatedAt = new Date();
        Events.fire("status");
      };
      
      var updateItems = function(data) {
        data.items.forEach(function(item) {
          item.content = Sanitize.prepare(item.content, item.site);
        });
        stream.items = data.items;
        stream.cursor = 0;
        if (Settings.get().stream.startActive && stream.items.length) {
          facade.activate(stream.items[0]);
        }
        Events.fire("refresh");
      };

      var facade = {
        stream: stream,
        markAsRead: function(item) {
          if (item.read) return;
          ask({
            url: "stream/mark",
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
          var deferred = $q.defer();
          ask({
            url: "stream/markRefresh",
            params: {
              items: ids.join(",")
            }
          }).then(function(data) {
            updateItems(data);
            updateStatus(data);
            deferred.resolve();
          });
          return deferred.promise;
        },
        refresh: function() {
          var deferred = $q.defer();
          ask({
            url: "stream/unread"
          }).then(function(data) {
            updateStatus(data);
            updateItems(data);
            deferred.resolve();
          });
          return deferred.promise;
        },
        stats: function() {
          ask({
            url: "stream/status"
          }).then(function(data) {
            updateStatus(data);
          });
        },
        activate: function(item) {
          for (var i = 0; i < stream.items.length; i++) {
            var post = stream.items[i];
            //mark previously active item as read
            if (post.active) {
              post.read = true;
            }
            post.active = false;
          }
          item.active = true;
          facade.markAsRead(item);
          stream.cursor = stream.items.indexOf(item);
          stream.currentItem = item;
          Events.fire("activated");
          return item;
        },
        next: function() {
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

})();
