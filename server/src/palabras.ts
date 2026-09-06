// GENERADO desde ../../src/data/categories.ts — no editar a mano.
//
// El servidor arma el tablero del duelo, asi que necesita el diccionario. Antes
// lo mandaba el cliente junto con la marca de que palabra era correcta: un
// alumno podia crear un duelo con todo marcado como correcto y nivel 10, y
// cobrar 100 puntos por tocar un verbo en una partida de sustantivos.
// Comprobado contra produccion antes de este cambio.
//
// Es una copia y las copias se desincronizan: hay un test que compara este
// archivo con el del cliente y falla si alguien toca uno solo de los dos.
// El cliente conserva su copia porque el modo de un jugador corre entero en el
// dispositivo y la necesita.

export interface CategoriaPalabras {
  ok: string[]
  mal: string[]
}

export const PALABRAS: Record<string, CategoriaPalabras> = {
  sustantivos: {
    ok: ["casa", "gato", "libertad", "niño", "planeta", "música", "árbol", "mar", "libro", "amor", "tiempo", "escuela", "perro", "puerta", "ventana", "mesa", "silla", "cama", "ciudad", "río", "montaña", "flor", "cielo", "nube", "viento", "fuego", "agua", "tierra", "sol", "luna", "camino", "jardín", "piedra", "barco", "puente", "pájaro", "mariposa", "estrella", "serpiente", "tigre", "elefante", "ballena", "delfín", "hormiga", "abeja", "bosque", "desierto", "volcán", "tormenta", "lluvia", "nieve", "hoja", "semilla", "raíz", "fruto", "sombra", "luz", "color", "sonido", "silencio", "memoria", "sueño", "esperanza", "verdad", "miedo", "alegría", "tristeza"],
    mal: ["grande", "pequeño", "rojo", "correr", "rápido", "aquí", "y", "pero", "hermoso", "lentamente", "el", "mi", "tu", "donde", "como", "porque", "siendo", "aunque", "feliz", "azul", "correr", "saltar", "brillante", "oscuro", "siempre", "nunca"],
  },
  adjetivos: {
    ok: ["grande", "pequeño", "hermoso", "rojo", "azul", "verde", "triste", "feliz", "rápido", "lento", "frío", "caliente", "joven", "viejo", "fuerte", "débil", "largo", "corto", "alto", "bajo", "brillante", "oscuro", "suave", "duro", "dulce", "amargo", "lindo", "feo", "limpio", "sucio", "nuevo", "antiguo", "rico", "pobre", "sabio", "tonto", "valiente", "cobarde", "generoso", "egoísta", "tranquilo", "nervioso", "gordo", "delgado", "redondo", "cuadrado", "recto", "torcido", "húmedo", "seco", "pesado", "liviano", "luminoso", "opaco", "silencioso", "ruidoso", "famoso", "desconocido", "simpático", "antipático"],
    mal: ["casa", "gato", "correr", "rápidamente", "el", "la", "y", "pero", "aquí", "cuando", "siendo", "música", "amor", "tiempo", "yo", "tú", "él", "en", "de", "con", "aunque"],
  },
  verbos: {
    ok: ["correr", "comer", "ser", "pensar", "saltar", "leer", "escribir", "hablar", "escuchar", "mirar", "jugar", "dormir", "vivir", "morir", "nacer", "existir", "parecer", "entrar", "salir", "comprar", "vender", "amar", "odiar", "crear", "destruir", "abrir", "cerrar", "seguir", "volar", "nadar", "cantar", "bailar", "reír", "llorar", "gritar", "susurrar", "caminar", "trepar", "caer", "subir", "bajar", "empujar", "jalar", "romper", "construir", "pintar", "dibujar", "cocinar", "limpiar", "estudiar", "enseñar", "aprender", "recordar", "olvidar", "imaginar", "soñar", "sentir", "tocar", "oler", "probar", "ver", "elegir", "decidir", "comenzar", "terminar", "ayudar", "luchar"],
    mal: ["casa", "grande", "rápido", "rápidamente", "el", "mi", "y", "pero", "aquí", "cuando", "hermoso", "triste", "libertad", "yo", "tú", "en", "de", "con", "aunque", "porque"],
  },
  adverbios: {
    ok: ["rápidamente", "lentamente", "bien", "mal", "aquí", "allá", "siempre", "nunca", "ayer", "hoy", "mañana", "ahora", "entonces", "después", "antes", "cerca", "lejos", "arriba", "abajo", "apenas", "casi", "también", "tampoco", "mucho", "poco", "muy", "bastante", "demasiado", "nada", "algo", "acá", "allí", "afuera", "adentro", "adelante", "atrás", "encima", "debajo", "pronto", "tarde", "temprano", "jamás", "quizás", "acaso", "efectivamente", "exactamente", "suavemente", "fuertemente", "fácilmente", "claramente", "verdaderamente", "absolutamente", "completamente", "igualmente", "finalmente"],
    mal: ["casa", "gato", "grande", "correr", "el", "y", "pero", "porque", "hermoso", "libertad", "música", "yo", "tú", "él", "en", "de", "con", "aunque", "siendo"],
  },
  articulos: {
    ok: ["el", "la", "los", "las", "un", "una", "unos", "unas"],
    mal: ["casa", "gato", "grande", "correr", "rápidamente", "aquí", "y", "pero", "mi", "tu", "su", "porque", "hermoso", "yo", "tú", "él", "en", "de", "con", "aunque", "siendo", "este", "ese", "aquel", "siempre", "nunca", "correr", "escribir", "feliz", "triste"],
  },
  pronombres: {
    ok: ["yo", "tú", "él", "ella", "ello", "nosotros", "vosotros", "ellos", "ellas", "me", "te", "se", "nos", "os", "les", "mi", "tu", "su", "nuestro", "vuestro", "quien", "que", "cual", "esto", "eso", "aquello", "alguien", "nadie", "algo", "nada", "cualquiera", "mismo", "propio", "otro", "todo", "ambos", "cada", "varios", "pocos", "muchos", "ninguno", "alguno"],
    mal: ["casa", "gato", "grande", "correr", "rápidamente", "el", "la", "y", "pero", "aquí", "hermoso", "música", "en", "de", "con", "aunque", "porque", "siendo", "feliz", "árbol"],
  },
  preposiciones: {
    ok: ["en", "de", "a", "con", "por", "para", "desde", "hasta", "entre", "sobre", "bajo", "ante", "tras", "según", "sin", "contra", "durante", "hacia", "mediante", "excepto", "salvo", "incluso", "pro", "vía"],
    mal: ["casa", "gato", "grande", "correr", "rápidamente", "yo", "el", "la", "y", "pero", "hermoso", "porque", "aunque", "siendo", "rojo", "azul", "árbol", "siempre"],
  },
  conjunciones: {
    ok: ["y", "o", "pero", "sino", "si", "aunque", "porque", "pues", "luego", "mientras", "cuando", "donde", "como", "entonces", "además", "tampoco", "ni", "ya", "tanto", "bien", "sea", "mas", "que", "ora", "ya que", "así que", "con que", "de modo que", "a menos que", "a fin de que", "siempre que", "a pesar de que", "dado que"],
    mal: ["casa", "gato", "grande", "correr", "rápidamente", "yo", "el", "la", "en", "de", "hermoso", "árbol", "siempre", "nunca", "rojo", "azul", "siendo", "libertad"],
  },
  interjecciones: {
    ok: ["¡ay!", "¡oh!", "¡hola!", "¡adiós!", "¡bravo!", "¡cuidado!", "¡guau!", "¡caramba!", "¡vaya!", "¡eureka!", "¡uf!", "¡oye!", "¡genial!", "¡basta!", "¡ánimo!", "¡auxilio!", "¡ole!", "¡chau!", "¡increíble!", "¡perfecto!", "¡socorro!", "¡silencio!", "¡atención!", "¡hurra!", "¡excelente!", "¡qué bien!"],
    mal: ["casa", "gato", "grande", "correr", "rápidamente", "yo", "el", "en", "y", "pero", "hermoso", "árbol", "siempre", "libertad", "rojo", "azul"],
  },
}

export const CATEGORIAS_VALIDAS = Object.keys(PALABRAS)
