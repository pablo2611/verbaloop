# VerbaLoop

Herramienta gamificada para practicar vocabulario industrial y términos de producto en pequeñas sesiones diarias. El dashboard incluye retos de **Revuelto**, **Definiciones** y **Completa**, dificultades, pistas y revelación de respuestas, glosario personalizable, progreso, rachas y clasificación de equipos.

**Vera** es la guía de aprendizaje de VerbaLoop. Puede explicar cómo usar la web y ofrecer pistas o aclaraciones educativas sobre el reto actual. Su alcance se limita mediante instrucciones del servidor, validación y una comprobación temática básica; Vera no está afinada con un entrenamiento propio. El glosario empresarial no se envía automáticamente: solo se transmite el término activo y la conversación reciente que la persona envía.

## Tecnología

- React, TypeScript y Vite
- Node.js, Express y tRPC
- Groq Chat Completions con `openai/gpt-oss-20b`
- Vitest

## Desarrollo

Requiere Node.js 22 y pnpm. Instala dependencias y ejecuta las comprobaciones habituales:

```bash
pnpm install
pnpm dev
pnpm test
pnpm check
pnpm build
```

El backend necesita la configuración propia del entorno de despliegue (OAuth y, si se habilitan funciones persistentes, base de datos). Para que Vera responda, configura `GROQ_API_KEY` en el gestor de secretos del servidor. **No añadas la llave al código, al cliente web, a archivos versionados, a issues ni a mensajes.** Si una llave se expone, revócala y crea otra desde [Groq Console](https://console.groq.com/keys).

La cuota disponible depende del modelo y del plan del proveedor. Comprueba los límites de tu cuenta; el repositorio no activa facturación ni cambia el plan por ti.

La prueba de credenciales realiza una petición GET de solo lectura a la lista de modelos y se omite automáticamente si `GROQ_API_KEY` no está presente:

```bash
pnpm exec vitest run server/groqCredential.live.test.ts
```

## Privacidad y seguridad

- La credencial de Groq se utiliza únicamente desde el backend; nunca se incorpora al bundle de Vite.
- El chat se mantiene en estado de página y no guarda automáticamente su historial en una base de datos.
- El aviso del chat informa que el mensaje, la conversación reciente y el término activo se procesan con Groq. No introduzcas información personal ni confidencial.
- Las restricciones temáticas ayudan a enfocar las respuestas, pero no constituyen una garantía absoluta contra contenido no deseado. Revisa las respuestas de un modelo externo antes de usarlas en contextos críticos.

## Autoría

Desarrollado por **Pablo Sánchez**.
