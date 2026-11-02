import { Screen, ScreenId } from '../core/types.ts';
import { ScreenManager } from '../core/ScreenManager.ts';
import { audioManager } from '../audio/AudioManager.ts';
import { ConfettiCelebration } from '../components/Confetti.ts';

interface ShapeData {
  id: 'circle' | 'square' | 'triangle' | 'star';
  name: string;
  color: string;
  renderPieceSvg: (size?: number) => string;
  renderSilhouetteSvg: (size?: number) => string;
}

export class ShapeFittingScreen implements Screen {
  public readonly id: ScreenId = 'shapes';
  private screenManager: ScreenManager;
  private rootElement: HTMLElement | null = null;
  private confetti: ConfettiCelebration = new ConfettiCelebration();

  private currentRound: number = 1;
  private matchedCount: number = 0;
  private currentShapes: ShapeData[] = [];
  private nextRoundTimer: number | null = null;

  // Controle estrito de toque único / rejeição de palma da mão
  private activePointerId: number | null = null;
  private activePiece: HTMLElement | null = null;

  /**
   * Catálogo de formas geométricas básicas com as cores especificadas:
   * - Vermelho: #EF4444 (Círculo)
   * - Azul: #3B82F6 (Quadrado)
   * - Verde: #10B981 (Triângulo)
   * - Amarelo: #F59E0B (Estrela)
   */
  private readonly allShapes: ShapeData[] = [
    {
      id: 'circle',
      name: 'Círculo',
      color: '#EF4444',
      renderPieceSvg: (s = 90) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <circle cx="50" cy="50" r="42" fill="#EF4444" stroke="#DC2626" stroke-width="3"/>
          <circle cx="38" cy="44" r="5" fill="#FFFFFF"/>
          <circle cx="62" cy="44" r="5" fill="#FFFFFF"/>
          <circle cx="39" cy="45" r="2.5" fill="#991B1B"/>
          <circle cx="63" cy="45" r="2.5" fill="#991B1B"/>
          <path d="M 40 58 Q 50 68 60 58" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
          <ellipse cx="32" cy="50" rx="3.5" ry="2" fill="#FCA5A5"/>
          <ellipse cx="68" cy="50" rx="3.5" ry="2" fill="#FCA5A5"/>
        </svg>`,
      renderSilhouetteSvg: (s = 85) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <circle cx="50" cy="50" r="40" fill="#CBD5E1" stroke="#94A3B8" stroke-width="3" stroke-dasharray="6 4"/>
        </svg>`
    },
    {
      id: 'square',
      name: 'Quadrado',
      color: '#3B82F6',
      renderPieceSvg: (s = 90) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <rect x="14" y="14" width="72" height="72" rx="16" fill="#3B82F6" stroke="#2563EB" stroke-width="3"/>
          <circle cx="38" cy="44" r="5" fill="#FFFFFF"/>
          <circle cx="62" cy="44" r="5" fill="#FFFFFF"/>
          <circle cx="39" cy="45" r="2.5" fill="#1E40AF"/>
          <circle cx="63" cy="45" r="2.5" fill="#1E40AF"/>
          <path d="M 40 58 Q 50 68 60 58" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
          <ellipse cx="32" cy="50" rx="3.5" ry="2" fill="#93C5FD"/>
          <ellipse cx="68" cy="50" rx="3.5" ry="2" fill="#93C5FD"/>
        </svg>`,
      renderSilhouetteSvg: (s = 85) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <rect x="15" y="15" width="70" height="70" rx="16" fill="#CBD5E1" stroke="#94A3B8" stroke-width="3" stroke-dasharray="6 4"/>
        </svg>`
    },
    {
      id: 'triangle',
      name: 'Triângulo',
      color: '#10B981',
      renderPieceSvg: (s = 90) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <polygon points="50,14 14,84 86,84" fill="#10B981" stroke="#059669" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="42" cy="54" r="4.5" fill="#FFFFFF"/>
          <circle cx="58" cy="54" r="4.5" fill="#FFFFFF"/>
          <circle cx="43" cy="55" r="2.5" fill="#065F46"/>
          <circle cx="59" cy="55" r="2.5" fill="#065F46"/>
          <path d="M 44 65 Q 50 72 56 65" stroke="#FFFFFF" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <ellipse cx="36" cy="61" rx="3.5" ry="2" fill="#A7F3D0"/>
          <ellipse cx="64" cy="61" rx="3.5" ry="2" fill="#A7F3D0"/>
        </svg>`,
      renderSilhouetteSvg: (s = 85) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <polygon points="50,16 16,83 84,83" fill="#CBD5E1" stroke="#94A3B8" stroke-width="3" stroke-linejoin="round" stroke-dasharray="6 4"/>
        </svg>`
    },
    {
      id: 'star',
      name: 'Estrela',
      color: '#F59E0B',
      renderPieceSvg: (s = 90) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <path d="M 50 12 L 61 36 L 88 38 L 68 56 L 74 82 L 50 68 L 26 82 L 32 56 L 12 38 L 39 36 Z" fill="#F59E0B" stroke="#D97706" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="43" cy="46" r="4" fill="#78350F"/>
          <circle cx="57" cy="46" r="4" fill="#78350F"/>
          <circle cx="44" cy="46" r="1.5" fill="#FFFFFF"/>
          <circle cx="58" cy="46" r="1.5" fill="#FFFFFF"/>
          <path d="M 45 55 Q 50 60 55 55" stroke="#78350F" stroke-width="3" fill="none" stroke-linecap="round"/>
          <ellipse cx="37" cy="51" rx="3" ry="1.8" fill="#FDE68A"/>
          <ellipse cx="63" cy="51" rx="3" ry="1.8" fill="#FDE68A"/>
        </svg>`,
      renderSilhouetteSvg: (s = 85) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <path d="M 50 13 L 60 36 L 86 38 L 67 55 L 73 80 L 50 67 L 27 80 L 33 55 L 14 38 L 40 36 Z" fill="#CBD5E1" stroke="#94A3B8" stroke-width="3" stroke-linejoin="round" stroke-dasharray="6 4"/>
        </svg>`
    }
  ];

