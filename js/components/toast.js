const ICONS = { success: "check-circle-2", error: "alert-circle", info: "info" };

export function showToast(message, type = "success") {
  const root = document.getElementById("toast-root");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i data-lucide="${ICONS[type] || ICONS.info}"></i><span>${message}</span>`;
  root.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 240);
  }, 3200);
}
