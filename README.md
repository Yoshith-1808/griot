# Griot — The Conversational Memory Layer for Alexa+

> **Persistent, voice-first episodic memory for Alexa+ powered by the Model Context Protocol, AWS Bedrock, and SQLite vectors.**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--11--25-green.svg)](https://modelcontextprotocol.io)
[![AWS Bedrock](https://img.shields.io/badge/AWS%20Bedrock-Claude%20%26%20Titan-orange.svg)](https://aws.amazon.com/bedrock/)
[![Demo Video](https://img.shields.io/badge/Demo%20Video-Google%20Drive-red.svg)](https://drive.google.com/file/d/1Or1frai6zMkQnEFmd4RARAQ2DqcJpspr/view?usp=sharing)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)](https://nodejs.org/)

---

## 🎯 What is Griot?

Voice assistants suffer from **episodic amnesia**. When you tell Alexa that your friend David is allergic to peanuts, she forgets minutes later. When you ask *"What can I cook for dinner with David?"*, she offers generic search results.

**Griot** (named after the revered West African oral historians who preserved tribal memory across generations) solves this by providing a self-hosted **Model Context Protocol (MCP)** server with:
- **Instant Spoken Recall**: Sub-250ms voice answers synthesized by **Claude Sonnet 4.5**.
- **1024-dimensional Semantic Search**: Embedded via **Amazon Titan Embeddings v2**.
- **Temporal Reranking**: Balances semantic similarity with recency decay so recent memories rank higher.
- **Zero-Ops SQLite Vector Store**: Embedded vector search shipping right inside Docker.
- **Immutable Audit Trails**: Full compliance logging for every memory created, searched, or forgotten.

---

## 📹 Demo Video

Watch the hands-free conversational demonstration of Griot with the VoiceOrb client and MCP server:  
▶️ **[Watch the Live Demo Video on Google Drive](https://drive.google.com/file/d/1Or1frai6zMkQnEFmd4RARAQ2DqcJpspr/view?usp=sharing)**

---

## ⚡ Quickstart (3 Commands)

Run the complete stack with a single command using Docker:

```bash
git clone https://github.com/Yoshith-1808/griot.git
cd griot
docker compose up
```

Or run locally with `pnpm`:

```bash
pnpm install
pnpm dev:all
```

- 🎙️ **Voice UI Demo Client**: [http://localhost:5173](http://localhost:5173)
- 📡 **Griot MCP Server**: [http://localhost:3000/mcp](http://localhost:3000/mcp)
- 🩺 **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

*(Griot runs in zero-config **DEMO_MODE** by default if AWS credentials are not set).*

---

## 🏗️ Architecture

```
[ User Voice ] ──> [ Web Speech API ] ──> [ VoiceOrb UI (Port 5173) ]
                                                   │
                                     Streamable HTTP (JSON-RPC 2.0)
                                                   ▼
                                      [ Griot MCP Server (Port 3000) ]
                                                   │
                  ┌────────────────────────────────┴──────────────────────────────┐
                  ▼                                                               ▼
        [ AWS Bedrock Runtime ]                                      [ SQLite Vector Store (WAL) ]
   • Titan Embeddings v2 (1024d)                                  • memories & memory_chunks
   • Claude Sonnet 4.5 (Voice Mode)                               • embeddings_cache (SHA-256)
   • Exponential Backoff & Jitter                                 • people & audit_logs
```

---

## 🛠️ MCP Tool Reference

Griot exposes 5 core voice-optimized MCP tools + 1 bonus proactive tool:

| Tool | Parameters | Behavior | Spoken Voice Output |
| :--- | :--- | :--- | :--- |
| **`remember`** | `content`, `tags?`, `people?`, `occurred_at?` | Chunks text, creates Titan v2 vectors, indexes person entities, logs audit. | *"Remembered."* |
| **`recall`** | `query`, `limit?`, `person?`, `since?` | Vector similarity search + recency reranking via Claude Sonnet. | Direct spoken answer under 30 words. |
| **`know_about`** | `person` | Aggregates all memories mentioning a person and synthesizes a spoken dossier. | Concise relationship profile. |
| **`summarize_period`** | `period: "day" \| "week" \| "month"` | Fetches all memories in window and generates a spoken narrative. | 45-word period highlight narrative. |
| **`forget`** | `query?`, `person?`, `all?` | Privacy-compliant soft deletion with permanent audit record. | Removal confirmation message. |
| **`reflect`** | `date?` | Proactively analyzes the day's memories to surface themes & follow-up questions. | Thoughtful reflection briefing. |

### Verifying with `curl` (Streamable HTTP)

**Semantic Recall Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "recall",
      "arguments": {
        "query": "What is David allergic to?"
      }
    }
  }'
```

---

## 🔑 AWS Bedrock Setup & Least-Privilege IAM

To enable real AWS Bedrock calls, create a `.env` file with your credentials:

```ini
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0
BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0
DEMO_MODE=false
```

### Least-Privilege IAM Policy

Attach this policy to your IAM user or execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GriotBedrockInvokeAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
      ]
    }
  ]
}
```

---

## 🧪 Testing & Code Quality

```bash
# Run unit tests across all tools (18/18 tests)
pnpm test

# Typecheck whole monorepo
pnpm typecheck

# Lint with Biome
pnpm lint
```

---

## 📄 License

MIT © 2026 Griot Contributors. See [LICENSE](LICENSE) for details.
