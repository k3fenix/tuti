/**
 * TUTI: Sistema de Conquistas (Achievements)
 * - Primeiro Salto
 * - Caçador de Moedas (1.000 moedas)
 * - Explorador dos 7 Reinos (Completar todas as 7 fases)
 * - Mestre do Guarda-Roupa (Comprar itens na loja)
 */

const Achievements = {
  init() {
    this.render();
  },

  render() {
    const container = document.getElementById("achievements-list");
    if (!container) return;

    const list = App.state.achievements;
    container.innerHTML = list.map(ach => `
      <div class="achievement-card ${ach.unlocked ? 'unlocked' : ''}">
        <div class="ach-icon-circle">${ach.icon}</div>
        <div class="ach-info">
          <h4>${ach.title} ${ach.unlocked ? '✅' : ''}</h4>
          <p>${ach.desc}</p>
        </div>
      </div>
    `).join("");

    this.updateStatsCounters();
  },

  incrementProgress(code) {
    const ach = App.state.achievements.find(a => a.code === code);
    if (!ach || ach.unlocked) return;

    ach.progress = (ach.progress || 0) + 1;
    if (ach.target && ach.progress >= ach.target) {
      this.unlock(code);
    }
    StorageManager.save(App.state);
  },

  unlock(code) {
    const ach = App.state.achievements.find(a => a.code === code);
    if (!ach || ach.unlocked) return;

    ach.unlocked = true;
    AudioManager.playWin();
    App.showToast(`🏆 Conquista Desbloqueada: ${ach.title}!`, "success");
    App.addCoins(50);
    App.addXp(100);

    this.render();
    StorageManager.save(App.state);
  },

  checkProgress() {
    // 1. Rico (1000 moedas)
    if (App.state.profile.coins >= 1000) {
      this.unlock("rich_adventurer");
    }

    // 2. Explorador dos 7 Reinos
    const allCompleted = App.state.levels_progress.every(l => l.stars >= 1);
    if (allCompleted) {
      this.unlock("adventurer");
    }

    this.render();
  },

  updateStatsCounters() {
    const starsElem = document.getElementById("stat-total-stars");
    const earnedElem = document.getElementById("stat-total-earned");

    // Total de estrelas conquistadas
    const totalStars = App.state.levels_progress.reduce((acc, curr) => acc + (curr.stars || 0), 0);
    if (starsElem) starsElem.innerText = totalStars;

    if (earnedElem) earnedElem.innerText = App.state.profile.coins;
  }
};
