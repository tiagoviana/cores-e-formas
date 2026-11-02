export type ScreenId = 'home' | 'shapes' | 'colors';

export interface Screen {
  readonly id: ScreenId;
  mount(container: HTMLElement): void;
  unmount(): void;
}
