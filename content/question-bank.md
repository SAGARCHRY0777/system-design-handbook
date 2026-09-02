---
title: Question bank
slug: question-bank
module: reference
order: 73
status: live
level: practice prompts
summary: Sixty prompts grouped by the pattern they test, with what each one is really asking and a four-week practice schedule.
---

# Question bank

> **Questions cluster into about eight shapes.** Recognising the shape is most of
> the work — once you know a prompt is "fan-out with a hot-key problem", the
> derivation is familiar even if the domain is new.

---

## 1 · The eight shapes

| Shape | Really tests | Canonical |
|---|---|---|
| **Read-heavy key lookup** | Caching, CDN, sharding by key | URL shortener, pastebin |
| **Fan-out** | Push vs pull, hot keys, amplification | News feed, notifications |
| **Connection-oriented** | Stateful gateways, routing, presence | Chat, collaborative editing |
| **Strong consistency** | Locking, transactions, reservations | Ticketing, payments, inventory |
| **Large media** | Object storage, CDN, pipelines, cost | Video, photos, file sync |
| **Crawl / ingest** | Queues, politeness, dedup, scheduling | Web crawler, log ingestion |
| **Search / ranking** | Inverted indexes, sync, two-stage retrieval | Search, typeahead, feed ranking |
| **Geospatial** | Spatial indexing, proximity, matching | Ride-hailing, nearby, delivery |

**When you get an unfamiliar prompt, classify it first.** *"This is essentially a
fan-out problem with a hot-key case"* both orients you and shows the interviewer
you are reasoning from structure.

---

## 2 · The prompts

### Read-heavy key lookup

| Prompt | Really asking |
|---|---|
| **URL shortener** | Unique ID generation; is it enumerable? |
| Pastebin | Same, plus expiry and large text bodies |
| Key-value store | Consistent hashing, replication, quorums |
| Distributed cache | Eviction, hot keys, consistent hashing |
| **API rate limiter** | Algorithm choice, distributed counting, fail-open |
| Unique ID generator | Snowflake; clock skew; coordination-free |
| Leaderboard / top-k | Sorted sets, approximate counting, heavy hitters |
| Counting service (views) | Hot-row contention, sharded counters, sampling |

### Fan-out

| Prompt | Really asking |
|---|---|
| **Twitter / news feed** | Push vs pull; celebrity hybrid |
| Instagram | Same, plus media pipeline |
| **Notification system** | Multi-channel, provider limits, dedupe |
| Email service | Bounces, reputation, retry classification |
| Live comments | Fan-out at very low latency |
| Activity feed | Aggregation and grouping ("3 people liked…") |

### Connection-oriented

| Prompt | Really asking |
|---|---|
| **Chat / WhatsApp** | WebSockets, routing registry, ordering, presence |
| Slack | Channels, large groups, read state |
| Collaborative editor | OT or CRDTs; conflict-free merging |
| Multiplayer game backend | State sync, tick rate, lag compensation |
| Video call signalling | WebRTC, TURN, session negotiation |

### Strong consistency

| Prompt | Really asking |
|---|---|
| **Ticketmaster / seat booking** | Optimistic locking, holds, waiting room |
| Hotel / flight reservation | Same, plus multi-resource transactions |
| **Payment system** | Idempotency, ledgers, reconciliation |
| Inventory management | Oversell prevention vs compensation |
| Digital wallet | Double-entry ledger, atomic transfer |
| Distributed lock service | Fencing, lease expiry, why it is hard |
| Auction system | Bid ordering, closing-time contention |

### Large media

| Prompt | Really asking |
|---|---|
| **YouTube / Netflix** | Transcoding DAG, ABR, egress cost |
| **Dropbox / Google Drive** | Chunking, delta sync, conflicts |
| Photo sharing | Presigned upload, variants, CDN |
| Podcast / audio | Simpler pipeline, offline download |
| Backup service | Dedup, incremental, restore time |

### Crawl / ingest

| Prompt | Really asking |
|---|---|
| **Web crawler** | Politeness frontier, Bloom filter, traps |
| Log ingestion / metrics | High write volume, aggregation, retention |
| Analytics pipeline | Batch vs stream, exactly-once, late data |
| Price scraper | Politeness, scheduling, change detection |
| ETL / data warehouse | Partitioning, columnar storage, backfill |

### Search / ranking

| Prompt | Really asking |
|---|---|
| **Search engine** | Inverted index, ranking, index sync |
| **Typeahead** | Trie with precomputed top-k, latency budget |
| Product search | Faceting, filtering, relevance tuning |
| Recommendation system | Candidate generation then ranking |
| Trending topics | Sliding windows, approximate counting |

### Geospatial

