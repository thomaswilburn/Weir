(function() {

  var Weir = angular.module("Weir");

  //Weir.Request handles making requests with TOTP auth (eventually)
  Weir.service("Weir.Request", ["$http", "$q", function($http, $q) {
    var halted = false;

    var authFactory = function(original, deferred) {
      //authorize loops on itself, until it gets a success
      var authorize = function(data) {
        if (data && data.success) {
          halted = false;
          ajax(original).then(deferred.resolve);
          return;
        }
        var password = prompt("Please enter your TOTP key");
        var request = $http({
          url: "checkpoint",
          method: "POST",
          data: {
            totp: password
          }
        });
        request.success(authorize);
        request.error(authorize);
      };

      halted = true;
      authorize();
    };

    var ajax = function(options) {
      var defaults = {
        url: "",
        method: "GET"
      };
      var params = angular.extend(defaults, options);
      var deferred = $q.defer();
      if (halted) {
        deferred.reject();
        return deferred.promise;
      }
      var request = $http(params);
      request.success(function(data) {
        //totp is not authorized?
        if (data.challenge) {
          authFactory(params, deferred);
          return;
        }
        //otherwise, the request was good
        deferred.resolve(data);
      });
      request.error(deferred.reject);
      return deferred.promise;
    };

    return {
      ask: ajax
    }

  }]);

})();