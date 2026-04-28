# IRC Trust Lists: `/.well-known/irc-trust-list.json`

**Status:** Draft
**Version:** 0.1
**Date:** 2026-04-24
**Author:** dwk (`me@dwk.io`)
**License:** [CC0 1.0](https://creativecommons.org/public-domain/cc0/) — public-domain dedication, suitable for incorporation into IRCv3 / IETF / IANA processes without licensing friction.

## Abstract

This document defines `application/irc-trust-list+json`, the third sibling format in the `irc://` discovery family. Where [`irc.json`](./well-known-irc-json.md) describes a single community's IRC presence and [`irc-directory.json`](./irc-directory.json.md) describes a curator's catalog of networks, an `irc-trust-list.json` describes a curator's *subjective judgments* about networks, servers, channels, or accounts — block recommendations, vouches, warnings, flags, and annotations, each with a reason code, timestamp, and expiration.

Trust Lists are independently operated, freely forkable, and never bundled by default into Conforming Clients. The architecture is modeled on Matrix's [Draupnir policy lists](https://github.com/the-draupnir-project/Draupnir): boring signed-or-fetched documents with reason codes, composed by Subscribers across multiple curators with full attribution. The project does not ship a default subscription and never aggregates signals into a single trust score.

This specification is offered to the [IRCv3 working group](https://ircv3.net/) for adoption as an informational specification; in the absence of adoption, it remains stable at its project-hosted URL and serves as the published-specification reference for the IANA registrations in [Section 10](#10-iana-considerations).

## 1. Introduction

The companion specifications handle two halves of "I want to find a chat": [`irc.json`](./well-known-irc-json.md) handles "what is *this* site's chat?" and [`irc-directory.json`](./irc-directory.json.md) handles "what chats exist that I might browse?" Neither says anything about *which chats are worth joining and which are not*. That subjective judgment lives in this third document type, deliberately separated from the discovery layer because subjective judgment must not be the discovery mechanism's responsibility.

The architectural posture is **composable trust, no arbiter.** Trust signals come from mechanical checks performed against the `governance` block in each Network's `irc.json` (CoC URL present, abuse contact reachable, capability baseline advertised, moderator coverage declared) plus subjective signals from one or more Trust Lists that the Subscriber has explicitly subscribed to. The project that defines this specification publishes no Trust List of its own and ships no default subscription. The `irc://` reference client surfaces signals from each Subscribed list with attribution and never aggregates them into a single number, color, or verdict.

The architecture is designed to defend against five failure modes that have repeatedly degraded centralized moderation systems. Each is addressed by a specific structural property of this specification:

1. **Cabal capture.** A small set of curators acquire outsized influence, becoming a *de facto* central authority. **Mitigation:** Conforming Clients MUST NOT pre-subscribe users to any Trust List. The user picks initial subscriptions from a manually presented choice at first launch. UI MUST always attribute signals to the specific Trust List that produced them.
2. **Political drift.** A list's curation criteria evolve in directions Subscribers did not anticipate. **Mitigation:** every Trust List MUST publish a charter URL describing its inclusion and exclusion criteria. Each entry MUST carry a reason code. Subscribers MAY filter their consumption of a list by reason code, taking only the slice they want.
3. **Pay-to-play.** A list's curation is influenced by undisclosed funding. **Mitigation:** every Trust List MUST publish a funding-disclosure URL. The multi-list architecture is the structural backstop — Subscribers compose multiple curators rather than relying on any one.
4. **Sybil lists.** An attacker spins up many fake-curator lists to fragment trust or to inject hostile entries by tricking Subscribers into auto-subscribing. **Mitigation:** Conforming Clients MUST NOT auto-discover or auto-trust Trust Lists. Subscriptions are always explicit user actions. There is no `<link rel>` autodiscovery for Trust Lists, deliberately distinct from the discovery and directory documents.
5. **One-bad-day.** A user does something legitimately bad once and is permanently and irrevocably labeled. **Mitigation:** every entry MUST carry an `added` timestamp and SHOULD carry an `expires` timestamp. Permanent entries are permitted only for narrowly-defined unforgivable categories (sustained child sexual exploitation material distribution, mass-scale doxxing campaigns, demonstrated state-actor coordinated harassment) and MUST be marked `permanent: true` to make their absence-of-expiration explicit.

The relationship between this specification and the project's broader trust-and-moderation design (in [`spec/prd.md`](./prd.md), Trust & moderation section) is that the design specifies *the architecture* (composable, no arbiter, mechanical signals plus subjective lists, no aggregation) and this document specifies *the wire format and Subscriber-behavior conformance* that makes the architecture operative.

## 2. Conventions and Definitions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

In this document:

- **Trust List Document** — the JSON document conforming to this specification, served as `application/irc-trust-list+json`.
- **Curator** — the entity publishing a Trust List Document.
- **Trust Entry** — one judgment, inside the Trust List Document's `entries` array, about a single Network, server, channel, or account.
- **Entity** — the target of a Trust Entry's judgment (Network, server, channel, or account).
- **Subscriber** — a Conforming Client that has explicitly elected to consume entries from a particular Trust List Document.
- **Recommendation** — the action a Trust Entry suggests to a Subscriber: `block`, `warn`, `flag`, `vouch`, or `annotate`.
- **Reason Code** — a short token identifying the basis for the Trust Entry (e.g., `harassment`, `ban-evasion`, `active-moderation`).
- **Charter** — a curator-published document describing the Trust List's inclusion criteria, scope, and editorial stance.

## 3. The Trust List Document

### 3.1. Location

A Curator following the well-known convention SHOULD make the Trust List Document available at `/.well-known/irc-trust-list.json` per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615) on its origin. Trust List Documents MAY be served at any other HTTPS URL; the well-known path is convention-only since Trust Lists are not autodiscovered by Conforming Clients (per the sybil-list mitigation in [Section 1](#1-introduction)). A Curator can publish multiple Trust Lists at distinct URLs on the same origin.

The Trust List Document MUST be served with the `Content-Type` header `application/irc-trust-list+json`. The header SHOULD include `; charset=utf-8`.

Conforming Subscribers MUST NOT fetch the Trust List Document over plaintext HTTP.

### 3.2. Document Format

The Trust List Document is a JSON value as defined in [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259), encoded as UTF-8. The top-level value MUST be a JSON object.

### 3.3. Versioning

The Trust List Document MUST contain a top-level `version` field whose value is a non-negative JSON integer. This document defines version `1`. Versioning is additive-with-ignored-unknowns, identical to the companion specifications.

### 3.4. Integrity

Trust List Document integrity in version 1 is provided by HTTPS transport and Trust-on-First-Use pinning per `(Subscriber, Trust List URL)` pair, as defined in [Section 7.2](#72-tofu-pinning). Document-level cryptographic signing (e.g., JWS, detached Ed25519 signatures) is *not* required by this specification and is reserved for a future revision if real-world adopters demonstrate a threat model — for example, syndication via untrusted relays — that HTTPS plus TOFU cannot meet. The Curator's domain is the Curator's identity in version 1.

## 4. Document Schema

### 4.1. Top-level fields

| Field | Type | Conformance | Description |
| --- | --- | --- | --- |
| `version` | integer | MUST | Schema version. This document defines `1`. |
| `curator` | object | MUST | Curator identification and disclosure. See [Section 4.2](#42-the-curator-object). |
| `entries` | array of Trust Entry | MUST | Trust judgments. MAY be empty. |
| `last_updated` | string ([RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) timestamp) | MUST | Time the Trust List Document was last published. |
| `name` | string | MAY | Human-readable name of the Trust List. |
| `description` | string | MAY | Short description of the Trust List's scope. |

### 4.2. The `curator` object

| Field | Type | Conformance | Description |
| --- | --- | --- | --- |
| `name` | string | MUST | Curator's display name. |
| `charter` | string (HTTPS URL) | MUST | URL describing the Trust List's inclusion criteria, scope, and editorial stance. Political-drift mitigation per [Section 1](#1-introduction). |
| `funding` | string (HTTPS URL) | MUST | URL disclosing the Curator's funding sources and any relationships that could constitute conflicts of interest. Pay-to-play mitigation per [Section 1](#1-introduction). |
| `contact` | string | MAY | Email address (bare or `mailto:` URL) or HTTPS URL for reaching the Curator. |
| `domain` | string | MAY | Curator's primary domain name; informational, used by Subscribers for display. |

The `charter` and `funding` URLs MUST resolve to non-empty documents at the time the Trust List Document is published. Conforming Subscribers MAY periodically re-validate that these URLs remain reachable and SHOULD warn the user if either becomes a 4xx/5xx for an extended period.

### 4.3. Trust Entry

Each Trust Entry describes one judgment about one Entity.

| Field | Type | Conformance | Description |
| --- | --- | --- | --- |
| `entity` | object | MUST | The target of the judgment. See [Section 4.4](#44-entity-types). |
| `recommendation` | string | MUST | One of `block`, `warn`, `flag`, `vouch`, `annotate`. See [Section 4.5](#45-recommendations). |
| `reason` | string | MUST | Reason Code identifying the basis for the entry. See [Section 4.6](#46-reason-codes). |
| `details` | string | MAY | Free-form human-readable expansion of the reason. ≤ 512 bytes UTF-8. |
| `evidence` | string (HTTPS URL) | MAY | URL to public evidence supporting the entry (transcript, archived post, ticket). |
| `added` | string (RFC 3339 timestamp) | MUST | When the Curator added this entry. |
| `expires` | string (RFC 3339 timestamp) | conditional | When the entry expires. REQUIRED unless `permanent` is `true`. |
| `permanent` | boolean | MAY | If `true`, entry does not expire. Reserved for narrowly-defined unforgivable categories (see [Section 4.7](#47-timestamps-and-expiration)). |

### 4.4. Entity types

The `entity` object identifies what the Trust Entry is about. Five types are defined:

| Type | Required fields | Description |
| --- | --- | --- |
| `network` | `host` | An entire IRC network. `host` is the network's primary connection host. |
| `server` | `host`, `network` | A specific server within a network. |
| `channel` | `name`, `network` | A specific channel on a network. `name` includes the leading sigil. |
| `account` | `nick`, `network` | A registered nickname on a network. Identifies the account, not a single connection. |
| `domain` | `host` | A web domain. Used to mark hostile-domain entries (phishing, malware) referenced in chat. |

Conforming Subscribers MUST treat any `entity` of an unknown `type` as if the entry's `recommendation` were `annotate` — i.e., display attributively but take no other action — until the Subscriber implementation is updated to recognize the type.

### 4.5. Recommendations

The `recommendation` field is one of five enumerated values:

| Value | Subscriber behavior |
| --- | --- |
| `block` | Subscriber MUST refuse to connect to the Entity (or Network containing it) without explicit user override. |
| `warn` | Subscriber MUST present a confirmation-required warning before allowing the user to connect/interact with the Entity. |
| `flag` | Subscriber SHOULD display a non-blocking indicator alongside the Entity in any list/browse UI. |
| `vouch` | Positive signal. Subscriber SHOULD display the vouch attribution alongside the Entity. |
| `annotate` | Informational only. Subscriber SHOULD display the Curator's `details` text without action affordances. |

Conforming Subscribers MUST treat any unknown `recommendation` value as `annotate` (display only, no action) until the Subscriber implementation is updated to recognize it.

### 4.6. Reason codes

The `reason` field is a short string identifying the basis for the entry. Reason codes are *not* enumerated normatively — Curators define their own codes per their charter — but the following conventional codes are RECOMMENDED for cross-curator consistency:

`spam`, `harassment`, `hate-speech`, `doxxing`, `stalking`, `impersonation`, `malware-distribution`, `phishing`, `ban-evasion`, `legal-takedown`, `inactive`, `unmoderated`, `governance-violation`, `csam`, `state-actor-coordination`, `active-moderation`, `transparent-funding`, `community-trusted`.

A non-normative discussion of these conventional codes is in [Appendix B](#appendix-b-recommended-reason-codes).

Reason codes are case-sensitive and SHOULD be lowercase ASCII with `-` as a word separator. Subscribers MUST NOT reject an entry for using a non-conventional reason code; the field is free-form to permit Curators to express judgments outside the conventional set.

### 4.7. Timestamps and expiration

Every Trust Entry MUST carry an `added` timestamp. Most entries MUST also carry an `expires` timestamp; the default state of an entry is to expire so that one bad day does not become a permanent label.

Permanent entries — those without an `expires` field — MUST set `permanent: true` to make the absence of expiration deliberate rather than an oversight. Curators SHOULD reserve permanent entries for the narrow categories where the underlying conduct is per-se unforgivable across reasonable curation philosophies. Examples: distribution of child sexual abuse material (`reason: csam`), demonstrated state-actor coordinated harassment campaigns (`reason: state-actor-coordination`), large-scale doxxing campaigns. Curators SHOULD NOT mark routine moderation-incident entries permanent.

Conforming Subscribers MUST honor the `expires` timestamp: an entry whose `expires` is in the past at the time of Subscriber processing MUST be treated as if absent. Subscribers MAY display recently-expired entries in a Curator-attribution context but MUST NOT apply their `recommendation` semantics.

## 5. Subscription Model

### 5.1. No default subscription

Conforming Clients MUST NOT pre-subscribe users to any Trust List. At first launch the Client MAY present a curated list of independent Trust Lists for the user to choose from, but no subscription is established without an explicit user action. This requirement is the core cabal-capture mitigation.

### 5.2. Manual subscription only

Conforming Clients MUST NOT auto-discover Trust Lists from any signal — `<link rel>` tags, embedded references in `irc.json` or `irc-directory.json` documents, server-advertised metadata, or peer recommendations. Trust List subscriptions are exclusively the result of user action. This requirement is the sybil-list mitigation.

### 5.3. Multiple lists per Subscriber

Conforming Clients MUST support simultaneous subscription to multiple Trust Lists. The Subscriber's effective trust signal for any Entity is composed from all subscribed lists' entries about that Entity, with per-list attribution preserved at every step. This requirement is the pay-to-play structural mitigation.

### 5.4. Filtering by reason code

Conforming Clients SHOULD allow Subscribers to filter their consumption of any Trust List by Reason Code. A Subscriber may, for example, subscribe to a list that publishes both `harassment` and `governance-violation` entries while accepting only the `harassment` slice. This requirement is the political-drift mitigation: subscribers can take only the part of a list whose curation criteria they endorse.

### 5.5. Composition

When a Subscriber renders information about an Entity (in a directory listing, channel-join confirmation, or DM-receive notification), it composes the relevant Trust Entries from all subscribed lists. The composition rules are:

1. **No aggregation.** The Subscriber MUST NOT compute a single trust score, color, or verdict from multiple entries. Each entry stands alone with its Curator attribution.
2. **`block` is unanimous-required** in version 1: a single subscribed list's `block` recommendation does block the Subscriber by default, but the Subscriber MUST present the per-list attribution and an override affordance. The user remains the final authority.
3. **`warn` and `flag` accumulate** with attribution: if three subscribed lists warn, the user sees three warnings and three attributions, not a single combined warning.
4. **`vouch` does not cancel `block`/`warn`** automatically. A network may simultaneously be blocked by one list and vouched-for by another; the Subscriber surfaces both signals attributively.
5. **Expired entries** (per [Section 4.7](#47-timestamps-and-expiration)) MUST NOT contribute to the composition.

The intent is *legibility over simplicity*: the user sees who said what and why, and decides. Aggregation would re-introduce the central-authority mode the architecture exists to avoid.

## 6. Parser Limits and Conformance

To bound exposure to malformed or hostile Trust List Documents, Conforming Subscribers MUST enforce the following hard limits during parsing. Documents violating any limit MUST be rejected with no partial processing.

| Limit | Value |
| --- | --- |
| Maximum document size (bytes) | 4 194 304 (4 MiB) |
| Maximum JSON nesting depth | 8 |
| Maximum entries in `entries` | 65 536 |
| Maximum length of `details` (bytes, UTF-8) | 512 |
| Maximum length of `name` and `description` (top-level) | 2 048 |
| Maximum length of any other string value (bytes, UTF-8) | 2 048 |

The 4 MiB document size and 65 536-entry cap are intentionally generous to accommodate Trust Lists that grow large over time as ban evasions, harassment patterns, and legacy entries accumulate. The cap exists to reject pathological inputs, not to constrain reasonable real-world Trust Lists.

## 7. Transport Security

### 7.1. Document fetch

Trust List Documents MUST be fetched over HTTPS. URLs referenced from within the document — `charter`, `funding`, `contact` (when an HTTPS URL form is used), `evidence` — MUST themselves use HTTPS. Documents containing plaintext URLs in these fields MUST be rejected.

### 7.2. TOFU pinning

Subscribers MUST implement Trust-on-First-Use pinning per `(Subscriber, Trust List URL)` pair, mirroring the per-Network pinning in the discovery specification ([Section 7.3 of `well-known-irc-json.md`](./well-known-irc-json.md#73-trust-on-first-use-tofu-pinning)) and the per-Directory pinning in the directory specification. On first successful fetch, the Subscriber records the Trust List's effective hostname and the SHA-256 fingerprint of the leaf TLS certificate's Subject Public Key Info.

Hostname change MUST require explicit user confirmation; SPKI rotation under unchanged hostname MAY be warned-only.

The pinning posture matters more for Trust Lists than for either of the discovery formats because Trust List compromise has the largest blast radius of the three: a compromised list can produce false-`block` entries against legitimate networks (denial of service against arbitrary chats) or false-`vouch` entries laundering hostile networks. Subscribers depending on the integrity of the Curator-they-chose are the primary protection mechanism, and TOFU is the integrity ratchet that prevents post-subscription substitution.

## 8. Security Considerations

### 8.1. Cabal capture

A small set of Curators acquire outsized influence over the ecosystem, becoming a *de facto* central trust authority despite the architecture's intent. *Mitigations:* the no-default-subscription rule ([Section 5.1](#51-no-default-subscription)) prevents Conforming Clients from privileging any Curator at install time. The per-list attribution requirement ([Section 5.5](#55-composition)) keeps the user aware of who is making each judgment. The reason-code filtering rule ([Section 5.4](#54-filtering-by-reason-code)) lets Subscribers consume slices of lists rather than entire packages, reducing the leverage any single Curator can apply.

### 8.2. Political drift

A Curator's editorial criteria evolve in directions Subscribers did not anticipate or endorse — a list founded to mark `csam` distributors expands to include political opinions the Curator disfavors. *Mitigations:* the mandatory `charter` URL ([Section 4.2](#42-the-curator-object)) gives Subscribers a baseline against which drift can be observed. The mandatory reason codes on each entry ([Section 4.6](#46-reason-codes)) enable Subscribers to filter to the specific judgments they signed up for. Subscribers SHOULD periodically re-fetch the `charter` URL and SHOULD surface diff notifications to users when the charter changes substantively; this specification does not normatively require diff notifications because the right cadence is implementation-dependent.

### 8.3. Pay-to-play

A Curator's judgments are influenced by undisclosed funding from interested parties. *Mitigations:* the mandatory `funding` URL ([Section 4.2](#42-the-curator-object)) forces structural disclosure. The multi-list architecture ([Section 5.3](#53-multiple-lists-per-subscriber)) is the primary structural backstop: a Subscriber composing signals from five Curators is harder to subvert than one relying on a single curator. Conforming Clients SHOULD surface the `funding` URL prominently in subscription-management UI.

### 8.4. Sybil lists

An attacker spins up many fake Curators, either to fragment trust into incoherent noise or to inject hostile entries by tricking Subscribers into auto-subscribing. *Mitigations:* the no-autodiscovery rule ([Section 5.2](#52-manual-subscription-only)) means Subscribers never acquire subscriptions passively. The lack of `<link rel>` autodiscovery for Trust Lists is a deliberate departure from the discovery and directory formats. Subscribers acquire Trust Lists only through deliberate human action — typing or pasting a URL, scanning a QR code, accepting an explicit recommendation from another human being out-of-band.

### 8.5. One-bad-day

A user does something legitimately bad once, is added to a Trust List, and the entry persists indefinitely after the user has changed conduct or paid social cost. *Mitigations:* the mandatory `added` timestamp and effectively-mandatory `expires` timestamp ([Section 4.7](#47-timestamps-and-expiration)) make the default state of an entry to expire. The `permanent: true` opt-out is reserved for narrow categories where the conduct is per-se unforgivable and is signaled at the schema level so Subscribers can render permanent entries differently from time-bound ones.

### 8.6. Curator compromise

An attacker gains write access to the Curator's hosting and substitutes a Trust List Document with hostile entries. *Mitigations:* TOFU pinning ([Section 7.2](#72-tofu-pinning)) detects post-subscription substitution where the attacker cannot also rotate the Curator's TLS certificate to one matching the recorded SPKI. The companion specifications' per-Network and per-Directory TOFU pins provide additional ratchets at adjacent layers — a hostile `block` entry against a legitimate network would have to also match an attacker-provided `host` and SPKI to land. New Subscribers subscribing during the active window of the compromise are not protected.

### 8.7. Subscriber privacy

The Curator can observe HTTP fetches of the Trust List Document and infer Subscriber identity, IP, and timing. *Mitigations:* none introduced at the protocol level in version 1. Subscribers concerned about Curator surveillance SHOULD consider self-hosting a Trust List mirror, fetching via Tor or VPN, or carefully selecting Curators whose privacy posture is part of their charter.

### 8.8. Resource exhaustion

A maliciously crafted Trust List Document attempts to exhaust Subscriber resources. *Mitigations:* hard parser limits ([Section 6](#6-parser-limits-and-conformance)) MUST be enforced before any deserialization that materializes the document in memory.

### 8.9. Out of scope

The following are explicitly outside this specification's scope:

- **Adjudication of whether a Curator's judgment is correct.** This specification defines the wire format and Subscriber behavior; it does not opine on whether any particular `reason: harassment` entry is rightly attributed. Adjudication is done by Subscribers choosing which Curators to follow.
- **Federation between Trust Lists.** A Trust List MUST NOT reference other Trust Lists. Each Curator publishes their own list independently. Federation, if needed, will be defined in a future specification with explicit semantics.
- **Anonymous or unauthenticated Curator publishing.** Curators are identified by their HTTPS hostname. Anonymized publishing (Tor hidden services, IPFS) is out of scope but not prohibited; Subscribers can choose to subscribe to such Curators if their tooling supports the underlying transport.
- **End-to-end message confidentiality.** Inherited from the companion specifications.

### 8.10. Hardening considered and deferred

A future revision MAY add document-level cryptographic signing (e.g., detached Ed25519 signatures with the Curator's public key published at a well-known location, or JWS-wrapped documents). Deferred from version 1 because HTTPS plus TOFU pinning is sufficient for the threat model where Curators publish on origins they control. Document-level signing becomes valuable only when Curator distribution is decoupled from Curator identity — for example, syndication via untrusted relays or IPFS mirroring.

## 9. Subscriber Behavior (Normative Summary)

The following client behaviors are normative regardless of UI design choices:

- MUST NOT auto-subscribe users to any Trust List ([Section 5.1](#51-no-default-subscription)).
- MUST NOT auto-discover Trust Lists from any in-band signal ([Section 5.2](#52-manual-subscription-only)).
- MUST surface per-list attribution alongside any Trust Entry signal ([Section 5.5](#55-composition)).
- MUST NOT compute or display an aggregate trust score across multiple Trust Lists ([Section 5.5](#55-composition)).
- MUST allow Subscribers to filter consumption of a Trust List by reason code ([Section 5.4](#54-filtering-by-reason-code)).
- MUST honor entry expiration timestamps ([Section 4.7](#47-timestamps-and-expiration)).
- MUST handle each `recommendation` per defined semantics ([Section 4.5](#45-recommendations)).
- MUST verify Curator's TOFU pin per `(Subscriber, Trust List URL)` pair ([Section 7.2](#72-tofu-pinning)).

UI presentation choices — exact visual form of attribution, badge styling, list ordering, caching strategy, polling cadence — are non-normative and left to implementation.

## 10. IANA Considerations

### 10.1. Media type registration

This specification requests registration of the media type `application/irc-trust-list+json` in the IANA "Media Types" registry per [RFC 6838](https://www.rfc-editor.org/rfc/rfc6838). The `+json` structured suffix is registered per [RFC 6839](https://www.rfc-editor.org/rfc/rfc6839). A separate cover sheet for this registration lives at `standards/iana/media-type-application-irc-trust-list-json.md` in the project repository.

### 10.2. Well-Known URI registration

This specification requests registration of the URI suffix `irc-trust-list.json` in the IANA "Well-Known URIs" registry per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615). The combined cover sheet at `standards/iana/well-known-uris.md` covers all three URI suffixes (`irc.json`, `irc-directory.json`, `irc-trust-list.json`) registered by this family of specifications.

### 10.3. Link relations

This specification does not request a link relation. Trust Lists are deliberately not autodiscovered (sybil-list mitigation per [Section 8.4](#84-sybil-lists)); the existing `irc` link relation is *not* repurposed for this format.

## 11. References

### 11.1. Normative References

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) — Key words for use in RFCs to Indicate Requirement Levels (BCP 14)
- [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) — Date and Time on the Internet: Timestamps
- [RFC 6838](https://www.rfc-editor.org/rfc/rfc6838) — Media Type Specifications and Registration Procedures
- [RFC 6839](https://www.rfc-editor.org/rfc/rfc6839) — Additional Media Type Structured Syntax Suffixes
- [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) — Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words
- [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) — JSON
- [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615) — Well-Known Uniform Resource Identifiers
- [`spec/well-known-irc-json.md`](./well-known-irc-json.md) — Companion specification: per-community IRC discovery
- [`spec/irc-directory.json.md`](./irc-directory.json.md) — Companion specification: curator-published network directories

### 11.2. Informative References

- [`spec/prd.md`](./prd.md) — Project product-requirements document, Trust & moderation section
- [Draupnir](https://github.com/the-draupnir-project/Draupnir) — Matrix moderation bot and policy-list reference architecture; primary inspiration for the composable-curator model
- [Matrix policy-list specification](https://spec.matrix.org/v1.9/client-server-api/#moderation-policy-lists) — Matrix's normative policy-list format

## Appendix A. Example Trust List Document

A non-normative example of a small Trust List Document:

```json
{
  "version": 1,
  "name": "ExampleCorp basic safety list",
  "description": "Block recommendations against networks demonstrably hosting harassment campaigns. Vouches for networks with active, transparent moderation.",
  "curator": {
    "name": "ExampleCorp Trust & Safety",
    "charter": "https://trust.example.com/charter",
    "funding": "https://trust.example.com/funding-disclosure",
    "contact": "trust@example.com",
    "domain": "example.com"
  },
  "last_updated": "2026-04-24T00:00:00Z",
  "entries": [
    {
      "entity": { "type": "network", "host": "irc.bad-network.example" },
      "recommendation": "block",
      "reason": "harassment",
      "details": "Network hosts multiple channels coordinating sustained harassment campaigns; abuse contact unresponsive over a six-month observation window.",
      "evidence": "https://trust.example.com/cases/2025-bad-network",
      "added": "2025-11-15T00:00:00Z",
      "expires": "2026-11-15T00:00:00Z"
    },
    {
      "entity": { "type": "account", "network": "irc.libera.chat", "nick": "BadActor" },
      "recommendation": "warn",
      "reason": "ban-evasion",
      "details": "Repeated registration after channel-level bans across at least four communities.",
      "added": "2026-02-01T00:00:00Z",
      "expires": "2026-08-01T00:00:00Z"
    },
    {
      "entity": { "type": "network", "host": "irc.libera.chat" },
      "recommendation": "vouch",
      "reason": "active-moderation",
      "details": "Network demonstrates documented moderation response time under 24h and publishes transparency reports.",
      "added": "2026-01-01T00:00:00Z",
      "expires": "2027-01-01T00:00:00Z"
    },
    {
      "entity": { "type": "domain", "host": "phishing-example.test" },
      "recommendation": "block",
      "reason": "phishing",
      "details": "Domain impersonates Libera.Chat login flow.",
      "added": "2026-04-01T00:00:00Z",
      "expires": "2027-04-01T00:00:00Z"
    },
    {
      "entity": { "type": "network", "host": "irc.csam-host.example" },
      "recommendation": "block",
      "reason": "csam",
      "details": "Distribution of child sexual abuse material; reported to NCMEC. Permanent.",
      "added": "2024-06-12T00:00:00Z",
      "permanent": true
    }
  ]
}
```

## Appendix B. Recommended Reason Codes

This appendix is non-normative. The following Reason Codes are conventional, used to encourage cross-curator consistency without preventing Curators from defining their own.

**Negative recommendations** (typically paired with `block`, `warn`, or `flag`):

- `spam` — automated or coordinated unsolicited advertising
- `harassment` — targeted abuse of individuals or groups
- `hate-speech` — slurs and dehumanization based on protected characteristics
- `doxxing` — publication of private information without consent
- `stalking` — sustained unwanted attention
- `impersonation` — pretending to be another person or organization
- `malware-distribution` — links or files known to deliver malware
- `phishing` — credential or social-engineering attacks
- `ban-evasion` — circumventing prior moderation actions
- `legal-takedown` — entry reflects a verifiable legal order (court, copyright office)
- `inactive` — network appears abandoned, no recent activity
- `unmoderated` — network lacks any working moderation pathway
- `governance-violation` — curator-defined breach of the network's stated rules
- `csam` — child sexual abuse material; *permanent-eligible*
- `state-actor-coordination` — attributed to coordinated state-actor harassment; *permanent-eligible*

**Positive recommendations** (typically paired with `vouch` or `flag`):

- `active-moderation` — demonstrably responsive moderation
- `transparent-funding` — funding sources publicly disclosed
- `community-trusted` — historical record of healthy community
- `good-governance` — published charter, code of conduct, appeals process

Subscribers SHOULD recognize these conventional codes for filtering purposes ([Section 5.4](#54-filtering-by-reason-code)) but MUST NOT reject entries with non-conventional codes.
