---
title: The trade-off catalogue
slug: tradeoffs
module: reference
order: 74
status: live
level: the skill the round actually scores
summary: Fifteen recurring trade-offs with the decision rule for each — because "it depends" only scores when you say what it depends on.
---

# The trade-off catalogue

> **Naming a trade-off is not the skill. Resolving it is.** *"There's a
> trade-off between consistency and availability"* scores nothing. *"I'll take
> availability here because a stale follower count costs nothing and downtime
> costs sign-ups"* scores.

Every entry below has a **decision rule** — the thing that tips it.

---

## 1 · Vertical vs horizontal scaling

| | Vertical (bigger machine) | Horizontal (more machines) |
|---|---|---|
| Complexity | None — it is the same system | Distribution, coordination, partial failure |
| Ceiling | Hard, and you will hit it | Effectively none |
| Cost curve | Superlinear at the top end | Roughly linear |
| Failure | **Single point** | Survives node loss |

> **Rule: scale vertically until it stops being cheap, then horizontally.** A
> modern machine handles far more than people assume, and distributing early
> buys you every distributed-systems problem for load you do not have. In an
> interview, *"I'd scale up to about here, then shard on X"* beats either
> extreme.

---

## 2 · Consistency vs availability

**Only a live question during a partition** — see [CAP](cap-and-consistency.html).

> **Rule: decide per operation, not per system.** A feed can be stale;
> a payment cannot. Designing everything to the strictest requirement is how you
> get something slow *and* fragile.

---

## 3 · Latency vs throughput

| Optimising latency | Optimising throughput |
|---|---|
| Process each item immediately | Batch items together |
| Smaller batches, more overhead | Larger batches, better amortisation |
| Idle capacity is fine | Keep the pipeline full |

> **Rule: batch when the consumer is a machine, stream when it is a person
> waiting.** Analytics ingestion batches; a search box does not. And note they
> trade against each other — a system at 100% utilisation has maximal throughput
> and terrible latency, because queues are full.

---

## 4 · Read vs write optimisation

You cannot optimise both; **you choose which path pays**.

| | Fan-out on write | Fan-out on read |
|---|---|---|
| Cost at write | High | Low |
| Cost at read | **O(1) lookup** | Assemble from N sources |
| Staleness | Possible | None |

> **Rule: put the work where the traffic is not.** At 100:1 reads, precompute.
> At 1:1, do not. See [news feed](design-news-feed.html) for the hybrid that
> handles both.

---

## 5 · Normalisation vs denormalisation

| Normalised | Denormalised |
|---|---|
| One copy of each fact | Duplicated, pre-joined |
| Writes are simple and safe | **Writes must update every copy** |
| Reads need joins | Reads are one lookup |

> **Rule: normalise until a join becomes the bottleneck, then denormalise that
> specific read path** — and accept that you now own keeping the copies in sync.
> Denormalising everything up front is how you get inconsistent data nobody can
> reconcile.

---

## 6 · SQL vs NoSQL

> **Rule: the real question is whether you know your queries in advance.** If
> yes and they vary, relational. If access is by one known key at volume,
> wide-column. Postgres is the right default far longer than people expect — see
> [databases](databases.html).

---

## 7 · Strong vs eventual consistency

| Strong | Eventual |
|---|---|
| Coordination on every write | None |
| Lower availability, higher latency | Fast, always writable |
| Simple to reason about | Anomalies you must design around |

> **Rule: ask what a stale read actually costs.** Nothing → eventual. Money,
> inventory, or a uniqueness guarantee → strong. Then confine the strong path so
> it does not slow everything else.

---

## 8 · Synchronous vs asynchronous

| Sync | Async |
|---|---|
| Caller knows the outcome | Caller knows it was accepted |
| Failure surfaces immediately | Failure surfaces later, somewhere else |
| Latency = the whole chain | Latency = enqueue |
| Simple | Queues, retries, DLQs, idempotency |

> **Rule: synchronous for what the user is waiting on; asynchronous for
> everything downstream of that.** Post the tweet synchronously; fan it out
> asynchronously. The user-visible cost is that effects appear later, which is
> why the author's own view is written inline.

---

## 9 · Batch vs stream processing

| Batch | Stream |
|---|---|
| Bounded data, run on a schedule | Unbounded, continuous |
| Easy to reason about and reprocess | Windowing, late events, watermarks |
| Latency: minutes to hours | Latency: seconds |
| Cheaper per record | More infrastructure |

> **Rule: stream only when the freshness is worth the complexity.** Fraud
> detection needs seconds. A daily revenue report does not — and running it as a
> stream buys nothing while costing a great deal.

