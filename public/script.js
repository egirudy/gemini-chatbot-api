const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const conversation = [];

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  conversation.push({ role: 'user', text: userMessage });
  input.value = '';
  input.disabled = true;
  form.querySelector('button').disabled = true;

  const thinkingMessage = appendThinkingMessage();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Gagal mendapatkan balasan.');

    thinkingMessage.remove();
    appendMessage('bot', data.result || 'Maaf, saya belum memiliki jawaban.');
    conversation.push({ role: 'model', text: data.result || '' });
  } catch (error) {
    thinkingMessage.remove();
    appendMessage('bot', `**Terjadi kesalahan:** ${error.message}`);
  } finally {
    input.disabled = false;
    form.querySelector('button').disabled = false;
    input.focus();
  }
});

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  if (sender === 'bot') {
    msg.innerHTML = renderMarkdown(text);
  } else {
    msg.textContent = text;
  }
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendThinkingMessage() {
  const msg = document.createElement('div');
  msg.className = 'message bot thinking';
  msg.setAttribute('role', 'status');
  msg.setAttribute('aria-label', 'Model sedang berpikir');
  msg.innerHTML = '<span></span><span></span><span></span>';
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function renderMarkdown(markdown) {
  const codeBlocks = [];
  let html = escapeHtml(markdown).replace(
    /```(?:([\w+-]+)\n)?([\s\S]*?)```/g,
    (_, language, code) => {
      const className = language ? ` class="language-${language}"` : '';
      codeBlocks.push(`<pre><code${className}>${code.trimEnd()}</code></pre>`);
      return `@@CODE_BLOCK_${codeBlocks.length - 1}@@`;
    }
  );

  html = html
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\s*>\s?(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');

  html = `<p>${html}</p>`
    .replace(/<p>(<h[1-3]>)/g, '$1')
    .replace(/(<\/h[1-3]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(<blockquote>)/g, '$1')
    .replace(/(<\/blockquote>)<\/p>/g, '$1')
    .replace(/<p>\s*<\/p>/g, '');

  return html.replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index) => codeBlocks[index]);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
