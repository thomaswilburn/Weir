(function() {

  var Weir = angular.module("Weir");

  //stream controller handles UI for the stream and status
  Weir.controller("Weir.StreamController", [
    "$scope",
    "Weir.Server",
    "$document",
    "Weir.Scroll",
    function($scope, Server, $document, Scroll) {

      $scope.showSettings = false;
      $scope.stream = Server.stream;

      $scope.activate = function(item) {
        Server.activate(item);
        Scroll.toID(item.id);
      };

      $scope.mark = function(item) {
        Server.markAsRead(item);
      }

      $scope.markRefresh = function() {
        $scope.message = "Marking items as read, refreshing...";
        Server.markAll().then(function() {
          $scope.message = "";
          Scroll.toID("top");
        });
      };

      $scope.refresh = function() {
        $scope.message = "Refreshing feeds...";
        Server.refresh().then(function() {
          $scope.message = "";
          Scroll.toID("top");
        });
      }

      $scope.next = function() {
        var stream = Server.stream.items;
        var current = stream.filter(function(i) { return i.active }).pop();
        var currentIndex = stream.indexOf(current);
        if (currentIndex == stream.length - 1) {
          return $scope.markRefresh();
        }
        $scope.activate(stream[currentIndex + 1]);
      };

      $scope.previous = function() {
        var stream = Server.stream.items;
        var current = stream.filter(function(i) { return i.active }).pop();
        var currentIndex = stream.indexOf(current);
        if (currentIndex == 0) return;
        $scope.activate(stream[currentIndex - 1]);
      }

      angular.element($document).bind("keypress", function(e) {
        var key = String.fromCharCode(e.charCode).toLowerCase();
        switch (key) {
          case "j":
            $scope.next();
            break;

          case "k":
            $scope.previous();
            break;

          case ".":
            $scope.markRefresh();
            break;

          case "r":
            $scope.refresh();
            break;

          case " ":
            //adjust selection based on position
            break;
        }
      });

      $scope.toggleSettings = function(state) {
        $scope.showSettings = state;
      }
    }]);

})();

