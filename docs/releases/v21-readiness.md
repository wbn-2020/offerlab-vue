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
| V21 implementation commit | `48930547b58c46b3f471d37bf7aa8ec52542b8db` |
| Initial V21 evidence commit | `ac67812f5089daf4e642c1c35bcbbb732fdce35d` |
| QA Guard hardening commit | `5e383e3d10ccdfee9357e0884d5c0fbcde19b40f` |
| Pre-PR evidence commit | `f10ac19052ffdee88104c442002e6a0ca2efb5fb` |
| Draft PR | `#16`, `feature/v21-release-readiness -> dev-v2` |
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
The branch is pushed and draft PR #16 is open against `dev-v2`. It has not
been merged.

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
- Reject compound `OR` conditions that do not guarantee non-empty references, duplicate/looped mounts, and statically unreachable mounts.
- Preserve three-state summaries, Chinese status labels, accessible non-color distinctions, overclaim bans, investment-risk copy, and no-probing assertions.

Out of scope:

- Backend, API, store, router, editor, database migration, or dependency changes
- URL probing or additional network requests
- Dev server, watch processes, merge, deployment, or runtime-environment changes

## Static Verification Queue

| Command | Status | Result |
|---|---|---|
| `npm run test:v17-reference-health` | `PASSED` | Exit 0 after QA hardening; dedicated rerun and full Guard-chain rerun both passed on 2026-07-28 |
| `npm run lint` | `PASSED_WITH_WARNINGS` | Exit 0; 0 errors and 3,965 pre-existing repository warnings |
| `npm run typecheck` | `PASSED` | Exit 0; repeated successfully through the final `npm run verify` |
| `git diff --check` | `PASSED_WITH_WARNING` | Exit 0 on 2026-07-28; only LF-to-CRLF working-copy warnings, no whitespace errors |
| `npm run test:guards` | `PASSED` | Final execution through `npm run verify`; all pre-guards and full guard chain passed |
| `npm run build` | `PASSED` | Final Vite 8.1.4 build completed in 20.39 seconds |
| `npm run verify` | `PASSED` | Exit 0; final post-QA run completed by `2026-07-28T19:11:04+08:00` in about 10 minutes 9 seconds |

The behavior commit `48930547b58c46b3f471d37bf7aa8ec52542b8db` plus Guard
hardening commit `5e383e3d10ccdfee9357e0884d5c0fbcde19b40f` is locally
`STATIC_VERIFIED`. The first Guard rerun after hardening exposed an assertion-message
bug in the test itself; it was corrected before `5e383e3`, and the dedicated rerun,
lint, and final full verify all passed. Local and remote refs were synchronized to
the same GitHub canonical commits after checking parent, tree, author, and email.
Draft PR #16 checks are the authoritative final-head CI record; the latest observed
run, head SHA, cross-repository checkout SHA, and artifact IDs are kept in the
shared V21 ledger to avoid creating a self-referential CI evidence loop in this file.

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

- Independent read-only QA found no P0; its P1 evidence findings were corrected and its P2 compound-condition/unreachable-mount Guard finding was fixed in `5e383e3`.
- Local lint, full guards, type checking, and production build passed.
- V21 implementation and evidence commits are synchronized locally and remotely; current-head PR #16 checks must remain green for final signoff.
- Required browser, accessibility, API, role, and rollback scenarios remain `BLOCKED`.