  constructor(screenManager: ScreenManager) {
    this.screenManager = screenManager;
  }

  public mount(container: HTMLElement): void {
    this.currentRound = 1;

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
          <span class="instruction-badge" id="roundBadge">Rodada 1 • 3 Formas</span>
          <h2>Encaixe cada forma no lugar certo!</h2>
        </div>

        <button class="action-btn-restart" id="btnRestartShapes" title="Recomeçar jogo">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </nav>

      <!-- Área de Jogo (Slots Superiores e Bandeja Inferior) -->
      <div class="shapes-board" id="shapesBoard">
        <!-- Preenchido dinamicamente por renderRound() -->
      </div>
    `;

    container.appendChild(gameEl);
    this.rootElement = gameEl;

    // Configura botões de navegação e reinício
    const btnBack = gameEl.querySelector('#btnBackToHub');
    btnBack?.addEventListener('click', () => {
      this.clearTimers();
      this.screenManager.navigateTo('home');
    });

    const btnRestart = gameEl.querySelector('#btnRestartShapes');
    btnRestart?.addEventListener('click', () => {
      this.clearTimers();
      audioManager.playPop();
      this.currentRound = 1;
      this.startRound(this.currentRound);
    });

    // Inicia a primeira rodada
    this.startRound(this.currentRound);
  }

  /**
   * Configura e inicia uma rodada (3 ou 4 formas)
   * - Rodada 1: 3 formas (Círculo, Quadrado, Triângulo)
   * - Rodada 2: 4 formas (Círculo, Quadrado, Triângulo, Estrela)
   * - Rodada 3+: Alternância dinâmica com ordens embaralhadas
   */
  private startRound(roundNum: number): void {
    this.clearTimers();
    this.matchedCount = 0;
    this.activePointerId = null;
    this.activePiece = null;

    // Seleciona 3 ou 4 formas para a rodada
    if (roundNum === 1) {
      // Rodada 1: 3 formas básicas
      this.currentShapes = [this.allShapes[0], this.allShapes[1], this.allShapes[2]];
    } else if (roundNum === 2) {
      // Rodada 2: todas as 4 formas
      this.currentShapes = [...this.allShapes];
    } else {
      // Rodadas 3+: alterna entre 3 e 4 formas aleatórias
      const count = roundNum % 2 === 1 ? 3 : 4;
      this.currentShapes = this.shuffle([...this.allShapes]).slice(0, count);
    }

    // Atualiza o crachá de rodada
    const badge = this.rootElement?.querySelector('#roundBadge');
    if (badge) {
      badge.textContent = `Rodada ${roundNum} • ${this.currentShapes.length} Formas ⭐`;
    }

    // Renderiza os slots superiores e as peças inferiores embaralhadas
    this.renderRoundDOM();
  }

  /**
   * Constrói o DOM dos slots superiores e da bandeja inferior
   */
  private renderRoundDOM(): void {
    const board = this.rootElement?.querySelector<HTMLElement>('#shapesBoard');
    if (!board) return;

    // Peças da bandeja são embaralhadas para desafiar a criança
    const shuffledPieces = this.shuffle([...this.currentShapes]);

    board.innerHTML = `
      <!-- Parte Superior: 3 a 4 alvos/silhuetas vazadas (#E2E8F0 com contorno tracejado) -->
      <div class="slots-container" id="slotsContainer">
        ${this.currentShapes.map(shape => `
          <div class="shape-slot" data-shape="${shape.id}" id="slot-${shape.id}">
            <div class="slot-silhouette">
              ${shape.renderSilhouetteSvg(90)}
            </div>
            <span class="slot-label">${shape.name}</span>
          </div>
        `).join('')}
      </div>

      <!-- Parte Inferior: Peças coloridas correspondentes embaralhadas -->
      <div class="shapes-tray-area">
        <div class="shapes-tray" id="shapesTray">
          ${shuffledPieces.map(shape => `
            <div class="draggable-piece" data-shape="${shape.id}" id="piece-${shape.id}" style="touch-action: none;">
              ${shape.renderPieceSvg(90)}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Vincula o sistema de Drag and Drop tolerante a cada peça
    const pieces = board.querySelectorAll<HTMLElement>('.draggable-piece');
    pieces.forEach(piece => {
      this.setupDraggablePiece(piece);
    });
  }

  /**
   * Sistema de Drag-and-Drop Tolerante com Pointer Events:
   * - setPointerCapture para travar arrasto em 1 dedo e rejeitar toques da palma da mão
   * - scale(1.15) e sombra proeminente ao agarrar
   * - Snap magnético euclidiano com tolerância de < 70px
   * - Interpolação suave e áudio de retorno ao errar
   */
  private setupDraggablePiece(piece: HTMLElement): void {
    let startX = 0;
    let startY = 0;
    let originalRect: DOMRect;
    let isDragging = false;
    const shapeId = piece.dataset.shape as ShapeData['id'];

    const onPointerDown = (e: PointerEvent) => {
      // Ignora se a peça já estiver travada/encaixada
      if (piece.classList.contains('locked')) return;

      // Rejeição de palma da mão e múltiplos toques simultâneos:
      // Se já houver um arrasto em andamento com outro ponteiro, ignora este toque
      if (this.activePointerId !== null) return;
      if (!e.isPrimary) return;

      e.preventDefault();

      // Trava o arrasto exclusivamente neste ponteiro
      this.activePointerId = e.pointerId;
      this.activePiece = piece;
      try {
        piece.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn('Pointer capture error:', err);
      }

      isDragging = true;
      originalRect = piece.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;

      // Feedback visual ao ser agarrada: scale 1.15 e sombra
      piece.classList.add('dragging');
      piece.style.transition = 'none';
      piece.style.transform = `translate3d(0, 0, 0) scale(1.15)`;

      // Som procedural alegre de pegar (pickup)
      audioManager.playPickup();
    };

    const onPointerMove = (e: PointerEvent) => {
      // Garante que apenas o ponteiro ativo capturado processe o movimento
      if (!isDragging || this.activePointerId !== e.pointerId || this.activePiece !== piece) {
        return;
      }
      e.preventDefault();

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Move a peça mantendo a escala ampliada (1.15)
      piece.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.15)`;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging || this.activePointerId !== e.pointerId || this.activePiece !== piece) {
        return;
      }
      isDragging = false;

      // Libera a captura do ponteiro
      try {
        piece.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora caso já liberado
      }
      this.activePointerId = null;
      this.activePiece = null;

      piece.classList.remove('dragging');

      // Localiza o alvo/silhueta correspondente a esta forma
      const targetSlot = this.rootElement?.querySelector<HTMLElement>(`#slot-${shapeId}`);
      if (targetSlot) {
        const targetRect = targetSlot.getBoundingClientRect();
        const pieceCurrentRect = piece.getBoundingClientRect();

        // Centros exatos da silhueta e da peça
        const targetCenter = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2
        };

        const pieceCenter = {
          x: pieceCurrentRect.left + pieceCurrentRect.width / 2,
          y: pieceCurrentRect.top + pieceCurrentRect.height / 2
        };

        // Distância euclidiana entre o centro da peça e o centro do alvo correto
        const dist = Math.hypot(targetCenter.x - pieceCenter.x, targetCenter.y - pieceCenter.y);

        // Tolerância magnética (Snap): se distância < 70px (área generosa para 3 a 5 anos)
        if (dist < 70) {
          this.handleSnapSuccess(piece, targetSlot, targetCenter, originalRect);
          return;
        }
      }

      // Caso contrário (soltou fora ou longe do alvo correto):
      // Interpolação suave de volta à posição inicial na bandeja com áudio suave de retorno
      this.handleSoftReturn(piece);
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (this.activePointerId === e.pointerId) {
        try {
          piece.releasePointerCapture(e.pointerId);
        } catch {
          // Ignora
        }
        this.activePointerId = null;
        this.activePiece = null;
        isDragging = false;
        piece.classList.remove('dragging');
        this.handleSoftReturn(piece);
      }
    };

    piece.addEventListener('pointerdown', onPointerDown);
    piece.addEventListener('pointermove', onPointerMove);
    piece.addEventListener('pointerup', onPointerUp);
    piece.addEventListener('pointercancel', onPointerCancel);
  }

