import { Screen, ScreenId } from '../core/types.ts';
import { ScreenManager } from '../core/ScreenManager.ts';
import { audioManager } from '../audio/AudioManager.ts';
import { ConfettiCelebration } from '../components/Confetti.ts';

interface ColorCategory {
  id: 'blue' | 'red' | 'yellow';
  name: string;
  colorHex: string;
  lightHex: string;
  darkHex: string;
}

interface ToyItem {
  id: string;
  name: string;
  colorId: 'blue' | 'red' | 'yellow';
  renderSvg: () => string;
}

export class ColorSortingScreen implements Screen {
  public readonly id: ScreenId = 'colors';
  private screenManager: ScreenManager;
  private rootElement: HTMLElement | null = null;
  private confetti: ConfettiCelebration = new ConfettiCelebration();

  private currentRound: number = 1;
  private matchedCount: number = 0;
  private totalItems: number = 6;
  private nextRoundTimer: number | null = null;

  // Rejeição de palma da mão e controle de ponteiro único
  private activePointerId: number | null = null;
  private activeToy: HTMLElement | null = null;

  /**
   * Cores dos baldes e peças conforme especificação:
   * - Azul: #3B82F6
   * - Vermelho: #EF4444
   * - Amarelo: #F59E0B
   */
  private readonly categories: ColorCategory[] = [
    {
      id: 'blue',
      name: 'Azul',
      colorHex: '#3B82F6',
      lightHex: '#BFDBFE',
      darkHex: '#1D4ED8'
    },
    {
      id: 'red',
      name: 'Vermelho',
      colorHex: '#EF4444',
      lightHex: '#FECACA',
      darkHex: '#B91C1C'
    },
    {
      id: 'yellow',
      name: 'Amarelo',
      colorHex: '#F59E0B',
      lightHex: '#FDE68A',
      darkHex: '#B45309'
    }
  ];

