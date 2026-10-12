/**
 * TUTI - Fazendinha Mágica: Gerenciamento de Estado Global & LocalStorage
 * Estrutura 100% compatível com a modelagem relacional de tabelas do Supabase.
 */

const StorageManager = {
  STORAGE_KEY: "tuti_magic_farm_save_v1",

  // Estado padrão inicial do jogador
  getDefaultState() {
    return {
      profile: {
        id: "usr_" + Math.random().toString(36).substr(2, 9),
        username: "Tuti",
        avatar_url: "🧑‍🌾",
        avatar_hat: "🧢",
        avatar_hat_type: "blue_cap",
        avatar_body: "👖",
        avatar_suit_type: "jeans",
        avatar_boots: "🥾",
        avatar_boot_type: "leather",
        coins: 100,
        xp: 0,
        level: 1,
        total_harvests: 0,
        created_at: new Date().toISOString()
      },
      inventory: [
        { id: "inv_1", item_id: "hat_blue_cap", equipped: true, category: "clothes" },
        { id: "inv_2", item_id: "suit_jeans", equipped: true, category: "clothes" },
        { id: "inv_3", item_id: "b_leather_boots", equipped: true, category: "boots" }
      ],
      // As 7 Fases Principais do Mundo de Aventura
      levels_progress: [
        { level_id: 1, name: "Fase 1: The Beginning", subtitle: "Pradarias verdes, céu azul e tutorial de aventura 🌱", biome: "the_beginning", unlocked: true, stars: 0, best_time: null, coins_collected: 0, icon: "🌱" },
        { level_id: 2, name: "Fase 2: Waterfalls", subtitle: "Florestas tropicais, cachoeiras animadas & penhascos 🌊", biome: "waterfalls", unlocked: false, stars: 0, best_time: null, coins_collected: 0, icon: "🌊" },
        { level_id: 3, name: "Fase 3: Crystal Cavern", subtitle: "Caverna mística com cristais brilhantes e trilhos 💎", biome: "crystal_cavern", unlocked: false, stars: 0, best_time: null, coins_collected: 0, icon: "💎" },
        { level_id: 4, name: "Fase 4: Ancient Ruins", subtitle: "Ruínas antigas, templos de pedra, colunas e cipós 🏛️", biome: "ancient_ruins", unlocked: false, stars: 0, best_time: null, coins_collected: 0, icon: "🏛️" },
        { level_id: 5, name: "Fase 5: Snowy Mountains", subtitle: "Montanhas nevadas, pinheiros e gelo escorregadio ❄️", biome: "snowy_mountains", unlocked: false, stars: 0, best_time: null, coins_collected: 0, icon: "❄️" },
        { level_id: 6, name: "Fase 6: Volcano Lands", subtitle: "Rios de lava incandescente, vulcões ativos e rochas 🔥", biome: "volcano_lands", unlocked: false, stars: 0, best_time: null, coins_collected: 0, icon: "🌋" },
        { level_id: 7, name: "Fase 7: Sky Palace", subtitle: "Ilhas flutuantes celestiais, templos dourados & estrelas ☁️", biome: "sky_palace", unlocked: false, stars: 0, best_time: null, coins_collected: 0, icon: "👑" }
      ],
      achievements: [
        { code: "first_win", title: "Primeiro Passo", desc: "Complete The Beginning e inicie sua jornada", icon: "🌱", unlocked: false },
        { code: "waterfalls_master", title: "Salto na Cachoeira", desc: "Sobreviva aos penhascos de Waterfalls", icon: "🌊", unlocked: false },
        { code: "crystal_seeker", title: "Colecionador de Cristais", desc: "Explore a Crystal Cavern misteriosa", icon: "💎", unlocked: false },
        { code: "ruins_explorer", title: "Explorador Ancestral", desc: "Desvende os segredos das Ancient Ruins", icon: "🏛️", unlocked: false },
        { code: "snow_master", title: "Coração de Gelo", desc: "Supere as Snowy Mountains congeladas", icon: "❄️", unlocked: false },
        { code: "lava_survivor", title: "Mestre do Magma", desc: "Sobreviva ao calor escaldante de Volcano Lands", icon: "🌋", unlocked: false },
        { code: "sky_champion", title: "Rei dos Céus", desc: "Conquiste o Sky Palace e o tesouro supremo", icon: "👑", unlocked: false },
        { code: "coin_hunter", title: "Caçador de Tesouros", desc: "Colete 200 moedas reluzentes", icon: "🪙", unlocked: false },
        { code: "adventurer", title: "Lenda Suprema", desc: "Conquiste 3 estrelas nas 7 fases da jornada", icon: "⭐", unlocked: false }
      ]
    };
  },

  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const defaultState = this.getDefaultState();
        
        // Sincronizar fases para garantir que as 7 fases estejam presentes
        const mergedLevels = defaultState.levels_progress.map(defLvl => {
          const existing = (parsed.levels_progress || []).find(l => l.level_id === defLvl.level_id);
          return existing ? { ...defLvl, ...existing, name: defLvl.name, subtitle: defLvl.subtitle, biome: defLvl.biome, icon: defLvl.icon } : defLvl;
        });

        // Sincronizar conquistas
        const mergedAchievements = defaultState.achievements.map(defAch => {
          const existing = (parsed.achievements || []).find(a => a.code === defAch.code);
          return existing ? { ...defAch, unlocked: existing.unlocked } : defAch;
        });

        return {
          ...defaultState,
          ...parsed,
          profile: { ...defaultState.profile, ...(parsed.profile || {}) },
          levels_progress: mergedLevels,
          achievements: mergedAchievements
        };
      }
    } catch (e) {
      console.error("Falha ao carregar estado local:", e);
    }
    return this.getDefaultState();
  },

  save(state) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Falha ao salvar estado local:", e);
    }
  }
};
