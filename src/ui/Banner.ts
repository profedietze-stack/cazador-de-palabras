export function showBanner(txt: string): void {
  const b = document.createElement('div')
  b.className = 'alert-banner'
  // Los lectores de pantalla anuncian los avisos (antes eran mudos para ellos).
  b.setAttribute('role', 'status')
  b.setAttribute('aria-live', 'polite')
  b.textContent = txt
  document.body.appendChild(b)
  setTimeout(() => {
    b.classList.add('saliendo')
    setTimeout(() => b.remove(), 400)
  }, 3100)
}