  /**
   * Catálogo de bloquinhos e brinquedos estilizados em SVG nas 3 cores
   */
  private readonly allToys: ToyItem[] = [
    // --- VERMELHO (#EF4444) ---
    {
      id: 'red_block',
      name: 'Bloquinho Vermelho',
      colorId: 'red',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Bloquinho de montar estilo lego -->
          <rect x="15" y="30" width="50" height="38" rx="8" fill="#EF4444" stroke="#DC2626" stroke-width="3"/>
          <!-- Pinos superiores -->
          <rect x="22" y="20" width="14" height="12" rx="4" fill="#EF4444" stroke="#DC2626" stroke-width="2.5"/>
          <rect x="44" y="20" width="14" height="12" rx="4" fill="#EF4444" stroke="#DC2626" stroke-width="2.5"/>
          <!-- Rostinho fofo no bloco -->
          <circle cx="32" cy="48" r="3.5" fill="#FFFFFF"/>
          <circle cx="48" cy="48" r="3.5" fill="#FFFFFF"/>
          <circle cx="33" cy="49" r="2" fill="#7F1D1D"/>
          <circle cx="49" cy="49" r="2" fill="#7F1D1D"/>
          <path d="M 36 57 Q 40 62 44 57" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'red_apple',
      name: 'Maçã Vermelha',
      colorId: 'red',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Cabinho e folha verde -->
          <path d="M 40 18 Q 42 10 50 12" stroke="#10B981" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <path d="M 40 16 Q 34 11 37 19 Z" fill="#10B981"/>
          <!-- Maçã vermelha -->
          <circle cx="33" cy="46" r="23" fill="#EF4444"/>
          <circle cx="47" cy="46" r="23" fill="#EF4444"/>
          <circle cx="34" cy="42" r="3.5" fill="#FFFFFF"/>
          <circle cx="46" cy="42" r="3.5" fill="#FFFFFF"/>
          <path d="M 37 51 Q 40 56 43 51" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <ellipse cx="28" cy="48" rx="3.5" ry="2" fill="#FCA5A5"/>
          <ellipse cx="52" cy="48" rx="3.5" ry="2" fill="#FCA5A5"/>
        </svg>`
    },

    // --- AZUL (#3B82F6) ---
    {
      id: 'blue_block',
      name: 'Bloquinho Azul',
      colorId: 'blue',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <rect x="15" y="30" width="50" height="38" rx="8" fill="#3B82F6" stroke="#2563EB" stroke-width="3"/>
          <rect x="22" y="20" width="14" height="12" rx="4" fill="#3B82F6" stroke="#2563EB" stroke-width="2.5"/>
          <rect x="44" y="20" width="14" height="12" rx="4" fill="#3B82F6" stroke="#2563EB" stroke-width="2.5"/>
          <circle cx="32" cy="48" r="3.5" fill="#FFFFFF"/>
          <circle cx="48" cy="48" r="3.5" fill="#FFFFFF"/>
          <circle cx="33" cy="49" r="2" fill="#1E3A8A"/>
          <circle cx="49" cy="49" r="2" fill="#1E3A8A"/>
          <path d="M 36 57 Q 40 62 44 57" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'blue_car',
      name: 'Carrinho Azul',
      colorId: 'blue',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Carroçaria -->
          <rect x="14" y="38" width="52" height="20" rx="7" fill="#3B82F6" stroke="#2563EB" stroke-width="2.5"/>
          <path d="M 24 38 Q 30 23 44 23 L 54 38 Z" fill="#3B82F6" stroke="#2563EB" stroke-width="2"/>
          <circle cx="36" cy="32" r="5" fill="#BFDBFE"/>
          <!-- Rodinhas -->
          <circle cx="26" cy="58" r="7" fill="#1E293B"/>
          <circle cx="26" cy="58" r="3" fill="#FFFFFF"/>
          <circle cx="54" cy="58" r="7" fill="#1E293B"/>
          <circle cx="54" cy="58" r="3" fill="#FFFFFF"/>
        </svg>`
    },

    // --- AMARELO (#F59E0B) ---
    {
      id: 'yellow_block',
      name: 'Bloquinho Amarelo',
      colorId: 'yellow',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <rect x="15" y="30" width="50" height="38" rx="8" fill="#F59E0B" stroke="#D97706" stroke-width="3"/>
          <rect x="22" y="20" width="14" height="12" rx="4" fill="#F59E0B" stroke="#D97706" stroke-width="2.5"/>
          <rect x="44" y="20" width="14" height="12" rx="4" fill="#F59E0B" stroke="#D97706" stroke-width="2.5"/>
          <circle cx="32" cy="48" r="3.5" fill="#78350F"/>
          <circle cx="48" cy="48" r="3.5" fill="#78350F"/>
          <circle cx="33" cy="47" r="1.5" fill="#FFFFFF"/>
          <circle cx="49" cy="47" r="1.5" fill="#FFFFFF"/>
          <path d="M 36 57 Q 40 62 44 57" stroke="#78350F" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'yellow_duck',
      name: 'Patinho Amarelo',
      colorId: 'yellow',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Corpo do patinho -->
          <ellipse cx="44" cy="48" rx="22" ry="16" fill="#F59E0B"/>
          <!-- Cabeça -->
          <circle cx="28" cy="34" r="14" fill="#F59E0B"/>
          <!-- Bico laranja -->
          <polygon points="14,35 23,30 23,40" fill="#EA580C"/>
          <!-- Olho -->
          <circle cx="27" cy="32" r="3.5" fill="#78350F"/>
          <circle cx="28" cy="31" r="1.5" fill="#FFFFFF"/>
          <!-- Asa -->
          <ellipse cx="46" cy="47" rx="11" ry="7" fill="#D97706"/>
        </svg>`
    }
  ];

  constructor(screenManager: ScreenManager) {
    this.screenManager = screenManager;
  }

  public mount(container: HTMLElement): void {
    this.currentRound = 1;

    const gameEl = document.createElement('div');
    gameEl.className = 'game-screen minigame-colors';
    gameEl.innerHTML = `
      <!-- Barra Superior com Estrelinhas de Progresso -->
      <nav class="game-navbar">
        <button class="back-button" id="btnBackToHubColors" aria-label="Voltar ao Menu">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>Menu</span>
        </button>

        <div class="game-instruction">
          <span class="instruction-badge" id="colorsRoundBadge">Rodada 1 • Cores</span>
          <h2>Guarde cada brinquedo no balde da cor certa!</h2>
        </div>

        <!-- Contador Lúdico: Estrelinhas que se preenchem a cada acerto -->
        <div class="stars-progress-container" id="starsProgressContainer" title="Progresso da Rodada">
          ${Array.from({ length: this.totalItems }).map((_, i) => `
            <span class="star-indicator" data-star-index="${i}">★</span>
          `).join('')}
        </div>

        <button class="action-btn-restart" id="btnRestartColors" title="Recomeçar jogo">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </nav>

      <!-- PARTE CENTRAL SUPERIOR: Peças estilizadas (bloquinhos e brinquedos SVG) -->
      <section class="toys-central-area">
        <div class="toys-shelf" id="toysShelf">
          <!-- Renderizado dinamicamente por startRound() -->
        </div>
      </section>

      <!-- PARTE INFERIOR: 3 Baldes/Cestas Estilizadas (Azul, Vermelho, Amarelo) -->
      <section class="buckets-bottom-area">
        <div class="buckets-container" id="bucketsContainer">
          ${this.categories.map(cat => `
            <div class="color-bucket bucket-${cat.id}" data-color="${cat.id}" id="bucket-${cat.id}">
              <div class="bucket-visual">
                <svg viewBox="0 0 170 145" width="100%" height="100%">
                  <!-- Borda / Abertura larga acolhedora -->
                  <ellipse cx="85" cy="30" rx="72" ry="20" fill="${cat.colorHex}" stroke="${cat.darkHex}" stroke-width="4"/>
                  <!-- Fundo interno da boca (dá profundidade de cesto aberto) -->
                  <ellipse cx="85" cy="30" rx="60" ry="14" fill="${cat.darkHex}" opacity="0.45"/>
                  <ellipse cx="85" cy="32" rx="54" ry="11" fill="${cat.lightHex}" opacity="0.75"/>
                  
                  <!-- Corpo cônico e acolhedor do balde -->
                  <path d="M 18 32 L 34 125 Q 85 142 136 125 L 152 32 Z" fill="${cat.colorHex}" stroke="${cat.darkHex}" stroke-width="4"/>
                  
                  <!-- Rostinho simpático e sorridente no balde -->
                  <circle cx="68" cy="84" r="5.5" fill="#FFFFFF"/>
                  <circle cx="102" cy="84" r="5.5" fill="#FFFFFF"/>
                  <circle cx="69" cy="85" r="3" fill="${cat.darkHex}"/>
                  <circle cx="103" cy="85" r="3" fill="${cat.darkHex}"/>
                  <!-- Sorriso acolhedor -->
                  <path d="M 74 98 Q 85 108 96 98" stroke="#FFFFFF" stroke-width="4.5" fill="none" stroke-linecap="round"/>
                  <!-- Bochechas rosadas -->
                  <ellipse cx="58" cy="92" rx="6" ry="3.5" fill="rgba(255, 255, 255, 0.5)"/>
                  <ellipse cx="112" cy="92" rx="6" ry="3.5" fill="rgba(255, 255, 255, 0.5)"/>
                </svg>
              </div>
              <span class="bucket-label" style="background-color: ${cat.colorHex}">${cat.name}</span>
              <div class="bucket-collected-indicator" id="indicator-${cat.id}">0 / 2</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;

    container.appendChild(gameEl);
    this.rootElement = gameEl;

    // Configuração de botões superiores
    const btnBack = gameEl.querySelector('#btnBackToHubColors');
    btnBack?.addEventListener('click', () => {
      this.clearTimers();
      this.screenManager.navigateTo('home');
    });

    const btnRestart = gameEl.querySelector('#btnRestartColors');
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
   * Inicia ou reinicia uma rodada do jogo
   */
  private startRound(roundNum: number): void {
    this.clearTimers();
    this.matchedCount = 0;
    this.activePointerId = null;
    this.activeToy = null;

    // Atualiza o crachá de rodada
    const badge = this.rootElement?.querySelector('#colorsRoundBadge');
    if (badge) {
      badge.textContent = `Rodada ${roundNum} • 6 Brinquedos ⭐`;
    }

    // Reseta as estrelinhas de progresso
    this.updateStarsUI(0);

    // Reseta contadores numéricos dos 3 baldes
    this.categories.forEach(cat => {
      const indicator = this.rootElement?.querySelector(`#indicator-${cat.id}`);
      if (indicator) indicator.textContent = '0 / 2';
      const bucket = this.rootElement?.querySelector(`#bucket-${cat.id}`);
      bucket?.classList.remove('bucket-hover-pulse', 'bucket-jump');
    });

    // Renderiza os 6 brinquedos na prateleira central superior (embaralhados)
    this.renderToysShelf();
  }

  /**
   * Renderiza os 6 brinquedos na prateleira superior central
   */
  private renderToysShelf(): void {
    const shelf = this.rootElement?.querySelector<HTMLElement>('#toysShelf');
    if (!shelf) return;

    // Embaralha os 6 itens (2 vermelhos, 2 azuis, 2 amarelos)
    const shuffledToys = this.shuffle([...this.allToys]);

    shelf.innerHTML = shuffledToys.map(toy => `
      <div class="draggable-toy" data-color="${toy.colorId}" id="toy-${toy.id}" style="touch-action: none;">
        <div class="toy-card">
          ${toy.renderSvg()}
        </div>
      </div>
    `).join('');

    // Configura drag-and-drop tolerante para cada brinquedo
    const toys = shelf.querySelectorAll<HTMLElement>('.draggable-toy');
    toys.forEach(toy => {
      this.setupDraggableToy(toy);
    });
  }

  /**
   * Sistema de Drag-and-Drop Tolerante:
   * - setPointerCapture para travar arrasto em 1 dedo e rejeitar palma da mão
   * - scale(1.15) e sombra evidente durante o arrasto
   * - Detecção contínua de sobrevoo para pulsar o balde alvo correspondente
   * - Verificação de bounding box expandida em +30px ao soltar
   * - Animação de encolhimento e fade out no acerto; interpolação suave no erro
   */
  private setupDraggableToy(toy: HTMLElement): void {
    let startX = 0;
    let startY = 0;
    let originalRect: DOMRect;
    let isDragging = false;
    const toyColor = toy.dataset.color as ColorCategory['id'];

    const onPointerDown = (e: PointerEvent) => {
      if (toy.classList.contains('locked')) return;

      // Rejeição de múltiplos toques e palma da mão
      if (this.activePointerId !== null) return;
      if (!e.isPrimary) return;

      e.preventDefault();

      this.activePointerId = e.pointerId;
      this.activeToy = toy;
      try {
        toy.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn('Pointer capture error:', err);
      }

      isDragging = true;
      originalRect = toy.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;

      // Visual agarrado: escala 1.15 e sombra evidente
      toy.classList.add('dragging');
      toy.style.transition = 'none';
      toy.style.transform = `translate3d(0, 0, 0) scale(1.15)`;

      // Som procedural de pegar
      audioManager.playPickup();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || this.activePointerId !== e.pointerId || this.activeToy !== toy) {
        return;
      }
      e.preventDefault();

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      toy.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.15)`;

      // Feedback visual contínuo: checa sobrevoo na área do balde (+30px)
      this.checkBucketHover(toy, toyColor);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging || this.activePointerId !== e.pointerId || this.activeToy !== toy) {
        return;
      }
      isDragging = false;

      try {
        toy.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora
      }
      this.activePointerId = null;
      this.activeToy = null;

      toy.classList.remove('dragging');

      // Limpa pulso de sobrevoo de todos os baldes
      this.clearAllBucketHover();

      // Checa colisão com os baldes na área delimitada (+30px)
      const matchedBucket = this.getMatchingBucket(toy, toyColor);

      if (matchedBucket) {
        // ACERTO: Objeto cai para dentro do balde (encolhimento + fade out)
        this.handleSnapToBucket(toy, matchedBucket, originalRect);
        return;
      }

      // ERRO / SOLTOU FORA OU NO BALDE ERRADO: Retorna suavemente ao centro
      this.handleSoftReturn(toy);
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (this.activePointerId === e.pointerId) {
        try {
          toy.releasePointerCapture(e.pointerId);
        } catch {
          // Ignora
        }
        this.activePointerId = null;
        this.activeToy = null;
        isDragging = false;
        toy.classList.remove('dragging');
        this.clearAllBucketHover();
        this.handleSoftReturn(toy);
      }
    };

    toy.addEventListener('pointerdown', onPointerDown);
    toy.addEventListener('pointermove', onPointerMove);
    toy.addEventListener('pointerup', onPointerUp);
    toy.addEventListener('pointercancel', onPointerCancel);
  }

  /**
   * Verifica se o objeto está sobrevoando a bounding box expandida (+30px)
   * do balde da mesma cor para acionar o pulso suave
   */
  private checkBucketHover(toy: HTMLElement, toyColor: ColorCategory['id']): void {
    const toyRect = toy.getBoundingClientRect();
    const toyCenter = {
      x: toyRect.left + toyRect.width / 2,
      y: toyRect.top + toyRect.height / 2
    };

    const buckets = this.rootElement?.querySelectorAll<HTMLElement>('.color-bucket');
    buckets?.forEach(bucket => {
      const bucketColor = bucket.dataset.color;
      const bRect = bucket.getBoundingClientRect();

      // Bounding box expandida em +30px
      const isInside =
        toyCenter.x >= bRect.left - 30 &&
        toyCenter.x <= bRect.right + 30 &&
        toyCenter.y >= bRect.top - 30 &&
        toyCenter.y <= bRect.bottom + 30;

      // O balde da cor alvo deve pulsar levemente apenas quando for da mesma cor
      if (isInside && bucketColor === toyColor) {
        bucket.classList.add('bucket-hover-pulse');
      } else {
        bucket.classList.remove('bucket-hover-pulse');
      }
    });
  }

  /**
   * Limpa classes de sobrevoo de todos os baldes
   */
  private clearAllBucketHover(): void {
    const buckets = this.rootElement?.querySelectorAll<HTMLElement>('.color-bucket');
    buckets?.forEach(b => b.classList.remove('bucket-hover-pulse'));
  }

  /**
   * Obtém o balde correspondente caso o centro do objeto esteja contido
   * na bounding box expandida em +30px do balde da mesma cor
   */
  private getMatchingBucket(toy: HTMLElement, toyColor: ColorCategory['id']): HTMLElement | null {
    const toyRect = toy.getBoundingClientRect();
    const toyCenter = {
      x: toyRect.left + toyRect.width / 2,
      y: toyRect.top + toyRect.height / 2
    };

    const buckets = this.rootElement?.querySelectorAll<HTMLElement>('.color-bucket');
    let targetBucket: HTMLElement | null = null;

    buckets?.forEach(bucket => {
      const bucketColor = bucket.dataset.color;
      const bRect = bucket.getBoundingClientRect();

      // Bounding box expandida em +30px
      const isInside =
        toyCenter.x >= bRect.left - 30 &&
        toyCenter.x <= bRect.right + 30 &&
        toyCenter.y >= bRect.top - 30 &&
        toyCenter.y <= bRect.bottom + 30;

      if (isInside && bucketColor === toyColor) {
        targetBucket = bucket;
      }
    });

    return targetBucket;
  }

  /**
   * Acerto:
   * O objeto cai para dentro do balde (encolhe e faz fade out), toca áudio de acerto
   * e o balde faz animação alegre de salto
   */
  private handleSnapToBucket(toy: HTMLElement, bucket: HTMLElement, originalRect: DOMRect): void {
    toy.classList.add('locked');

    const bucketRect = bucket.getBoundingClientRect();
    // Alvo: abertura superior central do balde
    const targetDeltaX = (bucketRect.left + bucketRect.width / 2) - (originalRect.left + originalRect.width / 2);
    const targetDeltaY = (bucketRect.top + bucketRect.height * 0.32) - (originalRect.top + originalRect.height / 2);

    // Animação de encolhimento e queda para dentro do balde (scale 0.12 e fade out)
    toy.style.transition = 'transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.26s ease';
    toy.style.transform = `translate3d(${targetDeltaX}px, ${targetDeltaY}px, 0) scale(0.12)`;
    toy.style.opacity = '0';

    // Dispara som de acerto de sino/marimba (C5, E5, G5)
    audioManager.playSnap();

    // Balde dá salto de alegria
    bucket.classList.remove('bucket-jump');
    void bucket.offsetWidth;
    bucket.classList.add('bucket-jump');

    // Atualiza contagem do balde
    const colorId = bucket.dataset.color;
    const indicator = bucket.querySelector(`#indicator-${colorId}`);
    if (indicator) {
      const current = parseInt(indicator.textContent?.split('/')[0] || '0', 10) + 1;
      indicator.textContent = `${current} / 2`;
    }

    // Atualiza contador de estrelinhas
    this.matchedCount++;
    this.updateStarsUI(this.matchedCount);

    // Se completou todos os 6 brinquedos, dispara vitória de rodada
    if (this.matchedCount >= this.totalItems) {
      this.handleRoundVictory();
    }
  }

