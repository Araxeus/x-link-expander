chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'parseHTML') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(message.htmlString, 'text/html');
        const rows = doc.querySelectorAll('div#target>table>tbody>tr');

        let resolvedUrl = null;

        // Walk backwards through the redirect chain rows to find the last
        // valid absolute http(s) URL, skipping error rows and relative paths.
        for (let i = rows.length - 1; i >= 0; i--) {
            const row = rows[i];

            // Skip rows whose status badge says "Error"
            const badge = row.querySelector('td .badge');
            if (badge && badge.textContent.trim().toLowerCase() === 'error') {
                continue;
            }

            const anchor = row.querySelector('td a');
            if (!anchor) continue;

            const href = (anchor.getAttribute('href') || '').trim();
            const text = (anchor.textContent || '').trim();

            // Prefer the href attribute, fall back to the visible text content.
            // Both should be the same on expandurl.net, but just in case.
            const candidate = href || text;

            // Validate that it is an absolute http(s) URL
            try {
                const parsed = new URL(candidate);
                if (
                    parsed.protocol === 'http:' ||
                    parsed.protocol === 'https:'
                ) {
                    resolvedUrl = candidate;
                    break;
                }
            } catch {}
        }

        sendResponse({ url: resolvedUrl });
    }
});
