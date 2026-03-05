# Architecture Decision Records

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. ADRs are used to record the motivation behind decisions so that future team members can understand why certain choices were made.

## Format

This project uses the Nygard-style ADR format:

- **Title**: Short noun phrase describing the decision
- **Status**: Proposed, Accepted, Deprecated, or Superseded
- **Context**: The forces at play, including technical, political, social, and project-specific
- **Decision**: The change that is being proposed or has been agreed upon
- **Consequences**: What becomes easier or harder as a result of this decision
- **Alternatives Considered**: Other options that were evaluated

## Index

| ADR | Title | Status | Date |
| --- | ----- | ------ | ---- |
| [001](001-react-context-state.md) | React Context for Centralized State | Accepted | 2026-03-05 |
| [002](002-annotation-based-state.md) | Annotation-Based State Without CRDs | Accepted | 2026-03-05 |
| [003](003-static-pod-discovery.md) | Static Pod Discovery with Label Selector Fallback | Accepted | 2026-03-05 |
| [004](004-component-testing-strategy.md) | Comprehensive Component-Level Testing with Shared Helpers | Accepted | 2026-03-05 |

## Creating New ADRs

1. Copy an existing ADR as a template
2. Assign the next sequential number (e.g., `005-your-decision.md`)
3. Fill in all sections following the Nygard-style format
4. Set the status to `Proposed` until the team has reviewed and accepted
5. Update the index table in this README
6. Add a changelog entry at the bottom of the ADR

## References

- [Michael Nygard's article on ADRs](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub organization](https://adr.github.io/)
