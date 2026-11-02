import { Screen, ScreenId } from '../core/types.ts';
import { ScreenManager } from '../core/ScreenManager.ts';
import { audioManager } from '../audio/AudioManager.ts';
import { ConfettiCelebration } from '../components/Confetti.ts';

interface ColorCategory {
  id: 'red' | 'yellow' | 'blue';
  name: string;
  colorHex: string;
  lightHex: string;
}

interface ColorItem {
  id: string;
  name: string;
  colorId: 'red' | 'yellow' | 'blue';
  svg: string;
}

export class ColorSortingScreen implements Screen {
  public readonly id: ScreenId = 'colors';
  private screenManager: ScreenManager;
  private rootElement: HTMLElement | null = null;
  private confetti: ConfettiCelebration = new ConfettiCelebration();
  private matchedCount: number = 0;
  private totalItems: number = 6;

  private categories: ColorCategory[] = [
    { id: 'red', name: 'Vermelho', colorHex: '#FF5E7E', lightHex: '#FFE2E8' },
    { id: 'yellow', name: 'Amarelo', colorHex: '#FFB800', lightHex: '#FFF4D6' },
    { id: 'blue', name: 'Azul', colorHex: '#5AC8FA', lightHex: '#E1F5FE' }
  ];

  private items: ColorItem[] = [
    {
      id: 'red_apple',
      name: 'Maçã Vermelha',
      colorId: 'red',
      svg: `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Folha e galho -->
          <path d="M 40 20 Q 42 10 50 12" stroke="#4CD964" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M 40 18 Q 33 13 36 21 Z" fill="#4CD964"/>
          <!-- Maçã -->
          <circle cx="33" cy="46" r="24" fill="#FF5E7E"/>
          <circle cx="47" cy="46" r="24" fill="#FF5E7E"/>
          <!-- Olhinhos -->
          <circle cx="34" cy="42" r="3.5" fill="#FFFFFF"/>
          <circle cx="46" cy="42" r="3.5" fill="#FFFFFF"/>
          <path d="M 37 51 Q 40 56 43 51" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'red_heart',
      name: 'Coração Vermelho',
      colorId: 'red',
      svg: `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <path d="M 40 68 C 15 50 14 30 26 22 C 34 16 39 23 40 27 C 41 23 46 16 54 22 C 66 30 65 50 40 68 Z" fill="#FF5E7E"/>
          <circle cx="34" cy="38" r="3.5" fill="#FFFFFF"/>
          <circle cx="46" cy="38" r="3.5" fill="#FFFFFF"/>
          <path d="M 37 46 Q 40 50 43 46" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'yellow_star',
      name: 'Estrela Amarela',
      colorId: 'yellow',
      svg: `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <path d="M 40 12 L 48 30 L 68 32 L 52 46 L 57 66 L 40 55 L 23 66 L 28 46 L 12 32 L 32 30 Z" fill="#FFB800"/>
          <circle cx="35" cy="38" r="3" fill="#6A4700"/>
          <circle cx="45" cy="38" r="3" fill="#6A4700"/>
          <path d="M 37 45 Q 40 48 43 45" stroke="#6A4700" stroke-width="2" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'yellow_duck',
      name: 'Patinho Amarelo',
      colorId: 'yellow',
      svg: `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Corpo do patinho -->
          <ellipse cx="44" cy="48" rx="22" ry="16" fill="#FFB800"/>
          <!-- Cabeça -->
          <circle cx="28" cy="34" r="14" fill="#FFB800"/>
          <!-- Bico -->
          <polygon points="15,35 22,30 22,40" fill="#FF9500"/>
          <!-- Olho -->
          <circle cx="27" cy="31" r="3" fill="#6A4700"/>
          <!-- Asa -->
          <ellipse cx="46" cy="46" rx="10" ry="6" fill="#FFA500"/>
        </svg>`
    },
    {
      id: 'blue_cloud',
      name: 'Nuvem Azul',
      colorId: 'blue',
      svg: `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <circle cx="30" cy="45" r="16" fill="#5AC8FA"/>
          <circle cx="46" cy="36" r="18" fill="#5AC8FA"/>
          <circle cx="58" cy="46" r="15" fill="#5AC8FA"/>
          <rect x="28" y="44" width="32" height="18" fill="#5AC8FA"/>
          <!-- Olhinhos -->
          <circle cx="40" cy="42" r="3" fill="#FFFFFF"/>
          <circle cx="52" cy="42" r="3" fill="#FFFFFF"/>
          <path d="M 43 49 Q 46 54 49 49" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'blue_car',
      name: 'Carrinho Azul',
      colorId: 'blue',
      svg: `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <rect x="18" y="38" width="44" height="18" rx="6" fill="#5AC8FA"/>
          <path d="M 26 38 Q 30 25 42 25 L 50 38 Z" fill="#5AC8FA"/>
          <circle cx="28" cy="56" r="6" fill="#333333"/>
          <circle cx="28" cy="56" r="2.5" fill="#FFFFFF"/>
          <circle cx="52" cy="56" r="6" fill="#333333"/>
          <circle cx="52" cy="56" r="2.5" fill="#FFFFFF"/>
        </svg>`
    }
  ];

