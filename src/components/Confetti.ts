/**
 * Confetti - Sistema de partículas de celebração leve e procedural
 * Cria confetes e estrelinhas flutuantes usando Canvas HTML5 nativo
 */
export class ConfettiCelebration {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
    shape: 'circle' | 'square' | 'star';
    alpha: number;
  }> = [];
  private animId: number | null = null;

  public trigger(container: HTMLElement, durationMs: number = 3000): void {
    this.stop();

    const canvas = document.createElement('canvas');
    canvas.className = 'celebration-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '100';

    container.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }

    const colors = ['#FF5E7E', '#FFB800', '#4CD964', '#5AC8FA', '#AF52DE', '#FF9500'];
    const shapes: Array<'circle' | 'square' | 'star'> = ['circle', 'square', 'star'];

    // Gera 70 confetes alegres
    this.particles = Array.from({ length: 80 }).map(() => {
      const angle = (Math.random() * Math.PI) - Math.PI / 2; // leque para cima
      const speed = 7 + Math.random() * 12;
      return {
        x: rect.width / 2 + (Math.random() - 0.5) * (rect.width * 0.4),
        y: rect.height * 0.65,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: -Math.abs(Math.sin(angle) * speed) - 4,
        size: 8 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        alpha: 1
      };
    });

    const startTime = performance.now();

    const render = (time: number) => {
      const elapsed = time - startTime;
      if (!this.ctx || !this.canvas) return;

      this.ctx.clearRect(0, 0, rect.width, rect.height);

      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravidade
        p.vx *= 0.98; // resistência do ar
        p.rotation += p.rotationSpeed;

        if (elapsed > durationMs - 1000) {
          p.alpha = Math.max(0, 1 - (elapsed - (durationMs - 1000)) / 1000);
        }

        if (this.ctx) {
          this.ctx.save();
          this.ctx.globalAlpha = p.alpha;
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate(p.rotation);
          this.ctx.fillStyle = p.color;

          if (p.shape === 'circle') {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
          } else if (p.shape === 'square') {
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          } else {
            // Estrela de 5 pontas
            this.drawStar(this.ctx, 0, 0, 5, p.size / 2, p.size / 4);
            this.ctx.fill();
          }
          this.ctx.restore();
        }
      });

      if (elapsed < durationMs) {
        this.animId = requestAnimationFrame(render);
      } else {
        this.stop();
      }
    };

    this.animId = requestAnimationFrame(render);
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  public stop(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
      this.canvas = null;
    }
  }
}
