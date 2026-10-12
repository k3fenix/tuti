/**
 * TUTI - Fazendinha Mágica: Loja de Customização & Guarda-Roupa
 * - Aba Roupas: 10+ itens
 * - Aba Calçados: 6+ itens
 * - Aba Ferramentas: 6+ itens
 * Total: 22+ Itens com prévia ao vivo no personagem!
 */

const Shop = {
  currentCategory: "clothes",

  CATALOG: [
    // CHAPÉUS / CAPACETES
    { id: "hat_blue_cap", name: "Boné Clássico Azul", category: "clothes", price: 0, rarity: "Comum", icon: "🧢", hatType: "blue_cap", desc: "Boné clássico azul do herói com aba curva realista" },
    { id: "hat_explorer", name: "Chapéu de Explorador", category: "clothes", price: 60, rarity: "Raro", icon: "🤠", hatType: "explorer", desc: "Chapéu de couro com fita marrom para expedições" },
    { id: "hat_miner", name: "Capacete de Mineração", category: "clothes", price: 120, rarity: "Raro", icon: "👷", hatType: "miner", desc: "Capacete resistente com lanterna frontal acesa" },
    { id: "hat_royal_crown", name: "Coroa Real Dourada", category: "clothes", price: 250, rarity: "Lendário", icon: "👑", hatType: "crown", desc: "Coroa de ouro puro incrustada de rubis mágicos" },

    // ROUPAS / MACACÕES
    { id: "suit_jeans", name: "Macacão Jeans Tradicional", category: "clothes", price: 0, rarity: "Comum", icon: "👖", suitType: "jeans", desc: "Denim texturizado com costura amarela e botões de latão dourados" },
    { id: "suit_golden", name: "Macacão Dourado de Ouro", category: "clothes", price: 200, rarity: "Lendário", icon: "✨", suitType: "golden", desc: "Tecido reluzente de fibra de ouro que emite brilho radiante" },
    { id: "suit_magma", name: "Traje de Magma (Magma Suit)", category: "clothes", price: 150, rarity: "Raro", icon: "🔥", suitType: "magma", desc: "Armadura vulcânica reforçada com veios de lava brilhantes" },

    // CALÇADOS E BOTAS
    { id: "b_leather_boots", name: "Botas de Couro Rústico", category: "boots", price: 0, rarity: "Comum", icon: "🥾", bootType: "leather", desc: "Botas de couro com cadarço reforçado e sola tratorada" },
    { id: "b_lava_boots", name: "Botas de Rocha Vulcânica", category: "boots", price: 80, rarity: "Raro", icon: "🌋", bootType: "magma", desc: "Botas resistentes ao calor com solado incandescente" },
    { id: "b_golden_boots", name: "Botas Douradas da Realeza", category: "boots", price: 180, rarity: "Lendário", icon: "⭐", bootType: "golden", desc: "Botas douradas reluzentes para grandes aventureiros" }
  ],

  init() {
    this.renderItems();
    this.updateFittingRoom();
  },

  setTab(category) {
    this.currentCategory = category;
    document.querySelectorAll(".shop-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.category === category);
    });
    this.renderItems();
    AudioManager.playClick();
  },

  renderItems() {
    const container = document.getElementById("shop-items-container");
    if (!container) return;

    const filtered = this.CATALOG.filter(item => item.category === this.currentCategory);
    const inventory = App.state.inventory;

    container.innerHTML = filtered.map(item => {
      const isOwned = inventory.some(i => i.item_id === item.id);
      const isEquipped = inventory.some(i => i.item_id === item.id && i.equipped);

      let actionBtn = "";
      if (isEquipped) {
        actionBtn = `<button class="item-action-btn equipped-badge"><i class="fa-solid fa-check"></i> Equipado</button>`;
      } else if (isOwned) {
        actionBtn = `<button class="item-action-btn equip" onclick="Shop.equipItem('${item.id}')">Equipar</button>`;
      } else {
        actionBtn = `<button class="item-action-btn buy" onclick="Shop.buyItem('${item.id}')">${item.price} 🪙 Comprar</button>`;
      }

      return `
        <div class="shop-item-card ${isEquipped ? 'equipped' : isOwned ? 'purchased' : ''}">
          <div class="item-icon-box">${item.icon}</div>
          <div class="item-info-text">
            <h5>${item.name}</h5>
            <p>${item.desc}</p>
          </div>
          ${actionBtn}
        </div>
      `;
    }).join("");
  },

  buyItem(itemId) {
    const item = this.CATALOG.find(i => i.id === itemId);
    if (!item) return;

    if (App.state.profile.coins < item.price) {
      App.showToast("Moedas insuficientes para comprar este item!", "warning");
      return;
    }

    // Cobrar moedas
    App.addCoins(-item.price);
    App.state.inventory.push({
      id: "inv_" + Date.now(),
      item_id: item.id,
      category: item.category,
      equipped: false
    });

    AudioManager.playWin();
    App.showToast(`🎉 Você comprou ${item.name}!`, "success");

    // Equipar automaticamente
    this.equipItem(itemId);
    Achievements.incrementProgress("fashionista");
  },

  equipItem(itemId) {
    const item = this.CATALOG.find(i => i.id === itemId);
    if (!item) return;

    // Desequipar itens da mesma categoria no inventário
    App.state.inventory.forEach(invItem => {
      const matchCatalog = this.CATALOG.find(c => c.id === invItem.item_id);
      if (matchCatalog && matchCatalog.category === item.category) {
        invItem.equipped = (invItem.item_id === itemId);
      }
    });

    // Atualizar skin e tipos no perfil do jogador
    if (item.hatType) {
      App.state.profile.avatar_hat_type = item.hatType;
      App.state.profile.avatar_hat = item.icon;
    }
    if (item.suitType) {
      App.state.profile.avatar_suit_type = item.suitType;
      App.state.profile.avatar_body = item.icon;
    }
    if (item.bootType) {
      App.state.profile.avatar_boot_type = item.bootType;
      App.state.profile.avatar_boots = item.icon;
    }

    AudioManager.playPop();
    App.showToast(`✨ ${item.name} equipado com sucesso!`, "info");

    this.renderItems();
    this.updateFittingRoom();
    StorageManager.save(App.state);
  },

  updateFittingRoom() {
    const fitHat = document.getElementById("fit-hat");
    const fitBody = document.getElementById("fit-body");
    const fitBoots = document.getElementById("fit-boots");
    const fitText = document.getElementById("fit-summary-text");

    if (fitHat) fitHat.innerText = App.state.profile.avatar_hat || "🧢";
    if (fitBody) fitBody.innerText = App.state.profile.avatar_body || "👕";
    if (fitBoots) fitBoots.innerText = App.state.profile.avatar_boots || "🥾";

    // Encontrar nome da roupa atual
    const equippedClothes = App.state.inventory.find(i => i.category === "clothes" && i.equipped);
    if (equippedClothes && fitText) {
      const found = this.CATALOG.find(c => c.id === equippedClothes.item_id);
      if (found) fitText.innerText = found.name;
    }
  }
};
