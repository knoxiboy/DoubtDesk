## **User description**

## Description
Fixes the "solve" action on `PATCH /api/doubts/action/[id]` so a `replyId` can only pin a reply as the official solution when that reply was actually submitted as a `solution`-type answer. Previously the reply type was never validated, so any reply (regular comment, AI answer, etc.) could be presented as the "official solution." Now we fetch the target reply and reject non-solution replies with a `400`. Toggling off an already-pinned solution is still allowed.

## Related Issue
Closes #1109

## Type of Change
- [x] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Documentation update (README, guides, comments)
- [ ] Style / UI change (no logic change)
- [ ] Code refactor (no behavior change)
- [ ] Test addition or update
- [ ] Breaking change (fix or feature that would cause existing functionality to change)

## How Has This Been Tested?
- [x] Tested locally with `npm run dev`
- [ ] Verified on mobile viewport (375px)
- [ ] Verified on desktop viewport (1440px)

## Checklist
- [x] I have tested my changes locally (`npm run dev`)
- [x] My code follows the existing code style (TypeScript, Tailwind, no `any` types)
- [x] I have not introduced unrelated changes (each PR should address one issue)
- [x] I have added comments where necessary
- [x] My branch is up to date with `main`
- [x] I have linked the related issue above
- [ ] Screenshots are included (if this is a UI change)


___

## **CodeAnt-AI Description**
Validate that a reply being pinned as the official solution is a solution-type reply

### What Changed
- When a teacher/owner provides a `replyId` to mark a doubt as solved, the target reply is now fetched from the database
- The endpoint verifies the reply exists for the doubt and that its `type` is `solution` before pinning it
- Non-existent replies return `404`, and non-solution replies return `400`; only genuine solution replies are accepted
- Toggling an existing official solution off remains unchanged

### Impact
`✅ Prevents non-solution replies (comments, AI answers) from being marked as official solutions`
`✅ Hardens the solution-marking flow against arbitrary reply IDs`
<details><summary><strong>💡 Usage Guide</strong></summary>

### Checking Your Pull Request
Every time you make a pull request, our system automatically looks through it. We check for security issues, mistakes in how you're setting up your infrastructure, and common code problems. We do this to make sure your changes are solid and won't cause any trouble later.

### Talking to CodeAnt AI
Got a question or need a hand with something? You can easily get in touch with CodeAnt AI right here. Just type the following in a comment on your pull request, and replace "Your question here" with whatever you want to ask:
<pre>
<code>@codeant-ai ask: Your question here</code>
</pre>

#### Example
<pre>
<code>@codeant-ai ask: Can you suggest a safer alternative to storing this secret?</code>
</pre>

### Retrigger review
Ask CodeAnt AI to review the PR again by typing:
<pre>
<code>@codeant-ai: review</code>
</pre>
</details>