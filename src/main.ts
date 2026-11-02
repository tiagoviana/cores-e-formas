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

  // 4. Bloqueia totalmente arrasto fantasma nativo do navegador para imagens, links e textos
  window.ondragstart = () => false;
  document.ondragstart = () => false;
  document.addEventListener('dragstart', (e: DragEvent) => {
    e.preventDefault();
    return false;
  }, { capture: true });
}

/**
 * Configuração do botão discreto de Tela Cheia (Fullscreen API)
 */
function setupFullscreenToggle(): void {
  const toggleBtn = document.getElementById('globalFullscreenToggle');
  const iconEnter = document.getElementById('iconEnterFullscreen');
  const iconExit = document.getElementById('iconExitFullscreen');

  if (!toggleBtn) return;

  const isFullscreen = (): boolean => {
    const doc = document as unknown as {
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      msFullscreenElement?: Element;
    };
    return !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
  };

  const updateIcons = () => {
    const active = isFullscreen();
    if (active) {
      iconEnter?.classList.add('hidden');
      iconExit?.classList.remove('hidden');
      toggleBtn.classList.add('active');
    } else {
      iconEnter?.classList.remove('hidden');
      iconExit?.classList.add('hidden');
      toggleBtn.classList.remove('active');
    }
  };

  toggleBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    audioManager.playPop();

    try {
      if (!isFullscreen()) {
        const docEl = document.documentElement as unknown as {
          requestFullscreen?: () => Promise<void>;
          webkitRequestFullscreen?: () => Promise<void>;
          msRequestFullscreen?: () => Promise<void>;
        };

        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } else {
        const doc = document as unknown as {
          exitFullscreen?: () => Promise<void>;
          webkitExitFullscreen?: () => Promise<void>;
          msExitFullscreen?: () => Promise<void>;
        };

        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen não suportado ou negado pelo usuário/navegador:', err);
    }

    updateIcons();
  });

  document.addEventListener('fullscreenchange', updateIcons);
  document.addEventListener('webkitfullscreenchange', updateIcons);
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
  setupFullscreenToggle();

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
