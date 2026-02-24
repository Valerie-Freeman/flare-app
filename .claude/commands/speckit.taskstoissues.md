---
description: Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature based on available design artifacts. Issues are enriched with learning context derived from the developer's personal learning goals.
tools: ['github/github-mcp-server/issue_write']
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. From the executed script, extract the path to **tasks**.
1. Read the developer's learning goals from `~/.claude/CLAUDE.md`. Parse the **Active Learning Goals** section to identify what the developer is currently learning, what they already know, and what they want to prioritize. Hold this context for use in Learning Tier classification and Key Concepts mapping.
1. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL

1. For each task in the list, use the GitHub MCP server to create a new issue in the repository that is representative of the Git remote.

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL

## Issue Generation Rules

**CRITICAL**: Issues must have the feature name as the milestone and the User Story field must be populated with the User Story number that the task relates to.

Issues must be written for readability for the developer. The developer needs to know what will be implemented and why. Do not exceed ~800 words per issue. If a task requires more, it should be split.

Code snippets in issues should be illustrative (showing interfaces, types, signatures), never full implementations.

### Issue Structure

Each issue MUST include the following sections in this order:

---

#### `## Context`

A brief explanation of what this task accomplishes and WHY it matters to the system. Include:

- Where this fits in the overall architecture
- What other components depend on or interact with this
- A sequence diagram (using Mermaid syntax) if the task involves communication between 2+ components

Keep this section to 3-5 sentences plus the diagram. The developer needs orientation, not a deep dive.

---

#### `## Learning Tier`

Before classifying, reference the developer's learning goals from `~/.claude/CLAUDE.md`.

Classify the task into exactly ONE tier:

- **🟢 Implement Yourself**: The task directly exercises a skill or concept listed in the developer's learning goals, OR involves core business logic, data modeling, or architectural patterns central to this application. The developer SHOULD write this code themselves with AI as a reference, not a driver.
- **🟡 Pair with AI**: The task uses libraries, patterns, or tools the developer is actively learning (per their learning goals) but in a supporting or integrative capacity, not as the primary focus. The developer drives implementation while using AI to explain concepts and unblock. The developer writes the code; the AI explains.
- **🔵 Review and Understand**: Configuration, boilerplate, scaffolding, or patterns the developer already has strong experience with. AI can implement, but the developer MUST review and be able to explain every decision before merging.

Classification priority:

1. Does this task directly practice a learning goal from `~/.claude/CLAUDE.md`? → 🟢
2. Does this task integrate with or support a learning goal? → 🟡
3. Is this within the developer's existing expertise? → 🔵
4. When in doubt, bias toward 🟢 or 🟡 over 🔵

After the tier label, include a one-sentence justification referencing the specific learning goal or existing skill that drove the classification.

Example:
> **🟢 Implement Yourself**
> This task directly exercises your LangChain retrieval chains learning goal, working with document loaders and chain composition.

---

#### `## Key Concepts`

List 2-4 concepts, patterns, or technologies this task exercises. For each, include:

- The concept name
- If it maps to a learning goal in `~/.claude/CLAUDE.md`, note which one (e.g., `maps to: LangChain`)
- A one-sentence explanation of WHY it's used here (not a textbook definition)
- One question the developer should be able to answer after implementation

Example:

> **Pydantic Discriminated Unions** *(maps to: Pydantic)*
> Used here because symptom entries can be structured (form) or unstructured (natural language), and the API needs to validate and route them differently at parse time.
> *After implementing: Why is a discriminated union better than a generic base class with optional fields here?*

> **FastAPI Dependency Injection** *(maps to: FastAPI)*
> Used here to inject the database session and current user into route handlers without passing them explicitly.
> *After implementing: What happens if a dependency raises an exception? How does FastAPI handle cleanup?*

---

#### `## What You Can Do` (for 🟢 and 🟡 tiers)

Concrete, ordered steps the developer can follow to implement the core logic themselves. These steps must:

- Focus on the MOST instructive part of the task (not every line of code)
- Tell the developer WHAT to build, not HOW to build it (guidance, not dictation)
- Include decision points: places where the developer must choose between approaches and explain their reasoning
- Reference what to look at (existing code in the repo, library docs, relevant patterns) rather than giving the answer
- For 🟡 tasks, note which specific steps the developer should ask AI to explain vs. write themselves

Structure as 3-6 numbered steps. Each step should be 1-2 sentences.

Example:

> 1. Create the Pydantic models for symptom entry validation. Look at how `models/user.py` handles discriminated unions for reference. You will need to decide whether to use a literal discriminator field or a custom validator.
> 2. Build the FastAPI route handler that accepts the validated input. The route should call the appropriate service based on the entry type. Refer to the existing `/api/v1/practices/` routes for the project's conventions.
> 3. **Decision point:** The service layer needs to handle both structured and unstructured input. Should you branch at the route level or the service level? Consider testability and future extensibility.

---

#### `## What to Look For` (for 🔵 tier ONLY, replaces "What You Can Do")

A checklist of specific things to examine in the AI-generated code:

- Patterns to recognize and name (e.g., "This uses the repository pattern for data access")
- Configuration choices that were made and why
- Anything that connects to code the developer wrote themselves in a 🟢 or 🟡 task
- Potential gotchas or places where the boilerplate makes assumptions

Structure as 4-6 checkbox items.

Example:

> - [ ] The Alembic migration uses `batch_alter_table` for SQLite compatibility. Why is this needed and would you use it in production with PostgreSQL?
> - [ ] The Supabase RLS policy on this table mirrors the pattern from the auth feature you implemented. Verify it matches your understanding of the row-level security model.
> - [ ] The error handling middleware catches `ValidationError` and returns a 422. Trace through what happens when a malformed request hits your symptom entry endpoint.

---

#### `## Verify Your Understanding`

3-5 questions the developer should be able to answer WITHOUT looking at the code after working on this task. These should test architectural understanding, not syntax recall.

Requirements:
- At least one "what would happen if..." question
- At least one question about how this task connects to other parts of the system
- Questions should be answerable in 1-3 sentences, not essays

Example:

> 1. If the LLM service is unavailable when a user submits a natural language symptom entry, what should happen? Where in the code is this handled?
> 2. Why does this feature use a background task for AI processing instead of making the user wait for the response?
> 3. What would happen if you changed the discriminator field type from a Literal to a plain string? What breaks and why?
> 4. How does this endpoint's authentication flow connect to the auth middleware you built in the previous feature?

---

## Labels

Apply the following GitHub labels to each issue:

- The learning tier label: `🟢 implement-yourself`, `🟡 pair-with-ai`, or `🔵 review-and-understand`
- Any relevant learning goal tags from `~/.claude/CLAUDE.md` (e.g., `learning:langchain`, `learning:pydantic`, `learning:fastapi`)

If these labels do not exist in the repository, create them before assigning.

## Issue Ordering

Issues must be created in dependency order. If Task B depends on Task A, Task A's issue must be created first, and Task B's issue body should reference Task A's issue number in the Context section.