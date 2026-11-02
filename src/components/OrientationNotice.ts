/**
 * OrientationNotice - Notificação amigável de orientação Landscape
 * Incentiva o uso do tablet/celular na horizontal (modo paisagem) para melhor
 * ergonomia dos minijogos de encaixe e classificação para crianças de 3 a 5 anos.
 */
export class OrientationNotice {
  private overlay: HTMLElement | null = null;
  private isDismissed: boolean = false;

  public init(): void {
    this.createOverlay();
    this.checkOrientation();

    window.addEventListener('resize', () => this.checkOrientation());
    window.addEventListener('orientationchange', () => this.checkOrientation());
  }

  private createOverlay(): void {
    const overlay = document.createElement('div');
    overlay.className = 'orientation-overlay hidden';
    overlay.innerHTML = `
      <div class="orientation-card">
        <div class="rotate-phone-icon">
          <svg viewBox="0 0 100 100" width="80" height="80">
            <rect x="25" y="15" width="50" height="70" rx="8" fill="#5AC8FA" stroke="#2C3E50" stroke-width="4"/>
            <circle cx="50" cy="76" r="4" fill="#FFFFFF"/>
            <path d="M 82 45 A 35 35 0 0 1 50 85" fill="none" stroke="#FF5E7E" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 4"/>
            <polyline points="45,82 50,85 53,79" fill="none" stroke="#FF5E7E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2>Gire a telinha!</h2>
        <p>O jogo fica bem mais divertido deitadinho na horizontal!</p>
        <button class="dismiss-orientation-btn" id="dismissOrientationBtn">Brincar assim mesmo</button>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;

    const btn = overlay.querySelector('#dismissOrientationBtn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isDismissed = true;
        this.hide();
      });
    }
  }

  private checkOrientation(): void {
    if (!this.overlay) return;
    const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 768;

    if (isPortrait && !this.isDismissed) {
      this.show();
    } else {
      this.hide();
    }
  }

  private show(): void {
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }
  }

  private hide(): void {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  }
}
