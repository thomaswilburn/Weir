var speakeasy = require("speakeasy");
var cfg = require("./Config");
var db = require("./Database");

module.exports = {
  check: function(session) {
    //check database for token, run callback with true if found, else false
    return db.getAuthToken(session);
  },
  challenge: async function(pass) {
    if (!cfg.totp) return [ true ];
    pass = pass * 1;
    var secret = cfg.totp;
    var expected = [];
    var start = parseInt(Date.now() / 1000 - 90, 10);
    //generate a range of keys
    for (var i = 0; i < 5; i++) {
      expected.push(speakeasy.totp({key: cfg.totp, encoding: "base32", time: start + i * 30}) * 1);
    }
    console.log("Logged in with", pass, "Expected", expected);
    if (expected.indexOf(pass) >= 0) {
      //return a cookie value to be set, stored
      //using speakeasy keys as random tokens is silly, but will work
      var sessionToken = speakeasy.generate_key({length: 32}).hex;
      await db.setAuthToken(sessionToken);
      return [ true, sessionToken ];
    }
    return [ false ];
  },
  generateKey: function() {
    var key = speakeasy.generate_key({length: 16, google_auth_qr: true, name: "Weir"});
    return {
      secret: key.base32,
      secretQR: key.google_auth_qr
    };
  }
}
