# System Design Handbook

The system design interview round: a repeatable 45-minute framework, the
building blocks, and worked designs with the trade-offs stated out loud.

**Live site:** https://SAGARCHRY0777.github.io/system-design-handbook/

---

## What this is

Most system design material is a catalogue of finished architectures. That
teaches you conclusions, and the round scores derivations — the follow-up
question is always *"why that, and not the other thing?"*

So this handbook is organised around the round rather than around the systems:

| Section | Contents |
|---|---|
| **Driving the round** | The six-phase framework with a clock, scoping questions, estimation |
| **Building blocks** | Load balancing, caching, queues, CDNs, rate limiting, search |
| **Data & storage** | Databases, sharding, replication and consistency |
| **Distributed systems** | Consistency models, idempotency, failure and recovery, observability |
| **Worked designs** | Full derivations — every choice traced to a requirement |
| **Reference** | Numbers to know, a checklist, anti-patterns, question bank |

Every page ends with a **stop condition**: the specific things you should be
able to say before moving on.

---

## The one rule

Design it yourself before reading the answer. Twenty minutes on a blank page,
out loud, with a timer — then read and mark where you differed. A design you
read is one you recognise; a design you derived is one you can defend.

---

## Local development

```bash
npm ci
npm run build     # content/*.md -> docs/
npm run serve     # preview at http://localhost:4182
```

`docs/` is committed so GitHub Pages serves it straight from `main` with no
Pages-source configuration. CI fails the build if `docs/` has drifted from
`content/`, so always commit the rebuilt output.

Adding a page means adding one markdown file to `content/` with frontmatter:

```yaml
---
title: Caching
slug: caching
module: blocks      # start | method | blocks | data | distributed | designs | reference
order: 21
status: live        # live | draft
summary: One line, used for search results and meta description.
---
```

Mermaid blocks render client-side and re-render on theme change.

---

## Companion handbooks

| Repo | Round it prepares |
|---|---|
| [dsa-handbook](https://github.com/SAGARCHRY0777/dsa-handbook) | Coding — patterns, ladders, worked solutions in Python and Java |
| [llm-handbook](https://github.com/SAGARCHRY0777/llm-handbook) | ML/LLM systems — RAG, evaluation, serving, agents |
