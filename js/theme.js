/* ============================================
   主题引导脚本
   在 <head> 中同步加载，尽早写入 <html data-theme>，避免深色主题闪白
   主题：system（跟随系统）/ light（浅色）/ black（深色）
   ============================================ */
(function () {
  'use strict';

  var KEY = 'companion_theme';
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  /* system 解析为当前实际主题 */
  function resolve(pref) {
    if (pref === 'system') return mq.matches ? 'black' : 'light';
    return pref === 'black' ? 'black' : 'light';
  }

  function apply(pref) {
    document.documentElement.setAttribute('data-theme', resolve(pref));
  }

  function get() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) {}
    return v === 'light' || v === 'black' || v === 'system' ? v : 'system';
  }

  /* 首屏立即应用（此时 body 尚未渲染） */
  apply(get());

  window.CompanionTheme = {
    KEY: KEY,
    get: get,
    set: function (pref) {
      try { localStorage.setItem(KEY, pref); } catch (e) {}
      apply(pref);
    },
    /* 系统主题变化时，仅当用户选择 system 才跟随 */
    onChange: function (cb) {
      mq.addEventListener('change', function () {
        if (get() === 'system') {
          apply('system');
          if (typeof cb === 'function') cb('system');
        }
      });
    }
  };
})();
