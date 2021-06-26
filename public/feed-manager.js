import ElementBase from "./lib/elementBase.js";
import h from "./lib/dom.js";
import { get, post } from "./lib/api.js";

class FeedManager extends ElementBase {

  static boundMethods = ["expand", "refresh", "subscribe", "unsubscribe"];

  constructor() {
    super();

    this.elements.expander.addEventListener("click", this.expand);
    this.elements.subscribeButton.addEventListener("click", this.subscribe);
    this.elements.refreshButton.addEventListener("click", this.refresh);
    this.elements.tbody.addEventListener("click", this.unsubscribe);
    this.elements.subscribeURL.addEventListener("keydown", e => e.stopPropagation());
  }

  expand() {
    var hidden = this.elements.container.toggleAttribute("hidden");
    this.elements.expander.setAttribute("aria-expanded", !hidden);
    if (!hidden) this.refresh();
  }

  async refresh() {
    var response = await get("/feeds");
    var feeds = response.feeds.sort((a, b) => (a.title < b.title ? -1 : 1));
    var rows = feeds.map(f => h("tr", [
      h("td.title", [
        h("a", { href: f.site_url }, f.title)
      ]),
      h("td.count", f.count || "0"),
      h(`td.status.${f.last_result < 400 ? "ok" : "fail" }`, f.last_result < 400 ? "ok" : "err"),
      h("td.kill", [ 
        h("button.kill", {
          "data-feed": f.id,
          "data-title": f.title
        }, "&times;")
      ])
    ]));
    this.elements.tbody.replaceChildren(...rows);
  }

  async subscribe() {
    var url = this.elements.subscribeURL.value;
    if (!url) return;
    // this shouldn't be a get!
    var response = await get("/feeds/subscribe", { url });
    console.log(response);
    this.refresh();
  }

  async unsubscribe(e) {
    var button = e.target.closest("button");
    if (!button) return;
    var { feed, title } = button.dataset;
    if (!feed) return;
    var confirmed = window.confirm(`Unsubscribe from ${title}?`);
    if (!confirmed) return;
    var response = await get("/feeds/unsubscribe", { id: feed });
    this.refresh();
  }
}

FeedManager.define("feed-manager", "feed-manager.html");
