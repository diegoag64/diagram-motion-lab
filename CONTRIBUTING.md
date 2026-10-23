# Contributing

## Pull requests by default

All changes go through a feature branch and a pull request targeting `main`, unless the user explicitly specifies otherwise. This includes small visual edits and documentation changes.

1. Start from current `main` and create a descriptive feature branch.
2. Implement and preview locally with `npm run dev`.
3. Run `npm run check`, `npm test`, and `git diff --check`. Check changed interactions in the browser.
4. Commit, push the feature branch, and open a PR explaining the behavior and verification.
5. Leave the PR open for review. Merge and publish only when explicitly requested; production must not become a preview of an unreviewed branch.

Do not push directly to `main`. The earlier project history predates this policy.

See [AGENTS.md](AGENTS.md) for instructions that apply to coding agents, and [Jev visual primitives](docs/jev-primitives.md) for the diagram schema and examples.
