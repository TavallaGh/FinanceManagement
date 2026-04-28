# Security Rules for Implementation and Review (Mandatory)
Project: Accounting v0
Status: Mandatory Gate
Model: Negative Scoring System

This document defines mandatory security rules for:
- Implementation
- Code review

If any rule in this document conflicts with generated code, the security rule wins.

Source alignment (from attached security evaluation PDF):
- Secure Authentication + Precise Access Control
- Cryptographic Failures

---

# 1. Security Gate Model (Negative Scoring)

Scoring model:
- Start score: 0
- Each finding adds negative points.
- A merge/release is blocked if any Critical finding exists.
- A merge/release is blocked if total score is below acceptable threshold.

Default severity weights:
- Critical: -100 (auto-block)
- High: -25
- Medium: -10
- Low: -3

Mandatory policy:
- Pull requests MUST include a security review section with findings and score.
- "No findings" must be explicit, not implicit.

---

# 2. Mandatory Implementation Rules

## 2.1 Authentication and Access Control

- All backend endpoints are authenticated by default.
- Any anonymous endpoint must be explicit and justified in code review.
- Every endpoint must enforce policy/permission checks (least privilege).
- Deny-by-default is mandatory.
- Object-level authorization (ownership/tenant scope) is mandatory for all resource access.
- Never rely on frontend checks for authorization.
- All access-control decisions must run server-side.
- Scope checks (Company/FiscalYear/Office or equivalent domain scope) are mandatory where applicable.

Endpoint-definition security constraints (mandatory):
- Grouped endpoints must use explicit API prefixes and child routes must be relative (no leading slash on child mappings).
- Every endpoint must explicitly declare authorization policy/permission; implicit unsecured defaults are forbidden.
- Endpoint-level permission checks must be least-privilege and operation-specific.
- Admin-only operations must use explicit admin policy, not broad wildcard access.

## 2.2 Token and Session Security

- Use standard token validation middleware; do not implement custom token parsing.
- Validate issuer, audience, signature, expiry, and not-before.
- Use short-lived access tokens and controlled refresh flows.
- Token replay protections must be applied where relevant.

## 2.3 Cryptographic Safety

- Do not create custom cryptographic algorithms.
- Approved cryptography only (current platform-approved algorithms/libraries).
- Forbidden: MD5, SHA1 for security, DES, RC4, ECB mode.
- Sensitive secrets/keys must never be hard-coded.
- Keys/secrets must be loaded from secure configuration providers.
- Passwords must be hashed with modern adaptive algorithms (Argon2id, bcrypt, PBKDF2 with strong parameters).
- Use TLS for all external/internal sensitive traffic; certificate validation bypass is forbidden.

## 2.4 Data Protection

- Sensitive data must not be logged.
- PII/financial-sensitive fields must be masked/redacted in logs.
- Do not expose internal security details in API error responses.
- Use parameterized data access to prevent injection.
- Avoid overexposing data; return minimum required fields.

## 2.5 Secure Defaults in Code

- Fail closed on authorization or validation failure.
- Validate all external input at boundaries.
- Reject insecure fallback paths.
- Security-relevant configuration must be explicit and environment-aware.

---

# 3. Mandatory Review Rules

Every PR review must verify and report:
- Authentication coverage for new/changed endpoints.
- Authorization policy and object-level access checks.
- Endpoint route safety checks (group prefix correctness and no absolute child route leakage).
- Endpoint contract clarity (`Produces`, status coverage, and deterministic error mapping).
- Cryptography usage and forbidden algorithms check.
- Secrets handling (no hard-coded credentials/keys/tokens).
- Logging safety (no sensitive leakage).
- Error handling and information disclosure risks.
- Data-access safety (injection-safe patterns only).

Required review output in PR:
- Findings list with severity and file references.
- Negative score calculation.
- Final decision: Pass / Block.

Block conditions:
- Any Critical finding.
- Missing authentication/authorization on protected flow.
- Cryptographic misuse or hard-coded secret exposure.

---

# 4. Non-Negotiable Forbidden Patterns

- Authorization bypasses for convenience.
- Broad wildcard permissions for protected operations.
- Hard-coded passwords, secrets, tokens, private keys.
- Disabling SSL/TLS validation in production code.
- Returning detailed stack traces/security internals to clients.
- Using obsolete or broken cryptographic primitives.

---

# 5. Definition of Done (Security)

A change is security-complete only if:
- Mandatory implementation rules are satisfied.
- Mandatory review checklist is completed.
- Security negative score is recorded.
- No block condition exists.

If any requirement fails, the change is NOT done.
