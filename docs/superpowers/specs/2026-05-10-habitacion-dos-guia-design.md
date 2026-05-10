# Guia de llegada para habitacion 2

## Contexto

El proyecto ya tiene una guia de check-in para habitacion 1 en `checkin-habitacion-uno.html` y una guia para casa completa en `checkin-casa-completa.html`. El dashboard de `admin.html` elige una guia especial para los listings de casa completa y habitacion 1; el listing principal `habitacion dos` todavia usa el mensaje general.

## Objetivo

Crear una guia de llegada para `habitacion dos` que siga el mismo flujo de la habitacion 1 y que el admin pueda compartir automaticamente con el PIN precargado.

## Alcance

- Crear `checkin-habitacion-dos.html` con el mismo diseno, direccion, validacion de PIN, apertura de puerta y acceso de WhatsApp que la guia de habitacion 1.
- Cambiar los textos especificos para indicar habitacion `#2` y bote de basura `#2`.
- Usar rutas de imagen bajo `/arrival/habitacion-dos/` para las fotos especificas de la habitacion 2.
- Permitir que la pagina siga funcionando aunque falte alguna foto: las imagenes ya usan `onerror="this.hidden=true"`.
- Actualizar `admin.html` para que el listing `habitacion dos` copie el mensaje con `checkin-habitacion-dos.html?pin=...`.

## Fuera de alcance

- Redisenar el layout visual de las guias.
- Cambiar el Worker o la generacion de PINs.
- Agregar un sistema dinamico de plantillas para todas las habitaciones.
- Bloquear la guia hasta tener la foto final de la puerta 2.

## Arquitectura

La guia nueva sera una pagina HTML estatica independiente, consistente con las otras guias existentes. Compartira el mismo endpoint `WORKER_URL` y el mismo flujo de validacion:

1. El usuario abre la guia, normalmente con `?pin=123456`.
2. La pagina precarga el PIN si viene en la URL.
3. El usuario valida el PIN contra `/api/verify`.
4. Si el PIN es valido y esta dentro del horario, aparece el boton para abrir.
5. El boton llama a `/api/open` con el PIN validado.

`admin.html` solo necesita ampliar su seleccion de URL. No debe cambiar el formato general del mensaje ni la logica de reservas.

## Contenido

La guia de habitacion 2 mantiene los pasos comunes:

- Confirmar la entrada correcta `26B`.
- Validar PIN.
- Empujar la puerta cuando suene.
- Subir las escaleras.
- Abrir la caja de seguridad del departamento.
- Identificar llaves.

Los pasos especificos quedan asi:

- Habitacion: `Tu habitacion es la #2`.
- Basura: `Tu bote de basura esta en la cocina y tambien esta marcado con el #2`.
- Ubicacion: usar texto equivalente al de habitacion 1 hasta tener una indicacion mas precisa. La foto de puerta 2 podra reemplazar o complementar el paso de habitacion.

## Imagenes

Las imagenes de habitacion 2 deberian vivir en `arrival/habitacion-dos/`. La foto nueva de la puerta 2 puede guardarse como `07-room.jpg` si reemplaza la foto principal de la habitacion, o como otro nombre coherente si despues se agrega un paso distinto.

Si el archivo no existe al momento de crear la guia, el navegador ocultara la imagen sin romper la pagina.

## Pruebas

- Verificar que `checkin-habitacion-dos.html` carga sin errores locales.
- Verificar que el PIN se precarga desde `?pin=123456`.
- Verificar que `admin.html` genera URL de check-in para `habitacion dos`.
- Confirmar que las rutas de imagen faltantes no dejan iconos rotos visibles.
