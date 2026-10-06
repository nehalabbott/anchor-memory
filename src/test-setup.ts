import '@testing-library/jest-dom/vitest'
// jsdom lacks these; the app guards for them but components call scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {}

// jsdom has no matchMedia; default to "no reduced motion" so animation-driven components
// (e.g. PondScene) run their normal path in tests unless a test overrides this.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList
}
