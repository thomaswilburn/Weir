import ElementBase from "./lib/elementBase.js";
import events from "./lib/events.js";
import h from "./lib/dom.js";
import * as config from "./config.js";
import * as server from "./lib/server.js";
import { TOTPError } from "./lib/api.js";

import "./story-entry.js";
import "./action-button.js";
import "./visibility-observer.js";

const CHECK_INTERVAL = config.pingInterval || 2 * 60 * 1000;

var favicon = document.querySelector("link[rel=icon]");

class StoryList extends ElementBase {
  static boundMethods = [
    "onSelect",
    "updateCounts",
    "getStories",
    "getCounts",
    "markAll",
    "selectOffset",
    "onTabVisibility",
    "onElementVisibility"
  ];

  constructor() {
    super();

    this.stories = [];
    this.firstLoad = true;
    this.addEventListener("story-click", this.onSelect);

    events.on("stream:counts", this.updateCounts);
    events.on("connection:established", this.getStories);

    events.on("stream:refresh", this.getStories);
    events.on("stream:mark-all", this.markAll);

    events.on("stream:next", () => this.selectOffset(1));
    events.on("stream:previous", () => this.selectOffset(-1));

    document.addEventListener("visibilitychange", this.onTabVisibility);

    this.elements.list.addEventListener("visibility", this.onElementVisibility);

    this.timeout = null;
    this.selected = null;
    this.loading = null;
    this.counts = {};
  }

  connectedCallback() {
    this.getStories();
    window.setTimeout(this.getCounts, CHECK_INTERVAL);
  }

  async getCounts() {
    // cancel any pending timeout
    if (this.timeout) window.clearTimeout(this.timeout);
    // schedule the next check
    this.timeout = window.setTimeout(this.getCounts, CHECK_INTERVAL);
    // actually get the counts
    var unread = 0;
    try {
      var counts = await server.getCounts();
      unread = counts.unread * 1;
    } catch (err) {
      // connection-status handles error display now
    }
    // if we were empty, either get items now, or
    // (if the tab is hidden) wait for it to resurface
    if (unread && !this.stories.length) {
      if (document.visibilityState != "visible") {
        // this can be added multiple times, it'll only fire once
        document.addEventListener("visibilitychange", this.getStories, { once: true });
      } else {
        this.getStories();
      }
    }
  }

  async getStories() {
    if (this.loading) return;
    this.loading = true;
    events.fire("toast:alert", "Loading...", 500);
    events.fire("stream:loading");
    this.elements.refreshButton.classList.add("working");
    this.elements.refreshButton.disabled = true;
    try {
      var items = await server.getUnread();
      this.updateStoryList(items);
    } catch (err) {
      // check for TOTP
      if (!(err instanceof TOTPError)) {
        // throw a status toast if it fails
        events.fire("toast:error", "Something went wrong!");
        console.log(err);
      }
    }
    this.loading = false;
    this.elements.refreshButton.disabled = false;
    this.elements.refreshButton.classList.remove("working");
  }

  async markAll() {
    var count = this.stories.length;
    if (!count) return this.getStories();
    if (this.loading) return;
    this.loading = true;
    var plural = count > 1 ? "items" : "item";
    events.fire("toast:alert", `Marking ${count} ${plural} as read...`, 1500);
    var ids = this.stories.map(s => s.id);
    this.elements.markButton.disabled = true;
    this.elements.markButton.classList.add("working");
    try {
      var items = await server.markRefresh(ids);
      this.updateStoryList(items);
    } catch (err) {
      // throw status toast
      events.fire("toast:error", "Something went wrong!");
    }
    this.loading = false;
    this.elements.markButton.disabled = false;
    this.elements.markButton.classList.remove("working");
  }

  updateStoryList(items) {
    var listed = items.map((item) => {
      return h(
        "story-entry",
        {
          story: item.id,
        },
        [
          h("span", { slot: "feed" }, item.feed),
          h("span", { slot: "title" }, item.title),
        ]
      );
    });

    this.replaceChildren(...listed);

    this.stories = items;
    this.selectStory(items[0]);
    if (this.firstLoad) {
      this.scrollIntoView({ behavior: "smooth" });
      this.firstLoad = false;
    }
  }

  onSelect(e) {
    var matching = this.stories.find((s) => s.id == e.target.story);
    if (!matching) return;
    this.selectStory(matching);
    events.fire("view:reader");
  }

  selectStory(story) {
    this.selected = story;
    if (story) for (var c of this.children) {
      var selected = c.story == story.id;
      c.classList.toggle("selected", selected);
      if (selected && this.elements.list.visible) {
        // this.dispatch("requestscroll", { element: c, behavior: "smooth" });
        c.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
    events.fire("reader:render", story);
    this.setFavicon(false);
  }

  selectOffset(offset = 1) {
    if (!this.selected) return events.fire("view:list");
    var currentIndex = this.stories.indexOf(this.selected);
    if (currentIndex == -1) return;
    var index = currentIndex + offset;
    if (index >= this.stories.length) {
      return this.markAll();
    }
    if (index < 0) return;
    var shifted = this.stories[index];
    this.selectStory(shifted);
  }

  updateCounts(e) {
    var { unread, total, last } = e;
    unread *= 1;
    this.elements.unread.innerHTML = unread;
    this.elements.total.innerHTML = total;
    document.title = `Weir (${unread})`;
    var changed = last != this.counts.last;
    if (changed && unread) {
      this.setFavicon(true);
    }
    this.counts = { unread, total, last };
  }

  async setFavicon(alert) {
    var oldIcon = favicon;
    favicon = document.createElement("link");
    favicon.rel = "shortcut icon";
    favicon.setAttribute("type", "image/png");
    favicon.href = `./${alert ? "favicon" : "favicon-nulled"}.png`;
    oldIcon.remove();
    await new Promise(ok => requestAnimationFrame(ok));
    document.head.append(favicon);
  }

  onTabVisibility() {
    if (document.visibilityState != "visible") {
      this.setFavicon(false);
    }
  }

  onElementVisibility(e) {
    if (e.detail.visible && this.selected) {
      var child = this.querySelector(`[story="${this.selected.id}"]`);
      console.log(child);
      if (!child) return;
      child.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
}

StoryList.define("story-list", "story-list.html");
