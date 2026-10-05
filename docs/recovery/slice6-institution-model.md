# Slice 6 institution membership model

Before: users had optional `institutionId`, workspaces lacked an institution,
and the only academic institution was display data. No authorization path could
prove membership.

After: persisted `Institution` and `InstitutionMembership` records explicitly
join a user to an institution; `Workspace.institutionId` scopes a workspace.
These records are the sole membership evidence. Roles, emails, IDs, headers,
and request bodies are not membership evidence.

The initial deterministic seed contains only Institution A because no existing
authoritative Institution B entities/classes/users exist. Cross-institution
fixtures and route migration remain **POLICY_REQUIRED** until that source data
is supplied or explicitly approved as test-only fixture data.

Selected legacy route family: none. Existing classes lack `institutionId`, so
even class reads cannot yet prove their tenant. Adding guessed class tenant IDs
would violate the recovery rules. Legacy education routes remain quarantined.
