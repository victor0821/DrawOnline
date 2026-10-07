/**
 * DrawOnline - Canvas Engine
 * Sistema de Lienzo Virtual Estandarizado (1000x1000 px) para sincronización
 * perfecta entre pantallas de diferentes tamaños, resoluciones y dispositivos.
 */

class DrawingCanvas {
  constructor(mainCanvasId, previewCanvasId, options = {}) {
    this.mainCanvas = document.getElementById(mainCanvasId);
    this.previewCanvas = document.getElementById(previewCanvasId);
    this.mainCtx = this.mainCanvas.getContext('2d', { willReadFrequently: true });
    this.previewCtx = this.previewCanvas.getContext('2d');

    // Resolución virtual fija para todas las salas y dispositivos
    this.VIRTUAL_SIZE = 1000;
    this.width = this.VIRTUAL_SIZE;
    this.height = this.VIRTUAL_SIZE;

    // Fijar resolución interna estandarizada
    this.mainCanvas.width = this.VIRTUAL_SIZE;
    this.mainCanvas.height = this.VIRTUAL_SIZE;
    this.previewCanvas.width = this.VIRTUAL_SIZE;
    this.previewCanvas.height = this.VIRTUAL_SIZE;

    // Tamaño visual mostrado en pantalla (CSS px)
    this.displaySize = 800;

    // Herramienta activa
    this.currentTool = 'bucket'; // bucket, brush, highlighter, eraser, line, arrow, rectangle, circle, text, laser, picker
    this.currentColor = '#EF4444';
    this.currentSize = 8;
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

    // Trazos remotos en vivo
    this.remoteActiveStrokes = new Map();

    // Historial sincronizado de acciones (trazos, figuras, rellenos)
    this.strokes = [];

    // Callbacks de Socket.io
    this.onStrokeStart = options.onStrokeStart || (() => {});
    this.onStrokePoint = options.onStrokePoint || (() => {});
    this.onStrokeComplete = options.onStrokeComplete || (() => {});
    this.onShapeDrawn = options.onShapeDrawn || (() => {});
    this.onFloodFill = options.onFloodFill || (() => {});
    this.onColorPicked = options.onColorPicked || (() => {});

    // Estado de Zoom y Paneo
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.spacePressed = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.onZoomChange = options.onZoomChange || (() => {});

    this.fitBoardToContainer();
    this.setupEventListeners();

    window.addEventListener('resize', () => this.fitBoardToContainer());
  }

  // Métodos de Control de Zoom
  zoomIn() {
    const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
    let nextZoom = zoomLevels.find(z => z > this.zoomLevel);
    if (!nextZoom) nextZoom = Math.min(3.0, this.zoomLevel + 0.25);
    this.setZoom(nextZoom);
  }

  zoomOut() {
    const zoomLevels = [3.0, 2.5, 2.0, 1.5, 1.25, 1.0, 0.75, 0.5];
    let prevZoom = zoomLevels.find(z => z < this.zoomLevel);
    if (!prevZoom) prevZoom = Math.max(0.5, this.zoomLevel - 0.25);
    this.setZoom(prevZoom);
  }

  resetZoom() {
    this.panX = 0;
    this.panY = 0;
    this.setZoom(1.0);
  }

  setZoom(newZoom) {
    this.zoomLevel = Math.round(newZoom * 100) / 100;
    if (this.zoomLevel <= 1.0) {
      this.panX = 0;
      this.panY = 0;
    }
    this.applyTransform();
    this.onZoomChange(this.zoomLevel);
  }

  applyTransform() {
    const board = document.getElementById('canvas-board');
    if (board) {
      board.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    }
  }

  // Ajustar el tablero visual para que quepa proporcionalmente en la pantalla del usuario
  fitBoardToContainer() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const isMobile = window.innerWidth < 640;
    const paddingX = isMobile ? 16 : (window.innerWidth < 1024 ? 80 : 120);
    const paddingY = isMobile ? 16 : 40;

    const maxW = Math.max(260, container.clientWidth - paddingX);
    const maxH = Math.max(260, container.clientHeight - paddingY);
    const displaySize = Math.floor(Math.min(maxW, maxH));

    this.displaySize = displaySize;

