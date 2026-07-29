# OfferLab Frontend V22 Readiness

> Version: V22
> Theme: Local runtime reliability and demo trustworthiness
> Status: STATIC_VERIFIED / QA_PASSED / PR_CI_PASSED
> Branch: `feature/v22-local-runtime-reliability`
> Base: `dev-v2@6b92237c4c1c500ab0fbf53c76634dfbb80ba536`

## Scope

- Add one `UserAvatar` component for successful, loading, failed, and empty image states.
- Use deterministic local fallback text across navigation, feed, comments, profiles, search, settings, and governance.
- Ignore stale A-B-A image events through request generations.
- Treat explicit `alt=""` as decorative while nullable API alt values fall back to an accessible user label.
- Prevent hidden public profiles from requesting their avatar.
- Send remote avatar requests with `referrerpolicy="no-referrer"`.
- Recursively reject raw user-avatar `<img>` bindings in Vue source.
- Extend text-quality scanning to frontend data sources and known demo mojibake.

## Contract

- No feed or user API change.
- No fabricated recommendation fallback data.
- No new external image service or broad visual redesign.
- Existing `dev-v2 -> main` and V21 pull requests remain untouched.

## Verification

| Check | Result | Evidence |
|---|---|---|
| V22 avatar behavior guard | PASS | A-B-A stale events, load/error retry, empty source, fallback, nullable/empty alt |
| Avatar wiring guard | PASS | Recursive Vue scan plus guarded mounts including public `UserProfileView` |
| Text-quality gate | PASS | 1073 files scanned, including `src/data` |
| Full frontend guard chain | PASS | `npm run test:guards` |
| Type check | PASS | `npm run typecheck` and build type-check phase |
| Production build | PASS | Vite; 1966 modules transformed |
| ESLint | PASS_WITH_BASELINE_WARNINGS | 0 errors / 3965 warnings |
| API scope | PASS | No API adapter or response contract change |
| `git diff --check` | PASS | Latest working tree |
| Independent cross-stack QA | PASS | Final review: 0 blocker / 0 high |
| Pull request CI | PASS | Draft PR #17 frontend `verify` completed successfully |

## Dynamic Boundary

No frontend/backend service or browser was started. Static behavior tests and the
production build do not prove actual browser rendering, remote-image timing, CSP,
layout, or visual appearance. A browser smoke check with successful, failed, slow,
and hidden-profile avatars remains separate dynamic evidence.
