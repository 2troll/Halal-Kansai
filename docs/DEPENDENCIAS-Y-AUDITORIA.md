# Dependencias: qué llega al móvil y qué no

Revisado el 14/09/2026. Este documento existe para que nadie tenga que volver a
investigar lo mismo cada vez que `npm audit` saque un aviso en rojo.

## El aviso

```
6 vulnerabilities (2 moderate, 4 high)
sharp  →  libvips (CVE-2026-33327/33328/35590/35591), libheif (GHSA-…)
No fix available
```

## Por qué NO afecta a la app publicada

`sharp` no es una dependencia nuestra. Entra de aquí:

```
halal-kansai
└─┬ @huggingface/transformers@4.2.0
  └── sharp@0.34.5
```

transformers.js la usa **solo cuando corre en Node**, para tratar imágenes. La
app usa transformers.js para **Whisper**, dentro de un Web Worker del navegador,
y ahí sharp no interviene. Comprobado, no supuesto:

| Comprobación | Resultado |
|---|---|
| `grep sharp dist/assets/*.js` | no aparece |
| `grep onnxruntime-node dist/assets/*.js` | no aparece |
| `find App.app -iname "*sharp*"` (build real de iPhone) | no aparece |

Es decir: **el código vulnerable no se empaqueta ni se ejecuta en el teléfono de
nadie.** Vive en `node_modules`, en el Mac, durante el build.

## Qué haría falta para que sí importara

- Que el servidor (`server/`) empezara a procesar imágenes con transformers.js
  en Node. Hoy no lo hace.
- Que `sharp` se moviera a una ruta que sí se empaqueta.

Si algún día pasa cualquiera de las dos, esta decisión hay que rehacerla.

## Decisión

No se fuerza `npm audit fix --force`: rompería `@huggingface/transformers`, que
es el motor de la transcripción, a cambio de arreglar algo que no nos alcanza.
Se revisa cuando transformers.js publique una versión que suelte sharp.

El CI no falla por esto a propósito. Lo que sí falla el CI:

- `npm run lint` · `npm test` · `npm run build`
- `npm run version:check` — que Android e iOS estén a la versión de `package.json`

## Versionado

Una sola fuente de verdad: el campo `version` de `package.json`.

```bash
npm run version:sync    # la escribe en Android e iOS
npm run version:check   # falla si no cuadran (lo corre el CI)
```

El número de build se **deriva** del semver, no se lleva a mano:
`major*10000 + minor*100 + patch`. Así `1.0.0` → `10000` y siempre crece al
subir la versión, que es lo que exigen las dos tiendas.
