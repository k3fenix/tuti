/**
 * TUTI - Fazendinha Mágica: Controlador Principal da Aplicação
 * Gerencia a navegação entre as 8 telas, HUD global, Level Select, toasts e ciclo de vida do jogo.
 */

const App = {
  state: null,
  currentScreen: "splash",

  init() {
    // 1. Carregar Estado
    this.state = StorageManager.load();

    // 2. Inicializar Módulos
    AudioManager.init();
    Shop.init();
    Achievements.init();
    GameEngine.init();
    if (typeof SupabaseManager !== "undefined") SupabaseManager.init();

    // 3. Atualizar HUD Global
    this.updateHud();

    // 4. Renderizar Lista de Fases
    this.renderLevelSelect();

    // 5. Vincular Eventos Gerais
    this.bindGlobalEvents();

    // 6. Se o jogador já tiver nome salvo, pode ir direto ou começar do splash
    const nameInput = document.getElementById("splash-player-name");
    if (nameInput) nameInput.value = this.state.profile.username || "Tuti";

    // 7. Registrar Service Worker para PWA (Instalação no Android / iOS / PC / Mac)
    this.registerPWA();
  },

  registerPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('ServiceWorker error:', err);
      });
    }

    // Gerenciar botão de instalação PWA
    let deferredPrompt;
    const installBtn = document.getElementById('btn-pwa-install');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.classList.remove('hidden');
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            installBtn.classList.add('hidden');
          }
          deferredPrompt = null;
        } else {
          this.showToast('Para instalar no iOS: toque em Compartilhar e "Adicionar à Tela de Início"', 'info');
        }
      });
    }
  },

  toggleFullscreen() {
    const appEl = document.getElementById("game-app");
    const isWide = appEl.classList.toggle("fullscreen-wide");
    const btn = document.getElementById("btn-fullscreen-toggle");

    if (isWide) {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-compress"></i>';
      // Tentar acionar o Fullscreen nativo da tela se disponível
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      this.showToast("🖥️ Modo Tela Cheia / Ampliado ativado!", "info");
    } else {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-expand"></i>';
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      this.showToast("Modo Janela padrão restaurado.", "info");
    }
  },

  bindGlobalEvents() {
    // Botão de Iniciar no Splash
    const btnStart = document.getElementById("btn-start-game");
    if (btnStart) {
      btnStart.addEventListener("click", () => {
        const nameInput = document.getElementById("splash-player-name");
        if (nameInput && nameInput.value.trim()) {
          this.state.profile.username = nameInput.value.trim();
          StorageManager.save(this.state);
        }
        AudioManager.playClick();
        this.updateHud();
        this.showScreen("home");
        this.showToast(`Bem-vindo ao TUTI, ${this.state.profile.username}! 🎮`, "success");
      });
    }

    // Botão de áudio
    const btnAudio = document.getElementById("btn-audio-toggle");
    if (btnAudio) {
      btnAudio.addEventListener("click", () => {
        const active = AudioManager.toggleSound();
        this.showToast(active ? "🔊 Sons ativados!" : "🔇 Sons desativados", "info");
      });
    }

    // Botão de Tela Cheia / Ampliar
    const btnFullscreen = document.getElementById("btn-fullscreen-toggle");
    if (btnFullscreen) {
      btnFullscreen.addEventListener("click", () => {
        this.toggleFullscreen();
      });
    }
  },

  showScreen(screenId) {
    if (this.currentScreen === "gameplay" && screenId !== "gameplay") {
      GameEngine.stop();
    }

    this.currentScreen = screenId;

    // Ocultar todas as telas e exibir a ativa
    document.querySelectorAll(".game-screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.classList.add("active");
    }

    // Atualizar barra inferior de abas
    document.querySelectorAll("#bottom-nav .nav-item").forEach(nav => {
      nav.classList.toggle("active", nav.dataset.screen === screenId);
    });

    // Controlar visibilidade do Top HUD e Bottom Nav (esconder no splash e durante gameplay para imersão total)
    const topHud = document.getElementById("top-hud");
    const botNav = document.getElementById("bottom-nav");

    if (screenId === "splash") {
      if (topHud) topHud.style.display = "none";
      if (botNav) botNav.style.display = "none";
    } else if (screenId === "gameplay") {
      if (topHud) topHud.style.display = "none";
      if (botNav) botNav.style.display = "none";
    } else {
      if (topHud) topHud.style.display = "flex";
      if (botNav) botNav.style.display = "flex";
    }

    // Ações ao entrar em telas específicas
    if (screenId === "level-select") {
      this.renderLevelSelect();
    } else if (screenId === "profile") {
      Achievements.render();
      const pName = document.getElementById("profile-name-text");
      if (pName) pName.innerText = this.state.profile.username;
    } else if (screenId === "shop") {
      Shop.renderItems();
      Shop.updateFittingRoom();
    }

    AudioManager.playClick();
  },

  renderLevelSelect() {
    const container = document.getElementById("levels-list");
    if (!container) return;

    const levels = this.state.levels_progress;

    container.innerHTML = levels.map((lvl) => {
      let starsHtml = "";
      for (let s = 1; s <= 3; s++) {
        starsHtml += `<span class="star ${s <= lvl.stars ? 'earned' : 'empty'}">★</span>`;
      }

      return `
        <div class="level-card level-biome-card ${lvl.unlocked ? '' : 'locked'}" onclick="${lvl.unlocked ? `App.launchLevel(${lvl.level_id})` : 'App.showToast(\'Conclua a fase anterior para desbloquear esta aventura!\', \'warning\')'}">
          <div class="level-cover level-cover-theme-${lvl.level_id}">
            <div class="level-icon-emoji">${lvl.icon || '⭐'}</div>
            ${!lvl.unlocked ? '<div class="level-lock-badge"><i class="fa-solid fa-lock"></i> Bloqueado</div>' : '<div class="level-play-badge"><i class="fa-solid fa-play"></i> Jogar</div>'}
          </div>
          <div class="level-info">
            <div class="level-title-group">
              <h4>${lvl.name}</h4>
              <p class="level-desc-text">${lvl.subtitle || 'Aventura épica'}</p>
              <span class="level-record-text">${lvl.best_time ? `⏱️ Recorde: ${lvl.best_time}s` : '3 Estrelas a Conquistar'}</span>
            </div>
            <div class="level-stars-display">
              ${starsHtml}
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Atualizar badge de estrelas totais na home (Total: 21 estrelas nas 7 fases)
    const totalStars = levels.reduce((acc, curr) => acc + (curr.stars || 0), 0);
    const starBadge = document.getElementById("hub-total-stars-badge");
    if (starBadge) starBadge.innerText = `⭐ ${totalStars}/21`;
  },

  launchLevel(levelId) {
    this.showScreen("gameplay");
    GameEngine.startLevel(levelId);
  },

  addCoins(amount) {
    this.state.profile.coins = Math.max(0, this.state.profile.coins + amount);
    this.updateHud();
    StorageManager.save(this.state);
  },

  addXp(amount) {
    this.state.profile.xp += amount;
    // Sistema de níveis: Cada nível requer nível * 100 XP
    const requiredXp = this.state.profile.level * 100;
    if (this.state.profile.xp >= requiredXp) {
      this.state.profile.xp -= requiredXp;
      this.state.profile.level += 1;
      AudioManager.playWin();
      this.showToast(`🎊 Parabéns! Você subiu para o Nível ${this.state.profile.level}!`, "success");
    }
    this.updateHud();
    StorageManager.save(this.state);
  },

  updateHud() {
    const coinElem = document.getElementById("hud-coins");
    const nameElem = document.getElementById("hud-player-name");
    const levelPill = document.getElementById("hud-level-pill");
    const xpFill = document.getElementById("hud-xp-fill");
    const avatarIcon = document.getElementById("hud-avatar-icon");

    if (coinElem) coinElem.innerText = this.state.profile.coins;
    if (nameElem) nameElem.innerText = this.state.profile.username || "Tuti";
    if (levelPill) levelPill.innerText = `Nv. ${this.state.profile.level}`;

    const requiredXp = this.state.profile.level * 100;
    const xpPct = Math.min(100, Math.floor((this.state.profile.xp / requiredXp) * 100));
    if (xpFill) xpFill.style.width = `${xpPct}%`;

    if (avatarIcon) avatarIcon.innerText = this.state.profile.avatar_hat || "🧢";
  },

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
};

// Iniciar a aplicação quando o DOM estiver pronto
window.addEventListener("DOMContentLoaded", () => {
  App.init();
});
