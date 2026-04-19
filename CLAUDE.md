# Claude Instructions

## Spec-Driven Development

Whenever asked to build, implement, add, or create a new feature, ALWAYS invoke the `spec-driven-development` skill first by calling `/spec-driven-development` before writing any code. Do not skip this step even if the requirements seem clear.

### Spec File Naming & Structure

All spec documents must follow this convention:

- Live under `spec/` at the repo root
- Each feature gets its own numbered subdirectory: `spec/NNN-slug/`
- Files within that directory are named: `NNN-slug-phase.md`
- Valid phases: `requirements`, `plan`, `implement`

Example:
```
spec/
└── 001-calendar-sync-backend/
    ├── 001-calendar-sync-backend-requirements.md
    ├── 001-calendar-sync-backend-plan.md
    └── 001-calendar-sync-backend-implement.md
```

Increment `NNN` for each new feature (001, 002, 003…).
