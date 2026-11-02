import { audioManager } from '../audio/AudioManager.ts';

interface ConfirmModalOptions {
  container?: HTMLElement;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export class ConfirmModal {
  private overlay: HTMLElement | null = null;

  public static show(options: ConfirmModalOptions): ConfirmModal {
    const modal = new ConfirmModal();
    modal.render(options);
    return modal;
  }

  private render(options: ConfirmModalOptions): void {
    const target = options.container || document.body;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-exit-overlay';
    overlay.innerHTML = `
      <div class="confirm-exit-card pop-anim">
        <div class="confirm-exit-mascot">🏠🧸</div>
        <h2>${options.title || 'Voltar para o Menu?'}</h2>
        <p>${options.message || 'Quer escolher outro jogo ou continuar brincando aqui?'}</p>
        <div class="confirm-exit-buttons">
          <button class="btn-confirm-yes" id="btnConfirmYes">
            ${options.confirmText || 'Sim, ir ao Menu'}
          </button>
          <button class="btn-confirm-no" id="btnConfirmNo">
            ${options.cancelText || 'Continuar Brincando! ▶️'}
          </button>
        </div>
      </div>
    `;

    target.appendChild(overlay);
    this.overlay = overlay;

    // Dispara som de aviso leve
    audioManager.playPop();

    const btnYes = overlay.querySelector('#btnConfirmYes');
    btnYes?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playPop();
      this.close();
      options.onConfirm();
    });

    const btnNo = overlay.querySelector('#btnConfirmNo');
    btnNo?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playPop();
      this.close();
      if (options.onCancel) {
        options.onCancel();
      }
    });

    // Clicar fora também cancela
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        audioManager.playPop();
        this.close();
        if (options.onCancel) {
          options.onCancel();
        }
      }
    });
  }

  public close(): void {
    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}
