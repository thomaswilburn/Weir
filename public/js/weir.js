var Weir = angular.module("Weir", []);

//SERVICES

//Weir.Request handles making requests with TOTP auth (eventually)
Weir.service("Weir.Request", ["$http", "$q", function($http, $q) {
  return {
    ask: function(options) {
      //add security wrapper
      var defaults = {
        url: "",
        method: "GET"
      };
      var deferred = $q.defer();
      var request = $http(angular.extend(defaults, options));
      request.success(deferred.resolve);
      request.error(deferred.reject);
      return deferred.promise;
    }
  }
}]);

//Weir.Server talks to the DB and gets stream updates
Weir.service("Weir.Server", ["Weir.Request", "$q", function(Request, $q) {
  var ask = Request.ask;

  var stream = {
    items: [],
    unread: 0,
    total: 0,
    current: 0,
    updatedAt: new Date()
  };

  var facade = {
    stream: stream,
    markAsRead: function(item) {
      ask({
        url: "/stream/mark",
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
      ask({
        url: "/stream/markRefresh",
        params: {
          items: ids.join(",")
        }
      }).then(function(data) {
        stream.items = data.items;
        stream.unread = data.unread;
        stream.total = data.total;
        stream.updatedAt = new Date();
      });
    },
    refresh: function() {
      ask({
        url: "/stream/unread"
      }).then(function(data) {
        stream.items = data.items;
        stream.updatedAt = new Date();
      });
    },
    stats: function() {
      ask({
        url: "/stream/status"
      }).then(function(data) {
        stream.unread = data.unread;
        stream.total = data.total;
      });
    },
    activate: function(item) {
      item.active = !item.active;
      stream.current = stream.items.indexOf(current);
    }
  }

  facade.stats();
  facade.refresh();

  return facade;

}]);

//CONTROLLERS

//stream controller handles UI for the stream and status
var StreamController = function($scope, Server) {
  $scope.stream = Server.stream;

  $scope.activate = function(item) {
    item.active = !item.active;
  };

  $scope.markRefresh = function() { Server.markAll() };
};
StreamController.$inject = ["$scope", "Weir.Server"];

//feed controller talks to the DB for feed-related data
var FeedController = function($scope) {

}

//DIRECTIVES
Weir.directive("preventDefault", function() {
  return {
    restrict: "A",
    link: function(scope, element) {
      element.bind("click", function(e) {
        e.preventDefault();
      });
    }
  }
});