---

## 10 · Push vs pull

| Push | Pull |
|---|---|
| Server sends on change | Client asks |
| Low latency | Latency = the poll interval |
| Server tracks subscribers | Stateless server |
| Can overwhelm slow consumers | Consumer sets its own pace |

> **Rule: push when events are rare and latency matters; pull when they are
> frequent or consumers vary in speed.** Note that Kafka is *pull*-based on
> purpose — consumers fetch at their own rate, which is what makes backpressure
> work without the broker tracking every consumer's capacity.

---

## 11 · Stateless vs stateful services

> **Rule: default to stateless and push state to a shared store.** Statelessness
> is what makes load balancing, autoscaling, deploys and failure recovery
> trivial. Accept stateful only where the connection *is* the product —
> WebSocket gateways, game servers — and then plan for reconnect storms.

---

## 12 · Monolith vs microservices

> **Rule: split for organisational reasons, not technical ones.** See
> [architectural patterns](architecture-patterns.html). Availability multiplies
> downward; five services at 99.9% is 99.5%.

---

## 13 · Caching: freshness vs load

| Long TTL | Short TTL |
|---|---|
| High hit rate, low origin load | Fresher, more origin traffic |
| Staler data | Better consistency |

> **Rule: set the TTL from what a stale read costs, then jitter it.** And decide
> what happens at 0% hit rate — if the database cannot survive a cold cache, the
> cache is not an optimisation, it is a dependency. See
> [caching](caching.html).

---

## 14 · Security vs usability

| More secure | More usable |
|---|---|
| Short sessions, frequent re-auth | Long sessions |
| Strict rate limits | Generous limits |
| Fail closed | Fail open |

> **Rule: fail closed where the cost of wrongful access exceeds the cost of
> wrongful denial — and fail open where it does not.** A rate limiter whose
> backing store is down should usually fail *open*: an outage caused by your own
> protection is worse than the abuse it prevents. A permissions check should fail
> *closed*. Saying which and why is the answer.

---

## 15 · Build vs buy

| Build | Buy |
|---|---|
| Fits exactly | Fits approximately |
| You own the operations | Someone else is paged |
| No vendor risk | Lock-in, pricing changes |
| Months of engineering | Available this afternoon |

> **Rule: build only what is your differentiator.** Nobody chooses your product
> because of your queue implementation. Buy the undifferentiated parts and spend
> the engineering on the thing customers actually pay for.

---

## 16 · Cost vs performance

**The trade-off candidates most often forget exists.**

> **Rule: name the dominant cost line and optimise that, not the impressive
> one.** For a media system it is egress, not compute — so serving a correctly
> sized variant beats any amount of server tuning. Saying *"the interesting
> number here is bandwidth, not QPS"* reframes the whole design and is unusual
> enough to be memorable.

---

## 17 · Accuracy vs cost

| Exact | Approximate |
|---|---|
| Every event counted | Sampled or probabilistic |
| Expensive at scale | Orders of magnitude cheaper |

| Structure | Gives | Costs |
|---|---|---|
| **Bloom filter** | Set membership | False positives, never false negatives |
| **HyperLogLog** | Distinct count | ~2% error, kilobytes for billions |
| **Count-min sketch** | Frequency | Overestimates |
| Sampling | Trends | No exact totals |

> **Rule: ask whether anyone acts differently on an exact number.** Twitter
> shows approximate follower counts because nobody behaves differently at
> 1,240,001 than at 1.24M. A bank balance is the opposite. **Volunteering an
> approximate structure where exactness is not needed is a strong signal.**

---

## 18 · How to say a trade-off out loud

**The four-part form:**

```
1. NAME it            "there's a trade-off between X and Y here"
2. RESOLVE it         "I'm choosing X"
3. JUSTIFY from a     "because we said reads are 100x writes"
   REQUIREMENT
4. STATE THE COST     "which costs me staleness of a few seconds"
```

> *"There's a trade-off between write cost and read cost here. I'm precomputing
> on write, because we established reads are a hundred times writes — which
> costs me a few seconds of staleness and a much more expensive write path for
> users with very large followings. I'll come back to that second problem."*

**Step 4 is what separates candidates.** Anyone can choose; volunteering what
the choice costs you, before being asked, is the single highest-value behaviour
in the round.

---

## Stop condition

You can use this page when you can:

1. give the decision rule — not just the two sides — for ten of these,
2. resolve consistency per operation rather than per system,
3. argue fail-open for a rate limiter and fail-closed for permissions,
4. name egress as the dominant cost in a media design, and
5. state any trade-off in the four-part form, ending with its cost.
