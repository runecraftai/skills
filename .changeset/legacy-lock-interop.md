---
"@runecraft/grimoire": minor
---

Improve legacy-lock interoperability and TUI presentation:

- **Legacy lock dual-read:** the TUI reads legacy lock entries but never overwrites shared `targets`, `fileHashes`, `hash`, `version`, or `installed` fields; verified installs are recorded additively in scoped `tuiTargets` records only.
- **Scoped ownership records:** status and audit verify scoped `tuiTargets` records, and scoped removals drop a skill entry only when ownership is fully gone while preserving shared legacy fields and surviving copies.
- **Ownership-unknown reporting:** `status` and `audit` report legacy and targetless copies as ownership-unknown instead of tampered or omitted; `audit --json` includes the new `ownershipUnknown` field.
- **TUI banner:** new banner art with a compact fallback and common-width alignment, plus a raised confirm gate requiring 80x22 for safe confirmation rendering.
