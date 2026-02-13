<!--
SYNC IMPACT REPORT
==================
Version Change: 1.5.0 → 1.6.0
Modified Principles: None
Added Sections:
  - Principle IX: Testing Philosophy
Modified Sections:
  - Development Workflow > Testing Requirements: Updated to reference Principle IX
  - Governance > Compliance: Added "testing philosophy" to principle checklist
Removed Sections: None
Templates Requiring Updates:
  ✅ .specify/templates/plan-template.md - Constitution Check is dynamic, no changes needed
  ✅ .specify/templates/spec-template.md - No direct constitution references requiring update
  ✅ .specify/templates/tasks-template.md - No direct constitution references requiring update (governance supersedes for critical paths)
  ✅ .specify/templates/agent-file-template.md - No constitution references requiring update
  ✅ .specify/templates/checklist-template.md - No constitution references requiring update
Follow-up TODOs: None
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
User health data protection is paramount. All sensitive data MUST be encrypted at rest via Supabase's built-in AES-256 encryption. Row-level security (RLS) policies MUST be implemented for all user data tables. Data anonymization is required before any external API calls (including AI services). Users MUST have full data export capabilities.

**Rationale**: Health information is highly sensitive. Users trust Flare with their most personal data. This trust must never be violated. Server-side encryption at rest, RLS, and data ownership are non-negotiable requirements. See ADR-001 for the decision record on encryption approach.

### IV. Human-in-the-Loop
All architectural decisions, feature implementations, and significant code changes MUST be reviewed and approved by the human developer before implementation. AI assistance is for execution, not autonomous decision-making.

**Rationale**: Ensures project direction aligns with vision, prevents unwanted complexity, and maintains quality standards. The human developer has final authority on all technical choices.

### V. Clean & Simple UX
User interface MUST be clean, minimal, and calming. Avoid visual clutter, overstimulation, or overwhelming users. Design choices should reduce cognitive load, especially for users managing chronic health conditions.

**Rationale**: Target users are often dealing with health challenges. A calm, intuitive interface reduces stress and encourages consistent use of the app.

### VI. Architectural Quality (No Hacky Solutions)
All code MUST be well-architected, elegant, and designed with best practices in mind. Quick fixes, workarounds, and hacky solutions are prohibited. Every implementation MUST:

- Follow established design patterns appropriate to the problem domain
- Be designed for scalability and maintainability from the start
- Prioritize long-term effectiveness over short-term convenience
- Use clear abstractions that accurately model the domain
- Avoid technical debt accumulation through proper upfront design

Temporary workarounds are only permitted when:
1. There is an explicit, time-bound plan to replace them
2. They are documented with TODO comments explaining the proper solution
3. They are approved by the human developer with a stated remediation timeline

**Rationale**: Hacky solutions compound over time, creating maintenance nightmares and fragile systems. Health applications require reliability and trust. Investing in proper architecture upfront reduces total cost of ownership and ensures the codebase remains comprehensible and evolvable.

### VII. Single Source of Truth
Every piece of knowledge, configuration, business rule, or data definition MUST have exactly one authoritative representation in the codebase. Duplication of logic, constants, validation rules, type definitions, or state is prohibited. When multiple parts of the system need the same information, they MUST reference the single authoritative source rather than maintaining independent copies.

This principle applies to:
- **Business logic**: Validation rules, calculations, and domain rules MUST be defined once and imported where needed
- **Configuration**: Environment values, feature flags, and settings MUST originate from a single source
- **Type/schema definitions**: Data shapes MUST be defined once (e.g., database schema drives API types drives UI types)
- **Constants**: Magic numbers, string literals, and enumerations MUST be centralized
- **State**: Application state for a given concern MUST live in one location, not be mirrored across components

**Rationale**: Duplicated knowledge inevitably diverges. When a business rule exists in two places, one will be updated and the other forgotten, creating subtle bugs that are difficult to trace. A single authoritative source eliminates update anomalies, simplifies refactoring, and ensures consistency across the entire system.

### VIII. Single Responsibility
Every module, file, function, and component MUST have exactly one well-defined responsibility—one reason to change. When a unit of code accumulates multiple concerns, it MUST be decomposed into focused units with clear boundaries.

This principle applies at every level:
- **Functions**: Each function MUST perform one coherent operation. A function that validates, transforms, and persists data MUST be split into discrete steps.
- **Files/Modules**: Each file MUST own one concern. A file containing both UI rendering and API communication MUST be separated.
- **Components**: Each UI component MUST represent one visual/behavioral unit. A component handling layout, data fetching, and business logic MUST delegate non-UI concerns elsewhere.
- **Services**: Each service MUST encapsulate one domain capability. An auth service MUST NOT also manage user profile preferences.

**Rationale**: Units with multiple responsibilities become change magnets—modifications for one concern risk breaking the other. Focused units are easier to test, easier to name, easier to reuse, and easier to replace. This directly supports maintainability for a solo developer who must quickly understand and modify any part of the system.

### IX. Testing Philosophy
Tests MUST verify **behavior, not implementation**. Tests assert what the user sees and does—not internal component state, props, or implementation details. Tests MUST be resilient to refactoring: if the behavior does not change, the tests MUST NOT break.

