import ElementBase from "./lib/elementBase.js";
import h from "./lib/dom.js";

var families = [
  "serif",
  "sans-serif",
  "monospace",
  // "cursive",
  "fantasy",
  "system-ui",
  "var(--display-font)",
  "var(--ui-font)"
];

var weights = [
  "lighter",
  "normal",
  "bold"
];

var pick = list => list[(Math.random() * list.length) | 0];
var flip = () => Math.random() < .5;

class LetterDream extends ElementBase {
  constructor() {
    super();

    var start = 65;
    var end = start + 26;
    for (var j = 0; j < 3; j++) {
      for (var i = start; i < end; i++) {
        var text = String.fromCharCode(i);
        if (flip) text = text.toLowerCase();
        var letter = h("div.letter", text);
        this.shadowRoot.appendChild(letter);
        var duration = (30 + Math.random() * 30) * 1000;
        var delay = (Math.random() * 60) * 1000;
        letter.style.top = Math.random() * 110 - 5 + "%";
        letter.style.left = Math.random() * 110 - 5 + "%";
        letter.style.fontFamily = pick(families);
        letter.style.fontSize = 20 + Math.random() * 50 + "px";
        letter.style.fontWeight = pick(weights);

        var distance = 200;
        var dx = Math.random() * distance - (distance / 2);
        var dy = Math.random() * distance - (distance / 2);
        letter.animate([
          { transform: `translate(0%, 0%)`, opacity: 0 },
          { opacity: 1 },
          { transform: `translate(${dx}%, ${dy}%)`, opacity: 0 }
        ], {
          duration,
          iterations: Infinity,
          fill: "both"
        });
      }
    }
  }

  static template = `
<style>
:host {
  display: block;
  position: relative;
  height: 300px;
  width: 300px;
  overflow: hidden;
}

.letter {
  position: absolute;
}
</style>
<div as="container"></div>
  `
}

LetterDream.define("letter-dream");