# Security Policy

## Reporting a vulnerability

Please report a security vulnerability privately to
[security@socialize.you](mailto:security@socialize.you). Do not open a public
GitHub issue, post a proof of concept publicly, or include credentials, private
profile data, or other sensitive material in a report.

Include, where safe to share:

- A concise description of the issue and the affected route, component, or
  deployment.
- Steps to reproduce it with a minimal proof of concept.
- The impact you observed and any conditions required to reproduce it.
- Your preferred contact method and a reasonable disclosure timeline.

We aim to acknowledge a good-faith report within seven calendar days. We will
investigate, communicate status when practical, and coordinate a fix before
public disclosure. Response and fix timing depends on severity, reproducibility,
and the safety of affected users.

## Scope

Reports are welcome for:

- The Socialize repository and its maintained hosted application.
- The maintained self-hosted template when used without unreviewed local
  modifications.
- Hosted Socialize account, authorization, profile, upload, and API behavior.
- Exposed Socialize credentials or unsafe project configuration.

For phishing, harmful content, impersonation, or a malicious destination on a
hosted profile, use [safety@socialize.you](mailto:safety@socialize.you) or the
profile reporting route instead. Those are abuse reports, not necessarily
software vulnerabilities.

## Testing boundaries

Please act in good faith and avoid harm:

- Test only accounts and data you control.
- Stop immediately if you encounter another person's data, credentials, or
  access beyond what is needed to demonstrate the issue.
- Do not perform denial-of-service, load, stress, or broad automated scanning.
- Do not use social engineering, phishing, physical intrusion, or third-party
  testing.
- Do not test independently operated self-hosted deployments without their
  operator's permission.

Good-faith research that follows these boundaries is welcome. This policy does
not authorize unlawful activity or testing of third-party services.

## Supported versions

Security fixes are applied to the current default branch and released versions
when practical. Self-hosted operators are responsible for monitoring releases
and applying updates to their own deployments.
