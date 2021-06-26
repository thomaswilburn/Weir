var observer = new IntersectionObserver(function(list) {
  for (var entry of list) {
    entry.target.visible = entry.isIntersecting;
    entry.target.dispatchEvent(new CustomEvent("visibility", { detail: {
      visible: entry.isIntersecting
    }}));
  }
});

class VisibilityObserver extends HTMLElement {
  constructor() {
    super();
    this.visible = false;
  }

  connectedCallback() {
    observer.observe(this);
  }

  disconnectedCallback() {
    observer.unobserve(this);
  }
}

window.customElements.define("visibility-observer", VisibilityObserver);