  /**
   * Acerto / Snap Magnético:
   * Trava na posição do alvo, desativa novos arrastos, toca som de snap e aplica 'pulso/bounce'
   */
  private handleSnapSuccess(
    piece: HTMLElement,
    targetSlot: HTMLElement,
    targetCenter: { x: number; y: number },
    originalRect: DOMRect
  ): void {
    piece.classList.add('locked');
    targetSlot.classList.add('solved');

    // Deslocamento exato da posição original para o centro do alvo
    const targetDeltaX = targetCenter.x - (originalRect.left + originalRect.width / 2);
    const targetDeltaY = targetCenter.y - (originalRect.top + originalRect.height / 2);

    // Encaixe suave com leve amortecimento
    piece.style.transition = 'transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    piece.style.transform = `translate3d(${targetDeltaX}px, ${targetDeltaY}px, 0) scale(1)`;

    // Dispara o som de acerto (acorde maior brilhante de sino/marimba: C5, E5, G5)
    audioManager.playSnap();

    // Aplica efeito visual de 'pulso/bounce'
    targetSlot.classList.remove('pulse-bounce');
    piece.classList.remove('pulse-bounce');
    void targetSlot.offsetWidth; // Força reflow para reiniciar animação
    targetSlot.classList.add('pulse-bounce');
    piece.classList.add('pulse-bounce');

    this.matchedCount++;

    // Verifica se completou todas as formas da rodada
    if (this.matchedCount >= this.currentShapes.length) {
      this.handleRoundVictory();
    }
  }

