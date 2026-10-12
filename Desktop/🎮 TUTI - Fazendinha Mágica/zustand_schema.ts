/**
 * TUTI - Fazendinha Mágica: Schemas e Stores Zustand com TypeScript
 * Gerenciamento centralizado de estado para Next.js / React
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ==============================================================================
// 1. TIPOS & INTERFACES (Compatíveis com o schema Supabase)
// ==============================================================================

export type PlantType = 'carrot' | 'corn' | 'strawberry' | 'pumpkin' | 'wheat' | 'sunflower';
export type AnimalType = 'chicken' | 'cow' | 'sheep' | 'horse';
export type ItemCategory = 'clothes' | 'boots' | 'tools';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  avatar_hat: string;
  avatar_body: string;
  avatar_boots: string;
  coins: number;
  xp: number;
  level: number;
  total_harvests: number;
}

export interface FarmPlot {
  id: number;
  plot_index: number;
  plant_type: PlantType | null;
  planted_at: number | null; // timestamp
  watered_at: number | null;
  fertilized: boolean;
  stage: number; // 0: vazio, 1: semente, 2: broto, 3: maduro
}

export interface Animal {
  id: string;
  type: AnimalType;
  name: string;
  hunger: number;     // 0-100
  thirst: number;     // 0-100
  happiness: number;  // 0-100
  product_ready: boolean;
}

export interface InventoryItem {
  id: string;
  item_id: string;
  category: ItemCategory;
  equipped: boolean;
}

export interface LevelProgress {
  level_id: number;
  unlocked: boolean;
  stars: number;
  best_time: number | null;
  coins_collected: number;
}

// ==============================================================================
// 2. STORE GLOBAL: GameStore (Perfil, Moedas, XP, Nível, Fases e Inventário)
// ==============================================================================

interface GameState {
  profile: Profile;
  inventory: InventoryItem[];
  levels: LevelProgress[];
  activeScreen: string;
  
  // Ações
  setProfileName: (name: string) => void;
  addCoins: (amount: number) => void;
  addXp: (amount: number) => void;
  equipItem: (itemId: string, category: ItemCategory, hat?: string, body?: string, boots?: string) => void;
  buyItem: (itemId: string, category: ItemCategory, price: number) => void;
  completeLevel: (levelId: number, stars: number, timeSeconds: number, coins: number) => void;
  setActiveScreen: (screen: string) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profile: {
        id: 'usr_default',
        username: 'Tuti',
        avatar_url: '🧑‍🌾',
        avatar_hat: '🧢',
        avatar_body: '👕',
        avatar_boots: '🥾',
        coins: 100,
        xp: 0,
        level: 1,
        total_harvests: 0,
      },
      inventory: [
        { id: 'inv_1', item_id: 'c_classic', category: 'clothes', equipped: true },
        { id: 'inv_2', item_id: 'b_leather', category: 'boots', equipped: true },
        { id: 'inv_3', item_id: 't_hoe', category: 'tools', equipped: true },
      ],
      levels: [
        { level_id: 1, unlocked: true, stars: 0, best_time: null, coins_collected: 0 },
        { level_id: 2, unlocked: false, stars: 0, best_time: null, coins_collected: 0 },
        { level_id: 3, unlocked: false, stars: 0, best_time: null, coins_collected: 0 },
        { level_id: 4, unlocked: false, stars: 0, best_time: null, coins_collected: 0 },
        { level_id: 5, unlocked: false, stars: 0, best_time: null, coins_collected: 0 },
      ],
      activeScreen: 'home',

      setProfileName: (username) => set((s) => ({ profile: { ...s.profile, username } })),

      addCoins: (amount) => set((s) => ({
        profile: { ...s.profile, coins: Math.max(0, s.profile.coins + amount) }
      })),

      addXp: (amount) => set((s) => {
        let newXp = s.profile.xp + amount;
        let newLevel = s.profile.level;
        const requiredXp = newLevel * 100;
        if (newXp >= requiredXp) {
          newXp -= requiredXp;
          newLevel += 1;
        }
        return { profile: { ...s.profile, xp: newXp, level: newLevel } };
      }),

      equipItem: (itemId, category, hat, body, boots) => set((s) => {
        const nextInv = s.inventory.map(item => {
          if (item.category === category) {
            return { ...item, equipped: item.item_id === itemId };
          }
          return item;
        });

        const nextProfile = { ...s.profile };
        if (hat) nextProfile.avatar_hat = hat;
        if (body) nextProfile.avatar_body = body;
        if (boots) nextProfile.avatar_boots = boots;

        return { inventory: nextInv, profile: nextProfile };
      }),

      buyItem: (itemId, category, price) => {
        const state = get();
        if (state.profile.coins < price) return;
        set((s) => ({
          profile: { ...s.profile, coins: s.profile.coins - price },
          inventory: [...s.inventory, { id: 'inv_' + Date.now(), item_id: itemId, category, equipped: false }]
        }));
      },

      completeLevel: (levelId, stars, timeSeconds, coins) => set((s) => {
        const nextLevels = s.levels.map(lvl => {
          if (lvl.level_id === levelId) {
            return {
              ...lvl,
              stars: Math.max(lvl.stars, stars),
              best_time: lvl.best_time ? Math.min(lvl.best_time, timeSeconds) : timeSeconds,
              coins_collected: lvl.coins_collected + coins
            };
          }
          // Destravar a próxima fase
          if (lvl.level_id === levelId + 1) {
            return { ...lvl, unlocked: true };
          }
          return lvl;
        });
        return { levels: nextLevels };
      }),

      setActiveScreen: (activeScreen) => set({ activeScreen }),
    }),
    {
      name: 'tuti-game-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ==============================================================================
// 3. STORE DA HORTA: FarmStore (Grid 6x6, Plantio, Rega, Adubo, Colheita)
// ==============================================================================

interface FarmState {
  plots: FarmPlot[];
  selectedSeed: PlantType;
  selectedTool: 'plant' | 'water' | 'fertilize' | 'harvest';
  
  plantSeed: (plotIndex: number, plantType: PlantType, cost: number) => boolean;
  waterPlot: (plotIndex: number) => void;
  fertilizePlot: (plotIndex: number) => void;
  harvestPlot: (plotIndex: number) => { plantType: PlantType } | null;
  updatePlotStages: () => void;
  setSelectedSeed: (seed: PlantType) => void;
  setSelectedTool: (tool: 'plant' | 'water' | 'fertilize' | 'harvest') => void;
}

export const useFarmStore = create<FarmState>()(
  persist(
    (set, get) => ({
      plots: Array.from({ length: 36 }, (_, idx) => ({
        id: idx,
        plot_index: idx,
        plant_type: null,
        planted_at: null,
        watered_at: null,
        fertilized: false,
        stage: 0,
      })),
      selectedSeed: 'carrot',
      selectedTool: 'plant',

      setSelectedSeed: (selectedSeed) => set({ selectedSeed }),
      setSelectedTool: (selectedTool) => set({ selectedTool }),

      plantSeed: (plotIndex, plantType, cost) => {
        const game = useGameStore.getState();
        if (game.profile.coins < cost) return false;

        const plots = [...get().plots];
        if (plots[plotIndex].plant_type) return false;

        game.addCoins(-cost);
        plots[plotIndex] = {
          ...plots[plotIndex],
          plant_type: plantType,
          planted_at: Date.now(),
          watered_at: null,
          fertilized: false,
          stage: 1,
        };
        set({ plots });
        return true;
      },

      waterPlot: (plotIndex) => set((s) => {
        const plots = [...s.plots];
        if (plots[plotIndex].plant_type && !plots[plotIndex].watered_at) {
          plots[plotIndex].watered_at = Date.now();
        }
        return { plots };
      }),

      fertilizePlot: (plotIndex) => set((s) => {
        const plots = [...s.plots];
        if (plots[plotIndex].plant_type && !plots[plotIndex].fertilized) {
          plots[plotIndex].fertilized = true;
        }
        return { plots };
      }),

      harvestPlot: (plotIndex) => {
        const plots = [...get().plots];
        const plot = plots[plotIndex];
        if (!plot.plant_type || plot.stage < 3) return null;

        const harvestedType = plot.plant_type;
        plots[plotIndex] = {
          ...plot,
          plant_type: null,
          planted_at: null,
          watered_at: null,
          fertilized: false,
          stage: 0,
        };

        set({ plots });
        return { plantType: harvestedType };
      },

      updatePlotStages: () => set((s) => {
        const now = Date.now();
        const growthTimes: Record<PlantType, number> = {
          carrot: 20000,
          wheat: 30000,
          corn: 40000,
          strawberry: 60000,
          sunflower: 75000,
          pumpkin: 90000,
        };

        const plots = s.plots.map(p => {
          if (!p.plant_type || p.stage >= 3 || !p.planted_at) return p;
          let totalTime = growthTimes[p.plant_type];
          if (p.watered_at) totalTime *= 0.7; // 30% mais rápido
          if (p.fertilized) totalTime *= 0.5; // 50% mais rápido

          const elapsed = now - p.planted_at;
          if (elapsed >= totalTime) {
            return { ...p, stage: 3 };
          } else if (elapsed >= totalTime / 2) {
            return { ...p, stage: 2 };
          }
          return p;
        });
        return { plots };
      }),
    }),
    {
      name: 'tuti-farm-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
