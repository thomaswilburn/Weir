(function() {

  var Weir = angular.module("Weir");
  
  Weir.controller("Weir.FeedController", [
    "$scope",
    "Weir.Request",
    "Weir.Events",
    function($scope, Request, Events) {
    
      $scope.feeds = [];
      $scope.batchMode = false;
      
      var results = {
        200: "ok",
        304: "ok",
        0: "error"
      }
      
      Events.on("stack:activate", function(e) {
        if (e.panel !== "feeds") return;

        $scope.loading = true;
        
        Request.ask({
          url: "feeds"
        }).then(function(data) {
          $scope.loading = false;
          if (data.feeds) {
            data.feeds.forEach(function(feed) {
              feed.health = results[feed.last_result] || "error";
            });
            $scope.feeds = data.feeds;
          }
        });
      });
      
      $scope.subscribe = function() {
        Request.ask({
          url: "feeds/subscribe",
          params: {
            url: $scope.subscribeURL
          }
        }).then(function(data) {
          if (data.error) {
            //yet another place to add error messaging
            return;
          }
          $scope.feeds.push(data);
        });
      };
      
      $scope.unsubscribe = function(item) {
        Request.ask({
          url: "feeds/unsubscribe",
          params: {
            id: item.id
          }
        }).then(function(data) {
          if (data.error) {
            //show error!
            return;
          }
          $scope.feeds = $scope.feeds.filter(function(feed) {
            return item !== feed;
          });
        });
      };
      
      var fileInput = document.querySelector(".inputOPML");
      fileInput.addEventListener("change", function() {
        var file = fileInput.files[0];
        if (file) {
          var xhr = new XMLHttpRequest();
          xhr.onload = function() { Stack.pop(); $scope.refresh(); };
          xhr.open("POST", "meta/import");
          xhr.send(file);
        }
      });

    
    }]);

})();
