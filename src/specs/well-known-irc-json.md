# Web Discovery for IRC: `/.well-known/irc.json`

**Status:** Draft
**Version:** 0.1
**Date:** 2026-04-24
**Author:** dwk (`me@dwk.io`)
**License:** [CC0 1.0](https://creativecommons.org/public-domain/cc0/) — public-domain dedication, suitable for incorporation into IRCv3 / IETF / IANA processes without licensing friction.

## Abstract

This document defines a discovery mechanism for [Internet Relay Chat (IRC)](https://modern.ircdocs.horse/) presence on the World Wide Web. A web origin publishes a JSON document at the well-known URI `/.well-known/irc.json` ([RFC 8615](https://www.rfc-editor.org/rfc/rfc8615)) describing its IRC network(s), channel(s), required protocol capabilities, and community-governance metadata. Consuming clients use the document to onboard users into a community's chat with no prior per-network configuration.

The mechanism is analogous to RSS autodiscovery, OpenID Connect's `openid-configuration` ([OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)), and the Matrix [`.well-known/matrix/client`](https://spec.matrix.org/v1.9/client-server-api/#well-known-uri) discovery document. It differs from those in two respects: it is specialized for IRC, and it carries machine-readable community-governance metadata (Code of Conduct, abuse contact, appeals process, moderator-coverage timezones) that no prior discovery standard exposes.

The companion link-relation type `irc` ([Section 9.1](#91-link-relations-registration)) and media type `application/irc+json` ([Section 9.3](#93-media-type-registration)) are requested for IANA registration as part of this specification.

This is a project-published specification under [CC0](https://creativecommons.org/public-domain/cc0/). It is offered to the [IRCv3 working group](https://ircv3.net/) for adoption as an informational specification; in the absence of adoption, it remains stable at its project-hosted URL and serves as the published-specification reference for the IANA registrations in [Section 9](#9-iana-considerations).

## 1. Introduction

IRC has solved the technical limitations that historically blocked mainstream adoption ([SASL](https://ircv3.net/specs/extensions/sasl-3.1), [chathistory](https://ircv3.net/specs/extensions/chathistory), [account-registration](https://github.com/ircv3/ircv3-specifications/pull/435), [`draft/webpush`](https://github.com/ircv3/ircv3-specifications/pull/471), WebSockets transport), but onboarding remains technical because there is no standard way for a web origin to advertise "this is our chat, here is how to join it." This document supplies that missing piece.

A site publishes one document. A conforming client reads that document, presents the user with a single confirmation step, and joins the user to the community. The user does not pick a network, configure a nickname, register against a services bot, or read documentation about which client to install. Friction lives in the publishing flow (which is once per origin) rather than the joining flow (which is once per user per community).

The companion product requirements document ([`spec/prd.md`](./prd.md)) describes design intent, business model, and threat model in design-prose form. This specification is the normative artifact derived from that design intent.

## 2. Conventions and Definitions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals, as shown here.

In this document:

- **Discovery Document** — the JSON document published at `/.well-known/irc.json`.
- **Publishing Site** — the web origin (scheme + host + port, per [RFC 6454](https://www.rfc-editor.org/rfc/rfc6454)) hosting the Discovery Document.
- **Network** — an IRC network advertised by the Discovery Document's `networks` array.
- **Conforming Client** — a software implementation that processes Discovery Documents per this specification.

## 3. The Discovery Document

### 3.1. Location

A Publishing Site that wishes to advertise IRC presence MUST make the Discovery Document available via HTTPS GET at the path `/.well-known/irc.json` per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615) on its origin.

The Discovery Document MUST be served with the `Content-Type` header `application/irc+json`. The header SHOULD include `; charset=utf-8`.

Conforming Clients MUST NOT fetch the Discovery Document over plaintext HTTP. A redirect from HTTP to HTTPS MAY occur upstream of the request, but the final fetch MUST occur over TLS. Clients MUST reject any Discovery Document delivered over a non-TLS final hop.

### 3.2. Document Format

The Discovery Document is a JSON value as defined in [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259), encoded as UTF-8. The top-level value MUST be a JSON object.

### 3.3. Versioning

The Discovery Document MUST contain a top-level `version` field whose value is a non-negative JSON integer. This document defines version `1`.

Versioning follows an additive-with-ignored-unknowns rule:

- Conforming Clients MUST ignore object fields they do not recognize and MUST NOT treat their presence as a parse error.
- The `version` integer is incremented only when the document format changes in a way that a client conforming to a prior version cannot safely process.
- Adding a new top-level field, a new sub-field on an existing object, a new entry to an enumerated value list, or a new optional object is *not* a breaking change and does not increment `version`.
- Removing a field, changing a field's type, or altering the meaning of an existing value *is* a breaking change and increments `version`.

A Conforming Client encountering a `version` value greater than the highest version it implements MUST refuse to onboard the user and SHOULD prompt the user to update the client.

## 4. Document Schema

### 4.1. Top-level fields

The Discovery Document is a JSON object with the following fields:

| Field | Type | Conformance | Description |
| --- | --- | --- | --- |
| `version` | integer | MUST | Schema version. This document defines `1`. |
| `networks` | array of Network | MUST | Networks advertised by this Publishing Site. MUST contain at least one entry. |
| `governance` | object | MAY | Community-policy metadata. See [Section 4.3](#43-the-governance-object). |
| `presentation` | string (HTTPS URL) | MAY | URL to a human-readable page describing the chat. See [Section 4.4](#44-the-presentation-field). |
| `icon` | string (HTTPS URL) | MAY | URL to a community icon. See [Section 4.5](#45-the-icon-field). |

### 4.2. The `networks` array

The `networks` field is a JSON array of Network objects. Each Network object describes one IRC network that the Publishing Site uses for community chat. The array MUST contain at least one entry.

Exactly one Network in the array SHOULD have `"primary": true`. The primary Network is the default target for autodiscovery user interfaces and for `irc://` URI handlers that lack a more specific target. If no Network is marked primary, Conforming Clients MUST treat the first Network in the array as primary. If more than one Network is marked primary, Conforming Clients MUST treat the first such Network as primary and SHOULD warn the publisher of the duplication via implementation-defined diagnostics.

A Network object contains the following fields:

| Field | Type | Conformance | Description |
| --- | --- | --- | --- |
| `name` | string | MUST | Human-readable network name (e.g., `"Libera.Chat"`). |
| `host` | string | MUST | Network connection host. MUST be a fully-qualified domain name or IP literal. |
| `port` | integer | MUST | Network connection port (1–65535). |
| `tls` | boolean | MUST | Whether the connection at `host:port` uses TLS. |
| `websocket` | string (HTTPS URL) | MAY | WebSockets transport endpoint. The URL MUST use the `wss://` scheme. |
| `primary` | boolean | MAY | Marks the default Network. See above. |
| `capabilities_required` | array of string | MAY | IRCv3 capability names this Network is expected to advertise. See [Section 4.2.1](#421-required-capabilities). |
| `channels` | array of Channel | MAY | Channels advertised on this Network. See [Section 4.2.2](#422-channels). |

Conforming Clients MUST NOT silently establish a plaintext (non-TLS) connection. If a Network's `tls` field is `false`, Clients MUST obtain explicit user confirmation before connecting and MUST display a clear warning that the connection is unencrypted ([Section 7.2](#72-network-connection)).

#### 4.2.1. Required capabilities

The `capabilities_required` field lists IRCv3 capability names the Network is expected to advertise during the `CAP LS` exchange. The reference baseline for safe onboarding is:

- `sasl` ([SASL 3.1](https://ircv3.net/specs/extensions/sasl-3.1))
- `chathistory` ([chathistory](https://ircv3.net/specs/extensions/chathistory))
- `account-registration` ([account-registration](https://github.com/ircv3/ircv3-specifications/pull/435))
- `draft/webpush` ([webpush](https://github.com/ircv3/ircv3-specifications/pull/471))
- `server-time` ([server-time](https://ircv3.net/specs/extensions/server-time))
- `message-tags` ([message-tags](https://ircv3.net/specs/extensions/message-tags))

Conforming Clients SHOULD verify that the listed capabilities are advertised when connecting to the Network. Clients SHOULD warn the user if any listed capability is not advertised. Networks lacking the baseline capabilities MAY still be joined, but only via a user-confirmed advanced path.

The `capabilities_required` field is informational from the publisher's perspective; the authoritative source of capabilities is the Network's own `CAP LS` response. Disagreement between the Discovery Document and `CAP LS` is treated as a publisher mistake, not a security event.

#### 4.2.2. Channels

A Channel object contains:

| Field | Type | Conformance | Description |
| --- | --- | --- | --- |
| `name` | string | MUST | IRC channel name, including its leading sigil (e.g., `"#example"`). |
| `description` | string | MAY | Short human-readable description of the channel's purpose. |

Channel names are subject to the syntax rules of [Modern IRC](https://modern.ircdocs.horse/). Conforming Clients SHOULD validate channel-name syntax and SHOULD reject documents containing malformed channel names.

### 4.3. The `governance` object

The `governance` object carries community-policy metadata. **All fields in this object are advisory and self-asserted by the Publishing Site.** Conforming Clients MUST NOT make security or routing decisions based on these fields beyond presenting them to the user.

| Field | Type | Conformance | Description |
| --- | --- | --- | --- |
| `code_of_conduct` | string (HTTPS URL) | MAY | URL to the community's Code of Conduct. |
| `abuse_contact` | string | MAY | Email address (`mailto:` URL or bare RFC 5321 address) or HTTPS URL for abuse reports. |
| `appeals` | string (HTTPS URL) | MAY | URL describing how moderation decisions can be appealed. |
| `moderator_coverage` | array of string | MAY | IANA timezone identifiers (per [RFC 6557](https://www.rfc-editor.org/rfc/rfc6557) and the [tzdata](https://www.iana.org/time-zones) database) indicating when moderators are typically active. |

Conforming Clients SHOULD surface these fields to the user during onboarding. Clients MUST NOT route abuse reports through `abuse_contact` without explicit user action; the field exists for the user to read and act on, not for the client to act on automatically.

The `governance` object MUST NOT be subject to TOFU pinning ([Section 7.3](#73-trust-on-first-use-tofu-pinning)); changes to advisory fields are not security events.

### 4.4. The `presentation` field

The `presentation` field is an HTTPS URL pointing to a human-readable page describing the chat in human terms — typically a "what this community is for, what to expect, code-of-conduct summary" landing page.

Conforming Clients SHOULD link to the `presentation` URL during onboarding via a "Learn more about this chat" affordance that opens the URL in the user's default web browser.

**Conforming Clients implementing version 1 of this specification MUST NOT render the resource at the `presentation` URL inline.** Inline rendering inside the chat client introduces an attack surface (WebView vulnerabilities, embedded-form phishing, content-spoofing) that browsers are already engineered to mitigate; this specification declines to reimplement that envelope. Inline rendering is reserved for a future revision of this specification, contingent on production experience indicating a UX gap that browser-handoff cannot meet.

### 4.5. The `icon` field

The `icon` field is an HTTPS URL pointing to an icon representing the community. SVG is RECOMMENDED for display flexibility across client form factors. PNG and JPEG are acceptable. Icons SHOULD be square and SHOULD be at least 256×256 pixels at the source resolution.

Conforming Clients MAY cache the icon resource subject to standard HTTP caching semantics ([RFC 9111](https://www.rfc-editor.org/rfc/rfc9111)).

## 5. Autodiscovery

### 5.1. The `irc` link relation

A Publishing Site MAY advertise the location of its Discovery Document via an HTML `<link>` element using the `irc` link relation type ([Section 9.1](#91-link-relations-registration)) and the `application/irc+json` media type ([Section 9.3](#93-media-type-registration)):

```html
<link rel="irc" type="application/irc+json" href="/.well-known/irc.json">
```

The `href` attribute MAY be a relative path (resolved against the document's base URL per HTML semantics) or an absolute HTTPS URL. The `type` attribute SHOULD be present and SHOULD have the value `application/irc+json`.

Conforming Clients and conforming web-browser extensions MAY scan rendered HTML documents for `<link rel="irc">` elements and use them to detect IRC presence on the Publishing Site.

The `irc` link relation is shared with the companion specification [`spec/irc-directory.json.md`](./irc-directory.json.md), which defines a sibling format `application/irc-directory+json` for curator-published lists of multiple Networks. A web origin MAY publish both — a self-described `irc.json` for its own community and an `irc-directory.json` curated by the same operator — by emitting two `<link rel="irc">` elements with different `type` attributes. Conforming Clients distinguish the two formats by the `type` attribute and process them via different code paths.

### 5.2. Direct fetch

Conforming Clients MAY also fetch the Discovery Document directly at `/.well-known/irc.json` without first parsing HTML. Per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615) §3, the well-known path is the canonical location, and discovery via the HTML `<link>` element is a hint, not a requirement.

## 6. Parser Limits and Conformance

To bound exposure to malformed or hostile Discovery Documents (see [Section 8.6](#86-schema-parsing-exploits)), Conforming Clients MUST enforce the following hard limits during parsing. Documents violating any limit MUST be rejected with no partial processing.

| Limit | Value |
| --- | --- |
| Maximum document size (bytes) | 65 536 |
| Maximum JSON nesting depth | 8 |
| Maximum entries in `networks` | 32 |
| Maximum entries in any `channels` array | 256 |
| Maximum entries in any `capabilities_required` array | 64 |
| Maximum length of any string value (bytes, UTF-8) | 2 048 |

These limits are deliberately chosen to be generous for legitimate use and tight for adversarial use. Future revisions of this specification MAY raise individual limits but MUST NOT lower them without bumping the `version` field.

## 7. Transport Security

### 7.1. Discovery Document fetch

As stated in [Section 3.1](#31-location), Discovery Documents MUST be fetched over HTTPS. Plaintext fetches MUST NOT occur. URLs referenced from within the Discovery Document (the `presentation` URL, `icon` URL, governance URLs, network `websocket` URL) MUST themselves use HTTPS or `wss://` schemes; documents containing plaintext URLs in these fields MUST be rejected.

### 7.2. Network connection

For each Network the user joins, the Conforming Client MUST connect over TLS if the Network's `tls` field is `true`. If `tls` is `false`, the Client MUST obtain explicit user confirmation before establishing a plaintext connection and MUST present a clear warning that the connection is not encrypted.

The Discovery Document MUST NOT be parsed, transformed, or fallback-handled in any way that silently downgrades a Network from TLS to plaintext.

Authentication SHOULD use SASL EXTERNAL (TLS client certificate) or SASL SCRAM with channel binding ([RFC 5802](https://www.rfc-editor.org/rfc/rfc5802)) where the Network supports it; SASL PLAIN MAY be used over TLS but MUST NOT be used over plaintext.

### 7.3. Trust on First Use (TOFU) pinning

To bound the impact of Discovery Document compromise on returning users (see [Section 8.1](#81-hostile-discovery-document-on-a-legitimate-domain)), Conforming Clients MUST implement Trust on First Use pinning per `(Publishing Site, Network)` pair.

On first successful connection to a Network advertised by a given Publishing Site, the Client MUST persistently record:

1. The `host` value from the Network object as published, and
2. The Subject Public Key Info (SPKI) fingerprint (SHA-256) of the leaf TLS certificate observed on the connection.

On subsequent connections sourced from the same `(Publishing Site, Network.name)` pair, if the published `host` value differs from the recorded value, the Client MUST present a confirmation-required warning to the user and MUST NOT reconnect without explicit user acceptance. If the published `host` is unchanged but the observed SPKI fingerprint differs from the recorded value, the Client MUST present a less-severe warning indicating that the network's certificate has rotated; the Client MAY accept the new fingerprint without blocking, but SHOULD provide a setting that promotes cert-rotation warnings to confirmation-required.

Pinning state MUST be scoped per Publishing Site; the same Network observed via two different Publishing Sites is two pin records, not one.

Pinning MUST NOT be applied to fields in the `governance` object. Governance fields are advisory and changes do not require user re-confirmation.

A Conforming Client MUST provide a user-accessible mechanism to inspect, export, and individually reset pin records.

## 8. Security Considerations

A compromise of a Publishing Site's `/.well-known/` path compromises every discovery mechanism that depends on it, this one included. The standard's job is not to prevent that class of compromise — that is the Publishing Site operator's responsibility, the same as `security.txt` ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)), the Matrix client well-known, and OIDC `openid-configuration`. The standard's job is to *not amplify the compromise*: bounded blast radius, advisory metadata that never crosses into security decisions, integrity ratchets that protect returning users.

This specification sits between Matrix (which relies on HTTPS only for client well-known fetches) and OIDC (which gets stronger guarantees by signing its JWKS with an operator-published key). The latter trick is unavailable here because there is no PKI for IRC operators. This specification therefore applies HTTPS-everywhere and user-side TOFU pinning, as defined in [Section 7](#7-transport-security), without introducing a centralized notary.

### 8.1. Hostile Discovery Document on a legitimate domain

An attacker with momentary write access to `/.well-known/` (compromised CMS, leaked deploy key, supply-chain CDN takeover, expired domain, subdomain takeover, insider threat) can publish a Discovery Document pointing at attacker-controlled infrastructure.

**Mitigations.** HTTPS is required for the Discovery Document fetch and for every URL referenced within the document ([Section 7.1](#71-discovery-document-fetch)). Conforming Clients pin `host` and observed TLS SPKI fingerprint per `(Publishing Site, Network)` pair on first successful join ([Section 7.3](#73-trust-on-first-use-tofu-pinning)) and warn on subsequent change, raising the cost of a compromise that targets returning users. Governance fields are advisory only ([Section 4.3](#43-the-governance-object)) and not pinned, so a compromise cannot weaponize advisory metadata into a security boundary. Hard parser limits ([Section 6](#6-parser-limits-and-conformance)) bound parser-level damage.

**Unmitigated case.** New users onboarding for the first time during the active window of a compromise are not protected by TOFU pinning, because they have no prior record to compare against. This specification does not claim to protect new users from a compromised origin serving a malicious Discovery Document on first contact.

### 8.2. Network impersonation via DNS or BGP

An attacker between the Conforming Client and the Network's published `host` mounts a man-in-the-middle attack on the IRC connection.

**Mitigations.** Baseline networks MUST advertise TLS ([Section 7.2](#72-network-connection)). Plaintext is reachable only via the warned advanced path and never auto-onboards. SASL EXTERNAL or SCRAM with channel binding closes credential-harvest paths. TOFU pinning of TLS SPKI fingerprint ([Section 7.3](#73-trust-on-first-use-tofu-pinning)) detects certificate substitution by an active MitM on subsequent connections.

### 8.3. Hostile `presentation` page

A Publishing Site is honest, the Network is honest, but the `presentation` HTML hosts phishing, fake install affordances, or content designed to confuse the user.

**Mitigation.** Conforming Clients MUST NOT render `presentation` HTML inline in version 1 of this specification ([Section 4.4](#44-the-presentation-field)). The reference posture is to link to the `presentation` URL via the user's default web browser, which already implements the security envelope (sandbox isolation, Content Security Policy enforcement, mixed-content blocking, anti-phishing heuristics) maintained by browser engineers. This eliminates the inline-WebView attack surface entirely.

### 8.4. Trust-list curator compromise

This threat lives downstream of the Discovery Document — at the curator-list layer that synthesizes mechanical signals from `irc.json` together with subjective judgment. It is mentioned here because the tempting but wrong fix would be to ship a default curator subscription with the Discovery Document or with conforming clients, which would centralize the failure mode this specification's design explicitly avoids.

**Mitigation.** This specification does not define a curator-list subscription mechanism. Conforming clients SHOULD allow users to subscribe to multiple independent curator lists at their discretion and MUST NOT ship a default subscription. Curator-list design is out of scope for this specification (see the project's separate trust-and-moderation memo).

### 8.5. Push gateway as surveillance vector

Out of scope for this specification but relevant to the broader system: the push relay required for mobile notifications observes notification metadata for every channel a subscribed user follows.

**Mitigation.** Reference architecture uses [`draft/webpush`](https://github.com/ircv3/ircv3-specifications/pull/471) end-to-end encrypted payloads, where the gateway sees only "user X has new traffic" but not message content. Gateways are swappable without changing user identity. The self-host path is the structural answer for users whose threat model demands it. This specification's role is limited to declaring `draft/webpush` as part of the recommended capability baseline ([Section 4.2.1](#421-required-capabilities)).

### 8.6. Schema-parsing exploits

A maliciously crafted Discovery Document attempts to crash, exhaust resources, or exploit poorly-written clients via oversized arrays, deeply-nested objects, malformed UTF-8, or billion-laughs-style expansion.

**Mitigation.** Conforming Clients MUST enforce the hard parser limits in [Section 6](#6-parser-limits-and-conformance). Documents violating any limit MUST be rejected with no partial processing. Implementations SHOULD use streaming JSON parsers with built-in depth and length limits rather than DOM-style parsers that materialize entire documents before validation.

### 8.7. Out of scope

Two threats are explicitly outside this specification's scope:

- **Network operators acting in bad faith.** This is the trust-list system's domain. Conflating discovery and judgment would re-centralize project authority. Mechanical signals from the Discovery Document are advisory; downstream curator lists do the actual judgment.
- **End-to-end message confidentiality.** IRC is not E2EE and this specification does not change that. Users whose threat model requires content confidentiality should use a protocol designed for it. This specification does not blur that distinction.

### 8.8. Hardening considered and deferred

A future revision of this specification MAY add an optional DNS TXT record carrying a hash of the canonical Discovery Document, providing an orthogonal-compromise check (web *and* DNS must be compromised to swap the document undetected, paralleling [DANE](https://www.rfc-editor.org/rfc/rfc6698) and [SSHFP](https://www.rfc-editor.org/rfc/rfc4255)). It is deferred from version 1 because many small operators do not control DNS directly and DNSSEC adoption is poor enough that pure-DNS spoofing remains a viable attack against unsigned zones.

## 9. IANA Considerations

### 9.1. Link Relations registration

This specification requests registration of the link relation `irc` in the IANA "Link Relations" registry per [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288) §4.2. Registration policy: Specification Required ([RFC 8126](https://www.rfc-editor.org/rfc/rfc8126) §4.6).

- **Relation Name:** `irc`
- **Description:** Refers to a `/.well-known/irc.json` Discovery Document describing IRC presence on the linked resource's origin, in the format defined by this specification.
- **Reference:** This document.
- **Notes:** The link relation SHOULD co-occur with `type="application/irc+json"`. The `href` MAY use a relative path or an absolute HTTPS URL.

### 9.2. Well-Known URI registration

This specification requests registration of the URI suffix `irc.json` in the IANA "Well-Known URIs" registry per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615). Registration policy: Specification Required.

- **URI suffix:** `irc.json`
- **Change controller:** the project maintainer (dwk) until and unless this specification is adopted by the IRCv3 working group or another standards body.
- **Specification document(s):** this document.
- **Status:** provisional initially; promote to permanent once non-zero adoption is documented.
- **Related information:** the `irc-directory.json` well-known URI is registered by the companion specification ([`spec/irc-directory.json.md`](./irc-directory.json.md)) as a sibling. Submission of both registrations together is recommended.

### 9.3. Media type registration

This specification requests registration of the media type `application/irc+json` in the IANA "Media Types" registry per [RFC 6838](https://www.rfc-editor.org/rfc/rfc6838). The `+json` structured suffix is registered per [RFC 6839](https://www.rfc-editor.org/rfc/rfc6839).

- **Type name:** `application`
- **Subtype name:** `irc+json`
- **Required parameters:** none.
- **Optional parameters:** `charset`. The default and only allowed value is `utf-8`.
- **Encoding considerations:** binary (UTF-8 JSON per [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)).
- **Security considerations:** see [Section 8](#8-security-considerations) of this specification. Hard parser limits ([Section 6](#6-parser-limits-and-conformance)) are mandatory; implementations that omit them are nonconforming.
- **Interoperability considerations:** Documents conform to the schema defined in [Section 4](#4-document-schema). Versioning is additive-with-ignored-unknowns per [Section 3.3](#33-versioning); clients ignore unknown fields rather than failing.
- **Published specification:** this document.
- **Applications that use this media type:** IRC clients implementing `/.well-known/irc.json` discovery (including the `irc://` reference client for Apple platforms); web browsers and browser extensions implementing autodiscovery via the `irc` link relation; hosted-service operators offering bundled IRC connectivity; civic and institutional adopters publishing `irc.json` for community chat.
- **Fragment identifier considerations:** none defined. JSON Pointer ([RFC 6901](https://www.rfc-editor.org/rfc/rfc6901)) is a valid framework but not required.
- **Restrictions on usage:** Documents at the `/.well-known/irc.json` path SHOULD be served with this media type. Documents not at that well-known path MAY use this media type if they conform to the schema.
- **Provisional registration:** initially provisional; promote to permanent once non-zero adoption is documented.
- **Author:** dwk (`me@dwk.io`).
- **Change controller:** the project maintainer (dwk) until and unless this specification is adopted by the IRCv3 working group or another standards body, at which point change control transfers accordingly.

## 10. References

### 10.1. Normative References

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) — Key words for use in RFCs to Indicate Requirement Levels (BCP 14)
- [RFC 5321](https://www.rfc-editor.org/rfc/rfc5321) — Simple Mail Transfer Protocol (for `abuse_contact` address syntax)
- [RFC 5802](https://www.rfc-editor.org/rfc/rfc5802) — Salted Challenge Response Authentication Mechanism (SCRAM)
- [RFC 6454](https://www.rfc-editor.org/rfc/rfc6454) — The Web Origin Concept
- [RFC 6557](https://www.rfc-editor.org/rfc/rfc6557) — Procedures for Maintaining the Time Zone Database
- [RFC 6838](https://www.rfc-editor.org/rfc/rfc6838) — Media Type Specifications and Registration Procedures
- [RFC 6839](https://www.rfc-editor.org/rfc/rfc6839) — Additional Media Type Structured Syntax Suffixes
- [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901) — JavaScript Object Notation (JSON) Pointer
- [RFC 8126](https://www.rfc-editor.org/rfc/rfc8126) — Guidelines for Writing an IANA Considerations Section in RFCs (BCP 26)
- [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) — Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words
- [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) — The JavaScript Object Notation (JSON) Data Interchange Format
- [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288) — Web Linking
- [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615) — Well-Known Uniform Resource Identifiers
- [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111) — HTTP Caching
- [Modern IRC](https://modern.ircdocs.horse/) — modern IRC client protocol reference
- [IRCv3 specifications](https://ircv3.net/irc/) — IRCv3 working group capability specifications

### 10.2. Informative References

- [`spec/prd.md`](./prd.md) — companion product requirements document and design memo
- [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) — A File Format to Aid in Security Vulnerability Disclosure (`security.txt`); discovery-document precedent
- [Matrix `.well-known/matrix/client`](https://spec.matrix.org/v1.9/client-server-api/#well-known-uri) — discovery-document precedent
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) — discovery-document precedent
- [RFC 4255](https://www.rfc-editor.org/rfc/rfc4255) — DNS-based SSH key fingerprints (SSHFP); deferred-hardening precedent
- [RFC 6698](https://www.rfc-editor.org/rfc/rfc6698) — DNS-Based Authentication of Named Entities (DANE); deferred-hardening precedent

## Appendix A. Example Discovery Document

A non-normative example of a Discovery Document for a hypothetical civic adopter advertising both a public Libera.Chat presence and a self-hosted internal network:

```json
{
  "version": 1,
  "networks": [
    {
      "primary": true,
      "name": "Libera.Chat",
      "host": "irc.libera.chat",
      "port": 6697,
      "tls": true,
      "websocket": "wss://web.libera.chat/webirc",
      "capabilities_required": [
        "sasl",
        "chathistory",
        "account-registration",
        "draft/webpush",
        "server-time",
        "message-tags"
      ],
      "channels": [
        { "name": "#example", "description": "General community discussion" },
        { "name": "#example-help", "description": "New-member onboarding" }
      ]
    },
    {
      "name": "Example Internal",
      "host": "irc.example.com",
      "port": 6697,
      "tls": true,
      "capabilities_required": ["sasl", "chathistory"],
      "channels": [
        { "name": "#staff", "description": "Internal coordination (invite-only)" }
      ]
    }
  ],
  "governance": {
    "code_of_conduct": "https://example.com/code-of-conduct",
    "abuse_contact": "abuse@example.com",
    "appeals": "https://example.com/moderation/appeals",
    "moderator_coverage": ["America/Los_Angeles", "Europe/Berlin"]
  },
  "presentation": "https://example.com/chat/",
  "icon": "https://example.com/chat-icon.svg"
}
```

## Appendix B. Acknowledgments

This specification draws on prior art from RSS autodiscovery, the Matrix `.well-known/matrix/client` discovery document, OpenID Connect Discovery, and `security.txt` (RFC 9116). The IRCv3 working group's capability specifications make modern-IRC onboarding tractable; this document depends on that body of work and exists to bridge it to web-origin discovery. [soju](https://soju.im/) and [pushgarden](https://pushgarden.emersion.fr/) by Simon Ser (emersion) are the reference open-source bouncer and push-gateway implementations the architecture assumes.
