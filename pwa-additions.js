(function () {
  'use strict';

  function secureExternalLinks() {
    var links = document.querySelectorAll('a[target="_blank"]');
    links.forEach(function (link) {
      var rel = (link.getAttribute('rel') || '').split(' ').filter(Boolean);
      if (rel.indexOf('noopener') === -1) rel.push('noopener');
      if (rel.indexOf('noreferrer') === -1) rel.push('noreferrer');
      link.setAttribute('rel', rel.join(' ').trim());
    });
  }

  function registerServiceWorkerOnce() {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    navigator.serviceWorker.getRegistration('./').then(function (registration) {
      if (registration) return registration;
      return navigator.serviceWorker.register('./sw.js', { scope: './' });
    }).catch(function (error) {
      console.warn('Service worker registration failed:', error);
    });
  }

  function markPwaInstalled() {
    try {
      localStorage.setItem('intimateHealthPwaInstalled', 'true');
    } catch (_) {
      // ignore storage restrictions
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', secureExternalLinks);
  } else {
    secureExternalLinks();
  }

  registerServiceWorkerOnce();
  window.addEventListener('appinstalled', markPwaInstalled);
})();
