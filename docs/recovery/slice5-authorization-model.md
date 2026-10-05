# Slice 5 canonical authorization model

## Existing authoritative links

- `WorkspaceMembership` proves a user may access a workspace.
- `EducationClass.instructorId` and `studentIds` prove course membership.
- `Assignment.classId` and `teacherId` link assignment scope and instructor.
- `StudentSubmission.assignmentId`, `classId`, and `studentId` prove private submission scope.
- Canonical `KnowledgeSpaceRecord.workspaceId`, `ownerId`, and optional `classId`
  provide workspace and owner/class scope.

## Policy matrix

| Resource | Read | Create/update/delete | Cross-workspace |
|---|---|---|---|
| Class | enrolled student, instructor, elevated | assigned instructor or elevated | deny |
| Assignment | class member/instructor/elevated | assignment's assigned instructor/elevated | deny |
| Submission | submitting student, instructor, elevated | enrolled student may submit own; instructor grades | deny |
| Knowledge space/source | verified workspace member plus class membership if class-bound | owner, class instructor, elevated | deny |

`elevated` means `principal`, `admin`, or `commander`. It is not institution
authorization by itself; institution policy is **POLICY_REQUIRED** because
the seeded users/workspaces/classes do not provide authoritative institution
membership links. All missing canonical metadata denies access.

## Legacy status

Legacy workspace pages and legacy `educationStore` knowledge records lack a
canonical workspace/institution link. They are **QUARANTINE_REQUIRED** before
route migration. No guessed owner or institution was added.
