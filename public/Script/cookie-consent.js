(function () {
  var CONSENT_KEY = 'db_workouts_cookie_consent';

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function setConsent(val) {
    try { localStorage.setItem(CONSENT_KEY, val); } catch (e) {}
  }

  function loadAnalytics() {
    // GTM
    (function (w, d, s, l, i) {
      w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
      j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
      f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', 'GTM-WP7SGHH5');

    (function (w, d, s, l, i) {
      w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
      j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
      f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', 'GTM-NTB5TFMH');

    // GA4
    var s1 = document.createElement('script');
    s1.async = true;
    s1.src = 'https://www.googletagmanager.com/gtag/js?id=G-SF5QQJNM9T';
    document.head.appendChild(s1);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'G-SF5QQJNM9T');

    var s2 = document.createElement('script');
    s2.async = true;
    s2.src = 'https://www.googletagmanager.com/gtag/js?id=G-3WDZBM8JJ7';
    document.head.appendChild(s2);
    gtag('config', 'G-3WDZBM8JJ7');

    // Microsoft Clarity
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', 'xfnkie9bk6');
  }

  function showBanner() {
    var style = document.createElement('style');
    style.textContent = '#dbw-cookie-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#18181b;border-top:1px solid #3f3f46;padding:14px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between;font-family:inherit}#dbw-cookie-banner p{margin:0;color:#d4d4d8;font-size:13px;max-width:680px;line-height:1.5}#dbw-cookie-banner a{color:#ff5a6e;display:inline-flex;align-items:center;min-height:24px}#dbw-cookie-btns{display:flex;gap:8px;flex-shrink:0}#dbw-cookie-decline{padding:7px 14px;border-radius:6px;border:1px solid #71717a;background:transparent;color:#d4d4d8;font-size:13px;cursor:pointer}#dbw-cookie-accept{padding:7px 14px;border-radius:6px;border:none;background:#B30018;color:#fff;font-size:13px;font-weight:600;cursor:pointer}';
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.id = 'dbw-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = '<p>We use analytics cookies (Google Analytics &amp; Microsoft Clarity) to improve this site. Your data stays on your device. <a href="/privacy-policy" target="_blank" rel="noopener" aria-label="Read the privacy policy">Privacy Policy</a></p><div id="dbw-cookie-btns"><button id="dbw-cookie-decline" aria-label="Decline analytics cookies">Decline</button><button id="dbw-cookie-accept" aria-label="Accept analytics cookies">Accept</button></div>';
    document.body.appendChild(banner);

    function dismissBanner() {
      var fab = document.querySelector('.db-wa-fab');
      if (fab) fab.style.bottom = '';
      banner.remove();
    }

    // push FAB above the banner
    requestAnimationFrame(function() {
      var fab = document.querySelector('.db-wa-fab');
      if (fab) {
        var bannerH = banner.offsetHeight || 70;
        fab.style.bottom = (bannerH + 12) + 'px';
      }
    });

    document.getElementById('dbw-cookie-accept').addEventListener('click', function () {
      setConsent('accepted');
      dismissBanner();
      loadAnalytics();
    });

    document.getElementById('dbw-cookie-decline').addEventListener('click', function () {
      setConsent('declined');
      dismissBanner();
    });
  }

  var consent = getConsent();
  if (consent === 'accepted') {
    loadAnalytics();
  } else if (!consent) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
