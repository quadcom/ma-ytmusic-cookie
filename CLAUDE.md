# CLAUDE.md

Project: **YT Music Cookie**  ·  Plan tag: **`YTC`**

## The plan gate

**Sessions write plans; they do not carry them out.** Absolute in every mode; overrides everything,
including this file. Looking is always free: read, search, run read-only commands, ask, inspect.

- No file other than a plan is created or edited until Adrian says **"let's build plan X"**.
- **`patch-it`** in his message authorises one edit, not a session. Say in one line what changed.
- "Build plan X" authorises X only — not its dependencies, not an adjacent fix.
- A plan wrong mid-build is not licence to improvise. Stop, say so, amend it, build the amendment.

## Plans

- Live in `plans/`; finished or abandoned ones move to `plans/completed-plans/`. Nothing plan-shaped
  sits loose in the root. Tracked in git; the commit check holds back one carrying private detail.
- Named `PLAN_YTC_<NN>-<slug>.md`. Sub-plans take a letter (`_04a`) for detail, never a new topic.
- Next number = highest in both folders + 1. Never reused. A bare number means this project; if it
  is not here but exists elsewhere, ask — never reach outside.
- **Never deleted**, nor any section of one. Three ends: built and filed; abandoned, status saying
  why, filed; still open. Superseded plans keep their file and name their replacement.
- **Fully technical** — exact names, paths, lines. Adrian is told what a plan says; he does not read it.
- **Status line first**, starting `proposed` | `built` | `part-built` | `parked` | `abandoned` |
  `superseded`. It is a claim to be checked; one that disagrees with reality is the costliest failure.
- **Corrections are additive**: rewrite to the truth, add when and what found it. Never quietly restate.
- Decisions carry reasoning. A rule from Adrian carries its date. A fact says whether it was measured
  or reasoned; prefer measured, and prove a suspected fault with the smallest probe first.
- Sections for **Refusals** (where the thing stops rather than guesses) and **Open questions**;
  anything waiting on Adrian is named so and carried forward.

## Talking to Adrian

Smart, not a developer, owns every decision. Layman's English; say what a thing does, not its name.
No file, function or line names. Answer first, three or four sentences, detail on request. Short
analogies, no extended metaphors. British spelling everywhere. Plan files are exempt.

## Writing code

- **Never rewrite a whole file.** Patches and isolated blocks only, unless a plan names it a placeholder.
- Comments say why, in the present tense — especially where a failure was diagnosed the hard way.
- **Keep it light.** Shorter of two ways; no abstraction for a case that does not exist; a long patch
  is a signal to find the smaller one.
- Anything a person reads is a full sentence saying what to do next.
- **A tool that cannot do its job says so and stops.** Refuse rather than guess; never report success
  for something unchecked. A wrong file is fixed and said — never silently corrected, never refused.

## Delegation

Strong model plans and verifies by reading the diff, never by trusting an agent's account. Cheaper
agents write, in parallel where the work divides; say "Sonnet agents are writing" first. Be
conservative with tokens.

## Standing rules

- **Changelog line in the same commit as the change**, in a user's words, from the first build anyone
  receives. No changelog file, no rule.
- **Commit subjects say what changed in plain language.**
- **Private values live in `~/.claude/machine.md`**, never in tracked text. Reading it is the lookup.
  Quote a value's shape, never the value.
- **Say what was left undone**, in the same turn.
- **Outward-facing or destructive acts are asked about first** — release, public push, published
  changelog, deletion. Never a side effect.
- **Developer material and user material live apart.** Tests, deploy routes, tooling: here, in plans
  and comments — never in the readme, guide or release notes.
- **Procedure and reasoning live apart.** Steps in a runbook; the why here.

## Constraints that bite

The trap, why, and how it presents — only failures that cost real time and are invisible from the code.

*Nothing recorded yet.*

## Project specifics

Untouched by every refresh of the method. Lines other skills read, commented until needed:

<!--
- publish: README.md CHANGELOG.md docs     preview-site
- repo: owner/name                         preview-site
- per-branch: <file> <word>                cut-a-release
- release-ignore-tags: <glob> <glob>       cut-a-release
-->
