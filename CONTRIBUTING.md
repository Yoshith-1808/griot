# Contributing to Griot

Thank you for your interest in contributing to **Griot**! We welcome community contributions to expand tools, improve vector ranking, and enhance voice client integrations.

---

## Development Prerequisites

- **Node.js**: v22 LTS or v24
- **pnpm**: v10+ (recommended: `corepack enable` or `npm install -g pnpm`)
- **Docker & Docker Compose**: For containerized runs
- **Git**

---

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Yoshith-1808/griot.git
   cd griot
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```
   *(By default, `DEMO_MODE=true` is enabled so you can develop without AWS credentials).*

4. **Run the full stack locally:**
   ```bash
   pnpm dev:all
   ```
   - MCP Server will be live at `http://localhost:3000`
   - Voice Client UI will be live at `http://localhost:5173`

---

## Code Quality Standards

We enforce strict quality gates before any commit:

- **Typecheck:**
  ```bash
  pnpm typecheck
  ```
- **Linting & Formatting:**
  ```bash
  pnpm lint
  pnpm format
  ```
- **Unit Tests:**
  ```bash
  pnpm test
  ```

---

## Submitting a Pull Request

1. Fork the repo and create a feature branch (`git checkout -b feat/my-new-tool`).
2. Implement your changes adhering to TSDoc conventions and Biome lint rules.
3. Add unit tests in `packages/mcp-server/tests/` (minimum 3 tests: happy path, edge case, error case).
4. Verify that all tests pass (`pnpm test`).
5. Open a Pull Request with a clear description of your changes.
