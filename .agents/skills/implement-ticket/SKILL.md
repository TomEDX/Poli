---
name: implement-ticket
description: Implement one ticket in its own worktree for the software factory, test-first at the agreed seams, with conventional commits. Like implement, without the final code-review, and it merges nothing.
disable-model-invocation: true
---

Implement the work described by the ticket.

Call the Skill tool with "tdd" where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Commit your work to the current branch with conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`), one commit per distinct piece of work.

Do not call "code-review": the factory runs the reviews. Do not merge anything, and do not push: the factory does.
