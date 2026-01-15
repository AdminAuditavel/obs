<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1bFb5eP3mJw8qnw87VjiTabl4Km0LrelV

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
   `npm run dev`

## 🚀 CI/CD & Deploy

O projeto conta com automação via **GitHub Actions** para build e deploy.

### Configuração de Secrets (GitHub)

Para que o deploy funcione, configure os seguintes **Repository Secrets** no GitHub (`Settings > Secrets and variables > Actions`):

| Secret | Valor (Exemplo/Origem) |
| :--- | :--- |
| `VERCEL_TOKEN` | Gere em [Vercel Account Settings](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `team_DvISex1X0v4j3HuXWo6zE4sj` |
| `VERCEL_PROJECT_ID` | `prj_z4rnx03t0EUqe6Tlgh87emtiIVyD` |
| `VITE_SUPABASE_URL` | Sua URL do Supabase (ex: `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY`| Sua chave `anon public` do Supabase |

> **Nota:** Os IDs da Vercel acima foram extraídos do projeto atual. Se recriar o projeto na Vercel, eles mudarão.

### Workflows
*   **Pull Request:** Roda instalação e Check de Build.
*   **Push na Main:** Roda Build e **Deploy automático** para Vercel Production.
