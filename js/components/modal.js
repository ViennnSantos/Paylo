export function openModal({ title, bodyHtml, footerHtml, onMount, size = "md" }) {
  const root = document.getElementById("modal-root");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" style="max-width:${size === "lg" ? "620px" : "460px"}" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" data-close="1" aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">${footerHtml || ""}</div>
    </div>
  `;
  root.appendChild(backdrop);
  if (window.lucide) window.lucide.createIcons();

  function close() {
    backdrop.classList.remove("open");
    setTimeout(() => backdrop.remove(), 200);
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(event) {
    if (event.key === "Escape") close();
  }

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
    if (event.target.closest("[data-close]")) close();
  });
  document.addEventListener("keydown", onKeydown);

  requestAnimationFrame(() => backdrop.classList.add("open"));

  const modalEl = backdrop.querySelector(".modal");
  if (onMount) onMount(modalEl, close);

  return { close, element: modalEl };
}

export function openConfirm({ title, message, confirmLabel = "Confirm", danger = true, onConfirm }) {
  const { close } = openModal({
    title,
    bodyHtml: `<p class="confirm-dialog-body">${message}</p>`,
    footerHtml: `
      <button class="btn btn-ghost" data-close="1">Cancel</button>
      <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="confirm-action-btn">${confirmLabel}</button>
    `,
    onMount: (modalEl, closeFn) => {
      modalEl.querySelector("#confirm-action-btn").addEventListener("click", async () => {
        await onConfirm();
        closeFn();
      });
    }
  });
  return { close };
}
