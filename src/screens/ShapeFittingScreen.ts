import { Screen, ScreenId } from '../core/types.ts';
import { ScreenManager } from '../core/ScreenManager.ts';
import { audioManager } from '../audio/AudioManager.ts';
import { ConfettiCelebration } from '../components/Confetti.ts';

interface ShapeData {
  id: string;
  name: string;
  color: string;
  renderSvg: (size?: number) => string;
}

export class ShapeFittingScreen implements Screen {
  public readonly id: ScreenId = 'shapes';
  private screenManager: ScreenManager;
  private rootElement: HTMLElement | null = null;
  private confetti: ConfettiCelebration = new ConfettiCelebration();
  private matchedCount: number = 0;
  private totalShapes: number = 4;

  private shapes: ShapeData[] = [
    {
      id: 'circle',
      name: 'Círculo',
      color: '#FF5E7E',
      renderSvg: (s = 100) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <circle cx="50" cy="50" r="42" fill="#FF5E7E"/>
          <circle cx="38" cy="44" r="5" fill="#FFFFFF"/>
          <circle cx="62" cy="44" r="5" fill="#FFFFFF"/>
          <path d="M 40 58 Q 50 68 60 58" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'square',
      name: 'Quadrado',
      color: '#5AC8FA',
      renderSvg: (s = 100) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <rect x="12" y="12" width="76" height="76" rx="16" fill="#5AC8FA"/>
          <circle cx="38" cy="44" r="5" fill="#FFFFFF"/>
          <circle cx="62" cy="44" r="5" fill="#FFFFFF"/>
          <path d="M 40 58 Q 50 68 60 58" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'triangle',
      name: 'Triângulo',
      color: '#4CD964',
      renderSvg: (s = 100) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <polygon points="50,14 12,84 88,84" rx="10" fill="#4CD964"/>
          <circle cx="42" cy="54" r="4.5" fill="#FFFFFF"/>
          <circle cx="58" cy="54" r="4.5" fill="#FFFFFF"/>
          <path d="M 44 65 Q 50 72 56 65" stroke="#FFFFFF" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'star',
      name: 'Estrela',
      color: '#FFB800',
      renderSvg: (s = 100) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <path d="M 50 12 L 61 36 L 88 38 L 68 56 L 74 82 L 50 68 L 26 82 L 32 56 L 12 38 L 39 36 Z" fill="#FFB800"/>
          <circle cx="43" cy="46" r="4" fill="#6A4700"/>
          <circle cx="57" cy="46" r="4" fill="#6A4700"/>
          <path d="M 45 55 Q 50 60 55 55" stroke="#6A4700" stroke-width="3" fill="none" stroke-linecap="round"/>
        </svg>`
    }
  ];

  constructor(screenManager: ScreenManager) {
    this.screenManager = screenManager;
  }

  public mount(container: HTMLElement): void {
    this.matchedCount = 0;

    const gameEl = document.createElement('div');
    gameEl.className = 'game-screen minigame-shapes';
    gameEl.innerHTML = `
      <!-- Barra Superior -->
      <nav class="game-navbar">
        <button class="back-button" id="btnBackToHub" aria-label="Voltar ao Menu">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>Menu</span>
        </button>

        <div class="game-instruction">
          <span class="instruction-badge">Minijogo 1</span>
          <h2>Encaixe cada forma no lugar certo!</h2>
        </div>

        <button class="action-btn-restart" id="btnRestartShapes" title="Recomeçar">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </nav>

      <!-- Área de Encaixe (Slots Silhuetas) -->
      <div class="shapes-board">
        <div class="slots-container" id="slotsContainer">
          ${this.shapes.map(shape => `
            <div class="shape-slot" data-shape="${shape.id}" id="slot-${shape.id}">
              <div class="slot-silhouette">
                ${shape.renderSvg(90)}
              </div>
              <span class="slot-label">${shape.name}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Bandeja Inferior com as Peças Arrastáveis -->
      <div class="shapes-tray-area">
        <div class="shapes-tray" id="shapesTray">
          ${this.shuffle([...this.shapes]).map(shape => `
            <div class="draggable-piece" data-shape="${shape.id}" id="piece-${shape.id}">
              ${shape.renderSvg(90)}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Modal de Vitória -->
      <div class="victory-modal hidden" id="shapesVictoryModal">
        <div class="victory-card">
          <div class="victory-stars">⭐⭐⭐</div>
          <h2>Muito Bem!</h2>
          <p>Você encaixou todas as formas direitinho!</p>
          <div class="victory-actions">
            <button class="btn-primary-large" id="btnPlayAgainShapes">
              Jogar Novamente 🔄
            </button>
            <button class="btn-secondary-large" id="btnNextMinigame">
              Outro Jogo 🎨
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
    const btnBack = gameEl.querySelector('#btnBackToHub');
    btnBack?.addEventListener('click', () => {
      this.screenManager.navigateTo('home');
    });

    // Reiniciar
    const btnRestart = gameEl.querySelector('#btnRestartShapes');
    btnRestart?.addEventListener('click', () => {
      audioManager.playPop();
      this.restartRound();
    });

    // Ações de vitória
    const btnPlayAgain = gameEl.querySelector('#btnPlayAgainShapes');
    btnPlayAgain?.addEventListener('click', () => {
      audioManager.playPop();
      this.restartRound();
    });

    const btnNext = gameEl.querySelector('#btnNextMinigame');
    btnNext?.addEventListener('click', () => {
      this.screenManager.navigateTo('colors');
    });

    // Configura Draggable Pieces com Pointer Events (perfeito para touch infantil)
    const pieces = gameEl.querySelectorAll<HTMLElement>('.draggable-piece');
    pieces.forEach(piece => {
      this.setupDraggablePiece(piece);
    });
  }

  private setupDraggablePiece(piece: HTMLElement): void {
    let startX = 0;
    let startY = 0;
    let originalRect: DOMRect;
    let isDragging = false;
    const shapeId = piece.dataset.shape || '';

    const onPointerDown = (e: PointerEvent) => {
      if (piece.classList.contains('locked')) return;

      e.preventDefault();
      piece.setPointerCapture(e.pointerId);

      isDragging = true;
      originalRect = piece.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;

      piece.classList.add('dragging');
      piece.style.transition = 'none';

      // Feedback sonoro procedural de pegar
      audioManager.playPickup();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      piece.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.15)`;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;

      try {
        piece.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora caso pointer capture já tenha sido liberado
      }

      piece.classList.remove('dragging');

      // Verifica colisão com o slot correspondente
      const slot = this.rootElement?.querySelector<HTMLElement>(`#slot-${shapeId}`);
      if (slot) {
        const slotRect = slot.getBoundingClientRect();
        const pieceCurrentRect = piece.getBoundingClientRect();

        const slotCenter = {
          x: slotRect.left + slotRect.width / 2,
          y: slotRect.top + slotRect.height / 2
        };

        const pieceCenter = {
          x: pieceCurrentRect.left + pieceCurrentRect.width / 2,
          y: pieceCurrentRect.top + pieceCurrentRect.height / 2
        };

        const dist = Math.hypot(slotCenter.x - pieceCenter.x, slotCenter.y - pieceCenter.y);
        
        // Tolerância generosa para crianças pequenas (95 pixels)
        const hitDistance = Math.max(95, slotRect.width * 0.75);

        if (dist <= hitDistance) {
          // ACERTO!
          this.handleSnapSuccess(piece, slot, slotCenter, originalRect);
          return;
        }
      }

      // ERRO / SOLTOU FORA: Retorno suave não punitivo
      this.handleSoftReturn(piece);
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        piece.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora
      }
      piece.classList.remove('dragging');
      this.handleSoftReturn(piece);
    };

    piece.addEventListener('pointerdown', onPointerDown);
    piece.addEventListener('pointermove', onPointerMove);
    piece.addEventListener('pointerup', onPointerUp);
    piece.addEventListener('pointercancel', onPointerCancel);
  }

  private handleSnapSuccess(piece: HTMLElement, slot: HTMLElement, slotCenter: { x: number; y: number }, originalRect: DOMRect): void {
    piece.classList.add('locked');
    slot.classList.add('solved');

    // Deslocamento para centrar perfeitamente no slot
    const targetDeltaX = slotCenter.x - (originalRect.left + originalRect.width / 2);
    const targetDeltaY = slotCenter.y - (originalRect.top + originalRect.height / 2);

    piece.style.transition = 'transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    piece.style.transform = `translate3d(${targetDeltaX}px, ${targetDeltaY}px, 0) scale(1.05)`;

    // Toca som de acerto brilhante (acorde C5, E5, G5 de marimba/sino)
    audioManager.playSnap();

    // Animação de pulso no slot
    slot.classList.add('pop-anim');
    setTimeout(() => {
      slot.classList.remove('pop-anim');
    }, 400);

    this.matchedCount++;
    if (this.matchedCount >= this.totalShapes) {
      setTimeout(() => {
        this.handleStageVictory();
      }, 450);
    }
  }

  private handleSoftReturn(piece: HTMLElement): void {
    // Retorno suave com física fofa
    piece.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
    piece.style.transform = 'translate3d(0, 0, 0) scale(1)';

    // Som de glissando suave e acolhedor (não punitivo)
    audioManager.playReturn();
  }

  private handleStageVictory(): void {
    // Toca fanfarra de vitória
    audioManager.playVictory();

    // Dispara confetes
    if (this.rootElement) {
      this.confetti.trigger(this.rootElement);
    }

    // Exibe modal de vitória
    const modal = this.rootElement?.querySelector<HTMLElement>('#shapesVictoryModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('fade-in');
    }
  }

  private restartRound(): void {
    if (!this.rootElement) return;

    this.confetti.stop();
    const modal = this.rootElement.querySelector<HTMLElement>('#shapesVictoryModal');
    if (modal) {
      modal.classList.add('hidden');
    }

    // Recria e remonta a tela
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