**Permitted test tooling**: `jest-expo` (preset) and `@testing-library/react-native` are the only testing dependencies. Jest's built-in mocking (`jest.mock`, `jest.fn`) is sufficient. No additional mocking libraries (Sinon, etc.), no snapshot testing plugins, and no E2E frameworks are permitted without explicit approval.

**Testing priority order** (highest ROI first):
1. **Services/business logic**: Pure functions and service modules—easiest to test, highest return on investment
2. **Context/state management**: Integration-style tests verifying state transitions and side effects
3. **Screen components**: User interactions, form validation, navigation flows—tested last

**Critical path coverage**: Authentication, secure storage, and data encryption boundaries MUST always have test coverage regardless of feature scope.

**Mocking boundaries**: Mocks are permitted ONLY at system boundaries:
- **External services**: Supabase client
- **Native modules**: `expo-secure-store`, device APIs
- **Navigation**: `expo-router`

Internal modules MUST NOT be mocked between each other. If a test requires mocking an internal module, that is a design signal—the code needs refactoring, not more mocks.

**Test location**: Tests MUST live in `__tests__/` mirroring the `src/` structure (e.g., `__tests__/services/auth.test.js` for `src/services/auth.js`).

**Rationale**: Testing philosophy is an extension of Architectural Quality (Principle VI)—hard-to-test code is poorly designed code. Tests serve as a design feedback mechanism. Behavior-based testing supports Single Responsibility (Principle VIII) by encouraging focused, independently testable units. Lean test tooling honors Minimal Dependencies (Principle I). Mandatory critical-path coverage enforces Privacy & Data Security (Principle III) by ensuring auth and encryption boundaries are validated continuously.

## Security & Privacy Requirements

All code MUST adhere to these security standards:

- Server-side encryption at rest via Supabase (AES-256) for all user data
- Row-Level Security (RLS) policies on all user data tables in Supabase
- JWT validation for all API requests to Python AI service
- Data anonymization (remove user IDs, absolute timestamps) before sending to LLM APIs
- HTTPS for all network communication
- Secure storage (expo-secure-store) for authentication tokens
- No logging of sensitive user data

Security vulnerabilities (SQL injection, XSS, command injection, etc.) are unacceptable and must be prevented.

## Regulatory Compliance

### FTC Health Breach Notification Rule (16 CFR Part 318)

Flare is a consumer health application and is NOT a HIPAA-covered entity (not a healthcare provider, health plan, or healthcare clearinghouse). However, as a vendor of personal health records, Flare IS subject to the FTC Health Breach Notification Rule.

**Key Requirements:**

- Breach notification to consumers, FTC, and potentially media within 60 days of discovering a breach of unsecured PHR identifiable health information
- "Unsecured" means data not rendered unusable through encryption or destruction
- Breaches affecting 500+ individuals require notification to prominent media outlets

**Flare's Compliance Posture:**

Supabase's AES-256 encryption at rest renders all stored health data "secured" under FTC definitions. This means:

- Data encrypted at rest is NOT considered "unsecured PHR identifiable health information"
- A database breach would NOT trigger notification requirements as long as encryption keys remain uncompromised
- This compliance posture was a key factor in selecting server-side encryption over client-side encryption (see ADR-001)

**Ongoing Obligations:**

- MUST maintain encryption at rest for all user health data
- MUST implement and enforce RLS policies to prevent unauthorized access
- MUST have incident response procedures documented before production launch
- MUST NOT store health data in unencrypted form (logs, caches, backups)

**What Flare is NOT Required to Do:**

- HIPAA compliance (BAAs, specific technical safeguards, audit requirements)
- SOC 2 certification (though Supabase maintains this for infrastructure)
- Penetration testing or third-party security audits (recommended but not required)

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
- No quick fixes or workarounds without explicit approval and remediation plan

### Testing Requirements
Testing standards are governed by **Principle IX: Testing Philosophy**. In summary:

- All code MUST be structured to be testable (single responsibility, clear boundaries)
- Critical paths (auth, secure storage, data encryption boundaries) MUST have test coverage
- Tests MUST verify behavior, not implementation details
- Mocking is permitted only at system boundaries (Supabase, native modules, navigation)
- AI service endpoints require integration testing

## Governance

This constitution supersedes all other project practices and documentation. All development decisions must align with these principles.

### Amendment Procedure
1. Proposed changes must be documented with rationale
2. Human developer approval required for all amendments
3. Version number updated according to semantic versioning
4. Dependent templates and documentation updated to reflect changes

### Compliance
All pull requests, code reviews, and implementation decisions must verify alignment with constitution principles. Any complexity added to the codebase must be explicitly justified against YAGNI, minimal dependencies, single source of truth, single responsibility, architectural quality, and testing philosophy principles.

### Versioning Policy
- MAJOR: Backward-incompatible principle removals or redefinitions
- MINOR: New principles added or material expansions to existing guidance
- PATCH: Clarifications, wording improvements, non-semantic refinements

**Version**: 1.6.0 | **Ratified**: 2026-01-30 | **Last Amended**: 2026-02-13
