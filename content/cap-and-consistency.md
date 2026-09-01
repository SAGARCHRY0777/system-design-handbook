---
title: CAP & consistency models
slug: cap-and-consistency
module: distributed
order: 40
status: live
level: advanced — high senior signal
summary: What CAP actually says and what people wrongly think it says, PACELC, the consistency models ordered by strength, and how to pick per operation.
---

# CAP and consistency models

> **CAP is the most misquoted theorem in system design interviews.** Stating it
> correctly is a fast, cheap signal — and stating it incorrectly is a fast,
> cheap negative one.

---

## 1 · What CAP actually says

> Among **C**onsistency, **A**vailability, and **P**artition tolerance, a
> distributed system can guarantee at most two.

**The correct reading**, which most candidates miss:

**Partitions are not a choice.** Networks drop packets, links fail, switches
reboot. If your system spans machines, it will be partitioned eventually. So
"CP or AP or CA" is a false trichotomy — **CA is not available to you**, and
choosing it means choosing a single machine.

> **CAP is a question about one moment: *during a partition*, do you return a
> possibly-stale answer, or refuse to answer?** That is it. It says nothing
> about the other 99.99% of the time, and it is not a description of a database's
> general character.

Also note the definitions are narrower than the words suggest:

- **Consistency** here means *linearizability* — every read sees the latest
  write, as though there were one copy. It is not ACID's C.
- **Availability** means *every* non-failing node answers *every* request.
  A system that stays up for 99.9% of requests is not "A" in CAP's sense.

**So "MongoDB is CP and Cassandra is AP" is a rough shorthand at best.** Both are
tunable per query. Saying *"Cassandra defaults to AP but with `QUORUM` reads and
writes it behaves closer to CP"* is more accurate and more impressive than the
label.

---

## 2 · PACELC — the more useful version

CAP only describes the partition case, which is rare. **PACELC covers the normal
case too**, and it is the extension worth naming:

> **If Partition: choose Availability or Consistency.
> Else (normal operation): choose Latency or Consistency.**

**The "else" branch is where your system actually lives.** Every synchronous
replication decision is a latency-versus-consistency trade made while the network
is perfectly healthy.

| System | Classification | Meaning |
|---|---|---|
| Cassandra (default) | PA/EL | Available under partition; fast over consistent normally |
| DynamoDB | PA/EL (tunable) | Same, with strongly-consistent reads available on request |
| MongoDB | PC/EC | Consistent under partition; consistent normally |
| Spanner | PC/EC | Consistency always, and pays latency for it |
| Postgres (single node) | CA-ish | No partition to tolerate; not a distributed system |

> **Bringing up PACELC unprompted is one of the highest-value things you can say
> in a design round.** It signals you understand the trade-off exists during
> normal operation, not just during failures — which is the thing CAP's fame
> obscures.

---

## 3 · The consistency models, ordered

Strongest at the top. Each is cheaper and weaker than the one above.

| Model | Guarantee | Cost |
|---|---|---|
| **Linearizable** | Every read sees the latest committed write; the system behaves like one copy | Coordination on every operation |
| **Sequential** | All nodes see operations in the same order; not necessarily real-time | Slightly cheaper |
| **Causal** | Causally related operations are seen in order; concurrent ones may differ | Track causality; no global coordination |
| **Read-your-writes** | You see your own writes | Route reads to leader, or track position |
| **Monotonic reads** | You never see time go backwards | Sticky routing |
| **Eventual** | Absent new writes, replicas converge | Almost none |

**Two clarifications that come up:**

**Eventual consistency has no bound.** "Eventually" is not "within 100 ms" — it
is a liveness property with no timing guarantee. In practice it is milliseconds;
in a partition it can be minutes.

**Causal consistency is the sweet spot most systems actually want**, and naming
it scores. It prevents the anomalies users actually notice — a reply appearing
before the comment it answers, a deletion undone by a stale update — without the
coordination cost of linearizability.

---

## 4 · Linearizability versus serializability

Frequently confused, and distinguishing them is a strong senior signal.

| | Linearizability | Serializability |
|---|---|---|
| **Concerns** | Single operations on single objects | Transactions over many objects |
| **Guarantees** | Real-time ordering — a read after a write sees it | *Some* serial order exists |
| **From** | Distributed systems | Databases |
| **Together** | **Strict serializability** — what Spanner provides |

