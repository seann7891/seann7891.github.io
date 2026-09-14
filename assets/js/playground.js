(function () {
  var root = document.documentElement;
  var btn = document.getElementById('pg-theme');
  var search = document.getElementById('pg-search');
  var cats = document.querySelectorAll('.pg-cat');
  var groups = document.querySelectorAll('.pg-group');
  var empty = document.querySelector('.pg-empty');

  function setTheme(t) { root.setAttribute('data-theme', t); try { localStorage.setItem('pg-theme', t); } catch (e) {} btn.textContent = t === 'dark' ? '☀' : '☾'; }
  btn.textContent = root.getAttribute('data-theme') === 'dark' ? '☀' : '☾';
  btn.addEventListener('click', function () { setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });

  var activeCat = 'all';
  function apply() {
    var q = search.value.trim().toLowerCase();
    var shown = 0;
    groups.forEach(function (g) {
      var visible = 0;
      g.querySelectorAll('.pg-app').forEach(function (a) {
        var ok = (activeCat === 'all' || g.dataset.cat === activeCat) && (!q || a.dataset.search.toLowerCase().indexOf(q) > -1);
        a.hidden = !ok; if (ok) visible++;
      });
      g.hidden = visible === 0; shown += visible;
    });
    empty.hidden = shown > 0;
  }
  cats.forEach(function (c) {
    c.addEventListener('click', function (e) {
      e.preventDefault(); activeCat = c.dataset.cat;
      cats.forEach(function (x) { x.classList.toggle('is-active', x === c); if (x === c) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
      apply();
    });
  });
  search.addEventListener('input', apply);
  apply();
})();
