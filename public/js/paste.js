const pasteId = window.location.pathname.split('/')[2];
let pasteData = null;

async function init() {
    try {
        const res = await fetch(`/api/pastes/${pasteId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        pasteData = data;

        if (data.hasPassword) {
            document.getElementById('auth-container').style.display = 'block';
            document.getElementById('paste-meta').innerText = 'Password Protected Paste';
        } else {
            loadPasteContent();
        }
    } catch (err) {
        document.querySelector('.glass-panel').innerHTML = `<p style="color: var(--danger); text-align: center;">${err.message}</p>`;
    }
}

async function loadPasteContent() {
    const password = document.getElementById('unlock-password')?.value;
    try {
        const res = await fetch(`/api/pastes/${pasteId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('content-container').style.display = 'block';
        if (data.isBurn) document.getElementById('burn-warning').style.display = 'block';

        document.getElementById('paste-meta').innerText = `${pasteData.language.toUpperCase()} • Created ${new Date(pasteData.createdAt).toLocaleTimeString()}`;
        document.getElementById('view-count').innerText = `👁 ${data.views} views`;

        if (data.isMarkdown) {
            document.getElementById('markdown-view').style.display = 'block';
            document.getElementById('text-view').style.display = 'none';
            document.getElementById('markdown-view').innerHTML = data.renderedContent;
        } else {
            const codeEl = document.getElementById('code-block');
            codeEl.className = `language-${pasteData.language}`;
            codeEl.textContent = data.content;
            hljs.highlightElement(codeEl);
        }

        setupButtons(data.content);
    } catch (err) {
        alert(err.message);
    }
}

function setupButtons(content) {
    document.getElementById('copy-btn').onclick = () => {
        navigator.clipboard.writeText(content);
        document.getElementById('copy-btn').innerText = 'Copied!';
        setTimeout(() => document.getElementById('copy-btn').innerText = 'Copy', 2000);
    };
    document.getElementById('raw-btn').onclick = () => window.location.href = `/api/pastes/${pasteId}/raw`;
    document.getElementById('download-btn').onclick = () => {
        const extMap = { javascript: 'js', python: 'py', html: 'html', css: 'css', json: 'json', markdown: 'md' };
        const ext = extMap[pasteData.language] || 'txt';
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `quickpaste-${pasteId}.${ext}`;
        link.click();
    };
    document.getElementById('share-btn').onclick = () => {
        if (navigator.share) {
            navigator.share({ title: 'QuickPaste', url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('URL copied to clipboard!');
        }
    };
}

init();
