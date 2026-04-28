# IRC Directory: `/.well-known/irc-directory.json`

**Status:** Draft
**Version:** 0.1
**Date:** 2026-04-24
**Author:** dwk (`me@dwk.io`)
**License:** [CC0 1.0](https://creativecommons.org/public-domain/cc0/) — public-domain dedication, suitable for incorporation into IRCv3 / IETF / IANA processes without licensing friction.

## Abstract

This document defines `application/irc-directory+json`, a sibling format to [`/.well-known/irc.json`](./well-known-irc-json.md). Where `irc.json` is community-self-published metadata about a single web origin's IRC presence, an `irc-directory.json` is curator-published metadata pointing at many independent networks' canonical `irc.json` documents.

The two artifacts answer different questions. `irc.json` answers "*what is this site's chat?*" `irc-directory.json` answers "*what chats exist that I might want to discover?*"

This specification, like its companion, is offered to the [IRCv3 working group](https://ircv3.net/) for adoption as an informational specification; in the absence of adoption, it remains stable at its project-hosted URL and serves as the published-specification reference for the IANA registrations in [Section 10](#10-iana-considerations).

## 1. Introduction

The companion specification [`spec/well-known-irc-json.md`](./well-known-irc-json.md) handles the case where a user navigates to a known web origin and wants to join its chat. This specification handles the case where the user does not yet know which community to join and is browsing.

Directories are independently operated. The project that defines this specification publishes one default directory; any party can publish another. Conforming Clients SHOULD permit subscribing to multiple directories simultaneously and SHOULD attribute each Network entry to the directory that surfaced it. The architectural posture mirrors the project's trust-list system: many independent curators, no central authority, user picks at first launch from a small set of independently published directories.

A Directory Operator is *not* the same as a Network Operator. The Directory makes claims about *other entities*; per-network `irc.json` makes claims about *itself*. This asymmetry shapes the threat model ([Section 9](#9-security-considerations)) and the resolution rules ([Section 8](#8-resolution-and-validation)).

The relationship to the project's trust-and-moderation memo (separate doc) is that *trust lists* make subjective judgments about Networks (block, vouch, flag) while *directories* are mostly mechanical inclusion decisions based on conformance criteria (the Network advertises an `irc.json`, meets the IRCv3 baseline, has live governance fields, passes periodic re-validation). The two systems compose: a user can subscribe to a directory for discovery and one or more trust lists for moderation signals.

## 2. Conventions and Definitions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

In this document:

- **Directory Document** — the JSON document conforming to this specification, served as `application/irc-directory+json`.
- **Directory Operator** — the entity publishing a Directory Document.
- **Directory Entry** — one Network listing inside the Directory Document's `networks` array.
- **Subscriber** — a Conforming Client that has elected to consume entries from a particular Directory Document.
- **Canonical `irc.json`** — the per-Network Discovery Document (per the companion specification) referenced by a Directory Entry's `irc_json` field; this is the authoritative source for connection parameters and full network metadata.

## 3. The Directory Document

### 3.1. Location

A Directory Operator following the well-known convention SHOULD make the Directory Document available at `/.well-known/irc-directory.json` per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615) on its origin. Directory Documents MAY also be served at any other HTTPS URL; the well-known path is a convenience for Subscribers performing default discovery on a known origin.

The Directory Document MUST be served with the `Content-Type` header `application/irc-directory+json`. The header SHOULD include `; charset=utf-8`.

Conforming Subscribers MUST NOT fetch the Directory Document over plaintext HTTP.

### 3.2. Document Format

The Directory Document is a JSON value as defined in [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259), encoded as UTF-8. The top-level value MUST be a JSON object.

### 3.3. Versioning

The Directory Document MUST contain a top-level `version` field whose value is a non-negative JSON integer. This document defines version `1`. The versioning rule is identical to the companion specification: additive-with-ignored-unknowns. Conforming Subscribers MUST ignore fields they do not recognize and MUST NOT treat their presence as a parse error. Breaking changes increment `version`. A Subscriber encountering a `version` greater than the highest version it implements MUST refuse to onboard the user from the document.

## 4. Document Schema

### 4.1. Top-level fields

| Field | Type | Conformance | Description |
| --- | --- | --- | --- |
| `version` | integer | MUST | Schema version. This document defines `1`. |
| `networks` | array of Directory Entry | MUST | Networks listed by the Directory. MAY be empty (an empty Directory is conformant). |
| `name` | string | MAY | Human-readable name of the Directory (e.g., `"irc-protocol.org default directory"`). |
| `description` | string | MAY | Short description of the Directory's scope and curation criteria. |
| `curator` | object | MAY | Information about the Directory Operator. See [Section 4.4](#44-the-curator-object). |
| `last_updated` | string ([RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) timestamp) | MAY | Time the Directory Document itself was last published. |

### 4.2. The `networks` array

The `networks` array contains zero or more Directory Entry objects. Order within the array carries no normative meaning; Conforming Subscribers MAY display entries in any order they choose (alphabetical, randomized per launch, weighted by user behavior, etc.).

The Directory Operator MAY group networks logically via the `tags` field on each entry; ordering is not the mechanism for grouping.

### 4.3. Directory Entry

Each Directory Entry describes one IRC Network. Entries are *denormalized*: they carry minimal cached data for fast browsing, plus a canonical pointer to the Network's own `irc.json` for the authoritative dataset.

| Field | Type | Conformance | Description |
| --- | --- | --- | --- |
| `name` | string | MUST | Denormalized Network name. SHOULD match the `name` field of the canonical `irc.json`. |
| `summary` | string | MUST | One- to three-sentence summary of the Network's character or community. ≤ 280 bytes UTF-8. |
| `irc_json` | string (HTTPS URL) | MUST | URL to the canonical `irc.json` document for this Network. |
| `tags` | array of string | MAY | Free-form tags categorizing the Network (e.g., `"foss"`, `"hispanophone"`, `"academic"`, `"trans-friendly"`). Lowercase RECOMMENDED. ≤ 16 entries. |
| `language` | array of string | MAY | Primary languages used in the Network's communities, as [ISO 639-1](https://www.iso.org/iso-639-language-code) two-letter codes (`"en"`, `"es"`, `"de"`, `"ja"`). ≤ 16 entries. |
| `last_validated` | string (RFC 3339 timestamp) | MAY | Time the Directory Operator last successfully validated `irc_json` (reachable, conformant, capability baseline advertised). |

The `name` and `summary` are denormalized for browse speed; the canonical source is the `irc.json` at `irc_json`. Drift between denormalized and canonical values is a curator-quality issue and is handled per [Section 8.3](#83-name-drift).

### 4.4. The `curator` object

| Field | Type | Conformance | Description |
| --- | --- | --- | --- |
| `name` | string | MAY | Curator's display name. |
| `contact` | string | MAY | Email address (bare or `mailto:` URL) or HTTPS URL where the curator can be reached. |
| `code_of_conduct` | string (HTTPS URL) | MAY | URL describing the Directory's inclusion policy and curatorial stance. |
| `submission_url` | string (HTTPS URL) | MAY | URL where Network operators can submit their Network for inclusion. |

The `curator` object is the Directory's analogue of the per-community `governance` block in the companion specification. It is *advisory and self-asserted*; Conforming Subscribers MUST NOT make security or routing decisions based on these fields.

### 4.5. Extensibility

Same rule as the companion specification: additive-with-ignored-unknowns. New fields, new sub-fields, and new enum values added in future revisions do not bump `version`; they appear and Subscribers conforming to the prior version ignore them. Only field removals or semantics changes bump `version`.

## 5. Autodiscovery

A Directory Operator MAY advertise the Directory Document via an HTML `<link>` element using the `irc` link relation (registered by the companion specification) and the `application/irc-directory+json` media type:

```html
<link rel="irc" type="application/irc-directory+json" href="/.well-known/irc-directory.json">
```

Subscribers distinguish a Directory Document from a per-community Discovery Document via the `type` attribute. A web origin MAY publish both — a self-described `irc.json` for its own community and an `irc-directory.json` curated by the same operator — by emitting two `<link rel="irc">` elements with different `type` values.

## 6. Parser Limits and Conformance

To bound exposure to malformed or hostile Directory Documents (see [Section 9.6](#96-resource-exhaustion)), Conforming Subscribers MUST enforce the following hard limits during parsing. Documents violating any limit MUST be rejected with no partial processing.

| Limit | Value |
| --- | --- |
| Maximum document size (bytes) | 1 048 576 (1 MiB) |
| Maximum JSON nesting depth | 8 |
| Maximum entries in `networks` | 1 024 |
| Maximum entries in any `tags` array | 16 |
| Maximum entries in any `language` array | 16 |
| Maximum `summary` length (bytes, UTF-8) | 280 |
| Maximum length of any other string value (bytes, UTF-8) | 2 048 |

The 1 MiB document-size limit and 1 024-entry network cap are intentionally generous; a directory of 1 024 entries averaging ~500 bytes each fits comfortably within ~512 KiB. The cap exists to reject pathological inputs, not to constrain reasonable directories.

## 7. Transport Security

### 7.1. Document fetch

Directory Documents MUST be fetched over HTTPS. URLs referenced from within the Directory Document — `irc_json`, `submission_url`, `code_of_conduct`, `curator.contact` (when an HTTPS URL form is used) — MUST themselves use HTTPS. Documents containing plaintext URLs in these fields MUST be rejected.

### 7.2. TOFU pinning

Subscribers MUST implement Trust-on-First-Use pinning per `(Subscriber, Directory URL)` pair, mirroring the per-Network pinning in the companion specification ([Section 7.3](./well-known-irc-json.md#73-trust-on-first-use-tofu-pinning)). On first successful fetch, the Subscriber records:

1. The Directory's effective hostname (after any HTTPS redirects), and
2. The SHA-256 fingerprint of the leaf TLS certificate's Subject Public Key Info.

On subsequent fetches, hostname change MUST require explicit user confirmation; SPKI rotation under unchanged hostname MAY be warned-only.

The pinning posture for directories is at least as strong as for per-Network connections because a compromised Directory has greater blast radius: it can redirect Subscribers toward arbitrary attacker-controlled Networks, not just one. The per-`(Subscriber, Directory URL)` pin is the integrity ratchet.

## 8. Resolution and Validation

When a Subscriber renders a Directory Entry in browse UI, it MAY rely on the denormalized `name` and `summary` for display.

When a Subscriber initiates a connection to a Network from a Directory Entry, it MUST fetch the canonical `irc.json` at `irc_json` and use *that* document's values (`host`, `port`, `tls`, `capabilities_required`, `governance`, `presentation`, etc.) for the connection. The Directory Entry's denormalized fields are not sufficient to connect; canonical data is authoritative.

### 8.1. Fetch failure

If the canonical `irc.json` cannot be fetched (HTTP 4xx/5xx, DNS failure, TLS handshake failure, parser-limit rejection, schema-validation failure), the Subscriber MUST surface the error to the user and MUST NOT proceed with onboarding. Subscribers SHOULD retain the failed entry in their local view of the Directory but mark it as unreachable.

### 8.2. Stale `last_validated`

If a Directory Entry's `last_validated` timestamp is older than 30 days, Subscribers SHOULD display a "stale entry" indicator alongside the entry. If older than 90 days, Subscribers MAY refuse to onboard from the entry until the user confirms acceptance of the staleness.

If `last_validated` is absent entirely, Subscribers SHOULD treat the entry as unvalidated and apply the same affordances as the 30-day-stale case.

### 8.3. Name drift

If the `name` field of the canonical `irc.json` substantively differs from the `name` in the Directory Entry, the Subscriber SHOULD warn the user that the Directory's description and the Network's self-description disagree. Drift is a curator-quality issue, not an attack signal *per se*, but the Subscriber is the only place the comparison can be made and is therefore the right place to surface it.

### 8.4. Directory chains are out of scope

Directory Entries point at canonical per-Network `irc.json` documents only. They do not point at other Directory Documents. A Subscriber MUST treat any `irc_json` URL that resolves to a `Content-Type` of `application/irc-directory+json` as malformed and MUST NOT recurse into it. Federation between directories, if needed, will be defined in a future specification with explicit recursion semantics; this version takes the simpler position that directories are flat lists of Networks.

## 9. Security Considerations

The companion specification's security analysis (`spec/well-known-irc-json.md` Section 8) applies to the per-Network `irc.json` documents that Subscribers fetch by following Directory Entry pointers. This section addresses the threats that are specific to the directory layer.

### 9.1. Hostile Directory Entry

A Directory Operator (compromised, malicious, or unintentionally negligent) lists an `irc_json` URL that points at attacker-controlled infrastructure. Subscribers following the entry are steered toward a hostile Network even though the underlying `irc.json` may itself be perfectly conformant.

**Mitigations.** The Directory Operator's reputation is the primary trust mechanism — Subscribers choose which Directories to subscribe to, and the project ships with no default subscription. The multiple-directories architecture means a compromised Directory affects only its Subscribers, not all users. TOFU pinning of the Directory's host and TLS SPKI ([Section 7.2](#72-tofu-pinning)) raises the cost of post-curation document substitution. The companion specification's per-Network TOFU pinning provides a second-layer ratchet at the Network level.

**Unmitigated case.** A new Subscriber subscribing for the first time during the active window of a Directory compromise is not protected by TOFU pinning. The mitigation falls back to Subscriber choice of which Directories to trust. This specification does not pretend otherwise.

### 9.2. Stale Pointer

The `irc_json` URL in a Directory Entry was valid at curation time but is now defunct, or has been hijacked (the original Network's domain expired and was acquired by a different party).

**Mitigations.** The `last_validated` field surfaces curation freshness to Subscribers ([Section 8.2](#82-stale-last_validated)). The companion specification's per-Network TOFU pinning catches hijacks where a returning user has an existing pin record. New users following a freshly-hijacked entry are *not* protected — same unmitigated case as Section 9.1.

### 9.3. Denormalized Snapshot Drift

The `name`, `summary`, `tags`, or `language` cached in a Directory Entry diverges from the canonical `irc.json`. The user reads one description in browse UI but connects to a Network whose self-description is materially different.

**Mitigations.** Resolution rules ([Section 8.3](#83-name-drift)) require Subscribers to surface name drift to the user during onboarding. Canonical data is authoritative for connection parameters. Drift is treated as a curator-quality issue, not an attack, but Subscribers are the only place to detect and surface it.

### 9.4. Directory Operator Compromise

An attacker gains write access to the Directory Operator's hosting (compromised CMS, leaked deploy key, supply-chain compromise of a CDN, expired domain) and substitutes the Directory Document with one that lists hostile entries.

**Mitigations.** TOFU pinning ([Section 7.2](#72-tofu-pinning)) protects returning Subscribers — a TLS SPKI change requires confirmation before reconnecting. The compromise affects only Subscribers of the affected Directory, not all users. New Subscribers during the active compromise window are not protected (same structural limit as Sections 9.1 and 9.2).

### 9.5. Subscriber Privacy

The Directory Operator can observe HTTP fetches of the Directory Document (and any per-Network `irc_json` fetches that originate from `irc_json` URLs hosted on infrastructure the Operator also controls) and infer Subscriber interests, IP addresses, and request timing.

**Mitigations.** This specification does not introduce protocol-level privacy mechanisms for Directory consumption. Subscribers concerned about Directory-Operator surveillance SHOULD consider self-hosting a Directory mirror, using a privacy-preserving fetch mechanism (Tor, VPN), or following the direct `irc.json` path on a known Network's origin without going through any Directory at all. The companion specification's [Section 8.5](./well-known-irc-json.md#85-push-gateway-as-surveillance-vector) addresses an analogous push-gateway concern at the same architectural layer.

### 9.6. Resource Exhaustion

A maliciously crafted Directory Document attempts to exhaust Subscriber resources via oversized arrays, deeply-nested objects, or document sizes large enough to consume significant memory.

**Mitigations.** Hard parser limits ([Section 6](#6-parser-limits-and-conformance)) MUST be enforced before any deserialization that materializes the document in memory. Subscribers SHOULD use streaming JSON parsers with built-in size and depth limits. Documents violating any limit MUST be rejected with no partial processing.

### 9.7. Out of scope

The following are explicitly outside this specification's scope:

- **Curation as a moderation problem.** Whether a particular Directory's inclusion criteria are appropriate, fair, or align with a given user's values is not a question this specification answers. Subscribers choose which Directories to follow; that is the only decision mechanism. Trust lists handle subjective Network-quality judgments and are out of scope for the discovery-directory layer.
- **End-to-end message confidentiality.** Inherited from the companion specification's out-of-scope statement. IRC is not E2EE; this specification does not change that.
- **Network operators acting in bad faith.** Same boundary as the companion specification: the trust-list system handles subjective network judgment.

### 9.8. Hardening considered and deferred

A future revision MAY add an optional DNS TXT record carrying a hash of the canonical Directory Document, paralleling the deferred hardening item in the companion specification ([Section 8.8](./well-known-irc-json.md#88-hardening-considered-and-deferred)). Same trade-offs apply: orthogonal-compromise check, but DNS-control friction for small operators and incomplete DNSSEC coverage. Reconsider once adopters justify the operational cost.

## 10. IANA Considerations

### 10.1. Media Type Registration

This specification requests registration of the media type `application/irc-directory+json` in the IANA "Media Types" registry per [RFC 6838](https://www.rfc-editor.org/rfc/rfc6838). The `+json` structured suffix is registered per [RFC 6839](https://www.rfc-editor.org/rfc/rfc6839). A separate cover sheet for this registration lives at `standards/iana/media-type-application-irc-directory-json.md` in the project repository.

### 10.2. Well-Known URI Registration

This specification requests registration of the URI suffix `irc-directory.json` in the IANA "Well-Known URIs" registry per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615). Companion to the `irc.json` registration requested by the companion specification. A combined cover sheet for both well-known URI registrations lives at `standards/iana/well-known-uris.md` in the project repository.

### 10.3. Link Relations

This specification does not request a new link relation. The companion specification's `irc` link relation is reused, with `type="application/irc-directory+json"` for disambiguation per [Section 5](#5-autodiscovery).

## 11. References

### 11.1. Normative References

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) — Key words for use in RFCs to Indicate Requirement Levels (BCP 14)
- [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) — Date and Time on the Internet: Timestamps
- [RFC 6838](https://www.rfc-editor.org/rfc/rfc6838) — Media Type Specifications and Registration Procedures
- [RFC 6839](https://www.rfc-editor.org/rfc/rfc6839) — Additional Media Type Structured Syntax Suffixes
- [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) — Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words
- [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) — JSON
- [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615) — Well-Known Uniform Resource Identifiers
- [ISO 639-1](https://www.iso.org/iso-639-language-code) — Language codes
- [`spec/well-known-irc-json.md`](./well-known-irc-json.md) — Companion specification: per-community IRC discovery

### 11.2. Informative References

- [`spec/prd.md`](./prd.md) — Project product-requirements document and design memo
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification) — Sibling format-relationship precedent (channel + items, OPML for directories of feeds)
- [OPML 2.0](http://opml.org/spec2.opml) — Sibling format for directories of RSS/Atom feeds; aggregator-published

## Appendix A. Example Directory Document

A non-normative example of a small Directory Document with five entries:

```json
{
  "version": 1,
  "name": "irc-protocol.org default directory",
  "description": "Curated directory of IRC networks meeting the IRCv3 onboarding baseline. Inclusion is mechanical (capability advertisement, governance fields, periodic re-validation); curation is not editorial.",
  "curator": {
    "name": "irc:// project",
    "contact": "directory@irc-protocol.org",
    "code_of_conduct": "https://irc-protocol.org/directory/policy",
    "submission_url": "https://irc-protocol.org/directory/submit"
  },
  "last_updated": "2026-04-24T00:00:00Z",
  "networks": [
    {
      "name": "Libera.Chat",
      "summary": "Largest modern IRC network. FOSS-focused. Successor to Freenode after the 2021 takeover.",
      "irc_json": "https://libera.chat/.well-known/irc.json",
      "tags": ["foss", "general"],
      "language": ["en"],
      "last_validated": "2026-04-23T18:00:00Z"
    },
    {
      "name": "OFTC",
      "summary": "Open and Free Technology Community. Used by Debian, GNOME, the Linux Foundation. Independent governance from Libera.",
      "irc_json": "https://oftc.net/.well-known/irc.json",
      "tags": ["foss", "infrastructure"],
      "language": ["en"],
      "last_validated": "2026-04-23T18:00:00Z"
    },
    {
      "name": "hackint",
      "summary": "European hacker community network. Chaos-Computer-Club-adjacent. SASL required.",
      "irc_json": "https://hackint.org/.well-known/irc.json",
      "tags": ["hacker", "european"],
      "language": ["de", "en"],
      "last_validated": "2026-04-23T18:00:00Z"
    },
    {
      "name": "tilde.chat",
      "summary": "Tildeverse network. Small public-access UNIX system communities. Strong governance, deliberately small.",
      "irc_json": "https://tilde.chat/.well-known/irc.json",
      "tags": ["tildeverse", "small-community"],
      "language": ["en"],
      "last_validated": "2026-04-23T18:00:00Z"
    },
    {
      "name": "Hispano",
      "summary": "Red IRC Hispano. Largest Spanish-language IRC network. Long-running, mainstream.",
      "irc_json": "https://irc-hispano.org/.well-known/irc.json",
      "tags": ["hispanophone", "general"],
      "language": ["es"],
      "last_validated": "2026-04-23T18:00:00Z"
    }
  ]
}
```
