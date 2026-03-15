# Deploy — Puerta Narvarte

## Lo que tienes que hacer (2 pasos desde el iPad)

---

## PASO 1: Crear el Worker (backend)

1. Abre Safari: **https://dash.cloudflare.com**
2. Inicia sesión
3. En el menú izquierdo: **Workers & Pages** → **Create**
4. Selecciona **"Create Worker"**
5. Nombre: `puerta-narvarte`
6. Clic en **Deploy** (con el código de ejemplo)
7. Clic en **"Edit code"**
8. BORRA todo el código de ejemplo
9. Pega TODO el contenido del archivo `worker-final.js`
10. Clic en **Save and Deploy**

### Agregar variables de entorno:
11. Ve a tu Worker → **Settings** → **Variables and Secrets**
12. Agrega estas variables (usa "Add variable"):

| Variable | Valor |
|---|---|
| `SHELLY_AUTH_KEY` | `M2VhYjAzdWlkD83B85060A77195AE2651037FC777AE31232B17DA24AA54EAF8AD09A3D939278A07EA8B15FA8A9D0` |
| `SHELLY_DEVICE_ID` | `a085e3c9b840` |
| `SHELLY_SERVER` | `shelly-247-eu.shelly.cloud` |
| `ICAL_URL` | `https://www.airbnb.com/calendar/ical/1574837156020290632.ics?t=0c1f056f3ec645619cfa39f465d01004&locale=en` |
| `ACCESS_KEY` | `dh-narv-2026-CAMBIA-ESTO` ← inventa algo largo |
| `CHECKIN_HOUR` | `15` |
| `CHECKOUT_HOUR` | `11` |

13. Clic en **Save and Deploy**

Tu Worker estará en: `https://puerta-narvarte.TU-SUBDOMINIO.workers.dev`

---

## PASO 2: Subir la página web (frontend)

1. En Cloudflare dashboard: **Workers & Pages** → **Create**
2. Selecciona **"Create with Direct Upload"** (no GitHub)
3. Nombre del proyecto: `puerta-defihaus`
4. Sube el archivo `index.html`
5. **ANTES de subir**, edita el archivo y cambia estas 2 líneas:
   - `WORKER_URL` → pon la URL de tu Worker del paso 1
   - `ACCESS_KEY` → la misma clave que pusiste en el Worker
6. Clic en **Deploy**

Tu página estará en: `https://puerta-defihaus.pages.dev`
(puedes agregar un dominio custom después)

---

## PASO 3: Mensaje automático en Airbnb

1. Airbnb → tu anuncio Narvarte → **Mensajes programados**
2. Nuevo mensaje:
   - Trigger: **Antes del check-in, 3 horas**
   - Mensaje:

```
¡Hola!

Bienvenido a tu estancia en Narvarte. Aquí está tu acceso digital:

🔑 https://puerta-defihaus.pages.dev

Toca el link y presiona el botón para abrir la puerta del edificio.
Funciona desde tu check-in hasta el check-out.

¡Que disfrutes tu estancia!
```

3. Activar

---

## Probar

1. Abre `https://puerta-narvarte.TU-SUBDOMINIO.workers.dev/api/status?key=TU-ACCESS-KEY`
   - Si hay reserva activa: verás `{"active":true,"guest":"..."}`
   - Si no: `{"active":false}`

2. Abre `https://puerta-defihaus.pages.dev`
   - Si hay reserva: verás el botón para abrir
   - Si no: "Acceso no disponible"
