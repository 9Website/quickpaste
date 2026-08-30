document.getElementById('paste-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('content').value;
    const language = document.getElementById('language').value;
    const expiration = document.getElementById('expiration').value;
    const customId = document.getElementById('custom-id').value;
    const password = document.getElementById('password').value;
    const burnAfterReading = document.getElementById('burn').checked;
    const isMarkdown = document.getElementById('markdown-toggle').checked;

    try {
        const res = await fetch('/api/pastes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, language, expiration, customId, password, burnAfterReading, isMarkdown })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const resultDiv = document.getElementById('result');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <p style="color: #4ade80; margin-bottom: 0.50rem;">Paste created successfully!</p>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <input type="text" readonly value="${window.location.origin}${data.url}" id="share-url" style="flex: 1;">
                <button type="button" onclick="navigator.clipboard.writeText('${window.location.origin}${data.url}');this.innerText='Copied!';">Copy Link</button>
            </div>
            <p style="font-size: 0.8rem; color: var(--danger); margin-top: 0.5rem;">Save your delete link securely (shown only once): <a href="${data.deleteUrl}" target="_blank" style="color: var(--danger);">Delete Link</a></p>
        `;
    } catch (err) {
        alert(err.message);
    }
});