The gap matters: a serializable database may execute your transactions in an
order that does not match real time, so a transaction that committed before
yours started can appear after it. For most applications that is fine. For
anything where an external observer compares timestamps — audit logs,
cross-system reconciliation — it is not.

---

## 5 · Choosing per operation, not per system

**The most important practical point on this page.** "Is this system CP or AP?"
is the wrong granularity. The same product needs different answers for different
operations.

| Operation | Needs | Why |
|---|---|---|
| View a feed | Eventual | Seconds of staleness is invisible |
| View follower count | Eventual | Approximate is fine — Twitter shows approximations |
| Post a message | Read-your-writes | The author must see their own post |
| Add to cart | Causal | Order matters; availability matters more than exactness |
| **Checkout / payment** | **Linearizable** | Double-charging is unacceptable |
| Inventory decrement | Linearizable, or compensating | Overselling has real cost |
| Username registration | Linearizable | Uniqueness is the entire point |

> *"Ninety-nine percent of this system is eventually consistent, and I'm happy
> with that. The checkout path is the exception — inventory decrement and payment
> capture need strong consistency, so those go through a single-leader path with
> transactions, and I accept the lower availability on that specific path."*

**That sentence is a complete, senior answer to the consistency question.** It
shows you know strong consistency is expensive, that you only pay for it where
it earns its keep, and that you can identify where that is.

---

## 6 · Making eventual consistency acceptable

The follow-up: *"how do users not notice?"*

| Technique | Effect |
|---|---|
| **Read your own writes** | Users judge staleness mostly by their own actions |
| **Optimistic UI** | Show the change locally before it is confirmed |
| **Bounded staleness** | "At most 5 seconds behind" is a real, monitorable SLO |
| **Version vectors** | Detect conflicts rather than silently losing one |
| **Compensating actions** | Allow the oversell, then refund — often cheaper than preventing it |
| **Idempotent retries** | Duplicates from at-least-once become harmless |

> **The compensating-action point is worth making explicitly**, because it
> reframes the problem commercially rather than technically: airlines
> deliberately oversell and compensate, because the cost of occasional
> compensation is far below the cost of coordinating every booking globally.
> Choosing to detect-and-fix rather than prevent is a legitimate design position
> — and one very few candidates raise.

---

## 7 · Interview questions

| Question | What to say |
|---|---|
| ⭐ "Explain CAP." | During a network partition you must choose between returning a possibly-stale response and refusing to respond. Partition tolerance is not optional for a distributed system, so it is really a two-way choice, and only in that moment. Consistency there means linearizability specifically, and availability means every node answers every request — both stricter than the everyday words. |
| ⭐ "Is your system CP or AP?" | Per operation, not per system. The feed is eventually consistent because seconds of staleness is invisible; checkout is linearizable because double-charging is not acceptable. Designing the whole system to the strictest requirement is how you get something slow and fragile. |
| ⭐ "What is PACELC?" | CAP's extension to normal operation: if partitioned, availability or consistency; else, latency or consistency. It matters more, because partitions are rare and the latency/consistency trade is being made continuously. |
| "Linearizability versus serializability?" | Linearizability is about single operations on single objects with real-time ordering. Serializability is about transactions producing *some* serial order, not necessarily matching real time. Both together is strict serializability. |
| "How do you make eventual consistency acceptable?" | Users mostly judge staleness by their own actions, so read-your-writes plus optimistic UI covers most of it. Then a bounded-staleness SLO you actually monitor, and compensating actions for the rare conflict — detecting and fixing is often cheaper than globally preventing. |
| "When would you accept losing data?" | Where the value is low and the volume is high: view counts, analytics samples, non-critical telemetry. Never for anything a user would notice missing or that has financial consequence. Then I would say so explicitly rather than let it be an accident. |

---

## Stop condition

You know this block when you can:

1. state CAP correctly, including that partition tolerance is not a choice,
2. explain PACELC and why its "else" branch matters more,
3. order the consistency models and name causal as the practical sweet spot,
4. distinguish linearizability from serializability, and
5. assign different models to different operations in one system and justify each.
