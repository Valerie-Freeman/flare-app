<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 1.1.0
Modified Principles: None
Added Sections:
  - Architectural Decision Records (ADR) requirement in Development Workflow
Removed Sections: None
Templates Requiring Updates:
  ⚠ .specify/templates/plan-template.md - Review for ADR alignment
  ⚠ .specify/templates/spec-template.md - Review for ADR alignment
  ⚠ .specify/templates/tasks-template.md - Review for ADR alignment
Follow-up TODOs:
  - Create docs/adr/ directory structure
  - Document ADR template format
-->

# Flare Project Constitution

## Core Principles

### I. Minimal Dependencies
All technology choices MUST minimize external dependencies and third-party libraries. Every dependency added to the project requires explicit justification and approval. Built-in solutions (e.g., React Context API vs. external state management) are strongly preferred. This principle ensures long-term maintainability, reduces security surface area, and keeps the codebase lean.

**Rationale**: Health data applications have unique security and privacy requirements. Fewer dependencies means fewer potential vulnerabilities, easier auditing, and reduced maintenance burden for a solo developer.

### II. YAGNI (You Aren't Gonna Need It)
Implement only what is needed for current, explicitly defined requirements. Do NOT build features, abstractions, or infrastructure for hypothetical future needs. Premature optimization, over-engineering, and "just in case" code are prohibited.

**Rationale**: Maintaining focus on actual user needs ensures faster delivery, simpler code, and prevents scope creep. Features can be added later when they are actually needed.

### III. Privacy & Data Security (NON-NEGOTIABLE)
User health data protection is paramount. All sensitive data MUST be encrypted client-side before storage. Row-level security (RLS) policies MUST be implemented for all user data tables. Data anonymization is required before any external API calls (including AI services). Users MUST have full data export capabilities.

**Rationale**: Health information is highly sensitive. Users trust Flare with their most personal data. This trust must never be violated. Encryption, RLS, and data ownership are non-negotiable requirements.

### IV. Human-in-the-Loop
All architectural decisions, feature implementations, and significant code changes MUST be reviewed and approved by the human developer before implementation. AI assistance is for execution, not autonomous decision-making.

**Rationale**: Ensures project direction aligns with vision, prevents unwanted complexity, and maintains quality standards. The human developer has final authority on all technical choices.

### V. Clean & Simple UX
User interface MUST be clean, minimal, and calming. Avoid visual clutter, overstimulation, or overwhelming users. Design choices should reduce cognitive load, especially for users managing chronic health conditions.

**Rationale**: Target users are often dealing with health challenges. A calm, intuitive interface reduces stress and encourages consistent use of the app.

## Security & Privacy Requirements

All code MUST adhere to these security standards:

- Client-side encryption for notes, journal entries, and free-text fields using expo-crypto
- Master Encryption Key (MEK) stored encrypted with both user password and recovery passphrase
- Row-Level Security (RLS) policies on all user data tables in Supabase
- JWT validation for all API requests to Python AI service
- Data anonymization (remove user IDs, absolute timestamps) before sending to LLM APIs
- HTTPS for all network communication
- Secure storage (expo-secure-store) for encryption keys
- No logging of sensitive user data

Security vulnerabilities (SQL injection, XSS, command injection, etc.) are unacceptable and must be prevented.

## Development Workflow

### Architectural Decision Records (ADR)
All architectural decisions MUST be documented in an Architectural Decision Record (ADR). This includes:

- Technology stack choices (frameworks, libraries, services)
- Infrastructure decisions (deployment, hosting, CI/CD)
- Security and privacy architecture choices
- Data model and schema decisions
- API design and integration patterns

ADRs should capture the decision, context, considered alternatives, and rationale. ADRs are stored in `docs/adr/` and numbered sequentially.

### Approval Process
1. Propose implementation approach with clear rationale
2. Document architectural decisions in ADR format if applicable
3. Wait for human developer approval before coding
4. Implement approved solution
5. Request review of implementation

### Code Quality Standards
- No dead code or commented-out blocks
- No unnecessary abstractions or helper functions for one-time use
- Clear, self-documenting code preferred over excessive comments
- Error handling only at system boundaries (user input, external APIs)
- No backwards-compatibility hacks for unused features

### Testing Requirements
- Core functionality must be testable
- Critical paths (auth, data encryption, RLS policies) require validation
- AI service endpoints require integration testing

## Governance

This constitution supersedes all other project practices and documentation. All development decisions must align with these principles.

### Amendment Procedure
1. Proposed changes must be documented with rationale
2. Human developer approval required for all amendments
3. Version number updated according to semantic versioning
4. Dependent templates and documentation updated to reflect changes

### Compliance
All pull requests, code reviews, and implementation decisions must verify alignment with constitution principles. Any complexity added to the codebase must be explicitly justified against YAGNI and minimal dependencies principles.

### Versioning Policy
- MAJOR: Backward-incompatible principle removals or redefinitions
- MINOR: New principles added or material expansions to existing guidance
- PATCH: Clarifications, wording improvements, non-semantic refinements

**Version**: 1.1.0 | **Ratified**: 2026-01-30 | **Last Amended**: 2026-01-30
