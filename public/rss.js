var module = angular.module("Weir", []);

module.factory("Weir.Server", ["$http", "$q", function($http, $q) {
    var current = [];
    var facade = {
        getUnread: function() {
            var deferred = $q.defer();
            var req = $http.get("/stream/unread");
            req.success(function(data) {
                current = data.items;
                deferred.resolve(data.items);
            });
            return deferred.promise;
        },
        getUnreadCount: function() {
            var deferred = $q.defer();
            var req = $http.get("/stream/status");
            req.success(function(data) {
                deferred.resolve(data.unread);
            });
            return deferred.promise;
        },
        markAndGo: function() {
            var deferred = $q.defer();
            var ids = current.map(function(item) {
                return item.id;
            }).join(",");
            var req = $http.get("/stream/read", {
                params: {
                    items: ids
                }
            });
            req.success(deferred.resolve);
            return deferred.promise;
        },
        getItems: function() {
            return current;
        }
    }
    return facade;
}]);

var Stream = function($scope, Server) {
    Server.getUnread().then(function(items) { 
        $scope.items = items;
    });
	Server.getUnreadCount().then(function(count) {
        $scope.unreadCount = count;
        //$scope.apply();
    });
    $scope.refresh = function() {
        Server.markAndGo().then(function() {
            Server.getUnreadCount().then(function(count) {
                $scope.unreadCount = count;
            });
        });
    };
};
Stream.$inject = ["$scope", "Weir.Server"];


