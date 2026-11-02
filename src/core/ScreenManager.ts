import { Screen, ScreenId } from './types.ts';
import { audioManager } from '../audio/AudioManager.ts';

export class ScreenManager {
  private screens: Map<ScreenId, Screen> = new Map();
  private currentScreen: Screen | null = null;
  private container: HTMLElement;
  private isTransitioning: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public register(screen: Screen): void {
    this.screens.set(screen.id, screen);
  }

  public async navigateTo(screenId: ScreenId): Promise<void> {
    if (this.isTransitioning) return;
    const targetScreen = this.screens.get(screenId);
    if (!targetScreen) {
      console.error(`Tela não encontrada: ${screenId}`);
      return;
    }

    if (this.currentScreen?.id === screenId) return;

    this.isTransitioning = true;
    audioManager.playPop();

    // Se já houver uma tela atual, faz a animação de saída
    if (this.currentScreen) {
      this.container.classList.add('screen-leaving');
      await new Promise(resolve => setTimeout(resolve, 200));
      this.currentScreen.unmount();
      this.container.innerHTML = '';
      this.container.classList.remove('screen-leaving');
    }

    this.currentScreen = targetScreen;
    this.container.classList.add('screen-entering');
    this.currentScreen.mount(this.container);

    // Permite que o DOM renderize antes de remover a classe de animação
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.container.classList.remove('screen-entering');
        this.isTransitioning = false;
      });
    });
  }

  public getCurrentScreenId(): ScreenId | null {
    return this.currentScreen ? this.currentScreen.id : null;
  }
}
