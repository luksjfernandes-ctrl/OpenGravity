---
name: gog
description: Integração do Agente com os serviços Google Workspace (Gmail, Calendar, Drive, Docs, Sheets, Contacts) usando a ferramenta CLI gog.
---

# Skill: gog (Google Operations)

## Avaliação de Segurança e Restrições (Protocolo ISS)

- **Permissões Críticas:** Esta skill age com total privilégio de leitura e escrita sobre as contas Google do usuário.
- **Leitura (Safe):** Todos os comandos de extração de dados (ex: `search`, `list`, `get`, `cat`, `metadata`) podem ser realizados pelo agente de forma autônoma durante seu ciclo de pensamento.
- **Mutação (High Risk):** Todos os comandos que alteram estado ou enviam dados a terceiros (ex: `send`, `create`, `update`, `append`, `clear`) **SÃO ESTRITAMENTE OBRIGADOS** a ter uma etapa de confirmação do usuário. O agente deve exibir o comando ou os dados e perguntar: *"Confirma o envio/ação?"* antes de disparar a execução de mutação no terminal.
- Sempre tente usar a flag `--json` quando disponível e processar os resultados localmente de forma silenciosa e limpa.

## Setup e Autenticação (Ação do Usuário)

O usuário deve rodar uma vez no seu terminal local:
1. `gog auth credentials /path/to/client_secret.json`
2. `gog auth add lucas@gmail.com --services gmail,calendar,drive,contacts,docs,sheets`
*Variável de ambiente recomendada para o `.env`: `GOG_ACCOUNT=lucas@gmail.com` para evitar repetir `--account`.*

## Referência Rápida de Comandos CLI (Use run_command para executá-los)

### Gmail
- Buscar (por thread): `gog gmail search 'newer_than:7d' --max 10`
- Buscar (por mensagens isoladas): `gog gmail messages search "in:inbox from:ryanair.com" --max 20 --account you@example.com`
- Enviar (Simples): `gog gmail send --to a@b.com --subject "Hi" --body "Hello"`
- Enviar (Multi-linha): Crie um arquivo txt em `/tmp` com `write_to_file` e rode `gog gmail send --to a@b.com --subject "Hi" --body-file /tmp/msg.txt`
- Enviar (Rich HTML): `gog gmail send --to a@b.com --subject "Hi" --body-html "<p>Hello</p>"`
- Responder: `gog gmail send --to a@b.com --subject "Re: Hi" --body "Reply" --reply-to-message-id <msgId>`
- Rascunhos: `gog gmail drafts create ...` e `gog gmail drafts send <draftId>`

*Nota de formatação:* Prefira texto puro com `--body-file` para mensagens com múltiplos parágrafos. Use `--body-html` com moderação e tags estruturadas (<p>, <ul>, <li>, <strong>, <br>).

### Google Calendar
- Listar Eventos: `gog calendar events <calendarId> --from <iso> --to <iso>`
- Criar Evento: `gog calendar create <calendarId> --summary "Title" --from <iso> --to <iso>`
- Cores de Eventos disponíveis `(1-11)`: Liste usando `gog calendar colors`. Adicione com a flag `--event-color <id>`. Ex: 1(Azul Lavanda), 5(Amarelo), 11(Vermelho).

### Google Drive & Docs/Sheets
- Buscar Arquivos: `gog drive search "query" --max 10`
- Contatos: `gog contacts list --max 20`
- Ler Sheets: `gog sheets get <sheetId> "Tab!A1:D10" --json`
- Atualizar Sheets: `gog sheets update <sheetId> "Tab!A1:B2" --values-json '[["A","B"],["1","2"]]' --input USER_ENTERED`
- Inserir Linhas (Append): `gog sheets append <sheetId> "Tab!A:C" --values-json '[["x","y","z"]]' --insert INSERT_ROWS`
- Limpar Células: `gog sheets clear <sheetId> "Tab!A2:Z"`
- Docs Ler texto: `gog docs cat <docId>`
- Docs Exportar: `gog docs export <docId> --format txt --out /tmp/doc.txt`

## Diretrizes do Agente
- Ao invocar o Terminal (Bash), não presuma que informações grandes cheguem perfeitas via string de aspas. Prefira gerar arquivos `.txt` e apontá-los no comando, especialmente para envios de emails complexos.
- Confirme SEMPRE os dados críticos (To, Subject, Body, Timestamp) do email ou evento antes de confirmar a execução.
