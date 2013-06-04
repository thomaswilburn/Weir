//DO SOMETHING!

var slice = Array.prototype.slice;
var each = Array.prototype.forEach;

var when = function() {
  var calls = slice.call(arguments);
  var finished = 0;
  var returned = [];
  var done = calls.pop();
  var all = calls.length;
  calls.forEach(function(call, index) {
    var f = typeof call == "function" ? call : call.shift();
    var args = typeof call == "function" ? [] : call;
    args.push(function() {
      returned[index] = slice.call(arguments);
      finished++;
      if (finished == all) {
        done.apply(null, returned);
      }
    });
    f.apply(null, args);
  });
};

var chain = function() {
  var tasks = slice.call(arguments);
  var args = [];
  //get starting arguments
  if (typeof tasks[0] != "function") {
    var start = tasks.shift();
    if (start instanceof Array) {
      args = start;
    } else {
      args.push(start);
    }
  }
  var index = -1;
  var next = function() {
    var args = slice.call(arguments);
    args.push(next);
    index++;
    if (index == tasks.length) return;
    var f = tasks[index];
    f.apply(null, args);
  }
  next.apply(null, args);
};

module.exports = {
  when: when,
  chain: chain
}
