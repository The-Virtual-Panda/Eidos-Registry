# {{title}}

## Intent

_Why this exists — the problem and who has it. One or two paragraphs. This is the stable part: if Intent changes substantially, you probably have a different spec, not an edit to this one._

### Assumptions

_The assumptions you're proceeding on — what you're taking as given about the problem or the world, not yet confirmed. Nested under Intent because they frame it. Surface them so a guess doesn't slip into Behaviors as if it were settled._

### Implementation Notes

_Optional, nested under Intent. The intent of the implementation — the approach you mean to take and why. Direction, not status: how you intend to build it (e.g. "reuse the existing queue"), never how far along it is. Delete if the approach is obvious or undecided._

## Open Questions

_Unresolved questions — what you don't yet know and still need answered. Kept high, right after Intent, so uncertainty is seen rather than buried. When one is settled it graduates into an Assumption, a Behavior, or a Decision._

## Behaviors & Acceptance Criteria

_What it does, as observable outcomes — the "this is what you're getting" section. If a behavior isn't listed here, it isn't promised. Label each criterion **AC1:**, **AC2:**, … (bold, unique within this spec). Group them under the requirement categories that apply as `###` sub-headings; the categories are suggestive — use what fits, AC numbers running continuously across them. Keep each AC short and checkable; push rich detail into a table or sub-section it points to. Evolves freely._

### Functional

- **AC1:** <!-- features, behaviors, business rules -->

### Performance

- **AC2:** <!-- speed, throughput, response time, capacity, concurrent users -->

### Design

- **AC3:** <!-- mandated tech, standards, regulatory rules, platform limits -->

### External interface

- **AC4:** <!-- how it connects to users, hardware, other software, networks: UI, APIs, protocols -->

### Quality attributes

- **AC5:** <!-- the other -ilities: reliability, security, usability, maintainability, scalability, portability -->

## Out of Scope

_Explicit non-goals — the section the standard leans on hardest, because this is where scope is held. A spec without it is rarely finished; it's the first thing to add when a spec feels thin._

## Dependencies

_Anything this needs to build or run: services, libraries, teams, data, other specs. The `depends_on` property at the top is the spec-only subset of this, as links. Reference other specs as markdown links — `[Session Management](../identity/session-management.md)` — never bare names._

## Testing

_How this is verified: the testing approach and the key cases that prove the behaviors hold. Reference AC labels where useful (e.g. "AC1–AC3 covered by the sign-in suite")._

## Constraints & Decisions

_Two things under one header. **Constraints**: non-functional boundaries and hard limits the build must respect — not the architecture itself. **Decisions**: an append-only log, one line each, with an optional but recommended date._

<!-- 2026-06-17: Dropped SMS fallback, carrier cost. (Brenton) -->
