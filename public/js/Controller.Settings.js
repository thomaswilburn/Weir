(function() {

  var Weir = angular.module("Weir");

  Weir.controller("Weir.SettingsController", [
    "$scope",
    "Weir.LocalSettings",
    "Weir.Request",
    "Weir.DisplayStack",
    "Weir.Events",
    function($scope, Settings, Request, Stack, Events) {
      var fileInput = document.querySelector(".inputOPML");
      fileInput.addEventListener("change", function() {
        var file = fileInput.files[0];
        if (file) {
          var xhr = new XMLHttpRequest();
          xhr.onload = function() { Stack.pop(); $scope.refresh(); };
          xhr.open("POST", "meta/import/opml");
          xhr.send(file);
        }
      });
      
      Events.on("stack:activate", function(e) {
        if (e.panel !== "settings") {
          return;
        }
        
        $scope.settings = Settings.get();
      });

      $scope.saveSettings = function() {
        $scope.settings.save();
        Stack.pop();
      }
      
      var totp = Request.ask({
        url: "/checkpoint"
      });
      
      totp.then(function(data) {
        $scope.secret = data.secret;
        $scope.secretQR = data.secretQR;
      });
      
    }]);
  
})();

  
