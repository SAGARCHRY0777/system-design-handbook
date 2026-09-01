---
title: Replication & consistency
slug: replication-and-consistency
module: data
order: 32
status: live
level: core
summary: Leader-follower, multi-leader and leaderless; quorums; replication lag and the read-your-writes problem; and failover done honestly.
---

# Replication and consistency

> **Replication gives you three different things — durability, read scale, and
> availability — and the topology you choose depends on which one you actually
> need.** Saying which is a good way to open.

---

## 1 · Why replicate

| Goal | What it needs |
|---|---|
| **Durability** | A copy on another machine before you ack the write |
| **Read scale** | Replicas that can serve reads |
| **Availability** | A replica that can take over as leader |
| **Latency** | A copy near the user |

These pull in different directions. Read scale wants many async replicas;
durability wants synchronous acks; low-latency writes want the leader nearby,
which cannot be true for everyone at once.

---

## 2 · Leader-follower (primary-replica)

The default, and the right first answer.

```
        writes
          |
          v
      [ LEADER ] --replicate--> [ follower ] <- reads
                 --replicate--> [ follower ] <- reads
```

| | |
|---|---|
| **Good** | Simple; no write conflicts ever; reads scale linearly |
| **Bad** | Writes do not scale; failover has a gap; replicas lag |

### Synchronous, asynchronous, or semi-synchronous

| Mode | Ack after | Durability | Latency | Risk |
|---|---|---|---|---|
| **Async** | Leader writes | Weakest | Lowest | Leader dies → acked writes lost |
| **Sync** | All replicas ack | Strongest | Highest | One slow replica blocks all writes |
| **Semi-sync** | One replica acks | Good | Moderate | **The usual choice** |

> **Fully synchronous replication to all replicas is a trap** and worth naming
> as one: it makes your write availability the *product* of every node's
> availability, so adding replicas makes writes *less* available. Semi-sync — ack
> once at least one replica has it — gives you durability against single-node
> loss without that coupling.

---

## 3 · Replication lag

**The practical consequence of async replication, and the source of the bugs
users actually notice.**

### Read-your-writes

A user posts a comment, the write goes to the leader, the page reloads and reads
from a replica that has not caught up — **the comment they just wrote is gone.**

| Fix | How | Cost |
|---|---|---|
| **Read from leader after write** | For N seconds, or for data the user can modify | Leader load |
| **Sticky routing** | Same user → same replica | Uneven load |
| **Wait for the write's position** | Client carries the log position; replica waits for it | Latency |
| **Client-side echo** | Show the local copy optimistically | UI-only; the data is still stale |

**"Read from the leader for a short window after a write" is the pragmatic
answer**, and scoping it to the user's *own* mutable data keeps leader load
small.

### Monotonic reads

Two successive reads hit different replicas with different lag, and **time
appears to go backwards** — a comment appears, then vanishes. Fix: route a given
user consistently to one replica.

### Consistent prefix

Causally related writes are seen out of order — the reply arrives before the
question. Fix: keep causally related writes in the same partition, or track
causality explicitly.

> **Naming these three by name — read-your-writes, monotonic reads, consistent
> prefix — is a strong signal**, because they are the three anomalies that make
> "eventually consistent" concrete rather than hand-wavy.

**Monitor replication lag and alert on it.** It is the single most useful
health metric for a replicated database, and it is the thing that silently
degrades before it visibly breaks.

---

## 4 · Multi-leader

Writes accepted at several leaders, replicated to each other.

**Use for:** multi-region write latency, offline-capable clients, collaborative
editing.

**The cost is conflicts**, which are unavoidable — two regions modify the same
record concurrently and both are already committed.

| Resolution | How | Problem |
|---|---|---|
| **Last write wins** | Highest timestamp | **Silently discards data**; clock skew decides |
| **Per-field merge** | Merge non-conflicting fields | Not always semantically valid |
| **CRDTs** | Structures that merge deterministically | Restricts what you can model |
| **Application decides** | Keep both, let the user resolve | Real work; often correct |

> **Last-write-wins is the default in several systems and it loses data.** Being
> able to say that — and that "last" is decided by clocks that are not
> synchronised — is exactly the kind of thing that separates candidates.

---

## 5 · Leaderless and quorums

Dynamo-style: the client writes to several nodes and reads from several.

```
N = replicas,  W = write acks required,  R = read replies required

W + R > N  ->  read and write sets OVERLAP, so a read sees the
               latest write ("strong" quorum consistency)

N=3, W=2, R=2   the standard: survives one node down, either way
N=3, W=3, R=1   fast reads, writes fail if any node is down
N=3, W=1, R=1   fastest, weakest -- may read stale
```

