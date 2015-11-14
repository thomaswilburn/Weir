var Weir = require("./Module");

Weir.controller("Weir.SettingsController", [
  "$scope",
  require("./Service.LocalSettings"),
  require("./Service.Request"),
  require("./Service.DisplayStack"),
  require("./Service.Events"),
function($scope, Settings, Request, Stack, Events) {
  
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
    url: "./checkpoint"
  });
  
  totp.then(function(data) {
    $scope.secret = data.secret;
    $scope.secretQR = data.secretQR;
  });
  
}]);
  
  
