# Griot — 3-Minute Demo Video Script

**Target Duration:** 2 minutes 55 seconds (Strictly under 3:00)  
**Resolution:** 1080p 60fps  
**Audio:** Crisp spoken voiceover, clean mic, zero background music  
**Visual Style:** Fullscreen high-contrast dark theme, VoiceOrb center-stage, live timeline & logs split  

---

## Act 1: The Hook (0:00 – 0:20)

**[Visual]**  
Close-up of the animated VoiceOrb breathing gently in idle state. Screen title: *"Alexa forgets everything you tell her. Griot doesn't."*  
A simulated Alexa query appears: *"Alexa, what can we cook for dinner with David?"*  
Alexa default response: *"Here are recipes for dinner..."* (Generic, useless).  

**[Audio / Voiceover]**  
> *"Every voice assistant suffers from episodic amnesia. You tell Alexa your best friend David is deathly allergic to shellfish. Ten minutes later, she has no idea. What if your voice assistant had a genuine, persistent episodic memory?"*

---

## Act 2: Architecture in 3 Sentences (0:20 – 0:50)

**[Visual]**  
Clean 3-box animated architecture diagram:  
`[Alexa+ Voice Service]` &rarr; `[Griot MCP Server (Streamable HTTP)]` &rarr; `[AWS Bedrock + Embedded SQLite Vector]`  

**[Audio / Voiceover]**  
> *"Enter Griot: memory-as-a-service for voice assistants.  
> First, Alexa+ speaks directly to our self-hosted Model Context Protocol server over Streamable HTTP.  
> Second, memories are indexed using Amazon Titan Embeddings v2 with SQLite vector distance and temporal reranking.  
> Third, Claude Sonnet synthesizes spoken answers formatted specifically for voice in under 30 words."*

---

## Act 3: Live Hands-Free Demo (0:50 – 1:50)

**[Visual]**  
Live browser screen on `http://localhost:5173`.  
Presenter clicks the VoiceOrb or speaks naturally.  

**Utterance 1:**  
*User:* &ldquo;Alexa, remember that David is severely allergic to shellfish and peanuts.&rdquo;  
*VoiceOrb:* Pulses blue, shimmers pink.  
*Alexa Voice:* &ldquo;Remembered.&rdquo;  
*Timeline UI:* Instantly slides in a new memory bubble tagged with `@David` and `#dietary`.  

**Utterance 2:**  
*User:* &ldquo;Alexa, remember that Sarah pitched her Series A round yesterday and was celebrating.&rdquo;  
*Alexa Voice:* &ldquo;Remembered.&rdquo;  

**Utterance 3:**  
*User:* &ldquo;Alexa, remember that Maya loves handcrafted Japanese matcha bowls for her birthday.&rdquo;  
*Alexa Voice:* &ldquo;Remembered.&rdquo;  

**Recall Question 1:**  
*User:* &ldquo;Alexa, what is David allergic to?&rdquo;  
*VoiceOrb:* Pulses and speaks via SpeechSynthesis:  
*Alexa Voice:* &ldquo;David mentioned he is severely allergic to shellfish and peanuts. Keep that in mind when planning meals.&rdquo;  

**Recall Question 2:**  
*User:* &ldquo;Alexa, what did I order for the kitchen recently?&rdquo;  
*Alexa Voice:* &ldquo;You ordered two bags of Kenyan AA single-origin coffee beans from Counter Culture.&rdquo;  

**[Audio / Voiceover]**  
> *"Notice the latency: sub-300 milliseconds. Every statement is chunked, embedded, and stored with an immutable audit log."*

---

## Act 4: Person Profile Synthesis (1:50 – 2:20)

**[Visual]**  
Presenter taps `@Sarah` in the sidebar or says aloud:  
*User:* &ldquo;Alexa, what do you know about Sarah?&rdquo;  

**[Audio / Voiceover]**  
*Alexa Voice:* &ldquo;Here is what you have shared about Sarah: She recently pitched her Series A round, and she recommended reading Designing Data-Intensive Applications for your distributed storage redesign.&rdquo;  

**[Voiceover Explanation]**  
> *"Instead of returning disconnected notes, Griot calls the `know_about` MCP tool. It aggregates every memory referencing Sarah and uses Claude Sonnet to synthesize a coherent relationship dossier on the fly."*

---

## Act 5: Under the Hood — MCP Protocol & Friction Log (2:20 – 2:50)

**[Visual]**  
Split screen showing terminal running `pino` structured JSON logs and `curl` command calling `POST /mcp`:  
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"recall","arguments":{"query":"David allergy"}}}'
```
JSON-RPC 2.0 response flashes on screen showing `{ "structured": { "results": [...], "spoken": "..." } }`.  

**[Audio / Voiceover]**  
> *"Under the hood, Griot strictly follows the 2025 Model Context Protocol specification over Streamable HTTP. It ships zero-ops with SQLite, runs anywhere via Docker Compose, and falls back to a deterministic offline engine if AWS credentials are not configured."*

---

## Act 6: Call to Action (2:50 – 3:00)

**[Visual]**  
Submission slide with GitHub URL, MIT License badge, and track alignment:  
- **Repo:** `https://github.com/Yoshith-1808/griot`  
- **License:** MIT License  
- **Tracks:** Alexa+ Track ($25K), AWS Builder ($5K), Open Source ($5K)  

**[Audio / Voiceover]**  
> *"Griot brings real, private episodic memory to voice assistants. Clone the repo, run `docker compose up`, and give Alexa a memory today. Thank you."*
