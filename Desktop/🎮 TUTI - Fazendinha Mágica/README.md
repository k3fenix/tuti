# 🌾 TUTI - Fazendinha Mágica ✨

> Jogo infantil 2D de fazendinha com fases de plataforma (run & jump), economia de moedas, cultivo em grid 6x6, curral com animais, customização de roupas e persistência em Supabase / Deploy Vercel.

---

## 🚀 Arquivos Prontos no Projeto

| Arquivo | Descrição |
| :--- | :--- |
| **`index.html`** | Jogo completo funcional com as **8 Telas**, HUD e controles de toque/desktop. |
| **`style.css`** | Design System cartoon realista estilo Pixar/Ghibli, animações suaves e responsivo. |
| **`game-engine.js`** | Motor de plataforma Canvas 2D com física (AABB), parallax em 3 camadas, 5 fases e power-ups. |
| **`farm.js`** | Lógica da horta (grid 6x6, 6 plantas, ciclos de crescimento, rega, adubo e colheita). |
| **`animals.js`** | Sistema do curral (Galinha, Vaca, Ovelha, Cavalo) com fome, sede, carinho e produção diária. |
| **`shop.js`** | Boutique com 22+ itens (roupas, calçados e ferramentas) e provador ao vivo no personagem. |
| **`achievements.js`** | Sistema de troféus, conquistas e contadores de perfil. |
| **`audio.js`** | Efeitos sonoros sintetizados nativos via Web Audio API. |
| **`supabase.js`** | Conector REST para salvar e sincronizar o progresso na nuvem em tempo real. |
| **`supabase_schema.sql`** | Script SQL completo com tabelas, RLS, trigger automático e Realtime habilitado. |
| **`zustand_schema.ts`** | Schema e Stores Zustand com TypeScript para quem preferir rodar com Next.js 14. |
| **`manifest.json`** | Manifesto PWA pronto para instalar no celular/desktop. |
| **`package.json`** | Configuração para deploy na Vercel ou Netlify. |

---

## 🛠️ Como Testar Agora Mesmo

1. **Jogar no Navegador**:
   - Dê um duplo clique no arquivo [`index.html`](file:///c:/Users/Luciano/Desktop/🎮 TUTI - Fazendinha Mágica/index.html).
   - O jogo carrega instantaneamente, com áudio nativo e controles na tela ou teclado (`A`/`D` para andar e `Espaço` para pular).

2. **Ativar o Supabase Cloud**:
   - Abra seu painel no [Supabase](https://supabase.com).
   - Vá em **SQL Editor** e cole o conteúdo de [`supabase_schema.sql`](file:///c:/Users/Luciano/Desktop/🎮 TUTI - Fazendinha Mágica/supabase_schema.sql).
   - Clique em **Run**.
   - No jogo, clique no botão de nuvem ☁️ no topo, insira sua **URL** e **Anon Key** para sincronizar em tempo real!

3. **Deploy na Vercel**:
   - Basta subir esta pasta no seu GitHub e importar o repositório na [Vercel](https://vercel.com) com 1 clique (deploy estático automático).
