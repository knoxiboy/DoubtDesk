## Description
Add early `401` guard for missing email in both `PATCH` and `DELETE` handlers in `src/app/api/doubts/action/[id]/route.ts`. If Clerk returns a user with no primary email, the endpoint now returns `401 Unauthorized` before proceeding, instead of falling through to a `403` rejection or potential `undefined` access.

## Related Issue
Closes #879

## Type of Change
- [x] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Documentation update (README, guides, comments)
- [ ] Style / UI change (no logic change)
- [ ] Code refactor (no behavior change)
- [ ] Test addition or update
- [ ] Breaking change (fix or feature that would cause existing functionality to change)

## Problem
Both `DELETE` and `PATCH` handlers resolved the user's email via:
```ts
const email = user?.primaryEmailAddress?.emailAddress;
```
but never guarded against `email` being `undefined`. If Clerk returned a user object without a primary email address:
- `isOwner = email && doubt.userEmail === email` evaluates to `false`
- `isTeacher` remains `false` (the membership block is gated on `email` being truthy)
- The request is rejected with `403` instead of the semantically correct `401`
- The error message (`"Unauthorized to delete this doubt"`) is misleading — the user is authenticated (has a Clerk session) but lacks an email, which is a different failure mode

## Fix
Added an early return at the top of both handlers, immediately after resolving `email`:

```ts
if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Before (DELETE handler)
```ts
const user = await currentUser();
const email = user?.primaryEmailAddress?.emailAddress;

const { id } = await params;
// ... proceeds without email, eventually hits 403
```

### After (DELETE handler)
```ts
const user = await currentUser();
const email = user?.primaryEmailAddress?.emailAddress;
if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const { id } = await params;
// ... safe to proceed
```

### PATCH handler
The `PATCH` handler already had an `email` check inside the `"like"` action branch (line 65-67), but lacked a global early return. The fix moves the email resolution before request validation and adds the guard at the handler entry point, consistent with the `DELETE` handler.

## Files Changed
| File | Change |
|---|---|
| `src/app/api/doubts/action/[id]/route.ts` | Added `if (!email) return 401` guard in both `DELETE` and `PATCH` handlers; moved `currentUser()` call before request body parsing in `PATCH` |

## How Has This Been Tested?
- [ ] Tested locally with `npm run dev`
- [x] Verified TypeScript compilation (`npx tsc --noEmit` passes)
- [ ] Verified on mobile viewport (375px)
- [ ] Verified on desktop viewport (1440px)

## Checklist
- [x] I have tested my changes locally (`npx tsc --noEmit`)
- [x] My code follows the existing code style (TypeScript, no `any` types)
- [x] I have not introduced unrelated changes (each PR should address one issue)
- [ ] I have added comments where necessary
- [x] My branch is up to date with `main`
- [x] I have linked the related issue above
- [ ] Screenshots are included (if this is a UI change)
