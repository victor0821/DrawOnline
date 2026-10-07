/**
 * DrawOnline - Canvas Engine
 * Manejo de dibujo colaborativo, coloreado con bote de pintura (flood fill),
 * plantillas en blanco y negro y suavizado de curvas.
 */

class DrawingCanvas {
  constructor(mainCanvasId, previewCanvasId, options = {}) {
    this.mainCanvas = document.getElementById(mainCanvasId);
    this.previewCanvas = document.getElementById(previewCanvasId);
    this.mainCtx = this.mainCanvas.getContext('2d', { willReadFrequently: true });
    this.previewCtx = this.previewCanvas.getContext('2d');

    // Herramienta activa por defecto: 'bucket' (Bote de pintura para colorear)
    this.currentTool = 'bucket'; // bucket, brush, highlighter, eraser, line, arrow, rectangle, circle, text, laser, picker
    this.currentColor = '#EF4444';
    this.currentSize = 6;
    this.currentOpacity = 1.0;
    this.fillShapes = false;

    // Plantilla de dibujo actual
    this.templateImage = null;
    this.templateSrc = null;
    this.isTemplateLoaded = false;

    // Estado del trazo local
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.currentPoints = [];
    this.currentStrokeId = null;

    // Trazos en vivo de otros colaboradores
    this.remoteActiveStrokes = new Map();

    // Historial local de acciones (trazos, figuras, flood-fills)
    this.strokes = [];

    // Callbacks de eventos para Socket.io
    this.onStrokeStart = options.onStrokeStart || (() => {});
    this.onStrokePoint = options.onStrokePoint || (() => {});
    this.onStrokeComplete = options.onStrokeComplete || (() => {});
    this.onShapeDrawn = options.onShapeDrawn || (() => {});
    this.onFloodFill = options.onFloodFill || (() => {});
    this.onColorPicked = options.onColorPicked || (() => {});

    this.dpr = window.devicePixelRatio || 1;
    this.initCanvasSize();
    this.setupEventListeners();

    window.addEventListener('resize', () => this.handleResize());
  }

  // Inicializar dimensiones con soporte HiDPI
  initCanvasSize() {
    const container = this.mainCanvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.width = width;
    this.height = height;
    this.dpr = window.devicePixelRatio || 1;

    this.mainCanvas.width = width * this.dpr;
    this.mainCanvas.height = height * this.dpr;
    this.mainCanvas.style.width = `${width}px`;
    this.mainCanvas.style.height = `${height}px`;

    this.previewCanvas.width = width * this.dpr;
    this.previewCanvas.height = height * this.dpr;
    this.previewCanvas.style.width = `${width}px`;
    this.previewCanvas.style.height = `${height}px`;

    this.redrawAll();
  }

  handleResize() {
    const container = this.mainCanvas.parentElement;
    if (this.width !== container.clientWidth || this.height !== container.clientHeight) {
      this.initCanvasSize();
    }
  }

  // Cargar una plantilla en blanco y negro
  loadTemplate(src, callback) {
    this.templateSrc = src;
    if (!src) {
      this.templateImage = null;
      this.isTemplateLoaded = true;
      this.redrawAll();
      if (callback) callback();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.templateImage = img;
      this.isTemplateLoaded = true;
      this.redrawAll();
      if (callback) callback();
    };
    img.onerror = () => {
      console.error('Error al cargar plantilla:', src);
      this.templateImage = null;
      this.isTemplateLoaded = true;
      this.redrawAll();
      if (callback) callback();
    };
    img.src = src;
  }

