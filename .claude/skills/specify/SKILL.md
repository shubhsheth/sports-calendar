---
name: specify
description: Creates specs before coding. Use when starting a new project, feature, or significant change and no specification exists yet. Use when requirements are unclear, ambiguous, or only exist as a vague idea.
---

## Overview

Write a structured specification before writing any code. The spec is the shared source of truth between you and the human engineer — it defines what we're building, why, and how we'll know it's done. Code without a spec is guessing.

## When to Use

- Starting a new project or feature
- Requirements are ambiguous or incomplete
- The change touches multiple files or modules
- You're about to make an architectural decision
- The task would take more than 30 minutes to implement

**When NOT to use:** Single-line fixes, typo corrections, or changes where requirements are unambiguous and self-contained.

## The Workflow

This skill owns the **SPECIFY** phase. It runs in two stages:

**Stage 1 — Clarify (interactive):** Ask the human questions conversationally — one or two at a time — to understand scope, direction, and constraints. Iterate until direction is clear. This is the only human gate before writing begins.

**Stage 2 — Build (autonomous):** Once direction is confirmed, write all three spec files in one continuous pass without pausing for review between them.

```
  Q&A with human          autonomous
  ───────────────    ──────────────────────────────────────
        │
   [iterates]──→ specify.md ──→ tasks.md ──→ implement.md
        │                                         │
      Human                                       ▼
    confirms                          implement
    direction                         (per-task approval gate)
```

Hand off to `implement` once all three files are written. The next human gate is per-task during implementation, not between spec files.

## Choose: Full Spec or Lightweight Spec

Before writing anything, determine which spec format is appropriate.

**Use the lightweight spec when all three are true:**
1. Requirements are clear — no significant ambiguity, no open architectural questions
2. The change is bounded — single-file non-trivial or multi-file (estimated under 30 minutes)
3. No new external dependencies, schema changes, or API contracts involved

**Use the full spec for everything else** — new projects, ambiguous requirements, architectural decisions, or anything that would take more than 30 minutes.

Resolve which path to use through the Q&A conversation — don't decide unilaterally.

---

## Lightweight Spec

For medium-complexity tasks that don't warrant the full template. Three sections only:

```markdown
# Spec: [Feature Name]

## Objective

[What we're building and why. One short paragraph.]

## Success Criteria

[How we'll know this is done — specific, testable, technology-agnostic conditions.]

## Out of Scope

[Explicit exclusions for this iteration.]
```

Once the lightweight spec is written, immediately write `tasks.md` and `implement.md` without pausing for review.

---

## Full Spec

### Phase 1: Specify

**Start with questions, not a spec.** Before writing any content, ask the human one or two targeted questions to understand the most important unknowns. Get answers, then ask follow-up questions if needed. Don't ask more than two questions per turn. Continue until you can answer all three of:

- What is the human trying to achieve? (objective + why)
- What are the hard constraints? (scope, boundaries, out of scope)
- What does success look like? (criteria)

**Direction is clear enough when** you could write the spec without needing to embed any `[NEEDS CLARIFICATION]` markers for anything load-bearing. At that point, stop asking and start writing.

Example opening:
```
Before I write the spec, a couple of questions:
1. Is this a new feature or a change to existing behaviour?
2. Any hard constraints upfront — timeline, tech stack, or scope limits?
```

Then listen and follow up as needed. Do not silently fill in ambiguous requirements — the spec's purpose is to surface misunderstandings _before_ code is written.

**If ambiguity surfaces mid-spec,** use `[NEEDS CLARIFICATION]` markers. Cap at **3 per spec** — more than 3 means stop and ask before continuing. When presenting markers, use a table:

```
| # | Question | Options | Implication if left open |
|---|----------|---------|--------------------------|
| 1 | Should filtering apply server-side or client-side? | Server / Client | Drives whether the API needs filter params |
| 2 | Is this feature gated by user role? | Yes (admin only) / No (all users) | Changes auth requirements significantly |
```

Resolve all markers before writing `tasks.md`.

**Write a spec document covering these six core areas:**

1. **Objective** — What are we building and why? Who is the user? What does success look like?

2. **Commands** — Full executable commands with flags, not just tool names.

   ```
   Build: npm run build
   Test: npm test -- --coverage
   Lint: npm run lint --fix
   Dev: npm run dev
   ```

3. **Project Structure** — Where source code lives, where tests go, where docs belong.

   ```
   src/           → Application source code
   src/components → React components (*.test.ts colocated)
   src/lib        → Shared utilities (*.test.ts colocated)
   e2e/           → End-to-end tests
   docs/          → Documentation
   ```

   Tests live next to the code they test, not in a separate top-level folder.

