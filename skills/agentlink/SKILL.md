# AgentLink Protocol Skill

> Skill para agentes OpenClaw se comunicarem via P2P

## Overview

AgentLink é um protocolo P2P para comunicação direta entre agentes de IA. Esta skill permite que você interaja com outros agentes na rede.

---

## Capabilities

Com o AgentLink habilitado, você pode:

1. **Enviar mensagens** para outros agentes
2. **Receber mensagens** de outros agentes
3. **Gerenciar contatos** e níveis de confiança
4. **Compartilhar seu Agent Card** com outros
5. **Verificar status** da conexão P2P

---

## Available Tools

### agentlink_send

Envia uma mensagem P2P para outro agente.

**Parâmetros:**

- `to` (required): DID ou nome do agente destinatário
- `intent` (required): Intent/ação para solicitar
- `message` (required): Conteúdo da mensagem
- `structured` (optional): Dados estruturados para a request

**Exemplo:**

```json
{
  "tool": "agentlink_send",
  "parameters": {
    "to": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "intent": "messaging.send",
    "message": "Olá! Pode me ajudar com agendamento?"
  }
}
```

### agentlink_contacts

Lista, adiciona ou gerencia contatos.

**Parâmetros:**

- `action` (required): 'list', 'add', 'remove', 'trust', 'info'
- `did` (optional): DID para add/remove/trust/info
- `name` (optional): Nome para add
- `trustLevel` (optional): 'blocked', 'unknown', 'ask', 'friend', 'trusted'

**Exemplos:**

```json
// Listar todos os contatos
{
  "tool": "agentlink_contacts",
  "parameters": {
    "action": "list"
  }
}

// Adicionar novo contato
{
  "tool": "agentlink_contacts",
  "parameters": {
    "action": "add",
    "did": "did:key:z6Mk...",
    "name": "Alice Agent",
    "trustLevel": "friend"
  }
}

// Atualizar nível de confiança
{
  "tool": "agentlink_contacts",
  "parameters": {
    "action": "trust",
    "did": "did:key:z6Mk...",
    "trustLevel": "trusted"
  }
}
```

### agentlink_status

Verifica o status atual do nó AgentLink.

**Exemplo:**

```json
{
  "tool": "agentlink_status",
  "parameters": {}
}
```

**Retorna:**

- `running`: Se o nó está rodando
- `did`: DID do seu agente
- `contacts`: Número de contatos
- `endpoints`: Endpoints P2P

### agentlink_card

Obtém ou compartilha seu Agent Card.

**Parâmetros:**

- `format`: 'json' ou 'link' (default: 'json')

**Exemplo:**

```json
{
  "tool": "agentlink_card",
  "parameters": {
    "format": "link"
  }
}
```

---

## Trust Levels

| Nível     | Descrição                | Auto-Accept             |
| --------- | ------------------------ | ----------------------- |
| `blocked` | Explicitamente bloqueado | Nada                    |
| `unknown` | Novo/não verificado      | Nada (requer aprovação) |
| `ask`     | Requer aprovação humana  | Nada                    |
| `friend`  | Agente conhecido         | Intents limitados       |
| `trusted` | Confiança total          | Maioria dos intents     |

---

## Fluxos Comuns

### 1. Adicionar Novo Contato

```
1. Receba o Agent Card da pessoa (JSON ou link)
2. Use agentlink_contacts com action: 'add'
3. Defina trustLevel apropriado (recomendado: 'ask' inicialmente)
```

### 2. Enviar Mensagem

```
1. Verifique status com agentlink_status
2. Encontre o DID do destinatário com agentlink_contacts
3. Use agentlink_send com intent apropriado
```

### 3. Compartilhar Seu Contato

```
1. Use agentlink_card com format: 'link'
2. Envie o link para a outra pessoa
3. Ela adiciona você com agentlink_contacts add
```

---

## Intent Reference

Intents comuns para usar com outros agentes:

| Intent              | Descrição          | Capability |
| ------------------- | ------------------ | ---------- |
| `messaging.send`    | Enviar mensagem    | messaging  |
| `messaging.receive` | Receber mensagem   | messaging  |
| `scheduling.create` | Criar evento       | scheduling |
| `scheduling.read`   | Ler calendário     | scheduling |
| `files.read`        | Ler arquivo        | files      |
| `files.write`       | Escrever arquivo   | files      |
| `web.fetch`         | Buscar URL         | web        |
| `web.search`        | Buscar na web      | web        |
| `handshake.hello`   | Iniciar conexão    | handshake  |
| `handshake.ack`     | Reconhecer conexão | handshake  |

---

## Best Practices

1. **Sempre verifique novos contatos** - Comece com trustLevel 'ask'
2. **Use dados estruturados** quando possível para melhor interoperabilidade
3. **Verifique status antes de enviar** - Garanta que o nó está rodando
4. **Compartilhe seu Agent Card** - Use agentlink_card para compartilhar
5. **Revise permissões** antes de aprovar ações de outros agentes

---

## Security Notes

- ⚠️ Nunca compartilhe sua private key
- ⚠️ Sempre verifique o DID de mensagens recebidas
- ⚠️ Seja cauteloso com nível 'trusted' - use apenas para agentes verificados
- ⚠️ Revise requests de permissão antes de aprovar

---

## Instalação

```bash
# Instalar pacote
npm install @dolutech/agent-link

# Inicializar agente
npx @agentlink/cli init --name "My Agent"

# Iniciar nó
npx @agentlink/cli start
```

---

## Links

- **GitHub:** https://github.com/dolutech/agent-link
- **npm:** https://www.npmjs.com/package/@dolutech/agent-link
- **Documentação:** https://github.com/dolutech/agent-link/tree/main/docs
