const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const ROOM_CODE = 'COLOR-TEST';

async function runTest() {
  console.log('--- Iniciando prueba de coloreado y colaboración para DrawOnline ---');

  const client1 = io(SERVER_URL);
  const client2 = io(SERVER_URL);

  let step1Passed = false;
  let step2Passed = false;
  let step3Passed = false;
  let step4Passed = false;
  let step5Passed = false;

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    client1.on('connect', check);
    client2.on('connect', check);
  });
  console.log('✔ Clientes 1 y 2 conectados exitosamente a Socket.io');

  // Cliente 1 crea la sala eligiendo el dibujo "dinosaur"
  client1.emit('join_room', {
    roomId: ROOM_CODE,
    username: 'Picasso',
    color: '#EF4444',
    template: 'dinosaur',
    templateName: 'T-Rex Jurásico'
  });

  // Cliente 2 se une mediante el código de la sala
  client2.emit('join_room', {
    roomId: ROOM_CODE,
    username: 'DaVinci',
    color: '#10B981'
  });

  // Verificar que Cliente 2 recibe el dibujo seleccionado por Cliente 1
  client2.on('canvas_init', (data) => {
    if (data.template === 'dinosaur') {
      console.log('✔ Cliente 2 sincronizó la plantilla elegida por la sala: T-Rex Jurásico');
      step1Passed = true;
    }
  });

  // Verificar que Cliente 2 recibe la lista de usuarios
  client2.on('room_users', (users) => {
    if (users.length === 2) {
      console.log(`✔ Lista de usuarios sincronizada: ${users.map(u => u.username).join(', ')}`);
      step2Passed = true;
    }
  });

  // Cliente 2 escucha el relleno con bote de pintura (flood_fill) de Cliente 1
  client2.on('flood_fill', (fillAction) => {
    if (fillAction.color === '#10B981' && fillAction.x === 200 && fillAction.y === 300) {
      console.log('✔ Cliente 2 recibió el relleno por inundación (bote de pintura) en tiempo real');
      step3Passed = true;
    }
  });

  // Cliente 2 escucha cambio de dibujo
  client2.on('template_changed', (data) => {
    if (data.template === 'rocket') {
      console.log('✔ Cliente 2 recibió el cambio de dibujo a "rocket" sincronizado en la sala');
      step4Passed = true;
    }
  });

  // Emitir eventos después de unirse
  setTimeout(() => {
    // Cliente 1 usa bote de pintura para colorear un espacio en blanco
    client1.emit('flood_fill', {
      x: 200,
      y: 300,
      color: '#10B981'
    });
  }, 400);

  // Cliente 1 cambia de plantilla a "rocket"
  setTimeout(() => {
    client1.emit('change_template', {
      template: 'rocket',
      templateName: 'Cohete Galáctico'
    });
  }, 700);

  // Cliente 3 se conecta más tarde para verificar la persistencia y sincronización del estado
  setTimeout(() => {
    const client3 = io(SERVER_URL);
    client3.on('connect', () => {
      client3.emit('join_room', {
        roomId: ROOM_CODE,
        username: 'Monet',
        color: '#3B82F6'
      });
    });

    client3.on('canvas_init', (data) => {
      if (data.template === 'rocket') {
        console.log('✔ Cliente 3 recibió la plantilla actual ("rocket") al unirse tarde con el código');
        step5Passed = true;
      }

      console.log('\n--- Resumen de pruebas: ---');
      console.log('1. Sincronización de plantilla en blanco y negro:', step1Passed ? 'PASÓ' : 'FALLÓ');
      console.log('2. Presencia en sala con código de invitación:', step2Passed ? 'PASÓ' : 'FALLÓ');
      console.log('3. Coloreado con Bote de Pintura (Flood Fill):', step3Passed ? 'PASÓ' : 'FALLÓ');
      console.log('4. Cambio sincronizado de plantilla:', step4Passed ? 'PASÓ' : 'FALLÓ');
      console.log('5. Hidratación de nuevo participante por código:', step5Passed ? 'PASÓ' : 'FALLÓ');

      client1.disconnect();
      client2.disconnect();
      client3.disconnect();
      process.exit(0);
    });
  }, 1100);
}

runTest();
