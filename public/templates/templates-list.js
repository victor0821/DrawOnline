/**
 * DrawOnline - Catálogo de Dibujos en Blanco y Negro para Colorear
 */
const COLORING_TEMPLATES = [
  {
    id: 'mandala',
    name: 'Mandala Zen',
    category: 'Mandalas & Flores',
    emoji: '🌸',
    description: 'Pétalos simétricos y círculos armoniosos para relajarse coloreando.',
    src: '/templates/mandala.svg'
  },
  {
    id: 'dinosaur',
    name: 'T-Rex Jurásico',
    category: 'Animales',
    emoji: '🦖',
    description: 'Dinosaurio amigable entre palmeras, volcán y sol.',
    src: '/templates/dinosaur.svg'
  },
  {
    id: 'rocket',
    name: 'Cohete Galáctico',
    category: 'Espacio',
    emoji: '🚀',
    description: 'Nave espacial viajando entre planetas con anillos y estrellas.',
    src: '/templates/rocket.svg'
  },
  {
    id: 'butterfly',
    name: 'Mariposa de Jardín',
    category: 'Naturaleza',
    emoji: '🦋',
    description: 'Alas decoradas con patrones geométricos y flores silvestres.',
    src: '/templates/butterfly.svg'
  },
  {
    id: 'castle',
    name: 'Castillo Medieval',
    category: 'Fantasía',
    emoji: '🏰',
    description: 'Torres altas, banderas flameantes y camino de piedra.',
    src: '/templates/castle.svg'
  },
  {
    id: 'car',
    name: 'Auto de Carreras',
    category: 'Vehículos',
    emoji: '🏎️',
    description: 'Bólido deportivo con alerón, franjas y bandera a cuadros.',
    src: '/templates/car.svg'
  },
  {
    id: 'dolphin',
    name: 'Delfín Oceánico',
    category: 'Animales',
    emoji: '🐬',
    description: 'Delfín saltando sobre las olas con gaviotas y sol resplandeciente.',
    src: '/templates/dolphin.svg'
  },
  {
    id: 'blank',
    name: 'Lienzo Libre',
    category: 'Creatividad',
    emoji: '✨',
    description: 'Lienzo en blanco para dibujar y crear tus propios trazos desde cero.',
    src: null
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = COLORING_TEMPLATES;
} else {
  window.COLORING_TEMPLATES = COLORING_TEMPLATES;
}
