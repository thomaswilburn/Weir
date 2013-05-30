console.log("hello");
var module = angular.module("Weir", []);

module.service("Weir.Server", ["$http", "$q", function($http, $q) {
  var facade = {
    current: [],
    unreadCount: 0,
    getUnread: function() {
      var deferred = $q.defer();
      var req = $http.get("/stream/unread");
      req.success(function(data) {
        facade.current = data.items;
        deferred.resolve(data.items);
      });
      return deferred.promise;
    },
    getUnreadCount: function() {
      var deferred = $q.defer();
      var req = $http.get("/stream/status");
      req.success(function(data) {
        facade.unreadCount = data.unread;
        deferred.resolve(data.unread);
      });
      return deferred.promise;
    },
    markAndGo: function() {
      var deferred = $q.defer();
      var ids = facade.current.map(function(item) {
        return item.id;
      }).join(",");
      var req = $http.get("/stream/read", {
        params: {
          items: ids
        }
      });
      req.success(function() {
        facade.getUnread().then(function() {
          facade.getUnreadCount();
        });
        deferred.resolve();
      });
      return deferred.promise;
    },
    getItems: function() {
        return current;
    }
  }
  return facade;
}]);

var Menu = function($scope, Server) {
  $scope.items = Server;
};
Menu.$inject = ["$scope", "Weir.Server"];

var Stream = function($scope, Server) {
  console.log(Server);
  $scope.items = Server;
  Server.getUnread();
  Server.getUnreadCount();
  $scope.refresh = function() {
    Server.markAndGo();
  };
};
Stream.$inject = ["$scope", "Weir.Server"];


