/**
 * AudioManager - Gerenciador de Áudio Procedural com Web Audio API
 * 
 * Cria todos os efeitos sonoros em tempo real através de síntese matemática,
 * sem requisições de rede ou arquivos de áudio externos (.mp3, .wav).
 * Totalmente otimizado para jogos infantis (timbres quentes, suaves e alegres).
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isUnlocked: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    this.setupUnlockListeners();
  }

  /**
   * Inicializa ou obtém o AudioContext sob demanda
   */
  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master Gain para controle global de volume e mute
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /**
   * Desbloqueia o AudioContext no primeiro gesto do usuário
   * (requisito de políticas de autoplay de navegadores modernos)
   */
  private setupUnlockListeners(): void {
    const unlock = async () => {
      try {
        const ctx = this.getContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        this.isUnlocked = true;
        // Remove listeners assim que desbloqueado
        ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(eventName => {
          window.removeEventListener(eventName, unlock);
        });
      } catch (err) {
        console.warn('Erro ao desbloquear AudioContext:', err);
      }
    };

    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(eventName => {
      window.addEventListener(eventName, unlock, { once: true, passive: true });
    });
  }

  /**
   * Força o desbloqueio explícito (ex: clique no botão iniciar ou qualquer ação)
   */
  public async unlock(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.isUnlocked = true;
  }

  /**
   * Alterna estado de mudo
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : 0.85;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.05);
    }
    return this.isMuted;
  }

  public getUnlocked(): boolean {
    return this.isUnlocked;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // ==========================================
  // EFEITOS SONOROS SINTETIZADOS PROCEDURALMENTE
  // ==========================================

  /**
   * 1. Som de 'pickup' (pegar peça)
   * Frequência rápida ascendente alegre, curta e fofa (sweep de 320Hz a 680Hz).
   */
  public playPickup(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Timbre senoidal puro com toque leve de triângulo para calor
    osc.type = 'sine';

    // Frequência rápida ascendente (sweep de 320 Hz a 700 Hz em 100ms)
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.09);

    // Envelope rápido e suave
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * 2. Som de 'snap/acerto'
   * Acorde maior brilhante de sino/marimba: notas C5 (523Hz), E5 (659Hz), G5 (784Hz)
   * com timbre percussivo e cristalino infantil.
   */
  public playSnap(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    // Frequências do acorde C5 maior: C5, E5, G5 e oitava superior C6 para brilho
    const notes = [
      { freq: 523.25, delay: 0.00, duration: 0.55, vol: 0.28 }, // C5
      { freq: 659.25, delay: 0.035, duration: 0.55, vol: 0.26 }, // E5
      { freq: 783.99, delay: 0.07, duration: 0.60, vol: 0.24 },  // G5
      { freq: 1046.50, delay: 0.10, duration: 0.65, vol: 0.18 } // C6 (brilho de sino)
    ];

    notes.forEach(({ freq, delay, duration, vol }) => {
      const noteTime = now + delay;
      
      // Oscilador principal (Marimba fundamental)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      // Harmônico sutil (chime/glockenspiel)
      const harmonicOsc = ctx.createOscillator();
      harmonicOsc.type = 'triangle';
      harmonicOsc.frequency.setValueAtTime(freq * 2, noteTime);

      const noteGain = ctx.createGain();
      const harmonicGain = ctx.createGain();

      // Envelope percussivo de sino: ataque instantâneo e decaimento exponencial
      noteGain.gain.setValueAtTime(0.001, noteTime);
      noteGain.gain.linearRampToValueAtTime(vol, noteTime + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration);

      harmonicGain.gain.setValueAtTime(0.001, noteTime);
      harmonicGain.gain.linearRampToValueAtTime(vol * 0.25, noteTime + 0.01);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + (duration * 0.5));

      osc.connect(noteGain);
      harmonicOsc.connect(harmonicGain);

      if (this.masterGain) {
        noteGain.connect(this.masterGain);
        harmonicGain.connect(this.masterGain);
      }

      osc.start(noteTime);
      harmonicOsc.start(noteTime);

      osc.stop(noteTime + duration);
      harmonicOsc.stop(noteTime + duration);
    });
  }

  /**
   * 3. Som de 'retorno' (soltar no lugar errado)
   * Glissando descendente curto, suave e acolhedor (não punitivo, tom de 'boop' fofinho).
   * 380Hz descendo para 240Hz com decaimento macio.
   */
  public playReturn(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Timbre redondo e macio
    osc.type = 'sine';

    // Glissando suave descendente: de 380 Hz para 230 Hz
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(230, now + 0.22);

    // Envelope não agressivo: ataque macio e fade-out relaxante
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * 4. Fanfarra curta de vitória de fase
   * Sequência melódica animada e triunfante para comemoração infantil:
   * Notas: G4 -> C5 -> E5 -> G5 -> Acorde final brilhante C5+E5+G5+C6!
   */
  public playVictory(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // Arpeggio alegre inicial
    const melody = [
      { freq: 392.00, start: 0.00, dur: 0.12, vol: 0.22 }, // G4
      { freq: 523.25, start: 0.11, dur: 0.12, vol: 0.24 }, // C5
      { freq: 659.25, start: 0.22, dur: 0.12, vol: 0.25 }, // E5
      { freq: 783.99, start: 0.33, dur: 0.20, vol: 0.28 }, // G5
    ];

    melody.forEach(({ freq, start, dur, vol }) => {
      const time = now + start;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(gain);
      if (this.masterGain) gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + dur);
    });

    // Grande acorde final celebratório (sustentado com efeito de sinos/celesta)
    const chordTime = now + 0.50;
    const finalChord = [
      { freq: 523.25, vol: 0.22 },  // C5
      { freq: 659.25, vol: 0.22 },  // E5
      { freq: 783.99, vol: 0.22 },  // G5
      { freq: 1046.50, vol: 0.25 }, // C6
      { freq: 1318.51, vol: 0.15 }  // E6 (brilho extra de estrelinha)
    ];

    finalChord.forEach(({ freq, vol }) => {
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, chordTime);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(freq, chordTime);

      gain.gain.setValueAtTime(0.001, chordTime);
      gain.gain.linearRampToValueAtTime(vol, chordTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + 1.1);

      osc.connect(gain);
      subOsc.connect(gain);
      if (this.masterGain) gain.connect(this.masterGain);

      osc.start(chordTime);
      subOsc.start(chordTime);

      osc.stop(chordTime + 1.15);
      subOsc.stop(chordTime + 1.15);
    });
  }

  /**
   * Som de clique fofo para botões de navegação
   */
  public playPop(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }
}

// Exporta uma instância singleton padrão
export const audioManager = new AudioManager();
