// Animated logo web component — copy of ~/42labs/42agents/commons/splash-login/logo.ts.
// Renders brand text with an animated copper gradient inside Shadow DOM.
//
// The class definition is guarded behind `typeof window !== "undefined"` so
// Next.js SSR doesn't trip over the `extends HTMLElement` reference (HTMLElement
// is browser-only). Client hydration registers the custom element.

const THEMES = {
  default: {
    stops: [
      { offset: "0%",   color: "#E2711D", values: "#E2711D;#F4A261;#B45309;#f5f5f5;#aaaaaa;#E2711D" },
      { offset: "15%",  color: "#F4A261", values: "#F4A261;#B45309;#E2711D;#cccccc;#f5f5f5;#F4A261" },
      { offset: "40%",  color: "#B45309", values: "#B45309;#E2711D;#F4A261;#f5f5f5;#aaaaaa;#B45309" },
      { offset: "55%",  color: "#f5f5f5", values: "#f5f5f5;#aaaaaa;#cccccc;#E2711D;#F4A261;#f5f5f5" },
      { offset: "80%",  color: "#cccccc", values: "#cccccc;#f5f5f5;#aaaaaa;#F4A261;#B45309;#cccccc" },
      { offset: "100%", color: "#f5f5f5", values: "#f5f5f5;#cccccc;#f5f5f5;#B45309;#E2711D;#f5f5f5" },
    ],
  },
};

if (typeof window !== "undefined" && !customElements.get("splash-logo")) {
  class SplashLogo extends HTMLElement {
    static observedAttributes = ["text", "height", "animated", "theme"];

    connectedCallback() {
      const text = this.getAttribute("text") || "BRAND";
      const height = parseInt(this.getAttribute("height") || "26", 10) || 26;
      const animated = this.hasAttribute("animated");
      const themeName = (this.getAttribute("theme") || "default") as keyof typeof THEMES;
      const theme = THEMES[themeName] || THEMES.default;
      const uid = `g-${Math.random().toString(36).slice(2, 8)}`;

      const viewWidth = Math.max(text.length * 22, 100);

      const stopsHtml = theme.stops
        .map(
          (s) => `
          <stop offset="${s.offset}" stop-color="${s.color}">
            ${animated ? `<animate attributeName="stop-color" values="${s.values}" dur="10s" repeatCount="indefinite"/>` : ""}
          </stop>`
        )
        .join("");

      const shadow = this.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <style>
          :host { display: inline-flex; align-items: center; }
          svg { height: ${height}px; width: auto; }
        </style>
        <svg viewBox="0 0 ${viewWidth} 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="${uid}" x1="0" y1="16" x2="${viewWidth}" y2="16" gradientUnits="userSpaceOnUse">
              ${stopsHtml}
            </linearGradient>
          </defs>
          <text x="0" y="26" fill="url(#${uid})" font-family="Space Grotesk, sans-serif" font-size="28" font-weight="400" letter-spacing="4">${text}</text>
        </svg>
      `;
    }
  }

  customElements.define("splash-logo", SplashLogo);
}

export {};
