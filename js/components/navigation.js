export function initNavigation(onNavigate) {
  document.querySelectorAll(".nav-item, .bottom-nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-view");
      if (view) onNavigate(view);
    });
  });
}

export function setActiveView(view) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.getAttribute("data-view") === view);
  });
  document.querySelectorAll(".bottom-nav-item").forEach((item) => {
    item.classList.toggle("active", item.getAttribute("data-view") === view);
  });
}
