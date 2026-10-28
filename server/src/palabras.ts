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
  malCerca?: string[]
}

export const PALABRAS: Record<string, CategoriaPalabras> = {
  sustantivos: {
    ok: ["casa", "gato", "libertad", "niño", "planeta", "música", "árbol", "mar", "libro", "amor", "tiempo", "escuela", "perro", "puerta", "ventana", "mesa", "silla", "cama", "ciudad", "río", "montaña", "flor", "cielo", "nube", "viento", "fuego", "agua", "tierra", "sol", "luna", "camino", "jardín", "piedra", "barco", "puente", "pájaro", "mariposa", "estrella", "serpiente", "tigre", "elefante", "ballena", "delfín", "hormiga", "abeja", "bosque", "desierto", "volcán", "tormenta", "lluvia", "nieve", "hoja", "semilla", "raíz", "fruto", "sombra", "luz", "color", "sonido", "silencio", "memoria", "sueño", "esperanza", "verdad", "miedo", "alegría", "tristeza"],
    mal: ["grande", "pequeño", "correr", "y", "hermoso", "lentamente", "el", "mi", "tu", "donde", "porque", "aunque", "feliz", "siempre", "famoso", "escribiré", "sentir", "romper", "saltaron", "leer", "tampoco", "ver", "pronto", "bailar", "ayudar", "dormir", "comimos", "cantan", "destruir", "olvidar", "tirar", "casi", "pesado", "saltar", "ayer", "lindo", "opaco", "redondo", "existir", "delgado", "subir", "luminoso", "nunca", "escribir", "sucio", "seguir", "torcido", "allá", "adelante", "terminar", "salir", "empujar", "oler", "luchar", "gritar", "jugar", "gordo", "ahora", "aquí", "reír", "caer"],
    malCerca: ["famoso", "escribiré", "sentir", "romper", "saltaron", "leer", "tampoco", "ver", "pronto", "bailar", "ayudar", "dormir", "comimos", "cantan", "destruir", "olvidar", "tirar", "casi", "pesado", "saltar", "ayer", "lindo", "opaco", "redondo", "existir", "delgado", "subir", "luminoso", "nunca", "escribir", "sucio", "seguir", "torcido", "allá", "adelante", "terminar", "salir", "empujar", "oler", "luchar", "gritar", "jugar", "gordo", "ahora", "aquí", "reír", "caer"],
  },
  adjetivos: {
    ok: ["grande", "pequeño", "hermoso", "rojo", "azul", "verde", "triste", "feliz", "rápido", "lento", "frío", "caliente", "joven", "viejo", "fuerte", "débil", "largo", "corto", "alto", "bajo", "brillante", "oscuro", "suave", "duro", "dulce", "amargo", "lindo", "feo", "limpio", "sucio", "nuevo", "antiguo", "rico", "pobre", "sabio", "tonto", "valiente", "cobarde", "generoso", "egoísta", "tranquilo", "nervioso", "gordo", "delgado", "redondo", "cuadrado", "recto", "torcido", "húmedo", "seco", "pesado", "liviano", "luminoso", "opaco", "silencioso", "ruidoso", "famoso", "desconocido", "simpático", "antipático"],
    mal: ["rápidamente", "el", "y", "música", "amor", "tiempo", "yo", "tú", "él", "en", "de", "con", "aunque", "aquí", "demasiado", "cocinar", "destruir", "salir", "limpiar", "escribiré", "ayer", "reír", "mariposa", "dormirá", "aprender", "esperanza", "mar", "miedo", "correr", "escuela", "miraste", "gato", "soñar", "niño", "cielo", "acaso", "bailando", "estudiar", "siempre", "montaña", "existir", "casi", "suavemente", "silla", "perro", "abrir", "atrás", "dibujar", "bailar", "nadar", "encima", "bajar", "barco", "debajo", "nunca"],
    malCerca: ["aquí", "demasiado", "cocinar", "destruir", "salir", "limpiar", "escribiré", "ayer", "reír", "mariposa", "dormirá", "aprender", "esperanza", "mar", "miedo", "correr", "escuela", "miraste", "gato", "soñar", "niño", "cielo", "acaso", "bailando", "estudiar", "siempre", "montaña", "existir", "casi", "suavemente", "silla", "perro", "abrir", "atrás", "dibujar", "bailar", "nadar", "encima", "bajar", "barco", "debajo", "nunca"],
  },
  verbos: {
    ok: ["correr", "comer", "ser", "pensar", "saltar", "leer", "escribir", "hablar", "escuchar", "mirar", "jugar", "dormir", "vivir", "morir", "nacer", "existir", "parecer", "entrar", "salir", "comprar", "vender", "amar", "odiar", "crear", "destruir", "abrir", "cerrar", "seguir", "volar", "nadar", "cantar", "bailar", "reír", "llorar", "gritar", "susurrar", "caminar", "trepar", "caer", "subir", "bajar", "empujar", "tirar", "romper", "construir", "pintar", "dibujar", "cocinar", "limpiar", "estudiar", "enseñar", "aprender", "recordar", "olvidar", "imaginar", "soñar", "sentir", "tocar", "oler", "probar", "ver", "elegir", "decidir", "comenzar", "terminar", "ayudar", "luchar", "corrió", "comimos", "escribiré", "hablábamos", "saltaron", "leyendo", "bailando", "vivían", "dormirá", "miraste", "jugaba", "cantan"],
    mal: ["rápidamente", "el", "mi", "y", "triste", "libertad", "yo", "tú", "en", "de", "con", "aunque", "porque", "barco", "claramente", "allí", "demasiado", "famoso", "pájaro", "adelante", "húmedo", "niño", "puerta", "miedo", "caliente", "adentro", "hermoso", "delfín", "antiguo", "feliz", "luna", "río", "ahora", "fuego", "montaña", "lluvia", "valiente", "gato", "delgado", "nuevo", "semilla", "generoso", "amargo", "jamás", "abeja", "alegría", "música", "piedra", "liviano", "grande", "pronto", "siempre", "encima", "silla", "ventana", "puente", "aquí", "viento", "débil", "luminoso", "tigre", "gordo", "mariposa", "bosque", "tormenta", "esperanza", "sucio", "verdad"],
    malCerca: ["barco", "claramente", "allí", "demasiado", "famoso", "pájaro", "adelante", "húmedo", "niño", "puerta", "miedo", "caliente", "adentro", "hermoso", "delfín", "antiguo", "feliz", "luna", "río", "ahora", "fuego", "montaña", "lluvia", "valiente", "gato", "delgado", "nuevo", "semilla", "generoso", "amargo", "jamás", "abeja", "alegría", "música", "piedra", "liviano", "grande", "pronto", "siempre", "encima", "silla", "ventana", "puente", "aquí", "viento", "débil", "luminoso", "tigre", "gordo", "mariposa", "bosque", "tormenta", "esperanza", "sucio", "verdad"],
  },
  adverbios: {
    ok: ["rápidamente", "lentamente", "bien", "mal", "aquí", "allá", "siempre", "nunca", "ayer", "hoy", "mañana", "ahora", "entonces", "después", "antes", "cerca", "lejos", "arriba", "abajo", "apenas", "casi", "también", "tampoco", "mucho", "poco", "muy", "bastante", "demasiado", "nada", "algo", "acá", "allí", "afuera", "adentro", "adelante", "atrás", "encima", "debajo", "pronto", "tarde", "temprano", "jamás", "quizás", "acaso", "efectivamente", "exactamente", "suavemente", "fuertemente", "fácilmente", "claramente", "verdaderamente", "absolutamente", "completamente", "igualmente", "finalmente"],
    mal: ["gato", "grande", "correr", "el", "y", "libertad", "música", "yo", "tú", "él", "en", "de", "feo", "pequeño", "silencioso", "hermoso", "opaco", "sucio", "mediante", "liviano", "desde", "con", "triste", "lindo", "tras", "antipático", "suave", "ante", "porque", "mientras", "simpático", "nervioso", "generoso", "entre", "delgado", "pro", "sin", "corto", "luminoso", "caliente", "gordo", "conque", "valiente", "durante", "redondo", "pesado", "hacia", "amargo", "famoso", "ruidoso", "aunque"],
    malCerca: ["feo", "pequeño", "silencioso", "hermoso", "opaco", "sucio", "mediante", "liviano", "desde", "con", "triste", "lindo", "tras", "antipático", "suave", "ante", "porque", "mientras", "simpático", "nervioso", "generoso", "entre", "delgado", "pro", "sin", "corto", "luminoso", "caliente", "gordo", "conque", "valiente", "durante", "redondo", "pesado", "hacia", "amargo", "famoso", "ruidoso", "aunque"],
  },
  articulos: {
    ok: ["el", "la", "los", "las", "un", "una", "unos", "unas"],
    mal: ["gato", "grande", "correr", "rápidamente", "aquí", "y", "mi", "tu", "su", "porque", "hermoso", "yo", "tú", "en", "de", "con", "aunque", "siempre", "nunca", "escribir", "feliz", "triste", "tras", "ella", "por", "nos", "le", "les", "él", "me"],
    malCerca: ["tras", "ella", "por", "nos", "le", "les", "él", "me"],
  },
  pronombres: {
    ok: ["yo", "tú", "él", "ella", "ello", "nosotros", "vosotros", "ellos", "ellas", "me", "te", "se", "nos", "os", "les", "quien", "que", "cual", "esto", "eso", "aquello", "alguien", "nadie", "algo", "nada", "cualquiera", "mismo", "otro", "todo", "ambos", "varios", "pocos", "muchos", "ninguno", "alguno", "vos", "usted", "ustedes", "lo", "le"],
    mal: ["grande", "correr", "rápidamente", "y", "hermoso", "música", "en", "de", "con", "aunque", "porque", "feliz", "árbol", "mi", "tu", "su", "cada", "flor", "un", "sol", "aquí", "muy", "igualmente", "tierra", "perro", "el", "silla", "unos", "tampoco", "gato", "adelante", "fuego", "tristeza", "abeja", "acá", "luz", "una", "ventana", "encima", "hoja", "hoy", "niño", "memoria", "allí", "pronto"],
    malCerca: ["flor", "un", "sol", "aquí", "muy", "igualmente", "tierra", "perro", "el", "silla", "unos", "tampoco", "gato", "adelante", "fuego", "tristeza", "abeja", "acá", "luz", "una", "ventana", "encima", "hoja", "hoy", "niño", "memoria", "allí", "pronto"],
  },
  preposiciones: {
    ok: ["en", "de", "a", "con", "por", "para", "desde", "hasta", "entre", "sobre", "bajo", "ante", "tras", "según", "sin", "contra", "durante", "hacia", "mediante", "excepto", "salvo", "incluso", "pro", "vía"],
    mal: ["gato", "grande", "correr", "rápidamente", "yo", "hermoso", "porque", "aunque", "árbol", "siempre", "allí", "ahora", "atrás", "afuera", "acaso", "temprano", "muy", "acá", "también", "unos", "el", "una", "casi", "o", "jamás", "nunca", "adentro", "pronto", "hoy", "aquí", "un", "tampoco", "y", "quizás"],
    malCerca: ["allí", "ahora", "atrás", "afuera", "acaso", "temprano", "muy", "acá", "también", "unos", "el", "una", "casi", "o", "jamás", "nunca", "adentro", "pronto", "hoy", "aquí", "un", "tampoco", "y", "quizás"],
  },
  conjunciones: {
    ok: ["y", "o", "pero", "sino", "si", "aunque", "porque", "pues", "luego", "mientras", "cuando", "como", "entonces", "ni", "ya", "bien", "mas", "que", "ya que", "así que", "conque", "de modo que", "a menos que", "a fin de que", "siempre que", "a pesar de que", "dado que"],
    mal: ["gato", "grande", "correr", "rápidamente", "yo", "el", "de", "hermoso", "árbol", "siempre", "nunca", "libertad", "temprano", "debajo", "a", "acá", "esto", "pronto", "casi", "jamás", "mediante", "tras", "ello", "en", "aquí", "por", "quizás", "te", "le", "afuera", "se"],
    malCerca: ["temprano", "debajo", "a", "acá", "esto", "pronto", "casi", "jamás", "mediante", "tras", "ello", "en", "aquí", "por", "quizás", "te", "le", "afuera", "se"],
  },
  interjecciones: {
    ok: ["¡ay!", "¡oh!", "¡hola!", "¡adiós!", "¡bravo!", "¡cuidado!", "¡guau!", "¡caramba!", "¡vaya!", "¡eureka!", "¡uf!", "¡oye!", "¡genial!", "¡basta!", "¡ánimo!", "¡auxilio!", "¡ole!", "¡chau!", "¡increíble!", "¡perfecto!", "¡socorro!", "¡silencio!", "¡atención!", "¡hurra!", "¡excelente!", "¡qué bien!"],
    mal: ["gato", "grande", "correr", "yo", "el", "en", "y", "hermoso", "árbol", "libertad", "siempre", "generoso", "feliz", "flor", "allí", "igualmente", "silencioso", "quizás", "simpático", "fuertemente", "demasiado", "famoso", "opaco", "rápidamente", "montaña", "elefante", "tierra", "esperanza", "ventana", "antiguo", "antipático", "adentro", "amor", "serpiente"],
    malCerca: ["siempre", "generoso", "feliz", "flor", "allí", "igualmente", "silencioso", "quizás", "simpático", "fuertemente", "demasiado", "famoso", "opaco", "rápidamente", "montaña", "elefante", "tierra", "esperanza", "ventana", "antiguo", "antipático", "adentro", "amor", "serpiente"],
  },
}

export const CATEGORIAS_VALIDAS = Object.keys(PALABRAS)
