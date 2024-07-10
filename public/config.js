export var endpoint = "./";
export var sanitizerBlocklist = [
  "div.subscribe",
  ".feedflare",
  ".mf-viral",
  ".ebook-link-wrapper",
  "figure a svg",
  `[data-component-name="SubscribeWidgetToDOM"]`,
  "post-hero, more-from-category", // tor.com reboot in 2024
  `[id^="modal"]`, // more tor, removes the "buy book" blocks
  "figure[data-kg-thumbnail] video ~ div", // 404 Media video player
];
// export var pingInterval = 10 * 1000;
// export var updateLimit = 10;
