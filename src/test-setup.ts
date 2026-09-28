import '@testing-library/jest-dom/vitest'
// jsdom lacks these; the app guards for them but components call scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {}
