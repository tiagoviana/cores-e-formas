import { Screen, ScreenId } from '../core/types.ts';
import { ScreenManager } from '../core/ScreenManager.ts';
import { audioManager } from '../audio/AudioManager.ts';
import { ParticleSystem } from '../components/ParticleSystem.ts';
import { ConfirmModal } from '../components/ConfirmModal.ts';
import { ProgressManager } from '../game/ProgressManager.ts';

export type ColorId = 'blue' | 'red' | 'yellow' | 'green' | 'orange' | 'purple';

export interface ColorCategory {
  id: ColorId;
  name: string;
  colorHex: string;
  lightHex: string;
  darkHex: string;
  glowRgba: string;
}

export interface ToyItem {
  id: string;
  name: string;
  colorId: ColorId;
  renderSvg: () => string;
}

export class ColorSortingScreen implements Screen {
  public readonly id: ScreenId = 'colors';
  private screenManager: ScreenManager;
  private rootElement: HTMLElement | null = null;
  private confetti: ParticleSystem = new ParticleSystem();
  private progress: ProgressManager = new ProgressManager(1);

  private matchedCount: number = 0;
  private totalItems: number = 3;
  private currentSnapMargin: number = 35;
  private activeCategories: ColorCategory[] = [];
  private currentToys: ToyItem[] = [];
  private requiredCountsByColor: Record<string, number> = {};
  private collectedCountsByColor: Record<string, number> = {};

  private nextRoundTimer: number | null = null;
  private levelUpTimer: number | null = null;
  private isRoundComplete: boolean = false;

  // AbortController para revogação limpa de listeners de toque das peças da rodada
  private roundAbortController: AbortController | null = null;

  // Rejeição de palma da mão e controle de ponteiro único
  private activePointerId: number | null = null;
  private activeToy: HTMLElement | null = null;

  // IDs para cancelamento de timers e animações de redimensionamento
  private resizeRafId: number | null = null;
  private resizeTimeoutId: number | null = null;

  // Listener com debounce para recalcular posições no redimensionamento / rotação
  private handleResize = () => {
    if (this.resizeTimeoutId !== null) {
      clearTimeout(this.resizeTimeoutId);
    }
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }

