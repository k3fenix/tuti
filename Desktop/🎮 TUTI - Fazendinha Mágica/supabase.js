/**
 * TUTI - Fazendinha Mágica: Conector com Supabase REST API & Realtime
 * Permite que o jogador insira suas chaves do Supabase e sincronize sem depender de bundlers pesados!
 */

const SupabaseManager = {
  url: localStorage.getItem("tuti_supabase_url") || "",
  anonKey: localStorage.getItem("tuti_supabase_key") || "",
  isOnline: false,

  init() {
    this.updateStatusUI();
    const urlInput = document.getElementById("supabase-url");
    const keyInput = document.getElementById("supabase-anon-key");
    if (urlInput) urlInput.value = this.url;
    if (keyInput) keyInput.value = this.anonKey;

    if (this.url && this.anonKey) {
      this.testConnection();
    }
  },

  openModal() {
    const modal = document.getElementById("supabase-modal");
    if (modal) modal.classList.remove("hidden");
  },

  closeModal() {
    const modal = document.getElementById("supabase-modal");
    if (modal) modal.classList.add("hidden");
  },

  updateStatusUI() {
    const statusElem = document.getElementById("supabase-status");
    if (!statusElem) return;

    if (this.isOnline) {
      statusElem.innerHTML = '<span class="status-indicator online"></span> Conectado com o Supabase Cloud (Tempo Real)';
    } else {
      statusElem.innerHTML = '<span class="status-indicator offline"></span> Modo Local Ativo (LocalStorage)';
    }
  },

  saveCredentials() {
    const url = document.getElementById("supabase-url").value.trim();
    const key = document.getElementById("supabase-anon-key").value.trim();

    this.url = url;
    this.anonKey = key;
    localStorage.setItem("tuti_supabase_url", url);
    localStorage.setItem("tuti_supabase_key", key);

    App.showToast("Configurações do Supabase salvas!", "info");
    this.testConnection();
  },

  async testConnection() {
    if (!this.url || !this.anonKey) {
      this.isOnline = false;
      this.updateStatusUI();
      return;
    }

    try {
      // Teste de chamada REST ao Supabase
      const res = await fetch(`${this.url}/rest/v1/profiles?select=count`, {
        headers: {
          "apikey": this.anonKey,
          "Authorization": `Bearer ${this.anonKey}`
        }
      });

      if (res.ok) {
        this.isOnline = true;
        App.showToast("☁️ Conectado com o Supabase com Sucesso!", "success");
      } else {
        this.isOnline = false;
      }
    } catch (e) {
      this.isOnline = false;
    }
    this.updateStatusUI();
  },

  // Sincroniza o estado atual com a nuvem do Supabase
  async syncNow() {
    if (!this.url || !this.anonKey) {
      App.showToast("Configure URL e Chave do Supabase primeiro!", "warning");
      return;
    }

    try {
      const state = App.state;
      // Salva ou atualiza perfil no Supabase via UPSERT REST
      const res = await fetch(`${this.url}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          "apikey": this.anonKey,
          "Authorization": `Bearer ${this.anonKey}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify([{
          id: state.profile.id,
          username: state.profile.username,
          coins: state.profile.coins,
          xp: state.profile.xp,
          level: state.profile.level,
          avatar_hat: state.profile.avatar_hat,
          avatar_body: state.profile.avatar_body,
          avatar_boots: state.profile.avatar_boots,
          updated_at: new Date().toISOString()
        }])
      });

      if (res.ok) {
        App.showToast("✨ Progresso sincronizado na nuvem!", "success");
        this.closeModal();
      } else {
        App.showToast("Erro na sincronização. Verifique se criou a tabela no SQL do Supabase.", "warning");
      }
    } catch (e) {
      App.showToast("Falha de rede ao conectar ao Supabase.", "warning");
    }
  }
};
