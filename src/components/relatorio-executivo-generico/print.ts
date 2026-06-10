/** Move o #rel-doc para body, imprime e restaura. */
export function exportarPdfRelatorio() {
  const doc = document.getElementById('rel-doc');
  if (!doc) { window.print(); return; }
  const originalParent = doc.parentElement;
  const placeholder = document.createComment('rel-doc-placeholder');
  if (originalParent) originalParent.insertBefore(placeholder, doc);
  document.body.appendChild(doc);
  document.body.classList.add('printing-rel-doc');
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    document.body.classList.remove('printing-rel-doc');
    if (originalParent && placeholder.parentNode === originalParent) {
      originalParent.insertBefore(doc, placeholder);
      placeholder.remove();
    } else if (placeholder.parentNode) {
      placeholder.remove();
    }
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  setTimeout(() => {
    try {
      window.print();
    } finally {
      setTimeout(restore, 1000);
    }
  }, 50);
}
