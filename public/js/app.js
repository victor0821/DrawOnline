/**
 * DrawOnline - App Controller
 * Orquestador de salas, catálogo de dibujos en blanco y negro,
 * gama completa de colores, bote de pintura colaborativo y WebSockets.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  const socket = io();

  // Gama Completa de Colores Organizada por Categorías
  const COLOR_PALETTES = {
    vivos: [
      '#EF4444', '#DC2626', '#B91C1C', '#F97316', '#EA580C', '#C2410C',
      '#F59E0B', '#D97706', '#EAB308', '#84CC16', '#65A30D', '#10B981',
      '#059669', '#06B6D4', '#0891B2', '#0284C7', '#2563EB', '#1D4ED8',
      '#4F46E5', '#4338CA', '#7C3AED', '#6D28D9', '#9333EA', '#7E22CE',
      '#C026D3', '#A21CAF', '#DB2777', '#BE185D', '#E11D48', '#BE123C'
    ],
    pasteles: [
      '#FECACA', '#FCA5A5', '#FED7AA', '#FDBA74', '#FEF08A', '#FDE047',
      '#D9F99D', '#BEF264', '#A7F3D0', '#6EE7B7', '#BAE6FD', '#7DD3FC',
      '#C7D2FE', '#A5B4FC', '#DDD6FE', '#C4B5FD', '#F5D0FE', '#E879F9',
      '#FBCFE8', '#F472B6', '#FFE4E6', '#FDA4AF', '#FFF1F2', '#FCE7F3'
    ],
    naturaleza: [
      '#14532D', '#166534', '#15803D', '#16A34A', '#365314', '#3F6212',
      '#4D7C0F', '#65A30D', '#713F12', '#854D0E', '#A16207', '#CA8A04',
      '#451A03', '#78350F', '#92400E', '#B45309', '#292524', '#44403C',
      '#57534E', '#78716C', '#134E4A', '#115E59', '#0F766E', '#14B8A6'
    ],
    piel: [
      '#FFF5EB', '#FFE8D6', '#FDD9B5', '#F5CCA0', '#EEC39A', '#E0A96D',
      '#D49B6A', '#C68642', '#B87333', '#A0522D', '#8D5524', '#704214',
      '#5C3317', '#4A2A11', '#3B1E08', '#2C1605'
    ],
    monocromo: [
      '#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8',
      '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617',
      '#000000'
    ]
  };

  // 16 Colores Rápidos para la barra de herramientas
  const QUICK_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981',
    '#06B6D4', '#2563EB', '#4F46E5', '#9333EA',
    '#EC4899', '#84CC16', '#8D5524', '#FDE047',
    '#A7F3D0', '#7DD3FC', '#000000', '#FFFFFF'
  ];

  // Estado
  let currentRoomId = null;
  let currentUser = {
    username: '',
    color: '#6366F1'
  };
  let selectedTemplate = window.COLORING_TEMPLATES ? window.COLORING_TEMPLATES[0] : null;
  let customTemplates = [];
  let isChatOpen = false;
  let unreadMessages = 0;
  let currentPaletteCategory = 'vivos';
  let tempSelectedColor = '#EF4444';

  // Elementos DOM
  const lobbyModal = document.getElementById('lobby-modal');
  const inputUsername = document.getElementById('input-username');
  const inputRoomCode = document.getElementById('input-room-code');
  const tabBtnCreate = document.getElementById('tab-btn-create');
  const tabBtnJoin = document.getElementById('tab-btn-join');
  const viewCreateRoom = document.getElementById('view-create-room');
  const viewJoinRoom = document.getElementById('view-join-room');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnJoinRoom = document.getElementById('btn-join-room');
  const currentRoomBadge = document.getElementById('current-room-badge');
  const btnCopyInvite = document.getElementById('btn-copy-invite');
  const usersAvatarGroup = document.getElementById('users-avatar-group');
  const usersCountBadge = document.getElementById('users-count-badge');
  const btnOpenExport = document.getElementById('btn-open-export');
  const btnToggleChat = document.getElementById('btn-toggle-chat');
  const chatUnreadBadge = document.getElementById('chat-unread-badge');
  const btnLeaveRoom = document.getElementById('btn-leave-room');
  const canvasContainer = document.getElementById('canvas-container');
  const cursorsLayer = document.getElementById('cursors-layer');
  const templatesGalleryGrid = document.getElementById('templates-gallery-grid');
  const selectedTemplateLabel = document.getElementById('selected-template-label');
  const inputUploadTemplate = document.getElementById('input-upload-template');
  const headerTemplateIcon = document.getElementById('header-template-icon');
  const headerTemplateName = document.getElementById('header-template-name');
  const btnOpenChangeTemplate = document.getElementById('btn-open-change-template');

  // Herramientas y Paleta
  const toolButtons = document.querySelectorAll('.tool-btn');
  const activeColorIndicator = document.getElementById('active-color-indicator');
  const quickSwatchesGrid = document.getElementById('quick-swatches-grid');
  const btnOpenPaletteModal = document.getElementById('btn-open-palette-modal');
  const inputCustomColor = document.getElementById('input-custom-color');
  const inputBrushSize = document.getElementById('input-brush-size');
  const sizePreviewDot = document.getElementById('size-preview-dot');
  const brushSizeText = document.getElementById('brush-size-text');
  const btnSizeToggle = document.getElementById('btn-size-toggle');
  const brushSizePopover = document.getElementById('brush-size-popover');
  const popoverSizeText = document.getElementById('popover-size-text');
  const btnSizeIncrease = document.getElementById('btn-size-increase');
  const btnSizeDecrease = document.getElementById('btn-size-decrease');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnClear = document.getElementById('btn-clear');

  // Modales
  const paletteModal = document.getElementById('palette-modal');
  const btnClosePaletteModal = document.getElementById('btn-close-palette-modal');
  const paletteCategoryTabs = document.querySelectorAll('.palette-category-tab');
  const paletteColorsContainer = document.getElementById('palette-colors-container');
  const paletteSelectedPreview = document.getElementById('palette-selected-preview');
  const paletteSelectedHex = document.getElementById('palette-selected-hex');
  const btnConfirmPalette = document.getElementById('btn-confirm-palette');

  const changeTemplateModal = document.getElementById('change-template-modal');
  const btnCloseChangeTemplate = document.getElementById('btn-close-change-template');
  const changeTemplateGrid = document.getElementById('change-template-grid');
  const btnCancelChangeTemplate = document.getElementById('btn-cancel-change-template');
  const btnConfirmChangeTemplate = document.getElementById('btn-confirm-change-template');
  const inputRoomUploadTemplate = document.getElementById('input-room-upload-template');
  let pendingChangeTemplate = null;

  // Drawer Chat / Usuarios
  const sideDrawer = document.getElementById('side-drawer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const tabChat = document.getElementById('tab-chat');
  const tabUsers = document.getElementById('tab-users');
  const drawerChatView = document.getElementById('drawer-chat-view');
  const drawerUsersView = document.getElementById('drawer-users-view');
  const drawerUsersList = document.getElementById('drawer-users-list');
  const drawerUserCount = document.getElementById('drawer-user-count');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');

  // Exportar y Limpiar
  const exportModal = document.getElementById('export-modal');
  const btnCloseExport = document.getElementById('btn-close-export');
  const btnExportPngWhite = document.getElementById('btn-export-png-white');
  const btnExportJpeg = document.getElementById('btn-export-jpeg');
  const clearConfirmModal = document.getElementById('clear-confirm-modal');
  const btnCancelClear = document.getElementById('btn-cancel-clear');
  const btnConfirmClear = document.getElementById('btn-confirm-clear');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // Controles de Zoom en la mesa de dibujo
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const zoomPercentageText = document.getElementById('zoom-percentage-text');

  // ==========================================
  // INICIALIZAR MOTOR DE DIBUJO Y COLOREADO
  // ==========================================
  const drawingCanvas = new DrawingCanvas('main-canvas', 'preview-canvas', {
    onStrokeStart: (data) => socket.emit('stroke_start', data),
    onStrokePoint: (data) => socket.emit('stroke_point', data),
    onStrokeComplete: (stroke) => socket.emit('stroke_complete', stroke),
    onShapeDrawn: (shape) => socket.emit('add_shape', shape),
    onFloodFill: (fillAction) => socket.emit('flood_fill', fillAction),
    onColorPicked: (hex) => selectColor(hex),
    onZoomChange: (zoom) => {
      if (zoomPercentageText) {
        zoomPercentageText.textContent = `${Math.round(zoom * 100)}%`;
      }
    }
  });

  if (btnZoomIn) btnZoomIn.addEventListener('click', () => drawingCanvas.zoomIn());
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => drawingCanvas.zoomOut());
  if (btnZoomReset) btnZoomReset.addEventListener('click', () => drawingCanvas.resetZoom());

  // Generador de código aleatorio
  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DRAW-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Notificación Toast central inferior
  let toastTimeout;
  function showToast(text, duration = 3000) {
    clearTimeout(toastTimeout);
    toastMessage.textContent = text;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    toastTimeout = setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, duration);
  }

  // Notificaciones sutiles flotantes (Unirse, Retirarse, Nuevos Mensajes de Chat)
  function showSubtleToast({ icon = '🔔', title = '', message = '', color = null, onClick = null }) {
    const container = document.getElementById('subtle-notification-container');
    if (!container) return;

    const toastEl = document.createElement('div');
    toastEl.className = 'pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs transition-all transform duration-300 translate-y-[-10px] opacity-0 hover:scale-[1.02] cursor-pointer max-w-sm';

    let iconHtml = '';
    if (color) {
      iconHtml = `<div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow ring-2 ring-white/30" style="background-color: ${color}">${icon}</div>`;
    } else {
      iconHtml = `<div class="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0 border border-slate-700">${icon}</div>`;
    }

    toastEl.innerHTML = `
      ${iconHtml}
      <div class="flex-1 min-w-0 pr-1">
        <div class="font-bold text-slate-200 truncate">${escapeHtml(title)}</div>
        <p class="text-slate-400 text-[11px] truncate leading-tight mt-0.5">${escapeHtml(message)}</p>
      </div>
    `;

    if (onClick) {
      toastEl.addEventListener('click', onClick);
    }

    container.appendChild(toastEl);

    // Animación suave de entrada
    requestAnimationFrame(() => {
      toastEl.classList.remove('translate-y-[-10px]', 'opacity-0');
      toastEl.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto-cierre tras 3.8 segundos
    setTimeout(() => {
      toastEl.classList.add('opacity-0', 'translate-y-[-10px]');
      setTimeout(() => toastEl.remove(), 300);
    }, 3800);
  }

  // Nombre de artista aleatorio
  const randomNames = ['DaVinci', 'Picasso', 'Monet', 'Frida', 'VanGogh', 'Dali', 'Kandinsky', 'Warhol', 'Miró'];
  inputUsername.value = randomNames[Math.floor(Math.random() * randomNames.length)] + '_' + Math.floor(10 + Math.random() * 89);

  // Selector de Color de Cursor en Lobby con feedback visual dinámico
  const userCursorColorPreview = document.getElementById('user-cursor-color-preview');
  const userColorBtns = document.querySelectorAll('.user-color-btn');

  function selectUserCursorColor(color) {
    if (!color) return;
    currentUser.color = color;
    if (userCursorColorPreview) {
      userCursorColorPreview.style.backgroundColor = color;
    }

    userColorBtns.forEach(btn => {
      const btnColor = btn.dataset.color;
      // Mantener siempre visible y vibrante su color de fondo
      btn.style.backgroundColor = btnColor;

      const isSelected = btnColor.toLowerCase() === color.toLowerCase();
      if (isSelected) {
        btn.className = 'user-color-btn relative w-7 h-7 rounded-full ring-4 ring-white ring-offset-2 ring-offset-slate-900 scale-125 z-10 shadow-xl shadow-black/80 transition-all flex items-center justify-center cursor-pointer';
        btn.innerHTML = `<svg class="w-3.5 h-3.5 text-white filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      } else {
        btn.className = 'user-color-btn relative w-7 h-7 rounded-full opacity-70 hover:opacity-100 hover:scale-110 transition-all flex items-center justify-center cursor-pointer border-2 border-white/20';
        btn.innerHTML = '';
      }
    });
  }

  userColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectUserCursorColor(btn.dataset.color);
    });
  });

  // Inicializar selección visual de cursor con el color por defecto
  selectUserCursorColor(currentUser.color);

  // Revisar si viene ?room= en la URL
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    inputRoomCode.value = roomParam.toUpperCase();
    tabBtnJoin.click();
  }

  // ==========================================
  // RENDERIZAR GALERÍA DE PLANTILLAS B/N
  // ==========================================
  function getAllTemplates() {
    return [...(window.COLORING_TEMPLATES || []), ...customTemplates];
  }

  function renderLobbyGallery() {
    if (!templatesGalleryGrid) return;
    templatesGalleryGrid.innerHTML = '';

    const templates = getAllTemplates();
    templates.forEach((tpl) => {
      const isSelected = selectedTemplate && selectedTemplate.id === tpl.id;
      const card = document.createElement('div');
      card.className = `cursor-pointer rounded-2xl p-2.5 border transition-all text-left flex flex-col justify-between ${
        isSelected
          ? 'bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20'
          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
      }`;

      // Contenido de la tarjeta
      let previewHtml = '';
      if (tpl.src) {
        previewHtml = `
          <div class="w-full h-20 bg-white rounded-xl mb-2 flex items-center justify-center p-1 overflow-hidden shadow-inner border border-slate-300">
            <img src="${tpl.src}" alt="${tpl.name}" class="w-full h-full object-contain filter contrast-125">
          </div>
        `;
      } else {
        previewHtml = `
          <div class="w-full h-20 bg-slate-900 rounded-xl mb-2 flex flex-col items-center justify-center border border-dashed border-slate-700">
            <span class="text-2xl mb-1">${tpl.emoji}</span>
            <span class="text-[10px] text-slate-400">En Blanco</span>
          </div>
        `;
      }

      card.innerHTML = `
        ${previewHtml}
        <div>
          <div class="flex items-center gap-1 font-bold text-xs text-white">
            <span>${tpl.emoji}</span>
            <span class="truncate">${tpl.name}</span>
          </div>
          <p class="text-[10px] text-slate-400 truncate mt-0.5">${tpl.category}</p>
        </div>
      `;

      card.addEventListener('click', () => {
        selectedTemplate = tpl;
        selectedTemplateLabel.textContent = `${tpl.emoji} ${tpl.name}`;
        renderLobbyGallery();
      });

      templatesGalleryGrid.appendChild(card);
    });
  }

  renderLobbyGallery();

  // Subir dibujo propio en blanco y negro
  inputUploadTemplate.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const customId = 'custom_' + Date.now();
      const newTpl = {
        id: customId,
        name: file.name.replace(/\.[^/.]+$/, '').slice(0, 15),
        category: 'Personalizado',
        emoji: '🖼️',
        description: 'Imagen subida desde tu dispositivo',
        src: event.target.result
      };
      customTemplates.unshift(newTpl);
      selectedTemplate = newTpl;
      selectedTemplateLabel.textContent = `🖼️ ${newTpl.name}`;
      renderLobbyGallery();
      showToast(`¡Dibujo "${newTpl.name}" cargado con éxito!`);
    };
    reader.readAsDataURL(file);
  });

  // ==========================================
  // PALETA DE COLORES RICA
  // ==========================================

  function selectColor(hex) {
    hex = hex.toUpperCase();
    drawingCanvas.currentColor = hex;
    activeColorIndicator.style.backgroundColor = hex;
    inputCustomColor.value = hex;
    sizePreviewDot.style.backgroundColor = hex;
    tempSelectedColor = hex;
    paletteSelectedPreview.style.backgroundColor = hex;
    paletteSelectedHex.textContent = hex;

    // Resaltar en swatches rápidos
    document.querySelectorAll('.quick-swatch').forEach(sw => {
      if (sw.dataset.color.toUpperCase() === hex) {
        sw.classList.add('ring-2', 'ring-white', 'scale-110');
      } else {
        sw.classList.remove('ring-2', 'ring-white', 'scale-110');
      }
    });
  }

  // Renderizar Swatches Rápidos en la barra lateral
  function renderQuickSwatches() {
    quickSwatchesGrid.innerHTML = '';
    QUICK_COLORS.forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-swatch w-4 h-4 rounded-md transition transform hover:scale-125 border border-black/20';
      btn.style.backgroundColor = color;
      btn.dataset.color = color;
      btn.title = color;

      if (color.toUpperCase() === drawingCanvas.currentColor.toUpperCase()) {
        btn.classList.add('ring-2', 'ring-white', 'scale-110');
      }

      btn.addEventListener('click', () => selectColor(color));
      quickSwatchesGrid.appendChild(btn);
    });
  }

  renderQuickSwatches();
  selectColor('#EF4444');

  // Renderizar Colores en el Modal por Categoría
  function renderPaletteColors(cat) {
    paletteColorsContainer.innerHTML = '';
    const colors = COLOR_PALETTES[cat] || COLOR_PALETTES.vivos;

    colors.forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-7 h-7 rounded-xl transition transform hover:scale-125 border border-black/30 shadow-sm relative group';
      btn.style.backgroundColor = color;
      btn.dataset.color = color;

      if (color.toUpperCase() === tempSelectedColor.toUpperCase()) {
        btn.classList.add('ring-2', 'ring-offset-2', 'ring-offset-slate-900', 'ring-white');
      }

      btn.addEventListener('click', () => {
        tempSelectedColor = color;
        paletteSelectedPreview.style.backgroundColor = color;
        paletteSelectedHex.textContent = color;
        renderPaletteColors(cat);
      });

      paletteColorsContainer.appendChild(btn);
    });
  }

  // Pestañas del Modal de Gama de Colores
  paletteCategoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      paletteCategoryTabs.forEach(t => {
        t.classList.remove('bg-indigo-600', 'text-white', 'active');
        t.classList.add('text-slate-400');
      });
      tab.classList.add('bg-indigo-600', 'text-white', 'active');
      tab.classList.remove('text-slate-400');
      currentPaletteCategory = tab.dataset.cat;
      renderPaletteColors(currentPaletteCategory);
    });
  });

  btnOpenPaletteModal.addEventListener('click', () => {
    tempSelectedColor = drawingCanvas.currentColor;
    paletteSelectedPreview.style.backgroundColor = tempSelectedColor;
    paletteSelectedHex.textContent = tempSelectedColor;
    renderPaletteColors(currentPaletteCategory);
    paletteModal.classList.remove('hidden');
  });

  btnClosePaletteModal.addEventListener('click', () => {
    paletteModal.classList.add('hidden');
  });

  btnConfirmPalette.addEventListener('click', () => {
    selectColor(tempSelectedColor);
    paletteModal.classList.add('hidden');
    showToast(`Color seleccionado: ${tempSelectedColor}`);
  });

  inputCustomColor.addEventListener('input', (e) => {
    selectColor(e.target.value);
  });

  // ==========================================
  // FLUJO DE SALAS (CREAR / UNIRSE)
  // ==========================================

  tabBtnCreate.addEventListener('click', () => {
    tabBtnCreate.classList.add('bg-indigo-600', 'text-white');
    tabBtnCreate.classList.remove('text-slate-400');
    tabBtnJoin.classList.remove('bg-indigo-600', 'text-white');
    tabBtnJoin.classList.add('text-slate-400');
    viewCreateRoom.classList.remove('hidden');
    viewJoinRoom.classList.add('hidden');
  });

  tabBtnJoin.addEventListener('click', () => {
    tabBtnJoin.classList.add('bg-indigo-600', 'text-white');
    tabBtnJoin.classList.remove('text-slate-400');
    tabBtnCreate.classList.remove('bg-indigo-600', 'text-white');
    tabBtnCreate.classList.add('text-slate-400');
    viewJoinRoom.classList.remove('hidden');
    viewCreateRoom.classList.add('hidden');
  });

  function enterRoom(roomId, tpl) {
    currentUser.username = inputUsername.value.trim() || `Artista_${Math.floor(100 + Math.random() * 899)}`;
    currentRoomId = roomId.trim().toUpperCase();

    const tplToSend = tpl || selectedTemplate || (window.COLORING_TEMPLATES && window.COLORING_TEMPLATES[0]);

    socket.emit('join_room', {
      roomId: currentRoomId,
      username: currentUser.username,
      color: currentUser.color,
      template: tplToSend ? tplToSend.id : 'mandala',
      templateName: tplToSend ? tplToSend.name : 'Mandala Zen',
      templateSrc: tplToSend ? tplToSend.src : null
    });

    currentRoomBadge.textContent = currentRoomId;
    lobbyModal.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => lobbyModal.classList.add('hidden'), 300);

    const newUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
    window.history.pushState({ room: currentRoomId }, '', newUrl);

    showToast(`¡Conectado a la sala ${currentRoomId}!`);
  }

  btnCreateRoom.addEventListener('click', () => {
    enterRoom(generateRoomCode(), selectedTemplate);
  });

  btnJoinRoom.addEventListener('click', () => {
    const code = inputRoomCode.value.trim();
    if (!code) {
      showToast('Por favor introduce un código de sala válido');
      return;
    }
    enterRoom(code, null);
  });

  inputRoomCode.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') btnJoinRoom.click();
  });

  // Copiar Enlace de Invitación
  btnCopyInvite.addEventListener('click', async () => {
    if (!currentRoomId) return;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast('¡Enlace con código de sala copiado al portapapeles!');
    } catch {
      prompt('Copia este enlace de invitación:', inviteUrl);
    }
  });

  btnLeaveRoom.addEventListener('click', () => {
    if (confirm('¿Deseas salir de esta sala de coloreado?')) {
      window.location.href = window.location.pathname;
    }
  });

  // ==========================================
  // MODAL CAMBIAR DIBUJO DENTRO DE LA SALA
  // ==========================================

  function renderChangeTemplateGallery() {
    changeTemplateGrid.innerHTML = '';
    const templates = getAllTemplates();

    templates.forEach(tpl => {
      const isSelected = pendingChangeTemplate && pendingChangeTemplate.id === tpl.id;
      const card = document.createElement('div');
      card.className = `cursor-pointer rounded-2xl p-2.5 border transition-all text-left flex flex-col justify-between ${
        isSelected
          ? 'bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/50 shadow-md'
          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
      }`;

      let previewHtml = '';
      if (tpl.src) {
        previewHtml = `
          <div class="w-full h-16 bg-white rounded-xl mb-1.5 flex items-center justify-center p-1 overflow-hidden shadow-inner border border-slate-300">
            <img src="${tpl.src}" alt="${tpl.name}" class="w-full h-full object-contain filter contrast-125">
          </div>
        `;
      } else {
        previewHtml = `
          <div class="w-full h-16 bg-slate-900 rounded-xl mb-1.5 flex flex-col items-center justify-center border border-dashed border-slate-700">
            <span class="text-xl mb-0.5">${tpl.emoji}</span>
            <span class="text-[9px] text-slate-400">En Blanco</span>
          </div>
        `;
      }

      card.innerHTML = `
        ${previewHtml}
        <div class="flex items-center gap-1 font-bold text-xs text-white truncate">
          <span>${tpl.emoji}</span>
          <span class="truncate">${tpl.name}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        pendingChangeTemplate = tpl;
        renderChangeTemplateGallery();
      });

      changeTemplateGrid.appendChild(card);
    });
  }

  btnOpenChangeTemplate.addEventListener('click', () => {
    pendingChangeTemplate = selectedTemplate;
    renderChangeTemplateGallery();
    changeTemplateModal.classList.remove('hidden');
  });

  btnCloseChangeTemplate.addEventListener('click', () => changeTemplateModal.classList.add('hidden'));
  btnCancelChangeTemplate.addEventListener('click', () => changeTemplateModal.classList.add('hidden'));

  if (inputRoomUploadTemplate) {
    inputRoomUploadTemplate.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const customId = 'custom_' + Date.now();
        const newTpl = {
          id: customId,
          name: file.name.replace(/\.[^/.]+$/, '').slice(0, 15),
          category: 'Personalizado',
          emoji: '🖼️',
          description: 'Imagen subida desde tu dispositivo',
          src: event.target.result
        };
        customTemplates.unshift(newTpl);
        pendingChangeTemplate = newTpl;
        renderChangeTemplateGallery();
        showToast(`¡Dibujo "${newTpl.name}" cargado! Pulsa "Cambiar Dibujo" para aplicarlo.`);
      };
      reader.readAsDataURL(file);
    });
  }

  btnConfirmChangeTemplate.addEventListener('click', () => {
    if (!pendingChangeTemplate) return;
    // Limpiar el lienzo inmediatamente para que no queden colores del dibujo anterior
    drawingCanvas.clearCanvas();
    socket.emit('change_template', {
      template: pendingChangeTemplate.id,
      templateName: pendingChangeTemplate.name,
      templateSrc: pendingChangeTemplate.src || null
    });
    changeTemplateModal.classList.add('hidden');
  });

  // ==========================================
  // HERRAMIENTAS Y BARRA LATERAL
  // ==========================================

  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toolButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tool = btn.dataset.tool;
      drawingCanvas.currentTool = tool;

      if (tool === 'bucket') {
        canvasContainer.style.cursor = 'crosshair';
        showToast('Bote de Pintura: Haz clic en cualquier espacio para rellenarlo');
      } else if (tool === 'picker') {
        canvasContainer.style.cursor = 'crosshair';
        showToast('Cuentagotas: Haz clic en cualquier color para absorberlo');
      } else if (tool === 'eraser') {
        canvasContainer.style.cursor = 'crosshair';
      } else if (tool === 'text') {
        canvasContainer.style.cursor = 'text';
      } else {
        canvasContainer.style.cursor = 'crosshair';
      }
    });
  });

  // ==========================================
  // CONTROL DE GROSOR DE PINCEL Y SLIDER
  // ==========================================

  function updateBrushSize(newSize) {
    const size = Math.max(1, Math.min(50, parseInt(newSize, 10) || 8));
    drawingCanvas.currentSize = size;
    if (inputBrushSize) inputBrushSize.value = size;
    if (brushSizeText) brushSizeText.textContent = `${size}px`;
    if (popoverSizeText) popoverSizeText.textContent = `${size}px`;

    if (sizePreviewDot) {
      const previewScale = Math.min(24, Math.max(4, size));
      sizePreviewDot.style.width = `${previewScale}px`;
      sizePreviewDot.style.height = `${previewScale}px`;
    }

    // Actualizar clase activa en los botones de preset
    document.querySelectorAll('.size-preset-btn').forEach(btn => {
      const presetVal = parseInt(btn.dataset.size, 10);
      if (presetVal === size) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Slider arrastrable
  if (inputBrushSize) {
    inputBrushSize.addEventListener('input', (e) => {
      updateBrushSize(e.target.value);
    });
  }

  // Abrir / Cerrar popover de grosor con el botón principal
  if (btnSizeToggle && brushSizePopover) {
    btnSizeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      brushSizePopover.classList.toggle('hidden');
    });

    // Evitar que clics dentro del popover lo cierren
    brushSizePopover.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Botón rápido de incremento (+)
  if (btnSizeIncrease) {
    btnSizeIncrease.addEventListener('click', (e) => {
      e.stopPropagation();
      updateBrushSize(drawingCanvas.currentSize + 2);
    });
  }

  // Botón rápido de decremento (-)
  if (btnSizeDecrease) {
    btnSizeDecrease.addEventListener('click', (e) => {
      e.stopPropagation();
      updateBrushSize(drawingCanvas.currentSize - 2);
    });
  }

  // Presets de tamaño rápido (3px, 8px, 16px, 30px)
  document.querySelectorAll('.size-preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = parseInt(btn.dataset.size, 10);
      if (val) updateBrushSize(val);
    });
  });

  // Cerrar el popover al hacer clic fuera del control o presionar Escape
  document.addEventListener('click', (e) => {
    if (brushSizePopover && !brushSizePopover.classList.contains('hidden')) {
      if (!e.target.closest('#brush-size-container')) {
        brushSizePopover.classList.add('hidden');
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && brushSizePopover && !brushSizePopover.classList.contains('hidden')) {
      brushSizePopover.classList.add('hidden');
    }
  });

  // Inicializar grosor por defecto en 8px
  updateBrushSize(8);

  // Deshacer y Rehacer
  btnUndo.addEventListener('click', () => socket.emit('undo'));
  btnRedo.addEventListener('click', () => socket.emit('redo'));

  // Limpiar colores del dibujo
  btnClear.addEventListener('click', () => clearConfirmModal.classList.remove('hidden'));
  btnCancelClear.addEventListener('click', () => clearConfirmModal.classList.add('hidden'));
  btnConfirmClear.addEventListener('click', () => {
    socket.emit('clear_canvas');
    clearConfirmModal.classList.add('hidden');
  });

  // Exportar Imagen
  btnOpenExport.addEventListener('click', () => exportModal.classList.remove('hidden'));
  btnCloseExport.addEventListener('click', () => exportModal.classList.add('hidden'));

  function triggerDownload(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    exportModal.classList.add('hidden');
    showToast(`Dibujo guardado como ${filename}`);
  }

  btnExportPngWhite.addEventListener('click', () => {
    const data = drawingCanvas.exportImage('image/png', 'white');
    triggerDownload(data, `DrawOnline_${currentRoomId}.png`);
  });

  btnExportJpeg.addEventListener('click', () => {
    const data = drawingCanvas.exportImage('image/jpeg', 'white');
    triggerDownload(data, `DrawOnline_${currentRoomId}.jpg`);
  });

  // ==========================================
  // SIDE DRAWER: CHAT & USUARIOS
  // ==========================================

  function toggleDrawer(open) {
    isChatOpen = open !== undefined ? open : !isChatOpen;
    if (isChatOpen) {
      sideDrawer.classList.remove('translate-x-full');
      unreadMessages = 0;
      chatUnreadBadge.classList.add('hidden');
      setTimeout(() => chatInput.focus(), 300);
    } else {
      sideDrawer.classList.add('translate-x-full');
    }
  }

  btnToggleChat.addEventListener('click', () => toggleDrawer());
  btnCloseDrawer.addEventListener('click', () => toggleDrawer(false));

  tabChat.addEventListener('click', () => {
    tabChat.classList.add('bg-indigo-600', 'text-white');
    tabChat.classList.remove('text-slate-400');
    tabUsers.classList.remove('bg-indigo-600', 'text-white');
    tabUsers.classList.add('text-slate-400');
    drawerChatView.classList.remove('hidden');
    drawerUsersView.classList.add('hidden');
  });

  tabUsers.addEventListener('click', () => {
    tabUsers.classList.add('bg-indigo-600', 'text-white');
    tabUsers.classList.remove('text-slate-400');
    tabChat.classList.remove('bg-indigo-600', 'text-white');
    tabChat.classList.add('text-slate-400');
    drawerUsersView.classList.remove('hidden');
    drawerChatView.classList.add('hidden');
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    socket.emit('chat_message', { text });
    chatInput.value = '';
  });

  function addChatMessage(msg) {
    const isMe = msg.userId === socket.id;
    const msgEl = document.createElement('div');
    msgEl.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1.5`;
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgEl.innerHTML = `
      <div class="flex items-center gap-1.5 mb-0.5">
        <span class="text-[11px] font-semibold" style="color: ${msg.color}">${isMe ? 'Tú' : escapeHtml(msg.username)}</span>
        <span class="text-[10px] text-slate-500">${timeStr}</span>
      </div>
      <div class="max-w-[85%] px-3 py-2 rounded-2xl text-xs break-words ${
        isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60'
      }">
        ${escapeHtml(msg.text)}
      </div>
    `;

    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (!isMe) {
      if (!isChatOpen) {
        unreadMessages++;
        chatUnreadBadge.classList.remove('hidden');
      }
      // Notificación sutil flotante en pantalla al recibir un mensaje
      showSubtleToast({
        icon: '💬',
        title: msg.username,
        message: msg.text,
        color: msg.color,
        onClick: () => toggleDrawer(true)
      });
    }
  }

  function addSystemMessage(sys) {
    const sysEl = document.createElement('div');
    sysEl.className = 'text-center my-2';
    sysEl.innerHTML = `
      <span class="text-[11px] bg-slate-800/80 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700/50">
        ${escapeHtml(sys.text)}
      </span>
    `;
    chatMessages.appendChild(sysEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Notificación sutil flotante cuando un participante entra o sale de la mesa
    if (sys.type === 'join' && sys.userId !== socket.id) {
      showSubtleToast({
        icon: '👋',
        title: sys.user || 'Artista',
        message: 'se unió a colorear en la mesa',
        color: sys.color
      });
    } else if (sys.type === 'leave') {
      showSubtleToast({
        icon: '🚪',
        title: sys.user || 'Artista',
        message: 'se retiró de la mesa',
        color: sys.color
      });
    }
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // ==========================================
  // CURSORES EN TIEMPO REAL
  // ==========================================

  const remoteCursors = new Map();
  const canvasBoard = document.getElementById('canvas-board') || canvasContainer;

  function updateRemoteCursor(data) {
    let cursorEl = remoteCursors.get(data.userId);

    if (!cursorEl) {
      cursorEl = document.createElement('div');
      cursorEl.className = 'user-cursor flex items-center gap-1.5 transition-all';
      cursorEl.innerHTML = `
        <svg class="w-4 h-4 filter drop-shadow" viewBox="0 0 24 24" fill="${data.color}" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.92c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" stroke="#ffffff" stroke-width="1.5"/>
        </svg>
        <div class="cursor-badge px-2 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap shadow-md pointer-events-none" style="background-color: ${data.color}">
          ${escapeHtml(data.username)}
        </div>
      `;
      cursorsLayer.appendChild(cursorEl);
      remoteCursors.set(data.userId, cursorEl);
    }

    // Convertir de coordenadas virtuales (0..1000) a píxeles en pantalla
    const screenX = (data.x / 1000) * drawingCanvas.displaySize;
    const screenY = (data.y / 1000) * drawingCanvas.displaySize;
    cursorEl.style.transform = `translate(${screenX}px, ${screenY}px)`;
  }

  function removeRemoteCursor(userId) {
    const el = remoteCursors.get(userId);
    if (el) {
      el.remove();
      remoteCursors.delete(userId);
    }
  }

  let lastCursorSend = 0;
  canvasBoard.addEventListener('mousemove', (e) => {
    const coords = drawingCanvas.getPointerCoords(e);
    const now = Date.now();

    if (now - lastCursorSend > 30) {
      lastCursorSend = now;
      socket.emit('cursor_move', coords);
    }

    if (drawingCanvas.currentTool === 'laser' && drawingCanvas.isDrawing) {
      triggerLaser(coords.x, coords.y, currentUser.color);
      socket.emit('laser_pointer', { x: coords.x, y: coords.y });
    }
  });

  canvasBoard.addEventListener('mouseleave', () => {
    socket.emit('cursor_leave');
  });

  function triggerLaser(virtualX, virtualY, color) {
    const screenX = (virtualX / 1000) * drawingCanvas.displaySize;
    const screenY = (virtualY / 1000) * drawingCanvas.displaySize;

    const dot = document.createElement('div');
    dot.className = 'laser-dot';
    dot.style.left = `${screenX}px`;
    dot.style.top = `${screenY}px`;
    dot.style.color = color;
    cursorsLayer.appendChild(dot);

    setTimeout(() => {
      dot.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      dot.style.opacity = '0';
      dot.style.transform = 'translate(-50%, -50%) scale(2)';
      setTimeout(() => dot.remove(), 400);
    }, 600);
  }

  // ==========================================
  // EVENTOS RECIBIDOS DESDE SOCKET.IO
  // ==========================================

  function findTemplateById(tplId, customSrc = null, customName = null) {
    let tpl = getAllTemplates().find(t => t.id === tplId);
    if (!tpl && (customSrc || (tplId && tplId.startsWith('custom_')))) {
      tpl = {
        id: tplId,
        name: customName || 'Personalizado',
        category: 'Personalizado',
        emoji: '🖼️',
        description: 'Imagen compartida en la mesa',
        src: customSrc
      };
      customTemplates.unshift(tpl);
    } else if (tpl && customSrc && !tpl.src) {
      tpl.src = customSrc;
    }
    return tpl || (window.COLORING_TEMPLATES && window.COLORING_TEMPLATES[0]);
  }

  function setRoomTemplate(tplId, tplName, tplSrc = null) {
    const tpl = findTemplateById(tplId, tplSrc, tplName);
    if (tpl) {
      selectedTemplate = tpl;
      headerTemplateIcon.textContent = tpl.emoji || '🎨';
      headerTemplateName.textContent = tplName || tpl.name;
      const finalSrc = tplSrc || tpl.src;
      tpl.src = finalSrc;

      // Limpiar trazos para que no queden colores del dibujo anterior
      drawingCanvas.strokes = [];
      drawingCanvas.loadTemplate(finalSrc);
    }
  }

  socket.on('canvas_init', (data) => {
    const tpl = findTemplateById(data.template, data.templateSrc, data.templateName);
    if (tpl) {
      selectedTemplate = tpl;
      headerTemplateIcon.textContent = tpl.emoji || '🎨';
      headerTemplateName.textContent = data.templateName || tpl.name;
      const finalSrc = data.templateSrc || tpl.src;
      tpl.src = finalSrc;

      drawingCanvas.strokes = [];
      drawingCanvas.loadTemplate(finalSrc, () => {
        drawingCanvas.setStrokes(data.strokes || []);
      });
    } else {
      drawingCanvas.setStrokes(data.strokes || []);
    }

    btnUndo.disabled = !data.canUndo;
    btnRedo.disabled = !data.canRedo;
  });

  socket.on('template_changed', (data) => {
    // 1. Limpiar completamente los trazos previos para que no queden colores del dibujo anterior
    drawingCanvas.clearCanvas();

    // 2. Cargar el nuevo dibujo sincronizado (con su imagen personalizada si aplica)
    setRoomTemplate(data.template, data.templateName, data.templateSrc);

    showToast(`El dibujo ha cambiado a: ${data.templateName}`);
    btnUndo.disabled = true;
    btnRedo.disabled = true;
  });

  socket.on('flood_fill', (fillAction) => {
    drawingCanvas.handleRemoteFloodFill(fillAction);
  });

  socket.on('stroke_start', (data) => {
    drawingCanvas.handleRemoteStrokeStart(data);
  });

  socket.on('stroke_point', (data) => {
    drawingCanvas.handleRemoteStrokePoint(data);
  });

  socket.on('stroke_complete', (stroke) => {
    drawingCanvas.handleRemoteStrokeComplete(stroke);
  });

  socket.on('shape_drawn', (shape) => {
    drawingCanvas.handleRemoteShape(shape);
  });

  socket.on('sync_canvas', (data) => {
    drawingCanvas.setStrokes(data.strokes);
    if (data.action && data.user) {
      showToast(`${data.user} usó ${data.action === 'undo' ? 'Deshacer' : 'Rehacer'}`);
    }
  });

  socket.on('history_state', (state) => {
    btnUndo.disabled = !state.canUndo;
    btnRedo.disabled = !state.canRedo;
  });

  socket.on('canvas_cleared', (data) => {
    drawingCanvas.clearCanvas();
    showToast(`${data.user || 'Un usuario'} limpió los colores del lienzo`);
  });

  socket.on('cursor_update', (data) => updateRemoteCursor(data));
  socket.on('cursor_remove', (data) => removeRemoteCursor(data.userId));
  socket.on('laser_pointer', (data) => triggerLaser(data.x, data.y, data.color));
  socket.on('chat_message', (msg) => addChatMessage(msg));
  socket.on('system_message', (sys) => addSystemMessage(sys));

  socket.on('room_users', (users) => {
    usersCountBadge.textContent = `${users.length} online`;
    drawerUserCount.textContent = users.length;

    usersAvatarGroup.innerHTML = '';
    const displayUsers = users.slice(0, 4);
    displayUsers.forEach(u => {
      const isMe = u.id === socket.id;
      const initial = (u.username || 'A').charAt(0).toUpperCase();
      const avatar = document.createElement('div');
      avatar.className = `w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-slate-900 shadow cursor-pointer transition transform hover:scale-110`;
      avatar.style.backgroundColor = u.color;
      avatar.title = `${u.username}${isMe ? ' (Tú)' : ''}`;
      avatar.textContent = initial;
      usersAvatarGroup.appendChild(avatar);
    });

    if (users.length > 4) {
      const extra = document.createElement('div');
      extra.className = 'w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-900 text-[10px] font-bold text-white flex items-center justify-center';
      extra.textContent = `+${users.length - 4}`;
      usersAvatarGroup.appendChild(extra);
    }

    drawerUsersList.innerHTML = '';
    users.forEach(u => {
      const isMe = u.id === socket.id;
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40';
      item.innerHTML = `
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow" style="background-color: ${u.color}">
            ${u.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div class="text-sm font-semibold text-white flex items-center gap-1.5">
              ${escapeHtml(u.username)}
              ${isMe ? '<span class="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-normal">Tú</span>' : ''}
            </div>
            <div class="text-[11px] text-emerald-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Coloreando en vivo
            </div>
          </div>
        </div>
      `;
      drawerUsersList.appendChild(item);
    });
  });

  // ==========================================
  // ATAJOS DE TECLADO
  // ==========================================
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        socket.emit('redo');
      } else {
        socket.emit('undo');
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      socket.emit('redo');
      return;
    }

    // Atajos de Zoom (+ / - / 0)
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      drawingCanvas.zoomIn();
      return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      drawingCanvas.zoomOut();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      drawingCanvas.resetZoom();
      return;
    }

    const key = e.key.toLowerCase();
    const toolMap = {
      'f': 'bucket',
      'b': 'bucket',
      'p': 'brush',
      'h': 'highlighter',
      'e': 'eraser',
      'i': 'picker',
      'l': 'line',
      'r': 'rectangle',
      'c': 'circle',
      't': 'text',
      'k': 'laser'
    };

    if (toolMap[key]) {
      const btn = document.querySelector(`.tool-btn[data-tool="${toolMap[key]}"]`);
      if (btn) btn.click();
    }
  });

});
