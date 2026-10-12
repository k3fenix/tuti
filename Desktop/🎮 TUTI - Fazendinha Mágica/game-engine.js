/**
 * TUTI - Fazendinha Mágica: Motor de Jogo Plataforma 2D (Run & Jump)
 * Inclui:
 * - Física com gravidade, pulo, atrito e colisão AABB
 * - Parallax em 3 camadas (Céu / Montanhas / Árvores e Terreno)
 * - 5 Fases temáticas com paletas e atmosferas próprias:
 *   1. Floresta Encantada (Amanhecer)
 *   2. Rio Cristalino (Tarde ensolarada)
 *   3. Colina Dourada (Entardecer / Pôr do sol)
 *   4. Caverna dos Vaga-lumes (Noite subterrânea)
 *   5. Céu das Nuvens (Céu místico estelar)
 * - Moedas comuns (1), Douradas (5), Baú Surpresa (25)
 * - Power-ups: Ímã de Moedas, Escudo Mágico, Turbo de Velocidade
 * - Sistema de 3 Estrelas: Tempo, Moedas Coletadas, Sem Morrer
 */

const GameEngine = {
  canvas: null,
  ctx: null,
  animId: null,
  currentLevelId: 1,
  paused: false,
  running: false,

  // Configuração da física calibrada: pulo instantâneo, sem pausa no topo, descida imediata e veloz
  physics: {
    gravity: 1.65,         // Gravidade forte e direta (não fica parado no ar)
    fallMultiplier: 2.65,  // Puxa o hominho para baixo imediatamente ao atingir o ápice
    maxFallSpeed: 34.0,    // Velocidade de descida rápida e segura
    friction: 0.78,
  },

  // Estado do Jogador no Canvas (Pulo ágil: pulou e já desce sem esperar lá em cima)
  player: {
    x: 120,
    y: 820,
    w: 64,
    h: 92,
    vx: 0,
    vy: 0,
    speed: 21.5,           // Velocidade perfeita aprovada
    acceleration: 7.2,     // Aceleração rápida
    deceleration: 0.76,    // Parada precisa
    jumpPower: -22.8,      // Impulso enxuto e ágil que sobe rápido e já desce direto
    grounded: false,
    jumpCount: 0,          // Contador de pulos: 0 (no chão), 1 (primeiro pulo), 2 (duplo pulo)
    maxJumps: 2,           // Permite dar duplo pulo no ar
    coyoteTimer: 0,        // Coyote time para facilidade nos saltos
    jumpBuffer: 0,         // Buffer de pulo
    facing: "right",
    hp: 3,                 // Vida: 3 (Verde), 2 (Laranja), 1 (Vermelho), 0 (Derrota)
    maxHp: 3,
    invulnerableTimer: 0,  // Frames de invencibilidade após dano (pisca)
    isShielded: false,
    hasMagnet: false,
    magnetTimer: 0,
    shieldTimer: 0,
    turboTimer: 0,
    deaths: 0,
    walkCycle: 0
  },

  // Câmera com rolagem horizontal contínua
  camera: {
    x: 0,
    y: 0
  },

  // Entidades do mundo
  platforms: [],
  coins: [],
  powerups: [],
  hazards: [],
  goalFlag: null,

  // Estatísticas da partida em andamento
  session: {
    coinsCollected: 0,
    totalCoinsInLevel: 0,
    startTime: 0,
    elapsedSeconds: 0,
    timerInterval: null
  },

  // Controles
  keys: {
    left: false,
    right: false,
    jump: false
  },

  init() {
    this.canvas = document.getElementById("platform-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.bindEvents();
    this.resizeViewport();
  },

  resizeViewport() {
    if (!this.canvas) return;
    const winW = window.innerWidth || document.documentElement.clientWidth || 1920;
    const winH = window.innerHeight || document.documentElement.clientHeight || 1080;
    const aspect = winW / Math.max(1, winH);

    // Altura vertical de referência preservada: 1080px (mantém escala exata do personagem e física)
    this.canvas.height = 1080;

    // Para tablets em modo horizontal (aspect >= 1.3): amplia visão horizontal do cenário
    // Ex: iPad (4:3) = 1440, Tablets 16:10 = 1728, 16:9 = 1920, Ultrawide = até 2400
    if (aspect >= 1.2) {
      this.canvas.width = Math.round(1080 * aspect);
    } else {
      // Modo retrato ou tela muito estreita
      this.canvas.width = 1920;
    }
  },

  bindEvents() {
    // Teclado Desktop
    window.addEventListener("keydown", (e) => {
      if (!this.running) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.keys.right = true;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        this.triggerJump();
        this.keys.jump = true;
      }
      if (e.code === "Escape") {
        this.togglePause();
      }
      if (e.code === "KeyR") {
        this.restartLevel();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.keys.right = false;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") this.keys.jump = false;
    });

    // Redimensionamento de janela e rotação de tablet/iPad
    window.addEventListener("resize", () => {
      this.resizeViewport();
    });
    window.addEventListener("orientationchange", () => {
      setTimeout(() => this.resizeViewport(), 150);
    });

    // Touch Controls com suporte a Multitouch e cliques simultâneos
    const btnLeft = document.getElementById("btn-touch-left");
    const btnRight = document.getElementById("btn-touch-right");
    const btnJump = document.getElementById("btn-touch-jump");

    const setupTouchBtn = (elem, onStart, onEnd) => {
      if (!elem) return;
      elem.addEventListener("touchstart", (e) => { 
        e.preventDefault(); 
        onStart(); 
      }, { passive: false });
      elem.addEventListener("touchend", (e) => { 
        e.preventDefault(); 
        onEnd(); 
      }, { passive: false });
      elem.addEventListener("touchcancel", (e) => { 
        e.preventDefault(); 
        onEnd(); 
      }, { passive: false });
      elem.addEventListener("mousedown", (e) => { 
        e.preventDefault(); 
        onStart(); 
      });
      elem.addEventListener("mouseup", (e) => { 
        e.preventDefault(); 
        onEnd(); 
      });
      elem.addEventListener("mouseleave", (e) => { 
        onEnd(); 
      });
    };

    setupTouchBtn(btnLeft, () => {
      this.keys.left = true;
    }, () => {
      this.keys.left = false;
    });

    setupTouchBtn(btnRight, () => {
      this.keys.right = true;
    }, () => {
      this.keys.right = false;
    });

    setupTouchBtn(btnJump, () => {
      this.triggerJump();
      this.keys.jump = true;
    }, () => {
      this.keys.jump = false;
    });
  },

  triggerJump() {
    const p = this.player;
    // Pulo a partir do chão ou coyote time (1º clique)
    if (p.grounded || p.coyoteTimer > 0) {
      this.doJump(1);
    } else if (p.jumpCount < p.maxJumps) {
      // 2º clique no ar: segundo pulo que sobe mais alto para alcançar superfícies elevadas
      this.doJump(2);
    } else {
      p.jumpBuffer = 7;
    }
  },

  doJump(jumpStep = 1) {
    const p = this.player;
    if (jumpStep === 1) {
      p.jumpCount = 1;
      p.vy = p.jumpPower; // 1º pulo ágil e rápido (-22.8)
    } else {
      // Duplo clique / 2º pulo: impulso extra (-25.5) para alcançar as plataformas mais altas!
      p.jumpCount = 2;
      p.vy = -25.5;
    }
    p.grounded = false;
    p.coyoteTimer = 0;
    p.jumpBuffer = 0;
    AudioManager.playJump();
  },

  startLevel(levelId) {
    this.currentLevelId = levelId;
    this.running = true;
    this.paused = false;

    // Reset player na altura do chão inferior (base em 940)
    this.player.x = 120;
    this.player.y = 840;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hp = 3;
    this.player.jumpCount = 0;
    this.player.invulnerableTimer = 0;
    this.player.deaths = 0;
    this.player.isShielded = false;
    this.player.hasMagnet = false;
    this.player.magnetTimer = 0;
    this.player.turboTimer = 0;
    this.camera.x = 0;

    // Reset session stats
    this.session.coinsCollected = 0;
    this.session.startTime = Date.now();
    this.session.elapsedSeconds = 0;

    // Fechar modais
    document.getElementById("game-win-overlay")?.classList.add("hidden");
    document.getElementById("game-over-overlay")?.classList.add("hidden");

    // Gerar mapa da fase ajustado para a base inferior
    this.buildLevelWorld(levelId);

    // Timer HUD
    if (this.session.timerInterval) clearInterval(this.session.timerInterval);
    this.session.timerInterval = setInterval(() => {
      if (this.running && !this.paused) {
        this.session.elapsedSeconds++;
        const mins = String(Math.floor(this.session.elapsedSeconds / 60)).padStart(2, "0");
        const secs = String(this.session.elapsedSeconds % 60).padStart(2, "0");
        const timerElem = document.getElementById("ig-timer");
        if (timerElem) timerElem.innerText = `${mins}:${secs}`;
      }
    }, 1000);

    this.updateInGameHud();
    this.loop();
  },

  restartLevel() {
    this.startLevel(this.currentLevelId);
  },

  buildLevelWorld(levelId) {
    this.platforms = [];
    this.coins = [];
    this.powerups = [];
    this.hazards = [];

    // Chão base COLADO NA BORDA INFERIOR (y = 940 até 1080)
    const groundY = 940;
    const groundH = 140;

    // Segmentos de chão e vãos customizados por fase (aumentando a dificuldade progressivamente)
    let segments = [];
    let floatPlatforms = [];
    let coinSpots = [];
    let hazardSpots = [];
    let powerupSpots = [];
    let goalX = 5600;

    switch(levelId) {
      case 1: // The Beginning — Pradarias Verdes (Percurso Longo e Agradável)
        segments = [
          { x: 0, w: 2200, y: groundY },
          { x: 2380, w: 2100, y: groundY },
          { x: 4650, w: 2300, y: groundY },
          { x: 7100, w: 2900, y: groundY }
        ];
        floatPlatforms = [
          { x: 500, y: 780, w: 260, h: 36 },
          { x: 900, y: 680, w: 240, h: 36 },
          { x: 1300, y: 760, w: 220, h: 36 },
          { x: 1700, y: 650, w: 280, h: 36 },
          { x: 2500, y: 740, w: 240, h: 36 },
          { x: 2900, y: 620, w: 260, h: 36 },
          { x: 3400, y: 720, w: 220, h: 36 },
          { x: 3850, y: 640, w: 240, h: 36 },
          { x: 4800, y: 750, w: 240, h: 36 },
          { x: 5250, y: 650, w: 260, h: 36 },
          { x: 5750, y: 550, w: 240, h: 36 },
          { x: 6200, y: 670, w: 260, h: 36 },
          { x: 6700, y: 760, w: 220, h: 36 },
          { x: 7300, y: 680, w: 260, h: 36 },
          { x: 7800, y: 580, w: 240, h: 36 },
          { x: 8300, y: 690, w: 260, h: 36 },
          { x: 8800, y: 750, w: 260, h: 36 }
        ];
        coinSpots = [
          { x: 400, y: 860, type: "gold", value: 5 },
          { x: 600, y: 700, type: "gold", value: 5 },
          { x: 1000, y: 600, type: "gold", value: 5 },
          { x: 1400, y: 680, type: "gold", value: 5 },
          { x: 1800, y: 570, type: "gold", value: 5 },
          { x: 2600, y: 660, type: "gold", value: 5 },
          { x: 3000, y: 540, type: "gold", value: 5 },
          { x: 3500, y: 640, type: "gold", value: 5 },
          { x: 4000, y: 560, type: "gold", value: 5 },
          { x: 4900, y: 670, type: "gold", value: 5 },
          { x: 5350, y: 570, type: "gold", value: 5 },
          { x: 5850, y: 470, type: "gold", value: 5 },
          { x: 6300, y: 590, type: "gold", value: 5 },
          { x: 7400, y: 600, type: "gold", value: 5 },
          { x: 7900, y: 500, type: "gold", value: 5 },
          { x: 8400, y: 610, type: "gold", value: 5 },
          { x: 9100, y: 860, type: "gold", value: 5 }
        ];
        hazardSpots = [
          { x: 1500, y: 896, w: 70, h: 44, type: "spike" },
          { x: 3200, y: 896, w: 70, h: 44, type: "spike" },
          { x: 4100, y: 896, w: 70, h: 44, type: "spike" },
          { x: 5500, y: 896, w: 70, h: 44, type: "spike" },
          { x: 6800, y: 896, w: 70, h: 44, type: "spike" },
          { x: 8100, y: 896, w: 70, h: 44, type: "spike" }
        ];
        powerupSpots = [
          { x: 1100, y: 860, type: "magnet", w: 56, h: 56, collected: false, label: "🧲" },
          { x: 2750, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" },
          { x: 5000, y: 860, type: "turbo", w: 56, h: 56, collected: false, label: "⚡" },
          { x: 7500, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" }
        ];
        goalX = 9600;
        break;

      case 2: // Waterfalls — Floresta Tropical e Cachoeiras Longas
        segments = [
          { x: 0, w: 1500, y: groundY },
          { x: 1750, w: 1600, y: groundY },
          { x: 3550, w: 1500, y: groundY },
          { x: 5250, w: 1700, y: groundY },
          { x: 7150, w: 2700, y: groundY }
        ];
        floatPlatforms = [
          { x: 450, y: 720, w: 220, h: 36 },
          { x: 800, y: 610, w: 240, h: 36 },
          { x: 1450, y: 730, w: 180, h: 36 },
          { x: 1900, y: 640, w: 230, h: 36 },
          { x: 2350, y: 550, w: 210, h: 36 },
          { x: 3000, y: 710, w: 180, h: 36 },
          { x: 3700, y: 620, w: 230, h: 36 },
          { x: 4200, y: 520, w: 210, h: 36 },
          { x: 4800, y: 700, w: 190, h: 36 },
          { x: 5450, y: 600, w: 230, h: 36 },
          { x: 6000, y: 510, w: 220, h: 36 },
          { x: 6600, y: 700, w: 200, h: 36 },
          { x: 7350, y: 610, w: 240, h: 36 },
          { x: 7900, y: 520, w: 230, h: 36 },
          { x: 8500, y: 640, w: 250, h: 36 }
        ];
        coinSpots = [
          { x: 500, y: 640, type: "gold", value: 5 },
          { x: 850, y: 530, type: "gold", value: 5 },
          { x: 1500, y: 650, type: "gold", value: 5 },
          { x: 2000, y: 560, type: "gold", value: 5 },
          { x: 2400, y: 470, type: "gold", value: 5 },
          { x: 3800, y: 540, type: "gold", value: 5 },
          { x: 4300, y: 440, type: "gold", value: 5 },
          { x: 5550, y: 520, type: "gold", value: 5 },
          { x: 6100, y: 430, type: "gold", value: 5 },
          { x: 7450, y: 530, type: "gold", value: 5 },
          { x: 8000, y: 440, type: "gold", value: 5 },
          { x: 9100, y: 860, type: "gold", value: 5 }
        ];
        hazardSpots = [
          { x: 1050, y: 896, w: 84, h: 44, type: "spike" },
          { x: 2600, y: 896, w: 84, h: 44, type: "spike" },
          { x: 4500, y: 896, w: 84, h: 44, type: "spike" },
          { x: 6200, y: 896, w: 84, h: 44, type: "spike" },
          { x: 7700, y: 896, w: 84, h: 44, type: "spike" }
        ];
        powerupSpots = [
          { x: 1470, y: 650, type: "magnet", w: 56, h: 56, collected: false, label: "🧲" },
          { x: 3200, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" },
          { x: 5600, y: 860, type: "turbo", w: 56, h: 56, collected: false, label: "⚡" },
          { x: 7800, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" }
        ];
        goalX = 9500;
        break;

      case 3: // Crystal Cavern — Cristais Cintilantes & Trilhos Longos
        segments = [
          { x: 0, w: 1300, y: groundY },
          { x: 1550, w: 1500, y: groundY },
          { x: 3300, w: 1600, y: groundY },
          { x: 5150, w: 1700, y: groundY },
          { x: 7050, w: 2700, y: groundY }
        ];
        floatPlatforms = [
          { x: 400, y: 740, w: 200, h: 36 },
          { x: 750, y: 620, w: 220, h: 36 },
          { x: 1250, y: 710, w: 180, h: 36 },
          { x: 1700, y: 600, w: 240, h: 36 },
          { x: 2200, y: 520, w: 220, h: 36 },
          { x: 2900, y: 710, w: 180, h: 36 },
          { x: 3500, y: 600, w: 230, h: 36 },
          { x: 4100, y: 500, w: 220, h: 36 },
          { x: 4700, y: 710, w: 190, h: 36 },
          { x: 5350, y: 600, w: 230, h: 36 },
          { x: 5900, y: 500, w: 220, h: 36 },
          { x: 6550, y: 700, w: 190, h: 36 },
          { x: 7250, y: 600, w: 230, h: 36 },
          { x: 7850, y: 510, w: 220, h: 36 },
          { x: 8500, y: 620, w: 240, h: 36 }
        ];
        coinSpots = [
          { x: 450, y: 660, type: "gold", value: 5 },
          { x: 800, y: 540, type: "gold", value: 5 },
          { x: 1750, y: 520, type: "gold", value: 5 },
          { x: 2250, y: 440, type: "gold", value: 5 },
          { x: 3600, y: 520, type: "gold", value: 5 },
          { x: 4200, y: 420, type: "gold", value: 5 },
          { x: 5450, y: 520, type: "gold", value: 5 },
          { x: 6000, y: 420, type: "gold", value: 5 },
          { x: 7350, y: 520, type: "gold", value: 5 },
          { x: 7950, y: 430, type: "gold", value: 5 },
          { x: 9000, y: 860, type: "gold", value: 5 }
        ];
        hazardSpots = [
          { x: 950, y: 896, w: 84, h: 44, type: "spike" },
          { x: 2500, y: 896, w: 84, h: 44, type: "spike" },
          { x: 4300, y: 896, w: 84, h: 44, type: "spike" },
          { x: 6100, y: 896, w: 84, h: 44, type: "spike" },
          { x: 7700, y: 896, w: 84, h: 44, type: "spike" }
        ];
        powerupSpots = [
          { x: 1550, y: 860, type: "magnet", w: 56, h: 56, collected: false, label: "🧲" },
          { x: 3200, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" },
          { x: 5500, y: 860, type: "turbo", w: 56, h: 56, collected: false, label: "⚡" },
          { x: 7600, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" }
        ];
        goalX = 9600;
        break;

      case 4: // Ancient Ruins — Templos e Colunas Antigas
        segments = [
          { x: 0, w: 1300, y: groundY },
          { x: 1550, w: 1400, y: groundY },
          { x: 3200, w: 1500, y: groundY },
          { x: 4950, w: 1700, y: groundY },
          { x: 6900, w: 2900, y: groundY }
        ];
        floatPlatforms = [
          { x: 350, y: 730, w: 220, h: 36 },
          { x: 700, y: 620, w: 240, h: 36 },
          { x: 1150, y: 720, w: 180, h: 36 },
          { x: 1600, y: 630, w: 240, h: 36 },
          { x: 2100, y: 530, w: 220, h: 36 },
          { x: 2650, y: 700, w: 190, h: 36 },
          { x: 3300, y: 600, w: 240, h: 36 },
          { x: 3900, y: 510, w: 220, h: 36 },
          { x: 4500, y: 700, w: 190, h: 36 },
          { x: 5150, y: 600, w: 240, h: 36 },
          { x: 5750, y: 500, w: 220, h: 36 },
          { x: 6400, y: 690, w: 200, h: 36 },
          { x: 7100, y: 590, w: 240, h: 36 },
          { x: 7750, y: 490, w: 220, h: 36 },
          { x: 8400, y: 620, w: 250, h: 36 }
        ];
        coinSpots = [
          { x: 400, y: 650, type: "gold", value: 5 },
          { x: 750, y: 540, type: "gold", value: 5 },
          { x: 1650, y: 550, type: "gold", value: 5 },
          { x: 2150, y: 450, type: "gold", value: 5 },
          { x: 3350, y: 520, type: "gold", value: 5 },
          { x: 3950, y: 430, type: "gold", value: 5 },
          { x: 5200, y: 520, type: "gold", value: 5 },
          { x: 5800, y: 420, type: "gold", value: 5 },
          { x: 7150, y: 510, type: "gold", value: 5 },
          { x: 7800, y: 410, type: "gold", value: 5 },
          { x: 9100, y: 860, type: "gold", value: 5 }
        ];
        hazardSpots = [
          { x: 900, y: 896, w: 84, h: 44, type: "spike" },
          { x: 2400, y: 896, w: 84, h: 44, type: "spike" },
          { x: 4100, y: 896, w: 84, h: 44, type: "spike" },
          { x: 5900, y: 896, w: 84, h: 44, type: "spike" },
          { x: 7500, y: 896, w: 84, h: 44, type: "spike" }
        ];
        powerupSpots = [
          { x: 1450, y: 860, type: "magnet", w: 56, h: 56, collected: false, label: "🧲" },
          { x: 3100, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" },
          { x: 5400, y: 860, type: "turbo", w: 56, h: 56, collected: false, label: "⚡" },
          { x: 7800, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" }
        ];
        goalX = 9600;
        break;

      case 5: // Snowy Mountains — Pico de Gelo e Neve Estendido
        segments = [
          { x: 0, w: 1200, y: groundY },
          { x: 1450, w: 1400, y: groundY },
          { x: 3100, w: 1500, y: groundY },
          { x: 4850, w: 1600, y: groundY },
          { x: 6700, w: 3000, y: groundY }
        ];
        floatPlatforms = [
          { x: 320, y: 740, w: 200, h: 36 },
          { x: 650, y: 630, w: 220, h: 36 },
          { x: 1050, y: 710, w: 180, h: 36 },
          { x: 1500, y: 610, w: 220, h: 36 },
          { x: 1950, y: 510, w: 200, h: 36 },
          { x: 2450, y: 700, w: 190, h: 36 },
          { x: 3100, y: 600, w: 230, h: 36 },
          { x: 3700, y: 500, w: 210, h: 36 },
          { x: 4300, y: 700, w: 190, h: 36 },
          { x: 4950, y: 600, w: 230, h: 36 },
          { x: 5550, y: 500, w: 210, h: 36 },
          { x: 6200, y: 690, w: 200, h: 36 },
          { x: 6900, y: 590, w: 230, h: 36 },
          { x: 7550, y: 490, w: 210, h: 36 },
          { x: 8250, y: 620, w: 250, h: 36 }
        ];
        coinSpots = [
          { x: 370, y: 660, type: "gold", value: 5 },
          { x: 700, y: 550, type: "gold", value: 5 },
          { x: 1550, y: 530, type: "gold", value: 5 },
          { x: 2000, y: 430, type: "gold", value: 5 },
          { x: 3150, y: 520, type: "gold", value: 5 },
          { x: 3750, y: 420, type: "gold", value: 5 },
          { x: 5000, y: 520, type: "gold", value: 5 },
          { x: 5600, y: 420, type: "gold", value: 5 },
          { x: 6950, y: 510, type: "gold", value: 5 },
          { x: 7600, y: 410, type: "gold", value: 5 },
          { x: 8900, y: 860, type: "gold", value: 5 }
        ];
        hazardSpots = [
          { x: 800, y: 896, w: 84, h: 44, type: "spike" },
          { x: 2200, y: 896, w: 84, h: 44, type: "spike" },
          { x: 3900, y: 896, w: 84, h: 44, type: "spike" },
          { x: 5700, y: 896, w: 84, h: 44, type: "spike" },
          { x: 7400, y: 896, w: 84, h: 44, type: "spike" }
        ];
        powerupSpots = [
          { x: 1350, y: 860, type: "magnet", w: 56, h: 56, collected: false, label: "🧲" },
          { x: 3000, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" },
          { x: 5200, y: 860, type: "turbo", w: 56, h: 56, collected: false, label: "⚡" },
          { x: 7500, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" }
        ];
        goalX = 9500;
        break;

      case 6: // Volcano Lands — Caverna de Magma com Corrida Épica Longa
        segments = [
          { x: 0, w: 1400, y: groundY },
          { x: 1650, w: 1600, y: groundY },
          { x: 3500, w: 1600, y: groundY },
          { x: 5350, w: 1700, y: groundY },
          { x: 7300, w: 2700, y: groundY }
        ];
        floatPlatforms = [
          { x: 400, y: 730, w: 220, h: 36 },
          { x: 750, y: 630, w: 240, h: 36 },
          { x: 1220, y: 710, w: 200, h: 36 },
          { x: 1650, y: 640, w: 240, h: 36 },
          { x: 2150, y: 720, w: 220, h: 36 },
          { x: 2600, y: 630, w: 240, h: 36 },
          { x: 3100, y: 710, w: 200, h: 36 },
          { x: 3600, y: 640, w: 240, h: 36 },
          { x: 4150, y: 720, w: 220, h: 36 },
          { x: 4650, y: 630, w: 240, h: 36 },
          { x: 5250, y: 710, w: 210, h: 36 },
          { x: 5800, y: 620, w: 240, h: 36 },
          { x: 6350, y: 710, w: 210, h: 36 },
          { x: 6900, y: 610, w: 240, h: 36 },
          { x: 7500, y: 520, w: 230, h: 36 },
          { x: 8200, y: 630, w: 250, h: 36 }
        ];
        coinSpots = [
          { x: 330, y: 860, type: "gold", value: 5 },
          { x: 470, y: 650, type: "gold", value: 5 },
          { x: 820, y: 540, type: "gold", value: 5 },
          { x: 1730, y: 550, type: "gold", value: 5 },
          { x: 2700, y: 540, type: "gold", value: 5 },
          { x: 3700, y: 550, type: "gold", value: 5 },
          { x: 4750, y: 540, type: "gold", value: 5 },
          { x: 5900, y: 530, type: "gold", value: 5 },
          { x: 7000, y: 520, type: "gold", value: 5 },
          { x: 7600, y: 430, type: "gold", value: 5 },
          { x: 8800, y: 860, type: "gold", value: 5 }
        ];
        hazardSpots = [
          { x: 920, y: 896, w: 84, h: 44, type: "spike" },
          { x: 2350, y: 896, w: 84, h: 44, type: "spike" },
          { x: 4300, y: 896, w: 84, h: 44, type: "spike" },
          { x: 6050, y: 896, w: 84, h: 44, type: "spike" },
          { x: 7800, y: 896, w: 84, h: 44, type: "spike" }
        ];
        powerupSpots = [
          { x: 1480, y: 860, type: "magnet", w: 56, h: 56, collected: false, label: "🧲" },
          { x: 2900, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" },
          { x: 5100, y: 860, type: "turbo", w: 56, h: 56, collected: false, label: "⚡" },
          { x: 7600, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" }
        ];
        goalX = 9800;
        break;

      case 7: // Sky Palace — Grande Palácio Celeste das Nuvens (Aventura Suprema Longa)
        segments = [
          { x: 0, w: 1200, y: groundY },
          { x: 1480, w: 1300, y: groundY },
          { x: 3050, w: 1400, y: groundY },
          { x: 4750, w: 1500, y: groundY },
          { x: 6550, w: 3400, y: groundY }
        ];
        floatPlatforms = [
          { x: 300, y: 720, w: 200, h: 36 },
          { x: 600, y: 610, w: 220, h: 36 },
          { x: 950, y: 510, w: 200, h: 36 },
          { x: 1400, y: 630, w: 220, h: 36 },
          { x: 1850, y: 520, w: 220, h: 36 },
          { x: 2250, y: 420, w: 200, h: 36 },
          { x: 2750, y: 600, w: 220, h: 36 },
          { x: 3250, y: 500, w: 220, h: 36 },
          { x: 3750, y: 410, w: 220, h: 36 },
          { x: 4350, y: 610, w: 240, h: 36 },
          { x: 4950, y: 510, w: 220, h: 36 },
          { x: 5550, y: 410, w: 220, h: 36 },
          { x: 6150, y: 600, w: 230, h: 36 },
          { x: 6800, y: 500, w: 230, h: 36 },
          { x: 7450, y: 410, w: 230, h: 36 },
          { x: 8100, y: 530, w: 240, h: 36 },
          { x: 8750, y: 640, w: 250, h: 36 }
        ];
        coinSpots = [
          { x: 350, y: 640, type: "gold", value: 5 },
          { x: 650, y: 530, type: "gold", value: 5 },
          { x: 1000, y: 430, type: "gold", value: 5 },
          { x: 1900, y: 440, type: "gold", value: 5 },
          { x: 2300, y: 340, type: "gold", value: 5 },
          { x: 3300, y: 420, type: "gold", value: 5 },
          { x: 3800, y: 330, type: "gold", value: 5 },
          { x: 5000, y: 430, type: "gold", value: 5 },
          { x: 5600, y: 330, type: "gold", value: 5 },
          { x: 6850, y: 420, type: "gold", value: 5 },
          { x: 7500, y: 330, type: "gold", value: 5 },
          { x: 8850, y: 560, type: "gold", value: 5 },
          { x: 9350, y: 860, type: "gold", value: 5 }
        ];
        hazardSpots = [
          { x: 750, y: 896, w: 84, h: 44, type: "spike" },
          { x: 2100, y: 896, w: 84, h: 44, type: "spike" },
          { x: 3800, y: 896, w: 84, h: 44, type: "spike" },
          { x: 5600, y: 896, w: 84, h: 44, type: "spike" },
          { x: 7200, y: 896, w: 84, h: 44, type: "spike" }
        ];
        powerupSpots = [
          { x: 1400, y: 860, type: "magnet", w: 56, h: 56, collected: false, label: "🧲" },
          { x: 2800, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" },
          { x: 5200, y: 860, type: "turbo", w: 56, h: 56, collected: false, label: "⚡" },
          { x: 7700, y: 860, type: "shield", w: 56, h: 56, collected: false, label: "🛡️" }
        ];
        goalX = 9800;
        break;

      default:
        segments = [{ x: 0, w: 6000, y: groundY }];
        goalX = 5800;
    }

    segments.forEach(s => {
      this.platforms.push({ x: s.x, y: s.y, w: s.w, h: groundH, type: "ground" });
    });

    floatPlatforms.forEach(p => {
      this.platforms.push({ ...p, type: "floating" });
    });

    this.coins = coinSpots.map(c => ({
      x: c.x,
      y: c.y,
      w: 42,
      h: 42,
      type: "gold",
      value: c.value,
      collected: false
    }));
    this.session.totalCoinsInLevel = this.coins.length;

    this.powerups = powerupSpots;

    this.hazards = hazardSpots;

    this.goalFlag = {
      x: goalX,
      y: 740,
      w: 80,
      h: 200
    };

    // Atualizar título na UI com o Bioma Ativo
    const biomeTitle = this.getBiomeName(levelId);
    const phaseElem = document.getElementById("ig-phase-name");
    if (phaseElem) phaseElem.innerText = biomeTitle;
  },

  updateInGameHud() {
    const coinElem = document.getElementById("ig-coins");
    if (coinElem) coinElem.innerText = this.session.coinsCollected;

    // Atualizar Barra de Vida (Verde -> Laranja -> Vermelho)
    const hpFill = document.getElementById("ig-health-fill");
    const hpText = document.getElementById("ig-health-text");
    if (hpFill) {
      const pct = Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100));
      hpFill.style.width = `${pct}%`;
      hpFill.className = "health-bar-fill";
      if (this.player.hp >= 3) {
        hpFill.classList.add("hp-green");
      } else if (this.player.hp === 2) {
        hpFill.classList.add("hp-orange");
      } else {
        hpFill.classList.add("hp-red");
      }
    }
    if (hpText) {
      hpText.innerText = `${this.player.hp}/${this.player.maxHp}`;
    }

    // Powerups ativos badge
    const pContainer = document.getElementById("ig-powerups");
    if (pContainer) {
      let html = "";
      if (this.player.hasMagnet) html += '<span class="powerup-badge">🧲 Ímã</span>';
      if (this.player.isShielded) html += '<span class="powerup-badge">🛡️ Escudo</span>';
      if (this.player.turboTimer > 0) html += '<span class="powerup-badge">⚡ Turbo</span>';
      pContainer.innerHTML = html;
    }
  },

  // Loop de Animação e Física (60fps)
  loop() {
    if (!this.running) return;

    if (!this.paused) {
      this.updatePhysics();
    }
    this.render();

    this.animId = requestAnimationFrame(() => this.loop());
  },

  updatePhysics() {
    const p = this.player;

    // Gerenciar Coyote Time (permite pular até 8 frames após sair de uma plataforma)
    if (p.grounded) {
      p.coyoteTimer = 8;
    } else if (p.coyoteTimer > 0) {
      p.coyoteTimer--;
    }

    // Processar Buffer de Pulo
    if (p.jumpBuffer > 0) {
      p.jumpBuffer--;
      if (p.grounded || p.coyoteTimer > 0) {
        this.triggerJump();
        p.jumpBuffer = 0;
      }
    }

    // Velocidade horizontal ultrarrápida com aceleração imediata
    const targetMaxSpeed = (p.turboTimer > 0) ? p.speed * 1.55 : p.speed;
    if (this.keys.left) {
      p.facing = "left";
      // Virada instantânea cortando inércia contrária
      if (p.vx > 0) p.vx = 0;
      p.vx = Math.max(-targetMaxSpeed, p.vx - p.acceleration);
    } else if (this.keys.right) {
      p.facing = "right";
      // Virada instantânea cortando inércia contrária
      if (p.vx < 0) p.vx = 0;
      p.vx = Math.min(targetMaxSpeed, p.vx + p.acceleration);
    } else {
      // Parada imediata e precisa (sem deslizar)
      p.vx *= p.deceleration;
      if (Math.abs(p.vx) < 0.2) p.vx = 0;
    }

    // Atualizar ciclo de caminhada procedural sincronizado com a velocidade
    if (p.grounded && Math.abs(p.vx) > 0.3) {
      p.walkCycle += Math.abs(p.vx) * 0.045;
    } else if (p.grounded) {
      p.walkCycle = 0;
    }

    // Gravidade dinâmica sem tempo morto: subiu, atingiu o ápice e já desce imediatamente
    if (p.vy >= 0) {
      // Caindo / descendo: puxa rápido para baixo com fallMultiplier 2.65
      p.vy += this.physics.gravity * this.physics.fallMultiplier;
      if (p.vy > this.physics.maxFallSpeed) p.vy = this.physics.maxFallSpeed;
    } else {
      // Subindo: se estiver perto do topo (p.vy > -6), já puxa mais forte para não ter tempo de espera no ar
      if (p.vy > -6) {
        p.vy += this.physics.gravity * 1.8;
      } else {
        p.vy += this.physics.gravity;
      }
    }

    // Atualiza posição horizontal e trata colisão
    p.x += p.vx;
    this.checkPlatformCollisionHorizontal();

    // Atualiza posição vertical e trata colisão
    p.y += p.vy;
    p.grounded = false;
    this.checkPlatformCollisionVertical();

    // Queda no abismo (abaixo do chão 1080)
    if (p.y > 1150) {
      this.handlePlayerDeath();
      return;
    }

    // Atualizar timer de invencibilidade pós-dano
    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer--;
    }

    // Atualizar timers de powerups
    if (p.magnetTimer > 0) {
      p.magnetTimer--;
      if (p.magnetTimer <= 0) p.hasMagnet = false;
    }
    if (p.turboTimer > 0) p.turboTimer--;
    if (p.shieldTimer > 0) {
      p.shieldTimer--;
      if (p.shieldTimer <= 0) p.isShielded = false;
    }

    // Coleta de Moedas & Efeito Ímã
    this.coins.forEach(c => {
      if (c.collected) return;

      // Puxar moedas se o ímã estiver ativo
      if (p.hasMagnet) {
        const dist = Math.hypot((p.x + p.w / 2) - (c.x + c.w / 2), (p.y + p.h / 2) - (c.y + c.h / 2));
        if (dist < 180) {
          c.x += ((p.x + p.w / 2) - c.x) * 0.12;
          c.y += ((p.y + p.h / 2) - c.y) * 0.12;
        }
      }

      // Colisão de coleta AABB
      if (this.isColliding(p, c)) {
        c.collected = true;
        this.session.coinsCollected += c.value;
        App.addCoins(c.value);
        AudioManager.playCoin();
        this.updateInGameHud();
      }
    });

    // Coleta de Power-ups
    this.powerups.forEach(pw => {
      if (pw.collected) return;
      if (this.isColliding(p, pw)) {
        pw.collected = true;
        AudioManager.playPop();

        if (pw.type === "magnet") {
          p.hasMagnet = true;
          p.magnetTimer = 600; // 10 segundos
          App.showToast("🧲 Ímã Ativo! As moedas vêm até você!", "info");
        } else if (pw.type === "shield") {
          p.isShielded = true;
          p.shieldTimer = 700;
          App.showToast("🛡️ Escudo Ativo! Protegido de espinhos!", "info");
        } else if (pw.type === "turbo") {
          p.turboTimer = 500;
          App.showToast("⚡ Super Velocidade ativada!", "info");
        }
        this.updateInGameHud();
      }
    });

    // Colisão com Obstáculos (Espinhos / Lava)
    this.hazards.forEach(h => {
      if (this.isColliding(p, h)) {
        if (p.isShielded) {
          // Escudo consome o impacto
          p.isShielded = false;
          p.shieldTimer = 0;
          p.vy = -12; // salto defensivo
          p.invulnerableTimer = 60; // 1s de proteção
          App.showToast("🛡️ Escudo quebrou mas te protegeu!", "warning");
          this.updateInGameHud();
        } else if (p.invulnerableTimer <= 0) {
          this.playerTakeDamage();
        }
      }
    });

    // Chegada na Bandeira de Vitória
    if (this.goalFlag && this.isColliding(p, this.goalFlag)) {
      this.handleLevelWin();
    }

    // Câmera dinâmica e responsiva acompanha o jogador sem atrasos
    const targetCamX = p.x - this.canvas.width / 3.0;
    this.camera.x += (targetCamX - this.camera.x) * 0.18;
    if (this.camera.x < 0) this.camera.x = 0;
  },

  checkPlatformCollisionHorizontal() {
    const p = this.player;
    this.platforms.forEach(plat => {
      if (this.isColliding(p, plat)) {
        if (p.vx > 0) {
          p.x = plat.x - p.w;
        } else if (p.vx < 0) {
          p.x = plat.x + plat.w;
        }
        p.vx = 0;
      }
    });
  },

  checkPlatformCollisionVertical() {
    const p = this.player;
    this.platforms.forEach(plat => {
      if (this.isColliding(p, plat)) {
        if (p.vy > 0 && (p.y + p.h - p.vy) <= plat.y + Math.max(22, p.vy + 4)) {
          // Pouso firme e responsivo mesmo em alta velocidade de queda
          p.y = plat.y - p.h;
          p.vy = 0;
          p.grounded = true;
          p.jumpCount = 0; // Reseta pulo duplo ao aterrissar
        } else if (p.vy < 0) {
          // Bateu por baixo
          p.y = plat.y + plat.h;
          p.vy = 0;
        }
      }
    });
  },

  isColliding(r1, r2) {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  },

  playerTakeDamage() {
    const p = this.player;
    p.hp--;
    p.invulnerableTimer = 90; // ~1.5 segundo de invencibilidade (pisca)
    
    // Pequeno pulo defensivo para se afastar do perigo
    p.vy = -14;
    p.grounded = false;

    // Efeito sonoro de impacto
    AudioManager.playClick();

    // Feedback visual e status
    if (p.hp === 2) {
      App.showToast("⚠️ Cuidado! Vida em estado Laranja!", "warning");
    } else if (p.hp === 1) {
      App.showToast("🚨 Perigo! Vida em estado Vermelho!", "error");
    }

    this.updateInGameHud();

    // Só morre de verdade se esgotar o estado vermelho (hp <= 0)
    if (p.hp <= 0) {
      this.handlePlayerDeath();
    }
  },

  handlePlayerDeath() {
    this.player.deaths++;
    AudioManager.playClick();
    this.paused = true;
    const overOverlay = document.getElementById("game-over-overlay");
    if (overOverlay) overOverlay.classList.remove("hidden");
  },

  handleLevelWin() {
    this.running = false;
    clearInterval(this.session.timerInterval);
    AudioManager.playWin();

    // Cálculo das 3 Estrelas:
    // Estrela 1: Concluir a fase
    // Estrela 2: Coletar >= 70% das moedas
    // Estrela 3: Não morrer nenhuma vez
    let starsEarned = 1;
    if (this.session.coinsCollected >= Math.floor(this.session.totalCoinsInLevel * 0.6)) starsEarned++;
    if (this.player.deaths === 0) starsEarned++;

    // Salvar progresso
    const levelData = App.state.levels_progress.find(l => l.level_id === this.currentLevelId);
    if (levelData) {
      if (starsEarned > levelData.stars) levelData.stars = starsEarned;
      if (!levelData.best_time || this.session.elapsedSeconds < levelData.best_time) {
        levelData.best_time = this.session.elapsedSeconds;
      }
      levelData.coins_collected += this.session.coinsCollected;
    }

    // Desbloquear próxima fase
    const nextLevel = App.state.levels_progress.find(l => l.level_id === this.currentLevelId + 1);
    if (nextLevel) nextLevel.unlocked = true;

    // Dar XP
    App.addXp(50 * starsEarned);
    StorageManager.save(App.state);

    // Atualizar UI de Vitória
    const winOverlay = document.getElementById("game-win-overlay");
    if (winOverlay) {
      winOverlay.classList.remove("hidden");

      // Estrelas visuais
      const starsContainer = document.getElementById("win-stars-icons");
      if (starsContainer) {
        let starsHtml = "";
        for (let i = 1; i <= 3; i++) {
          starsHtml += `<span class="star-icon ${i <= starsEarned ? 'glow' : ''}">⭐</span>`;
        }
        starsContainer.innerHTML = starsHtml;
      }

      document.getElementById("win-time-val").innerText = `${this.session.elapsedSeconds}s`;
      document.getElementById("win-coins-val").innerText = `+${this.session.coinsCollected} 🪙`;
      document.getElementById("win-xp-val").innerText = `+${50 * starsEarned} XP`;
    }

    // Verificar conquista de aventureiro
    Achievements.checkProgress();
  },

  togglePause() {
    this.paused = !this.paused;
    App.showToast(this.paused ? "⏸️ Jogo Pausado" : "▶️ Retomado", "info");
  },

  stop() {
    this.running = false;
    if (this.session.timerInterval) clearInterval(this.session.timerInterval);
    if (this.animId) cancelAnimationFrame(this.animId);
  },

  // ==========================================================
  // RENDERIZAÇÃO ESTILO PIXAR / GHIBLI NO CANVAS
  // ==========================================================
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const camX = this.camera.x;

    ctx.clearRect(0, 0, w, h);

    // 1. CAMADA DE FUNDO COM GRADIENTE TEMÁTICO DA FASE
    this.drawSkyBackground(ctx, w, h);

    // 1.1 Raios de Luz / Atmosfera Iluminada Viva
    this.drawAtmosphericRays(ctx, w, h);

    // 2. CAMADA PARALLAX: Montanhas Distantes (Move a 0.2 da câmera)
    ctx.save();
    ctx.translate(-camX * 0.2, 0);
    this.drawParallaxMountains(ctx, w, h);
    ctx.restore();

    // 3. CAMADA PARALLAX: Árvores Intermediárias (Move a 0.5 da câmera)
    ctx.save();
    ctx.translate(-camX * 0.5, 0);
    this.drawParallaxMidground(ctx, w, h);
    ctx.restore();

    // 4. MUNDO PRINCIPAL (Move a 1.0 com a câmera)
    ctx.save();
    ctx.translate(-camX, 0);

    // Desenhar Plataformas e Chão com texturas e sombras
    this.platforms.forEach(plat => {
      this.drawPlatform(ctx, plat);
    });

    // Desenhar Espinhos e Obstáculos
    this.hazards.forEach(hz => {
      this.drawSpike(ctx, hz);
    });

    // Desenhar Moedas e Baús reluzentes
    this.coins.forEach(c => {
      if (!c.collected) this.drawCoin(ctx, c);
    });

    // Desenhar Power-ups cintilantes
    this.powerups.forEach(pw => {
      if (!pw.collected) this.drawPowerup(ctx, pw);
    });

    // Desenhar Bandeira de Chegada
    if (this.goalFlag) {
      this.drawGoalFlag(ctx, this.goalFlag);
    }

    // Desenhar Personagem TUTI (com olhos expressivos e roupas equipadas)
    this.drawPlayer(ctx, this.player);

    ctx.restore();
  },

  drawAtmosphericRays(ctx, w, h) {
    // Efeito de raios de sol suaves iluminando a tela
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(w * 0.2, 0);
    ctx.lineTo(w * 0.45, h);
    ctx.lineTo(w * 0.35, h);
    ctx.lineTo(w * 0.1, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.6, 0);
    ctx.lineTo(w * 0.85, h);
    ctx.lineTo(w * 0.75, h);
    ctx.lineTo(w * 0.5, 0);
    ctx.fill();
    ctx.restore();
  },

  // ==============================================================================
  // AS 7 FASES E BIOMAS DA JORNADA DE AVENTURA
  // 1. PHASE 1 — THE BEGINNING: campo verde, céu azul, moedas e placas
  // 2. PHASE 2 — WATERFALLS: floresta tropical, cachoeiras, vegetação e pedras
  // 3. PHASE 3 — CRYSTAL CAVERN: caverna com cristais luminosos azuis e roxos
  // 4. PHASE 4 — ANCIENT RUINS: ruínas antigas, colunas, cipós e templos de pedra
  // 5. PHASE 5 — SNOWY MOUNTAINS: montanhas nevadas, gelo, pinheiros e nevasca
  // 6. PHASE 6 — VOLCANO LANDS: vulcões em erupção, lava e rochas incandescentes
  // 7. PHASE 7 — SKY PALACE: ilhas flutuantes, palácios dourados e estrelas
  // ==============================================================================

  getBiomeName(levelId) {
    switch(levelId) {
      case 1: return "Phase 1: The Beginning 🌱";
      case 2: return "Phase 2: Waterfalls 🌊";
      case 3: return "Phase 3: Crystal Cavern 💎";
      case 4: return "Phase 4: Ancient Ruins 🏛️";
      case 5: return "Phase 5: Snowy Mountains ❄️";
      case 6: return "Phase 6: Volcano Lands 🌋";
      case 7: return "Phase 7: Sky Palace 👑";
      default: return "Aventura TUTI 🎮";
    }
  },

  // ==============================================================================
  // MOTOR GRÁFICO 3D HIPER-REALISTA DA IMAGEM DE REFERÊNCIA (1920x1080)
  // - Caverna rochosa detalhada com estalactites escuras
  // - Cachoeiras de lava líquida incandescente (#FF4500)
  // - Vulcões em erupção ao fundo com reflexos de calor
  // - Tochas com pedestal de ferro e cristais roxos de ametista nas rochas
  // - Solo de rocha vulcânica rachada com magma incandescente (#FF4500)
  // ==============================================================================

  // 1. FUNDO DE CÉU ESPECÍFICO PARA CADA UMA DAS 7 FASES
  drawSkyBackground(ctx, w, h) {
    const lvl = this.currentLevelId;
    const grad = ctx.createLinearGradient(0, 0, 0, h);

    if (lvl === 1) {
      // 1. The Beginning — Campo Verde, Céu Azul Vibrante
      grad.addColorStop(0, "#38BDF8");
      grad.addColorStop(0.55, "#BAE6FD");
      grad.addColorStop(1, "#E0F2FE");
    } else if (lvl === 2) {
      // 2. Waterfalls — Floresta Tropical e Céu Esmeralda
      grad.addColorStop(0, "#0284C7");
      grad.addColorStop(0.45, "#38BDF8");
      grad.addColorStop(0.85, "#A7F3D0");
      grad.addColorStop(1, "#34D399");
    } else if (lvl === 3) {
      // 3. Crystal Cavern — Caverna Mística com Púrpura e Azul
      grad.addColorStop(0, "#0F0B1E");
      grad.addColorStop(0.4, "#2E1065");
      grad.addColorStop(0.8, "#581C87");
      grad.addColorStop(1, "#3B0764");
    } else if (lvl === 4) {
      // 4. Ancient Ruins — Pôr do Sol Dourado sobre Ruínas de Pedra
      grad.addColorStop(0, "#7C2D12");
      grad.addColorStop(0.4, "#C2410C");
      grad.addColorStop(0.7, "#EA580C");
      grad.addColorStop(1, "#FDBA74");
    } else if (lvl === 5) {
      // 5. Snowy Mountains — Céu Ártico e Montanhas Congeladas
      grad.addColorStop(0, "#1E293B");
      grad.addColorStop(0.5, "#475569");
      grad.addColorStop(0.85, "#94A3B8");
      grad.addColorStop(1, "#E2E8F0");
    } else if (lvl === 6) {
      // 6. Volcano Lands — Caverna de Magma e Rios de Lava
      grad.addColorStop(0, "#0D080D");
      grad.addColorStop(0.35, "#1F0F1A");
      grad.addColorStop(0.65, "#3D1310");
      grad.addColorStop(0.9, "#7A1C06");
      grad.addColorStop(1, "#FF4500");
    } else {
      // 7. Sky Palace — Céu Celestial, Nuvens e Palácios Dourados
      grad.addColorStop(0, "#312E81");
      grad.addColorStop(0.35, "#4338CA");
      grad.addColorStop(0.7, "#6366F1");
      grad.addColorStop(1, "#FDE68A");
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  },

  // 1.1 ATMOSFERA E PARTÍCULAS ESPECÍFICAS DE CADA FASE
  drawAtmosphericRays(ctx, w, h) {
    const lvl = this.currentLevelId;
    ctx.save();
    const time = Date.now() * 0.002;

    if (lvl === 1) {
      // Nuvens e raios de sol suaves
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(w * 0.15, 0); ctx.lineTo(w * 0.4, h); ctx.lineTo(w * 0.3, h); ctx.lineTo(w * 0.05, 0);
      ctx.fill();
    } else if (lvl === 2) {
      // Gotas de água e névoa de cachoeira
      ctx.fillStyle = "rgba(165, 243, 252, 0.6)";
      for (let i = 0; i < 30; i++) {
        const mx = ((i * 85 + time * 60) % w);
        const my = ((i * 45 + time * 120) % h);
        ctx.beginPath();
        ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (lvl === 3) {
      // Partículas mágicas de cristais reluzentes
      ctx.fillStyle = "rgba(192, 132, 252, 0.75)";
      for (let i = 0; i < 28; i++) {
        const cx = ((i * 90 + Math.sin(time + i) * 40) % w);
        const cy = ((i * 50 + time * 40) % (h * 0.85));
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (lvl === 5) {
      // Flocos de neve caindo suavemente
      ctx.fillStyle = "#FFFFFF";
      for (let i = 0; i < 45; i++) {
        const sx = ((i * 65 + Math.sin(time * 0.5 + i) * 30) % w);
        const sy = ((i * 35 + time * 85) % h);
        ctx.beginPath();
        ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (lvl === 6) {
      // Faíscas incandescentes de lava
      ctx.fillStyle = "#FFD700";
      for (let i = 0; i < 35; i++) {
        const sparkX = ((i * 75 + time * 70) % w);
        const sparkY = (h - ((i * 40 + time * 90) % (h * 0.8)));
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (lvl === 7) {
      // Estrelas cintilantes e poeira dourada
      ctx.fillStyle = "#FDE047";
      for (let i = 0; i < 40; i++) {
        const stX = ((i * 80 + Math.cos(time + i) * 20) % w);
        const stY = ((i * 40) % (h * 0.65));
        ctx.beginPath();
        ctx.arc(stX, stY, 2.5 + Math.sin(time * 2 + i) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  },

  // Camada Distante: Montanhas e relevos característicos de cada fase (Parallax 0.2)
  drawParallaxMountains(ctx, w, h) {
    const lvl = this.currentLevelId;
    ctx.save();

    if (lvl === 1) {
      // 1. The Beginning — Colinas Verdes Suaves e Árvores Distantes
      ctx.fillStyle = "#15803D";
      for (let i = 0; i < 10; i++) {
        const hx = i * 650;
        ctx.beginPath();
        ctx.ellipse(hx + 300, 960, 420, 260, 0, Math.PI, 0, false);
        ctx.fill();
      }
      ctx.fillStyle = "#166534";
      ctx.fillRect(0, 930, 10000, h - 930);
    } else if (lvl === 2) {
      // 2. Waterfalls — Penhascos Verdes e Cachoeiras Distantes
      for (let i = 0; i < 8; i++) {
        const cx = i * 750 + 200;
        ctx.fillStyle = "#065F46";
        ctx.beginPath();
        ctx.moveTo(cx - 240, 940); ctx.lineTo(cx, 480); ctx.lineTo(cx + 240, 940);
        ctx.closePath(); ctx.fill();
        // Filetes de cachoeira distante
        ctx.fillStyle = "#67E8F9";
        ctx.fillRect(cx - 10, 520, 20, 420);
      }
    } else if (lvl === 3) {
      // 3. Crystal Cavern — Paredes Profundas e Estalagmites Roxas
      ctx.fillStyle = "#1E1B4B";
      for (let i = 0; i < 12; i++) {
        const sx = i * 450 + 100;
        ctx.beginPath();
        ctx.moveTo(sx - 120, 940); ctx.lineTo(sx, 500); ctx.lineTo(sx + 120, 940);
        ctx.closePath(); ctx.fill();
      }
    } else if (lvl === 4) {
      // 4. Ancient Ruins — Colunas de Templos e Pirâmides Ancestrais
      ctx.fillStyle = "#78350F";
      for (let i = 0; i < 8; i++) {
        const px = i * 850 + 250;
        // Pirâmide
        ctx.beginPath();
        ctx.moveTo(px - 300, 940); ctx.lineTo(px, 520); ctx.lineTo(px + 300, 940);
        ctx.closePath(); ctx.fill();
        // Colunatas
        ctx.fillStyle = "#B45309";
        ctx.fillRect(px - 140, 680, 28, 260);
        ctx.fillRect(px + 110, 680, 28, 260);
        ctx.fillStyle = "#78350F";
      }
    } else if (lvl === 5) {
      // 5. Snowy Mountains — Picos de Neve Brancos e Cinzas
      for (let i = 0; i < 8; i++) {
        const mx = i * 780 + 200;
        ctx.fillStyle = "#475569";
        ctx.beginPath();
        ctx.moveTo(mx - 280, 940); ctx.lineTo(mx, 420); ctx.lineTo(mx + 280, 940);
        ctx.closePath(); ctx.fill();
        // Cume coberto de gelo
        ctx.fillStyle = "#F8FAFC";
        ctx.beginPath();
        ctx.moveTo(mx - 75, 560); ctx.lineTo(mx, 420); ctx.lineTo(mx + 75, 560);
        ctx.closePath(); ctx.fill();
      }
    } else if (lvl === 6) {
      // 6. Volcano Lands — Cones vulcânicos em erupção (idênticos à referência)
      for (let i = 0; i < 6; i++) {
        const vx = i * 900 + 350;
        ctx.fillStyle = "#1E1118";
        ctx.beginPath();
        ctx.moveTo(vx - 320, 920); ctx.lineTo(vx - 80, 440); ctx.lineTo(vx + 80, 440); ctx.lineTo(vx + 320, 920);
        ctx.closePath(); ctx.fill();

        ctx.strokeStyle = "#FF4500"; ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(vx, 440); ctx.lineTo(vx - 40, 580); ctx.lineTo(vx - 20, 720); ctx.lineTo(vx - 90, 880); ctx.stroke();

        ctx.fillStyle = "#FF4500";
        ctx.fillRect(vx - 70, 430, 140, 18);

        const gradFire = ctx.createLinearGradient(vx, 430, vx, 200);
        gradFire.addColorStop(0, "rgba(255, 140, 0, 0.95)");
        gradFire.addColorStop(1, "transparent");
        ctx.fillStyle = gradFire;
        ctx.beginPath();
        ctx.moveTo(vx - 60, 430); ctx.lineTo(vx + 60, 430); ctx.lineTo(vx, 200); ctx.closePath(); ctx.fill();
      }
    } else {
      // 7. Sky Palace — Templos Celestes Dourados e Nuvens Flutuantes
      for (let i = 0; i < 7; i++) {
        const qx = i * 900 + 200;
        // Nuvem de sustentação
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.ellipse(qx, 780, 220, 70, 0, 0, Math.PI * 2); ctx.fill();
        // Palácio Dourado
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(qx - 80, 580, 160, 150);
        ctx.fillStyle = "#FCD34D";
        ctx.beginPath();
        ctx.moveTo(qx - 100, 580); ctx.lineTo(qx, 460); ctx.lineTo(qx + 100, 580);
        ctx.closePath(); ctx.fill();
      }
    }

    ctx.restore();
  },

  // Camada Intermediária: Elementos de cenário e vegetação/relevo para cada uma das 7 fases (Parallax 0.5)
  drawParallaxMidground(ctx, w, h) {
    const lvl = this.currentLevelId;
    ctx.save();

    if (lvl === 1) {
      // 1. The Beginning — Árvores Verdes Frondosas e Flores de Campo
      for (let i = 0; i < 15; i++) {
        const tx = i * 400 + 120;
        // Tronco marrom
        ctx.fillStyle = "#78350F";
        ctx.fillRect(tx - 12, 680, 24, 260);
        // Copa verde em camadas
        ctx.fillStyle = "#22C55E";
        ctx.beginPath();
        ctx.arc(tx, 660, 75, 0, Math.PI * 2);
        ctx.arc(tx - 40, 690, 60, 0, Math.PI * 2);
        ctx.arc(tx + 40, 690, 60, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (lvl === 2) {
      // 2. Waterfalls — Cachoeiras Animadas e Folhagens Tropicais
      const time = Date.now() * 0.003;
      for (let i = 0; i < 6; i++) {
        const wx = i * 900 + 350;
        // Queda d'água azul viva
        const gradWater = ctx.createLinearGradient(wx, 200, wx + 60, 200);
        gradWater.addColorStop(0, "#0284C7");
        gradWater.addColorStop(0.5, "#38BDF8");
        gradWater.addColorStop(1, "#0EA5E9");
        ctx.fillStyle = gradWater;
        ctx.fillRect(wx, 200, 65, 740);

        // Espuma branca na base
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(wx + 32, 930 + Math.sin(time + i) * 6, 42, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (lvl === 3) {
      // 3. Crystal Cavern — Cristais Gigantes Azuis e Roxos Cintilantes
      for (let i = 0; i < 16; i++) {
        const cx = i * 360 + 150;
        const cy = 720 - (i % 3) * 60;
        const isCyan = (i % 2 === 0);
        ctx.fillStyle = isCyan ? "#06B6D4" : "#A855F7";
        ctx.beginPath();
        ctx.moveTo(cx, cy - 60); ctx.lineTo(cx + 25, cy); ctx.lineTo(cx, cy + 30); ctx.lineTo(cx - 25, cy);
        ctx.closePath(); ctx.fill();
        // Face iluminada
        ctx.fillStyle = isCyan ? "#CFFAFE" : "#F3E8FF";
        ctx.beginPath();
        ctx.moveTo(cx, cy - 60); ctx.lineTo(cx + 12, cy); ctx.lineTo(cx, cy + 30);
        ctx.closePath(); ctx.fill();
      }
    } else if (lvl === 4) {
      // 4. Ancient Ruins — Colunas de Pedra e Cipós Verdes
      for (let i = 0; i < 10; i++) {
        const rx = i * 550 + 200;
        // Coluna de pedra esculpida
        ctx.fillStyle = "#A8A29E";
        ctx.fillRect(rx, 540, 48, 400);
        ctx.fillRect(rx - 12, 530, 72, 24);
        ctx.fillRect(rx - 8, 920, 64, 20);
        // Cipó verde pendurado
        ctx.strokeStyle = "#15803D";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(rx + 10, 554); ctx.quadraticCurveTo(rx + 30, 650, rx + 12, 750);
        ctx.stroke();
      }
    } else if (lvl === 5) {
      // 5. Snowy Mountains — Pinheiros cobertos de neve
      for (let i = 0; i < 14; i++) {
        const px = i * 420 + 100;
        ctx.fillStyle = "#1E3A8A";
        // Camadas de pinheiro
        ctx.beginPath();
        ctx.moveTo(px, 580); ctx.lineTo(px + 45, 680); ctx.lineTo(px - 45, 680); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px, 650); ctx.lineTo(px + 65, 770); ctx.lineTo(px - 65, 770); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px, 730); ctx.lineTo(px + 85, 880); ctx.lineTo(px - 85, 880); ctx.fill();
        // Camadas de neve branca
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(px - 40, 674, 80, 10);
        ctx.fillRect(px - 60, 764, 120, 10);
      }
    } else if (lvl === 6) {
      // 6. Volcano Lands — Estalactites e Cachoeiras de Lava (#FF4500)
      for (let i = 0; i < 5; i++) {
        const lx = i * 950 + 260;
        ctx.fillStyle = "#120A10";
        ctx.fillRect(lx - 35, 80, 110, 860);

        const gradLava = ctx.createLinearGradient(lx, 0, lx + 50, 0);
        gradLava.addColorStop(0, "#FF4500");
        gradLava.addColorStop(0.5, "#FFD700");
        gradLava.addColorStop(1, "#DC2626");
        ctx.fillStyle = gradLava;
        ctx.fillRect(lx, 80, 50, 860);

        ctx.fillStyle = "#FFA500";
        ctx.beginPath();
        ctx.arc(lx + 25, 920, 35, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // 7. Sky Palace — Colunatas de Ouro e Estrelas Flutuantes
      for (let i = 0; i < 9; i++) {
        const sx = i * 600 + 150;
        ctx.fillStyle = "#FBBF24";
        ctx.fillRect(sx, 640, 36, 300);
        ctx.fillRect(sx - 10, 620, 56, 20);
        ctx.fillStyle = "#FEF08A";
        ctx.beginPath();
        ctx.arc(sx + 18, 580, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  },

  // ==============================================================================
  // CHÃO E PLATAFORMAS ADAPTADOS VISUALMENTE A CADA UMA DAS 7 FASES
  // ==============================================================================
  drawPlatform(ctx, plat) {
    const lvl = this.currentLevelId;
    ctx.save();

    if (lvl === 1) {
      // 1. The Beginning — Grama Verde Vibrante e Terra Fértil
      if (plat.type === "ground") {
        ctx.fillStyle = "#78350F";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#22C55E";
        ctx.fillRect(plat.x, plat.y, plat.w, 18);
        ctx.fillStyle = "#16A34A";
        ctx.fillRect(plat.x, plat.y + 14, plat.w, 6);
      } else {
        ctx.fillStyle = "#854D0E";
        ctx.beginPath(); ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 12); ctx.fill();
        ctx.fillStyle = "#4ADE80";
        ctx.beginPath(); ctx.roundRect(plat.x, plat.y, plat.w, 10, [8, 8, 0, 0]); ctx.fill();
      }
    } else if (lvl === 2) {
      // 2. Waterfalls — Rocha Musgosa Úmida com Grama Tropical
      if (plat.type === "ground") {
        ctx.fillStyle = "#1C1917";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#10B981";
        ctx.fillRect(plat.x, plat.y, plat.w, 16);
      } else {
        ctx.fillStyle = "#292524";
        ctx.beginPath(); ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 12); ctx.fill();
        ctx.fillStyle = "#34D399";
        ctx.fillRect(plat.x, plat.y, plat.w, 8);
      }
    } else if (lvl === 3) {
      // 3. Crystal Cavern — Rocha Roxa Escura com Cristais Azuis nas Bordas
      if (plat.type === "ground") {
        ctx.fillStyle = "#1E1B4B";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#8B5CF6";
        ctx.fillRect(plat.x, plat.y, plat.w, 12);
        ctx.fillStyle = "#38BDF8";
        ctx.fillRect(plat.x, plat.y + 2, plat.w, 4);
      } else {
        ctx.fillStyle = "#2E1065";
        ctx.beginPath(); ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 12); ctx.fill();
        ctx.strokeStyle = "#A855F7"; ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else if (lvl === 4) {
      // 4. Ancient Ruins — Blocos de Pedra Talhada com Runas
      if (plat.type === "ground") {
        ctx.fillStyle = "#57534E";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#D97706";
        ctx.fillRect(plat.x, plat.y, plat.w, 10);
      } else {
        ctx.fillStyle = "#78716C";
        ctx.beginPath(); ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 8); ctx.fill();
        ctx.strokeStyle = "#44403C"; ctx.lineWidth = 3; ctx.stroke();
      }
    } else if (lvl === 5) {
      // 5. Snowy Mountains — Gelo Escorregadio e Neve Branca Compacta
      if (plat.type === "ground") {
        ctx.fillStyle = "#334155";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#F8FAFC";
        ctx.fillRect(plat.x, plat.y, plat.w, 20);
        ctx.fillStyle = "#BAE6FD";
        ctx.fillRect(plat.x, plat.y + 16, plat.w, 6);
      } else {
        ctx.fillStyle = "#64748B";
        ctx.beginPath(); ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 12); ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(plat.x, plat.y, plat.w, 10);
      }
    } else if (lvl === 6) {
      // 6. Volcano Lands — Basalto Rachado com Magma Incandescente (#FF4500)
      if (plat.type === "ground") {
        ctx.fillStyle = "#27272A";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#EA580C";
        ctx.fillRect(plat.x, plat.y, plat.w, 14);
        ctx.fillStyle = "#FDE047";
        ctx.fillRect(plat.x, plat.y + 3, plat.w, 6);
      } else {
        ctx.fillStyle = "#3F3F46";
        ctx.beginPath(); ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 12); ctx.fill();
        ctx.fillStyle = "#EA580C";
        ctx.fillRect(plat.x, plat.y, plat.w, 8);
        ctx.fillStyle = "#FDE047";
        ctx.fillRect(plat.x + 8, plat.y + 2, plat.w - 16, 3);
      }
    } else {
      // 7. Sky Palace — Blocos de Mármore Celeste e Frisos Dourados
      if (plat.type === "ground") {
        ctx.fillStyle = "#312E81";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(plat.x, plat.y, plat.w, 14);
        ctx.fillStyle = "#FEF08A";
        ctx.fillRect(plat.x, plat.y + 3, plat.w, 5);
      } else {
        ctx.fillStyle = "#4338CA";
        ctx.beginPath(); ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 14); ctx.fill();
        ctx.fillStyle = "#FBBF24";
        ctx.fillRect(plat.x, plat.y, plat.w, 8);
      }
    }

    ctx.restore();
  },

  // Perigo: Poças de Lava Borbulhante e Chamas Quentes (substituindo espinhos comuns)
  drawSpike(ctx, hz) {
    ctx.save();
    // 1. Poça de Lava Borbulhante na falha da rocha
    ctx.fillStyle = "#DC2626";
    ctx.fillRect(hz.x - 6, hz.y + 12, hz.w + 12, hz.h);

    // Centro fervente amarelo
    ctx.fillStyle = "#FACC15";
    ctx.fillRect(hz.x, hz.y + 20, hz.w, hz.h - 10);

    // 2. Chamas e Bolhas Quentes Subindo
    const count = 3;
    const step = hz.w / count;
    for (let i = 0; i < count; i++) {
      const fx = hz.x + i * step;

      // Chama externa laranja
      ctx.fillStyle = "#EA580C";
      ctx.beginPath();
      ctx.moveTo(fx, hz.y + hz.h);
      ctx.lineTo(fx + step / 2, hz.y - 12);
      ctx.lineTo(fx + step, hz.y + hz.h);
      ctx.closePath();
      ctx.fill();

      // Chama interna amarela
      ctx.fillStyle = "#FDE047";
      ctx.beginPath();
      ctx.moveTo(fx + 4, hz.y + hz.h);
      ctx.lineTo(fx + step / 2, hz.y - 2);
      ctx.lineTo(fx + step - 4, hz.y + hz.h);
      ctx.closePath();
      ctx.fill();

      // Bolha de lava subindo
      ctx.fillStyle = "#FEF08A";
      ctx.beginPath();
      ctx.arc(fx + step / 2, hz.y - 16, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawCoin(ctx, c) {
    ctx.save();
    // Moeda Dourada Lisa e Reluzente idêntica à imagem
    ctx.fillStyle = "#FBBF24";
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#D97706";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Brilho interno circular sutil
    ctx.fillStyle = "#FEF3C7";
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2 - 4, c.y + c.h / 2 - 4, c.w / 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  drawPowerup(ctx, pw) {
    ctx.save();
    if (pw.type === "magnet") {
      // 1. Pedestal de Rocha Escura com runas e base esculpida (exatamente como na imagem de referência)
      const cx = pw.x + pw.w / 2;
      const cy = pw.y + pw.h / 2;

      // Base de rocha
      ctx.fillStyle = "#1E1118";
      ctx.beginPath();
      ctx.moveTo(cx - 36, cy + 34);
      ctx.lineTo(cx + 36, cy + 34);
      ctx.lineTo(cx + 26, cy + 14);
      ctx.lineTo(cx - 26, cy + 14);
      ctx.closePath();
      ctx.fill();

      // Anel de neon verde volumétrico externo
      const radGlow = ctx.createRadialGradient(cx, cy - 8, 12, cx, cy - 8, 46);
      radGlow.addColorStop(0, "rgba(74, 222, 128, 0.95)");
      radGlow.addColorStop(0.7, "rgba(34, 197, 94, 0.45)");
      radGlow.addColorStop(1, "transparent");
      ctx.fillStyle = radGlow;
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 46, 0, Math.PI * 2);
      ctx.fill();

      // Anel circular verde fluorescente
      ctx.strokeStyle = "#4ADE80";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 28, 0, Math.PI * 2);
      ctx.stroke();

      // Núcleo interno verde esmeralda
      ctx.fillStyle = "rgba(22, 101, 52, 0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 24, 0, Math.PI * 2);
      ctx.fill();

      // Ícone do Ímã em ferradura 'U' 3D metálico
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 13, 0, Math.PI, false);
      ctx.stroke();

      // Polos magnéticos prateados com brilho
      ctx.fillStyle = "#F3F4F6";
      ctx.fillRect(cx - 17, cy - 18, 8, 9);
      ctx.fillRect(cx + 9, cy - 18, 8, 9);
      ctx.strokeStyle = "#9CA3AF";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 17, cy - 18, 8, 9);
      ctx.strokeRect(cx + 9, cy - 18, 8, 9);
    } else {
      // Halo brilhante para outros power-ups
      ctx.fillStyle = "rgba(255, 235, 59, 0.4)";
      ctx.beginPath();
      ctx.arc(pw.x + pw.w / 2, pw.y + pw.h / 2, pw.w * 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "32px 'Fredoka'";
      ctx.fillText(pw.label, pw.x + 8, pw.y + 36);
    }
    ctx.restore();
  },

  drawGoalFlag(ctx, flag) {
    // Poste
    ctx.fillStyle = "#5D4037";
    ctx.fillRect(flag.x + 8, flag.y, 6, flag.h);

    // Flâmula Vermelha e Dourada
    ctx.fillStyle = "#FFC107";
    ctx.beginPath();
    ctx.moveTo(flag.x + 14, flag.y);
    ctx.lineTo(flag.x + 44, flag.y + 18);
    ctx.lineTo(flag.x + 14, flag.y + 36);
    ctx.closePath();
    ctx.fill();

    ctx.font = "20px 'Fredoka'";
    ctx.fillText("🌟", flag.x + 16, flag.y + 24);
  },

  drawPlayer(ctx, p) {
    ctx.save();

    // Efeito de piscar translúcido durante invencibilidade pós-dano
    if (p.invulnerableTimer > 0) {
      if (Math.floor(p.invulnerableTimer / 4) % 2 === 0) {
        ctx.globalAlpha = 0.35; // Pisca para alertar o jogador
      }
    }

    // Barra de Vida Flutuante Estilizada sobre a cabeça do personagem
    const barW = 54;
    const barH = 7;
    const barX = p.x + (p.w - barW) / 2;
    const barY = p.y - 20;

    // Fundo da barra com sombra
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.beginPath();
    ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4);
    ctx.fill();

    // Cor dinâmica: Verde (3), Laranja (2), Vermelho (1)
    let hpColor = "#22C55E";
    if (p.hp === 2) hpColor = "#F97316";
    else if (p.hp <= 1) hpColor = "#EF4444";

    const fillW = Math.max(0, (p.hp / p.maxHp) * barW);
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 3);
    ctx.fill();

    // Divisores de gomos da vida (3 estágios claros)
    ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 3; i++) {
      const divX = barX + (barW / 3) * i;
      ctx.beginPath();
      ctx.moveTo(divX, barY);
      ctx.lineTo(divX, barY + barH);
      ctx.stroke();
    }

    // 1. Efeito do Escudo Protetor (se ativo)
    if (p.isShielded) {
      const pulse = Math.sin(Date.now() * 0.008) * 4;
      ctx.strokeStyle = "rgba(34, 211, 238, 0.85)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.95 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(34, 211, 238, 0.15)";
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.95 + pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Halo do Ímã (se ativo)
    if (p.hasMagnet) {
      ctx.strokeStyle = "rgba(74, 222, 128, 0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 70, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Posição base e direção
    ctx.save();
    if (p.facing === "left") {
      ctx.translate(p.x + p.w, p.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(p.x, p.y);
    }

    // Sombra 3D suave no chão
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(p.w / 2, p.h + 2, p.w * 0.45, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Customizações equipadas vindas do perfil (ou padrão)
    const profile = (typeof App !== "undefined" && App.state && App.state.profile) ? App.state.profile : {};
    const hatType = profile.avatar_hat_type || "blue_cap";
    const suitType = profile.avatar_suit_type || "jeans";
    const bootType = profile.avatar_boot_type || "leather";

    // Rigging Procedural de Pernas e Passos
    // Ângulo de oscilação das pernas baseado em p.walkCycle ou salto
    let legSwing = 0;
    let jumpLift = 0;
    if (!p.grounded) {
      // Perna recolhida no ar durante o pulo
      legSwing = 0.45;
      jumpLift = -4;
    } else if (Math.abs(p.vx) > 0.3) {
      legSwing = Math.sin(p.walkCycle) * 0.48; // balanço angular realista ao andar/correr
    }

    // Determinar cores do calçado
    let bootMainColor = "#78350F"; // Couro marrom
    let bootSoleColor = "#451A03";
    let bootLaceColor = "#D97706";
    if (bootType === "magma") {
      bootMainColor = "#1C1917";
      bootSoleColor = "#FF4500"; // solado incandescente
      bootLaceColor = "#F59E0B";
    } else if (bootType === "golden") {
      bootMainColor = "#F59E0B";
      bootSoleColor = "#B45309";
      bootLaceColor = "#FEF08A";
    }

    // Determinar cores e texturas do traje
    let suitPrimary = "#1E40AF"; // Jeans Azul Profundo
    let suitSecondary = "#2563EB";
    let suitPocket = "#1D4ED8";
    let shirtColor = "#0284C7"; // Camiseta sob o macacão
    let buttonColor = "#FBBF24"; // Botões dourados

    if (suitType === "golden") {
      suitPrimary = "#D97706";
      suitSecondary = "#F59E0B";
      suitPocket = "#B45309";
      shirtColor = "#FEF08A";
      buttonColor = "#FFFFFF";
    } else if (suitType === "magma") {
      suitPrimary = "#18181B";
      suitSecondary = "#27272A";
      suitPocket = "#3F3F46";
      shirtColor = "#EA580C";
      buttonColor = "#FF4500";
    }

    // -------------------------------------------------------------
    // A. RIGGING DAS PERNAS E BOTAS (Passadas 3D)
    // -------------------------------------------------------------

    // Perna Esquerda (trás)
    ctx.save();
    ctx.translate(22, 66);
    ctx.rotate(-legSwing);
    // Coxa/Perna da calça
    ctx.fillStyle = suitPrimary;
    ctx.beginPath();
    ctx.roundRect(-7, 0, 14, 18, 4);
    ctx.fill();
    // Bota Esquerda
    ctx.fillStyle = bootMainColor;
    ctx.beginPath();
    ctx.roundRect(-8, 16 + jumpLift, 18, 14, [4, 6, 2, 2]);
    ctx.fill();
    // Sola tratorada da bota
    ctx.fillStyle = bootSoleColor;
    ctx.fillRect(-9, 27 + jumpLift, 20, 4);
    ctx.restore();

    // Perna Direita (frente)
    ctx.save();
    ctx.translate(42, 66);
    ctx.rotate(legSwing);
    // Coxa/Perna da calça
    ctx.fillStyle = suitSecondary;
    ctx.beginPath();
    ctx.roundRect(-7, 0, 14, 18, 4);
    ctx.fill();
    // Bota Direita (virada para a frente)
    ctx.fillStyle = bootMainColor;
    ctx.beginPath();
    ctx.roundRect(-7, 16 - jumpLift, 20, 14, [4, 7, 2, 2]);
    ctx.fill();
    // Sola tratorada
    ctx.fillStyle = bootSoleColor;
    ctx.fillRect(-8, 27 - jumpLift, 22, 4);
    // Cadarço dourado/iluminado
    ctx.fillStyle = bootLaceColor;
    ctx.fillRect(-2, 18 - jumpLift, 5, 2);
    ctx.fillRect(-2, 22 - jumpLift, 5, 2);
    ctx.restore();

    // -------------------------------------------------------------
    // B. CORPO, CAMISETA E MACACÃO JEANS COM BOTÕES DE OURO
    // -------------------------------------------------------------

    // Camiseta interna
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.roundRect(14, 40, p.w - 28, 20, 6);
    ctx.fill();

    // Braço esquerdo (fundo)
    ctx.save();
    ctx.translate(14, 42);
    ctx.rotate(legSwing * 0.6);
    ctx.fillStyle = "#FFD8D0"; // Pele
    ctx.beginPath();
    ctx.roundRect(-4, 0, 9, 20, 4);
    ctx.fill();
    ctx.restore();

    // Macacão (Corpo principal com gradiente suave simulando 3D)
    const suitGrad = ctx.createLinearGradient(16, 42, p.w - 16, 72);
    suitGrad.addColorStop(0, suitSecondary);
    suitGrad.addColorStop(1, suitPrimary);
    ctx.fillStyle = suitGrad;
    ctx.beginPath();
    ctx.roundRect(15, 46, p.w - 30, 26, 6);
    ctx.fill();

    // Alças do macacão sobre os ombros
    ctx.fillStyle = suitPrimary;
    ctx.fillRect(18, 42, 7, 18);
    ctx.fillRect(p.w - 25, 42, 7, 18);

    // Costuras do macacão (estilo jeans autêntico)
    ctx.strokeStyle = (suitType === "magma") ? "#FF4500" : "rgba(253, 224, 71, 0.75)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(21, 52, p.w - 42, 16);

    // Bolso frontal central do macacão
    ctx.fillStyle = suitPocket;
    ctx.beginPath();
    ctx.roundRect(24, 54, p.w - 48, 12, [0, 0, 4, 4]);
    ctx.fill();

    // Botões Dourados Metálicos de Latão com reflexo
    const drawButton = (bx, by) => {
      ctx.fillStyle = buttonColor;
      ctx.beginPath();
      ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#B45309";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // Brilho no botão
      ctx.fillStyle = "#FFFBEB";
      ctx.beginPath();
      ctx.arc(bx - 1, by - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    };
    drawButton(21.5, 49);
    drawButton(p.w - 21.5, 49);

    // Braço direito (frente com balanço natural da caminhada)
    ctx.save();
    ctx.translate(p.w - 14, 42);
    ctx.rotate(-legSwing * 0.6);
    // Manga da camiseta
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.roundRect(-4, 0, 10, 10, 3);
    ctx.fill();
    // Antebraço e mão
    ctx.fillStyle = "#FFD8D0";
    ctx.beginPath();
    ctx.roundRect(-3, 8, 8, 16, 4);
    ctx.fill();
    ctx.restore();

    // -------------------------------------------------------------
    // C. CABEÇA 3D REALISTA (Rosto expressivo, bochechas, boquinha)
    // -------------------------------------------------------------

    // Pescoço
    ctx.fillStyle = "#FBCFE8";
    ctx.fillRect(p.w / 2 - 4, 38, 8, 6);

    // Cabeça com sombreado volumétrico suave (3D Chibi)
    const headGrad = ctx.createRadialGradient(p.w / 2 - 3, 24, 4, p.w / 2, 26, 26);
    headGrad.addColorStop(0, "#FFF1EE");
    headGrad.addColorStop(0.7, "#FED7AA");
    headGrad.addColorStop(1, "#FDBA74");
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(p.w / 2, 26, 23, 0, Math.PI * 2);
    ctx.fill();

    // Orelha direita
    ctx.fillStyle = "#FDBA74";
    ctx.beginPath();
    ctx.arc(p.w / 2 + 20, 26, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Cabelo castanho suave nas laterais e costeletas
    ctx.fillStyle = "#451A03";
    ctx.beginPath();
    ctx.arc(p.w / 2 - 14, 22, 6, 0, Math.PI * 2);
    ctx.arc(p.w / 2 + 16, 22, 5, 0, Math.PI * 2);
    ctx.fill();

    // Olhos Expressivos grandes estilo Disney/Pixar (castanhos com brilho vivo)
    const drawEye = (ex, ey) => {
      // Esclera branca
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(ex, ey, 5.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Íris castanha escura
      ctx.fillStyle = "#451A03";
      ctx.beginPath();
      ctx.arc(ex + 1, ey, 3.6, 0, Math.PI * 2);
      ctx.fill();
      // Pupila preta
      ctx.fillStyle = "#09090B";
      ctx.beginPath();
      ctx.arc(ex + 1.2, ey, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // Brilho primário branco reluzente
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(ex + 2.2, ey - 1.8, 1.4, 0, Math.PI * 2);
      ctx.arc(ex, ey + 1.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
    };

    drawEye(p.w / 2 - 3, 26);
    drawEye(p.w / 2 + 9, 26);

    // Sobrancelhas expressivas castanhas
    ctx.strokeStyle = "#451A03";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.w / 2 - 7, 18);
    ctx.quadraticCurveTo(p.w / 2 - 3, 16.5, p.w / 2 + 1, 18);
    ctx.moveTo(p.w / 2 + 5, 18);
    ctx.quadraticCurveTo(p.w / 2 + 10, 16.5, p.w / 2 + 14, 18);
    ctx.stroke();

    // Narizinho sutil arrebitado
    ctx.fillStyle = "rgba(234, 88, 12, 0.4)";
    ctx.beginPath();
    ctx.arc(p.w / 2 + 4, 30, 2, 0, Math.PI * 2);
    ctx.fill();

    // Boquinha com sorriso amigável
    ctx.strokeStyle = "#BE123C";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(p.w / 2 + 4, 33, 4.5, 0.15, Math.PI - 0.15, false);
    ctx.stroke();

    // Bochechas rosadas suaves (coradas)
    ctx.fillStyle = "rgba(251, 113, 133, 0.35)";
    ctx.beginPath();
    ctx.arc(p.w / 2 - 6, 31, 4.5, 0, Math.PI * 2);
    ctx.arc(p.w / 2 + 14, 31, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // -------------------------------------------------------------
    // D. SISTEMA DINÂMICO DE CHAPÉUS / ITENS DA CABEÇA EQUIPADOS
    // -------------------------------------------------------------
    if (hatType === "blue_cap") {
      // BONÉ CLÁSSICO AZUL COM ABA CURVADA IDÊNTICO À IMAGEM DE REFERÊNCIA
      const capGrad = ctx.createLinearGradient(p.w / 2 - 20, 2, p.w / 2 + 20, 22);
      capGrad.addColorStop(0, "#3B82F6");
      capGrad.addColorStop(1, "#1D4ED8");
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.arc(p.w / 2 + 2, 18, 22, Math.PI * 0.95, Math.PI * 0.05, false);
      ctx.fill();

      // Botão superior do boné
      ctx.fillStyle = "#1E40AF";
      ctx.beginPath();
      ctx.arc(p.w / 2 + 2, 4, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Aba curva 3D do boné voltada para a frente
      const brimGrad = ctx.createLinearGradient(p.w / 2 + 4, 16, p.w / 2 + 28, 24);
      brimGrad.addColorStop(0, "#2563EB");
      brimGrad.addColorStop(1, "#1E3A8A");
      ctx.fillStyle = brimGrad;
      ctx.beginPath();
      ctx.ellipse(p.w / 2 + 15, 17, 15, 5, 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (hatType === "explorer") {
      // CHAPÉU DE EXPLORADOR COM COURO E FITA
      ctx.fillStyle = "#78350F";
      ctx.beginPath();
      ctx.roundRect(p.w / 2 - 16, 2, 36, 16, [8, 8, 0, 0]);
      ctx.fill();
      // Fita escura
      ctx.fillStyle = "#451A03";
      ctx.fillRect(p.w / 2 - 16, 14, 36, 4);
      // Aba larga do chapéu
      ctx.fillStyle = "#92400E";
      ctx.beginPath();
      ctx.ellipse(p.w / 2 + 2, 18, 26, 6, 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else if (hatType === "miner") {
      // CAPACETE DE MINERAÇÃO AMARELO COM LANTERNA FRONTAL ACESA
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(p.w / 2 + 2, 17, 23, Math.PI * 0.95, Math.PI * 0.05, false);
      ctx.fill();
      // Lanterna frontal na testa
      ctx.fillStyle = "#374151";
      ctx.fillRect(p.w / 2 + 16, 13, 7, 8);
      // Lente acesa emitindo facho de luz amarela
      ctx.fillStyle = "#FEF08A";
      ctx.beginPath();
      ctx.arc(p.w / 2 + 23, 17, 4, 0, Math.PI * 2);
      ctx.fill();
      // Facho de luz volumétrico
      const radLight = ctx.createRadialGradient(p.w / 2 + 24, 17, 2, p.w / 2 + 65, 17, 45);
      radLight.addColorStop(0, "rgba(254, 240, 138, 0.8)");
      radLight.addColorStop(1, "transparent");
      ctx.fillStyle = radLight;
      ctx.beginPath();
      ctx.moveTo(p.w / 2 + 24, 17);
      ctx.lineTo(p.w / 2 + 75, 5);
      ctx.lineTo(p.w / 2 + 75, 29);
      ctx.closePath();
      ctx.fill();
    } else if (hatType === "crown") {
      // COROA REAL DOURADA COM RUBIS
      ctx.fillStyle = "#FBBF24";
      ctx.beginPath();
      ctx.moveTo(p.w / 2 - 14, 18);
      ctx.lineTo(p.w / 2 - 14, 4);
      ctx.lineTo(p.w / 2 - 6, 11);
      ctx.lineTo(p.w / 2 + 2, 2);
      ctx.lineTo(p.w / 2 + 10, 11);
      ctx.lineTo(p.w / 2 + 18, 4);
      ctx.lineTo(p.w / 2 + 18, 18);
      ctx.closePath();
      ctx.fill();
      // Rubis incrustados
      ctx.fillStyle = "#EF4444";
      ctx.beginPath();
      ctx.arc(p.w / 2 + 2, 13, 2.5, 0, Math.PI * 2);
      ctx.arc(p.w / 2 - 9, 14, 1.8, 0, Math.PI * 2);
      ctx.arc(p.w / 2 + 13, 14, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }
};

