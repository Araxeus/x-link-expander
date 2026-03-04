const FALLBACK_BASE = 'https://www.expandurl.net/ext?url=';

// A function to create the offscreen document if it doesn't exist
async function setupOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) return;
    console.log(
        '[x-link-expander] Creating offscreen document for HTML parsing',
    );
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_PARSER'],
        justification: 'Parsing fetched HTML content',
    });
}

async function parseUrlFromHtml(htmlString) {
    await setupOffscreenDocument();
    console.log(
        '[x-link-expander] Sending HTML to offscreen document for parsing',
    );
    const response = await chrome.runtime.sendMessage({
        action: 'parseHTML',
        htmlString,
    });
    console.log('[x-link-expander] Parsed URL from HTML:', response.url);
    return response.url;
}

async function resolveRedirectUrl(tcoUrl) {
    const res = await fetch('https://www.expandurl.net/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `url=${encodeURIComponent(tcoUrl)}`,
    });
    console.log(
        `[x-link-expander] Fetched redirect page for ${tcoUrl}, status: ${res.status}`,
    );

    return await parseUrlFromHtml(await res.text());
}

// Track tabs we've already redirected to avoid duplicate redirects
// from multiple listeners firing for the same navigation.
const redirectedTabs = new Set();

function isTcoUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname === 't.co';
    } catch {
        return false;
    }
}

function getLoadingUrl(originalUrl) {
    return chrome.runtime.getURL(
        `loading.html?url=${encodeURIComponent(originalUrl)}`,
    );
}

function getErrorLoadingUrl(originalUrl, errorMessage) {
    const fallbackUrl = FALLBACK_BASE + encodeURIComponent(originalUrl);
    return chrome.runtime.getURL(
        `loading.html?url=${encodeURIComponent(originalUrl)}&error=${encodeURIComponent(errorMessage)}&fallback=${encodeURIComponent(fallbackUrl)}`,
    );
}

async function redirectTab(tabId, originalUrl) {
    // Deduplicate: if we've already redirected this tab, skip it.
    if (redirectedTabs.has(tabId)) return;
    redirectedTabs.add(tabId);

    // Immediately show the loading page so the user doesn't stare at a DNS error
    const loadingUrl = getLoadingUrl(originalUrl);
    console.log(
        `[x-link-expander] Showing loading page for tab ${tabId}: ${originalUrl}`,
    );
    try {
        await chrome.tabs.update(tabId, { url: loadingUrl });
    } catch (err) {
        console.warn(
            `[x-link-expander] Failed to open loading page for tab ${tabId}:`,
            err,
        );
        redirectedTabs.delete(tabId);
        return;
    }

    // Now resolve the actual destination URL in the background
    try {
        const resolvedUrl = await resolveRedirectUrl(originalUrl);
        console.log(
            `[x-link-expander] Resolved tab ${tabId}: ${originalUrl} -> ${resolvedUrl}`,
        );

        if (!resolvedUrl) {
            throw new Error('Resolved URL was empty');
        }

        // Validate that the resolved URL is an absolute http(s) URL.
        // Relative paths or other schemes (e.g. chrome-extension://) must
        // not be navigated to — they indicate a malformed redirect chain.
        try {
            const parsed = new URL(resolvedUrl);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error(
                    `Resolved URL has unsupported scheme: ${parsed.protocol}`,
                );
            }
        } catch {
            throw new Error(
                `Resolved URL is not a valid absolute URL: ${resolvedUrl}`,
            );
        }

        // Navigate the tab directly to the resolved URL
        await chrome.tabs.update(tabId, { url: resolvedUrl });

        // Track redirect count
        const { redirectCount = 0 } =
            await chrome.storage.local.get('redirectCount');
        await chrome.storage.local.set({ redirectCount: redirectCount + 1 });
    } catch (err) {
        console.warn(
            `[x-link-expander] Failed to resolve ${originalUrl}:`,
            err,
        );
        // Navigate to the loading page again but with error params baked into the URL
        const errorUrl = getErrorLoadingUrl(originalUrl, err.message);
        await chrome.tabs.update(tabId, { url: errorUrl }).catch(() => {});
    } finally {
        // Clean up after a short delay so that other listeners for the same
        // navigation are still suppressed, but future navigations in this
        // tab are not blocked.
        setTimeout(() => redirectedTabs.delete(tabId), 2000);
    }
}

// 1. Intercept navigations before the request goes out.
//    This is the primary mechanism — it fires before the network request,
//    so it works even when t.co doesn't resolve at all.
chrome.webNavigation.onBeforeNavigate.addListener(
    details => {
        // Only handle top-level frame navigations
        if (details.frameId !== 0) return;
        if (!isTcoUrl(details.url)) return;

        redirectTab(details.tabId, details.url);
    },
    { url: [{ hostEquals: 't.co' }] },
);

// 2. Catch new tabs that are created with a t.co URL already set.
//    Some flows (e.g. middle-click, "open in new tab") may set the URL
//    on the pending tab before onBeforeNavigate fires.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
    if (changeInfo.url && isTcoUrl(changeInfo.url)) {
        redirectTab(tabId, changeInfo.url);
    }
});

// 3. Safety net: if a t.co navigation somehow slipped through and failed
//    (DNS error, connection refused, etc.), catch the error and redirect.
chrome.webNavigation.onErrorOccurred.addListener(
    details => {
        if (details.frameId !== 0) return;
        if (!isTcoUrl(details.url)) return;

        console.log(
            `[x-link-expander] Navigation error for ${details.url}: ${details.error}`,
        );
        redirectTab(details.tabId, details.url);
    },
    { url: [{ hostEquals: 't.co' }] },
);

console.log('[x-link-expander] Service worker loaded. Watching for t.co URLs.');
