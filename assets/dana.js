/* SUTA-DHANA — dāna by debit/credit card (no PayPal account needed) or PayPal.
   Uses PayPal's JS SDK with Mor's live PayPal Client ID (public by design). */
(function () {
  var CLIENT_ID = 'AZSqotWXh6a0ATWHtY_7oaVEDx2R3dNETw83_TPIpnGJSPAW19NnAQab1lVDVM5cLMCzXzjSccZzgtKX';
  var NOTIFY_KEY = '1c648618-77d0-4e7e-a533-900ff958d552';
  var box = document.getElementById('dana-buttons'), msg = document.querySelector('.dana-msg'),
      other = document.getElementById('dana-other'), btns = document.querySelectorAll('[data-amt]'), chosen = '50';
  if (!box) return;

  /* Apple Pay: PayPal's on-page buttons don't offer it for this account, so on Apple devices
     show a button to PayPal's hosted donation page (open amount), which does. */
  try {
    var ua = navigator.userAgent, apple = document.getElementById('dana-apple');
    var canApple = (window.ApplePaySession && ApplePaySession.canMakePayments && ApplePaySession.canMakePayments()) ||
                   /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (apple && canApple) apple.hidden = false;
  } catch (e) {}

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      chosen = b.getAttribute('data-amt'); other.value = ''; msg.textContent = '';
      btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });
  other.addEventListener('input', function () {
    btns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
    chosen = null; msg.textContent = '';
  });
  function amount() {
    var n = Math.round(parseFloat(chosen || other.value.replace(/[^0-9.]/g, '')) * 100) / 100;
    if (!(n >= 1) || n > 10000) { msg.textContent = 'Please choose or enter an amount (at least $1).'; return null; }
    return n.toFixed(2);
  }
  function fallback() {
    box.innerHTML = '<p class="dana-wait">Card donations aren’t available right now. You can still give through <a href="https://paypal.me/sutadhana" target="_blank" rel="noopener">PayPal</a>.</p>';
  }

  var s = document.createElement('script');
  s.src = 'https://www.paypal.com/sdk/js?client-id=' + CLIENT_ID + '&currency=USD&intent=capture&components=buttons&enable-funding=card';
  s.onerror = fallback;
  s.onload = function () {
    if (!window.paypal) return fallback();
    box.innerHTML = '';
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'pay', height: 45 },
      onClick: function (d, actions) { return amount() ? actions.resolve() : actions.reject(); },
      createOrder: function (d, actions) {
        return actions.order.create({
          purchase_units: [{ description: 'Dāna – Suta-Dhana Pali teaching', amount: { currency_code: 'USD', value: amount() } }],
          application_context: { shipping_preference: 'NO_SHIPPING', brand_name: 'Suta-Dhana' }
        });
      },
      onApprove: function (d, actions) {
        return actions.order.capture().then(function (r) {
          var p = r.payer || {}, n = p.name || {}, amt = amount();
          document.getElementById('dana-give').hidden = true;
          var done = document.getElementById('dana-done'); done.hidden = false;
          done.querySelector('.first').textContent = n.given_name ? ', ' + n.given_name : '';
          done.querySelector('.amt').textContent = '$' + amt.replace('.00', '');
          var f = new FormData();
          f.set('access_key', NOTIFY_KEY); f.set('from_name', 'SUTA-DHANA website');
          f.set('subject', 'Suta-Dhana: new dāna – $' + amt);
          f.set('name', [n.given_name, n.surname].filter(Boolean).join(' ')); f.set('email', p.email_address || '');
          f.set('amount', '$' + amt); f.set('paypal_order', r.id);
          fetch('https://api.web3forms.com/submit', { method: 'POST', body: f, headers: { Accept: 'application/json' } }).catch(function () {});
        });
      },
      onError: function () { msg.textContent = 'Sorry, the donation didn’t go through. Please try again.'; }
    }).render(box).catch(fallback);
  };
  document.head.appendChild(s);
})();
