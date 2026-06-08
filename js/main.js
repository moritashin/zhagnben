document.addEventListener('DOMContentLoaded', () => {
  Pages.init();

  // 注册 Service Worker（PWA）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
