chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'parseHTML') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(message.htmlString, 'text/html');
        const url = doc.querySelector(
            'div#target>table>tbody>tr:last-child a',
        )?.textContent;
        sendResponse({ url: url || null });
    }
});
