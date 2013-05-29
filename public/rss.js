var Status = function($scope, $http) {
	var req = $http.get("/stream/status");
	req.success(function(data) {
		console.log(data);
		$scope.unreadCount = data.unread;
	});
};
Status.$inject = ["$scope", "$http"];

var Stream = function($scope, $http) {
	var req = $http.get("/stream/unread");
	req.success(function(data) {
		$scope.items = data.items;
	});
};
Stream.$inject = ["$scope", "$http"];
