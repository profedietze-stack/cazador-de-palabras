import type { Category, CategoryKey } from '../types'

export const CATS: Record<CategoryKey, Category> = {
  sustantivos: {
    nombre: 'Sustantivos', icon: '🏠',
    def: 'Palabras que nombran personas, animales, cosas o conceptos abstractos.',
    ejem: ['casa', 'gato', 'libertad', 'niño', 'planeta', 'música', 'ciudad', 'río'],
    ok: ['casa','gato','libertad','niño','planeta','música','árbol','mar','libro','amor','tiempo','escuela','perro','puerta','ventana','mesa','silla','cama','ciudad','río','montaña','flor','cielo','nube','viento','fuego','agua','tierra','sol','luna','camino','jardín','piedra','barco','puente','pájaro','mariposa','estrella','serpiente','tigre','elefante','ballena','delfín','hormiga','abeja','bosque','desierto','volcán','tormenta','lluvia','nieve','hoja','semilla','raíz','fruto','sombra','luz','color','sonido','silencio','memoria','sueño','esperanza','verdad','miedo','alegría','tristeza'],
    mal: ['grande','pequeño','rojo','correr','rápido','aquí','y','pero','hermoso','lentamente','el','mi','tu','donde','como','porque','siendo','aunque','feliz','azul','correr','saltar','brillante','oscuro','siempre','nunca'],
  },
  adjetivos: {
    nombre: 'Adjetivos', icon: '🎨',
    def: 'Palabras que describen o modifican a los sustantivos, indicando cualidades.',
    ejem: ['grande', 'hermoso', 'rojo', 'triste', 'rápido', 'feliz'],
    ok: ['grande','pequeño','hermoso','rojo','azul','verde','triste','feliz','rápido','lento','frío','caliente','joven','viejo','fuerte','débil','largo','corto','alto','bajo','brillante','oscuro','suave','duro','dulce','amargo','lindo','feo','limpio','sucio','nuevo','antiguo','rico','pobre','sabio','tonto','valiente','cobarde','generoso','egoísta','tranquilo','nervioso','gordo','delgado','redondo','cuadrado','recto','torcido','húmedo','seco','pesado','liviano','luminoso','opaco','silencioso','ruidoso','famoso','desconocido','simpático','antipático'],
    mal: ['casa','gato','correr','rápidamente','el','la','y','pero','aquí','cuando','siendo','música','amor','tiempo','yo','tú','él','en','de','con','aunque'],
  },
  verbos: {
    nombre: 'Verbos', icon: '⚡',
    def: 'Palabras que expresan acciones, estados o procesos en el tiempo.',
    ejem: ['correr', 'comer', 'ser', 'pensar', 'saltar', 'leer'],
    ok: ['correr','comer','ser','pensar','saltar','leer','escribir','hablar','escuchar','mirar','jugar','dormir','vivir','morir','nacer','existir','parecer','entrar','salir','comprar','vender','amar','odiar','crear','destruir','abrir','cerrar','seguir','volar','nadar','cantar','bailar','reír','llorar','gritar','susurrar','caminar','trepar','caer','subir','bajar','empujar','jalar','romper','construir','pintar','dibujar','cocinar','limpiar','estudiar','enseñar','aprender','recordar','olvidar','imaginar','soñar','sentir','tocar','oler','probar','ver','elegir','decidir','comenzar','terminar','ayudar','luchar'],
    mal: ['casa','grande','rápido','rápidamente','el','mi','y','pero','aquí','cuando','hermoso','triste','libertad','yo','tú','en','de','con','aunque','porque'],
  },
  adverbios: {
    nombre: 'Adverbios', icon: '📍',
    def: 'Palabras que modifican verbos, adjetivos u otros adverbios. Indican modo, lugar o tiempo.',
    ejem: ['rápidamente', 'bien', 'aquí', 'siempre', 'nunca', 'ayer'],
    ok: ['rápidamente','lentamente','bien','mal','aquí','allá','siempre','nunca','ayer','hoy','mañana','ahora','entonces','después','antes','cerca','lejos','arriba','abajo','apenas','casi','también','tampoco','mucho','poco','muy','bastante','demasiado','nada','algo','acá','allí','afuera','adentro','adelante','atrás','encima','debajo','pronto','tarde','temprano','jamás','quizás','acaso','efectivamente','exactamente','suavemente','fuertemente','fácilmente','claramente','verdaderamente','absolutamente','completamente','igualmente','finalmente'],
    mal: ['casa','gato','grande','correr','el','y','pero','porque','hermoso','libertad','música','yo','tú','él','en','de','con','aunque','siendo'],
  },
  articulos: {
    nombre: 'Artículos', icon: '📌',
    def: 'Palabras que preceden al sustantivo e indican si es definido/indefinido, género y número.',
    ejem: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'],
    ok: ['el','la','los','las','un','una','unos','unas'],
    mal: ['casa','gato','grande','correr','rápidamente','aquí','y','pero','mi','tu','su','porque','hermoso','yo','tú','él','en','de','con','aunque','siendo','este','ese','aquel','siempre','nunca','correr','escribir','feliz','triste'],
  },
  pronombres: {
    nombre: 'Pronombres', icon: '👤',
    def: 'Palabras que reemplazan al sustantivo para evitar repeticiones en la oración.',
    ejem: ['yo', 'tú', 'él', 'ella', 'nosotros', 'ellos'],
    ok: ['yo','tú','él','ella','ello','nosotros','vosotros','ellos','ellas','me','te','se','nos','os','les','mi','tu','su','nuestro','vuestro','quien','que','cual','esto','eso','aquello','alguien','nadie','algo','nada','cualquiera','mismo','propio','otro','todo','ambos','cada','varios','pocos','muchos','ninguno','alguno'],
    mal: ['casa','gato','grande','correr','rápidamente','el','la','y','pero','aquí','hermoso','música','en','de','con','aunque','porque','siendo','feliz','árbol'],
  },
  preposiciones: {
    nombre: 'Preposiciones', icon: '🔗',
    def: 'Palabras que establecen relaciones de lugar, tiempo o modo entre otras palabras.',
    ejem: ['en', 'de', 'a', 'con', 'por', 'para', 'desde', 'hasta'],
    ok: ['en','de','a','con','por','para','desde','hasta','entre','sobre','bajo','ante','tras','según','sin','contra','durante','hacia','mediante','excepto','salvo','incluso','pro','vía'],
    mal: ['casa','gato','grande','correr','rápidamente','yo','el','la','y','pero','hermoso','porque','aunque','siendo','rojo','azul','árbol','siempre'],
  },
  conjunciones: {
    nombre: 'Conjunciones', icon: '🔀',
    def: 'Palabras que unen palabras, frases u oraciones entre sí.',
    ejem: ['y', 'o', 'pero', 'si', 'aunque', 'porque', 'sino'],
    ok: ['y','o','pero','sino','si','aunque','porque','pues','luego','mientras','cuando','donde','como','entonces','además','tampoco','ni','ya','tanto','bien','sea','mas','que','ora','ya que','así que','con que','de modo que','a menos que','a fin de que','siempre que','a pesar de que','dado que'],
    mal: ['casa','gato','grande','correr','rápidamente','yo','el','la','en','de','hermoso','árbol','siempre','nunca','rojo','azul','siendo','libertad'],
  },
  interjecciones: {
    nombre: 'Interjecciones', icon: '💬',
    def: 'Palabras que expresan sentimientos, emociones o sensaciones de forma exclamativa.',
    ejem: ['¡ay!', '¡oh!', '¡bravo!', '¡cuidado!', '¡guau!'],
    ok: ['¡ay!','¡oh!','¡hola!','¡adiós!','¡bravo!','¡cuidado!','¡guau!','¡caramba!','¡vaya!','¡eureka!','¡uf!','¡oye!','¡genial!','¡basta!','¡ánimo!','¡auxilio!','¡ole!','¡chau!','¡increíble!','¡perfecto!','¡socorro!','¡silencio!','¡atención!','¡hurra!','¡excelente!','¡qué bien!'],
    mal: ['casa','gato','grande','correr','rápidamente','yo','el','en','y','pero','hermoso','árbol','siempre','libertad','rojo','azul'],
  },
}