4. **Code Style** — One real code snippet showing your style beats three paragraphs describing it. Include naming conventions, formatting rules, and examples of good output.

5. **Testing Strategy** — What framework, where tests live, coverage expectations, which test levels for which concerns.

6. **Boundaries** — Three-tier system:
   - **Always do:** Run tests before commits, follow naming conventions, validate inputs
   - **Ask first:** Database schema changes, adding dependencies, changing CI config
   - **Never do:** Commit secrets, edit vendor directories, remove failing tests without approval

**Full spec template:**

```markdown
# Spec: [Project/Feature Name]

## Objective

[What we're building and why.]

## User Stories

- As a [user type], I want to [action] so that [outcome]

## Functional Requirements

- FR-1: [requirement]
- FR-2: [requirement]

## Non-Functional Requirements

- NFR-1: [performance / security / accessibility requirement]

## Out of Scope

- [Explicit exclusions for this iteration]

## Assumptions

- [What we're treating as settled without explicit confirmation]

## Tech Stack

[Framework, language, key dependencies with versions]

## Commands

[Build, test, lint, dev — full commands]

## Project Structure

[Directory layout with descriptions]

## Code Style

[Example snippet + key conventions]

## Testing Strategy

[Framework, test locations, coverage requirements, test levels]

## Boundaries

- Always: [...]
- Ask first: [...]
- Never: [...]

## Success Criteria

[How we'll know this is done — specific, measurable, technology-agnostic conditions]

## Open Questions

[Anything unresolved that needs human input]
```

**Reframe instructions as success criteria.** When receiving vague requirements, translate them into concrete conditions:

```
REQUIREMENT: "Make the dashboard faster"

REFRAMED SUCCESS CRITERIA:
- Dashboard LCP < 2.5s on 4G connection
- Initial data load completes in < 500ms
- No layout shift during load (CLS < 0.1)
→ Are these the right targets?
```

**Success criteria must be technology-agnostic.** Describe observable user outcomes, not implementation choices:

| Bad (tech-coupled)       | Good (user-focused)                                                 |
| ------------------------ | ------------------------------------------------------------------- |
| "Uses Redis for caching" | "Search returns in < 300ms for 95% of queries"                      |
| "Migrates to PostgreSQL" | "All existing user data is preserved and queryable after migration" |
| "Implements React Query" | "UI reflects server state within 2 seconds of a background update"  |

## Keeping the Spec Alive

The spec is a living document, not a one-time artifact:

- **Update when decisions change** — If you discover the data model needs to change, update the spec first, then implement.
- **Update when scope changes** — Features added or cut should be reflected in the spec.
- **Commit the spec** — The spec belongs in version control alongside the code.
- **Reference the spec in PRs** — Link back to the spec section that each PR implements.

See also: `implement` has a per-increment spec drift checkpoint that keeps the spec current during execution.

## Common Rationalizations

| Rationalization                       | Reality                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| "This is simple, I don't need a spec" | Simple tasks don't need _long_ specs, but they still need acceptance criteria. The lightweight path exists for this. |
| "I'll write the spec after I code it" | That's documentation, not specification. The spec's value is in forcing clarity _before_ code.          |
| "The spec will slow us down"          | A 15-minute spec prevents hours of rework. Waterfall in 15 minutes beats debugging in 15 hours.         |
| "Requirements will change anyway"     | That's why the spec is a living document. An outdated spec is still better than no spec.                |
| "The user knows what they want"       | Even clear requests have implicit assumptions. The spec surfaces those assumptions.                     |

## Red Flags

- Starting to write code without any written requirements
- Asking "should I just start building?" before clarifying what "done" means
- Implementing features not mentioned in any spec or task list
- Making architectural decisions without documenting them
- Skipping the spec because "it's obvious what to build"

## Verification

**Before writing any spec content** — confirm through Q&A:
- [ ] Objective, constraints, and success criteria are understood
- [ ] Full spec or lightweight spec path is agreed with the human
- [ ] No major open questions remain

**Before writing `tasks.md`** — the specify file is complete:
- [ ] No `[NEEDS CLARIFICATION]` markers remain
- [ ] Spec is saved to `spec/NNN-slug/NNN-slug-specify.md`

**For full spec only:**
- [ ] All six core areas are covered
- [ ] Functional requirements are numbered (FR-1, FR-2…)
- [ ] Out of Scope section exists with at least one explicit exclusion
- [ ] Boundaries (Always/Ask First/Never) are defined

After `tasks.md` and `implement.md` are written, hand off directly to `implement`. No further human gate here — approval happens per-task during implementation.
