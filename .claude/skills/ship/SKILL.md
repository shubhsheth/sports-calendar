---
name: ship
description: Open a PR for completed work, monitor CI checks, and run a spec-compliance/cleanliness review loop until the PR is mergeable. Use after the implement skill has checked off every task in tasks.md. Owns the SHIP phase of the spec-driven workflow.
---

# Ship: PR, CI, and Review Loop

This skill owns the **SHIP** phase of the spec-driven workflow — the phase after `implement` has finished. It takes a feature branch with all tasks complete and committed through to a PR that is CI-green and has passed a spec-compliance/cleanliness review, ready for human merge.

## When to Use

- Every task in `spec/NNN-slug/NNN-slug-tasks.md` is checked off (if a spec exists for this change)
- All increments are committed and the working tree is clean

## When NOT to Use

- Tasks remain incomplete — return to `implement` first
- No spec exists for this change — `ship` still applies, but Phase 4's spec-compliance check is skipped in favor of a cleanliness-only review

## Phase 1: Pre-flight

- If `spec/NNN-slug/` exists, confirm every task in `NNN-slug-tasks.md` is checked off. If not, stop and send the human back to `implement`.
- Confirm the working tree is clean and all increments are committed.
- Identify the feature branch and the base branch (default `main`).

## Phase 2: Create the PR

- Push the branch: `git push -u origin <branch>`.
- Open the PR with `mcp__github__create_pull_request`:
  - **Title**: derived from the spec's Objective, or the feature slug if no spec exists.
  - **Body**: summary bullets, a test plan, and a link back to the spec — "Implements: `spec/NNN-slug/NNN-slug-specify.md`" — per `specify`'s "Reference the spec in PRs" convention.
- Subscribe to PR activity with `mcp__github__subscribe_pr_activity`, then end the turn. CI results arrive as `<github-webhook-activity>` events — do not poll.

## Phase 3: CI Check Loop

On each webhook/check event:

- Inspect status via `mcp__github__pull_request_read`, `mcp__github__actions_list`, and `mcp__github__get_job_logs`.
- **All checks green** → go to Phase 4.
- **Any check red**:
  - Diagnose the failure from the logs.
  - Present a CI Fix gate using this format exactly:

    ```
    **CI Fix — awaiting approval**

    **Failing check:** [name]

    **What:** [one sentence fix]

    **Specifically:**
    - [what will change and why]

    **Files touched:** [list]

    Approve or reject?
    ```

  - On approval, apply the fix using `implement`'s Increment Cycle: implement → run tests → commit → push. The push re-triggers CI; stay subscribed and remain in Phase 3.
  - On rejection, revise the proposed fix and re-present — do not re-present the same rejected approach.
  - **Guardrail**: if the same check fails again after a fix attempt, stop looping and report the diagnosis to the human instead of retrying indefinitely.

## Phase 4: Spec-Compliance & Cleanliness Review

Once all checks are green, launch one `general-purpose` subagent (Agent tool) with a self-contained prompt that:

- Points it at `spec/NNN-slug/NNN-slug-specify.md`, `-tasks.md`, and `-implement.md` (if present).
- Has it get the PR diff (`git diff <base>...HEAD`, or via `mcp__github__pull_request_read`).
- Asks it to check, together:
  1. **Spec compliance** — every FR-N / Success Criteria item in `specify.md` is actually implemented, and nothing was added beyond the spec/tasks scope.
  2. **Cleanliness** — per `CLAUDE.md` §1-3 (Think Before Coding, Simplicity First, Surgical Changes): no unnecessary abstractions, dead code, unrelated refactors, or deviation from existing patterns.
- Requires exactly one of two response shapes:
  - `APPROVED — no changes needed`, or
  - A list of findings, each with `file:line`, a description, and a suggested fix.

## Phase 5: Handle Review Findings

- **`APPROVED`** → go to Phase 6.
- **Findings present**:
  - For each finding, present a Review Fix gate — same shape as the CI Fix gate, labeled "Review Feedback":

    ```
    **Review Feedback — awaiting approval**

    **Finding:** [file:line — description]

    **What:** [one sentence fix]

    **Specifically:**
    - [what will change and why]

    **Files touched:** [list]

    Approve or reject?
    ```

  - On approval, apply via `implement`'s Increment Cycle, including its spec-drift checkpoint. If a finding reveals a real spec/requirement gap rather than a style issue, cascade the update through `specify.md`/`tasks.md` per `implement`'s rejection-cascade rule before re-presenting.
  - On rejection, note why and adjust per the human's direction.
  - After fixes are pushed, return to **Phase 3** (CI re-runs), then **Phase 4** again (re-review). Repeat until Phase 4 returns `APPROVED`.

## Phase 6: Ready for Merge

- Post a short PR comment summarizing: CI green, spec-compliance and cleanliness review passed.
- Tell the human the PR is ready. Do not merge automatically — merging is a human decision.
- Keep the PR-activity subscription active until the human merges or closes the PR, or unsubscribe if they say they'll take it from here.

## Cross-References

- Reuses `implement`'s per-task approval-gate format and Increment Cycle for both CI fixes and review-feedback fixes.
- Reuses `implement`'s spec-drift cascade for findings that reveal real spec gaps.
- Reuses `specify`'s "reference the spec in PRs" convention for the PR body.
