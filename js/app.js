/* ============================================
   AI智能伴侣 · 前端逻辑
   - 聊天状态管理（localStorage 持久化）
   - DeepSeek API 流式调用（SSE）
   - 消息渲染 / Markdown / 邮件反馈
   ============================================ */
(function () {
  'use strict';

  /* ---------- 常量配置 ---------- */
  var API_URL = 'https://api.deepseek.com/chat/completions'; // DeepSeek 兼容 OpenAI 接口，浏览器可跨域直连
  var MODEL = 'deepseek-v4-flash';
  var STORE_KEY = 'companion_chat_v1';
  var MAX_SEND = 20; // 每次发送给 API 的最大历史消息条数（防止上下文超长）

  /* ---------- DOM 引用 ---------- */
  function $(id) { return document.getElementById(id); }
  var messagesEl = $('messages');
  var innerEl = messagesEl.querySelector('.messages-inner');
  var emptyEl = $('emptyState');
  var inputEl = $('input');
  var sendBtn = $('sendBtn');
  var clearBtn = $('clearBtn');
  var nickEl = $('nickname');
  var natureEl = $('nature');
  var keyEl = $('apiKey');

  /* ---------- 状态 ---------- */
  var history = [];   // 聊天记录（localStorage 持久化）
  var streaming = false;

  /* ========== 工具函数 ========== */
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) history = [];
    } catch (e) { history = []; }
    nickEl.value = localStorage.getItem('companion_nickname') || '';
    natureEl.value = localStorage.getItem('companion_nature') || '';
    keyEl.value = localStorage.getItem('companion_api_key') || '';
  }

  function saveHistory() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(history)); } catch (e) {}
  }

  function scrollBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* 轻量 Markdown 渲染：代码块 / 行内代码 / 加粗 / 斜体 / 链接 / 换行 */
  function renderMarkdown(text) {
    var blocks = [];
    var html = escapeHtml(text);
    html = html.replace(/```([\s\S]*?)```/g, function (m, code) {
      blocks.push('<pre class="code-block"><code>' + code.trim() + '</code></pre>');
      return '\u0000' + (blocks.length - 1) + '\u0000';
    });
    html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/\u0000(\d+)\u0000/g, function (m, i) { return blocks[+i]; });
    return html;
  }

  /* ========== 渲染 ========== */
  function renderAll() {
    innerEl.innerHTML = '';
    if (!history.length) {
      innerEl.appendChild(emptyEl);
      return;
    }
    history.forEach(function (m) { appendMessageDom(m.role, m.content); });
    scrollBottom();
  }

  function appendMessageDom(role, content) {
    if (emptyEl.parentNode === innerEl) emptyEl.remove();
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + (role === 'user' ? 'user' : role === 'error' ? 'error' : 'assistant');
    var avatar = role === 'user' ? '🙂' : role === 'error' ? '⚠️' : '🤖';
    var body = role === 'user'
      ? escapeHtml(content).replace(/\n/g, '<br>')
      : renderMarkdown(content);
    wrap.innerHTML = '<div class="avatar">' + avatar + '</div><div class="bubble">' + body + '</div>';
    innerEl.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function showTyping() {
    var wrap = document.createElement('div');
    wrap.className = 'msg assistant';
    wrap.innerHTML = '<div class="avatar">🤖</div><div class="bubble typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
    innerEl.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  /* ========== API 调用 ========== */
  function buildSystemPrompt() {
    var nick = nickEl.value.trim() || '小助手';
    var nat = natureEl.value.trim() || '傲娇';
    return '你是一个傲娇的AI助手,昵称为' + nick + ',性格为' + nat + '。\n请根据用户输入的内容进行回答，回答时要体现出你的傲娇性格。\n回复内容不能过长,要像微信聊天一样';
  }

  /* 流式读取 SSE 响应，每收到一段内容就回调 onDelta */
  async function streamChat(messages, onDelta) {
    var resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + keyEl.value.trim()
      },
      body: JSON.stringify({ model: MODEL, messages: messages, stream: true })
    });
    if (!resp.ok) {
      var msg = '请求失败（HTTP ' + resp.status + '）';
      try {
        var err = await resp.json();
        if (err && err.error && err.error.message) msg = err.error.message;
      } catch (e) {}
      if (resp.status === 401) msg = 'API Key 无效或已过期，请检查左侧的 Key';
      if (resp.status === 429) msg = '请求过于频繁，触发了限流，请稍后再试';
      throw new Error(msg);
    }
    if (!resp.body) throw new Error('当前浏览器不支持流式响应');

    var reader = resp.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';
    while (true) {
      var r = await reader.read();
      if (r.done) break;
      buffer += decoder.decode(r.value, { stream: true });
      var lines = buffer.split('\n');
      buffer = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        var t = lines[i].trim();
        if (t.indexOf('data:') !== 0) continue;
        var data = t.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          var json = JSON.parse(data);
          var delta = json.choices && json.choices[0] && json.choices[0].delta;
          if (delta && delta.content) onDelta(delta.content);
        } catch (e) { /* 忽略不完整的行 */ }
      }
    }
  }

  /* ========== 发送流程 ========== */
  async function send() {
    var text = inputEl.value.trim();
    if (!text || streaming) return;
    var key = keyEl.value.trim();
    if (!key) {
      appendMessageDom('error', '请先在左侧输入你的 DeepSeek API Key ～');
      return;
    }

    // 用户消息入列并渲染
    history.push({ role: 'user', content: text });
    saveHistory();
    appendMessageDom('user', text);
    inputEl.value = '';
    inputEl.style.height = 'auto';
    setBusy(true);
    console.log('-----> 用户发送请求，提示词：', text);

    var typingWrap = showTyping();
    var fullResponse = '';
    var assistantWrap = null;
    var bubbleEl = null;

    try {
      var sys = buildSystemPrompt();
      var msgs = [{ role: 'system', content: sys }].concat(history.slice(-MAX_SEND));
      await streamChat(msgs, function (delta) {
        fullResponse += delta;
        if (!assistantWrap) {
          typingWrap.remove();
          assistantWrap = appendMessageDom('assistant', '');
          bubbleEl = assistantWrap.querySelector('.bubble');
        }
        bubbleEl.innerHTML = renderMarkdown(fullResponse); // 流式逐字更新
        scrollBottom();
      });

      if (!assistantWrap) { // 接口未返回任何内容
        typingWrap.remove();
        fullResponse = '（没有收到回复）';
        assistantWrap = appendMessageDom('assistant', fullResponse);
      }
      history.push({ role: 'assistant', content: fullResponse });
      saveHistory();
    } catch (err) {
      typingWrap.remove();
      appendMessageDom('error', err.message || '出错了，请稍后重试');
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function setBusy(busy) {
    streaming = busy;
    sendBtn.disabled = busy;
    inputEl.disabled = busy;
  }

  /* ========== 事件绑定 ========== */
  sendBtn.addEventListener('click', send);

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  inputEl.addEventListener('input', function () {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px'; // 自动增高
  });

  clearBtn.addEventListener('click', function () {
    if (streaming) return;
    if (history.length && !confirm('确定清空所有聊天记录吗？')) return;
    history = [];
    saveHistory();
    renderAll();
  });

  nickEl.addEventListener('change', function () {
    localStorage.setItem('companion_nickname', nickEl.value.trim());
  });
  natureEl.addEventListener('change', function () {
    localStorage.setItem('companion_nature', natureEl.value.trim());
  });
  keyEl.addEventListener('input', function () {
    localStorage.setItem('companion_api_key', keyEl.value.trim());
  });

  /* ========== Bug 反馈（mailto 邮件） ========== */
  var BUG_EMAIL = '991895176@qq.com';
  var bugModal = $('bugModal');
  var bugText = $('bugText');

  $('bugBtn').addEventListener('click', function (e) {
    e.preventDefault();
    bugText.value = '';
    bugModal.hidden = false;
    bugText.focus();
  });

  $('bugCancel').addEventListener('click', function () {
    bugModal.hidden = true;
  });

  bugModal.addEventListener('click', function (e) {
    if (e.target === bugModal) bugModal.hidden = true; // 点遮罩关闭
  });

  $('bugSend').addEventListener('click', function () {
    var desc = bugText.value.trim() || '（未填写描述）';
    var subject = encodeURIComponent('AI智能伴侣 - Bug反馈');
    var body = encodeURIComponent(
      '你好，我在使用 AI智能伴侣 时遇到了一个问题：\n\n' +
      '【问题描述】\n' + desc + '\n\n' +
      '【环境信息】\n浏览器：' + navigator.userAgent + '\n时间：' + new Date().toLocaleString('zh-CN')
    );
    window.location.href = 'mailto:' + BUG_EMAIL + '?subject=' + subject + '&body=' + body;
    bugModal.hidden = true;
  });

  /* ========== 初始化 ========== */
  load();
  renderAll();
})();
