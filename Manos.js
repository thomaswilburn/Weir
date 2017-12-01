//DO SOMETHING!

var slice = Array.prototype.slice;
var each = Array.prototype.forEach;

//call a series of functions, with the last being called when all others
//finish. Arguments can be passed in by embedding the function in an array with
//them: [f, arg1, arg2]
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
      if (returned[index]) {
        console.log(index);
        console.log(arguments);
        throw "Can't execute Manos.when callback multiple times";
      }
      returned[index] = slice.call(arguments);
      finished++;
      if (finished == all) {
        done.apply(null, returned);
      }
    });
    f.apply(null, args);
  });
};

//Simpler version of when, doesn't try to map the input values
var parallel = function(procs, done) {
  var finished = 0;
  var tracking = [];
  procs.forEach(function(f, index) {
    f(function() {
      if (tracking[index]) return; //you can only call once per proc
      tracking[index] = Array.prototype.slice.call(arguments);
      finished++;
      if (finished == procs.length) {
        done.apply(null, tracking);
      }
    });
  });
};

//call one function after another, passing the arguments from each to the
//following function
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
  chain: chain,
  parallel: parallel
}