| Prompt | Really asking |
|---|---|
| **Uber / ride-hailing** | Geohash or S2, matching, location updates |
| Food delivery | Same, plus multi-party state machine |
| Nearby / Yelp | Spatial index, radius query |
| Proximity alerts | Geofencing at scale |
| Maps / routing | Graph algorithms, precomputed contractions |

### Infrastructure

| Prompt | Really asking |
|---|---|
| Job scheduler / cron | Exactly-once execution, leader election |
| CI/CD system | Queues, isolation, artefact storage |
| Feature flag service | Low-latency reads, gradual rollout |
| Config service | Consistency, watch/notify, caching |
| Metrics & alerting | Time-series storage, downsampling, rules |
| Service discovery | Registry, health, propagation delay |

---

## 3 · Fifteen to actually do

**In this order.** Each adds something the previous ones did not.

| # | Design | Adds |
|---|---|---|
| 1 | URL shortener | Framework, ID generation, cache-first |
| 2 | Rate limiter | Algorithms, distributed counting |
| 3 | **News feed** | Fan-out, hot keys, the canonical question |
| 4 | **Chat** | Stateful connections, ordering |
| 5 | **Ticketing** | Strong consistency, locking |
| 6 | Photo sharing | Object storage, CDN, presigned upload |
| 7 | Web crawler | Queues, politeness, dedup structures |
| 8 | Typeahead | Latency budget, precomputation |
| 9 | **Video platform** | Pipelines, bandwidth economics |
| 10 | File sync | Chunking, conflict resolution |
| 11 | Notifications | Third parties, bulkheads, tiers |
| 12 | **Payment system** | Idempotency, ledgers, reconciliation |
| 13 | Uber | Geospatial indexing, matching |
| 14 | Metrics system | Time-series, downsampling, cardinality |
| 15 | Job scheduler | Leader election, exactly-once execution |

**The bolded six cover most of the shape space.** If you only do six, do those.

---

## 4 · A four-week schedule

**Week 1 — the method**

| Day | Do |
|---|---|
| 1 | Read the framework. Write the six phases from memory. |
| 2 | Requirements & scope. Practise the opening on three prompts, out loud. |
| 3 | Estimation. Memorise the numbers; do five estimates. |
| 4 | Design #1 (URL shortener) — yourself first, then read. |
| 5 | Design #2 (rate limiter). |
| 6 | Building blocks: load balancing, caching. |
| 7 | Rest, or redo design #1 from scratch. |

**Week 2 — blocks and the canonical designs**

| Day | Do |
|---|---|
| 8 | Queues & streams. |
| 9 | Databases & indexes. |
| 10 | Sharding + replication. |
| 11 | **Design #3 (news feed)** — the big one. |
| 12 | Redo #3 from a blank page. Compare. |
| 13 | **Design #4 (chat).** |
| 14 | CDN & object storage; design #6 (photo sharing). |

**Week 3 — the hard parts**

| Day | Do |
|---|---|
| 15 | CAP & consistency models. |
| 16 | Idempotency. |
| 17 | **Design #5 (ticketing)** — strong consistency. |
| 18 | Failure & resilience. |
| 19 | **Design #12 (payments).** |
| 20 | Observability; add monitoring to two earlier designs. |
| 21 | **Mock interview.** Non-negotiable. |

**Week 4 — fluency**

| Day | Do |
|---|---|
| 22–25 | One design per day, timed at 45 minutes, out loud, standing |
| 26 | Anti-patterns; review your recordings for them |
| 27 | Second mock |
| 28 | Checklist and numbers only. No new material. |

---

## 5 · How to practise alone

**Rehearsal has to look like the round or it does not transfer.**

```
[ ] Set a 45-minute timer. Do not pause it.
[ ] Stand at a whiteboard or use a blank digital canvas. Not an editor.
[ ] Speak out loud the entire time. Record yourself.
[ ] Do NOT look anything up mid-design.
[ ] Afterwards, listen back and mark:
      - did you scope before designing?
      - did an estimate change a decision?
      - can you trace each choice to a requirement?
      - did you go three levels deep anywhere?
      - did you volunteer a weakness?
      - how much dead silence?
```

**Listening back is uncomfortable and it is the highest-value thirty minutes in
the whole schedule.** You will hear filler, hedging, and unjustified choices that
you had no idea were there.

**Then read the write-up and mark only where you differed and why.** Places you
matched teach nothing.

---

## 6 · Judging yourself

| Signal | Where you are |
|---|---|
| Cannot start without the framework in front of you | Keep drilling the framework |
| Can produce a design but not defend the choices | Practise "why not the alternative?" on every decision |
| Can defend choices but run out of time | Timebox scoping harder; be drawing by minute 13 |
| Reach the deep dive with time left | **Ready** — now add depth on one component |
| Volunteer weaknesses unprompted | Interviewing above the bar |
