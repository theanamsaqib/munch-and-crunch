import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement scrolling; ScrollRestoration calls it on navigation.
window.scrollTo = () => {}

// React Router's data router builds a Node `Request` with jsdom's AbortSignal,
// which Node rejects. The app uses no loaders, so dropping the signal is safe here.
const NodeRequest = globalThis.Request
globalThis.Request = class extends NodeRequest {
  constructor(input, init = {}) {
    const { signal: _signal, ...rest } = init
    super(input, rest)
  }
}
