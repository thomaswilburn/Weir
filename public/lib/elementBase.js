export default class ElementBase extends HTMLElement {
  constructor() {
    super();
    var def = new.target;
    this.elements = {};
    if (def.template) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = def.template;
      this.shadowRoot.querySelectorAll("[as]").forEach(element => {
        var prop = element.getAttribute("as");
        this.elements[prop] = element;
      });
    }
    Object.freeze(this.elements);
    if (def.boundMethods) {
      def.boundMethods.forEach(f => this[f] = this[f].bind(this));
    }
    if (def.mirroredProps) {
      def.mirroredProps.forEach(p => Object.defineProperty(this, p, {
        get() { return this.getAttribute(p) },
        set(v) { this.setAttribute(p, v) }
      }));
    }
  }

  dispatch(event, detail) {
    var e = new CustomEvent(event, {
      bubbles: true,
      composed: true,
      detail
    });
    this.dispatchEvent(e);
  }
  
  static async define(tag, template) {
    if (template) {
      var response = await fetch(template);
      var text = await response.text();
      this.template = text;
    }
    try {
      window.customElements.define(tag, this);
    } catch (err) {
      console.log(`Unable to (re)defined ${tag}: ${err.message}`);
    }
  }
}