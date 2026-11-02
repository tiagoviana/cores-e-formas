/**
 * ParticleSystem - Motor leve de partículas em HTML5 Canvas nativo
 * Executa confetes e estrelas coloridas a 60fps sem sobrecarregar a árvore DOM.
 * Dispara explosão radial do centro da tela com gravidade, rotação e resistência do ar.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'star';
  wobble: number;
  wobbleSpeed: number;
  alpha: number;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private animId: number | null = null;
  private resizeTimer: number | null = null;
  private container: HTMLElement | null = null;

  private readonly colors = [
    '#EF4444', // Vermelho
    '#3B82F6', // Azul
    '#F59E0B', // Amarelo
    '#10B981', // Verde
    '#EC4899', // Rosa
    '#8B5CF6'  // Roxo
  ];

  /**
   * Listener debounced para redimensionamento do canvas em mudanças de orientação
   */
  private handleResize = () => {
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = window.setTimeout(() => {
      this.recalibrateCanvasDimensions();
    }, 100);
  };

  /**
   * Ajusta as dimensões do canvas tratando casos transitórios de width/height igual a zero
   */
  private recalibrateCanvasDimensions(): void {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    // Protege contra dimensões temporárias iguais a zero durante giro da tela
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  /**
   * Dispara a explosão de confetes e estrelas coloridas a partir do centro
   */
  public trigger(container: HTMLElement, durationMs: number = 2500): void {
    // Cancela estritamente qualquer loop de animação anterior
    this.stop();

    const rect = container.getBoundingClientRect();
    // Proteção contra dimensões 0 durante transição de tela
    if (rect.width <= 0 || rect.height <= 0) return;

    this.container = container;
    const canvas = document.createElement('canvas');
    canvas.className = 'particle-engine-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '999';

    container.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Limita a 2 para máxima performance a 60fps
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }

    // Registra listener com debounce para orientação/resize
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);

    // Ponto de origem: centro da tela
    const originX = rect.width / 2;
    const originY = rect.height * 0.45;

    // Gera 90 partículas (estrelas e círculos) com explosão radial
    this.particles = Array.from({ length: 90 }).map((_, i) => {
      const angle = (Math.PI * 2 * (i / 90)) + (Math.random() * 0.4 - 0.2);
      const speed = 7 + Math.random() * 14;
      const isStar = Math.random() > 0.45;

      return {
        x: originX + (Math.random() - 0.5) * 40,
        y: originY + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5,
        size: isStar ? (14 + Math.random() * 10) : (8 + Math.random() * 8),
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        shape: isStar ? 'star' : 'circle',
        wobble: Math.random() * Math.PI,
        wobbleSpeed: 0.08 + Math.random() * 0.08,
        alpha: 1
      };
    });

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;
      if (!this.ctx || !this.canvas || !this.container) {
        this.stop();
        return;
      }

      const currentRect = this.container.getBoundingClientRect();
      if (currentRect.width <= 0 || currentRect.height <= 0) {
        // Aguarda estabilização das dimensões sem quebrar o loop
        if (elapsed < durationMs) {
          this.animId = requestAnimationFrame(render);
        } else {
          this.stop();
        }
        return;
      }

      this.ctx.clearRect(0, 0, currentRect.width, currentRect.height);

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        // Física fluida: gravidade, rotação e arrasto do ar
        p.x += p.vx + Math.sin(p.wobble) * 1.2;
        p.y += p.vy;
        p.vy += 0.36; // Gravidade
        p.vx *= 0.985; // Resistência do ar
        p.vy *= 0.985;
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;

        // Desvanecimento suave nos últimos 800ms
        if (elapsed > durationMs - 800) {
          p.alpha = Math.max(0, 1 - (elapsed - (durationMs - 800)) / 800);
        }

        this.ctx.save();
        this.ctx.globalAlpha = p.alpha;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        this.ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.drawFivePointStar(this.ctx, 0, 0, p.size / 2, p.size / 4);
          this.ctx.fill();
        }

        this.ctx.restore();
      }

      if (elapsed < durationMs) {
        this.animId = requestAnimationFrame(render);
      } else {
        this.stop();
      }
    };

    this.animId = requestAnimationFrame(render);
  }

  /**
   * Desenha estrela de 5 pontas perfeita
   */
  private drawFivePointStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / 5;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < 5; i++) {
      let x = cx + Math.cos(rot) * outerR;
      let y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
  }

  /**
   * Cancela rigorosamente a animação, remove listeners e limpa a memória
   */
  public stop(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);

    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
      this.canvas = null;
    }
    this.ctx = null;
    this.container = null;
    this.particles = [];
  }
}
