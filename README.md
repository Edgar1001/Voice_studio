# Voice Studio — Custom Voice Cloning with a Custom-Built LLM

Voice Studio is an experimental application designed to clone and synthesize voices using a custom-built Large Language Model (LLM) pipeline**, enabling generation of natural voice output from text while preserving a target speaker’s characteristics.

This project explores how modern AI systems can combine:
- **Voice feature extraction**
- **Speech synthesis**
- **LLM-based text understanding**
- And **custom voice adaptation**

> Disclaimer: This project is for research, educational, and experimental purposes. Please use responsibly and only with explicit permission from the voice owner.

---

## Features

-  **Voice Cloning / Speaker Adaptation**
-  **Text-to-Speech Generation**
-  **Custom-built LLM integration** for prompt processing, dialogue, and voice consistency
-  Upload voice samples for reference cloning
-  Configurable inference settings (e.g., temperature, speed, pitch)
-  Designed for extension into a full "Voice Studio" product

---

##  How It Works (High-Level)

1. **Voice Sample Input**
   - You provide a short recording of the target voice.
2. **Speaker Embedding / Feature Extraction**
   - The system extracts the speaker’s unique vocal style.
3. **Custom LLM Processing**
   - Your text prompt is processed using a custom build of an LLM to improve consistency and control.
4. **Synthesis**
   - The synthesized speech is produced to mimic the voice while keeping the text semantics intact.

---

## Tech Stack

This repository includes:
- **Next.js / React** UI (for voice studio interface)
- **Node.js backend**
- **Custom LLM service**
- **Python / FastAPI** services for model inference (depending on setup)

---
