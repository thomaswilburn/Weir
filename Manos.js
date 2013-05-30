//DO SOMETHING!

var slice = Array.prototype.slice;
var each = Array.prototype.forEach;

var when = function() {
  var calls = slice.call(arguments);
  var finished = 0;
  var returned = [];
  var done = calls.pop();
  var all = calls.length;
  console.log(all);
  calls.forEach(function(call, index) {
    var f = typeof call == "function" ? f : call.shift();
    var args = typeof call == "function" ? [] : call;
    args.push(function() {
      console.log(">>>", arguments);
      returned[index] = slice.call(arguments);
      finished++;
      if (finished == all) {
        done.apply(null, returned);
      }
    });
    f.apply(null, args);
  });
};

module.exports = {
  when: when
}