    const board = document.getElementById('canvas-board');
    if (board) {
      board.style.width = `${displaySize}px`;
      board.style.height = `${displaySize}px`;
    }

    this.mainCanvas.style.width = `${displaySize}px`;
    this.mainCanvas.style.height = `${displaySize}px`;
    this.previewCanvas.style.width = `${displaySize}px`;
    this.previewCanvas.style.height = `${displaySize}px`;
  }

  // Cargar plantilla en blanco y negro
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

  // Dibujar plantilla estandarizada en el espacio 1000x1000
  drawTemplateToContext(ctx) {
    if (!this.templateImage) return;
    ctx.save();
    ctx.drawImage(this.templateImage, 0, 0, this.VIRTUAL_SIZE, this.VIRTUAL_SIZE);
    ctx.restore();
  }

  // Convertir coordenadas del click/touch a coordenadas virtuales fijas (0 a 1000)
  getPointerCoords(e) {
    const rect = this.mainCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const scale = this.VIRTUAL_SIZE / rect.width;
    const x = (clientX - rect.left) * scale;
    const y = (clientY - rect.top) * scale;

    return {
      x: Math.max(0, Math.min(this.VIRTUAL_SIZE - 1, x)),
      y: Math.max(0, Math.min(this.VIRTUAL_SIZE - 1, y))
    };
  }

  setupEventListeners() {
    const pc = this.previewCanvas;
    const container = document.getElementById('canvas-container');

    // Detección de barra espaciadora para mover/panear el lienzo cuando hay zoom
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space' && !this.spacePressed) {
        this.spacePressed = true;
        if (container) container.style.cursor = 'grab';
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spacePressed = false;
        this.isPanning = false;
        if (container) container.style.cursor = '';
      }
    });

    // Zoom con rueda del ratón (Ctrl + Scroll)
    if (container) {
      container.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.deltaY < 0) {
            this.zoomIn();
          } else {
            this.zoomOut();
          }
        }
      }, { passive: false });
    }

    pc.addEventListener('mousedown', (e) => this.handleStart(e));
    window.addEventListener('mousemove', (e) => this.handleMove(e));
    window.addEventListener('mouseup', (e) => this.handleEnd(e));

    pc.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleStart(e);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.isDrawing || this.isPanning) e.preventDefault();
      this.handleMove(e);
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      this.handleEnd(e);
    });
  }

  // ==========================================
  // MANEJADORES DE ENTRADA (LOCAL)
  // ==========================================

  handleStart(e) {
    // Si se presiona la rueda central o espacio, activar paneo
    if (e.button === 1 || this.spacePressed) {
      this.isPanning = true;
      this.panStartX = e.clientX - this.panX;
      this.panStartY = e.clientY - this.panY;
      const container = document.getElementById('canvas-container');
      if (container) container.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== undefined && e.button !== 0) return;
    if (this.isPanning) return;

    const coords = this.getPointerCoords(e);
    this.startX = coords.x;
    this.startY = coords.y;

    // 1. Bote de Pintura (Flood Fill)
    if (this.currentTool === 'bucket') {
      const filled = this.applyFloodFill(coords.x, coords.y, this.currentColor);
      if (filled) {
        const fillAction = {
          id: 'fill_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
          type: 'floodFill',
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          color: this.currentColor
        };
        this.strokes.push(fillAction);
        this.onFloodFill(fillAction);
      }
      return;
    }

    // 2. Cuentagotas (Picker)
    if (this.currentTool === 'picker') {
      this.pickColorAt(coords.x, coords.y);
      return;
    }

    // 3. Texto
    if (this.currentTool === 'text') {
      this.handleTextInput(coords.x, coords.y);
      return;
    }

    // 4. Láser
    if (this.currentTool === 'laser') {
      this.isDrawing = true;
      return;
    }

    // 5. Trazos y figuras
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
    if (this.isPanning) {
      this.panX = e.clientX - this.panStartX;
      this.panY = e.clientY - this.panStartY;
      this.applyTransform();
      return;
    }

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
      this.previewCtx.clearRect(0, 0, this.VIRTUAL_SIZE, this.VIRTUAL_SIZE);
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
    if (this.isPanning) {
      this.isPanning = false;
      const container = document.getElementById('canvas-container');
      if (container) container.style.cursor = this.spacePressed ? 'grab' : '';
      return;
    }

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
      this.previewCtx.clearRect(0, 0, this.VIRTUAL_SIZE, this.VIRTUAL_SIZE);

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
  // FLOOD FILL (BOTE DE PINTURA SINCRONIZADO)
  // ==========================================

  hexToRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  applyFloodFill(clickX, clickY, fillColorHex) {
    const startX = Math.round(clickX);
    const startY = Math.round(clickY);
    const w = this.VIRTUAL_SIZE;
    const h = this.VIRTUAL_SIZE;

    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return false;

    const imgData = this.mainCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const startIndex = (startY * w + startX) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];

    // Si hace click exactamente sobre una línea negra de contorno, no rellenar
    if (startR < 70 && startG < 70 && startB < 70 && startA > 180) {
      return false;
    }

    const [fillR, fillG, fillB] = this.hexToRgb(fillColorHex);

    // Si el color objetivo ya es igual al color de relleno, salir
    if (Math.abs(startR - fillR) < 8 && Math.abs(startG - fillG) < 8 && Math.abs(startB - fillB) < 8) {
      return false;
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

    this.mainCtx.putImageData(imgData, 0, 0);

    // Reforzar contornos en modo multiply
    if (this.templateImage) {
      this.reinforceTemplateLines();
    }

    return true;
  }

  reinforceTemplateLines() {
    this.mainCtx.save();
    this.mainCtx.globalCompositeOperation = 'multiply';
    this.drawTemplateToContext(this.mainCtx);
    this.mainCtx.restore();
  }

  pickColorAt(clickX, clickY) {
    const px = Math.round(clickX);
    const py = Math.round(clickY);
    const pixel = this.mainCtx.getImageData(px, py, 1, 1).data;

    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const a = pixel[3];

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
      size: Math.max(20, this.currentSize * 3),
      opacity: this.getEffectiveOpacity()
    };

    this.drawText(this.mainCtx, textObj);
    this.strokes.push(textObj);
    this.onShapeDrawn(textObj);
  }

  drawText(ctx, item) {
    ctx.save();
    ctx.globalAlpha = item.opacity || 1.0;
    ctx.fillStyle = item.color;
    ctx.font = `bold ${item.size}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(item.text, item.x, item.y);
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
    ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderSegment(ctx, p1, p2, tool, color, size, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
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

    ctx.save();
    ctx.globalAlpha = opacity || 1.0;
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);

    ctx.stroke();
    ctx.restore();
  }

  drawShape(ctx, tool, x1, y1, x2, y2, color, size, opacity, filled) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (tool === 'arrow') {
      this.drawArrow(ctx, x1, y1, x2, y2, size);
    } else if (tool === 'rectangle') {
      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);
      if (filled) {
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.strokeRect(x, y, w, h);
      }
    } else if (tool === 'circle') {
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      const cx = Math.min(x1, x2) + rx;
      const cy = Math.min(y1, y2) + ry;
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
  // RE-DIBUJADO Y SINCRONIZACIÓN
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
    this.mainCtx.clearRect(0, 0, this.VIRTUAL_SIZE, this.VIRTUAL_SIZE);
    this.previewCtx.clearRect(0, 0, this.VIRTUAL_SIZE, this.VIRTUAL_SIZE);

    // 1. Dibujar plantilla base 1000x1000
    if (this.templateImage) {
      this.drawTemplateToContext(this.mainCtx);
    }

    // 2. Re-aplicar acciones en orden cronológico
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

  // Exportar dibujo en tamaño estándar de alta definición
  exportImage(format = 'image/png', background = 'white') {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.VIRTUAL_SIZE;
    tempCanvas.height = this.VIRTUAL_SIZE;
    const tempCtx = tempCanvas.getContext('2d');

    if (background === 'white') {
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, this.VIRTUAL_SIZE, this.VIRTUAL_SIZE);
    }

    tempCtx.drawImage(this.mainCanvas, 0, 0);

    return tempCanvas.toDataURL(format, 0.95);
  }
}

window.DrawingCanvas = DrawingCanvas;