  constructor(screenManager: ScreenManager) {
    this.screenManager = screenManager;
  }

  public mount(container: HTMLElement): void {
    this.matchedCount = 0;

    const gameEl = document.createElement('div');
    gameEl.className = 'game-screen minigame-colors';
    gameEl.innerHTML = `
      <!-- Barra Superior -->
      <nav class="game-navbar">
        <button class="back-button" id="btnBackToHubColors" aria-label="Voltar ao Menu">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>Menu</span>
        </button>

        <div class="game-instruction">
          <span class="instruction-badge">Minijogo 2</span>
          <h2>Guarde cada brinquedo no pote da cor certa!</h2>
        </div>

        <button class="action-btn-restart" id="btnRestartColors" title="Recomeçar">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </nav>

      <!-- Área dos Potes / Cestos Coloridos -->
      <div class="buckets-board">
        <div class="buckets-container">
          ${this.categories.map(cat => `
            <div class="color-bucket bucket-${cat.id}" data-color="${cat.id}" id="bucket-${cat.id}">
              <div class="bucket-visual">
                <svg viewBox="0 0 160 140" width="100%" height="100%">
                  <!-- Borda do pote -->
                  <ellipse cx="80" cy="30" rx="60" ry="16" fill="${cat.colorHex}" />
                  <ellipse cx="80" cy="30" rx="50" ry="12" fill="${cat.lightHex}" />
                  <!-- Corpo do pote -->
                  <path d="M 25 32 L 38 120 Q 80 135 122 120 L 135 32 Z" fill="${cat.colorHex}" />
                  <!-- Rostinho simpático no pote -->
                  <circle cx="65" cy="80" r="5" fill="#FFFFFF"/>
                  <circle cx="95" cy="80" r="5" fill="#FFFFFF"/>
                  <path d="M 70 94 Q 80 102 90 94" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
                  <ellipse cx="56" cy="88" rx="5" ry="3" fill="rgba(255,255,255,0.4)"/>
                  <ellipse cx="104" cy="88" rx="5" ry="3" fill="rgba(255,255,255,0.4)"/>
                </svg>
              </div>
              <span class="bucket-label" style="background-color: ${cat.colorHex}">${cat.name}</span>
              <div class="bucket-collected-indicator" id="indicator-${cat.id}">0 / 2</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Bandeja Inferior com os Brinquedos / Itens Coloridos -->
      <div class="color-tray-area">
        <div class="color-tray" id="colorTray">
          ${this.shuffle([...this.items]).map(item => `
            <div class="draggable-toy" data-color="${item.colorId}" id="toy-${item.id}">
              <div class="toy-card">
                ${item.svg}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Modal de Vitória -->
      <div class="victory-modal hidden" id="colorsVictoryModal">
        <div class="victory-card">
          <div class="victory-stars">⭐⭐⭐</div>
          <h2>Incrível!</h2>
          <p>Você separou todas as cores no potinho certinho!</p>
          <div class="victory-actions">
            <button class="btn-primary-large" id="btnPlayAgainColors">
              Jogar Novamente 🔄
            </button>
            <button class="btn-secondary-large" id="btnNextMinigameColors">
              Outro Jogo 📐
            </button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(gameEl);
    this.rootElement = gameEl;

    this.setupInteractions(gameEl);
  }

  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private setupInteractions(gameEl: HTMLElement): void {
    // Voltar ao menu
    const btnBack = gameEl.querySelector('#btnBackToHubColors');
    btnBack?.addEventListener('click', () => {
      this.screenManager.navigateTo('home');
    });

    // Reiniciar
    const btnRestart = gameEl.querySelector('#btnRestartColors');
    btnRestart?.addEventListener('click', () => {
      audioManager.playPop();
      this.restartRound();
    });

    // Ações de vitória
    const btnPlayAgain = gameEl.querySelector('#btnPlayAgainColors');
    btnPlayAgain?.addEventListener('click', () => {
      audioManager.playPop();
      this.restartRound();
    });

    const btnNext = gameEl.querySelector('#btnNextMinigameColors');
    btnNext?.addEventListener('click', () => {
      this.screenManager.navigateTo('shapes');
    });

    // Configura Draggables
    const toys = gameEl.querySelectorAll<HTMLElement>('.draggable-toy');
    toys.forEach(toy => {
      this.setupDraggableToy(toy);
    });
  }

  private setupDraggableToy(toy: HTMLElement): void {
    let startX = 0;
    let startY = 0;
    let originalRect: DOMRect;
    let isDragging = false;
    const itemColor = toy.dataset.color || '';

    const onPointerDown = (e: PointerEvent) => {
      if (toy.classList.contains('locked')) return;

      e.preventDefault();
      toy.setPointerCapture(e.pointerId);

      isDragging = true;
      originalRect = toy.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;

      toy.classList.add('dragging');
      toy.style.transition = 'none';

      // Feedback sonoro procedural de pegar
      audioManager.playPickup();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      toy.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.18)`;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;

      try {
        toy.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora
      }

      toy.classList.remove('dragging');

      // Verifica colisão com os baldes/potes
      const buckets = this.rootElement?.querySelectorAll<HTMLElement>('.color-bucket');
      const toyCurrentRect = toy.getBoundingClientRect();
      const toyCenter = {
        x: toyCurrentRect.left + toyCurrentRect.width / 2,
        y: toyCurrentRect.top + toyCurrentRect.height / 2
      };

      let matchedBucket: HTMLElement | null = null;

      buckets?.forEach(bucket => {
        const bucketRect = bucket.getBoundingClientRect();
        // Verifica se o centro do brinquedo está sobre o balde
        if (
          toyCenter.x >= bucketRect.left - 20 &&
          toyCenter.x <= bucketRect.right + 20 &&
          toyCenter.y >= bucketRect.top - 20 &&
          toyCenter.y <= bucketRect.bottom + 20
        ) {
          if (bucket.dataset.color === itemColor) {
            matchedBucket = bucket;
          }
        }
      });

      if (matchedBucket) {
        // ACERTO!
        this.handleSnapToBucket(toy, matchedBucket as HTMLElement, toyCenter, originalRect);
        return;
      }

      // ERRO / SOLTOU FORA OU NO POTE ERRADO: Retorno suave não punitivo
      this.handleSoftReturn(toy);
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        toy.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora
      }
      toy.classList.remove('dragging');
      this.handleSoftReturn(toy);
    };

    toy.addEventListener('pointerdown', onPointerDown);
    toy.addEventListener('pointermove', onPointerMove);
    toy.addEventListener('pointerup', onPointerUp);
    toy.addEventListener('pointercancel', onPointerCancel);
  }

