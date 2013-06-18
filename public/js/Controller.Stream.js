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
      
      document.body.scrollTop = document.documentElement.scrollTop = 0;

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

      angular.element($document).bind("keypress", function(e) {
        var key = e.charCode ? String.fromCharCode(e.charCode).toLowerCase() : e.keyCode;
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
          case 34: //page down
            //take over scrolling, unfortunately
            e.preventDefault();
            e.stopImmediatePropagation();
            var active = document.querySelector("li.active");
            var next = active.nextSibling;
            var current = document.documentElement.scrollTop || document.body.scrollTop;
            var distance = window.innerHeight * .8;
            if (next) {
              var nextOffset = next.getBoundingClientRect().top;
              if (nextOffset < distance) distance = nextOffset;
            }
            document.documentElement.scrollTop = document.body.scrollTop = distance + current;
            if (window.scrollY == current) {
              $scope.markRefresh();
            }
            break;
        }
        $scope.$apply();
      });

      $scope.toggleSettings = function(state) {
        $scope.showSettings = state;
      }
    }]);

})();

