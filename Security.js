var speakeasy = require("speakeasy");
var cfg = require("./Config");
var db = require("./Database");

module.exports = {
  challenge: function(session, c) {
    //check database for token, run callback with true if found, else false
    db.getAuthToken(session, function(exists) {
      c(exists);
    });
  },
  check: function(pass, c) {
    if (!cfg.totp) return c(true);
    var secret = cfg.totp;
    var expected = speakeasy.totp({key: secret});
    if (pass == expected) {
      //return a cookie value to be set, stored
      //using speakeasy keys as random tokens is silly, but will work
      var sessionToken = speakeasy.generate_key({length: 32}).hex;
      db.setAuthToken(sessionToken, function() {
        c(true, sessionToken);
      });
      return;
    }
    return c(false);
  },
  generateKey: function() {
    var key = speakeasy.generate_key({length: 20, google_auth_qr: true});
    return {
      secret: key.base32,
      secretQR: key.google_auth_qr
    };
  }
}
