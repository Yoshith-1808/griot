# Devpost Submission Text: Griot

### Project Name
**Griot — The Conversational Memory Layer for Alexa+**

---

### Elevator Pitch (Under 150 Characters)
*Alexa forgets everything you tell her. Griot doesn't. Open-source episodic memory for Alexa+ powered by MCP, AWS Bedrock, and SQLite vectors.* (143 chars)

---

### Links
- **Video Demo Link**: https://drive.google.com/file/d/1Or1frai6zMkQnEFmd4RARAQ2DqcJpspr/view?usp=sharing
- **GitHub Repository**: https://github.com/Yoshith-1808/griot

---

### Inspiration
Every voice assistant user has experienced the frustration of episodic amnesia. You tell Alexa that your friend David is severely allergic to peanuts, or that your sister Maya loves handcrafted Japanese pottery. Ten minutes later, she has no idea. When you ask, *"What can we cook for dinner with David?"* or *"What birthday gift should I buy for Maya?"*, Alexa either searches generic web recipes or apologizes that she doesn't understand.

We built **Griot** (named after the West African oral historians and storytellers who preserved generational knowledge through spoken word) to give Alexa+ a real, persistent, episodic memory. We wanted an architecture that is private, open, auditable, and built on the open **Model Context Protocol (MCP)** and **AWS Bedrock**.

---

### What It Does
Griot provides a complete long-term conversational memory engine for Alexa+ through 5 core MCP tools and 1 proactive reflection tool:
1. **`remember`**: Chunks user thoughts, extracts people mentioned, creates Amazon Titan embeddings, and stores memories with full audit logging.
2. **`recall`**: Semantically searches past memories using cosine similarity with recency reranking, synthesizing a natural spoken answer tailored for voice.
3. **`know_about`**: Synthesizes a comprehensive profile of any person mentioned in your life, surfacing key facts and relationship history.
4. **`summarize_period`**: Synthesizes a 60-second spoken recap of everything that happened across your day, week, or month.
5. **`forget`**: Privacy-compliant soft deletion with an immutable audit log, supporting topic, person, or confirmed full purges.
6. **`reflect` (Bonus Tool)**: Proactively digests the day's events, surfacing themes and unresolved follow-ups.

It includes a full-screen, dark glassmorphic **Voice UI Demo Client** featuring a 60 FPS organic VoiceOrb that breathes when idle, pulses when listening, and speaks via browser SpeechSynthesis.

---

### How We Built It
- **MCP Server & Streamable HTTP**: Built with TypeScript and Express, implementing the Model Context Protocol (2025-11-25 spec) over `POST /mcp` and `GET /sse`.
- **AWS Bedrock Integration**:
  - `amazon.titan-embed-text-v2:0` for 1024-dimensional normalized text embeddings.
  - `anthropic.claude-sonnet-4-5-20250929-v1:0` for conversational spoken synthesis and profile extraction.
  - Resilience through `exponential-backoff` with full jitter handling throttling.
- **Embedded SQLite Vector Store**: High-performance binary BLOB vector storage in `better-sqlite3` with WAL mode and in-memory Float32Array cosine distance calculations (<5ms query time).
- **SQLite Embedding Cache**: Hashes content to eliminate duplicate Bedrock API calls.
- **Offline Demo Mode**: Fallback deterministic vector generator allowing judges to test 100% of the functionality without AWS credentials.
- **Voice UI Demo Client**: Next.js 15 App Router, HTML5 Canvas audio-reactive VoiceOrb, Web Speech API integration, and date-grouped memory timeline with person profile exploration.

---

### Challenges We Ran Into
- **Voice Turnaround Latency**: Voice conversations require sub-second turnarounds. We optimized prompt lengths, capped Claude output tokens to 150, and implemented SQLite vector caching to keep end-to-end response times snappy.
- **Persona Conditioning**: Foundation models naturally emit markdown headers and bullet points. We engineered specialized system prompts that condition Claude to speak directly and conversationally as Alexa.
- **Bedrock Throttling in Batch Operations**: Rapidly seeding 30 days of memories triggered rate limits. We resolved this by combining exponential backoff retries with local content hashing.
- **Cross-Platform Compatibility**: Ensuring Node.js v22/v24 compatibility across Windows, macOS, and Linux containers required careful dependency alignment for native database drivers.

---

### Accomplishments That We're Proud Of
- **100% Unit Test Pass Rate**: Built comprehensive Vitest test suites (18 tests across 6 tools: happy path, edge case, and error case) with zero lint errors in Biome.
- **Zero-Config Judging**: Evaluators can run the entire system in one command locally with or without AWS keys.
- **Strict Architecture Compliance**: Followed the Model Context Protocol specification strictly so Griot can be connected not just to Alexa+, but also Claude Desktop, Cursor, or any MCP client.
- **Polished Aesthetics**: Designed a voice UI that feels like a real consumer product rather than a rough hackathon demo.

---

### What We Learned
- How the Model Context Protocol fundamentally changes voice interface design by decoupling memory retrieval from conversational reasoning.
- How to tune Amazon Titan Embeddings v2 with recency-weighted cosine distance to balance semantic relevance with temporal proximity.
- Best practices for least-privilege IAM policies and audit logging in conversational AI systems.

---

### What's Next for Griot
- **Audio Fingerprinting**: Recognize different family members' voices and maintain separate, multi-tenant memory spaces.
- **Proactive Alexa Routine Triggers**: Use the `reflect` tool to trigger morning Alexa voice briefings when important follow-ups are detected.
- **Hardware Deployment**: Package Griot into an AWS Lambda Serverless or AWS App Runner container with Amazon RDS / DynamoDB backends.

---

### Built With (Tags)
`aws-bedrock`, `claude-sonnet-4-5`, `titan-embeddings`, `model-context-protocol`, `mcp`, `alexa`, `nextjs`, `typescript`, `sqlite`, `vector-search`, `pino`, `zod`, `vitest`, `biome`, `tailwind`
