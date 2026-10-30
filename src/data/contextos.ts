import type { CategoryKey } from '../types'

// Palabras que admiten más de una categoría según la oración (DID-8). Una palabra
// suelta no alcanza para decidir: `casa` es sustantivo en «una casa grande» y verbo
// en «se casa en mayo». Cuando el alumno se equivoca con una de estas, el «¿Por qué?»
// le muestra los dos usos en oraciones en vez de decirle solo «no es un verbo».
//
// Solo están las que tienen un segundo uso claro. Las que el docente tiene que
// decidir (`luego`, `cuando`, `ya`, `incluso`, `tonto`, `oscuro`…) quedan afuera a
// propósito: no se enseña como hecho lo que es discutible.

export interface Lectura {
  cat: CategoryKey
  frase: string
}

const L = (cat: CategoryKey, frase: string): Lectura => ({ cat, frase })

export const CONTEXTOS: Record<string, Lectura[]> = {
  // Sustantivo + forma de un verbo
  casa:      [L('sustantivos', 'Vivo en una casa grande.'), L('verbos', 'Mi hermana se casa en mayo.')],
  libro:     [L('sustantivos', 'Leí un libro entero.'), L('verbos', 'Hoy me libro de la tarea.')],
  mesa:      [L('sustantivos', 'Puse el plato en la mesa.'), L('verbos', 'Ella se mesa el cabello.')],
  camino:    [L('sustantivos', 'El camino sube la montaña.'), L('verbos', 'Yo camino al colegio todos los días.')],
  estrella:  [L('sustantivos', 'Vi una estrella fugaz.'), L('verbos', 'El auto se estrella contra el poste.')],
  nieve:     [L('sustantivos', 'La nieve cubrió el patio.'), L('verbos', 'Ojalá nieve mañana.')],
  silencio:  [L('sustantivos', 'Hubo un silencio largo.'), L('verbos', 'Yo silencio el celular en clase.')],
  sueño:     [L('sustantivos', 'Tuve un sueño raro.'), L('verbos', 'Yo sueño con viajar.')],
  desierto:  [L('sustantivos', 'Cruzamos el desierto.'), L('adjetivos', 'Encontramos el pueblo desierto.')],

  // Adjetivo + sustantivo (el adjetivo sustantivado)
  rojo:        [L('adjetivos', 'Me puse un buzo rojo.'), L('sustantivos', 'El rojo es mi color favorito.')],
  azul:        [L('adjetivos', 'Compré una mochila azul.'), L('sustantivos', 'El azul del mar me calma.')],
  verde:       [L('adjetivos', 'Pinté un árbol verde.'), L('sustantivos', 'El verde del pasto brilla.')],
  frío:        [L('adjetivos', 'Tomé un café frío.'), L('sustantivos', 'Hace mucho frío hoy.')],
  joven:       [L('adjetivos', 'Es un profesor joven.'), L('sustantivos', 'Un joven ayudó a la señora.')],
  viejo:       [L('adjetivos', 'Tengo un auto viejo.'), L('sustantivos', 'El viejo cuenta historias.')],
  brillante:   [L('adjetivos', 'Tuvo una idea brillante.'), L('sustantivos', 'Lleva un brillante en el anillo.')],
  dulce:       [L('adjetivos', 'La fruta es dulce.'), L('sustantivos', 'Me regalaron un dulce.')],
  rico:        [L('adjetivos', 'Preparé un postre rico.'), L('sustantivos', 'El rico donó dinero al hospital.')],
  pobre:       [L('adjetivos', 'Es un pueblo pobre.'), L('sustantivos', 'El pobre pidió ayuda.')],
  sabio:       [L('adjetivos', 'Fue un consejo sabio.'), L('sustantivos', 'El sabio explicó el eclipse.')],
  cobarde:     [L('adjetivos', 'Fue una actitud cobarde.'), L('sustantivos', 'El cobarde salió corriendo.')],
  cuadrado:    [L('adjetivos', 'Dibujé en un papel cuadrado.'), L('sustantivos', 'Dibujé un cuadrado en la hoja.')],
  desconocido: [L('adjetivos', 'Escuchamos un ruido desconocido.'), L('sustantivos', 'Un desconocido tocó el timbre.')],
  largo:       [L('adjetivos', 'El camino es largo.'), L('sustantivos', 'Medí el largo de la mesa.')],
  alto:        [L('adjetivos', 'Mi primo es alto.'), L('sustantivos', 'Hicimos un alto en el camino.')],

  // Adjetivo + forma de un verbo
  limpio:    [L('adjetivos', 'Dejé el piso limpio.'), L('verbos', 'Yo limpio mi cuarto los sábados.')],
  seco:      [L('adjetivos', 'El pasto está seco.'), L('verbos', 'Yo seco los platos.')],
  tranquilo: [L('adjetivos', 'Es un lugar tranquilo.'), L('verbos', 'Yo tranquilo a mi hermanito cuando llora.')],

  // Adjetivo + adverbio
  rápido: [L('adjetivos', 'Es un auto rápido.'), L('adverbios', 'No corras tan rápido.')],
  fuerte: [L('adjetivos', 'Es un perro fuerte.'), L('adverbios', 'No hables tan fuerte.')],
  duro:   [L('adjetivos', 'El pan está duro.'), L('adverbios', 'Trabajó duro todo el año.')],

  // Adverbio + otra
  bajo:     [L('adjetivos', 'Mi hermano es bajo.'), L('preposiciones', 'El gato está bajo la mesa.')],
  bien:     [L('adverbios', 'Hoy dormí bien.'), L('conjunciones', 'Bien por mail, bien por teléfono, avisame.'), L('sustantivos', 'El bien vence al mal.')],
  mal:      [L('adverbios', 'Canta muy mal.'), L('adjetivos', 'Tuve un mal día.'), L('sustantivos', 'El mal no dura para siempre.')],
  mañana:   [L('adverbios', 'Mañana tengo examen.'), L('sustantivos', 'La mañana estaba fría.')],
  tarde:    [L('adverbios', 'Llegué tarde a clase.'), L('sustantivos', 'Por la tarde juego al fútbol.')],
  mucho:    [L('adverbios', 'Estudié mucho.'), L('pronombres', 'Mucho de lo que dijo es cierto.')],
  poco:     [L('adverbios', 'Dormí poco anoche.'), L('pronombres', 'Hay poco que decir.')],
  apenas:   [L('adverbios', 'Apenas tengo tiempo.'), L('conjunciones', 'Apenas llegues, avisame.')],
  entonces: [L('adverbios', 'Hasta entonces no lo sabía.'), L('conjunciones', 'Llueve, entonces me quedo.')],
  nada:     [L('adverbios', 'No me gusta nada.'), L('pronombres', 'No quiero nada.')],
  algo:     [L('adverbios', 'Estoy algo cansado.'), L('pronombres', 'Quiero comer algo.')],

  // Artículo + pronombre
  la:  [L('articulos', 'La puerta está abierta.'), L('pronombres', 'A María la vi ayer.')],
  los: [L('articulos', 'Los chicos juegan.'), L('pronombres', 'A tus primos los vi ayer.')],
  las: [L('articulos', 'Las flores crecen.'), L('pronombres', 'A las chicas las llamé.')],

  // Preposición y conjunción + otra
  sobre:  [L('preposiciones', 'El libro está sobre la mesa.'), L('sustantivos', 'Abrí el sobre de la carta.')],
  contra: [L('preposiciones', 'Chocó contra la pared.'), L('sustantivos', 'Anoté un pro y un contra.')],
  para:   [L('preposiciones', 'Este regalo es para vos.'), L('verbos', 'El colectivo para en la esquina.')],
  salvo:  [L('preposiciones', 'Vinieron todos salvo Ana.'), L('adjetivos', 'Llegó sano y salvo.')],
  pero:   [L('conjunciones', 'Quiero ir, pero llueve.'), L('sustantivos', 'Tu idea no tiene ningún pero.')],
  como:   [L('conjunciones', 'Corre como el viento.'), L('verbos', 'Yo como pan en el desayuno.')],
  que:    [L('pronombres', 'El libro que leí es largo.'), L('conjunciones', 'Dijo que vendría.')],
}
