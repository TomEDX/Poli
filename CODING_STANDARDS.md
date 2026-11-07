# Coding standards

Judgement rules for the code reviewer. ESLint already enforces the mechanical ones (module boundaries from ADR 0004 and 0007, function declarations for helpers at the top of a file, no use before definition), so a review never repeats what `pnpm lint` says.

Read `GLOSSARY.md` and the ADRs that touch the changed area first. A diff that contradicts an ADR is a finding, unless it says so and argues for it.

## One responsibility per file

A file changes for one reason. If describing it needs "and", it is two files. A new feature gets its own file in the module's concept folder rather than a new section in a large one.

Lay a file out so its interface reads first: imports, exported types, constants, exported functions and components (the main one first), then private helpers below the code that calls them. A constant that another constant needs at load time goes above it.

## Vocabulary

Names in code, tests and copy use the terms of `GLOSSARY.md`. A synonym the glossary says to avoid ("thème", "catégorie", "formation") is a finding. A concept the glossary lacks is worth a note for `/domain-modeling`, not an invented word.

## Layers

Routes in `src/app/` stay thin: they read through module queries and assemble the page. Business rules, validation and queries live in the module. A Server Action that writes is built with `editorWrite` (ADR 0005, 0007); validation uses the Zod schema shared with the form.

## Simplicity

The smallest change that fully meets the ticket. No option, parameter or abstraction for a need the ticket does not state; no fallback that hides an error; no copy of what an existing helper or component already does.

## Comments

A comment explains why, or how when the code cannot say it. A comment that restates the next line is a finding.

## Tests

Tests go through the public interface of the module, at the seams the ticket agreed on, and name the behaviour they protect. They do not mirror the implementation and are never weakened, skipped or special-cased to pass. A change with no test needs a reason.
