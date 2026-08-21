(function () {
  document.documentElement.classList.add("page-fade");
  window.addEventListener("load", function () {
    requestAnimationFrame(function () { document.documentElement.classList.add("page-fade-in"); });
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^https?:\/\//.test(href)) return;
    e.preventDefault();
    document.documentElement.classList.remove("page-fade-in");
    setTimeout(function () { location.href = href; }, 180);
  });
})();
