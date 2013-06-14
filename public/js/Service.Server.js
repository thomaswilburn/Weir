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
        updatedAt: new Date()
      };
      
      var updateStatus = function(data) {
        stream.unread = data.unread || 0;
        stream.total = data.total || stream.total;
        stream.updatedAt = new Date();
        //can't set the title from the template
        document.title = "Weir" + (stream.unread ? " (" + stream.unread + ")" : "");
      };
      
      var updateItems = function(data) {
        data.items.forEach(function(item) {
          item.content = Sanitize.prepare(item.content, item.site);
        });
        stream.items = data.items;
        if (Settings.get().stream.startActive && stream.items.length) {
          stream.items[0].active = true;
        }
        Events.fire("refresh");
      };

      var facade = {
        stream: stream,
        markAsRead: function(item) {
          ask({
            url: "stream/mark",
            params: {
              item: item.id
            }
          }).then(function() {
            stream.unread--;
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
              //TODO: should mark as read on the server, too
            }
            post.active = false;
          }
          item.active = true;
        }
      }
      
      var auto = function() {
        facade.stats();
        //this should be set from local settings
        setTimeout(auto, 60 * 1000);
      };
      
      facade.refresh().then(function() {
        //only kick off polling after first request
        //in case TOTP is in effect
        auto();
      });

      return facade;

  }]);

})();