**`W + R > N` is the formula to know, and the intuition behind it is the
pigeonhole principle**: if the write touched W nodes and the read touched R
nodes and W + R exceeds N, the two sets must share at least one node — and that
node has the latest value.

**The honest caveat**, worth volunteering: quorums do not give you real
linearizability. Concurrent writes, failed writes that partially succeeded, and
recovery from backup all break the guarantee at the edges. It is *stronger*
consistency, not *strong* consistency.

Supporting mechanisms: **read repair** (the reader notices a stale replica and
fixes it), **hinted handoff** (another node holds a write for a down node),
**anti-entropy** (background Merkle-tree comparison).

---

## 6 · Failover

*"The leader dies — what happens?"* A very common probe, and the good answer
admits the problems.

```
1. DETECT     heartbeat timeout (typically 10-30s)
2. ELECT      choose the most up-to-date follower
3. PROMOTE    reconfigure it as leader
4. REDIRECT   point clients and replicas at it
```

**What goes wrong, and you should say it:**

| Problem | Detail |
|---|---|
| **Lost writes** | With async replication, writes acked but not replicated are gone. The old leader may return holding writes nobody else has. |
| **Split brain** | Both nodes think they lead; both accept writes; data diverges. Prevented by requiring a majority quorum, or by fencing. |
| **Detection tuning** | Too short and you fail over on a network blip; too long and you are down longer. There is no correct value, only a trade. |
| **Cold replica** | The new leader has empty caches and a cold buffer pool, so performance is degraded even after recovery. |

> **Fencing tokens are the split-brain answer.** Each leadership term gets a
> monotonically increasing number, and storage rejects writes carrying an old
> token. A deposed leader that comes back cannot corrupt anything, because its
> token is stale. This is how you make "the old leader might still be alive"
> safe rather than merely unlikely.

---

## 7 · Choosing, in the round

| Situation | Topology |
|---|---|
| Read-heavy, single region | Leader-follower, async replicas, read-your-writes handled |
| Must not lose acked writes | Semi-synchronous |
| Multi-region, low-latency writes | Multi-leader — and name the conflict strategy |
| High availability over consistency | Leaderless with quorums |
| Strong consistency required | Single leader per key, or consensus (Raft) |

> *"Leader-follower with async replicas. Reads go to replicas, except a user's
> own data for thirty seconds after they write it — that goes to the leader, so
> they always see their own changes. Semi-sync so we don't lose acked writes to a
> single node failure. I'd alert on replication lag, and on failover I'd expect
> roughly thirty seconds of write unavailability plus a cold cache on the new
> leader."*

**That is a complete answer**: topology, read routing, the read-your-writes fix,
durability, monitoring, and the honest cost of failover.

---

## 8 · Interview questions

| Question | What to say |
|---|---|
| ⭐ "Sync or async replication?" | Semi-sync — ack once at least one replica has the write. Fully sync to all replicas makes write availability the product of every node's availability, so more replicas means worse writes. Fully async means a leader failure loses acked writes. |
| ⭐ "A user posts and doesn't see their post." | Replication lag — they read from a replica that has not caught up. Route reads of the user's own mutable data to the leader for a short window after a write. The general family is read-your-writes, monotonic reads, and consistent prefix. |
| ⭐ "What is W + R > N?" | Quorum consistency. If writes go to W replicas and reads consult R, and W + R exceeds N, the sets must overlap, so a read sees the latest write. N=3, W=2, R=2 is the standard. It is not true linearizability, though — concurrent and partially-failed writes break it at the edges. |
| "The leader dies." | Detect by heartbeat, elect the most caught-up follower, promote, redirect. Expect roughly 30 seconds of write unavailability, possible loss of async-replicated writes, and a cold cache after. Guard against split brain with a majority quorum and fencing tokens. |
| ⭐ "How do you prevent split brain?" | Require a majority to elect, so two leaders cannot both hold one. And fence: each term gets an increasing token, and storage rejects writes bearing a stale one — so a returning old leader cannot corrupt data. |
| "How do you resolve multi-leader conflicts?" | Last-write-wins is the default and it silently discards data, with clock skew deciding the winner. Better: merge per field, use CRDTs where the data model allows, or keep both versions and let the application or user resolve. |
| "What do you monitor?" | Replication lag first — it degrades silently before it breaks visibly. Then failover events, and whether reads are being served stale beyond the tolerance we agreed in scoping. |

---

## Stop condition

You know this block when you can:

1. explain why fully synchronous replication hurts availability,
2. name the three lag anomalies and fix read-your-writes,
3. derive `W + R > N` and state its honest limit,
4. walk the four failover steps and the four things that go wrong, and
5. explain fencing tokens.