  /**
   * Retorno suave não punitivo quando solto no vazio ou no balde errado
   */
  private handleSoftReturn(toy: HTMLElement): void {
    // Interpolação suave de volta à posição original no centro superior
    toy.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
    toy.style.transform = 'translate3d(0, 0, 0) scale(1)';

    // Som suave de glissando descendente
    audioManager.playReturn();
  }

  /**
   * Atualiza a barra de progresso com estrelinhas preenchidas
   */
  private updateStarsUI(filledCount: number): void {
    const starEls = this.rootElement?.querySelectorAll<HTMLElement>('.star-indicator');
    starEls?.forEach((star, index) => {
      if (index < filledCount) {
        star.classList.add('filled');
      } else {
        star.classList.remove('filled');
      }
    });
  }

  /**
   * Vitória e passagem automática para a próxima rodada após 2 segundos
   */
  private handleRoundVictory(): void {
    // Toca fanfarra festiva de vitória
    audioManager.playVictory();

    // Dispara confetes e estrelas via Canvas overlay
    if (this.rootElement) {
      this.confetti.trigger(this.rootElement, 2500);
    }

    // Exibe banner de celebração da rodada
    const shelf = this.rootElement?.querySelector<HTMLElement>('.toys-central-area');
    if (shelf) {
      const banner = document.createElement('div');
      banner.className = 'round-complete-banner pop-anim';
      banner.innerHTML = `
        <h3>🎉 Incrível!</h3>
        <p>Você separou todas as cores! ⭐⭐⭐</p>
      `;
      shelf.appendChild(banner);
    }

    // Avança para a próxima rodada após 2 segundos
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
