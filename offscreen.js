chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'parseHTML') {
        console.log(
            '[x-link-expander] offscreen: parsing HTML string of length',
            message.htmlString?.length,
        );
        const parser = new DOMParser();
        const doc = parser.parseFromString(message.htmlString, 'text/html');
        const rows = doc.querySelectorAll('div#redirectDetails div.chain-card');
        console.log(
            `[x-link-expander] offscreen: found ${rows.length} chain-card row(s)`,
        );

        let resolvedUrl = null;

        // Walk backwards through the redirect chain rows to find the last
        // valid absolute http(s) URL, skipping error rows and relative paths.
        for (let i = rows.length - 1; i >= 0; i--) {
            const row = rows[i];

            // Skip rows whose status badge says "Error"
            const badge = row.querySelector('span.http-badge');
            const badgeText = badge?.textContent.trim().toLowerCase();
            if (
                ['error', '400', '404', '500', '502', '503'].includes(badgeText)
            ) {
                console.log(
                    `[x-link-expander] offscreen: skipping row ${i} with badge "${badgeText}"`,
                );
                continue;
            }

            const anchor = row.querySelector('a.chain-url');
            if (!anchor) {
                console.log(
                    `[x-link-expander] offscreen: skipping row ${i} - no anchor found`,
                );
                continue;
            }

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

        console.log('[x-link-expander] offscreen: resolved URL:', resolvedUrl);
        sendResponse({ url: resolvedUrl });
    }
});
