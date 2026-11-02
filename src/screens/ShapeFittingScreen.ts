import { Screen, ScreenId } from '../core/types.ts';
import { ScreenManager } from '../core/ScreenManager.ts';
import { audioManager } from '../audio/AudioManager.ts';
import { ParticleSystem } from '../components/ParticleSystem.ts';
import { ConfirmModal } from '../components/ConfirmModal.ts';
import { ProgressManager, ShapeLevelConfig } from '../game/ProgressManager.ts';

interface ShapeData {
  id: 'circle' | 'square' | 'triangle' | 'star' | 'rectangle' | 'diamond';
  name: string;
  color: string;
  tintBg: string;
  tintBorder: string;
  renderPieceSvg: (size?: number) => string;
  renderSilhouetteSvg: (size?: number, assistMode?: string) => string;
}

export class ShapeFittingScreen implements Screen {
  public readonly id: ScreenId = 'shapes';
  private screenManager: ScreenManager;
  private rootElement: HTMLElement | null = null;
  private confetti: ParticleSystem = new ParticleSystem();
  private progress: ProgressManager = new ProgressManager(1);

  private currentShapes: ShapeData[] = [];
  private matchedCount: number = 0;
  private nextRoundTimer: number | null = null;
  private levelUpTimer: number | null = null;
  private isRoundComplete: boolean = false;

  // AbortController para revogação limpa de todos os listeners de toque anteriores
  private roundAbortController: AbortController | null = null;

  // Controle estrito de toque único / rejeição de palma da mão
  private activePointerId: number | null = null;
  private activePiece: HTMLElement | null = null;

  // IDs para cancelamento de timers e animações de redimensionamento
  private resizeRafId: number | null = null;
  private resizeTimeoutId: number | null = null;

  private handleResize = () => {
    if (this.resizeTimeoutId !== null) {
      clearTimeout(this.resizeTimeoutId);
    }
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }

