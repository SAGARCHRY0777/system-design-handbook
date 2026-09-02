---
title: The checklist
slug: checklist
module: reference
order: 72
status: live
level: print this
summary: One page to review before the round — the phases, the questions, the decisions with their triggers, and the sentences worth having ready.
---

# The checklist

> One page. Review it the morning of.

---

## 1 · The round

```
1. SCOPE      0-5    functional / scale / latency / consistency. Write IN and OUT.
2. ESTIMATE   5-8    QPS, storage. ONE number that changes a decision.
3. API        8-13   3-4 endpoints, cursor pagination, entities + access patterns.
4. HIGH LEVEL 13-25  simplest thing first, then evolve under NAMED pressure.
5. DEEP DIVE  25-40  offer a choice. THREE levels. This is the score.
6. FAILURE    40-45  kill each box, summarise, name the key assumption.
```

**Minute one:** *"Let me spend five minutes on requirements, do some quick
estimates, sketch the API, then a high-level design, and leave fifteen minutes to
go deep wherever you find most interesting."*

---

## 2 · Scoping questions

```
[ ] Who uses it, and how many?
[ ] What are the top 2-3 things they do?
[ ] Read-heavy or write-heavy, and roughly what ratio?   <- most decisive
[ ] Latency target at p99?
[ ] How stale can data be?                               <- cheapest question
[ ] What is the cost of downtime vs the cost of a wrong answer?
[ ] What scale — today, or a year out?
[ ] Anything explicitly out of scope?
```

Write on the board: **IN SCOPE / OUT OF SCOPE / NON-FUNCTIONAL.**

---

## 3 · Estimation

```
actions/day / 100,000 = avg QPS      x2-3 = peak
writes/day x bytes x 365 x 3 = storage/year
peak QPS / 10,000 = app servers (round up)
hot data x entry size = cache RAM
```

| Threshold | Then |
|---|---|
| < 1,000 writes/s | One primary. **Do not shard.** |
| > 10,000 writes/s | Shard — and name the key |
| Reads > 10× writes | Cache; consider precomputation |
| > 100k reads/s | CDN / edge, not just a cache tier |
| Payload > 1 MB | Object storage + CDN; DB holds metadata |
| Peak > 5× average | Queue to absorb |

**Finish every estimate with "so this means…".**

---

## 4 · The decision table

| Requirement | Reach for | Say the cost |
|---|---|---|
| Read-heavy | Cache, replicas, precompute | Staleness, invalidation |
| Write-heavy | Queue, batching, LSM store | Eventual consistency |
| Low p99 | Cache, CDN, precompute | Cost, complexity |
| Strong consistency | Single leader, transactions | Lower availability, higher latency |
| High availability | Redundancy, quorums | Conflicts, staleness |
| Huge objects | Object storage + CDN | Extra system |
| Spiky traffic | Queue, rate limit, shed | Delay, rejected work |
| Unbounded growth | Shard | Joins, transactions, aggregates |

---

## 5 · Component defaults

| Need | Default | Change when |
|---|---|---|
| Database | **Postgres** | Writes past a primary; access is by a known key |
| Cache | Redis, cache-aside, TTL + jitter | — |
| Queue | SQS for work; Kafka for events | Replay or multiple consumers → Kafka |
| Blobs | Object storage + CDN | Never a database |
| LB | L7, least connections | — |
| Search | Elasticsearch | — |
| IDs | Snowflake | — |
| Rate limit | Token bucket at the edge, Redis + Lua | — |

---

## 6 · Deep-dive depth ladder

| Level | Sounds like |
|---|---|
| 1 | "A worker pushes posts into followers' timelines" |
| 2 | "It reads from a queue, batches by shard, capped list of 800, trimmed on insert" |
| 3 | **"Delivery is at-least-once so writes are idempotent on `tweet_id`; a crashed worker's messages are reclaimed by the consumer group after the visibility timeout; celebrities skip fan-out entirely and merge at read time"** |

**Level 3 is the interview.**

---

## 7 · Failure sweep

```
[ ] App server dies      -> stateless, health-checked, LB removes it
[ ] Cache node lost      -> consistent hashing; is the DB sized for the miss?
[ ] Whole cache tier     -> circuit breaker + load shedding
[ ] Queue backs up       -> alert on consumer lag; degrade, not break
[ ] DB leader fails      -> ~30s write pause, cold cache, possible lost async writes
[ ] Dependency SLOW      -> worse than down. Timeouts, breaker, bulkhead.
[ ] Retry storm          -> backoff + jitter + cap + retry budget
[ ] Region lost          -> in scope? If not, say so.
```

---

## 8 · Sentences worth having ready

**Opening:**
> *"Before I design anything — who uses this, how many, and what are the two or
> three most important things they do?"*

**On staleness:**
> *"How stale can this data be? That single answer decides most of the
> architecture."*

**Anti-over-engineering:**
> *"At this scale one primary handles it. I'd shard when writes approach 5,000 a
> second, and I'd shard on X."*

**Offering the deep dive:**
> *"I could go deep on the fan-out path or on how the cache is sharded and kept
> warm — which is more useful?"*

**Under pushback:**
> *"My reasoning was X — what am I missing?"*

**On not knowing:**
> *"I haven't used it. I'd reach for X here — how does it differ?"*

**Volunteering a weakness (the highest-value sentence in the round):**
> *"This gives me strong consistency, but the leader is now a write bottleneck at
> around 10,000 QPS. If we exceed that I'd shard by user ID."*

**Closing:**
> *"To summarise: [three decisions and their reasons]. The assumption this design
> leans on hardest is [X] — I'd validate that first. Given more time I'd look at
> [Y]."*

---

## 9 · The night before

```
[ ] Review numbers-to-know
[ ] Review anti-patterns
[ ] Rehearse ONE design out loud, timed, standing at a whiteboard
[ ] Prepare two questions for your interviewer
[ ] Sleep
```

**Do not learn a new design the night before.** Rehearsing one you know beats
half-learning one you do not — under pressure you fall back on what is fluent,
not on what is fresh.

---

## 10 · During

```
[ ] Say the plan at minute one
[ ] Write scope on the board and leave it there
[ ] Narrate — silence is unscored
[ ] Cite requirements when deciding
[ ] Watch the clock; be drawing by minute 13
[ ] Offer a deep-dive choice at minute 25
[ ] Stop adding at minute 40 and start killing boxes
[ ] Volunteer one weakness before being asked
[ ] Close with a summary and the key assumption
```
