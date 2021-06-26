import { endpoint } from "../config.js";
import { fire } from "./events.js";

var credentials = "include";

var join = path => [endpoint, path].join("/").replace(/\/+(\w)/g, "/$1");

export var get = async function(path, params = {}) {
  var url = new URL(join(path), window.location.href);
  for (var k in params) {
    url.searchParams.set(k, params[k]);
  }
  try {
    var response = await fetch(url.toString(), { credentials });
    var json = response.json();
    if (json.challenge) {
      fire("connection:totp-challenge");
      throw "TOTP challenge issued";
    }
    fire("connection:successful-request");
    return json;
  } catch (err) {
    fire("connection:error", err);
  }
}

export var post = async function(path, data) {
  var url = new URL(join(path), window.location.href);
  try {
    var response = await fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify(data),
      credentials
    });
    var json = response.json();
    if (json.challenge) {
      fire("connection:totp-challenge");
      throw "TOTP challenge issued";
    }
    fire("connection:successful-request");
    return json;
  } catch (err) {
    fire("connection:error", err);
  }
}
