/**
 * TurboChat Widget — AI Sales Assistant dla sklepu turbosprężarek
 * Osadzanie: <script src="https://twoj-serwer.pl/chatbot/widget.js" defer></script>
 *
 * Automatycznie zastępuje __ENGINE_URL__, __STORE_NAME__, __ACCENT_COLOR__
 * podczas serwowania przez Flask.
 */
(function () {
  'use strict';

  const ENGINE_URL = '__ENGINE_URL__';
  const STORE_NAME = '__STORE_NAME__';
  const ACCENT = '__ACCENT_COLOR__';
  const WIDGET_ID = 'turbo-chat-widget';

  if (document.getElementById(WIDGET_ID)) return; // prevent double init

  // ── CONFIG ──────────────────────────────────────────────────────────────
  let sessionId = localStorage.getItem('turbo_chat_session') || null;
  let isOpen = false;
  let isTyping = false;
  let unreadCount = 0;

  // ── INJECT STYLES ────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
  #turbo-chat-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  #turbo-chat-widget { position: fixed; bottom: 24px; right: 24px; z-index: 999999; }

  /* BUTTON */
  #tc-btn {
    width: 60px; height: 60px; border-radius: 50%;
    background: ${ACCENT}; border: none; cursor: pointer;
    box-shadow: 0 4px 20px rgba(0,0,0,.35);
    display: flex; align-items: center; justify-content: center;
    transition: transform .2s, box-shadow .2s;
    position: relative;
  }
  #tc-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,.45); }
  #tc-btn svg { width: 28px; height: 28px; fill: #fff; }
  #tc-badge {
    position: absolute; top: -4px; right: -4px;
    background: #ef4444; color: #fff; font-size: 11px; font-weight: 700;
    width: 20px; height: 20px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    display: none;
  }

  /* WINDOW */
  #tc-window {
    position: absolute; bottom: 72px; right: 0;
    width: 380px; height: 560px; max-height: 80vh;
    background: #1a1a2e; border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,.5);
    display: none; flex-direction: column; overflow: hidden;
    border: 1px solid rgba(255,255,255,.1);
    animation: tcSlideIn .25s ease;
  }
  @keyframes tcSlideIn { from { opacity:0; transform: translateY(12px) scale(.97); } to { opacity:1; transform: none; } }
  #tc-window.open { display: flex; }

  /* HEADER */
  #tc-header {
    background: linear-gradient(135deg, ${ACCENT}, #c2410c);
    padding: 14px 16px; display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;
  }
  #tc-avatar {
    width: 40px; height: 40px; background: rgba(255,255,255,.2);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  #tc-header-info { flex: 1; min-width: 0; }
  #tc-header-name { color: #fff; font-weight: 700; font-size: 14px; }
  #tc-header-status { color: rgba(255,255,255,.8); font-size: 11px; display: flex; align-items: center; gap: 4px; }
  #tc-header-status::before { content: ''; display: inline-block; width: 7px; height: 7px; background: #4ade80; border-radius: 50%; }
  #tc-close {
    background: rgba(255,255,255,.15); border: none; color: #fff;
    width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 16px;
    flex-shrink: 0; transition: background .15s;
  }
  #tc-close:hover { background: rgba(255,255,255,.3); }

  /* MESSAGES */
  #tc-messages {
    flex: 1; overflow-y: auto; padding: 16px 12px;
    display: flex; flex-direction: column; gap: 12px;
    scroll-behavior: smooth;
  }
  #tc-messages::-webkit-scrollbar { width: 4px; }
  #tc-messages::-webkit-scrollbar-track { background: transparent; }
  #tc-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 4px; }

  /* BUBBLE */
  .tc-msg { display: flex; gap: 8px; max-width: 100%; }
  .tc-msg.user { flex-direction: row-reverse; }
  .tc-bubble {
    max-width: 80%; padding: 10px 14px; border-radius: 14px;
    font-size: 13px; line-height: 1.5; color: #e5e7eb;
  }
  .tc-bubble.bot { background: #252545; border-bottom-left-radius: 4px; }
  .tc-bubble.user {
    background: ${ACCENT}; color: #fff; border-bottom-right-radius: 4px;
  }
  .tc-bubble strong { color: #fb923c; font-weight: 600; }
  .tc-bubble ul { padding-left: 16px; margin: 6px 0; }
  .tc-bubble li { margin: 2px 0; }
  .tc-bubble p { margin: 4px 0; }

  /* TYPING */
  .tc-typing .tc-bubble { padding: 12px 16px; }
  .tc-dots { display: flex; gap: 4px; }
  .tc-dot {
    width: 7px; height: 7px; background: #6b7280; border-radius: 50%;
    animation: tcBounce .9s infinite;
  }
  .tc-dot:nth-child(2) { animation-delay: .15s; }
  .tc-dot:nth-child(3) { animation-delay: .3s; }
  @keyframes tcBounce { 0%,80%,100% { transform: scale(.7); opacity:.5; } 40% { transform: scale(1); opacity:1; } }

  /* PRODUCT CARDS */
  .tc-products { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .tc-product-card {
    background: #1e1e3a; border: 1px solid rgba(255,255,255,.08);
    border-radius: 10px; padding: 10px; display: flex; gap: 10px;
    text-decoration: none; transition: border-color .15s;
  }
  .tc-product-card:hover { border-color: ${ACCENT}; }
  .tc-product-img {
    width: 52px; height: 52px; border-radius: 8px; object-fit: cover;
    background: #2d2d4e; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 22px;
  }
  .tc-product-info { flex: 1; min-width: 0; }
  .tc-product-name { color: #e5e7eb; font-size: 12px; font-weight: 600; line-height: 1.3; margin-bottom: 2px; white-space: normal; }
  .tc-product-sku { color: #6b7280; font-size: 10px; font-family: monospace; margin-bottom: 4px; }
  .tc-product-footer { display: flex; align-items: center; justify-content: space-between; }
  .tc-product-price { color: #fb923c; font-weight: 700; font-size: 13px; }
  .tc-product-badge {
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    padding: 2px 6px; border-radius: 4px;
  }
  .tc-badge-stock { background: #14532d; color: #86efac; }
  .tc-badge-sale { background: #7f1d1d; color: #fca5a5; }
  .tc-buy-btn {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    background: ${ACCENT}; color: #fff; padding: 4px 10px; border-radius: 6px;
    text-decoration: none; white-space: nowrap; letter-spacing: .3px;
  }
  .tc-buy-btn:hover { background: #c2410c; }

  /* QUICK REPLIES */
  .tc-quick-replies { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .tc-quick-reply {
    background: rgba(234,88,12,.15); border: 1px solid rgba(234,88,12,.4);
    color: #fb923c; font-size: 11px; padding: 5px 10px; border-radius: 20px;
    cursor: pointer; transition: background .15s; white-space: nowrap;
  }
  .tc-quick-reply:hover { background: rgba(234,88,12,.3); }

  /* INPUT */
  #tc-footer { padding: 12px; background: #141428; flex-shrink: 0; border-top: 1px solid rgba(255,255,255,.06); }
  #tc-input-row { display: flex; gap: 8px; align-items: flex-end; }
  #tc-input {
    flex: 1; background: #252545; border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px; padding: 10px 14px; color: #e5e7eb; font-size: 13px;
    resize: none; outline: none; min-height: 40px; max-height: 100px;
    line-height: 1.4; font-family: inherit;
    transition: border-color .15s;
  }
  #tc-input::placeholder { color: #4b5563; }
  #tc-input:focus { border-color: ${ACCENT}; }
  #tc-send {
    width: 40px; height: 40px; background: ${ACCENT}; border: none;
    border-radius: 10px; cursor: pointer; display: flex; align-items: center;
    justify-content: center; transition: background .15s; flex-shrink: 0;
  }
  #tc-send:hover { background: #c2410c; }
  #tc-send svg { width: 18px; height: 18px; fill: #fff; }
  #tc-send:disabled { background: #374151; cursor: not-allowed; }
  #tc-powered { text-align: center; font-size: 9px; color: #374151; margin-top: 6px; letter-spacing: .3px; }
  `;
  document.head.appendChild(style);

  // ── BUILD HTML ───────────────────────────────────────────────────────────
  const widget = document.createElement('div');
  widget.id = WIDGET_ID;
  widget.innerHTML = `
  <div id="tc-window">
    <div id="tc-header">
      <div id="tc-avatar">🔧</div>
      <div id="tc-header-info">
        <div id="tc-header-name">Turbo AI — ${STORE_NAME}</div>
        <div id="tc-header-status">Online · Odpowiadam natychmiast</div>
      </div>
      <button id="tc-close" title="Zamknij">✕</button>
    </div>
    <div id="tc-messages"></div>
    <div id="tc-footer">
      <div id="tc-input-row">
        <textarea id="tc-input" rows="1" placeholder="Napisz markę i model auta lub numer VIN..."></textarea>
        <button id="tc-send" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div id="tc-powered">Powered by Claude AI · ${STORE_NAME}</div>
    </div>
  </div>
  <button id="tc-btn" title="Chat z doradcą">
    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
    <div id="tc-badge"></div>
  </button>
  `;
  document.body.appendChild(widget);

  // ── DOM REFS ─────────────────────────────────────────────────────────────
  const btnEl     = document.getElementById('tc-btn');
  const windowEl  = document.getElementById('tc-window');
  const closeEl   = document.getElementById('tc-close');
  const messagesEl= document.getElementById('tc-messages');
  const inputEl   = document.getElementById('tc-input');
  const sendEl    = document.getElementById('tc-send');
  const badgeEl   = document.getElementById('tc-badge');

  // ── UTILS ────────────────────────────────────────────────────────────────
  function markdownToHtml(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,.1);padding:1px 4px;border-radius:3px">$1</code>')
      .replace(/^• (.+)/gm, '<li>$1</li>')
      .replace(/^- (.+)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setUnread(n) {
    unreadCount = n;
    if (n > 0 && !isOpen) {
      badgeEl.textContent = n > 9 ? '9+' : n;
      badgeEl.style.display = 'flex';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  // ── RENDER MESSAGES ──────────────────────────────────────────────────────
  function appendBotMessage(text, products, quickReplies) {
    const msg = document.createElement('div');
    msg.className = 'tc-msg bot';

    const bubble = document.createElement('div');
    bubble.className = 'tc-bubble bot';
    bubble.innerHTML = '<p>' + markdownToHtml(text) + '</p>';

    // Product cards
    if (products && products.length > 0) {
      const cards = document.createElement('div');
      cards.className = 'tc-products';
      products.forEach(p => {
        const card = document.createElement('a');
        card.className = 'tc-product-card';
        card.href = p.permalink || '#';
        card.target = '_blank';
        card.rel = 'noopener';

        const imgHtml = p.image
          ? `<img class="tc-product-img" src="${p.image}" alt="${p.name}" loading="lazy">`
          : `<div class="tc-product-img">⚙️</div>`;

        const stockBadge = p.in_stock
          ? '<span class="tc-product-badge tc-badge-stock">W magazynie</span>'
          : '<span class="tc-product-badge" style="background:#1c1917;color:#78716c">Na zamówienie</span>';

        const saleBadge = p.on_sale
          ? '<span class="tc-product-badge tc-badge-sale">PROMOCJA</span>'
          : '';

        card.innerHTML = `
          ${imgHtml}
          <div class="tc-product-info">
            <div class="tc-product-name">${p.name}</div>
            ${p.sku ? `<div class="tc-product-sku">OEM: ${p.sku}</div>` : ''}
            <div class="tc-product-footer">
              <span class="tc-product-price">${p.price_display}</span>
              <div style="display:flex;gap:4px;align-items:center">
                ${saleBadge || stockBadge}
                ${p.permalink && p.permalink !== '#'
                  ? `<a href="${p.permalink}" target="_blank" class="tc-buy-btn" onclick="event.stopPropagation()">Kup →</a>`
                  : ''}
              </div>
            </div>
          </div>
        `;
        cards.appendChild(card);
      });
      bubble.appendChild(cards);
    }

    // Quick replies
    if (quickReplies && quickReplies.length > 0) {
      const qr = document.createElement('div');
      qr.className = 'tc-quick-replies';
      quickReplies.forEach(label => {
        const btn = document.createElement('span');
        btn.className = 'tc-quick-reply';
        btn.textContent = label;
        btn.addEventListener('click', () => sendMessage(label));
        qr.appendChild(btn);
      });
      bubble.appendChild(qr);
    }

    msg.appendChild(bubble);
    messagesEl.appendChild(msg);
    scrollToBottom();
  }

  function appendUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'tc-msg user';
    const bubble = document.createElement('div');
    bubble.className = 'tc-bubble user';
    bubble.textContent = text;
    msg.appendChild(bubble);
    messagesEl.appendChild(msg);
    scrollToBottom();
  }

  function showTyping() {
    const existing = document.getElementById('tc-typing');
    if (existing) return;
    const msg = document.createElement('div');
    msg.className = 'tc-msg bot tc-typing';
    msg.id = 'tc-typing';
    msg.innerHTML = `<div class="tc-bubble bot"><div class="tc-dots"><div class="tc-dot"></div><div class="tc-dot"></div><div class="tc-dot"></div></div></div>`;
    messagesEl.appendChild(msg);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById('tc-typing');
    if (el) el.remove();
  }

  // ── QUICK REPLY SUGGESTIONS (context-aware) ──────────────────────────────
  function getQuickReplies(text) {
    if (!text) return [];
    const t = text.toLowerCase();
    if (t.includes('marka') || t.includes('model') || t.includes('vin')) {
      return ['BMW 320d', 'Audi A4 2.0 TDI', 'VW Passat TDI', 'Mercedes CDI', 'Podaj numer VIN'];
    }
    if (t.includes('gwarancja') || t.includes('dostawa') || t.includes('cena')) {
      return ['Ile kosztuje?', 'Kiedy dostawa?', 'Mam pytanie techniczne'];
    }
    if (t.includes('regenerow') || t.includes('nowa')) {
      return ['Jaka różnica?', 'Którą polecasz?', 'Podaj cenę'];
    }
    return [];
  }

  // ── API CALLS ────────────────────────────────────────────────────────────
  async function startSession() {
    try {
      const r = await fetch(`${ENGINE_URL}/chatbot/api/greet`, { method: 'POST' });
      const data = await r.json();
      sessionId = data.session_id;
      localStorage.setItem('turbo_chat_session', sessionId);
      appendBotMessage(
        data.message,
        data.products || [],
        ['BMW 320d', 'Audi A4 2.0 TDI', 'VW Golf TDI', 'Podaj VIN']
      );
    } catch (e) {
      appendBotMessage(
        'Cześć! Jestem Turbo AI. Napisz markę i model auta, a pomogę znaleźć właściwą turbosprężarkę!',
        [], ['BMW 320d', 'Audi A4 TDI', 'VW Passat TDI']
      );
    }
  }

  async function sendMessage(text) {
    if (!text || isTyping) return;
    appendUserMessage(text);
    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendEl.disabled = true;
    isTyping = true;
    showTyping();

    try {
      const r = await fetch(`${ENGINE_URL}/chatbot/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text })
      });
      const data = await r.json();
      hideTyping();

      if (data.session_id) {
        sessionId = data.session_id;
        localStorage.setItem('turbo_chat_session', sessionId);
      }

      const qr = getQuickReplies(data.message || '');
      appendBotMessage(data.message || '...', data.products || [], qr);

      if (!isOpen) setUnread(unreadCount + 1);
    } catch (e) {
      hideTyping();
      appendBotMessage('Przepraszam, wystąpił błąd. Odśwież stronę i spróbuj ponownie.', [], []);
    } finally {
      isTyping = false;
      sendEl.disabled = inputEl.value.trim().length === 0;
    }
  }

  // ── EVENTS ───────────────────────────────────────────────────────────────
  btnEl.addEventListener('click', () => {
    isOpen = !isOpen;
    windowEl.classList.toggle('open', isOpen);
    if (isOpen) {
      setUnread(0);
      inputEl.focus();
      // Start session on first open
      if (!sessionId || messagesEl.children.length === 0) {
        startSession();
      }
    }
  });

  closeEl.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen = false;
    windowEl.classList.remove('open');
  });

  inputEl.addEventListener('input', () => {
    sendEl.disabled = inputEl.value.trim().length === 0;
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const txt = inputEl.value.trim();
      if (txt) sendMessage(txt);
    }
  });

  sendEl.addEventListener('click', () => {
    const txt = inputEl.value.trim();
    if (txt) sendMessage(txt);
  });

  // ── AUTO OPEN (after 8s, if no session) ─────────────────────────────────
  if (!localStorage.getItem('turbo_chat_seen')) {
    setTimeout(() => {
      if (!isOpen) {
        setUnread(1);
        localStorage.setItem('turbo_chat_seen', '1');
      }
    }, 8000);
  }

})();