    // Debounce de 120ms para aguardar a estabilização do viewport do navegador móvel
    this.resizeTimeoutId = window.setTimeout(() => {
      this.resizeRafId = requestAnimationFrame(() => {
        this.recalibratePositions();
        this.resizeRafId = null;
      });
    }, 120);
  };

  /**
   * Cores dos baldes e peças conforme especificação:
   * - Nível 1: Azul (#3B82F6), Vermelho (#EF4444), Amarelo (#F59E0B)
   * - Nível 2: Adiciona Verde (#10B981) e Laranja (#F97316)
   * - Nível 3: Adiciona Roxo (#8B5CF6)
   */
  private readonly categories: ColorCategory[] = [
    {
      id: 'blue',
      name: 'Azul',
      colorHex: '#3B82F6',
      lightHex: '#BFDBFE',
      darkHex: '#1D4ED8',
      glowRgba: 'rgba(59, 130, 246, 0.55)'
    },
    {
      id: 'red',
      name: 'Vermelho',
      colorHex: '#EF4444',
      lightHex: '#FECACA',
      darkHex: '#B91C1C',
      glowRgba: 'rgba(239, 68, 68, 0.55)'
    },
    {
      id: 'yellow',
      name: 'Amarelo',
      colorHex: '#F59E0B',
      lightHex: '#FDE68A',
      darkHex: '#B45309',
      glowRgba: 'rgba(245, 158, 11, 0.55)'
    },
    {
      id: 'green',
      name: 'Verde',
      colorHex: '#10B981',
      lightHex: '#A7F3D0',
      darkHex: '#047857',
      glowRgba: 'rgba(16, 185, 129, 0.55)'
    },
    {
      id: 'orange',
      name: 'Laranja',
      colorHex: '#F97316',
      lightHex: '#FED7AA',
      darkHex: '#C2410C',
      glowRgba: 'rgba(249, 115, 22, 0.55)'
    },
    {
      id: 'purple',
      name: 'Roxo',
      colorHex: '#8B5CF6',
      lightHex: '#DDD6FE',
      darkHex: '#6D28D9',
      glowRgba: 'rgba(139, 92, 246, 0.55)'
    }
  ];

  /**
   * Catálogo de bloquinhos e brinquedos estilizados em SVG para todas as 6 cores
   */
  private readonly allToys: ToyItem[] = [
    // --- VERMELHO (#EF4444) ---
    {
      id: 'red_block',
      name: 'Bloquinho Vermelho',
      colorId: 'red',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <rect x="15" y="30" width="50" height="38" rx="8" fill="#EF4444" stroke="#DC2626" stroke-width="3"/>
          <rect x="22" y="20" width="14" height="12" rx="4" fill="#EF4444" stroke="#DC2626" stroke-width="2.5"/>
          <rect x="44" y="20" width="14" height="12" rx="4" fill="#EF4444" stroke="#DC2626" stroke-width="2.5"/>
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
          <path d="M 40 18 Q 42 10 50 12" stroke="#10B981" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <path d="M 40 16 Q 34 11 37 19 Z" fill="#10B981"/>
          <circle cx="33" cy="46" r="23" fill="#EF4444"/>
          <circle cx="47" cy="46" r="23" fill="#EF4444"/>
          <circle cx="34" cy="42" r="3.5" fill="#FFFFFF"/>
          <circle cx="46" cy="42" r="3.5" fill="#FFFFFF"/>
          <path d="M 37 51 Q 40 56 43 51" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <ellipse cx="28" cy="48" rx="3.5" ry="2" fill="#FCA5A5"/>
          <ellipse cx="52" cy="48" rx="3.5" ry="2" fill="#FCA5A5"/>
        </svg>`
    },
    {
      id: 'red_heart',
      name: 'Coração Vermelho',
      colorId: 'red',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <path d="M 40 26 C 36 16 20 16 16 28 C 12 40 26 56 40 68 C 54 56 68 40 64 28 C 60 16 44 16 40 26 Z" fill="#EF4444" stroke="#DC2626" stroke-width="2.5"/>
          <circle cx="33" cy="38" r="3" fill="#FFFFFF"/>
          <circle cx="47" cy="38" r="3" fill="#FFFFFF"/>
          <path d="M 36 46 Q 40 50 44 46" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
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
          <rect x="14" y="38" width="52" height="20" rx="7" fill="#3B82F6" stroke="#2563EB" stroke-width="2.5"/>
          <path d="M 24 38 Q 30 23 44 23 L 54 38 Z" fill="#3B82F6" stroke="#2563EB" stroke-width="2"/>
          <circle cx="36" cy="32" r="5" fill="#BFDBFE"/>
          <circle cx="26" cy="58" r="7" fill="#1E293B"/>
          <circle cx="26" cy="58" r="3" fill="#FFFFFF"/>
          <circle cx="54" cy="58" r="7" fill="#1E293B"/>
          <circle cx="54" cy="58" r="3" fill="#FFFFFF"/>
        </svg>`
    },
    {
      id: 'blue_whale',
      name: 'Baleinha Azul',
      colorId: 'blue',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <path d="M 40 16 Q 40 10 44 12 M 40 16 Q 40 10 36 12" stroke="#60A5FA" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <ellipse cx="40" cy="46" rx="26" ry="18" fill="#3B82F6"/>
          <path d="M 64 44 Q 72 34 74 46 Q 72 56 64 48 Z" fill="#2563EB"/>
          <circle cx="28" cy="42" r="3.5" fill="#FFFFFF"/>
          <circle cx="29" cy="42" r="2" fill="#1E3A8A"/>
          <path d="M 26 50 Q 32 54 36 50" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
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
          <ellipse cx="44" cy="48" rx="22" ry="16" fill="#F59E0B"/>
          <circle cx="28" cy="34" r="14" fill="#F59E0B"/>
          <polygon points="14,35 23,30 23,40" fill="#EA580C"/>
          <circle cx="27" cy="32" r="3.5" fill="#78350F"/>
          <circle cx="28" cy="31" r="1.5" fill="#FFFFFF"/>
          <ellipse cx="46" cy="47" rx="11" ry="7" fill="#D97706"/>
        </svg>`
    },
    {
      id: 'yellow_star',
      name: 'Estrelinha Amarela',
      colorId: 'yellow',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <path d="M 40 14 L 47 30 L 65 31 L 51 43 L 56 61 L 40 50 L 24 61 L 29 43 L 15 31 L 33 30 Z" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
          <circle cx="35" cy="36" r="3" fill="#78350F"/>
          <circle cx="45" cy="36" r="3" fill="#78350F"/>
          <path d="M 37 43 Q 40 47 43 43" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
        </svg>`
    },

    // --- VERDE (#10B981) ---
    {
      id: 'green_block',
      name: 'Bloquinho Verde',
      colorId: 'green',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <rect x="15" y="30" width="50" height="38" rx="8" fill="#10B981" stroke="#059669" stroke-width="3"/>
          <rect x="22" y="20" width="14" height="12" rx="4" fill="#10B981" stroke="#059669" stroke-width="2.5"/>
          <rect x="44" y="20" width="14" height="12" rx="4" fill="#10B981" stroke="#059669" stroke-width="2.5"/>
          <circle cx="32" cy="48" r="3.5" fill="#FFFFFF"/>
          <circle cx="48" cy="48" r="3.5" fill="#FFFFFF"/>
          <circle cx="33" cy="49" r="2" fill="#064E3B"/>
          <circle cx="49" cy="49" r="2" fill="#064E3B"/>
          <path d="M 36 57 Q 40 62 44 57" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'green_frog',
      name: 'Sapinho Verde',
      colorId: 'green',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Olhos no alto -->
          <circle cx="28" cy="28" r="9" fill="#10B981"/>
          <circle cx="52" cy="28" r="9" fill="#10B981"/>
          <circle cx="28" cy="28" r="4.5" fill="#FFFFFF"/>
          <circle cx="52" cy="28" r="4.5" fill="#FFFFFF"/>
          <circle cx="29" cy="28" r="2" fill="#064E3B"/>
          <circle cx="53" cy="28" r="2" fill="#064E3B"/>
          <!-- Rosto do sapinho -->
          <ellipse cx="40" cy="46" rx="25" ry="19" fill="#10B981" stroke="#059669" stroke-width="2"/>
          <path d="M 28 48 Q 40 60 52 48" stroke="#064E3B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <ellipse cx="26" cy="45" rx="3.5" ry="2" fill="#A7F3D0"/>
          <ellipse cx="54" cy="45" rx="3.5" ry="2" fill="#A7F3D0"/>
        </svg>`
    },
    {
      id: 'green_turtle',
      name: 'Tartaruguinha Verde',
      colorId: 'green',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Casco -->
          <ellipse cx="40" cy="44" rx="22" ry="17" fill="#10B981" stroke="#047857" stroke-width="2.5"/>
          <!-- Cabeça -->
          <circle cx="18" cy="44" r="9" fill="#34D399"/>
          <circle cx="16" cy="42" r="2" fill="#064E3B"/>
          <!-- Patinhas -->
          <circle cx="30" cy="62" r="5" fill="#34D399"/>
          <circle cx="52" cy="62" r="5" fill="#34D399"/>
          <!-- Desenho do casco -->
          <path d="M 32 40 L 40 33 L 48 40 L 44 52 L 36 52 Z" fill="#059669"/>
        </svg>`
    },

    // --- LARANJA (#F97316) ---
    {
      id: 'orange_block',
      name: 'Bloquinho Laranja',
      colorId: 'orange',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <rect x="15" y="30" width="50" height="38" rx="8" fill="#F97316" stroke="#EA580C" stroke-width="3"/>
          <rect x="22" y="20" width="14" height="12" rx="4" fill="#F97316" stroke="#EA580C" stroke-width="2.5"/>
          <rect x="44" y="20" width="14" height="12" rx="4" fill="#F97316" stroke="#EA580C" stroke-width="2.5"/>
          <circle cx="32" cy="48" r="3.5" fill="#FFFFFF"/>
          <circle cx="48" cy="48" r="3.5" fill="#FFFFFF"/>
          <circle cx="33" cy="49" r="2" fill="#7C2D12"/>
          <circle cx="49" cy="49" r="2" fill="#7C2D12"/>
          <path d="M 36 57 Q 40 62 44 57" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'orange_fish',
      name: 'Peixinho Laranja',
      colorId: 'orange',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Corpo do peixinho -->
          <path d="M 18 42 C 28 26 52 26 62 42 C 52 58 28 58 18 42 Z" fill="#F97316" stroke="#EA580C" stroke-width="2"/>
          <!-- Cauda -->
          <polygon points="62,42 74,28 74,56" fill="#F97316" stroke="#EA580C" stroke-width="2"/>
          <!-- Olho -->
          <circle cx="28" cy="38" r="4" fill="#FFFFFF"/>
          <circle cx="27" cy="38" r="2" fill="#7C2D12"/>
          <!-- Boquinha -->
          <circle cx="16" cy="42" r="2" fill="#EA580C"/>
          <ellipse cx="42" cy="44" rx="4" ry="7" fill="#FB923C"/>
        </svg>`
    },
    {
      id: 'orange_fox',
      name: 'Raposinha Laranja',
      colorId: 'orange',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Orelhas -->
          <polygon points="20,18 32,32 16,36" fill="#F97316"/>
          <polygon points="60,18 48,32 64,36" fill="#F97316"/>
          <!-- Cabeça -->
          <ellipse cx="40" cy="44" rx="24" ry="18" fill="#F97316"/>
          <!-- Bochechas brancas -->
          <ellipse cx="28" cy="48" rx="10" ry="10" fill="#FFFFFF"/>
          <ellipse cx="52" cy="48" rx="10" ry="10" fill="#FFFFFF"/>
          <circle cx="30" cy="42" r="3" fill="#7C2D12"/>
          <circle cx="50" cy="42" r="3" fill="#7C2D12"/>
          <circle cx="40" cy="52" r="3.5" fill="#1E293B"/>
        </svg>`
    },

    // --- ROXO (#8B5CF6) ---
    {
      id: 'purple_block',
      name: 'Bloquinho Roxo',
      colorId: 'purple',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <rect x="15" y="30" width="50" height="38" rx="8" fill="#8B5CF6" stroke="#7C3AED" stroke-width="3"/>
          <rect x="22" y="20" width="14" height="12" rx="4" fill="#8B5CF6" stroke="#7C3AED" stroke-width="2.5"/>
          <rect x="44" y="20" width="14" height="12" rx="4" fill="#8B5CF6" stroke="#7C3AED" stroke-width="2.5"/>
          <circle cx="32" cy="48" r="3.5" fill="#FFFFFF"/>
          <circle cx="48" cy="48" r="3.5" fill="#FFFFFF"/>
          <circle cx="33" cy="49" r="2" fill="#4C1D95"/>
          <circle cx="49" cy="49" r="2" fill="#4C1D95"/>
          <path d="M 36 57 Q 40 62 44 57" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`
    },
    {
      id: 'purple_grape',
      name: 'Uvinha Roxa',
      colorId: 'purple',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Cabinho verde -->
          <path d="M 40 18 Q 42 12 48 14" stroke="#10B981" stroke-width="3" fill="none" stroke-linecap="round"/>
          <!-- Bagas de uva -->
          <circle cx="32" cy="30" r="8" fill="#8B5CF6"/>
          <circle cx="48" cy="30" r="8" fill="#8B5CF6"/>
          <circle cx="26" cy="44" r="8" fill="#8B5CF6"/>
          <circle cx="40" cy="42" r="8" fill="#7C3AED"/>
          <circle cx="54" cy="44" r="8" fill="#8B5CF6"/>
          <circle cx="34" cy="56" r="7.5" fill="#7C3AED"/>
          <circle cx="46" cy="56" r="7.5" fill="#7C3AED"/>
          <circle cx="40" cy="66" r="6" fill="#6D28D9"/>
          <circle cx="39" cy="41" r="2" fill="#FFFFFF"/>
        </svg>`
    },
    {
      id: 'purple_flower',
      name: 'Florzinha Roxa',
      colorId: 'purple',
      renderSvg: () => `
        <svg viewBox="0 0 80 80" width="70" height="70">
          <!-- Pétalas roxas -->
          <circle cx="40" cy="26" r="10" fill="#8B5CF6"/>
          <circle cx="54" cy="36" r="10" fill="#8B5CF6"/>
          <circle cx="48" cy="52" r="10" fill="#8B5CF6"/>
          <circle cx="32" cy="52" r="10" fill="#8B5CF6"/>
          <circle cx="26" cy="36" r="10" fill="#8B5CF6"/>
          <!-- Miolo amarelo sorridente -->
          <circle cx="40" cy="40" r="11" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
          <circle cx="37" cy="38" r="2" fill="#78350F"/>
          <circle cx="43" cy="38" r="2" fill="#78350F"/>
          <path d="M 37 43 Q 40 46 43 43" stroke="#78350F" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        </svg>`
    }
  ];

  constructor(screenManager: ScreenManager) {
    this.screenManager = screenManager;
  }

  public mount(container: HTMLElement): void {
    const gameEl = document.createElement('div');
    gameEl.className = 'game-screen minigame-colors';
    gameEl.innerHTML = `
      <!-- Barra Superior com HUD de Progresso de 3 Estrelas e Nível -->
      <nav class="game-navbar">
        <button class="back-button" id="btnBackToHubColors" aria-label="Voltar ao Menu">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>Menu</span>
        </button>

        <!-- HUD Central: Nível Atual + Medidor Lúdico de 3 Estrelas -->
        <div class="hud-center-progress">
          <div class="hud-level-pill" id="hudLevelBadgeColors">
            ${this.progress.getLevelLabel()}
          </div>
          <div class="hud-level-stars" id="hudLevelStarsColors" title="Vença 3 rodadas para subir de nível!">
            <span class="hud-star" data-star-index="0">★</span>
            <span class="hud-star" data-star-index="1">★</span>
            <span class="hud-star" data-star-index="2">★</span>
          </div>
        </div>

        <button class="action-btn-restart" id="btnRestartColors" title="Recomeçar do início">
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

      <!-- PARTE INFERIOR: Baldes/Cestas Estilizadas das Cores Ativas -->
      <section class="buckets-bottom-area">
        <div class="buckets-container" id="bucketsContainer">
          <!-- Renderizado dinamicamente por renderBucketsDOM() -->
        </div>
      </section>
    `;

    container.appendChild(gameEl);
    this.rootElement = gameEl;

    // Configuração de botões superiores
    const btnBack = gameEl.querySelector('#btnBackToHubColors');
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

    const btnRestart = gameEl.querySelector('#btnRestartColors');
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
   * Recalibra proporcionalmente as peças na prateleira para evitar desalinhamento após girar a tela
   */
  private recalibratePositions(): void {
    if (!this.rootElement) return;
    const containerRect = this.rootElement.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;

    const toys = this.rootElement.querySelectorAll<HTMLElement>('.draggable-toy');
    toys.forEach(toy => {
      if (!toy.classList.contains('locked') && !toy.classList.contains('dragging')) {
        toy.style.transition = 'none';
        toy.style.transform = 'translate3d(0, 0, 0) scale(1)';
      }
    });
  }

  /**
   * Remove com segurança qualquer banner de celebração do DOM
   */
  private removeVictoryBanner(): void {
    const banners = this.rootElement?.querySelectorAll('.round-complete-banner');
    banners?.forEach(b => b.remove());
  }

  /**
   * Atualiza as 3 estrelas do HUD e o indicador de nível
   */
  private updateHUD(): void {
    const levelBadge = this.rootElement?.querySelector('#hudLevelBadgeColors');
    if (levelBadge) {
      levelBadge.textContent = this.progress.getLevelLabel();
    }

    const filledStars = this.progress.getCompletedRoundsInLevel();
    const starEls = this.rootElement?.querySelectorAll('#hudLevelStarsColors .hud-star');
    starEls?.forEach((star, index) => {
      if (index < filledStars) {
        star.classList.add('star-active');
      } else {
        star.classList.remove('star-active');
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
    this.activeToy = null;

    // Obtém configuração do nível ativo do ProgressManager
    const config = this.progress.getColorConfig();
    this.currentSnapMargin = config.snapMargin;

    // Atualiza o HUD de 3 estrelas
    this.updateHUD();

    // Filtra as categorias disponíveis para o nível atual
    const allowedCategories = this.categories.filter(c => config.availableColors.includes(c.id));

    // Determina a quantidade de baldes ativos (máximo 4 para garantir conforto em telas móveis)
    let activeBucketCount = 3;
    if (config.level >= 2) {
      activeBucketCount = Math.min(4, allowedCategories.length);
    }

    // Seleciona e embaralha as categorias ativas para a rodada
    this.activeCategories = this.shuffle([...allowedCategories]).slice(0, activeBucketCount);

    // Garante que cada balde ativo receba pelo menos 1 brinquedo correspondente
    const bucketToyQuotas: Record<string, number> = {};
    this.activeCategories.forEach(cat => {
      bucketToyQuotas[cat.id] = 1;
    });

    let remainingToPick = config.totalToys - this.activeCategories.length;
    while (remainingToPick > 0) {
      const randomCat = this.activeCategories[Math.floor(Math.random() * this.activeCategories.length)];
      bucketToyQuotas[randomCat.id]++;
      remainingToPick--;
    }

    const selectedToys: ToyItem[] = [];
    this.activeCategories.forEach(cat => {
      const catToys = this.allToys.filter(t => t.colorId === cat.id);
      const shuffledCatToys = this.shuffle([...catToys]);
      const quota = bucketToyQuotas[cat.id];
      for (let i = 0; i < quota; i++) {
        const template = shuffledCatToys[i % shuffledCatToys.length];
        selectedToys.push({
          ...template,
          id: `${template.id}_${i}_${Math.random().toString(36).substring(2, 7)}`
        });
      }
    });

    this.currentToys = this.shuffle(selectedToys);
    this.totalItems = this.currentToys.length;
    this.requiredCountsByColor = bucketToyQuotas;
    this.collectedCountsByColor = {};
    this.activeCategories.forEach(c => {
      this.collectedCountsByColor[c.id] = 0;
    });

    // Renderiza baldes e prateleira de brinquedos
    this.renderBucketsDOM();
    this.renderToysShelf();
  }

  /**
   * Renderiza os baldes correspondentes às cores ativas da rodada
   */
  private renderBucketsDOM(): void {
    const container = this.rootElement?.querySelector<HTMLElement>('#bucketsContainer');
    if (!container) return;

    container.innerHTML = this.activeCategories.map(cat => {
      const quota = this.requiredCountsByColor[cat.id] || 1;
      return `
        <div class="color-bucket bucket-${cat.id}" data-color="${cat.id}" id="bucket-${cat.id}"
             style="--bucket-color: ${cat.colorHex}; --bucket-glow: ${cat.glowRgba}; border-bottom: 8px solid ${cat.colorHex};">
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
          <div class="bucket-collected-indicator" id="indicator-${cat.id}">0 / ${quota}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Renderiza os brinquedos na prateleira superior central com AbortController limpo
   */
  private renderToysShelf(): void {
    const shelf = this.rootElement?.querySelector<HTMLElement>('#toysShelf');
    if (!shelf) return;

    // Cancela e revoga listeners de toque da rodada anterior via AbortController
    if (this.roundAbortController) {
      this.roundAbortController.abort();
      this.roundAbortController = null;
    }
    this.roundAbortController = new AbortController();
    const { signal } = this.roundAbortController;

    shelf.innerHTML = this.currentToys.map(toy => `
      <div class="draggable-toy" data-color="${toy.colorId}" id="toy-${toy.id}" style="touch-action: none;">
        <div class="toy-card">
          ${toy.renderSvg()}
        </div>
      </div>
    `).join('');

    // Configura drag-and-drop tolerante para cada brinquedo
    const toys = shelf.querySelectorAll<HTMLElement>('.draggable-toy');
    toys.forEach(toy => {
      this.setupDraggableToy(toy, signal);
    });
  }

  /**
   * Sistema de Drag-and-Drop Tolerante com signal de cancelamento limpo:
   * - setPointerCapture para travar arrasto em 1 dedo e rejeitar palma da mão
   * - scale(1.15) e sombra evidente durante o arrasto
   * - Detecção contínua de sobrevoo para pulsar o balde alvo correspondente
   * - Verificação de bounding box expandida com margem ajustada ao nível
   * - Animação de encolhimento e fade out no acerto; interpolação suave no erro
   */
  private setupDraggableToy(toy: HTMLElement, signal: AbortSignal): void {
    let startX = 0;
    let startY = 0;
    let originalRect: DOMRect;
    let isDragging = false;
    const toyColor = toy.dataset.color as ColorId;

    const onPointerDown = (e: PointerEvent) => {
      if (this.isRoundComplete) return;
      if (toy.classList.contains('locked')) return;
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

      toy.classList.add('dragging');
      toy.style.transition = 'none';
      toy.style.transform = `translate3d(0, 0, 0) scale(1.15)`;

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

      // Feedback visual contínuo: checa sobrevoo na área do balde (margem progressiva)
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
      this.clearAllBucketHover();

      // Checa colisão com os baldes na área delimitada (+snapMargin)
      const matchedBucket = this.getMatchingBucket(toy, toyColor);

      if (matchedBucket) {
        this.handleSnapToBucket(toy, matchedBucket, originalRect);
        return;
      }

      // Soltou fora ou no balde errado: retorna suavemente
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

    toy.addEventListener('pointerdown', onPointerDown, { signal });
    toy.addEventListener('pointermove', onPointerMove, { signal });
    toy.addEventListener('pointerup', onPointerUp, { signal });
    toy.addEventListener('pointercancel', onPointerCancel, { signal });
  }

  /**
   * Verifica se o objeto está sobrevoando a bounding box expandida
   * do balde da mesma cor para acionar o pulso suave
   */
  private checkBucketHover(toy: HTMLElement, toyColor: ColorId): void {
    const toyRect = toy.getBoundingClientRect();
    const toyCenter = {
      x: toyRect.left + toyRect.width / 2,
      y: toyRect.top + toyRect.height / 2
    };

    const buckets = this.rootElement?.querySelectorAll<HTMLElement>('.color-bucket');
    buckets?.forEach(bucket => {
      const bucketColor = bucket.dataset.color;
      const bRect = bucket.getBoundingClientRect();

      const isInside =
        toyCenter.x >= bRect.left - this.currentSnapMargin &&
        toyCenter.x <= bRect.right + this.currentSnapMargin &&
        toyCenter.y >= bRect.top - this.currentSnapMargin &&
        toyCenter.y <= bRect.bottom + this.currentSnapMargin;

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
   * na bounding box expandida (+snapMargin) do balde da mesma cor
   */
  private getMatchingBucket(toy: HTMLElement, toyColor: ColorId): HTMLElement | null {
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

      const isInside =
        toyCenter.x >= bRect.left - this.currentSnapMargin &&
        toyCenter.x <= bRect.right + this.currentSnapMargin &&
        toyCenter.y >= bRect.top - this.currentSnapMargin &&
        toyCenter.y <= bRect.bottom + this.currentSnapMargin;

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
    const targetDeltaX = (bucketRect.left + bucketRect.width / 2) - (originalRect.left + originalRect.width / 2);
    const targetDeltaY = (bucketRect.top + bucketRect.height * 0.32) - (originalRect.top + originalRect.height / 2);

    toy.style.transition = 'transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.26s ease';
    toy.style.transform = `translate3d(${targetDeltaX}px, ${targetDeltaY}px, 0) scale(0.12)`;
    toy.style.opacity = '0';

    audioManager.playSnap();

    bucket.classList.remove('bucket-jump');
    void bucket.offsetWidth;
    bucket.classList.add('bucket-jump');

    const colorId = bucket.dataset.color || '';
    this.collectedCountsByColor[colorId] = (this.collectedCountsByColor[colorId] || 0) + 1;
    const current = this.collectedCountsByColor[colorId];
    const quota = this.requiredCountsByColor[colorId] || 1;

    const indicator = bucket.querySelector(`#indicator-${colorId}`);
    if (indicator) {
      indicator.textContent = `${current} / ${quota}`;
    }

    this.matchedCount++;

    if (this.matchedCount >= this.totalItems && !this.isRoundComplete) {
      this.handleRoundVictory();
    }
  }

  /**
   * Retorno suave não punitivo quando solto no vazio ou no balde errado
   */
  private handleSoftReturn(toy: HTMLElement): void {
    toy.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
    toy.style.transform = 'translate3d(0, 0, 0) scale(1)';
    audioManager.playReturn();
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
      this.confetti.trigger(this.rootElement, 2200);
    }

    this.removeVictoryBanner();

    const banner = document.createElement('div');
    banner.className = 'round-complete-banner pop-anim';
    banner.id = 'colorsVictoryBanner';
    banner.innerHTML = `
      <h3>🎉 Incrível!</h3>
      <p>Você separou todas as cores! ⭐</p>
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
        <div class="level-up-icon">🌟🎨</div>
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
        <div class="champion-trophy">🏆👑🎨</div>
        <h2>Super Campeão!</h2>
        <p>Você é um mestre das cores e completou todos os desafios!</p>
        <button class="btn-champion-continue" id="btnChampionContinueColors">
          Continuar Brincando 🚀
        </button>
      </div>
    `;

    this.rootElement.appendChild(overlay);

    const btn = overlay.querySelector('#btnChampionContinueColors');
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
