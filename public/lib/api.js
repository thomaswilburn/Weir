import { endpoint } from "../config.js";
import { fire } from "./events.js";

var credentials = "include";

var join = path => [endpoint, path].join("/").replace(/\/+(\w)/g, "/$1");

export class TOTPError extends Error {}

export var get = async function(path, params = {}) {
  var url = new URL(join(path), window.location.href);
  for (var k in params) {
    url.searchParams.set(k, params[k]);
  }
  try {
    var response = await fetch(url.toString(), { credentials });
  } catch (err) {
    console.log(err);
    fire("connection:error", err);
  }
  if (response.status >= 400) throw "Request failed";
  var json = await response.json();
  if (json.challenge) {
    fire("connection:totp-challenge");
    throw new TOTPError("TOTP challenge issued");
  }
  fire("connection:successful-request");
  return json;
}

export var post = async function(path, data) {
  var url = new URL(join(path), window.location.href);
  try {
    var response = await fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify(data),
      credentials
    });
  } catch (err) {
    console.log(err);
    fire("connection:error", err);
  }
  if (response.status >= 400) throw "Request failed";
  var json = await response.json();
  if (json.challenge) {
    fire("connection:totp-challenge");
    throw new TOTPError("TOTP challenge issued");
  }
  fire("connection:successful-request");
  return json;
}
