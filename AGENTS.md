# Project workflow

- Work in a feature branch and open a pull request against `main` for every change, unless the user explicitly requests a different workflow.
- Do not commit or push changes directly to `main`. Do not merge a PR or deploy its unmerged changes to the production ChatGPT site without an explicit request. Use the local preview for review.
- Push completed work to its feature branch, include relevant verification in the PR, and leave it open for review.
- Keep changes scoped. The lab and the unlisted `/docs/` page share the SVG renderer; verify both when changing shared rendering.
- Run `npm run check`, `npm test`, and `git diff --check` before opening or updating a PR. Visually verify UI changes in the browser. Add tests for meaningful behavior, not screenshots of source code or copies of implementation.
- Jev illustrations must follow the current official TypeSafe docs and distinguish sample answers from live inference. No API credentials belong in this static client.
