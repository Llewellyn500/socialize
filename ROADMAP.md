# Socialize roadmap

This roadmap describes the direction of the project, not a promise of delivery
dates. Priorities can change when security, reliability, contributor feedback,
or user safety requires it.

Socialize remains free to use and free to self-host. Voluntary sponsorship funds
maintenance, documentation, accessibility, and security work; it does not gate
features or buy roadmap control.

## Pre-launch foundations

- [ ] Complete a clean-clone install, type-check, build, and production smoke
  test for both the hosted app and self-hosted template.
- [ ] Verify Firebase Authentication domains, Firestore and Storage rules,
  deployment identity, backups, and recovery procedures.
- [ ] Add production abuse controls, moderation workflow, and private incident
  handling before inviting public hosted accounts.
- [ ] Verify every published support mailbox and document the responsible service
  operator, privacy details, and final launch policies.
- [ ] Test sign-up, email verification, publishing, unpublishing, export,
  account deletion, social sharing, mobile layout, and link previews on
  socialize.you.
- [ ] Set up search-console ownership, submit the sitemap, and decide whether
  public profiles should be discoverable by search engines.

## Product reliability and ownership

- [ ] Add emulator coverage for important authentication, Firestore, and Storage
  rule branches.
- [ ] Improve rate-limit, abuse-prevention, and operational observability for
  public endpoints.
- [ ] Document a tested hosted-export to self-hosted conversion workflow, or add
  an importer once the schemas can be safely mapped.
- [ ] Keep the hosted and self-hosted documentation aligned through releases.
- [ ] Improve accessible editor, profile, and sharing experiences based on user
  feedback.

## Community and sustainability

- [ ] Publish regular, concise release notes and maintenance updates.
- [ ] Keep contribution, security, and support guidance current.
- [ ] Establish a transparent funding update once recurring support covers
  meaningful project costs.
- [ ] Build examples and case studies with the permission of profile owners.

## Not planned as paid feature gates

The current project direction is not to restrict existing functionality behind a
subscription, paid tier, or sponsor-only access. If that position ever changes,
the change will be discussed publicly and accompanied by clear product and
policy updates before it takes effect.
