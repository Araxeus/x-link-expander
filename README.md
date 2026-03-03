# X Link Expander

A Chrome extension that redirects `t.co` shortened URLs to [expandurl.net](https://www.expandurl.net) for expansion.

## Why?

On some networks, `t.co` URLs do not resolve at all. This means traditional content scripts won't work since the page never loads. This extension intercepts navigation to `t.co` URLs at the browser level and redirects them to a URL expansion service before the network request has a chance to fail.

## How it works

The extension uses three complementary strategies to catch `t.co` URLs:

1. **`chrome.webNavigation.onBeforeNavigate`** — Intercepts navigations to `t.co` before the request is sent. This is the primary mechanism and handles most cases (clicking links, typing URLs, etc.).
2. **`chrome.tabs.onUpdated`** — Catches tabs whose URL is set to a `t.co` link, covering edge cases like tabs restored from session or opened programmatically.
3. **`chrome.webNavigation.onErrorOccurred`** — A fallback safety net that catches any `t.co` navigation that slipped through and failed to resolve.

When a `t.co` URL is detected, the tab is redirected to:

```
https://www.expandurl.net/ext?url=<original t.co URL>
```

## Installation

1. Clone this repository (or download and extract the ZIP).
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `x-link-expander` folder.
5. The extension is now active. Any `t.co` URL will be automatically redirected.

## Permissions

- **`webNavigation`** — Required to intercept navigations before they hit the network and to detect navigation errors.
- **`tabs`** — Required to read tab URLs and redirect tabs.
- **Host permission for `*://t.co/*`** — Scopes all interception to `t.co` URLs only.

## License

See [LICENSE](LICENSE).