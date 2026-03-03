const params = new URLSearchParams(window.location.search);
const originalUrl = params.get('url');
const error = params.get('error');
const fallbackUrl = params.get('fallback');

if (originalUrl) {
    document.getElementById('original-url').textContent = originalUrl;
}

if (error) {
    document.getElementById('spinner').style.display = 'none';
    document.querySelector('.text h1').textContent = 'Failed to resolve link';
    document.querySelector('.text p').textContent = error;

    const errorContainer = document.getElementById('error-container');
    errorContainer.style.display = 'block';

    if (fallbackUrl) {
        const link = document.getElementById('fallback-link');
        link.href = fallbackUrl;
        link.style.display = 'inline-block';
    }
}
