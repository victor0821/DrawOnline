# 🎨 DrawOnline - Pizarra y Libro de Colorear Colaborativo en Tiempo Real

**DrawOnline** es una aplicación web interactiva de dibujo y coloreado colaborativo multiusuario en tiempo real. Permite que múltiples personas se conecten simultáneamente a una misma sala privada mediante un código o enlace de invitación para colorear láminas en blanco y negro, dibujar libremente y colaborar con sincronización visual de alta fidelidad.

---

## ✨ Novedades y Actualizaciones Recientes

- 🎯 **Lienzo Virtual Estandarizado (1000×1000 px):** Arquitectura de coordenadas absolutas que resuelve discrepancias entre distintas resoluciones de pantalla (móviles, tablets, portátiles y monitores ultrawide). Cualquier trazo o relleno se plasma exactamente en el mismo píxel para todos los participantes.
- 🪣 **Bote de Pintura y Coloreado Inteligente (Flood Fill):** Algoritmo de relleno por inundación optimizado y sincronizado en tiempo real a través de WebSockets sobre dibujos en blanco y negro.
- 🖼️ **Subida y Sincronización de Imágenes Propias:** Cualquier participante puede subir su propio dibujo (SVG, PNG, JPG) tanto desde el lobby como desde el menú de la sala; la imagen se distribuye al instante a todos los colaboradores para que todos la vean y puedan colorearla juntos.
- 🧹 **Cambio de Dibujo Limpio en Blanco:** Al cambiar de lámina o dibujo, todos los trazos y rellenos del dibujo anterior se resetean automáticamente para comenzar a colorear la nueva plantilla desde cero.
- 🔔 **Notificaciones Sutiles Flotantes:** Alertas no invasivas en tiempo real cuando un participante se une (`👋`), se retira (`🚪`) o envía un mensaje en el chat (`💬`).
- 🖱️ **Selector Dinámico de Color de Cursor:** Selección visual inmediata con aro blanco, icono de checkmark y previsualización de cursor en el perfil.
- 🔍 **Zoom y Paneo Fluido:**
  - Controles flotantes de zoom (`-`, `% actual`, `+`) desde 50% hasta 300%.
  - **Desplazamiento con clic derecho sostenido (`Right-Click Drag`)**: Permite arrastrar y navegar por todo el lienzo con el ratón sin interferencias de menús contextuales para alcanzar esquinas y detalles minuciosos.
  - Zoom dinámico con la rueda del ratón (`Ctrl + Rueda`).
- 🎚️ **Control de Grosor de Pincel Renovado:**
  - Panel flotante (*popover*) con deslizador horizontal amplio (`w-full`) de alta precisión.
  - Botones rápidos de incremento `[+]` y decremento `[-]` de 2 en 2 píxeles.
  - Botones de preajuste de un toque (*presets*): **3px**, **8px**, **16px** y **30px**.
  - Indicador dinámico que refleja el tamaño y color activo en tiempo real.
- 🎨 **Catálogo Extendido de Colores:** Modal con gama clasificada en paletas temáticas (Vivos, Pastel, Tierra/Naturaleza, Neón/Fantasía) + 16 swatches rápidos + selector nativo HTML5.
- 💉 **Herramienta Cuentagotas (Color Picker):** Absorbe cualquier color directamente desde los trazos del lienzo.

---

## 🚀 Características Principales

1. **Colaboración Multiusuario en Tiempo Real:**
   - Transmisión instantánea de trazos y rellenos mediante WebSockets (`Socket.IO`).
   - Visualización de **cursores en vivo** con el nombre y color característico de cada artista.
   - **Puntero láser interactivo** para señalar elementos o coordinar ideas en vivo.

2. **Sistema de Salas con Código y Enlace de Invitación:**
   - **Crear Sala:** Genera un código alfanumérico único (ej. `DRAW-7A9B`).
   - **Unirse a Sala:** Introduce un código existente o accede directamente desde un enlace compartido (ej. `https://mi-dominio.com/?room=DRAW-7A9B`).
   - Botón de **"Invitar / Copiar enlace"** para compartir la sesión en un clic.

