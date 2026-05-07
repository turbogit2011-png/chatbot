/**
 * TURBO-GIT AI Chatbot Widget v1.0
 * Wklej na stronę: <script src="turbo-git-chatbot.js" defer></script>
 */
(function (window, document) {
  'use strict';

  var CFG = {
    phone: '+48 123 456 789',
    phoneDisplay: '+48 123 456 789',
    email: 'info@turbo-git.com',
    company: 'TURBO-GIT',
    autoOpenDelay: 5000,
    typingShort: 650,
    typingMedium: 950,
    typingLong: 1300,
  };

  var S = {
    WELCOME: 'welcome',
    MARKA: 'marka',
    MODEL: 'model',
    ROK: 'rok',
    SILNIK: 'silnik',
    NUMER_DECISION: 'numer_decision',
    COLLECT_NUMER: 'collect_numer',
    COLLECT_VIN: 'collect_vin',
    MAM_NUMER: 'mam_numer',
    MAM_NUMER_AUTO: 'mam_numer_auto',
    NIE_WIEM: 'nie_wiem',
    AWARIA_DESC: 'awaria_desc',
    AWARIA_AUTO: 'awaria_auto',
    LEAD_IMIE: 'lead_imie',
    LEAD_TELEFON: 'lead_telefon',
    LEAD_EMAIL: 'lead_email',
    DONE: 'done',
  };

  var CSS = `
    #tgw-fab {
      position: fixed; bottom: 26px; right: 26px;
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(145deg, #ff7433 0%, #e84000 100%);
      box-shadow: 0 8px 32px rgba(232,68,0,.55), 0 2px 8px rgba(0,0,0,.35);
      border: none; cursor: pointer; z-index: 2147483646;
      display: flex; align-items: center; justify-content: center;
      transition: all .3s cubic-bezier(.4,0,.2,1); outline: none; padding: 0;
    }
    #tgw-fab:hover { transform: scale(1.1) translateY(-2px); box-shadow: 0 14px 40px rgba(232,68,0,.7), 0 4px 12px rgba(0,0,0,.4); }
    #tgw-fab:active { transform: scale(.95); }
    #tgw-fab svg { width: 30px; height: 30px; pointer-events: none; }
    .tgw-ring {
      position: absolute; width: 64px; height: 64px; border-radius: 50%;
      border: 2px solid rgba(255,116,51,.5);
      animation: tgwRing 2.5s ease-out infinite; pointer-events: none;
    }
    .tgw-ring:nth-of-type(2) { animation-delay: .8s; }
    @keyframes tgwRing { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.5);opacity:0} }
    .tgw-notif {
      position: absolute; top: -4px; right: -4px;
      width: 20px; height: 20px; background: #ff3333;
      border-radius: 50%; border: 2.5px solid #0a0a14;
      font: 700 10px/-apple-system,sans-serif; color: #fff;
      font-family: -apple-system,sans-serif; font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      animation: tgwNotifPop .4s cubic-bezier(.4,0,.2,1);
    }
    @keyframes tgwNotifPop { 0%{transform:scale(0) rotate(-20deg)} 80%{transform:scale(1.2)} 100%{transform:scale(1)} }
    #tgw-win {
      position: fixed; bottom: 104px; right: 26px;
      width: 395px; height: 590px; max-height: calc(100vh - 130px);
      background: #09090f; border-radius: 22px;
      border: 1px solid rgba(255,116,51,.12);
      box-shadow: 0 28px 80px rgba(0,0,0,.8), 0 8px 24px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.04);
      z-index: 2147483645; display: flex; flex-direction: column; overflow: hidden;
      transform-origin: bottom right; transform: scale(.82) translateY(20px);
      opacity: 0; pointer-events: none;
      transition: all .42s cubic-bezier(.4,0,.2,1);
    }
    #tgw-win.tgw-open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    .tgw-hdr {
      flex-shrink: 0; position: relative; overflow: hidden;
      background: linear-gradient(135deg, #1e0d00 0%, #0d0c1c 100%);
    }
    .tgw-hdr::after {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, transparent, #ff7433 30%, #ff4400 70%, transparent);
    }
    .tgw-hdr-inner {
      position: relative; display: flex; align-items: center;
      gap: 11px; padding: 13px 15px;
    }
    .tgw-avatar {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(145deg, #ff7433, #c03000);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 2px rgba(255,116,51,.2), 0 0 18px rgba(255,116,51,.35);
    }
    .tgw-avatar svg { width: 24px; height: 24px; }
    .tgw-info { flex: 1; overflow: hidden; }
    .tgw-name {
      font-family: -apple-system,'Segoe UI',Arial,sans-serif;
      font-size: 15px; font-weight: 700; color: #f5f5ff; letter-spacing: .2px;
    }
    .tgw-status {
      font-family: -apple-system,'Segoe UI',Arial,sans-serif;
      font-size: 11.5px; color: #00cfa0;
      display: flex; align-items: center; gap: 5px; margin-top: 2px;
    }
    .tgw-status-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #00cfa0; flex-shrink: 0;
      animation: tgwBlink 2s ease infinite;
    }
    @keyframes tgwBlink { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(0,207,160,.4)} 50%{opacity:.6;box-shadow:0 0 0 3px rgba(0,207,160,0)} }
    .tgw-hdr-btns { display: flex; gap: 6px; }
    .tgw-hdr-btn {
      width: 32px; height: 32px; border-radius: 9px;
      border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.04);
      cursor: pointer; color: #6870a0;
      display: flex; align-items: center; justify-content: center;
      transition: all .2s; outline: none;
    }
    .tgw-hdr-btn:hover { background: rgba(255,116,51,.15); color: #ff7433; border-color: rgba(255,116,51,.3); }
    .tgw-hdr-btn svg { width: 15px; height: 15px; }
    .tgw-phone-bar {
      position: relative; display: flex; align-items: center;
      justify-content: space-between; padding: 7px 15px;
      background: rgba(255,116,51,.05);
      border-top: 1px solid rgba(255,116,51,.08);
      border-bottom: 1px solid rgba(255,255,255,.04);
    }
    .tgw-phone-link {
      display: flex; align-items: center; gap: 7px;
      font-family: -apple-system,'Segoe UI',Arial,sans-serif;
      font-size: 12px; font-weight: 600; color: #ff7433;
      text-decoration: none; transition: opacity .2s;
    }
    .tgw-phone-link:hover { opacity: .8; }
    .tgw-phone-link svg { width: 13px; height: 13px; fill: currentColor; }
    .tgw-phone-bar-r {
      font-family: -apple-system,'Segoe UI',Arial,sans-serif;
      font-size: 10.5px; color: #40406a;
    }
    .tgw-prog { height: 2.5px; background: rgba(255,255,255,.05); flex-shrink: 0; }
    .tgw-prog-bar {
      height: 100%; background: linear-gradient(90deg, #ff7433, #ff4400);
      width: 0; transition: width .7s cubic-bezier(.4,0,.2,1);
      box-shadow: 0 0 10px rgba(255,116,51,.5);
    }
    .tgw-step-bar {
      display: none; align-items: center; justify-content: space-between;
      padding: 5px 15px; background: rgba(255,255,255,.02);
      border-bottom: 1px solid rgba(255,255,255,.03);
    }
    .tgw-step-bar.tgw-visible { display: flex; }
    .tgw-step-text { font-family: -apple-system,'Segoe UI',Arial,sans-serif; font-size: 10px; color: #404066; }
    .tgw-step-num { font-family: -apple-system,'Segoe UI',Arial,sans-serif; font-size: 10px; color: #ff7433; font-weight: 600; }
    .tgw-msgs {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 6px; scroll-behavior: smooth;
    }
    .tgw-msgs::-webkit-scrollbar { width: 3px; }
    .tgw-msgs::-webkit-scrollbar-track { background: transparent; }
    .tgw-msgs::-webkit-scrollbar-thumb { background: rgba(255,116,51,.15); border-radius: 3px; }
    .tgw-row { display: flex; gap: 7px; max-width: 100%; }
    .tgw-row-bot { flex-direction: row; align-items: flex-end; }
    .tgw-row-user { flex-direction: row-reverse; align-items: flex-end; }
    .tgw-mini-av {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(145deg, #ff7433, #c03000);
      display: flex; align-items: center; justify-content: center;
    }
    .tgw-mini-av svg { width: 13px; height: 13px; }
    .tgw-bubble {
      max-width: 80%; padding: 9px 13px; border-radius: 16px;
      font-family: -apple-system,'Segoe UI',Arial,sans-serif;
      font-size: 13.5px; line-height: 1.55; word-break: break-word;
      animation: tgwIn .28s cubic-bezier(.4,0,.2,1);
    }
    @keyframes tgwIn { from{opacity:0;transform:translateY(6px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
    .tgw-row-bot .tgw-bubble {
      background: #1c1c2a; color: #e8e8f5;
      border-bottom-left-radius: 4px;
      border: 1px solid rgba(255,255,255,.04);
    }
    .tgw-row-user .tgw-bubble {
      background: linear-gradient(135deg, #ff7433, #e84000); color: #fff;
      border-bottom-right-radius: 4px; box-shadow: 0 4px 12px rgba(232,68,0,.25);
    }
    .tgw-time { font-size: 9.5px; color: #35355a; padding: 0 3px; align-self: flex-end; white-space: nowrap; }
    .tgw-typing-row { display: flex; gap: 7px; align-items: flex-end; animation: tgwIn .25s ease; }
    .tgw-typing-bbl {
      padding: 11px 14px; background: #1c1c2a; border-radius: 16px; border-bottom-left-radius: 4px;
      display: flex; gap: 4px; align-items: center; border: 1px solid rgba(255,255,255,.04);
    }
    .tgw-dot { width: 5.5px; height: 5.5px; border-radius: 50%; background: #ff7433; animation: tgwDot 1.2s ease infinite; }
    .tgw-dot:nth-child(2){animation-delay:.18s} .tgw-dot:nth-child(3){animation-delay:.36s}
    @keyframes tgwDot { 0%,65%,100%{transform:translateY(0);opacity:.4} 32%{transform:translateY(-5px);opacity:1} }
    .tgw-qbtns {
      display: flex; flex-wrap: wrap; gap: 6px;
      padding: 3px 0 6px; margin-left: 33px;
      animation: tgwIn .28s ease .08s both;
    }
    .tgw-qbtn {
      padding: 6px 13px; border-radius: 18px;
      border: 1px solid rgba(255,116,51,.38); background: rgba(255,116,51,.07);
      color: #ff8040; font-family: -apple-system,'Segoe UI',Arial,sans-serif;
      font-size: 12.5px; font-weight: 500; cursor: pointer;
      transition: all .2s; white-space: nowrap; outline: none;
    }
    .tgw-qbtn:hover { background: rgba(255,116,51,.18); border-color: rgba(255,116,51,.65); color: #ff9050; transform: translateY(-1px); box-shadow: 0 3px 10px rgba(255,116,51,.15); }
    .tgw-qbtn:active { transform: translateY(0); }
    .tgw-ctas {
      display: flex; flex-wrap: wrap; gap: 7px;
      margin-left: 33px; padding-bottom: 6px;
      animation: tgwIn .28s ease .12s both;
    }
    .tgw-cta {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 11px;
      font-family: -apple-system,'Segoe UI',Arial,sans-serif;
      font-size: 12.5px; font-weight: 600; cursor: pointer;
      text-decoration: none; border: 1px solid; transition: all .2s; outline: none;
    }
    .tgw-cta svg { width: 13px; height: 13px; fill: currentColor; }
    .tgw-cta-call { background: rgba(0,207,160,.1); color: #00cfa0; border-color: rgba(0,207,160,.25); }
    .tgw-cta-call:hover { background: rgba(0,207,160,.2); }
    .tgw-cta-adv { background: rgba(255,116,51,.1); color: #ff7433; border-color: rgba(255,116,51,.25); }
    .tgw-cta-adv:hover { background: rgba(255,116,51,.2); }
    .tgw-cta-photo { background: rgba(150,100,255,.1); color: #b080ff; border-color: rgba(150,100,255,.25); }
    .tgw-cta-photo:hover { background: rgba(150,100,255,.2); }
    .tgw-card {
      background: rgba(255,116,51,.05); border: 1px solid rgba(255,116,51,.15);
      border-radius: 12px; padding: 11px 13px; margin-left: 33px;
      animation: tgwIn .28s ease .08s both;
    }
    .tgw-card-title {
      font-family: -apple-system,'Segoe UI',Arial,sans-serif;
      font-size: 10.5px; font-weight: 700; color: #ff7433;
      text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px;
    }
    .tgw-card-row {
      display: flex; justify-content: space-between;
      font-family: -apple-system,'Segoe UI',Arial,sans-serif; font-size: 12px;
      padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,.04);
    }
    .tgw-card-row:last-child { border-bottom: none; }
    .tgw-card-lbl { color: #5a5a8a; }
    .tgw-card-val { color: #d0d0f0; font-weight: 500; }
    .tgw-success {
      background: rgba(0,207,160,.06); border: 1px solid rgba(0,207,160,.2);
      border-radius: 14px; padding: 16px 14px; margin-left: 33px; text-align: center;
      animation: tgwIn .35s ease;
    }
    .tgw-success-icon { font-size: 30px; margin-bottom: 8px; }
    .tgw-success-title { font-family: -apple-system,'Segoe UI',Arial,sans-serif; font-size: 14px; font-weight: 700; color: #00cfa0; margin-bottom: 5px; }
    .tgw-success-txt { font-family: -apple-system,'Segoe UI',Arial,sans-serif; font-size: 12px; color: #5a5a8a; line-height: 1.5; }
    .tgw-input-area { flex-shrink: 0; border-top: 1px solid rgba(255,255,255,.05); background: #0c0c16; padding: 11px 12px; }
    .tgw-file-prev {
      display: none; align-items: center; gap: 8px; padding: 6px 11px;
      background: rgba(255,116,51,.08); border: 1px solid rgba(255,116,51,.2);
      border-radius: 9px; margin-bottom: 8px;
    }
    .tgw-file-prev.tgw-vis { display: flex; }
    .tgw-file-prev svg { width: 15px; height: 15px; fill: #ff7433; flex-shrink: 0; }
    .tgw-file-name { flex: 1; font-family: -apple-system,'Segoe UI',Arial,sans-serif; font-size: 12px; color: #c0c0e0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tgw-file-rm { background: none; border: none; color: #505070; cursor: pointer; font-size: 18px; padding: 0 2px; line-height: 1; transition: color .2s; }
    .tgw-file-rm:hover { color: #ff4444; }
    .tgw-input-row { display: flex; gap: 8px; align-items: flex-end; }
    .tgw-input-wrap {
      flex: 1; background: #191926; border: 1px solid rgba(255,255,255,.07);
      border-radius: 13px; display: flex; align-items: flex-end;
      padding: 8px 11px; gap: 7px; transition: border-color .2s;
    }
    .tgw-input-wrap:focus-within { border-color: rgba(255,116,51,.4); }
    .tgw-input {
      flex: 1; background: none; border: none; outline: none;
      font-family: -apple-system,'Segoe UI',Arial,sans-serif;
      font-size: 13.5px; color: #e0e0f0; resize: none;
      line-height: 1.45; max-height: 80px; min-height: 20px;
    }
    .tgw-input::placeholder { color: #35355a; }
    .tgw-att-btn {
      width: 26px; height: 26px; background: none; border: none; cursor: pointer;
      color: #40406a; display: flex; align-items: center; justify-content: center;
      transition: color .2s; flex-shrink: 0; outline: none;
    }
    .tgw-att-btn:hover { color: #ff7433; }
    .tgw-att-btn svg { width: 17px; height: 17px; }
    .tgw-send-btn {
      width: 42px; height: 42px; border-radius: 13px;
      background: linear-gradient(145deg, #ff7433, #e84000);
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all .2s;
      box-shadow: 0 4px 16px rgba(232,68,0,.35); outline: none;
    }
    .tgw-send-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(232,68,0,.55); }
    .tgw-send-btn:active { transform: scale(.94); }
    .tgw-send-btn svg { width: 18px; height: 18px; fill: white; }
    .tgw-hint { font-family: -apple-system,'Segoe UI',Arial,sans-serif; font-size: 10px; color: #2e2e50; text-align: center; margin-top: 6px; }
    #tgw-file { display: none; }
    @media (max-width: 480px) {
      #tgw-win { right:0;left:0;bottom:0;width:100%;height:100%;max-height:100%;border-radius:0;transform-origin:bottom center; }
      #tgw-fab { bottom:18px;right:18px; }
    }
  `;

  var ICON = {
    turbo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="2.8"/><path d="M12 9.2C9.8 6.8 7 6 5.5 7.8c1.8 1 3.8 1.5 6.5 1.4z"/><path d="M14.8 12c2.4 2.2 3.2 5 1.4 6.5-1-1.8-1.5-3.8-1.4-6.5z"/><path d="M12 14.8c2.2 2.4 2 5.2.2 6.2-1.2-1.6-1.8-4-0.2-6.2z"/><path d="M9.2 12C6.8 9.8 3.8 9.5 2.8 11.3c1.6 1.2 4 1.8 6.4.7z"/><path d="M14.8 12c-.1 2.7.4 4.7 1.4 6.5 1.8-1.5 1-4.3-1.4-6.5z"/><path d="M12 9.2c2.7.1 4.7-.4 6.5-1.4-1.5-1.8-4.3-1-6.5 1.4z"/></svg>',
    send: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    minus: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>',
    phone: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
    clip: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>',
    img: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
    advisor: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
  };

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function TurboGitChatbot() {
    this.state = S.WELCOME;
    this.car = { marka: null, model: null, rok: null, silnik: null, numerTurbo: null, vin: null };
    this.lead = { imie: null, telefon: null, email: null };
    this.pendingFile = null;
    this.isOpen = false;
    this.step = 0;
    this.totalSteps = 7;
    this._typingEl = null;
    this._init();
  }

  TurboGitChatbot.prototype._init = function () {
    this._injectCSS();
    this._buildDOM();
    this._bindEvents();
    var self = this;
    setTimeout(function () {
      self._showNotif();
      setTimeout(function () { self.open(); }, CFG.autoOpenDelay);
    }, 1200);
  };

  TurboGitChatbot.prototype._injectCSS = function () {
    if (document.getElementById('tgw-css')) return;
    var s = el('style', { id: 'tgw-css' });
    s.textContent = CSS;
    document.head.appendChild(s);
  };

  TurboGitChatbot.prototype._buildDOM = function () {
    var self = this;

    // FAB
    this.fab = el('button', { id: 'tgw-fab', 'aria-label': 'Otwórz czat TURBO-GIT' });
    this.fab.innerHTML =
      '<span class="tgw-ring"></span><span class="tgw-ring"></span>' + ICON.turbo;
    document.body.appendChild(this.fab);

    // Window
    this.win = el('div', { id: 'tgw-win', role: 'dialog', 'aria-label': 'Czat TURBO-GIT' });

    // Header
    var hdr = el('div', { class: 'tgw-hdr' });
    var hdrInner = el('div', { class: 'tgw-hdr-inner' });
    var av = el('div', { class: 'tgw-avatar' }); av.innerHTML = ICON.turbo;
    var info = el('div', { class: 'tgw-info' });
    info.innerHTML =
      '<div class="tgw-name">TURBO-GIT Asystent</div>' +
      '<div class="tgw-status"><span class="tgw-status-dot"></span>Dostępny teraz</div>';
    var btns = el('div', { class: 'tgw-hdr-btns' });
    var minBtn = el('button', { class: 'tgw-hdr-btn', 'aria-label': 'Minimalizuj' });
    minBtn.innerHTML = ICON.minus;
    minBtn.addEventListener('click', function () { self.close(); });
    var closeBtn = el('button', { class: 'tgw-hdr-btn', 'aria-label': 'Zamknij' });
    closeBtn.innerHTML = ICON.close;
    closeBtn.addEventListener('click', function () { self.close(); });
    btns.appendChild(minBtn); btns.appendChild(closeBtn);
    hdrInner.appendChild(av); hdrInner.appendChild(info); hdrInner.appendChild(btns);
    hdr.appendChild(hdrInner);

    // Phone bar
    var pb = el('div', { class: 'tgw-phone-bar' });
    var pl = el('a', { class: 'tgw-phone-link', href: 'tel:' + CFG.phone });
    pl.innerHTML = ICON.phone + ' Zadzwoń: ' + CFG.phoneDisplay;
    var pr = el('div', { class: 'tgw-phone-bar-r' }, 'Pn–Pt 8:00–17:00');
    pb.appendChild(pl); pb.appendChild(pr);

    // Progress
    this.progWrap = el('div', { class: 'tgw-prog' });
    this.progBar = el('div', { class: 'tgw-prog-bar' });
    this.progWrap.appendChild(this.progBar);

    // Step bar
    this.stepBar = el('div', { class: 'tgw-step-bar' });
    this.stepText = el('span', { class: 'tgw-step-text' }, 'Dobór turbosprężarki');
    this.stepNum = el('span', { class: 'tgw-step-num' }, '');
    this.stepBar.appendChild(this.stepText); this.stepBar.appendChild(this.stepNum);

    // Messages
    this.msgs = el('div', { class: 'tgw-msgs', role: 'log', 'aria-live': 'polite' });

    // Input area
    var ia = el('div', { class: 'tgw-input-area' });
    this.filePrev = el('div', { class: 'tgw-file-prev' });
    this.filePrev.innerHTML =
      ICON.img +
      '<span class="tgw-file-name"></span>' +
      '<button class="tgw-file-rm" aria-label="Usuń plik">×</button>';
    this.filePrev.querySelector('.tgw-file-rm').addEventListener('click', function () {
      self.pendingFile = null;
      self.filePrev.classList.remove('tgw-vis');
      self.fileInput.value = '';
    });

    var ir = el('div', { class: 'tgw-input-row' });
    var iw = el('div', { class: 'tgw-input-wrap' });
    this.input = el('textarea', { class: 'tgw-input', placeholder: 'Napisz wiadomość…', rows: '1', 'aria-label': 'Wiadomość' });
    this.attBtn = el('button', { class: 'tgw-att-btn', 'aria-label': 'Dodaj zdjęcie', type: 'button' });
    this.attBtn.innerHTML = ICON.clip;
    this.sendBtn = el('button', { class: 'tgw-send-btn', 'aria-label': 'Wyślij', type: 'button' });
    this.sendBtn.innerHTML = ICON.send;
    this.fileInput = el('input', { type: 'file', id: 'tgw-file', accept: 'image/*,.pdf' });
    iw.appendChild(this.input); iw.appendChild(this.attBtn);
    ir.appendChild(iw); ir.appendChild(this.sendBtn);
    var hint = el('div', { class: 'tgw-hint' }, 'TURBO-GIT · Profesjonalny dobór turbosprężarek');
    ia.appendChild(this.filePrev); ia.appendChild(ir); ia.appendChild(hint);

    this.win.appendChild(hdr);
    this.win.appendChild(pb);
    this.win.appendChild(this.progWrap);
    this.win.appendChild(this.stepBar);
    this.win.appendChild(this.msgs);
    this.win.appendChild(ia);
    this.win.appendChild(this.fileInput);
    document.body.appendChild(this.win);
  };

  TurboGitChatbot.prototype._bindEvents = function () {
    var self = this;
    this.fab.addEventListener('click', function () { self.toggle(); });
    this.sendBtn.addEventListener('click', function () { self._send(); });
    this.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self._send(); }
    });
    this.input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });
    this.attBtn.addEventListener('click', function () { self.fileInput.click(); });
    this.fileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        self.pendingFile = this.files[0];
        self.filePrev.querySelector('.tgw-file-name').textContent = self.pendingFile.name;
        self.filePrev.classList.add('tgw-vis');
      }
    });
    this.msgs.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-qbtn]');
      if (btn) self._onQuick(btn.getAttribute('data-qbtn'), btn.getAttribute('data-action'));
      var cta = e.target.closest('[data-cta]');
      if (cta) self._onCTA(cta.getAttribute('data-cta'));
    });
  };

  TurboGitChatbot.prototype.open = function () {
    this.isOpen = true;
    this.win.classList.add('tgw-open');
    this._removeNotif();
    if (this.msgs.children.length === 0) {
      setTimeout(function () { }, 100);
      this._showWelcome();
    }
    this.input.focus();
  };

  TurboGitChatbot.prototype.close = function () {
    this.isOpen = false;
    this.win.classList.remove('tgw-open');
  };

  TurboGitChatbot.prototype.toggle = function () {
    if (this.isOpen) this.close(); else this.open();
  };

  TurboGitChatbot.prototype._showNotif = function () {
    if (this.notif) return;
    this.notif = el('span', { class: 'tgw-notif', 'aria-label': '1 nowa wiadomość' }, '1');
    this.fab.appendChild(this.notif);
  };

  TurboGitChatbot.prototype._removeNotif = function () {
    if (this.notif) { this.notif.remove(); this.notif = null; }
  };

  TurboGitChatbot.prototype._time = function () {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  };

  TurboGitChatbot.prototype._scroll = function () {
    var m = this.msgs;
    setTimeout(function () { m.scrollTop = m.scrollHeight; }, 50);
  };

  TurboGitChatbot.prototype._showTyping = function () {
    if (this._typingEl) return;
    var row = el('div', { class: 'tgw-typing-row' });
    var av = el('div', { class: 'tgw-mini-av' }); av.innerHTML = ICON.turbo;
    var bbl = el('div', { class: 'tgw-typing-bbl' });
    bbl.innerHTML = '<span class="tgw-dot"></span><span class="tgw-dot"></span><span class="tgw-dot"></span>';
    row.appendChild(av); row.appendChild(bbl);
    this.msgs.appendChild(row);
    this._typingEl = row;
    this._scroll();
  };

  TurboGitChatbot.prototype._hideTyping = function () {
    if (this._typingEl) { this._typingEl.remove(); this._typingEl = null; }
  };

  TurboGitChatbot.prototype._botMsg = function (text, delay, cb) {
    var self = this;
    delay = delay || CFG.typingMedium;
    self._showTyping();
    setTimeout(function () {
      self._hideTyping();
      var row = el('div', { class: 'tgw-row tgw-row-bot' });
      var av = el('div', { class: 'tgw-mini-av' }); av.innerHTML = ICON.turbo;
      var bbl = el('div', { class: 'tgw-bubble' }); bbl.innerHTML = text;
      var t = el('span', { class: 'tgw-time' }, self._time());
      row.appendChild(av); row.appendChild(bbl); row.appendChild(t);
      self.msgs.appendChild(row);
      self._scroll();
      if (cb) cb();
    }, delay);
  };

  TurboGitChatbot.prototype._userMsg = function (text) {
    var row = el('div', { class: 'tgw-row tgw-row-user' });
    var bbl = el('div', { class: 'tgw-bubble' }); bbl.textContent = text;
    var t = el('span', { class: 'tgw-time' }, this._time());
    row.appendChild(bbl); row.appendChild(t);
    this.msgs.appendChild(row);
    this._scroll();
  };

  TurboGitChatbot.prototype._fileMsg = function (file) {
    var row = el('div', { class: 'tgw-row tgw-row-user' });
    var bbl = el('div', { class: 'tgw-bubble' });
    bbl.innerHTML = '📎 <strong>' + file.name + '</strong><br><span style="font-size:11px;opacity:.7">Plik załączony</span>';
    var t = el('span', { class: 'tgw-time' }, this._time());
    row.appendChild(bbl); row.appendChild(t);
    this.msgs.appendChild(row);
    this._scroll();
  };

  TurboGitChatbot.prototype._qbtns = function (btns) {
    var wrap = el('div', { class: 'tgw-qbtns' });
    btns.forEach(function (b) {
      var btn = el('button', { class: 'tgw-qbtn', 'data-qbtn': b.value || b.label, 'data-action': b.action || '' });
      btn.textContent = b.label;
      wrap.appendChild(btn);
    });
    this.msgs.appendChild(wrap);
    this._scroll();
    return wrap;
  };

  TurboGitChatbot.prototype._ctas = function (btns) {
    var wrap = el('div', { class: 'tgw-ctas' });
    btns.forEach(function (b) {
      var btn;
      if (b.href) {
        btn = el('a', { class: 'tgw-cta ' + (b.cls || 'tgw-cta-adv'), href: b.href, 'data-cta': b.action || '' });
        if (b.href.startsWith('tel:')) btn.setAttribute('target', '_self');
      } else {
        btn = el('button', { class: 'tgw-cta ' + (b.cls || 'tgw-cta-adv'), 'data-cta': b.action || '' });
      }
      btn.innerHTML = (b.icon || '') + b.label;
      wrap.appendChild(btn);
    });
    this.msgs.appendChild(wrap);
    this._scroll();
    return wrap;
  };

  TurboGitChatbot.prototype._dataCard = function (rows) {
    var card = el('div', { class: 'tgw-card' });
    var title = el('div', { class: 'tgw-card-title' }, '📋 Dane do doboru');
    card.appendChild(title);
    rows.forEach(function (r) {
      var row = el('div', { class: 'tgw-card-row' });
      row.innerHTML = '<span class="tgw-card-lbl">' + r[0] + '</span><span class="tgw-card-val">' + r[1] + '</span>';
      card.appendChild(row);
    });
    this.msgs.appendChild(card);
    this._scroll();
  };

  TurboGitChatbot.prototype._success = function (title, text) {
    var card = el('div', { class: 'tgw-success' });
    card.innerHTML =
      '<div class="tgw-success-icon">✅</div>' +
      '<div class="tgw-success-title">' + title + '</div>' +
      '<div class="tgw-success-txt">' + text + '</div>';
    this.msgs.appendChild(card);
    this._scroll();
  };

  TurboGitChatbot.prototype._progress = function (pct, stepLabel, stepStr) {
    this.progBar.style.width = pct + '%';
    if (stepLabel) {
      this.stepBar.classList.add('tgw-visible');
      this.stepText.textContent = stepLabel;
      this.stepNum.textContent = stepStr || '';
    } else {
      this.stepBar.classList.remove('tgw-visible');
    }
  };

  TurboGitChatbot.prototype._clearInput = function () {
    this.input.value = '';
    this.input.style.height = 'auto';
  };

  TurboGitChatbot.prototype._send = function () {
    var txt = this.input.value.trim();
    var file = this.pendingFile;
    if (!txt && !file) return;
    if (file) {
      this._fileMsg(file);
      this.pendingFile = null;
      this.filePrev.classList.remove('tgw-vis');
      this.fileInput.value = '';
    }
    if (txt) {
      this._userMsg(txt);
      this._clearInput();
    }
    this._handleInput(txt || ('[Zdjęcie: ' + (file ? file.name : '') + ']'), !!file);
  };

  TurboGitChatbot.prototype._onQuick = function (value, action) {
    this._userMsg(value);
    this._handleInput(value, false, action);
  };

  TurboGitChatbot.prototype._onCTA = function (action) {
    var self = this;
    if (action === 'lead') { self._startLead(); return; }
    if (action === 'photo') {
      self.fileInput.click();
      self._botMsg('Wyślij zdjęcie tabliczki znamionowej turbiny — doradca pomoże odczytać numer.', CFG.typingShort);
      return;
    }
    if (action === 'restart') { self._restart(); return; }
  };

  TurboGitChatbot.prototype._handleInput = function (text, isFile, action) {
    var self = this;
    var t = (text || '').toLowerCase();

    if (self.state === S.WELCOME) { self._onWelcome(text, action); return; }
    if (self.state === S.MARKA) { self._onMarka(text); return; }
    if (self.state === S.MODEL) { self._onModel(text); return; }
    if (self.state === S.ROK) { self._onRok(text); return; }
    if (self.state === S.SILNIK) { self._onSilnik(text); return; }
    if (self.state === S.NUMER_DECISION) { self._onNumerDecision(text, action); return; }
    if (self.state === S.COLLECT_NUMER) { self._onCollectNumer(text, isFile); return; }
    if (self.state === S.COLLECT_VIN) { self._onCollectVIN(text); return; }
    if (self.state === S.MAM_NUMER) { self._onMamNumer(text, isFile); return; }
    if (self.state === S.MAM_NUMER_AUTO) { self._onMamNumerAuto(text); return; }
    if (self.state === S.NIE_WIEM) { self._onNieWiem(text, action); return; }
    if (self.state === S.AWARIA_DESC) { self._onAwariaDesc(text); return; }
    if (self.state === S.AWARIA_AUTO) { self._onAwariaAuto(text); return; }
    if (self.state === S.LEAD_IMIE) { self._onLeadImie(text); return; }
    if (self.state === S.LEAD_TELEFON) { self._onLeadTelefon(text); return; }
    if (self.state === S.LEAD_EMAIL) { self._onLeadEmail(text); return; }
    if (self.state === S.DONE) {
      self._botMsg('Dziękujemy! Doradca TURBO-GIT skontaktuje się z Tobą wkrótce. Masz inne pytania?', CFG.typingShort, function () {
        self._ctas([
          { label: 'Nowe zapytanie', action: 'restart', cls: 'tgw-cta-adv', icon: '' },
          { label: '📞 Zadzwoń teraz', href: 'tel:' + CFG.phone, cls: 'tgw-cta-call' },
        ]);
      });
    }
  };

  // ─── WELCOME ───
  TurboGitChatbot.prototype._showWelcome = function () {
    var self = this;
    self.state = S.WELCOME;
    self._progress(0);
    setTimeout(function () {
      self._botMsg('Cześć 👋 Witamy w <strong>TURBO-GIT</strong>!<br>Szukasz turbosprężarki do swojego auta? Pomogę Ci dobrać właściwy model szybko i bez ryzyka pomyłki.', CFG.typingMedium, function () {
        self._qbtns([
          { label: '🔧 Dobierz turbosprężarkę', action: 'dobierz' },
          { label: '🔢 Mam numer turbiny', action: 'mam_numer' },
          { label: '❓ Nie wiem, czego potrzebuję', action: 'nie_wiem' },
          { label: '📞 Chcę kontakt z doradcą', action: 'kontakt' },
        ]);
      });
    }, 400);
  };

  TurboGitChatbot.prototype._onWelcome = function (text, action) {
    var self = this;
    var t = text.toLowerCase();
    if (action === 'dobierz' || t.includes('dobierz') || t.includes('dobor') || t.includes('szukam')) {
      self.state = S.MARKA;
      self._progress(10, 'Krok 1 z 6 — Marka pojazdu', '1/6');
      self._botMsg('Świetnie! Zacznijmy od marki pojazdu.', CFG.typingShort, function () {
        self._qbtns([
          { label: 'BMW' }, { label: 'Audi' }, { label: 'Volkswagen' },
          { label: 'Mercedes' }, { label: 'Ford' }, { label: 'Opel' },
          { label: 'Toyota' }, { label: 'Renault' }, { label: 'Inna marka…' },
        ]);
      });
    } else if (action === 'mam_numer' || t.includes('numer') || t.includes('mam nr')) {
      self.state = S.MAM_NUMER;
      self._progress(30, 'Numer turbiny', '');
      self._botMsg('Świetnie! Podaj numer turbiny — znajdziesz go na metalowej tabliczce na obudowie turbosprężarki.', CFG.typingMedium, function () {
        self._ctas([
          { label: '📷 Wyślij zdjęcie tabliczki', action: 'photo', cls: 'tgw-cta-photo' },
        ]);
      });
    } else if (action === 'nie_wiem' || t.includes('nie wiem') || t.includes('pomocy') || t.includes('nie znam')) {
      self.state = S.NIE_WIEM;
      self._progress(5);
      self._botMsg('Spokojnie, pomogę! Co konkretnie Cię sprowadza?', CFG.typingShort, function () {
        self._qbtns([
          { label: '🔧 Szukam nowej turbiny', action: 'dobierz' },
          { label: '⚠️ Turbo nie działa poprawnie', action: 'awaria' },
          { label: '♻️ Interesuje mnie regeneracja', action: 'regen' },
          { label: '💬 Mam inne pytanie', action: 'inne' },
        ]);
      });
    } else if (action === 'kontakt' || t.includes('kontakt') || t.includes('doradca') || t.includes('zadzwoń')) {
      self._startLead();
    } else {
      // free intent detection
      if (t.includes('awaria') || t.includes('dymi') || t.includes('nie działa') || t.includes('problem')) {
        self.state = S.AWARIA_DESC;
        self._botMsg('Rozumiem. Opisz objawy — co konkretnie się dzieje z turbosprężarką?', CFG.typingMedium);
      } else {
        self.state = S.MARKA;
        self._progress(10, 'Krok 1 z 6 — Marka pojazdu', '1/6');
        self._botMsg('Pomogę Ci dobrać właściwą turbosprężarkę. Zacznijmy od marki pojazdu.', CFG.typingShort, function () {
          self._qbtns([
            { label: 'BMW' }, { label: 'Audi' }, { label: 'Volkswagen' },
            { label: 'Mercedes' }, { label: 'Ford' }, { label: 'Opel' },
            { label: 'Toyota' }, { label: 'Inna marka…' },
          ]);
        });
      }
    }
  };

  // ─── NIE WIEM ───
  TurboGitChatbot.prototype._onNieWiem = function (text, action) {
    var self = this;
    var t = text.toLowerCase();
    if (action === 'dobierz' || t.includes('nowej') || t.includes('szukam') || t.includes('kupić')) {
      self.state = S.MARKA;
      self._progress(10, 'Krok 1 z 6 — Marka pojazdu', '1/6');
      self._botMsg('Dobra, dobierzemy turbosprężarkę krok po kroku. Jaka to marka auta?', CFG.typingShort, function () {
        self._qbtns([
          { label: 'BMW' }, { label: 'Audi' }, { label: 'Volkswagen' },
          { label: 'Mercedes' }, { label: 'Ford' }, { label: 'Opel' },
          { label: 'Toyota' }, { label: 'Inna marka…' },
        ]);
      });
    } else if (action === 'awaria' || t.includes('awaria') || t.includes('nie działa') || t.includes('problem') || t.includes('dymi')) {
      self.state = S.AWARIA_DESC;
      self._botMsg('Rozumiem. Opisz objawy — co konkretnie dzieje się z turbosprężarką?', CFG.typingMedium);
    } else if (action === 'regen' || t.includes('regenera') || t.includes('regen')) {
      self._botMsg('TURBO-GIT oferuje profesjonalną regenerację turbosprężarek. Żeby wycenić usługę, potrzebuję danych auta. Podaj markę, model i rok produkcji.', CFG.typingMedium, function () {
        self.state = S.MARKA;
        self._progress(10, 'Krok 1 z 6 — Marka pojazdu', '1/6');
      });
    } else {
      self._startLead();
    }
  };

  // ─── AWARIA ───
  TurboGitChatbot.prototype._onAwariaDesc = function (text) {
    var self = this;
    self.car.awariaOpis = text;
    self.state = S.AWARIA_AUTO;
    self._botMsg('Rozumiem. Żeby dobrać właściwą turbosprężarkę lub ocenić problem, podaj dane auta — markę, model, rok i silnik.', CFG.typingMedium, function () {
      self._progress(10, 'Krok 1 z 6 — Dane pojazdu', '1/6');
    });
  };

  TurboGitChatbot.prototype._onAwariaAuto = function (text) {
    var self = this;
    self.car.autoOpis = text;
    self.state = S.LEAD_IMIE;
    self._progress(55, 'Dane kontaktowe', '');
    self._botMsg('Mam opis objawów i dane auta. Żeby doradca TURBO-GIT mógł się z Tobą skontaktować — podaj swoje imię.', CFG.typingMedium);
  };

  // ─── DOBIERZ FLOW ───
  TurboGitChatbot.prototype._onMarka = function (text) {
    var self = this;
    var marka = text.replace(/inna marka…?/i, '').trim() || text;
    self.car.marka = marka;
    self.state = S.MODEL;
    self._progress(22, 'Krok 2 z 6 — Model pojazdu', '2/6');
    self._botMsg('Dobra — <strong>' + marka + '</strong>. Jaki model?', CFG.typingShort);
  };

  TurboGitChatbot.prototype._onModel = function (text) {
    var self = this;
    self.car.model = text;
    self.state = S.ROK;
    self._progress(36, 'Krok 3 z 6 — Rok produkcji', '3/6');
    self._botMsg('Rok produkcji?', CFG.typingShort, function () {
      var year = new Date().getFullYear();
      self._qbtns([
        { label: '2023–2025' }, { label: '2018–2022' }, { label: '2013–2017' },
        { label: '2008–2012' }, { label: '2003–2007' }, { label: 'Inny…' },
      ]);
    });
  };

  TurboGitChatbot.prototype._onRok = function (text) {
    var self = this;
    self.car.rok = text;
    self.state = S.SILNIK;
    self._progress(50, 'Krok 4 z 6 — Silnik', '4/6');
    self._botMsg('Podaj pojemność i moc silnika, np. <em>2.0 TDI 143 KM</em> lub <em>3.0 d 190 KM</em>.', CFG.typingMedium);
  };

  TurboGitChatbot.prototype._onSilnik = function (text) {
    var self = this;
    self.car.silnik = text;
    self.state = S.NUMER_DECISION;
    self._progress(65, 'Krok 5 z 6 — Identyfikacja turbo', '5/6');
    self._botMsg(
      'Dane pojazdu przyjęte ✓<br>' +
      '<strong>' + self.car.marka + ' ' + self.car.model + ' ' + self.car.rok + ' · ' + text + '</strong><br><br>' +
      'Do tego silnika mogą pasować <strong>różne wersje turbosprężarki</strong>. Żeby dobrać właściwą bez ryzyka pomyłki — potrzebuję numeru turbiny, kodu silnika lub VIN.',
      CFG.typingLong,
      function () {
        self._qbtns([
          { label: '🔢 Podam numer turbiny', action: 'numer' },
          { label: '🪪 Podam numer VIN', action: 'vin' },
          { label: '📷 Wyślę zdjęcie tabliczki', action: 'photo_numer' },
          { label: '👨‍🔧 Połącz z doradcą', action: 'lead' },
        ]);
      }
    );
  };

  TurboGitChatbot.prototype._onNumerDecision = function (text, action) {
    var self = this;
    var t = text.toLowerCase();
    if (action === 'numer' || t.includes('numer') || t.includes('podam nr')) {
      self.state = S.COLLECT_NUMER;
      self._progress(75, 'Krok 6 z 6 — Numer turbiny', '6/6');
      self._botMsg('Podaj numer turbiny. Znajdziesz go na metalowej tabliczce na obudowie turbosprężarki.', CFG.typingMedium, function () {
        self._ctas([{ label: '📷 Wyślij zdjęcie zamiast numeru', action: 'photo', cls: 'tgw-cta-photo' }]);
      });
    } else if (action === 'vin' || t.includes('vin')) {
      self.state = S.COLLECT_VIN;
      self._progress(75, 'Krok 6 z 6 — Numer VIN', '6/6');
      self._botMsg('Podaj numer VIN (17 znaków). Znajdziesz go na tablicy rozdzielczej lub w dowodzie rejestracyjnym.', CFG.typingMedium);
    } else if (action === 'photo_numer' || t.includes('zdjęcie') || t.includes('foto')) {
      self.fileInput.click();
      self._botMsg('Wyślij zdjęcie tabliczki znamionowej turbiny — doradca odczyta numer i dobierze właściwy model.', CFG.typingShort, function () {
        self.state = S.COLLECT_NUMER;
        self._progress(75, 'Krok 6 z 6 — Zdjęcie tabliczki', '6/6');
      });
    } else {
      self._startLead();
    }
  };

  TurboGitChatbot.prototype._onCollectNumer = function (text, isFile) {
    var self = this;
    if (isFile) {
      self.car.numerTurbo = '[zdjęcie tabliczki]';
    } else {
      self.car.numerTurbo = text;
    }
    self._progress(90, 'Dane kontaktowe', '');
    self._showDataCard();
    self._botMsg('Doskonale! Mam wszystkie dane. Przygotujemy dla Ciebie ofertę. Jak masz na imię?', CFG.typingMedium, function () {
      self.state = S.LEAD_IMIE;
    });
  };

  TurboGitChatbot.prototype._onCollectVIN = function (text) {
    var self = this;
    if (text.length < 10) {
      self._botMsg('Numer VIN powinien mieć 17 znaków. Sprawdź i podaj jeszcze raz.', CFG.typingShort);
      return;
    }
    self.car.vin = text.toUpperCase();
    self._progress(90, 'Dane kontaktowe', '');
    self._showDataCard();
    self._botMsg('VIN przyjęty ✓ Na tej podstawie dobierzemy właściwą turbosprężarkę. Jak masz na imię?', CFG.typingMedium, function () {
      self.state = S.LEAD_IMIE;
    });
  };

  TurboGitChatbot.prototype._showDataCard = function () {
    var c = this.car;
    var rows = [];
    if (c.marka) rows.push(['Marka', c.marka]);
    if (c.model) rows.push(['Model', c.model]);
    if (c.rok) rows.push(['Rok', c.rok]);
    if (c.silnik) rows.push(['Silnik', c.silnik]);
    if (c.numerTurbo) rows.push(['Nr turbiny', c.numerTurbo]);
    if (c.vin) rows.push(['VIN', c.vin]);
    if (c.autoOpis) rows.push(['Opis', c.autoOpis]);
    if (rows.length > 0) this._dataCard(rows);
  };

  // ─── MAM NUMER ───
  TurboGitChatbot.prototype._onMamNumer = function (text, isFile) {
    var self = this;
    if (isFile) {
      self.car.numerTurbo = '[zdjęcie tabliczki]';
    } else {
      self.car.numerTurbo = text;
    }
    self.state = S.MAM_NUMER_AUTO;
    self._progress(50, 'Dane pojazdu', '');
    self._botMsg(
      'Numer przyjęty: <strong>' + (isFile ? 'zdjęcie tabliczki' : text) + '</strong> ✓<br>' +
      'Podaj jeszcze markę i model auta, żebyśmy mogli potwierdzić dopasowanie, np. <em>Audi A4 2.0 TDI 2011</em>.',
      CFG.typingLong
    );
  };

  TurboGitChatbot.prototype._onMamNumerAuto = function (text) {
    var self = this;
    self.car.autoOpis = text;
    self._progress(75, 'Dane kontaktowe', '');
    self._showDataCard();
    self._botMsg('Dzięki! Przekażę dane do doradcy TURBO-GIT. Jak masz na imię?', CFG.typingMedium, function () {
      self.state = S.LEAD_IMIE;
    });
  };

  // ─── LEAD CAPTURE ───
  TurboGitChatbot.prototype._startLead = function () {
    var self = this;
    self.state = S.LEAD_IMIE;
    self._progress(55, 'Dane kontaktowe', '');
    self._botMsg('Chętnie! Zostaw dane, a doradca TURBO-GIT skontaktuje się z Tobą wkrótce.<br>Jak masz na imię?', CFG.typingMedium);
  };

  TurboGitChatbot.prototype._onLeadImie = function (text) {
    var self = this;
    if (text.length < 2) {
      self._botMsg('Podaj proszę swoje imię.', CFG.typingShort);
      return;
    }
    self.lead.imie = text;
    self.state = S.LEAD_TELEFON;
    self._progress(78, 'Numer telefonu', '');
    self._botMsg('Miło, <strong>' + text + '</strong>! Podaj numer telefonu — doradca oddzwoni z potwierdzeniem i ofertą.', CFG.typingMedium);
  };

  TurboGitChatbot.prototype._onLeadTelefon = function (text) {
    var self = this;
    var clean = text.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?[\d]{7,15}$/.test(clean)) {
      self._botMsg('Numer telefonu wygląda niepoprawnie. Podaj go jeszcze raz, np. <em>+48 500 100 200</em>.', CFG.typingShort);
      return;
    }
    self.lead.telefon = text;
    self.state = S.LEAD_EMAIL;
    self._progress(88, 'Adres e-mail (opcjonalnie)', '');
    self._botMsg('Świetnie! Adres e-mail (opcjonalnie — możesz wpisać <em>pomiń</em>):', CFG.typingShort);
  };

  TurboGitChatbot.prototype._onLeadEmail = function (text) {
    var self = this;
    var t = text.toLowerCase().trim();
    if (t !== 'pomiń' && t !== 'pomin' && t !== '-' && t !== '') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
        self._botMsg('Adres e-mail wygląda niepoprawnie. Sprawdź lub wpisz <em>pomiń</em>, żeby kontynuować.', CFG.typingShort);
        return;
      }
      self.lead.email = text;
    }
    self.state = S.DONE;
    self._progress(100);
    self.stepBar.classList.remove('tgw-visible');
    self._submitLead();
  };

  TurboGitChatbot.prototype._submitLead = function () {
    var self = this;
    self._showTyping();
    setTimeout(function () {
      self._hideTyping();
      self._showDataCard();
      self._success(
        'Zapytanie wysłane!',
        'Doradca TURBO-GIT skontaktuje się z <strong>' + self.lead.imie + '</strong> na numer <strong>' + self.lead.telefon + '</strong> w ciągu kilku godzin.'
      );
      self._botMsg('Dziękujemy za kontakt! Jeśli chcesz, możesz też zadzwonić bezpośrednio — jesteśmy dostępni od pon. do pt. w godz. 8–17.', CFG.typingMedium, function () {
        self._ctas([
          { label: '📞 Zadzwoń teraz', href: 'tel:' + CFG.phone, cls: 'tgw-cta-call' },
          { label: '🔄 Nowe zapytanie', action: 'restart', cls: 'tgw-cta-adv' },
        ]);
      });

      // Optionally send data to backend
      if (window.TurboGitLeadCallback) {
        window.TurboGitLeadCallback({ car: self.car, lead: self.lead });
      }
      // Optionally POST to endpoint
      if (window.TurboGitLeadEndpoint) {
        fetch(window.TurboGitLeadEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ car: self.car, lead: self.lead, ts: new Date().toISOString() }),
        }).catch(function () {});
      }
    }, 1800);
  };

  TurboGitChatbot.prototype._restart = function () {
    var self = this;
    self.car = { marka: null, model: null, rok: null, silnik: null, numerTurbo: null, vin: null };
    self.lead = { imie: null, telefon: null, email: null };
    self.pendingFile = null;
    self.state = S.WELCOME;
    self._progress(0);
    self.stepBar.classList.remove('tgw-visible');
    while (self.msgs.firstChild) self.msgs.removeChild(self.msgs.firstChild);
    self._showWelcome();
  };

  // ─── AUTO-INIT ───
  function init() {
    if (!window.TurboGitChatbotInstance) {
      window.TurboGitChatbotInstance = new TurboGitChatbot();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);
