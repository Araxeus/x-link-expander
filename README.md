# X Link Expander

A Chrome extension that automatically expands `t.co` shortened URLs to their actual destination, useful when `t.co` doesn't resolve on your network.

## Why?

On some networks, `t.co` URLs do not resolve at all. This means traditional content scripts won't work since the page never loads. This extension intercepts navigation to `t.co` URLs at the browser level, resolves them via [expandurl.net](https://www.expandurl.net), and navigates directly to the actual destination URL.

## How it works

### Interception

The extension uses three complementary strategies to catch `t.co` URLs:

1. **`chrome.webNavigation.onBeforeNavigate`** — Intercepts navigations to `t.co` before the request is sent. This is the primary mechanism and handles most cases (clicking links, typing URLs, etc.).
2. **`chrome.tabs.onUpdated`** — Catches tabs whose URL is set to a `t.co` link, covering edge cases like tabs restored from session or opened programmatically.
3. **`chrome.webNavigation.onErrorOccurred`** — A fallback safety net that catches any `t.co` navigation that slipped through and failed to resolve.

### Resolution

When a `t.co` URL is detected:

1. The tab is immediately navigated to a **bundled loading page** with a spinner, so the user sees a clean "Resolving link…" screen instead of a browser DNS error.
2. The service worker POSTs the `t.co` URL to `expandurl.net` and parses the response HTML using an **offscreen document** (`DOMParser`) to extract the actual destination URL.
3. Once resolved, the tab is navigated directly to the **final destination URL**.
4. If resolution fails, the loading page shows an error message with a fallback link to open `expandurl.net` manually.

## Installation

1. Clone this repository (or download and extract the ZIP).
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `x-link-expander` folder.
5. The extension is now active. Any `t.co` URL will be automatically expanded.

## Permissions

- **`webNavigation`** — Required to intercept navigations before they hit the network and to detect navigation errors.
- **`tabs`** — Required to read tab URLs and redirect tabs.
- **`storage`** — Used to persist the redirect count.
- **`offscreen`** — Required to create an offscreen document for parsing HTML responses with `DOMParser` (not available in service workers).
- **Host permission for `*://t.co/*`** — Scopes navigation interception to `t.co` URLs only.
- **Host permission for `*://www.expandurl.net/*`** — Allows the service worker to fetch URL expansion results.

## License

MIT, See [LICENSE](LICENSE).
