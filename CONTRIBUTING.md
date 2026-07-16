# Contributing to Socialize

Thanks for helping make Socialize more useful, dependable, and portable for
people who build software. Contributions are welcome from first-time and
experienced contributors alike.

## Before you start

- Read the [Code of Conduct](./CODE_OF_CONDUCT.md).
- Read the [Security Policy](./SECURITY.md). Do not open a public issue for a
  vulnerability, exposed credential, or privacy-sensitive incident.
- For a substantial feature or a change that alters product direction, open an
  issue first. It prevents duplicate work and lets maintainers agree on scope.
- Keep the hosted app and self-hosted template intentionally distinct. Their
  top-level profile schemas are related, but are not interchangeable.

## Local setup

Use Node.js 22 and npm. The repository pins Node 22 in .nvmrc and the
continuous-integration workflow uses the same version.

~~~bash
npm ci
cp .env.example .env.local
npm run dev
~~~

In PowerShell, replace the copy command with:

~~~powershell
Copy-Item .env.example .env.local
~~~

The marketing site and local demo mode work without Firebase environment
values. Authentication, persistence, uploads, and hosted-profile checks require
a Firebase project configured as described in the README.

To work on the standalone template:

~~~bash
cd self-hosted-template
npm ci
cp .env.example .env.local
npm run dev
~~~

## Development workflow

1. Create a focused branch from the current default branch.
2. Make the smallest change that solves the problem.
3. Keep accessibility, reduced-motion support, keyboard use, and narrow-screen
   layouts in mind.
4. Do not commit credentials, production exports, user data, screenshots with
   private data, or generated dependency directories.
5. Update user-facing documentation whenever behavior, setup, data portability,
   or a security boundary changes.

Run the checks relevant to your change before opening a pull request:

~~~bash
npm run lint
npm run build
~~~

For a self-hosted-template change:

~~~bash
cd self-hosted-template
npm run typecheck
npm run build
~~~

When changing logos or app-icon sources, regenerate derived brand assets:

~~~bash
npm run brand:assets
~~~

## What makes a useful issue

Include the smallest reproducible example, the expected and actual behavior,
the affected route or component, and the environment where it occurred. A
screen recording or screenshot is welcome when it removes ambiguity, provided
it contains no secrets or personal data.

Use the issue forms for bugs, documentation gaps, and product ideas. Use the
support and security channels in [SUPPORT.md](./SUPPORT.md) when an issue form
is not appropriate.

## Pull requests

Keep pull requests reviewable:

- Explain the problem and the outcome, not only the implementation.
- Link the related issue when one exists.
- Call out user-visible changes and migration or deployment consequences.
- List the checks you ran and anything you could not verify.
- Include before-and-after screenshots for visual changes when practical.
- Avoid unrelated formatting churn.

By contributing, you agree that your contribution may be distributed under the
[MIT License](./LICENSE).
