import { audioManager } from './audio/AudioManager.ts';
import { ScreenManager } from './core/ScreenManager.ts';
import { HomeScreen } from './screens/HomeScreen.ts';
import { ShapeFittingScreen } from './screens/ShapeFittingScreen.ts';
import { ColorSortingScreen } from './screens/ColorSortingScreen.ts';
import { OrientationNotice } from './components/OrientationNotice.ts';

/**
 * Inicialização e bloqueio de comportamentos de navegação acidentais para crianças
 */
function lockAccidentalInteractions(): void {
  // 1. Bloqueia menu de contexto (clique com botão direito ou toque longo)
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
  }, { capture: true });

  // 2. Bloqueia gestos de zoom multi-toque (pinch-to-zoom) no iOS Safari / WebKit
  document.addEventListener('gesturestart', (e: Event) => {
    e.preventDefault();
  });
  document.addEventListener('gesturechange', (e: Event) => {
    e.preventDefault();
  });
  document.addEventListener('gestureend', (e: Event) => {
    e.preventDefault();
  });

  // 3. Bloqueia duplo toque para dar zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // 4. Previne arrasto nativo do navegador para imagens ou texto
  document.addEventListener('dragstart', (e: DragEvent) => {
    e.preventDefault();
  });
}

/**
 * Configuração do botão global de áudio (Mudo / Ativado)
 */
function setupGlobalSoundButton(): void {
  const toggleBtn = document.getElementById('globalSoundToggle');
  const iconOn = document.getElementById('iconSoundOn');
  const iconOff = document.getElementById('iconSoundOff');

  if (toggleBtn && iconOn && iconOff) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMuted = audioManager.toggleMute();
      if (isMuted) {
        toggleBtn.classList.add('muted');
        iconOn.classList.add('hidden');
        iconOff.classList.remove('hidden');
      } else {
        toggleBtn.classList.remove('muted');
        iconOn.classList.remove('hidden');
        iconOff.classList.add('hidden');
        audioManager.playPop();
      }
    });
  }
}

/**
 * Bootstrap da aplicação
 */
function bootstrap(): void {
  lockAccidentalInteractions();
  setupGlobalSoundButton();

  // Alerta ergonômico de orientação horizontal para aparelhos móveis
  const orientationNotice = new OrientationNotice();
  orientationNotice.init();

  // Inicializa o gerenciador de telas
  const screenContainer = document.getElementById('screen-container');
  if (!screenContainer) {
    throw new Error('Elemento #screen-container não encontrado');
  }

  const screenManager = new ScreenManager(screenContainer);

  // Registra as telas do jogo
  const homeScreen = new HomeScreen(screenManager);
  const shapeScreen = new ShapeFittingScreen(screenManager);
  const colorScreen = new ColorSortingScreen(screenManager);

  screenManager.register(homeScreen);
  screenManager.register(shapeScreen);
  screenManager.register(colorScreen);

  // Inicia navegando para a tela principal (Hub de Jogos)
  screenManager.navigateTo('home');
}

// Executa após carregamento do DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
