# Cores e Formas • Jogo Infantil Web (3 a 5 anos)

Aplicação web responsiva, interativa e lúdica para crianças da primeira infância, inspirada na dinâmica de "Cores e Formas", desenvolvida com **Vite**, **Vanilla TypeScript**, **HTML5/CSS3** e **Web Audio API procedural nativa** (sem dependências de áudio externas).

---

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (Vite)
npm run dev

# Compilar para produção e testar preview
npm run build
npm run preview
```

O jogo estará disponível em `http://localhost:3000/`.

---

## 🛠️ Arquitetura e Estrutura do Projeto

```
jogo-web/
├── index.html                   # Shell HTML, meta tags de viewport e fontes lúdicas
├── package.json                 # Scripts e dependências (Vite + TypeScript)
├── tsconfig.json                # Configuração estrita do TypeScript
├── vite.config.ts               # Configuração do bundler Vite
└── src/
    ├── audio/
    │   └── AudioManager.ts      # Síntese procedural com Web Audio API nativa
    ├── core/
    │   ├── ScreenManager.ts     # Gerenciador de navegação e transição de telas
    │   └── types.ts             # Tipos e interfaces estruturais
    ├── components/
    │   ├── Confetti.ts          # Partículas e estrelas celebratórias em Canvas
    │   └── OrientationNotice.ts # Aviso ergonômico de rotação de tela (Landscape)
    ├── screens/
    │   ├── HomeScreen.ts        # Hub principal com botões gigantes e ilustrados
    │   ├── ShapeFittingScreen.ts# Minijogo 1: Encaixe de Formas
    │   └── ColorSortingScreen.ts# Minijogo 2: Separação de Cores
    ├── styles/
    │   ├── main.css             # Viewport 100vw/100vh, variáveis e bloqueios de gestos
    │   ├── animations.css       # Animações de nuvens, flutuação e pulso
    │   ├── components.css       # Botões 3D (chunky), cartões e modais de vitória
    │   └── games.css            # Layouts dos minijogos, slots e bandejas de toque
    └── main.ts                  # Bootstrap e bloqueio de comportamentos acidentais
```

---

## 📋 Requisitos Atendidos

### 1. Viewport e CSS
- **Tela Cheia**: Configurado em `100vw`/`100vh` e `100dvw`/`100dvh` com posicionamento fixo para evitar saltos de barras no Safari iOS / Android Chrome.
- **Orientação Landscape**: Otimizado para telas deitadas, contando com o componente `OrientationNotice` que orienta suavemente a girar aparelhos que estejam em modo retrato, ao mesmo tempo que mantém adaptação via CSS flexível para retrato.
- **Bloqueio Total de Acidentes**:
  - `touch-action: none;` aplicado no body e nos elementos interativos.
  - `user-select: none;` com suporte a prefixos de navegadores para impedir seleção de texto.
  - `-webkit-touch-callout: none;` para bloquear popups de toque longo no iOS.
  - Interceptação e `preventDefault` de eventos nativos: `contextmenu`, gestos de pinch-to-zoom (`gesturestart`), toque duplo de zoom (`touchend`), e arrasto nativo de imagens (`dragstart`).
- **Paleta Visual**: Fundo suave `#F7F9FC`, cantos arredondados generosos (`24px` a `32px`), botões 3D em relevo (fáceis de apertar por crianças pequenas) e elementos decorativos fofos (nuvens e bolhas flutuantes).

### 2. Gerenciador de Áudio Procedural (`AudioManager.ts`)
Totalmente construído sobre a **Web Audio API nativa**, sem nenhum arquivo externo (.mp3 ou .wav):
1. **Som de Pickup**: Sweep senoidal ascendente rápido e fofo (~320Hz para ~700Hz em 100ms) ao tocar na peça.
2. **Som de Snap / Acerto**: Acorde brilhante de sino/marimba nas notas C5 (523Hz), E5 (659Hz), G5 (784Hz) com sobreposição de C6 e decaimento percussivo cristalino.
3. **Som de Retorno Suave**: Glissando descendente macio (380Hz descendo para 230Hz), com ataque arredondado, passando sensação de acolhimento e nunca de punição.
4. **Fanfarra Curta de Vitória**: Arpeggio melódico triunfal (G4 → C5 → E5 → G5) seguido de sustentação festiva do acorde maior com harmônicos celestes (C5 + E5 + G5 + C6 + E6).
5. **Desbloqueio de Autoplay**: Sistema automático que destrava o `AudioContext` no primeiro toque do usuário (`pointerdown`, `touchstart`, etc.), além de controle de mudo no topo direito da tela e barra de testes no hub.

### 3. Sistema de Telas e Minijogos
- **Hub / Menu Principal**: Cartões grandes com ilustrações animadas em SVG vetorial para:
  - `[1. Encaixe de Formas]`: Círculo, Quadrado, Triângulo e Estrela.
  - `[2. Separação de Cores]`: Potes e brinquedos nas cores Vermelho, Amarelo e Azul.
- **Pointer Events e Mecânica de Encaixe**:
  - Arrasto suave com `setPointerCapture` para que o toque não se perca se o dedo da criança deslizar depressa.
  - Hitbox e tolerância de proximidade generosas (95px) adequadas à motricidade de 3 a 5 anos.
  - Animação de retorno elástico suave ao errar e efeito de encaixe vibrante ao acertar.
  - Modal de vitória com chuva de confetes procedural em Canvas ao completar a fase.
