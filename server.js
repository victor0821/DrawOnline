const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7 // 10MB para imágenes personalizadas o trazos
});

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Estructura de datos en memoria para salas
// roomId -> { id, createdAt, template, templateName, users: Map, strokes: [], redoStack: [] }
const rooms = new Map();

// Ruta de health-check e información de salas
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId.toUpperCase());
  if (room) {
    res.json({
      exists: true,
      roomId: room.id,
      userCount: room.users.size,
      template: room.template,
      templateName: room.templateName
    });
  } else {
    res.json({ exists: false });
  }
});

// Colores aleatorios para usuarios nuevos si no seleccionan uno
const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', 
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'
];

function getRandomColor() {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

function getOrCreateRoom(roomId, templateId = 'mandala', templateName = 'Mandala Zen') {
  const normalizedId = roomId.trim().toUpperCase();
  if (!rooms.has(normalizedId)) {
    rooms.set(normalizedId, {
      id: normalizedId,
      createdAt: Date.now(),
      template: templateId,
      templateName: templateName,
      users: new Map(),
      strokes: [],      // Historial de trazos y rellenos
      redoStack: []     // Pila para rehacer
    });
  }
  return rooms.get(normalizedId);
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUser = null;

  // Unirse a una sala
  socket.on('join_room', ({ roomId, username, color, template, templateName }) => {
    if (!roomId) return;
    const normRoomId = roomId.trim().toUpperCase();
    currentRoomId = normRoomId;

    const room = getOrCreateRoom(normRoomId, template, templateName);
    socket.join(normRoomId);

    currentUser = {
      id: socket.id,
      username: username ? username.trim().slice(0, 24) : `Artista_${socket.id.slice(0, 4)}`,
      color: color || getRandomColor(),
      cursor: null
    };

    room.users.set(socket.id, currentUser);

    // Enviar el estado actual de la pizarra y la plantilla elegida
    socket.emit('canvas_init', {
      roomId: normRoomId,
      user: currentUser,
      template: room.template,
      templateName: room.templateName,
      strokes: room.strokes,
      canUndo: room.strokes.length > 0,
      canRedo: room.redoStack.length > 0
    });

    // Notificar a toda la sala de la lista de usuarios actualizada
    const usersList = Array.from(room.users.values());
    io.to(normRoomId).emit('room_users', usersList);

    // Anuncio en el chat del sistema
    io.to(normRoomId).emit('system_message', {
      text: `${currentUser.username} se unió a colorear`,
      type: 'join',
      timestamp: Date.now()
    });
  });

  // Cambiar dibujo o plantilla para toda la sala
  socket.on('change_template', ({ template, templateName }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.template = template;
    room.templateName = templateName || 'Dibujo';
    room.strokes = [];
    room.redoStack = [];

    io.to(currentRoomId).emit('template_changed', {
      template: room.template,
      templateName: room.templateName,
      user: currentUser?.username
    });

    io.to(currentRoomId).emit('history_state', {
      canUndo: false,
      canRedo: false
    });

    io.to(currentRoomId).emit('system_message', {
      text: `${currentUser?.username || 'Un usuario'} cambió el dibujo a: "${room.templateName}"`,
      type: 'template',
      timestamp: Date.now()
    });
  });

  // Relleno por inundación (Bote de Pintura / Bucket Fill) colaborativo
  socket.on('flood_fill', (fillData) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const fillAction = {
      id: 'fill_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      type: 'floodFill',
      x: fillData.x,
      y: fillData.y,
      color: fillData.color
    };

    room.strokes.push(fillAction);
    room.redoStack = [];

    socket.to(currentRoomId).emit('flood_fill', fillAction);

    io.to(currentRoomId).emit('history_state', {
      canUndo: room.strokes.length > 0,
      canRedo: false
    });
  });

  // Inicio de trazo en vivo (para streaming de dibujo sin lag)
  socket.on('stroke_start', (data) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('stroke_start', {
      ...data,
      userId: socket.id,
      username: currentUser?.username
    });
  });

  // Punto continuo del trazo en vivo
  socket.on('stroke_point', (data) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('stroke_point', {
      ...data,
      userId: socket.id
    });
  });

  // Fin de trazo completado (se almacena en el historial)
  socket.on('stroke_complete', (stroke) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.strokes.push(stroke);
    room.redoStack = [];

    socket.to(currentRoomId).emit('stroke_complete', stroke);

    io.to(currentRoomId).emit('history_state', {
      canUndo: room.strokes.length > 0,
      canRedo: false
    });
  });

  // Trazos de figuras geométricas / texto
  socket.on('add_shape', (shape) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.strokes.push(shape);
    room.redoStack = [];

    socket.to(currentRoomId).emit('shape_drawn', shape);

    io.to(currentRoomId).emit('history_state', {
      canUndo: room.strokes.length > 0,
      canRedo: false
    });
  });

  // Deshacer trazo / relleno
  socket.on('undo', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.strokes.length === 0) return;

    const undone = room.strokes.pop();
    room.redoStack.push(undone);

    // Sincronizar todo el lienzo en la sala
    io.to(currentRoomId).emit('sync_canvas', {
      strokes: room.strokes,
      action: 'undo',
      user: currentUser?.username
    });

    io.to(currentRoomId).emit('history_state', {
      canUndo: room.strokes.length > 0,
      canRedo: room.redoStack.length > 0
    });
  });

  // Rehacer trazo / relleno
  socket.on('redo', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.redoStack.length === 0) return;

    const redone = room.redoStack.pop();
    room.strokes.push(redone);

    io.to(currentRoomId).emit('sync_canvas', {
      strokes: room.strokes,
      action: 'redo',
      user: currentUser?.username
    });

    io.to(currentRoomId).emit('history_state', {
      canUndo: room.strokes.length > 0,
      canRedo: room.redoStack.length > 0
    });
  });

  // Limpiar colores y trazos del lienzo actual
  socket.on('clear_canvas', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (room.strokes.length > 0) {
      room.redoStack = [...room.strokes];
      room.strokes = [];
    }

    io.to(currentRoomId).emit('canvas_cleared', {
      user: currentUser?.username
    });

    io.to(currentRoomId).emit('history_state', {
      canUndo: false,
      canRedo: room.redoStack.length > 0
    });

    io.to(currentRoomId).emit('system_message', {
      text: `${currentUser?.username || 'Un usuario'} limpió los colores del lienzo`,
      type: 'clear',
      timestamp: Date.now()
    });
  });

  // Movimiento del cursor en tiempo real
  socket.on('cursor_move', (pos) => {
    if (!currentRoomId || !currentUser) return;
    currentUser.cursor = pos;
    socket.to(currentRoomId).emit('cursor_update', {
      userId: socket.id,
      username: currentUser.username,
      color: currentUser.color,
      x: pos.x,
      y: pos.y
    });
  });

  // Cursor fuera del lienzo
  socket.on('cursor_leave', () => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('cursor_remove', { userId: socket.id });
  });

  // Puntero láser temporal
  socket.on('laser_pointer', (data) => {
    if (!currentRoomId || !currentUser) return;
    socket.to(currentRoomId).emit('laser_pointer', {
      ...data,
      userId: socket.id,
      username: currentUser.username,
      color: currentUser.color
    });
  });

  // Chat colaborativo en tiempo real
  socket.on('chat_message', (msg) => {
    if (!currentRoomId || !currentUser || !msg || !msg.text) return;
    const chatData = {
      id: Math.random().toString(36).substring(2, 9),
      userId: socket.id,
      username: currentUser.username,
      color: currentUser.color,
      text: msg.text.trim().slice(0, 300),
      timestamp: Date.now()
    };
    io.to(currentRoomId).emit('chat_message', chatData);
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.users.delete(socket.id);
        socket.to(currentRoomId).emit('cursor_remove', { userId: socket.id });
        socket.to(currentRoomId).emit('room_users', Array.from(room.users.values()));
        socket.to(currentRoomId).emit('system_message', {
          text: `${currentUser?.username || 'Un usuario'} salió de la sala`,
          type: 'leave',
          timestamp: Date.now()
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🎨 DrawOnline Servidor iniciado con éxito!`);
  console.log(`🌐 Accede en: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
