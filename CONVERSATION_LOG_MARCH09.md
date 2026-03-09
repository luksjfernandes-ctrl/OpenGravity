# Histórico da Sessão: Estabilização e Evolução do OpenGravity

**Data:** 08-09 de Março de 2026

## 1. Migração do Hugging Face Spaces para Render.com
O deploy inicial no Hugging Face (free tier Docker) apresentava erros de runtime (`curl: (6) Could not resolve host: huggingface.co`) e timeouts de rede, tornando o Webhook do Telegram e as chamadas externas (Groq, ElevenLabs, Firebase) instáveis e não responsivas.

**Solução:**
- Migração para o **Render.com** (plataforma com network outbound funcional no free tier).
- Ajuste no `index.ts` para capturar a variável `RENDER_EXTERNAL_URL` automaticamente para o webhook.
- Correção no `db.ts` para verificar a existência do arquivo de chave do Firebase antes de tentar lê-lo, evitando crashes na cloud.
- Criação e envio do repositório para o GitHub (privado) para deploy via integração GitHub-Render.

## 2. Refatoração do Webhook (Assíncrono)
Para evitar timeouts de rede ao responder requisições do Telegram (pelo fato de chamadas a LMMs levarem certo tempo):
- Alterado o payload do webhook (`/webhook`) para responder um HTTP 200 OK imediatamente.
- O processamento real da mensagem é agora "fire-and-forget", executado em background usando `bot.handleUpdate()`.

## 3. Substituição do ElevenLabs por Edge TTS (Voice Messages Gratuitas)
Dadas as limitações e bloqueios por uso na camada gratuita do ElevenLabs:
- Substituído pelo pacote `msedge-tts` que contata a API interna do Microsoft Edge.
- A voz padrão passou a ser brasileira nativa (`pt-BR-AntonioNeural`), ilimitada e gratuita, retornando um buffer MP3 sem necessidade de credenciais.

## 4. Skills de Browser Automation (Playwright Headless)
Instalado o `playwright-core` usando o Chromium instalado no container Docker (no Alpine) para buscar informações na Internet:
- `search_web`: Pesquisa com interface custom no Google via Playwright.
- `browse_url`: Acessa uma URL, remove scripts e tags desnecessárias e trunca o conteúdo até as primeiras 6k letras, enviando texto limpo para o modelo.
- `browser_click`: Clica em elementos.
- `browser_type`: Digita textos em inputs.
- `browser_snapshot`: Relê a página atual.
- `browser_close`: Libera recursos fechando a página virtual.

## 5. Gerenciamento de Tarefas (Firebase Tasks)
Adicionada uma série de "skills/tools" que conectam ao banco Firestore já configurado permitindo produtividade:
- `create_task`: Salva titulo, descrição, prazo (opcional) e prioridade.
- `list_tasks`: Lista formatando as saídas com emojis de urgência.
- `complete_task`: Marca tarefas como prontas com busca por id ou titulo aproximado.
- `delete_task`: Apaga tarefas.

## 6. Motor Dinâmico de Skills (Markdown)
Para flexibilizar o Agent e dar diretrizes profundas sem alterar código nativo:
- Criado o `SkillLoader.ts` e uma pasta `src/skills/` que lê `.md`s dinâmicos.
- `write-technical-blog-post.md`: Orientações profundas de como construir pesquisas e gerar textos técnicos.
- `deep-research.md`: Passo a passo definindo que o bot quebre grandes temas em perguntas e faça pesquisas em múltiplas fontes para construir uma resposta altamente fundamentada.

## 7. Correções de Resiliência e Cold-Start
Para lidar com a instabilidade do free tier e limitações de APIs terceiras:
- **Keep-Alive**: Ping interno agendado a cada 10min para manter o container do Render.com ativo na madrugada.
- **Fila de Mensagens no Cold Start**: Webhooks que chegam antes do Bot e Firestore estarem prontos são agora internalizados em um queue seguro (`pendingUpdates`) para processamento posterior.
- **Parse do Histórico Resiliente**: Evita crashes do ciclo de Agente caso o Groq retorne arrays corrompidos de `tool_calls`.
- **Retry Backoff para Groq API**: Recuo exponencial de 3 tentativas para lidar com erros transitórios (429 e 5xx).

## 8. Integração Google APIs (OAuth2)
Implementadas 12 novas ferramentas baseadas em tokens de refresh para acessar informações pessoais do usuário sem expor senhas:
- **Gmail**: listagem, busca, leitura e envio de e-mails (`list_emails`, `read_email`, `send_email`, `search_emails`).
- **Calendar**: listagem, criação e remoção de eventos na agenda primária (`list_events`, `create_event`, `delete_event`).
- **Drive e Docs**: busca semântica livre e capacidade de listar/ler todos os formatos nativos e PDFs, mais a criação nativa de Documentos baseados em IA.

## 9. Acesso Universal via Composio
Configurado o Tool Router da plataforma **Composio (1000+ Connectors)**:
- `composio_find_action`: Busca semântica (ex: "Criar task no Jira", "Notificar no Slack").
- `composio_execute`: Disparo multi-plataforma padronizado em todo o sistema.

## 10. Protocolo de Confirmação e Expansão de Skills
Visando proteger a vida digital do usuário (prevenindo ações destrutivas indesejadas pelo bot autônomo), foi adicionada uma **Camada de Confirmação Two-Step**:
- Todas as ações mutáveis pesadas (`send_email`, `create_event`, `delete_event`, `delete_task`, `create_google_doc`, e `composio_execute`) retornam primeiro um Preview detalhado ao LLM, forçando a solicitação de permissão expressa ("Posso prosseguir?") antes da execução real com a flag interna `confirmed: true`.

Novas **Skills** de contexto foram absorvidas pelo motor (lidas de arquivos Markdown no `src/skills/`):
- `security-review.md`: Diretrizes ativas de cybersegurança (OWASP, Input validation).
- `pdf-handling.md`: Diretrizes estruturais de leitura de PDFs complexos.
- `instituto-apolineo-branding.md`: Estética/arquétipos de design de luxo e linguagem.
- `apolineo-content-creation.md`: Metodologias exatas de geração de carrosséis e posts.
