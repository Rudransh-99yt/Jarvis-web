# Slice 4 route and knowledge inventory

This inventory records the state before migration. `UNSAFE` means request data
currently establishes scope or the resource has insufficient canonical metadata
to authorize safely.

## Legacy Education router (`/api/education`)

| Route family | Methods | Target | Current actor/scope | Mutation | Status |
|---|---|---|---|---|---|
| state, institution, classes, units | GET | in-memory `educationStore` | none | no | UNSAFE: anonymous whole-sector disclosure |
| units and lessons | POST | class/unit | none | yes | UNSAFE: anonymous teacher mutation |
| lesson completion | POST | lesson | body state | yes | UNSAFE: no student ownership/enrollment check |
| assignments | GET/POST | assignment/class | query/body IDs, `teacherId` | yes | UNSAFE: forged teacher and class scope |
| submissions and grading | GET/POST | submission/assignment | query/body `studentId` | yes | UNSAFE: forged student and teacher scope |
| knowledge spaces | GET/POST | in-memory knowledge space | body class ID | yes | UNSAFE: no owner/workspace metadata |
| legacy knowledge source/query | POST | RAG source/space | body `userId`, `userRole`; fixed workspace | yes/read | UNSAFE: caller-controlled RAG identity and authorization fallback |
| workspace pages | CRUD | in-memory page | none/body | yes | UNSAFE: pages have no verified owner/tenant boundary |

Child routers (community, focus, sessions, SmartBoard, video, etc.) are outside
Slice 4 and remain unmigrated.

## Canonical Knowledge API (`/api/knowledge-spaces`)

| Endpoint family | Target | Current actor/scope | Mutation | Status |
|---|---|---|---|---|
| list/get/list sources | knowledge space/source | query `workspaceId` | no | UNSAFE: caller supplies tenant selector |
| create space | knowledge space | body `workspaceId`, `ownerId` | yes | UNSAFE: caller chooses owner/tenant |
| add/re-index source | source/space | body/source workspace | yes | UNSAFE: no principal or ownership check |
| delete source | source | source ID only | yes | UNSAFE: IDOR |
| retrieve/query | chunks/space | body workspace/source IDs | no | UNSAFE: protected content can enter context before authorization |

## Chat-reachable knowledge tools

`knowledge.source.add`, `knowledge.source.list`, `knowledge.source.ingest`,
`knowledge.source.delete`, `knowledge.retrieve`, and `knowledge.query` are
registered tools. They inherit a chat `ToolExecutionContext`, but their target
resource policies must be checked inside the tools; model arguments are not
authority. Current status: destructive capability gate exists, target ownership
and tenant checks are incomplete.

## Migration blocker

The canonical repository knowledge models have `workspaceId` and `ownerId`,
which can support a safe migration once route policies are defined. The legacy
`educationStore` objects do not consistently expose canonical workspace,
institution, owner, or membership links. A safe authorization policy cannot be
derived from missing data. Adding guessed mappings or default institutions would
create a new security boundary by convention rather than evidence.
