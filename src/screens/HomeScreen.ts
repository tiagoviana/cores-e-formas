import { Screen, ScreenId } from '../core/types.ts';
import { ScreenManager } from '../core/ScreenManager.ts';
import { audioManager } from '../audio/AudioManager.ts';

export class HomeScreen implements Screen {
  public readonly id: ScreenId = 'home';
  private screenManager: ScreenManager;
  private rootElement: HTMLElement | null = null;

  constructor(screenManager: ScreenManager) {
    this.screenManager = screenManager;
  }

  public mount(container: HTMLElement): void {
    const hub = document.createElement('div');
    hub.className = 'hub-screen';
    hub.innerHTML = `
      <!-- Decorações de fundo lúdicas -->
      <div class="cloud cloud-1"></div>
      <div class="cloud cloud-2"></div>
      <div class="cloud cloud-3"></div>
      <div class="floating-bubble bubble-1"></div>
      <div class="floating-bubble bubble-2"></div>
      <div class="floating-bubble bubble-3"></div>

      <!-- Cabeçalho do Hub -->
      <header class="hub-header">
        <div class="title-container">
          <span class="badge-kids">Jogos Educativos • 3 a 5 anos</span>
          <h1 class="game-title">
            <span class="word-cores">Cores</span>
            <span class="word-e">&</span>
            <span class="word-formas">Formas</span>
          </h1>
          <p class="subtitle">Escolha uma brincadeira divertida!</p>
        </div>
      </header>

      <!-- Botões Grandes Ilustrados para os Minijogos -->
      <main class="games-grid">
        <!-- Minijogo 1: Encaixe de Formas -->
        <button class="game-card card-shapes" id="btnPlayShapes" aria-label="Jogar Encaixe de Formas">
          <div class="card-glow"></div>
          <div class="card-badge">Minijogo 1</div>
          <div class="card-illustration">
            <svg viewBox="0 0 200 160" width="100%" height="100%">
              <!-- Círculo Sorridente -->
              <g class="anim-float-1">
                <circle cx="55" cy="80" r="38" fill="#FF5E7E" />
                <!-- Rosto fofo -->
                <circle cx="45" cy="74" r="4.5" fill="#FFFFFF"/>
                <circle cx="65" cy="74" r="4.5" fill="#FFFFFF"/>
                <path d="M 47 87 Q 55 96 63 87" stroke="#FFFFFF" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                <ellipse cx="40" cy="82" rx="4" ry="2.5" fill="#FFA3B5"/>
                <ellipse cx="70" cy="82" rx="4" ry="2.5" fill="#FFA3B5"/>
              </g>
              
              <!-- Estrela Brilhante -->
              <g class="anim-float-2">
                <path d="M 145 28 L 152 48 L 174 48 L 156 61 L 163 81 L 145 68 L 127 81 L 134 61 L 116 48 L 138 48 Z" fill="#FFB800"/>
                <circle cx="140" cy="54" r="3" fill="#6A4700"/>
                <circle cx="150" cy="54" r="3" fill="#6A4700"/>
                <path d="M 142 61 Q 145 65 148 61" stroke="#6A4700" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              </g>

              <!-- Triângulo Amigo -->
              <g class="anim-float-3">
                <polygon points="145,95 115,145 175,145" fill="#4CD964" />
                <circle cx="139" cy="126" r="3.5" fill="#FFFFFF"/>
                <circle cx="151" cy="126" r="3.5" fill="#FFFFFF"/>
                <path d="M 141 135 Q 145 140 149 135" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              </g>

              <!-- Silhueta de encaixe no fundo -->
              <circle cx="55" cy="80" r="44" fill="none" stroke="rgba(255, 94, 126, 0.35)" stroke-width="3" stroke-dasharray="6 6"/>
            </svg>
          </div>
          <div class="card-info">
            <h2 class="card-title">Encaixe de Formas</h2>
            <p class="card-desc">Arraste os círculos, estrelas e triângulos nos seus lugares!</p>
          </div>
          <div class="play-action-pill">
            <span>Começar</span>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>

        <!-- Minijogo 2: Separação de Cores -->
        <button class="game-card card-colors" id="btnPlayColors" aria-label="Jogar Separação de Cores">
          <div class="card-glow"></div>
          <div class="card-badge">Minijogo 2</div>
          <div class="card-illustration">
            <svg viewBox="0 0 200 160" width="100%" height="100%">
              <!-- Balde / Pote Azul -->
              <g class="anim-bucket-blue">
                <path d="M 30 75 L 40 140 Q 65 150 90 140 L 100 75 Z" fill="#5AC8FA"/>
                <ellipse cx="65" cy="75" rx="35" ry="12" fill="#78D4FF"/>
                <!-- Rosto no balde -->
                <circle cx="56" cy="108" r="4" fill="#1C4B6E"/>
                <circle cx="74" cy="108" r="4" fill="#1C4B6E"/>
                <path d="M 59 119 Q 65 126 71 119" stroke="#1C4B6E" stroke-width="3" fill="none" stroke-linecap="round"/>
              </g>

              <!-- Balde / Pote Amarelo -->
              <g class="anim-bucket-yellow">
                <path d="M 105 75 L 115 140 Q 140 150 165 140 L 175 75 Z" fill="#FFCC00"/>
                <ellipse cx="140" cy="75" rx="35" ry="12" fill="#FFE04D"/>
                <!-- Rosto no balde -->
                <circle cx="131" cy="108" r="4" fill="#6B5300"/>
                <circle cx="149" cy="108" r="4" fill="#6B5300"/>
                <path d="M 134 119 Q 140 126 146 119" stroke="#6B5300" stroke-width="3" fill="none" stroke-linecap="round"/>
              </g>

              <!-- Bolinhas coloridas voando -->
              <circle cx="50" cy="35" r="16" fill="#FF5E7E" class="anim-bounce-ball-1"/>
              <circle cx="110" cy="28" r="18" fill="#5AC8FA" class="anim-bounce-ball-2"/>
              <circle cx="160" cy="38" r="15" fill="#4CD964" class="anim-bounce-ball-3"/>
            </svg>
          </div>
          <div class="card-info">
            <h2 class="card-title">Separação de Cores</h2>
            <p class="card-desc">Guarde cada brinquedo no potinho da cor certa!</p>
          </div>
          <div class="play-action-pill">
            <span>Começar</span>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>
      </main>

      <!-- Painel de Demonstração dos Sons Sintetizados (Web Audio API) -->
      <footer class="hub-soundbar">
        <span class="soundbar-label">🎧 Sons Procedurais (Web Audio API):</span>
        <div class="soundbar-buttons">
          <button class="sound-chip" id="btnTestPickup" title="Testar som de pegar">
            <span>⤴️ Pickup</span>
          </button>
          <button class="sound-chip" id="btnTestSnap" title="Testar som de encaixe">
            <span>🔔 Snap (C5, E5, G5)</span>
          </button>
          <button class="sound-chip" id="btnTestReturn" title="Testar som de retorno suave">
            <span>↩️ Retorno Suave</span>
          </button>
          <button class="sound-chip" id="btnTestVictory" title="Testar fanfarra">
            <span>🎺 Fanfarra Vitória</span>
          </button>
        </div>
      </footer>
    `;

    container.appendChild(hub);
    this.rootElement = hub;

    this.bindEvents(hub);
  }

  private bindEvents(hub: HTMLElement): void {
    // Minijogo 1
    const btnShapes = hub.querySelector('#btnPlayShapes') as HTMLButtonElement | null;
    if (btnShapes) {
      btnShapes.addEventListener('click', () => {
        this.screenManager.navigateTo('shapes');
      });
    }

    // Minijogo 2
    const btnColors = hub.querySelector('#btnPlayColors') as HTMLButtonElement | null;
    if (btnColors) {
      btnColors.addEventListener('click', () => {
        this.screenManager.navigateTo('colors');
      });
    }

    // Botões para audição/teste procedural rápido
    const btnPickup = hub.querySelector('#btnTestPickup');
    btnPickup?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playPickup();
    });

    const btnSnap = hub.querySelector('#btnTestSnap');
    btnSnap?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playSnap();
    });

    const btnReturn = hub.querySelector('#btnTestReturn');
    btnReturn?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playReturn();
    });

    const btnVictory = hub.querySelector('#btnTestVictory');
    btnVictory?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playVictory();
    });
  }

  public unmount(): void {
    if (this.rootElement && this.rootElement.parentElement) {
      this.rootElement.parentElement.removeChild(this.rootElement);
    }
    this.rootElement = null;
  }
}