    this.resizeTimeoutId = window.setTimeout(() => {
      this.resizeRafId = requestAnimationFrame(() => {
        this.recalibratePositions();
        this.resizeRafId = null;
      });
    }, 120);
  };

  /**
   * Catálogo completo de formas e cores para todos os níveis:
   * - Nível 1: Círculo (Vermelho), Quadrado (Azul), Triângulo (Amarelo)
   * - Nível 2: Adiciona Estrela (Verde) e Retângulo (Laranja)
   * - Nível 3: Adiciona Losango (Roxo) e nuances
   */
  private readonly allShapes: ShapeData[] = [
    {
      id: 'circle',
      name: 'Círculo',
      color: '#EF4444',
      tintBg: '#FEE2E2',
      tintBorder: '#EF4444',
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
      renderSilhouetteSvg: (s = 85, mode = 'dashed-gray') => {
        const fill = mode === 'color-tint' ? '#EF4444' : mode === 'monochrome' ? 'none' : '#CBD5E1';
        const stroke = mode === 'color-tint' ? '#EF4444' : '#94A3B8';
        return `
          <svg viewBox="0 0 100 100" width="${s}" height="${s}">
            <circle cx="50" cy="50" r="40" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-dasharray="${mode === 'monochrome' ? 'none' : '6 4'}"/>
          </svg>`;
      }
    },
    {
      id: 'square',
      name: 'Quadrado',
      color: '#3B82F6',
      tintBg: '#DBEAFE',
      tintBorder: '#3B82F6',
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
      renderSilhouetteSvg: (s = 85, mode = 'dashed-gray') => {
        const fill = mode === 'color-tint' ? '#3B82F6' : mode === 'monochrome' ? 'none' : '#CBD5E1';
        const stroke = mode === 'color-tint' ? '#3B82F6' : '#94A3B8';
        return `
          <svg viewBox="0 0 100 100" width="${s}" height="${s}">
            <rect x="15" y="15" width="70" height="70" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-dasharray="${mode === 'monochrome' ? 'none' : '6 4'}"/>
          </svg>`;
      }
    },
    {
      id: 'triangle',
      name: 'Triângulo',
      color: '#F59E0B',
      tintBg: '#FEF3C7',
      tintBorder: '#F59E0B',
      renderPieceSvg: (s = 90) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <polygon points="50,14 14,84 86,84" fill="#F59E0B" stroke="#D97706" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="42" cy="54" r="4.5" fill="#FFFFFF"/>
          <circle cx="58" cy="54" r="4.5" fill="#FFFFFF"/>
          <circle cx="43" cy="55" r="2.5" fill="#78350F"/>
          <circle cx="59" cy="55" r="2.5" fill="#78350F"/>
          <path d="M 44 65 Q 50 72 56 65" stroke="#FFFFFF" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <ellipse cx="36" cy="61" rx="3.5" ry="2" fill="#FDE68A"/>
          <ellipse cx="64" cy="61" rx="3.5" ry="2" fill="#FDE68A"/>
        </svg>`,
      renderSilhouetteSvg: (s = 85, mode = 'dashed-gray') => {
        const fill = mode === 'color-tint' ? '#F59E0B' : mode === 'monochrome' ? 'none' : '#CBD5E1';
        const stroke = mode === 'color-tint' ? '#F59E0B' : '#94A3B8';
        return `
          <svg viewBox="0 0 100 100" width="${s}" height="${s}">
            <polygon points="50,16 16,83 84,83" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" stroke-dasharray="${mode === 'monochrome' ? 'none' : '6 4'}"/>
          </svg>`;
      }
    },
    {
      id: 'star',
      name: 'Estrela',
      color: '#10B981',
      tintBg: '#D1FAE5',
      tintBorder: '#10B981',
      renderPieceSvg: (s = 90) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <path d="M 50 12 L 61 36 L 88 38 L 68 56 L 74 82 L 50 68 L 26 82 L 32 56 L 12 38 L 39 36 Z" fill="#10B981" stroke="#059669" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="43" cy="46" r="4" fill="#064E3B"/>
          <circle cx="57" cy="46" r="4" fill="#064E3B"/>
          <circle cx="44" cy="46" r="1.5" fill="#FFFFFF"/>
          <circle cx="58" cy="46" r="1.5" fill="#FFFFFF"/>
          <path d="M 45 55 Q 50 60 55 55" stroke="#064E3B" stroke-width="3" fill="none" stroke-linecap="round"/>
          <ellipse cx="37" cy="51" rx="3" ry="1.8" fill="#A7F3D0"/>
          <ellipse cx="63" cy="51" rx="3" ry="1.8" fill="#A7F3D0"/>
        </svg>`,
      renderSilhouetteSvg: (s = 85, mode = 'dashed-gray') => {
        const fill = mode === 'color-tint' ? '#10B981' : mode === 'monochrome' ? 'none' : '#CBD5E1';
        const stroke = mode === 'color-tint' ? '#10B981' : '#94A3B8';
        return `
          <svg viewBox="0 0 100 100" width="${s}" height="${s}">
            <path d="M 50 13 L 60 36 L 86 38 L 67 55 L 73 80 L 50 67 L 27 80 L 33 55 L 14 38 L 40 36 Z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" stroke-dasharray="${mode === 'monochrome' ? 'none' : '6 4'}"/>
          </svg>`;
      }
    },
    {
      id: 'rectangle',
      name: 'Retângulo',
      color: '#F97316',
      tintBg: '#FFEDD5',
      tintBorder: '#F97316',
      renderPieceSvg: (s = 90) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <rect x="8" y="24" width="84" height="52" rx="14" fill="#F97316" stroke="#EA580C" stroke-width="3"/>
          <circle cx="36" cy="46" r="4.5" fill="#FFFFFF"/>
          <circle cx="64" cy="46" r="4.5" fill="#FFFFFF"/>
          <circle cx="37" cy="47" r="2.5" fill="#9A3412"/>
          <circle cx="65" cy="47" r="2.5" fill="#9A3412"/>
          <path d="M 42 58 Q 50 64 58 58" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round"/>
          <ellipse cx="28" cy="52" rx="3.5" ry="2" fill="#FDBA74"/>
          <ellipse cx="72" cy="52" rx="3.5" ry="2" fill="#FDBA74"/>
        </svg>`,
      renderSilhouetteSvg: (s = 85, mode = 'dashed-gray') => {
        const fill = mode === 'color-tint' ? '#F97316' : mode === 'monochrome' ? 'none' : '#CBD5E1';
        const stroke = mode === 'color-tint' ? '#F97316' : '#94A3B8';
        return `
          <svg viewBox="0 0 100 100" width="${s}" height="${s}">
            <rect x="9" y="25" width="82" height="50" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-dasharray="${mode === 'monochrome' ? 'none' : '6 4'}"/>
          </svg>`;
      }
    },
    {
      id: 'diamond',
      name: 'Losango',
      color: '#8B5CF6',
      tintBg: '#EDE9FE',
      tintBorder: '#8B5CF6',
      renderPieceSvg: (s = 90) => `
        <svg viewBox="0 0 100 100" width="${s}" height="${s}">
          <polygon points="50,12 88,50 50,88 12,50" fill="#8B5CF6" stroke="#7C3AED" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="42" cy="46" r="4" fill="#FFFFFF"/>
          <circle cx="58" cy="46" r="4" fill="#FFFFFF"/>
          <circle cx="43" cy="47" r="2" fill="#4C1D95"/>
          <circle cx="59" cy="47" r="2" fill="#4C1D95"/>
          <path d="M 44 56 Q 50 62 56 56" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round"/>
          <ellipse cx="32" cy="52" rx="3.5" ry="2" fill="#C4B5FD"/>
          <ellipse cx="68" cy="52" rx="3.5" ry="2" fill="#C4B5FD"/>
        </svg>`,
      renderSilhouetteSvg: (s = 85, mode = 'dashed-gray') => {
        const fill = mode === 'color-tint' ? '#8B5CF6' : mode === 'monochrome' ? 'none' : '#CBD5E1';
        const stroke = mode === 'color-tint' ? '#8B5CF6' : '#94A3B8';
        return `
          <svg viewBox="0 0 100 100" width="${s}" height="${s}">
            <polygon points="50,14 86,50 50,86 14,50" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" stroke-dasharray="${mode === 'monochrome' ? 'none' : '6 4'}"/>
          </svg>`;
      }
    }
  ];

  constructor(screenManager: ScreenManager) {
    this.screenManager = screenManager;
  }

  public mount(container: HTMLElement): void {
    const gameEl = document.createElement('div');
    gameEl.className = 'game-screen minigame-shapes';
    gameEl.innerHTML = `
      <!-- Barra Superior com HUD de Progresso de 3 Estrelas e Nível -->
      <nav class="game-navbar">
        <button class="back-button" id="btnBackToHub" aria-label="Voltar ao Menu">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>Menu</span>
        </button>

        <!-- HUD Central: Nível Atual + Medidor Lúdico de 3 Estrelas -->
        <div class="hud-center-progress">
          <div class="hud-level-pill" id="hudLevelBadge">
            ${this.progress.getLevelLabel()}
          </div>
          <div class="hud-level-stars" id="hudLevelStars" title="Vença 3 rodadas para subir de nível!">
            <span class="hud-star" data-star-index="0">★</span>
            <span class="hud-star" data-star-index="1">★</span>
            <span class="hud-star" data-star-index="2">★</span>
          </div>
        </div>

        <button class="action-btn-restart" id="btnRestartShapes" title="Recomeçar do início">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </nav>

      <!-- Área de Jogo (Slots Superiores e Bandeja Inferior) -->
      <div class="shapes-board" id="shapesBoard">
        <!-- Renderizado dinamicamente por renderRoundDOM() -->
      </div>
    `;

    container.appendChild(gameEl);
    this.rootElement = gameEl;

    // Configura botões de navegação e reinício
    const btnBack = gameEl.querySelector('#btnBackToHub');
    btnBack?.addEventListener('click', () => {
      audioManager.playPop();
      ConfirmModal.show({
        container: this.rootElement || document.body,
        title: 'Voltar para o Menu?',
        message: 'Quer escolher outra brincadeira ou continuar aqui?',
        confirmText: 'Sim, ir ao Menu 🏠',
        cancelText: 'Continuar Brincando! ▶️',
        onConfirm: () => {
          this.clearTimers();
          this.screenManager.navigateTo('home');
        }
      });
    });

    const btnRestart = gameEl.querySelector('#btnRestartShapes');
    btnRestart?.addEventListener('click', () => {
      this.clearTimers();
      audioManager.playPop();
      this.progress.resetToStart();
      this.startRound();
    });

    // Registra listeners de redimensionamento proporcional
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);

    // Inicia a primeira rodada
    this.startRound();
  }

  /**
   * Recalcula proporcionalmente as posições das peças e alvos
   */
  private recalibratePositions(): void {
    if (!this.rootElement) return;
    const containerRect = this.rootElement.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;

    const pieces = Array.from(this.rootElement.querySelectorAll<HTMLElement>('.draggable-piece'));
    const lockedPieces = pieces.filter(p => p.classList.contains('locked'));

    // FASE 1: Reset temporário
    lockedPieces.forEach(p => {
      p.style.transition = 'none';
      p.style.transform = 'translate3d(0, 0, 0) scale(1)';
    });

    // FASE 2: Leitura das novas coordenadas
    const pieceOriginalRects = lockedPieces.map(p => p.getBoundingClientRect());
    const slotCenters = lockedPieces.map(p => {
      const shapeId = p.dataset.shape;
      const slot = this.rootElement?.querySelector<HTMLElement>(`#slot-${shapeId}`);
      if (!slot) return null;
      const rect = slot.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    });

    // FASE 3: Aplicação dos novos transforms
    lockedPieces.forEach((p, i) => {
      const orig = pieceOriginalRects[i];
      const slotCenter = slotCenters[i];
      if (slotCenter && orig.width > 0 && orig.height > 0) {
        const targetDeltaX = slotCenter.x - (orig.left + orig.width / 2);
        const targetDeltaY = slotCenter.y - (orig.top + orig.height / 2);
        p.style.transform = `translate3d(${targetDeltaX}px, ${targetDeltaY}px, 0) scale(1)`;
      }
    });

    // Peças não travadas e não em arrasto voltam à posição inicial de repouso
    pieces.forEach(p => {
      if (!p.classList.contains('locked') && !p.classList.contains('dragging')) {
        p.style.transition = 'none';
        p.style.transform = 'translate3d(0, 0, 0) scale(1)';
      }
    });
  }

  /**
   * Inicia uma nova rodada dinâmica respeitando a configuração do Nível atual
   */
  private startRound(): void {
    this.clearTimers();
    this.isRoundComplete = false;
    this.removeVictoryBanner();
    this.matchedCount = 0;
    this.activePointerId = null;
    this.activePiece = null;

    // Obtém configuração do nível ativo do ProgressManager
    const config = this.progress.getShapeConfig();

    // Filtra as formas permitidas para o nível atual
    const allowedPool = this.allShapes.filter(s => config.availableShapes.includes(s.id));

    // Seleciona as peças da rodada (embaralhadas)
    this.currentShapes = this.shuffle([...allowedPool]).slice(0, config.piecesCount);

    // Atualiza o HUD
    this.updateHUD();

    // Renderiza o tabuleiro com as novas peças e moldes
    this.renderRoundDOM(config);
  }

  /**
   * Atualiza as 3 estrelas do HUD e o indicador de nível
   */
  private updateHUD(): void {
    const levelBadge = this.rootElement?.querySelector('#hudLevelBadge');
    if (levelBadge) {
      levelBadge.textContent = this.progress.getLevelLabel();
    }

    const filledStars = this.progress.getCompletedRoundsInLevel();
    const starEls = this.rootElement?.querySelectorAll('.hud-star');
    starEls?.forEach((star, index) => {
      if (index < filledStars) {
        star.classList.add('star-active');
      } else {
        star.classList.remove('star-active');
      }
    });
  }

  /**
   * Constrói o DOM dos slots superiores e da bandeja inferior com auxílio visual específico do nível
   */
  private renderRoundDOM(config: ShapeLevelConfig): void {
    const board = this.rootElement?.querySelector<HTMLElement>('#shapesBoard');
    if (!board) return;

    // Cancela e revoga listeners de toque da rodada anterior via AbortController
    if (this.roundAbortController) {
      this.roundAbortController.abort();
      this.roundAbortController = null;
    }
    this.roundAbortController = new AbortController();
    const { signal } = this.roundAbortController;

    const shuffledPieces = this.shuffle([...this.currentShapes]);

    board.innerHTML = `
      <!-- Parte Superior: Slots com auxílio visual específico do Nível (${config.visualAssist}) -->
      <div class="slots-container" id="slotsContainer">
        ${this.currentShapes.map(shape => {
          const tintVars = config.visualAssist === 'color-tint'
            ? `style="--slot-tint-bg: ${shape.tintBg}; --slot-tint-border: ${shape.tintBorder}; --slot-tint-fill: ${shape.color};"`
            : '';
          return `
            <div class="shape-slot assist-${config.visualAssist}" data-shape="${shape.id}" id="slot-${shape.id}" ${tintVars}>
              <div class="slot-silhouette">
                ${shape.renderSilhouetteSvg(85, config.visualAssist)}
              </div>
              <span class="slot-label">${shape.name}</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Parte Inferior: Peças coloridas correspondentes -->
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

    // Vincula o sistema de Drag and Drop com AbortController signal
    const pieces = board.querySelectorAll<HTMLElement>('.draggable-piece');
    pieces.forEach(piece => {
      this.setupDraggablePiece(piece, config.snapRadius, signal);
    });
  }

  /**
   * Sistema de Drag-and-Drop Tolerante com signal de cancelamento limpo
   */
  private setupDraggablePiece(piece: HTMLElement, snapRadius: number, signal: AbortSignal): void {
    let startX = 0;
    let startY = 0;
    let originalRect: DOMRect;
    let isDragging = false;
    const shapeId = piece.dataset.shape as ShapeData['id'];

    const onPointerDown = (e: PointerEvent) => {
      if (this.isRoundComplete) return;
      if (piece.classList.contains('locked')) return;
      if (this.activePointerId !== null) return;
      if (!e.isPrimary) return;

      e.preventDefault();

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

      piece.classList.add('dragging');
      piece.style.transition = 'none';
      piece.style.transform = `translate3d(0, 0, 0) scale(1.15)`;

      audioManager.playPickup();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || this.activePointerId !== e.pointerId || this.activePiece !== piece) {
        return;
      }
      e.preventDefault();

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      piece.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.15)`;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging || this.activePointerId !== e.pointerId || this.activePiece !== piece) {
        return;
      }
      isDragging = false;

      try {
        piece.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora
      }
      this.activePointerId = null;
      this.activePiece = null;

      piece.classList.remove('dragging');

      const targetSlot = this.rootElement?.querySelector<HTMLElement>(`#slot-${shapeId}`);
      if (targetSlot) {
        const targetRect = targetSlot.getBoundingClientRect();
        const pieceCurrentRect = piece.getBoundingClientRect();

        const targetCenter = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2
        };

        const pieceCenter = {
          x: pieceCurrentRect.left + pieceCurrentRect.width / 2,
          y: pieceCurrentRect.top + pieceCurrentRect.height / 2
        };

        const dist = Math.hypot(targetCenter.x - pieceCenter.x, targetCenter.y - pieceCenter.y);

        // Tolerância magnética (Snap) dinamicamente ajustada ao nível:
        // Nível 1: 80px | Nível 2: 55px | Nível 3: 40px
        if (dist <= snapRadius) {
          this.handleSnapSuccess(piece, targetSlot, targetCenter, originalRect);
          return;
        }
      }

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

    piece.addEventListener('pointerdown', onPointerDown, { signal });
    piece.addEventListener('pointermove', onPointerMove, { signal });
    piece.addEventListener('pointerup', onPointerUp, { signal });
    piece.addEventListener('pointercancel', onPointerCancel, { signal });
  }

  /**
   * Acerto e encaixe magnético da peça
   */
  private handleSnapSuccess(
    piece: HTMLElement,
    targetSlot: HTMLElement,
    targetCenter: { x: number; y: number },
    originalRect: DOMRect
  ): void {
    piece.classList.add('locked');
    targetSlot.classList.add('solved');

    const targetDeltaX = targetCenter.x - (originalRect.left + originalRect.width / 2);
    const targetDeltaY = targetCenter.y - (originalRect.top + originalRect.height / 2);

    piece.style.transition = 'transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    piece.style.transform = `translate3d(${targetDeltaX}px, ${targetDeltaY}px, 0) scale(1)`;

    audioManager.playSnap();

    targetSlot.classList.remove('pulse-bounce');
    piece.classList.remove('pulse-bounce');
    void targetSlot.offsetWidth;
    targetSlot.classList.add('pulse-bounce');
    piece.classList.add('pulse-bounce');

    this.matchedCount++;

    if (this.matchedCount >= this.currentShapes.length) {
      this.handleRoundVictory();
    }
  }

  private handleSoftReturn(piece: HTMLElement): void {
    piece.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
    piece.style.transform = 'translate3d(0, 0, 0) scale(1)';
    audioManager.playReturn();
  }

  /**
   * Remove com segurança qualquer banner de celebração do DOM
   */
  private removeVictoryBanner(): void {
    const banners = this.rootElement?.querySelectorAll('.round-complete-banner');
    banners?.forEach(b => b.remove());
  }

  /**
   * Vitória da rodada com atualização de estrelas no HUD e transições automáticas
   */
  private handleRoundVictory(): void {
    if (this.isRoundComplete) return;
    this.isRoundComplete = true;

    // Registra a vitória na máquina de estados de progressão
    const result = this.progress.recordRoundVictory();

    // Som de 'pling' ascendente para cada estrela que se acende no HUD
    audioManager.playPling(result.starsFilled > 0 ? result.starsFilled - 1 : 2);

    // Atualiza imediatamente o HUD de estrelas
    this.updateHUD();

    // Caso 1: Concluiu o Nível 3 -> Tela especial de "Super Campeão!"
    if (result.isGameChampion) {
      this.showChampionOverlay(() => {
        this.startRound();
      });
      return;
    }

    // Caso 2: Completou 3 vitórias consecutivas -> "Level Up!" (transição de 1.5s)
    if (result.isLevelUp) {
      this.showLevelUpOverlay(result.newLevel, () => {
        this.startRound();
      });
      return;
    }

    // Caso 3: Vitória de rodada normal dentro do nível atual
    audioManager.playVictory();

    if (this.rootElement) {
      this.confetti.trigger(this.rootElement, 2000);
    }

    this.removeVictoryBanner();

    const banner = document.createElement('div');
    banner.className = 'round-complete-banner pop-anim';
    banner.id = 'shapesVictoryBanner';
    banner.innerHTML = `
      <h3>🎉 Muito Bem!</h3>
      <p>Rodada Concluída! ⭐</p>
    `;
    this.rootElement?.appendChild(banner);

    this.nextRoundTimer = window.setTimeout(() => {
      banner.classList.remove('pop-anim');
      banner.classList.add('fade-out');

      window.setTimeout(() => {
        this.removeVictoryBanner();
        this.startRound();
      }, 300);
    }, 1800);
  }

  /**
   * Exibe overlay de Level Up rápido (1.5 segundos) com confetes e acorde musical
   */
  private showLevelUpOverlay(newLevel: number, onFinished: () => void): void {
    if (!this.rootElement) return;

    audioManager.playLevelUp();
    this.confetti.trigger(this.rootElement, 2200);

    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay pop-anim';
    overlay.innerHTML = `
      <div class="level-up-card">
        <div class="level-up-icon">🌟🚀</div>
        <h2>Você subiu de nível! 🌟</h2>
        <p>Nível ${newLevel} Desbloqueado!</p>
      </div>
    `;

    this.rootElement.appendChild(overlay);

    this.levelUpTimer = window.setTimeout(() => {
      overlay.classList.remove('pop-anim');
      overlay.classList.add('fade-out');

      window.setTimeout(() => {
        overlay.remove();
        onFinished();
      }, 300);
    }, 1500);
  }

  /**
   * Exibe overlay especial do Nível 3 concluído: Super Campeão!
   */
  private showChampionOverlay(onContinue: () => void): void {
    if (!this.rootElement) return;

    audioManager.playVictory();
    this.confetti.trigger(this.rootElement, 4000);

    const overlay = document.createElement('div');
    overlay.className = 'champion-overlay pop-anim';
    overlay.innerHTML = `
      <div class="champion-card">
        <div class="champion-trophy">🏆👑🌟</div>
        <h2>Super Campeão!</h2>
        <p>Você completou todos os níveis com maestria e brilhou em todas as formas!</p>
        <button class="btn-champion-continue" id="btnChampionContinue">
          Continuar Brincando 🚀
        </button>
      </div>
    `;

    this.rootElement.appendChild(overlay);

    const btn = overlay.querySelector('#btnChampionContinue');
    btn?.addEventListener('click', () => {
      audioManager.playPop();
      overlay.classList.remove('pop-anim');
      overlay.classList.add('fade-out');

      window.setTimeout(() => {
        overlay.remove();
        onContinue();
      }, 300);
    });
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
    if (this.levelUpTimer !== null) {
      clearTimeout(this.levelUpTimer);
      this.levelUpTimer = null;
    }
    if (this.resizeTimeoutId !== null) {
      clearTimeout(this.resizeTimeoutId);
      this.resizeTimeoutId = null;
    }
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }

    // Remove eventuais overlays de Level Up ou Campeão
    this.rootElement?.querySelectorAll('.level-up-overlay, .champion-overlay').forEach(el => el.remove());

    this.removeVictoryBanner();
    this.confetti.stop();
  }

  public unmount(): void {
    if (this.roundAbortController) {
      this.roundAbortController.abort();
      this.roundAbortController = null;
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    this.clearTimers();
    if (this.rootElement && this.rootElement.parentElement) {
      this.rootElement.parentElement.removeChild(this.rootElement);
    }
    this.rootElement = null;
  }
}
