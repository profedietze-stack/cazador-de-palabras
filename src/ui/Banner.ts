export function showBanner(txt: string): void {
  const b = document.createElement('div')
  b.className = 'alert-banner'
  b.textContent = txt
  document.body.appendChild(b)
  setTimeout(() => {
    b.classList.add('saliendo')
    setTimeout(() => b.remove(), 400)
  }, 3100)
}