  // Dibujar la plantilla centrada manteniendo su proporción
  drawTemplateToContext(ctx) {
    if (!this.templateImage) return;

    const canvasW = this.mainCanvas.width;
    const canvasH = this.mainCanvas.height;
    const imgW = this.templateImage.width;
    const imgH = this.templateImage.height;

    // Calcular dimensiones proporcionales (ajustar con margen del 92%)
    const scale = Math.min((canvasW * 0.92) / imgW, (canvasH * 0.92) / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (canvasW - drawW) / 2;
    const drawY = (canvasH - drawH) / 2;

    ctx.save();
    ctx.drawImage(this.templateImage, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // Coordenadas relativas
  getPointerCoords(e) {
    const rect = this.mainCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  setupEventListeners() {
    const pc = this.previewCanvas;

    pc.addEventListener('mousedown', (e) => this.handleStart(e));
    window.addEventListener('mousemove', (e) => this.handleMove(e));
    window.addEventListener('mouseup', (e) => this.handleEnd(e));

    pc.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleStart(e);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.isDrawing) e.preventDefault();
      this.handleMove(e);
    }, { passive: false });

    window.addEventListener('touchend', (e) => this.handleEnd(e));
  }

  // ==========================================
  // MANEJADORES DE ENTRADA (LOCAL)
  // ==========================================

  handleStart(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const coords = this.getPointerCoords(e);
    this.startX = coords.x;
    this.startY = coords.y;

    // 1. Herramienta Bote de Pintura (Flood Fill para colorear)
    if (this.currentTool === 'bucket') {
      this.applyFloodFill(coords.x, coords.y, this.currentColor);
      const fillAction = {
        id: 'fill_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        type: 'floodFill',
        x: Math.round(coords.x),
        y: Math.round(coords.y),
        color: this.currentColor
      };
      this.strokes.push(fillAction);
      this.onFloodFill(fillAction);
      return;
    }

    // 2. Herramienta Cuentagotas / Selector de Color (Picker)
    if (this.currentTool === 'picker') {
      this.pickColorAt(coords.x, coords.y);
      return;
    }

    // 3. Herramienta Texto
    if (this.currentTool === 'text') {
      this.handleTextInput(coords.x, coords.y);
      return;
    }

    // 4. Herramienta Puntero Láser
    if (this.currentTool === 'laser') {
      this.isDrawing = true;
      return;
    }

    // 5. Herramientas de trazo y figuras
    this.isDrawing = true;
    this.currentStrokeId = 's_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

    if (this.isFreehandTool(this.currentTool)) {
      this.currentPoints = [coords];

      this.onStrokeStart({
        strokeId: this.currentStrokeId,
        tool: this.currentTool,
        color: this.currentColor,
        size: this.currentSize,
        opacity: this.getEffectiveOpacity(),
        point: coords
      });

      this.renderPoint(this.mainCtx, coords, this.currentTool, this.currentColor, this.currentSize, this.getEffectiveOpacity());
    }
  }

  handleMove(e) {
    if (!this.isDrawing) return;
    const coords = this.getPointerCoords(e);

    if (this.currentTool === 'laser') return;

    if (this.isFreehandTool(this.currentTool)) {
      const prevPoint = this.currentPoints[this.currentPoints.length - 1];
      this.currentPoints.push(coords);

      this.renderSegment(
        this.mainCtx,
        prevPoint,
        coords,
        this.currentTool,
        this.currentColor,
        this.currentSize,
        this.getEffectiveOpacity()
      );

      this.onStrokePoint({
        strokeId: this.currentStrokeId,
        point: coords
      });
    } else if (['line', 'arrow', 'rectangle', 'circle'].includes(this.currentTool)) {
      this.previewCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
      this.drawShape(
        this.previewCtx,
        this.currentTool,
        this.startX,
        this.startY,
        coords.x,
        coords.y,
        this.currentColor,
        this.currentSize,
        this.getEffectiveOpacity(),
        this.fillShapes
      );
    }
  }

  handleEnd(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    let coords;
    try {
      coords = this.getPointerCoords(e);
    } catch {
      coords = { x: this.startX, y: this.startY };
    }

    if (this.currentTool === 'laser') return;

    if (this.isFreehandTool(this.currentTool)) {
      if (this.currentPoints.length > 0) {
        const strokeObj = {
          id: this.currentStrokeId,
          type: 'path',
          tool: this.currentTool,
          color: this.currentColor,
          size: this.currentSize,
          opacity: this.getEffectiveOpacity(),
          points: this.currentPoints
        };

        this.strokes.push(strokeObj);
        this.onStrokeComplete(strokeObj);
      }
      this.currentPoints = [];
    } else if (['line', 'arrow', 'rectangle', 'circle'].includes(this.currentTool)) {
      this.previewCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

      const dist = Math.hypot(coords.x - this.startX, coords.y - this.startY);
      if (dist > 3) {
        const shapeObj = {
          id: 'shp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
          type: 'shape',
          tool: this.currentTool,
          x1: this.startX,
          y1: this.startY,
          x2: coords.x,
          y2: coords.y,
          color: this.currentColor,
          size: this.currentSize,
          opacity: this.getEffectiveOpacity(),
          filled: this.fillShapes
        };

        this.drawShape(
          this.mainCtx,
          shapeObj.tool,
          shapeObj.x1,
          shapeObj.y1,
          shapeObj.x2,
          shapeObj.y2,
          shapeObj.color,
          shapeObj.size,
          shapeObj.opacity,
          shapeObj.filled
        );

        this.strokes.push(shapeObj);
        this.onShapeDrawn(shapeObj);
      }
    }

    this.currentStrokeId = null;
  }

  // ==========================================
  // FLOOD FILL (BOTE DE PINTURA PARA COLOREAR)
  // ==========================================

  hexToRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  applyFloodFill(clickX, clickY, fillColorHex) {
    const dpr = this.dpr;
    const startX = Math.round(clickX * dpr);
    const startY = Math.round(clickY * dpr);
    const w = this.mainCanvas.width;
    const h = this.mainCanvas.height;

    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    const imgData = this.mainCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const startIndex = (startY * w + startX) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];

    // Si hace click exactamente sobre una línea negra de contorno, no rellenar
    if (startR < 70 && startG < 70 && startB < 70 && startA > 180) {
      return;
    }

    const [fillR, fillG, fillB] = this.hexToRgb(fillColorHex);

    // Si el color objetivo ya es igual al color de relleno, salir
    if (Math.abs(startR - fillR) < 8 && Math.abs(startG - fillG) < 8 && Math.abs(startB - fillB) < 8) {
      return;
    }

    const tolerance = 48; // Tolerancia para cubrir bordes suavizados (antialiasing)

    const isMatch = (idx) => {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Los bordes negros o muy oscuros actúan como muro contenedor
      if (r < 75 && g < 75 && b < 75 && a > 180) {
        return false;
      }

      return (
        Math.abs(r - startR) <= tolerance &&
        Math.abs(g - startG) <= tolerance &&
        Math.abs(b - startB) <= tolerance &&
        Math.abs(a - startA) <= tolerance
      );
    };

    // Algoritmo de inundación optimizado con cola BFS y mapa booleano plano
    const visited = new Uint8Array(w * h);
    const queue = [startX, startY];
    visited[startY * w + startX] = 1;

    let head = 0;
    while (head < queue.length) {
      const cx = queue[head++];
      const cy = queue[head++];
      const cidx = (cy * w + cx) * 4;

      data[cidx] = fillR;
      data[cidx + 1] = fillG;
      data[cidx + 2] = fillB;
      data[cidx + 3] = 255;

      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (let i = 0; i < 4; i++) {
        const nx = neighbors[i][0];
        const ny = neighbors[i][1];
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const vpos = ny * w + nx;
          if (!visited[vpos]) {
            visited[vpos] = 1;
            const nidx = vpos * 4;
            if (isMatch(nidx)) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }

    // Aplicar los nuevos píxeles coloreados
    this.mainCtx.putImageData(imgData, 0, 0);

    // Si hay una plantilla activa, re-dibujar las líneas negras en modo 'multiply' para que
    // los contornos queden siempre 100% nítidos e impecables
    if (this.templateImage) {
      this.reinforceTemplateLines();
    }
  }

  // Reforzar contornos negros de la plantilla por encima de los colores
  reinforceTemplateLines() {
    this.mainCtx.save();
    this.mainCtx.globalCompositeOperation = 'multiply';
    this.drawTemplateToContext(this.mainCtx);
    this.mainCtx.restore();
  }

  // Cuentagotas para absorber color de cualquier punto del dibujo
  pickColorAt(clickX, clickY) {
    const dpr = this.dpr;
    const px = Math.round(clickX * dpr);
    const py = Math.round(clickY * dpr);
    const pixel = this.mainCtx.getImageData(px, py, 1, 1).data;

    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const a = pixel[3];

    // Ignorar si es transparente
    if (a < 50) return;

    const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    this.currentColor = hex;
    this.onColorPicked(hex);
  }

  // ==========================================
  // TEXTO Y FIGURAS
  // ==========================================

  handleTextInput(x, y) {
    const text = prompt('Escribe el texto a colocar en el lienzo:');
    if (!text || !text.trim()) return;

    const textObj = {
      id: 'txt_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      type: 'text',
      text: text.trim(),
      x: x,
      y: y,
      color: this.currentColor,
      size: Math.max(16, this.currentSize * 4),
      opacity: this.getEffectiveOpacity()
    };

    this.drawText(this.mainCtx, textObj);
    this.strokes.push(textObj);
    this.onShapeDrawn(textObj);
  }

  drawText(ctx, item) {
    const dpr = this.dpr;
    ctx.save();
    ctx.globalAlpha = item.opacity || 1.0;
    ctx.fillStyle = item.color;
    ctx.font = `bold ${item.size * dpr}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(item.text, item.x * dpr, item.y * dpr);
    ctx.restore();
  }

  isFreehandTool(tool) {
    return tool === 'brush' || tool === 'highlighter' || tool === 'eraser';
  }

  getEffectiveOpacity() {
    if (this.currentTool === 'highlighter') return 0.35;
    return this.currentOpacity;
  }

  renderPoint(ctx, point, tool, color, size, opacity) {
    const dpr = this.dpr;
    ctx.save();
    ctx.globalAlpha = opacity;
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
    }
    ctx.beginPath();
    ctx.arc(point.x * dpr, point.y * dpr, (size * dpr) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderSegment(ctx, p1, p2, tool, color, size, opacity) {
    const dpr = this.dpr;
    ctx.save();
    ctx.globalAlpha = opacity;
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = size * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(p1.x * dpr, p1.y * dpr);
    ctx.lineTo(p2.x * dpr, p2.y * dpr);
    ctx.stroke();
    ctx.restore();
  }

  renderCompletePath(ctx, stroke) {
    const { points, tool, color, size, opacity } = stroke;
    if (!points || points.length === 0) return;

    if (points.length === 1) {
      this.renderPoint(ctx, points[0], tool, color, size, opacity);
      return;
    }

    const dpr = this.dpr;
    ctx.save();
    ctx.globalAlpha = opacity || 1.0;
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = size * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x * dpr, points[0].y * dpr);

    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x * dpr, points[i].y * dpr, xc * dpr, yc * dpr);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x * dpr, last.y * dpr);

    ctx.stroke();
    ctx.restore();
  }

  drawShape(ctx, tool, x1, y1, x2, y2, color, size, opacity, filled) {
    const dpr = this.dpr;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const sx1 = x1 * dpr;
    const sy1 = y1 * dpr;
    const sx2 = x2 * dpr;
    const sy2 = y2 * dpr;

    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
    } else if (tool === 'arrow') {
      this.drawArrow(ctx, sx1, sy1, sx2, sy2, size * dpr);
    } else if (tool === 'rectangle') {
      const x = Math.min(sx1, sx2);
      const y = Math.min(sy1, sy2);
      const w = Math.abs(sx2 - sx1);
      const h = Math.abs(sy2 - sy1);
      if (filled) {
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.strokeRect(x, y, w, h);
      }
    } else if (tool === 'circle') {
      const rx = Math.abs(sx2 - sx1) / 2;
      const ry = Math.abs(sy2 - sy1) / 2;
      const cx = Math.min(sx1, sx2) + rx;
      const cy = Math.min(sy1, sy2) + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (filled) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawArrow(ctx, fromx, fromy, tox, toy, size) {
    const headlen = Math.max(14, size * 3);
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(
      tox - headlen * Math.cos(angle - Math.PI / 6),
      toy - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      tox - headlen * Math.cos(angle + Math.PI / 6),
      toy - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  // ==========================================
  // MANEJO REMOTO DE COLABORACIÓN
  // ==========================================

  handleRemoteStrokeStart(data) {
    this.remoteActiveStrokes.set(data.strokeId, {
      ...data,
      points: [data.point]
    });
    this.renderPoint(this.mainCtx, data.point, data.tool, data.color, data.size, data.opacity);
  }

  handleRemoteStrokePoint(data) {
    const stroke = this.remoteActiveStrokes.get(data.strokeId);
    if (!stroke) return;

    const prevPoint = stroke.points[stroke.points.length - 1];
    stroke.points.push(data.point);

    this.renderSegment(this.mainCtx, prevPoint, data.point, stroke.tool, stroke.color, stroke.size, stroke.opacity);
  }

  handleRemoteStrokeComplete(stroke) {
    this.remoteActiveStrokes.delete(stroke.id);
    this.strokes.push(stroke);
  }

  handleRemoteShape(shape) {
    if (shape.type === 'text') {
      this.drawText(this.mainCtx, shape);
    } else {
      this.drawShape(
        this.mainCtx,
        shape.tool,
        shape.x1,
        shape.y1,
        shape.x2,
        shape.y2,
        shape.color,
        shape.size,
        shape.opacity,
        shape.filled
      );
    }
    this.strokes.push(shape);
  }

  handleRemoteFloodFill(fillAction) {
    this.applyFloodFill(fillAction.x, fillAction.y, fillAction.color);
    this.strokes.push(fillAction);
  }

  // ==========================================
  // SINCRONIZACIÓN Y RE-DIBUJADO COMPLETO
  // ==========================================

  setStrokes(strokes) {
    this.strokes = [...strokes];
    this.redrawAll();
  }

  clearCanvas() {
    this.strokes = [];
    this.redrawAll();
  }

  redrawAll() {
    this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    // 1. Si hay plantilla activa, dibujarla como lienzo base inicial
    if (this.templateImage) {
      this.drawTemplateToContext(this.mainCtx);
    }

    // 2. Re-aplicar todos los trazos y rellenos en orden histórico
    for (const action of this.strokes) {
      if (action.type === 'floodFill') {
        this.applyFloodFill(action.x, action.y, action.color);
      } else if (action.type === 'path') {
        this.renderCompletePath(this.mainCtx, action);
      } else if (action.type === 'shape') {
        this.drawShape(
          this.mainCtx,
          action.tool,
          action.x1,
          action.y1,
          action.x2,
          action.y2,
          action.color,
          action.size,
          action.opacity,
          action.filled
        );
      } else if (action.type === 'text') {
        this.drawText(this.mainCtx, action);
      }
    }
  }

  // Exportar imagen
  exportImage(format = 'image/png', background = 'white') {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.mainCanvas.width;
    tempCanvas.height = this.mainCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (background === 'white') {
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }

    tempCtx.drawImage(this.mainCanvas, 0, 0);

    return tempCanvas.toDataURL(format, 0.95);
  }
}

window.DrawingCanvas = DrawingCanvas;
