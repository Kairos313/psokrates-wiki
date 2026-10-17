(function () {
  /* Skip touch-only devices; keep cursor on laptops/desktops with mouse */
  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
    return;
  }

  var root = document.documentElement;
  var cursor = document.createElement("div");
  cursor.id = "custom-cursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);
  root.classList.add("custom-cursor-active");

  var x = window.innerWidth / 2;
  var y = window.innerHeight / 2;
  var hovering = false;
  var visible = false;

  var hoverSelector =
    "a, button, .btn, input[type='submit'], input[type='button'], label, select, summary, [role='button']";

  function render() {
    var scale = hovering ? 1.5 : 1;
    cursor.style.left = x + "px";
    cursor.style.top = y + "px";
    cursor.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
    cursor.style.opacity = visible ? "1" : "0";
  }

  function isHoverTarget(element) {
    return element && element.closest && element.closest(hoverSelector);
  }

  function onMove(event) {
    x = event.clientX;
    y = event.clientY;
    visible = true;
    cursor.classList.add("is-visible");
    render();
  }

  document.addEventListener("mousemove", onMove, { passive: true });
  document.addEventListener("pointermove", onMove, { passive: true });

  document.addEventListener("mouseover", function (event) {
    if (isHoverTarget(event.target)) {
      hovering = true;
      cursor.classList.add("is-hover");
      render();
    }
  });

  document.addEventListener("mouseout", function (event) {
    if (isHoverTarget(event.target)) {
      hovering = false;
      cursor.classList.remove("is-hover");
      render();
    }
  });

  document.addEventListener("mousedown", function () {
    cursor.classList.add("is-pressed");
  });

  document.addEventListener("mouseup", function () {
    cursor.classList.remove("is-pressed");
  });

  document.addEventListener("mouseleave", function () {
    visible = false;
    cursor.classList.remove("is-visible");
    render();
  });

  render();
})();
