---
title: Anti-patterns
slug: anti-patterns
module: reference
order: 71
status: live
level: read this the night before
summary: The twenty things that lose points, why each one loses them, and what to do instead.
---

# Anti-patterns

> **Most candidates do not fail on knowledge. They fail on behaviour** — jumping
> to a solution, naming technologies without reasons, defending a choice instead
> of examining it. This page is the list.

---

## 1 · Process anti-patterns

### Designing before scoping

**The most common failure and the most expensive.** Drawing boxes at minute two
means you are solving a problem nobody agreed to.

> **Instead:** five minutes of questions, in-scope and out-of-scope written on
> the board, and an explicit "does that sound right?"

### Waiting to be led

If the interviewer has to ask "what next?" at every step, you failed the
structure line whatever the design looked like.

> **Instead:** state the plan at minute one, then narrate each transition — *"OK,
> requirements are settled; let me do some quick estimates."*

### Silent thinking

Thirty seconds of silence reads as being stuck. The interviewer cannot score
what they cannot hear.

> **Instead:** narrate. *"I'm weighing whether to precompute or assemble on read
> — let me think about the read/write ratio."* Even the uncertainty is signal.

### Running out of time in the deep dive

Everything before minute 25 is setup. Spending 20 minutes on requirements means
you never reach the part being scored.

> **Instead:** watch the clock. If you are at minute 25 with no diagram, say so
> and move.

### Never reaching failure

Phase 6 is a rubric line most candidates never get to, and it is easy marks.

> **Instead:** at minute 40, stop adding and start killing boxes.

---

## 2 · Technical anti-patterns

### Over-engineering

Multi-region, sharded, event-sourced — for 10,000 users.

**Interviewers actively score this as a negative**, because in real work it is
expensive and slow. It signals someone who applies patterns rather than
judgement.

> **Instead:** *"At this scale one Postgres primary handles it. I'd shard when
> writes approach 5,000 a second, and the key would be X."* Naming the trigger
> is stronger than either building it or ignoring it.

### Name-dropping without reasons

"We'll use Kafka, Cassandra, Kubernetes, Elasticsearch" with no justification is
worse than saying nothing — it invites a follow-up you cannot answer.

> **Instead:** name the *property*, then an example. *"An append-only log with
> replay and consumer groups — Kafka, or Redis Streams if we already run Redis."*

### The magic box

A box labelled "recommendation engine" with no contents.

> **Instead:** either go one level in, or scope it out explicitly. *"I'll treat
> ranking as a black box scoring candidates — happy to go deeper if that is the
> interesting part."*

### Ignoring your own requirements

Establishing 1000:1 reads and then designing a write-optimised system means the
interviewer watched you ask a question and discard the answer.

> **Instead:** cite requirements when deciding. *"Because we said staleness is
> acceptable, I can serve from an async replica."*

### Blobs in the database

Storing images or video in a relational database. It is a reliable negative
signal.

> **Instead:** object storage for bytes, database for metadata, CDN for serving.

### A cache with no invalidation story

"We'll add a cache" and nothing about staleness, invalidation, or what happens
on a miss.

> **Instead:** pattern, TTL, invalidation, hit rate assumption, and what the
> database sees when the cache is cold.

### Unbounded anything

Unbounded queues, unbounded retries, unbounded lists, unbounded cache growth.
Each is an outage with a delay attached.

> **Instead:** cap the timeline list, cap retries, size the queue and say what
> happens when it fills.

### Retries without backoff

The single most common way a real degradation becomes a real outage.

> **Instead:** exponential backoff, jitter, a cap, and a client-wide retry budget.

### Distributed locks as a correctness mechanism

Redis locks are not safe under GC pauses and clock skew. Using one to prevent
double-booking is wrong.

> **Instead:** the database constraint is the source of truth; the lock is only
> an optimisation.

### Ignoring the celebrity / hot-key case

Every fan-out design has one. Assuming uniform distribution is the flaw the
interviewer is waiting to probe.

> **Instead:** raise it yourself. Threshold, hybrid, and the reason the
> distribution forces it.

### Two-phase commit across services

It blocks, and it makes availability the product of every participant's.

> **Instead:** sagas with compensating actions, and say honestly that it is not
> atomic.

### Designing only the happy path

No timeouts, no failure discussion, everything works.

> **Instead:** every network call has a timeout; walk the diagram and kill each
> box at minute 40.

---

## 3 · Communication anti-patterns

### Defending instead of examining

Pushback is usually a probe, not a correction. Both instant capitulation and
stubbornness score badly.

> **Instead:** *"My reasoning was X — what am I missing?"* Then update if they
> are right, and say what changed your mind.

### Bluffing

Claiming familiarity with something you have not used. Interviewers find out in
one follow-up, and the credibility loss is worse than the gap.

> **Instead:** *"I haven't used it. I'd reach for X here — how does it differ?"*

### An unreadable board

By minute 30 nobody can follow the diagram, including you.

> **Instead:** leave space, label every arrow, keep scope in one corner, and
> redraw rather than overwrite.

### Presenting instead of designing

A polished final architecture delivered as a monologue, skipping the reasoning.

> **Instead:** start simple, evolve under pressure you name out loud. The
> derivation is the artefact.

### Never mentioning trade-offs

Every choice presented as obviously right.

> **Instead:** volunteer the cost of your own decision — *before* being asked.
> This is the single strongest behaviour in the round.

---

## 4 · The five that cost the most

If you fix nothing else:

| # | Anti-pattern | Replace with |
|---|---|---|
| 1 | Designing before scoping | Five minutes of questions, written down |
| 2 | Choices with no *because* | Every decision traced to a requirement |
| 3 | Presenting one right answer | Volunteering your own design's weakness |
| 4 | Over-engineering for scale nobody asked for | The simplest thing, plus the trigger to change |
| 5 | Never reaching failure analysis | Kill each box at minute 40 |

---

## 5 · The self-check

Ask yourself at minute 40:

```
[ ] Did I write down in-scope and out-of-scope?
[ ] Did one estimate change a decision?
[ ] Can I trace every major choice to a requirement?
[ ] Did I go three levels deep on at least one component?
[ ] Did I name a weakness in my own design unprompted?
[ ] Does every network call have a timeout?
[ ] Did I say what happens when the cache / queue / leader fails?
[ ] Is the board still readable?
```

**Six or more is a strong round.** Fewer than four, and the design's quality
probably will not save it.
