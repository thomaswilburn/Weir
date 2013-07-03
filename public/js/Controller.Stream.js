(function() {

  var Weir = angular.module("Weir");

  //stream controller handles UI for the stream and status
  Weir.controller("Weir.StreamController", [
    "$scope",
    "Weir.Server",
    "Weir.Scroll",
    "Weir.Sanitize",
    "Weir.Events",
    function($scope, Server, Scroll, Sanitize, Events) {

      $scope.stream = Server.stream;

      Scroll.top();

      $scope.activate = function(item, fromScroll) {
        Server.activate(item);
        if (!fromScroll) Scroll.toID(item.id);
      };

      $scope.mark = function(item) {
        Server.markAsRead(item);
      };

      $scope.markRefresh = function() {
        $scope.message = "Marking items as read, refreshing...";
        Server.markAll().then(function() {
          $scope.message = "";
          Scroll.top();
        });
      };

      $scope.refresh = function() {
        $scope.message = "Refreshing feeds...";
        Server.refresh().then(function() {
          $scope.message = "";
          Scroll.top();
        });
      }

      $scope.next = function() {
        var item = Server.next();
        if (item) {
          Scroll.toID(item.id);
        } else {
          return $scope.markRefresh();
        }
      };

      $scope.previous = function() {
        var item = Server.previous();
        if (item) {
          Scroll.toID(item.id);
        }
      }
      
      Events.on("refresh", function() {
        Scroll.top();
      });
      
      Events.on("key:next", $scope.next);
      Events.on("key:previous", $scope.previous);
      Events.on("key:refresh", $scope.refresh);
      Events.on("key:markRefresh", $scope.markRefresh);

    }]);

})();

