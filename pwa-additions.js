(function(){
  'use strict';

  // Install prompt handling
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('install-app-btn');
    if (btn) btn.classList.add('show');
  });

  const installBtn = document.getElementById('install-app-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.classList.remove('show');
      console.log('PWA install choice', choice);
    });
  }

  const mobileToggle = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      const expanded = mobileToggle.getAttribute('aria-expanded') === 'true';
      mobileToggle.setAttribute('aria-expanded', String(!expanded));
      mobileNav.classList.toggle('show');
    });
    document.addEventListener('click', (event) => {
      if (!mobileNav.classList.contains('show')) return;
      const path = event.composedPath ? event.composedPath() : event.path || [];
      if (!path.includes(mobileNav) && !path.includes(mobileToggle)) {
        mobileNav.classList.remove('show');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });
    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('show');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Service worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      console.log('ServiceWorker registado', reg);
    }).catch((err) => console.warn('Erro ao registar SW:', err));
  }

  // Helper: request notification permission
  async function requestNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return await Notification.requestPermission();
  }

  // Show a test notification via SW registration
  function showNotificationViaSW(title, options) {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      try { reg.showNotification(title, options); } catch (e) { console.warn('showNotification error', e); }
    });
  }

  // Send test notification
  const testBtn = document.getElementById('cycle-test-notification');
  if (testBtn) testBtn.addEventListener('click', () => showNotificationViaSW('Lembrete de teste', { body: 'Este é um lembrete de exemplo do Diário do Ciclo.', tag: 'cycle-test' }));

  // Enable notifications button (Diário do ciclo)
  const enableNotifBtn = document.getElementById('cycle-enable-notifications');
  if (enableNotifBtn) {
    enableNotifBtn.addEventListener('click', async () => {
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        localStorage.setItem('cycle-notifs-enabled', '1');
        showNotificationViaSW('Notificações ativadas', { body: 'As notificações do Diário do Ciclo foram ativadas.', tag: 'cycle-enabled' });
        scheduleCycleNotificationsFromSaved();
      } else if (perm === 'denied') {
        alert('Permissão de notificações negada. Altere nas definições do navegador.');
      } else {
        alert('Permissão de notificações não concedida.');
      }
    });
  }

  // Basic scheduling: store cycles and schedule local timeouts while app is open
  function saveCycle(startIso, lengthDays) {
    const arr = JSON.parse(localStorage.getItem('cycles') || '[]');
    arr.unshift({ start: startIso, length: lengthDays, savedAt: new Date().toISOString() });
    localStorage.setItem('cycles', JSON.stringify(arr));
  }

  function scheduleNotificationAt(dateObj, title, body, tag) {
    const ms = dateObj.getTime() - Date.now();
    if (ms <= 0) return; // time passed
    // If delay too long, still store for reference; setTimeout may be unreliable for very long delays
    if (ms > 1000 * 60 * 60 * 24 * 30) {
      // store planned notification
      const plan = JSON.parse(localStorage.getItem('planned-notifs') || '[]');
      plan.push({ time: dateObj.toISOString(), title, body, tag });
      localStorage.setItem('planned-notifs', JSON.stringify(plan));
      return;
    }
    setTimeout(() => {
      showNotificationViaSW(title, { body, tag });
    }, ms);
  }

  function scheduleCycleNotificationsFromSaved() {
    const enabled = localStorage.getItem('cycle-notifs-enabled');
    if (!enabled) return;
    const cycles = JSON.parse(localStorage.getItem('cycles') || '[]');
    if (!cycles.length) return;
    // Use most recent cycle to predict next events
    const latest = cycles[0];
    const start = new Date(latest.start);
    const avgCycle = parseInt(localStorage.getItem('avg-cycle-days') || '28', 10);
    const periodLength = parseInt(latest.length || 5, 10) || 5;

    // Next period prediction: add avgCycle days to start
    const nextPeriodStart = new Date(start.getTime() + avgCycle * 24 * 60 * 60 * 1000);
    scheduleNotificationAt(nextPeriodStart, 'Próxima menstruação prevista', `Sua menstruação deve começar por volta de ${nextPeriodStart.toLocaleDateString()}.`, 'cycle-next-period');

    // Ovulation approx: nextPeriodStart - 14 days
    const ov = new Date(nextPeriodStart.getTime() - 14 * 24 * 60 * 60 * 1000);
    scheduleNotificationAt(ov, 'Ovulação prevista', `Ovulação prevista por volta de ${ov.toLocaleDateString()}.`, 'cycle-ovulation');

    // Fertile window: ov -5 .. ov +1
    for (let d = -5; d <= 1; d++) {
      const day = new Date(ov.getTime() + d * 24 * 60 * 60 * 1000);
      scheduleNotificationAt(day, 'Janela fértil', `Janela fértil: ${day.toLocaleDateString()}`, 'cycle-fertile');
    }
  }

  // Hook cycle-form submit to save and schedule
  const cycleForm = document.getElementById('cycle-form');
  if (cycleForm) {
    cycleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const start = document.getElementById('period-start').value;
      const length = parseInt(document.getElementById('period-length').value, 10) || 5;
      if (!start) return alert('Escolha a data de início');
      saveCycle(start, length);
      // Optionally update avg-cycle-days by keeping simple 28
      localStorage.setItem('avg-cycle-days', localStorage.getItem('avg-cycle-days') || '28');
      // Schedule notifications immediately for the saved cycle
      scheduleCycleNotificationsFromSaved();
      alert('Ciclo guardado e notificações programadas (se ativadas)');
      cycleForm.reset();
    });
  }

  // When page loads, schedule planned notifications (short term) and process planned-notifs
  window.addEventListener('load', () => {
    try {
      scheduleCycleNotificationsFromSaved();
      const planned = JSON.parse(localStorage.getItem('planned-notifs') || '[]');
      planned.forEach(n => {
        const d = new Date(n.time);
        scheduleNotificationAt(d, n.title, n.body, n.tag);
      });
    } catch (e) { console.warn('Erro ao agendar notificações salvas', e); }
  });

})();
