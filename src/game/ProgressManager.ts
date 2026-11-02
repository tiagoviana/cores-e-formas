/**
 * ProgressManager - Gerenciador de Progressão Automática de Dificuldade
 * 
 * Controla o avanço suave e contínuo de dificuldade para crianças de 3 a 5 anos:
 * - 3 vitórias por nível para avançar (Nível 1 -> Nível 2 -> Nível 3).
 * - Sem punição por tempo ou erros (o nível nunca regride).
 * - Conclusão do Nível 3 ativa celebração especial de "Super Campeão" e ciclo infinito.
 */

export type GameLevel = 1 | 2 | 3;

export interface ShapeLevelConfig {
  level: GameLevel;
  levelTitle: string;
  piecesCount: number;
  availableShapes: Array<'circle' | 'square' | 'triangle' | 'star' | 'rectangle' | 'diamond'>;
  snapRadius: number;
  visualAssist: 'color-tint' | 'dashed-gray' | 'monochrome';
}

export interface ColorLevelConfig {
  level: GameLevel;
  levelTitle: string;
  totalToys: number;
  availableColors: Array<'blue' | 'red' | 'yellow' | 'green' | 'orange' | 'purple'>;
  snapMargin: number;
}

export interface RoundProgressionResult {
  starsFilled: number; // 1, 2 ou 3 estrelas preenchidas no nível atual
  isLevelUp: boolean;
  isGameChampion: boolean;
  newLevel: GameLevel;
}

export class ProgressManager {
  private currentLevel: GameLevel = 1;
  private completedRoundsInLevel: number = 0;
  private totalRoundsCompleted: number = 0;
  private readonly roundsPerLevel: number = 3;

  constructor(initialLevel: GameLevel = 1) {
    this.currentLevel = initialLevel;
    this.completedRoundsInLevel = 0;
  }

  public getCurrentLevel(): GameLevel {
    return this.currentLevel;
  }

  public getCompletedRoundsInLevel(): number {
    return this.completedRoundsInLevel;
  }

  public getTotalRoundsCompleted(): number {
    return this.totalRoundsCompleted;
  }

  public getLevelLabel(): string {
    switch (this.currentLevel) {
      case 1:
        return 'Nível 1 • Fácil';
      case 2:
        return 'Nível 2 • Intermediário';
      case 3:
        return 'Nível 3 • Craque!';
    }
  }

  /**
   * Registra a vitória de uma rodada e calcula a progressão
   */
  public recordRoundVictory(): RoundProgressionResult {
    this.completedRoundsInLevel++;
    this.totalRoundsCompleted++;

    let isLevelUp = false;
    let isGameChampion = false;

    // Se completou as 3 vitórias da meta do nível
    if (this.completedRoundsInLevel >= this.roundsPerLevel) {
      if (this.currentLevel === 3) {
        // Conclusão especial do Nível 3: Super Campeão!
        isGameChampion = true;
        this.completedRoundsInLevel = 0; // Reinicia ciclo infinito de rodadas dinâmicas do Nível 3
      } else {
        // Sobe de nível
        isLevelUp = true;
        this.currentLevel = (this.currentLevel + 1) as GameLevel;
        this.completedRoundsInLevel = 0;
      }
    }

    return {
      starsFilled: this.completedRoundsInLevel,
      isLevelUp,
      isGameChampion,
      newLevel: this.currentLevel
    };
  }

  /**
   * Reseta o progresso mantendo a política sem punição
   */
  public resetToStart(): void {
    this.currentLevel = 1;
    this.completedRoundsInLevel = 0;
  }

  // ==========================================
  // CONFIGURAÇÕES PROGRESSIVAS: ENCAIXE DE FORMAS
  // ==========================================
  public getShapeConfig(): ShapeLevelConfig {
    switch (this.currentLevel) {
      case 1:
        // Nível 1: 3 peças, formas básicas, cores primárias, molde semi-transparente correspondente, snap 80px
        return {
          level: 1,
          levelTitle: 'Nível 1 • Fase Inicial',
          piecesCount: 3,
          availableShapes: ['circle', 'square', 'triangle'],
          snapRadius: 80,
          visualAssist: 'color-tint'
        };

      case 2:
        // Nível 2: 4 peças, inclui Estrela e Retângulo, moldes cinza pontilhados (sem dica de cor), snap 55px
        return {
          level: 2,
          levelTitle: 'Nível 2 • Fase Intermediária',
          piecesCount: 4,
          availableShapes: ['circle', 'square', 'triangle', 'star', 'rectangle'],
          snapRadius: 55,
          visualAssist: 'dashed-gray'
        };

      case 3:
      default:
        // Nível 3: 5 a 6 peças, inclui Losango e nuances, moldes monocromáticos discretos, snap 40px
        return {
          level: 3,
          levelTitle: 'Nível 3 • Fase Avançada',
          piecesCount: 5,
          availableShapes: ['circle', 'square', 'triangle', 'star', 'rectangle', 'diamond'],
          snapRadius: 40,
          visualAssist: 'monochrome'
        };
    }
  }

  // ==========================================
  // CONFIGURAÇÕES PROGRESSIVAS: SEPARAÇÃO DE CORES
  // ==========================================
  public getColorConfig(): ColorLevelConfig {
    switch (this.currentLevel) {
      case 1:
        // Nível 1: 3 brinquedos fáceis (1 de cada balde primário), margem ampla +35px
        return {
          level: 1,
          levelTitle: 'Nível 1 • Fase Inicial',
          totalToys: 3,
          availableColors: ['blue', 'red', 'yellow'],
          snapMargin: 35
        };

      case 2:
        // Nível 2: 4 a 5 brinquedos, introduz verde e laranja, margem +25px
        return {
          level: 2,
          levelTitle: 'Nível 2 • Fase Intermediária',
          totalToys: 5,
          availableColors: ['blue', 'red', 'yellow', 'green', 'orange'],
          snapMargin: 25
        };

      case 3:
      default:
        // Nível 3: 6 brinquedos com nuances sutis (roxo, rosa, etc.), margem +15px
        return {
          level: 3,
          levelTitle: 'Nível 3 • Fase Avançada',
          totalToys: 6,
          availableColors: ['blue', 'red', 'yellow', 'green', 'orange', 'purple'],
          snapMargin: 15
        };
    }
  }
}
