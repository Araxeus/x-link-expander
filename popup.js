document.addEventListener('DOMContentLoaded', () => {
    const statsEl = document.getElementById('stats');

    chrome.storage.local.get(['redirectCount'], result => {
        const count = result.redirectCount || 0;
        statsEl.textContent = `Links redirected: ${count}`;
    });
});