  /**
   * Retorno suave não punitivo quando solto fora ou em alvo incorreto
   */
  private handleSoftReturn(piece: HTMLElement): void {
    // Interpolação suave de volta à posição de repouso na bandeja inferior
    piece.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
    piece.style.transform = 'translate3d(0, 0, 0) scale(1)';

    // Som carinhoso de retorno (glissando descendente suave e acolhedor)
    audioManager.playReturn();
  }

  /**
   * Vitória e passagem automática para a próxima rodada após 2 segundos
   */
  private handleRoundVictory(): void {
    // Toca fanfarra festiva de vitória
    audioManager.playVictory();

    // Dispara explosão de confetes e estrelas via Canvas em overlay
    if (this.rootElement) {
      this.confetti.trigger(this.rootElement, 2500);
    }

    // Exibe banner de celebração da rodada
    const board = this.rootElement?.querySelector<HTMLElement>('#shapesBoard');
    if (board) {
      const banner = document.createElement('div');
      banner.className = 'round-complete-banner pop-anim';
      banner.id = 'roundCompleteBanner';
      banner.innerHTML = `
        <h3>🎉 Muito Bem!</h3>
        <p>Rodada ${this.currentRound} Concluída! ⭐⭐⭐</p>
      `;
      board.appendChild(banner);
    }

    // Avança para a próxima rodada após exatamente 2 segundos
    this.nextRoundTimer = window.setTimeout(() => {
      this.currentRound++;
      this.startRound(this.currentRound);
    }, 2000);
  }

  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private clearTimers(): void {
    if (this.nextRoundTimer !== null) {
      clearTimeout(this.nextRoundTimer);
      this.nextRoundTimer = null;
    }
    this.confetti.stop();
  }

  public unmount(): void {
    this.clearTimers();
    if (this.rootElement && this.rootElement.parentElement) {
      this.rootElement.parentElement.removeChild(this.rootElement);
    }
    this.rootElement = null;
  }
}
