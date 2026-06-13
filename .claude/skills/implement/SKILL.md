---
name: implement
description: Execute a task list incrementally. Use after the tasks skill has produced an approved implement.md. Owns the IMPLEMENT phase of the spec-driven workflow.
---

# Incremental Implementation Guide

This document outlines a disciplined approach to building features in small, testable increments rather than large, monolithic changes.

## Core Principle

"Build in thin vertical slices — implement one piece, test it, verify it, then expand." Each increment should leave the system in a working, deployable state.

## Key Workflow Phases

The implementation phase follows specification, planning, and task breakdown. Work must proceed through established phase layers—completing setup before foundation work, foundation before core features—without skipping ahead to incomplete levels.

## Per-Task Approval Gate

Before executing any task, present a summary to the human and wait for explicit approval. Use this format exactly:

```
**Task N of N — awaiting approval**

**What:** [one sentence describing the task]

**Specifically:**
- [what will change and why]
- [any non-obvious implications]

**Files touched:** [list]

Approve or reject?
```

**On approval:** proceed with the increment cycle below.

**On rejection:** do not implement. Instead:
1. Revise the approach in `implement.md`
2. Update `tasks.md` if the rejection changes the task breakdown or ordering
3. Update `specify.md` if the rejection reveals a scope or requirement change
4. Re-present the revised task summary before proceeding

Cascade changes through all three spec files before re-presenting — never re-present the same rejected approach.

## The Increment Cycle

After approval, execute the task:

1. Implement the smallest complete piece
2. Run the test suite
3. Confirm the slice works as expected
4. Commit with a descriptive message
5. Check spec drift: if a spec file exists (`spec/NNN-slug/`) and this increment changed any assumption, boundary, or requirement, update the spec file and notify the human before proceeding to the next slice
6. Present the next task summary and wait for approval

## Slicing Approaches

**Vertical slices** deliver end-to-end functionality (database through UI). **Contract-first slicing** defines API specifications before parallel backend/frontend work. **Risk-first slicing** tackles uncertain pieces early to avoid wasted effort.

## Implementation Rules

**Simplicity first**: Question whether abstractions justify their complexity. Three similar code blocks beats premature generalization.

**Scope discipline**: Touch only what the task requires. Don't refactor adjacent code or add unspecified features.

**One thing at a time**: Each commit addresses a single logical change.

**Keep it compilable**: The project must build and existing tests must pass between increments.

**Feature flags**: Hide incomplete work behind toggles when merging to main.

**Safe defaults**: New code should default to conservative, opt-in behavior.

**Rollback-friendly**: Each increment should be independently revertable.

## Critical Gate

Task completion requires validating acceptance criteria explicitly—not merely passing tests, which only prove code does what it does, not what the specification requires.

## Handoff

Once every task in `tasks.md` is checked off, hand off to the `ship` skill to open the PR and run the CI/review loop.
