// Emojis del juego como imágenes propias (Fluent 3D, public/emoji/), iguales en cualquier
// dispositivo y sin pedir nada a internet.
//
// Regla de seguridad: esta función solo construye nodos con createElement; jamás arma HTML a
// partir de texto. Aun así, el texto de otros jugadores va en contenedores `data-sin-emoji`
// (queda como texto del sistema, tal como lo escribió el alumno).

const EMOJI = '\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}\\uFE0F?)*'
const RE_EMOJI = new RegExp(EMOJI, 'gu')
const RE_UN_EMOJI = new RegExp('^' + EMOJI + '$', 'u')
const RE_HAY_EMOJI = new RegExp('\\p{Extended_Pictographic}', 'u')

/** Zonas donde no se reemplaza nada: texto de otros jugadores, código y campos de entrada. */
const EXCLUIDO = '[data-sin-emoji], script, style, textarea, input, [contenteditable]'

/** `'🎯' → '1f3af'`; la variación U+FE0F no cuenta (coincide con tools/emoji-inventario.mjs). */
export function codigoEmoji(e: string): string {
  return [...e].map(c => c.codePointAt(0)!.toString(16)).filter(c => c !== 'fe0f').join('-')
}

export function urlEmoji(e: string): string {
  return `${import.meta.env.BASE_URL}emoji/${codigoEmoji(e)}.webp`
}

/** Imagen del emoji. Si el archivo no carga, queda el emoji del sistema como texto. */
export function emojiNodo(e: string, px?: number): HTMLElement {
  const img = document.createElement('img')
  img.className = 'emo'
  img.alt = e
  img.src = urlEmoji(e)
  img.decoding = 'async'
  if (px) { img.width = px; img.height = px }
  img.addEventListener('error', () => {
    const t = document.createElement('span')
    t.className = 'emo-txt'
    t.setAttribute('data-sin-emoji', '')   // para que no se vuelva a hidratar
    t.textContent = e
    img.replaceWith(t)
  }, { once: true })
  return img
}

/** Para plantillas con constantes del juego. Lanza si `e` no es exactamente un emoji. */
export function emojiHtml(e: string): string {
  if (!RE_UN_EMOJI.test(e)) throw new Error('emojiHtml solo acepta un emoji')
  return `<img class="emo" alt="${e}" src="${urlEmoji(e)}" decoding="async">`
}

function reemplazarEn(t: Text): void {
  const padre = t.parentElement
  if (!padre || padre.closest(EXCLUIDO)) return
  const texto = t.data
  if (!RE_HAY_EMOJI.test(texto)) return
  const frag = document.createDocumentFragment()
  let desde = 0
  for (const m of texto.matchAll(RE_EMOJI)) {
    const i = m.index!
    if (m[0].codePointAt(0)! <= 0xff) continue
    if (i > desde) frag.appendChild(document.createTextNode(texto.slice(desde, i)))
    frag.appendChild(emojiNodo(m[0]))
    desde = i + m[0].length
  }
  if (desde === 0) return
  if (desde < texto.length) frag.appendChild(document.createTextNode(texto.slice(desde)))
  t.replaceWith(frag)
}

/** Reemplaza cada emoji de los textos bajo `raiz` por su imagen. */
export function hidratarEmojis(raiz: Node = document.body): void {
  if (raiz.nodeType === Node.TEXT_NODE) { reemplazarEn(raiz as Text); return }
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  const textos: Text[] = []
  for (let n = w.nextNode(); n; n = w.nextNode()) textos.push(n as Text)
  textos.forEach(reemplazarEn)   // se junta primero y se reemplaza después: no se muta mientras se recorre
}

let observador: MutationObserver | null = null

/** Hidrata lo que ya está en pantalla y todo lo que el juego agregue después. */
export function iniciarHidratacion(): void {
  if (!observador) {
    observador = new MutationObserver(cambios => {
      for (const c of cambios) c.addedNodes.forEach(n => hidratarEmojis(n))
    })
    observador.observe(document.body, { childList: true, subtree: true })
  }
  hidratarEmojis()
}