3. **Herramientas de Dibujo y Edición:**
   - ✏️ **Pincel Libre:** Suavizado de trazos con curvas cuadráticas.
   - 🪣 **Bote de Pintura:** Relleno de espacios cerrados con tolerancia anti-fugas.
   - 💉 **Cuentagotas:** Captura colores de la pantalla.
   - 🖍️ **Resaltador:** Trazo semitransparente para bocetar.
   - 🧹 **Borrador:** Corrección precisa de trazos.
   - 📏 **Figuras Geométricas:** Líneas rectas, flechas, rectángulos y círculos.
   - 🔤 **Texto:** Inserción de texto en cualquier posición del lienzo.

4. **Historial y Sincronización Automática:**
   - **Deshacer (Undo)** y **Rehacer (Redo)** sincronizados en la sala (`Ctrl+Z`, `Ctrl+Y`).
   - **Limpiar Lienzo:** Modal de confirmación para evitar borrados accidentales.
   - **Hidratación de Estado Automática:** Si un usuario se une tarde, el servidor le envía el dibujo completo y el historial acumulado al instante.

5. **Chat y Gestión de Participantes:**
   - Panel lateral desplegable con **Chat en vivo**.
   - Lista de usuarios activos con insignia de presencia.
   - Mensajes automáticos del sistema (ingresos, salidas, cambios de lámina).

6. **Exportación de Alta Calidad:**
   - Descarga como **PNG (Fondo Blanco)**.
   - Descarga como **PNG (Fondo Transparente)**.
   - Descarga en formato **JPEG**.

---

## ⌨️ Atajos de Teclado y Controles

| Tecla / Acción | Herramienta / Función |
| :--- | :--- |
| `P` o `B` | Pincel Libre |
| `F` | Bote de Pintura (Relleno) |
| `I` | Cuentagotas (Selector de color) |
| `E` | Borrador |
| `H` | Resaltador |
| `L` | Línea Recta |
| `A` | Flecha |
| `R` | Rectángulo |
| `C` | Círculo |
| `T` | Texto |
| `K` | Puntero Láser |
| `Ctrl + Z` | Deshacer trazo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Rehacer trazo |
| **Clic Derecho + Arrastrar** | Paneo / Moverse por el lienzo con zoom |
| **Ctrl + Rueda del Ratón** | Acercar / Alejar Zoom |

---

## 🛠️ Instalación y Ejecución Local

### Requisitos
- [Node.js](https://nodejs.org/) (versión 16 o superior)
- `npm` instalado

### 1. Clonar e Instalar Dependencias
```bash
git clone <url-del-repositorio>
cd DrawOnline
npm install
```

### 2. Iniciar el Servidor
```bash
npm start
```

### 3. Abrir en el Navegador
Abre tu navegador en:
```
http://localhost:3000
```

> **Consejo para probar en local:** Abre una ventana normal y otra en **modo incógnito** (o en navegadores distintos) para simular a dos personas colaborando al mismo tiempo en la misma sala.

---

## ☁️ Despliegue en la Nube (Producción)

DrawOnline está optimizado para funcionar en plataformas como **Render**, **Railway** o **Fly.io**:

1. Sube tu código a GitHub o GitLab.
2. Crea un nuevo **Web Service** en tu plataforma (ej. Render).
3. Configuración del servicio:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. El servidor detectará automáticamente la variable de entorno `process.env.PORT` asignada por la plataforma.

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una suite de pruebas para validar la conexión de WebSockets, sincronización de dibujos, concurrencia de salas y bote de pintura:

```bash
npm test
```
Verifica:
1. Sincronización de plantillas en blanco y negro.
2. Presencia en sala con código de invitación.
3. Coloreado con Bote de Pintura (*Flood Fill*).
4. Cambio dinámico y sincronizado de plantilla.
5. Hidratación de nuevos participantes con historial previo.
