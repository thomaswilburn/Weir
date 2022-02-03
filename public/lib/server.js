import { get, post, TOTPError } from "./api.js";
import events from "./events.js";
import * as config from "../config.js";

const UPDATE_LIMIT = config.updateLimit || 10;

export var getUnread = async function() {
  var response = await get("/stream/unread", { limit: UPDATE_LIMIT });
  var { total, unread, items, last } = response;
  events.fire("stream:counts", { total, unread, last });
  return items;
}

export var getCounts = async function() {
  var response = await get("/stream/status");
  var { total, unread, last } = response;
  events.fire("stream:counts", { total, unread, last });
  return { total, unread, last };
}

export var markRefresh = async function(items) {
  var response = await get("/stream/markRefresh", { items, limit: UPDATE_LIMIT });
  var { total, unread, items, last } = response;
  events.fire("stream:counts", { total, unread, last });
  return items;
}

export var mark = async function(item) {
  var response = await get("/stream/mark", { item });
  var { total, unread, last } = response;
  events.fire("stream:counts", { total, unread, last });
}
