# Brisa Norte — Assistente e Calculadora (Webflow Cloud)

Parte em código do projeto **Smart Web Experience** (UniFECAF · Padrões Web para No-Code e Low-Code).

- **Página principal (no-code):** feita no Webflow Designer → `https://brisa-norte-climatizacao.webflow.io`
- **Este app (low-code):** HTML, CSS e JavaScript puros, hospedados no **Webflow Cloud** no mesmo endereço → `https://brisa-norte-climatizacao.webflow.io/assistente/`

> A Brisa Norte Climatização é uma empresa fictícia, criada para o trabalho acadêmico.

## O que tem aqui

| Arquivo | Função |
| --- | --- |
| `index.html` | Estrutura semântica: menu, calculadora de BTUs, assistente com IA, transparência sobre o uso de IA |
| `styles.css` | Design tokens (mesmas cores e fontes da página do Webflow), layout responsivo com *container queries*, foco visível, `prefers-reduced-motion` |
| `app.js` | Menu do celular, cálculo de BTUs em tempo real, envio para a IA com `fetch()`, tempo-limite, validação do JSON e plano B local |
| `404.html` | Página de erro autocontida |
| `favicon.svg` | Ícone |

Não há framework, dependências nem etapa de build: o que está no repositório é o que vai ao ar.

## Recurso inteligente

```
Formulário (app.js) → Webhook do Make → Google Gemini → JSON → resultado na tela → WhatsApp
                          └→ Google Sheets (registro do pedido)
Sem resposta em 25 s → classificador local por palavras-chave
```

Para ligar a IA, troque `COLE_AQUI_A_URL_DO_WEBHOOK_DO_MAKE` em `app.js` (constante `CONFIG.WEBHOOK_URL`) pela URL do webhook do Make.

## Publicação

Cada `push` na branch `main` gera um deploy automático no Webflow Cloud, no caminho `/assistente`.

Para testar localmente:

```bash
python3 -m http.server 4321
# abra http://localhost:4321
```
