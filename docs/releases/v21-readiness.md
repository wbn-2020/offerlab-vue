# OfferLab Vue V21 Readiness Evidence

> Evidence date: 2026-07-28
> Repository: `offerlab-vue`
> Overall status: `PASS_WITH_BLOCKERS`
> Evidence rule: only executed checks may be marked passed; source guards do not replace runtime verification.

## Baseline

| Item | Recorded value |
|---|---|
| Working branch | `feature/v21-release-readiness` |
| V21 starting HEAD | `6b92237c4c1c500ab0fbf53c76634dfbb80ba536` |
| V21 implementation commit | `01cd693e7276afed135d1196c64d6c40d3ed4285` |
| Local `dev-v2` | `6b92237c4c1c500ab0fbf53c76634dfbb80ba536` |
| Baseline commit | `fix: align cross-repository CI validation` |
| Baseline worktree | Clean before V21 edits |
| Node | `v24.18.0` |
| npm | `11.16.0` |
| `package-lock.json` SHA-256 | `5AB1C945D20E37CF33A277057D3B0B66659A10430F9AD5553D3846ADFC8205DD` |
| Baseline captured | `2026-07-28T16:39:44+08:00` |

The approved V21 plan freezes the existing frontend `dev-v2` baseline and PR #15.
The V21 behavior and Guard changes are committed only on
`feature/v21-release-readiness`; they do not rewrite or append to `dev-v2`.
The branch has not yet been pushed or merged at this evidence point.

## Change Scope

Allowed implementation and evidence files:

- `src/components/post/PostReferencePanel.vue`
- `src/utils/referenceHealth.ts`, only if the earliest-confirmation semantics require a code or comment correction
- `scripts/test-v17-reference-health.mjs`
- `docs/releases/v21-readiness.md`

Intended changes:

- Keep the author-maintained/platform-not-verified boundary visible during loading, error, empty, and non-empty states.
- Keep empty references free of fabricated zero-count summaries.
- Use the earliest author confirmation among current ACTIVE references.
- Make the V17 guard fail when the boundary returns to a conditional branch or `PostReferencePanel` is removed from `PostDetailView`.
- Preserve three-state summaries, Chinese status labels, accessible non-color distinctions, overclaim bans, investment-risk copy, and no-probing assertions.

Out of scope:

- Backend, API, store, router, editor, database migration, or dependency changes
- URL probing or additional network requests
- Dev server, watch processes, commit, or push

## Static Verification Queue

| Command | Status | Result |
|---|---|---|
| `npm run test:v17-reference-health` | `PASSED` | Exit 0; final run `2026-07-28T17:00:48+08:00` to `2026-07-28T17:00:52+08:00` |
| `npm run typecheck` | `PASSED` | Exit 0; first bounded run passed and `npm run verify` repeated type checking successfully |
| `git diff --check` | `PASSED_WITH_WARNING` | Exit 0 on 2026-07-28; only LF-to-CRLF working-copy warnings, no whitespace errors |
| `npm run test:guards` | `PASSED` | Executed through `npm run verify`; all pre-guards and full guard chain passed |
| `npm run build` | `PASSED` | Vite 8.1.4 transformed 1,962 modules and produced 222 files; completed `2026-07-28T17:55:31+08:00` |
| `npm run verify` | `PASSED` | Exit 0; full guards, type check, and production build completed in about 7 minutes 11 seconds |

The implementation tree at `01cd693e7276afed135d1196c64d6c40d3ed4285`
is locally `STATIC_VERIFIED`. GitHub pull-request CI remains outstanding until
the V21 branch is pushed and opened against `dev-v2`.

## Dynamic Verification

All runtime evidence remains blocked because this task does not start services or a browser test environment.

| Scenario | Status | Blocker |
|---|---|---|
| Real reference API and no-reference post | `BLOCKED` | No backend/runtime environment started |
| All-ACTIVE reference post | `BLOCKED` | No seeded runtime data or browser session |
| ACTIVE/BROKEN mixed post | `BLOCKED` | No seeded runtime data or browser session |
| Investment post with BROKEN reference | `BLOCKED` | No seeded runtime data or browser session |
| Public-to-private/offline reference access | `BLOCKED` | No multi-role runtime environment |
| Light, dark, and mobile rendering | `BLOCKED` | Browser visual verification not run |
| NVDA or VoiceOver reading order | `BLOCKED` | Assistive-technology verification not run |
| Rollback rehearsal | `BLOCKED` | No release candidate deployed |

## Release Decision

Current decision: `PASS_WITH_BLOCKERS`.

Reasons:

- Local full guards, type checking, and build passed.
- V21 branch commit, push, pull-request CI, and final clean-worktree evidence are still outstanding.
- Required browser, accessibility, API, role, and rollback scenarios remain `BLOCKED`.
