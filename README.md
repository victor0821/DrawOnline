# 🎨 DrawOnline - Pizarra Colaborativa en Tiempo Real

**DrawOnline** es una aplicación web interactiva de dibujo colaborativo multiusuario en tiempo real. Permite que dos o más usuarios dibujen simultáneamente sobre el mismo lienzo, coordinados mediante salas privadas con código de invitación o enlace directo.

---

## 🚀 Características Principales

1. **Colaboración Multiusuario en Tiempo Real:**
   - Transmisión instantánea de trazos punto a punto mediante WebSockets (`Socket.IO`).
   - Visualización de los **cursores de otros colaboradores en vivo** con su nombre y color distintivo flotando sobre el lienzo.
   - Puntero **láser colaborativo** para señalar elementos o realizar presentaciones en tiempo real.

2. **Sistema de Salas con Código y Enlace de Invitación:**
   - **Crear Sala:** Genera un código de sala único (ej. `DRAW-7A9B`).
   - **Unirse a Sala:** Introduce un código existente o accede directamente mediante la URL (ej. `http://localhost:3000/?room=DRAW-7A9B`).
   - Botón de **"Invitar / Copiar enlace"** para compartir con un clic a amigos o colegas.

3. **Herramientas de Dibujo Completas:**
   - ✏️ **Pincel Libre:** Suavizado de trazos con curvas cuadráticas de alta precisión.
   - 🖍️ **Resaltador:** Trazo semitransparente ideal para marcar ideas y bocetos.
   - 🧹 **Borrador:** Elimina trazos con precisión.
   - 📏 **Figuras Geométricas:** Líneas rectas, flechas de dirección, rectángulos y círculos (modo contorno o relleno sólido).
   - 🔤 **Texto en Lienzo:** Inserta texto en cualquier posición del dibujo.
   - 🎨 **Paleta de Colores:** 12 tonos rápidos + selector de color nativo del sistema.
   - 🎚️ **Control de Grosor y Opacidad:** Deslizador dinámico con previsualización de punto.

4. **Gestión de Historial y Estados:**
   - **Deshacer (Undo)** y **Rehacer (Redo)** sincronizados en la sala (`Ctrl+Z`, `Ctrl+Y`).
   - **Limpiar Lienzo:** Con modal de confirmación y advertencia.
   - **Hidratación de Estado Automática:** Si un usuario se une tarde a una sala, recibe de inmediato todo el historial existente para ver el lienzo al día.

5. **Chat y Presencia Integrados:**
   - Panel lateral con pestaña de **Chat en vivo** para conversar mientras dibujan.
   - Lista de artistas conectados con indicador de presencia en tiempo real.
   - Notificaciones del sistema (ej. "Alex se unió", "Monet limpió el lienzo").

6. **Exportación y Descargas:**
   - Descarga como **PNG (Fondo Blanco)**.
   - Descarga como **PNG (Fondo Transparente)** para diseñadores.
   - Descarga en formato **JPEG**.

7. **Soporte HiDPI / Retina y Cuadrícula:**
   - Detección de `devicePixelRatio` para evitar pixelado en pantallas 4K y pantallas Retina.
   - Alternancia de fondos: Cuadrícula de puntos, cuadrícula de líneas o fondo liso.

---

## ⌨️ Atajos de Teclado

| Tecla | Acción |
| :--- | :--- |
| `P` o `B` | Herramienta Pincel |
| `H` | Resaltador |
| `E` | Borrador |
| `L` | Línea recta |
| `A` | Flecha |
| `R` | Rectángulo |
| `C` | Círculo |
| `T` | Texto |
| `K` | Puntero Láser |
| `Ctrl + Z` | Deshacer trazo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Rehacer trazo |

---

## 🛠️ Instalación y Ejecución

### Requisitos
- [Node.js](https://nodejs.org/) (versión 16 o superior)

### 1. Iniciar el servidor
Desde la carpeta raíz del proyecto (`DrawOnline`):

```bash
npm start
```

### 2. Abrir en el navegador
Visita en tu navegador web:
```
http://localhost:3000
```

Para probar la colaboración multiusuario:
- Abre una ventana normal y otra en **modo incógnito** (o en dos navegadores diferentes).
- Crea una sala en la primera ventana y copia el enlace o el código.
- En la segunda ventana, únete con ese código y verás a ambos usuarios dibujando simultáneamente y sus cursores en vivo.

---

## 🧪 Pruebas Automatizadas

El proyecto incluye una suite de pruebas de concurrencia y sockets:
```bash
npm test
```
Verifica la sincronización de presencia, transmisión de trazos, cursores en tiempo real, chat e hidratación de clientes tardíos.
