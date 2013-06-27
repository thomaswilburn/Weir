module.exports = {
  log: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(new Date().toGMTString() + " - ");
    console.log.apply(console, args);
  }
}