  private handleSnapToBucket(toy: HTMLElement, bucket: HTMLElement, _toyCenter: { x: number; y: number }, originalRect: DOMRect): void {
    toy.classList.add('locked');

    const bucketRect = bucket.getBoundingClientRect();
    const targetDeltaX = (bucketRect.left + bucketRect.width / 2) - (originalRect.left + originalRect.width / 2);
    const targetDeltaY = (bucketRect.top + bucketRect.height / 2) - (originalRect.top + originalRect.height / 2);

    toy.style.transition = 'transform 0.24s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.28s ease';
    toy.style.transform = `translate3d(${targetDeltaX}px, ${targetDeltaY}px, 0) scale(0.2)`;
    toy.style.opacity = '0';

    // Toca o acorde alegre de sino/marimba (C5, E5, G5)
    audioManager.playSnap();

    // Animação de alegria no pote
    bucket.classList.add('bucket-jump');
    setTimeout(() => {
      bucket.classList.remove('bucket-jump');
    }, 450);

    // Atualiza contagem do pote
    const colorId = bucket.dataset.color;
    const indicator = bucket.querySelector(`#indicator-${colorId}`);
    if (indicator) {
      const current = parseInt(indicator.textContent?.split('/')[0] || '0', 10) + 1;
      indicator.textContent = `${current} / 2`;
    }

    this.matchedCount++;
    if (this.matchedCount >= this.totalItems) {
      setTimeout(() => {
        this.handleStageVictory();
      }, 500);
    }
  }

  private handleSoftReturn(toy: HTMLElement): void {
    toy.style.transition = 'transform 0.32s cubic-bezier(0.25, 1, 0.5, 1)';
    toy.style.transform = 'translate3d(0, 0, 0) scale(1)';

    // Som suave de retorno
    audioManager.playReturn();
  }

  private handleStageVictory(): void {
    audioManager.playVictory();

    if (this.rootElement) {
      this.confetti.trigger(this.rootElement);
    }

    const modal = this.rootElement?.querySelector<HTMLElement>('#colorsVictoryModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('fade-in');
    }
  }

  private restartRound(): void {
    if (!this.rootElement) return;

    this.confetti.stop();
    const modal = this.rootElement.querySelector<HTMLElement>('#colorsVictoryModal');
    if (modal) {
      modal.classList.add('hidden');
    }

    const parent = this.rootElement.parentElement;
    if (parent) {
      this.unmount();
      this.mount(parent);
    }
  }

  public unmount(): void {
    this.confetti.stop();
    if (this.rootElement && this.rootElement.parentElement) {
      this.rootElement.parentElement.removeChild(this.rootElement);
    }
    this.rootElement = null;
  }
}
