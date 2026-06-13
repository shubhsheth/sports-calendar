---
name: tasks
description: Decompose a validated spec into an implementation plan and task list. Use after the specify skill has confirmed direction. Owns the PLAN and TASKS phases of the spec-driven workflow.
---

## Overview

This skill owns the **PLAN** and **TASKS** phases of the spec-driven workflow. It runs as part of the autonomous spec-building pass started by `specify` — do not pause for human review between phases. Do not begin planning without a spec — planning without one produces tasks that solve the wrong problem.

Find the spec at `spec/NNN-slug/NNN-slug-specify.md` (naming convention from CLAUDE.md). The spec may be a **full spec** (with Functional Requirements FR-N, Tech Stack, Boundaries, etc.) or a **lightweight spec** (Objective, Success Criteria, Out of Scope only). Adjust your approach accordingly — lightweight specs have no FR-N items; use Success Criteria as the source of truth for task coverage instead.

## When to Use

- A spec exists (direction confirmed through Q&A in `specify`)
- Work feels too expansive to start without breaking it down
- Multiple agents or sessions need to parallelize work
- The implementation sequence is not obvious

**When NOT to use:** Single-file changes with obvious scope, or specs that already contain a defined task list.

## Phase 2: Plan

Before writing any tasks, produce a technical implementation plan.

**Step 0 — Resolve unknowns first.** Identify any unresolved technical questions that would invalidate the plan if answered wrong. Run research spikes for these before planning proceeds. A plan built on a wrong assumption requires a full rewrite.

**Step 1 — Identify major components.** List the pieces that need to be built and how they relate to each other.

**Step 2 — Map dependencies bottom-up.** Foundations must precede the things that depend on them. Work out the dependency graph before deciding order.

**Step 3 — Decide sequencing vs. parallelism.** Mark which components can be built in parallel and which must be sequential. Prefer vertical slices (one complete feature path end-to-end) over horizontal slices (all DB, then all API, then all UI).

**Step 4 — Note risks.** For each major component, note what could go wrong and how to detect it early.

**Step 5 — Define task boundaries.** Identify where one task ends and the next begins so each is independently implementable and approvable.

## Phase 3: Tasks

Break the approved plan into discrete, implementable tasks.

**Task requirements:**
- Completable in a single focused session
- Explicit acceptance criteria
- A concrete verification step (test command, build, manual check)
- File references (which files will be touched)
- Scope estimate: XS (1 file), S (2–3 files), M (4–5 files), L (6–8 files), XL (9+ files)

**Task sizing:** Keep tasks S to M. Tasks sized L or larger must be broken down further. No task should touch more than ~5 files.

**Task ordering:** Order by dependency, not by perceived importance. A task's dependencies must appear before it in the list.

**Task template:**

```markdown
- [ ] Task: [Description]
  - Acceptance: [What must be true when done]
  - Verify: [How to confirm — test command, build, manual check]
  - Files: [Which files will be touched]
  - Size: [XS / S / M / L / XL]
```

**Every task list must end with a documentation update task:**

```markdown
- [ ] Task: Update documentation
  - Acceptance: Any new commands, endpoints, models, or boundaries introduced by this feature are reflected in CLAUDE.md and relevant docs/ files; no stale references remain
  - Verify: Review CLAUDE.md and affected docs/*.md for accuracy
  - Files: CLAUDE.md, docs/<relevant>.md
  - Size: XS
```

## Quality Gate

Self-check before writing `implement.md` — do not pause for human review here:

- [ ] Every spec functional requirement (FR-N) maps to at least one task *(skip for lightweight specs — verify against Success Criteria instead)*
- [ ] Every task has acceptance criteria and a verification step
- [ ] Tasks are ordered by dependency (no task requires a later task's output)
- [ ] No task is sized L or larger
- [ ] Gaps between spec requirements and tasks are flagged as CRITICAL, HIGH, or MEDIUM severity
- [ ] The documentation update task is last in the list
