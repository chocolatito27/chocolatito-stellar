/**
 * CAPTURAR CONSUMO REAL DEL MOTOR
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 *
 * La primera versión de la demo llevaba los tokens escritos a mano, como
 * "consumo plausible". Todo lo demás era real —las cuentas, la transacción, la
 * verificación— pero los números de partida no, y eso convertía una demo
 * honesta en una que lo parecía. Quien abriera `demo.ts` lo veía en diez
 * segundos.
 *
 * Esto lo arregla por donde había que arreglarlo: se hacen llamadas de verdad
 * al motor, a través del proxy de Chocolatito, y se guarda el `usage` que
 * devuelve. A partir de ahí la cadena entera es real: tokens reales → coste
 * real → pago real → verificación real.
 *
 * LA LICENCIA NO SE IMPRIME NUNCA
 *
 * Se lee del perfil del usuario y se usa para la cabecera. No se escribe en la
 * salida, ni en el JSON de resultados, ni en ningún log. Lo único que sale de
 * aquí son números de tokens.
 *
 * SOBRE EL DINERO (bases §18)
 *
 * Esto GASTA del margen real del dueño de la licencia, unos céntimos. Es él
 * usando su propio producto como cliente, no el proyecto de la hackathon
 * manejando fondos de terceros: no se modifica el proxy, no se cobra a nadie
 * y no se toca el flujo de ningún cliente.
 *
 *   node --experimental-strip-types guiones/capturar-uso.ts
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DATOS = path.resolve(AQUI, "..", "datos");

const PROXY = "https://chocolatito-proxy.chocolatito.workers.dev/v1/chat/completions";
const MODELO = "deepseek-v4-flash";

/** Lee la licencia del perfil. El valor no sale de esta función. */
async function licencia(): Promise<string> {
  const rc = path.join(os.homedir(), ".chocolatitorc");
  const datos = JSON.parse(await fs.readFile(rc, "utf8")) as { license?: { key?: string } };
  const clave = datos.license?.key;
  if (!clave) {
    throw new Error(
      `No hay licencia en ${rc}. Este guión necesita una licencia activa para pedirle al motor.`
    );
  }
  return clave;
}

interface Mensaje {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface UsoReal {
  etiqueta: string;
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details: { cached_tokens: number };
}

/**
 * Las vueltas de una tarea de agente de verdad.
 *
 * Importa que la conversación CREZCA: en un agente, cada vuelta reenvía todo
 * lo anterior, y eso es lo que hace que la caché empiece a acertar a partir de
 * la segunda. Si se mandaran preguntas sueltas, no habría aciertos de caché y
 * el dato más interesante del medidor desaparecería.
 */
const TAREA: Array<{ etiqueta: string; pide: string }> = [
  { etiqueta: "lee el código del proyecto", pide: "Lee estos archivos y dime en dos frases qué hace el proyecto." },
  { etiqueta: "explica cómo se firma un pago", pide: "¿Dónde y cómo se firma el pago? Cita las funciones." },
  { etiqueta: "revisa la verificación", pide: "¿Qué cuatro comprobaciones hace el verificador y qué fraude tapa cada una?" },
  { etiqueta: "busca huecos", pide: "¿Qué caso NO está cubierto todavía? Sé concreto." },
  { etiqueta: "propone el siguiente paso", pide: "Propón el siguiente paso técnico, en tres líneas." },
];

/**
 * EL CONTEXTO: ARCHIVOS DE VERDAD
 *
 * La primera versión mandaba preguntas sueltas de 100 tokens y la caché no
 * acertaba ni una vez. No era un fallo del medidor: DeepSeek solo cachea
 * prefijos a partir de ~1024 tokens, y por debajo de eso no hay nada que
 * cachear.
 *
 * Pero es que un agente NO manda preguntas sueltas: manda archivos. Leer el
 * código es lo que hace grande el prefijo, y es exactamente la condición en la
 * que este producto trabaja todos los días. Así que se le da a leer el código
 * de verdad de este mismo repositorio.
 */
async function contexto(): Promise<string> {
  const raiz = path.resolve(AQUI, "..");
  const archivos = ["src/cartera.ts", "src/pagos.ts", "src/verificar.ts", "src/medidor.ts", "src/liquidador.ts"];
  const partes: string[] = [];
  for (const a of archivos) {
    partes.push(`--- ${a} ---
${await fs.readFile(path.join(raiz, a), "utf8")}`);
  }
  return partes.join("\n\n");
}

const SISTEMA: Mensaje = {
  role: "system",
  content:
    "Eres Chocolatito, un agente que trabaja sobre los archivos del usuario. " +
    "Respondes en español, breve y concreto.",
};

async function main(): Promise<void> {
  const clave = await licencia();
  const codigo = await contexto();
  const historial: Mensaje[] = [
    SISTEMA,
    // El contexto va en el PRIMER turno y ya no se mueve: eso es lo que
    // convierte el prefijo en cacheable a partir de la segunda vuelta.
    { role: "user", content: `Estos son los archivos del proyecto:

${codigo}` },
    { role: "assistant", content: "Leídos. Dime qué necesitas." },
  ];
  console.log(`Contexto: ${codigo.length} caracteres de código real.`);
  const capturado: UsoReal[] = [];

  console.log("Pidiéndole al motor de verdad, a través del proxy.");
  console.log("Cada vuelta arrastra la conversación anterior, como hace un agente.\n");
  console.log("  vuelta                          entrada   caché   salida");

  for (const paso of TAREA) {
    historial.push({ role: "user", content: paso.pide });

    const res = await fetch(PROXY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
        "X-Chocolatito-Client": "chocolatito-stellar/0.1.0",
        "X-Chocolatito-Route": "loop",
      },
      // Sin `max_tokens`: con un tope, TODAS las respuestas salen cortadas en el
        // mismo número y el dato deja de parecer —y de ser— natural.
        body: JSON.stringify({ model: MODELO, messages: historial }),
    });

    if (!res.ok) {
      const cuerpo = await res.text().catch(() => "");
      // El mensaje del proxy se muestra tal cual: si es "se te acabó la cuota"
      // o "licencia no válida", eso es exactamente lo que hay que leer.
      throw new Error(`El proxy respondió ${res.status}: ${cuerpo.slice(0, 300)}`);
    }

    const datos = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
    };

    const respuesta = datos.choices?.[0]?.message?.content ?? "";
    historial.push({ role: "assistant", content: respuesta });

    const u = datos.usage;
    if (!u?.prompt_tokens) throw new Error("El motor no devolvió `usage`. Sin eso no hay nada que medir.");

    const uso: UsoReal = {
      etiqueta: paso.etiqueta,
      prompt_tokens: u.prompt_tokens,
      completion_tokens: u.completion_tokens ?? 0,
      prompt_tokens_details: { cached_tokens: u.prompt_tokens_details?.cached_tokens ?? 0 },
    };
    capturado.push(uso);
    console.log(
      `  ${paso.etiqueta.padEnd(30)} ${String(uso.prompt_tokens).padStart(6)}  ${String(
        uso.prompt_tokens_details.cached_tokens
      ).padStart(6)}   ${String(uso.completion_tokens).padStart(5)}`
    );
  }

  await fs.mkdir(DATOS, { recursive: true });
  const destino = path.join(DATOS, "uso-real.json");
  await fs.writeFile(
    destino,
    JSON.stringify(
      {
        capturado: new Date().toISOString(),
        modelo: MODELO,
        proxy: PROXY,
        nota: "Tokens devueltos por el motor en llamadas reales. Sin licencias ni claves.",
        vueltas: capturado,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`\nGuardado en ${destino}`);
}

await main();
