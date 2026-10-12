const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const ROOM_CODE = 'CUSTOM-TEST-' + Date.now();

async function testNewFeatures() {
  console.log('--- Probando nuevas características (Imágenes personalizadas, limpieza de trazos y notificaciones) ---');

  const client1 = io(SERVER_URL);
  const client2 = io(SERVER_URL);

  let customTemplateReceived = false;
  let strokesClearedOnTemplateChange = false;
  let joinNotificationReceived = false;
  let chatNotificationReceived = false;

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    client1.on('connect', check);
    client2.on('connect', check);
  });
  console.log('✔ Clientes 1 y 2 conectados');

  // Cliente 1 se une con una imagen personalizada subida (base64)
  const fakeCustomSrc = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==';
  
  client1.emit('join_room', {
    roomId: ROOM_CODE,
    username: 'Picasso',
    color: '#EF4444',
    template: 'custom_12345',
    templateName: 'Mi Dibujo Subido',
    templateSrc: fakeCustomSrc
  });

  // Cliente 2 escucha si recibe join de cliente 1 o se une
  client2.on('system_message', (msg) => {
    if (msg.type === 'join' && msg.user) {
      joinNotificationReceived = true;
      console.log(`✔ Cliente 2 recibió notificación sutil de ingreso: ${msg.user} con color ${msg.color}`);
    }
  });

  // Cliente 2 se une
  setTimeout(() => {
    client2.emit('join_room', {
      roomId: ROOM_CODE,
      username: 'DaVinci',
      color: '#10B981'
    });
  }, 100);

  // Cliente 2 debe recibir la imagen personalizada que Cliente 1 subió
  client2.on('canvas_init', (data) => {
    if (data.template === 'custom_12345' && data.templateSrc === fakeCustomSrc) {
      customTemplateReceived = true;
      console.log('✔ Cliente 2 recibió la imagen adjunta personalizada por Cliente 1 con su templateSrc completo');
    }
  });

  // Cliente 2 escucha mensaje de chat
  client2.on('chat_message', (msg) => {
    if (msg.username === 'Picasso' && msg.text === '¡Hola, mira este dibujo!') {
      chatNotificationReceived = true;
      console.log(`✔ Cliente 2 recibió mensaje de chat con datos de usuario: "${msg.text}" de ${msg.username}`);
    }
  });

  // Cliente 2 escucha cambio de dibujo
  client2.on('template_changed', (data) => {
    if (data.template === 'mandala') {
      console.log('✔ Cliente 2 recibió el cambio de dibujo a Mandala');
    }
  });

  client2.on('history_state', (state) => {
    if (state.canUndo === false && state.canRedo === false) {
      strokesClearedOnTemplateChange = true;
      console.log('✔ El historial y trazos se restablecieron a cero (lienzo en blanco) al cambiar de dibujo');
    }
  });

  // Cliente 1 manda trazo
  setTimeout(() => {
    client1.emit('flood_fill', { x: 50, y: 50, color: '#EF4444' });
    client1.emit('chat_message', { text: '¡Hola, mira este dibujo!' });
  }, 300);

  // Cliente 1 cambia de dibujo
  setTimeout(() => {
    client1.emit('change_template', {
      template: 'mandala',
      templateName: 'Mandala Zen',
      templateSrc: null
    });
  }, 600);

  setTimeout(() => {
    console.log('\n--- Resultado de Verificación de Requerimientos ---');
    console.log('1. Imagen adjuntada visible y sincronizada para todos:', customTemplateReceived ? 'PASÓ' : 'FALLÓ');
    console.log('2. Colores del dibujo anterior eliminados al cambiar (en blanco):', strokesClearedOnTemplateChange ? 'PASÓ' : 'FALLÓ');
    console.log('3. Notificación de usuario al unirse/salir:', joinNotificationReceived ? 'PASÓ' : 'FALLÓ');
    console.log('4. Notificación y sincronización de mensajes de chat:', chatNotificationReceived ? 'PASÓ' : 'FALLÓ');

    client1.disconnect();
    client2.disconnect();
    process.exit((customTemplateReceived && strokesClearedOnTemplateChange && joinNotificationReceived && chatNotificationReceived) ? 0 : 1);
  }, 1000);
}

testNewFeatures();
