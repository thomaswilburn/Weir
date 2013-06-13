(function() {

  var Weir = angular.module("Weir");

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

})();