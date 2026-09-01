---
title: Databases & indexes
slug: databases
module: data
order: 30
status: live
level: core — the deep dive lands here most often
summary: SQL versus NoSQL answered properly, B-tree versus LSM, what an index costs, and the isolation levels you should be able to name.
---

# Databases and indexes

> **"SQL or NoSQL?" is the most common question in the round and the one most
> often answered badly** — usually as a list of properties rather than a
> decision. The good answer picks based on the access pattern you established in
> scoping, and states what you give up.

---

## 1 · The choice, framed properly

The useful axis is not SQL versus NoSQL. It is **do you know your queries in
advance?**

| | Relational | Document | Wide-column | Key-value |
|---|---|---|---|---|
| **Examples** | Postgres, MySQL | MongoDB, DynamoDB | Cassandra, HBase, Bigtable | Redis, DynamoDB |
| **Model** | Normalised tables, joins | Self-contained documents | Wide sparse rows by key | Opaque blob by key |
| **Query flexibility** | Any query, ad hoc | By document, some indexing | **Only by the key you designed for** | Key only |
| **Scale story** | Vertical first; sharding is work | Horizontal | Horizontal, very large | Horizontal |
| **Transactions** | Full ACID, multi-row | Usually single-document | Single-row | Single-key |
| **Best when** | Relationships, ad hoc queries, correctness | Varying shape, read whole objects | Huge write volume, known access | Cache, sessions, counters |

> **The default should be Postgres, and you should be able to defend that.**
> Modern relational databases handle tens of thousands of writes per second,
> hold JSON columns, do full-text search, and give you transactions — and you
> can always shard later. Reaching for Cassandra at 100 writes a second is
> over-engineering, and interviewers score it as one. *"I'd start with Postgres
> and move the timeline table to Cassandra when write volume justifies it"* is a
> stronger answer than either extreme.

**When to genuinely leave relational:**

| Signal | Choose |
|---|---|
| Writes exceed what one primary can take, and the access pattern is a known key | Wide-column |
| Objects are read and written whole, with varying shape | Document |
| Access is purely by key and latency must be sub-millisecond | Key-value |
| Relationships are the query — "friends of friends who like X" | Graph |
| Time-ordered metrics with retention and rollups | Time-series |

---

## 2 · B-tree versus LSM-tree

**This is the highest-value storage-engine question**, because it explains *why*
write-heavy systems choose different databases — and most candidates cannot
answer it.

```
B-TREE  (Postgres, MySQL/InnoDB)
  A balanced tree updated IN PLACE.
    read:  O(log n), one seek to the leaf -- fast and predictable
    write: find the page, modify it, write it back -- RANDOM I/O
  Good reads, moderate writes, no compaction, mature range scans.

LSM-TREE (Cassandra, RocksDB, LevelDB, Bigtable)
  Writes go to an in-memory table, flushed to sorted immutable files.
    write: APPEND to memtable -- sequential, very fast
    read:  check memtable, then several SSTables, newest first
           (a Bloom filter per file skips most of them)
  Background COMPACTION merges files and discards overwritten values.
```

| | B-tree | LSM-tree |
|---|---|---|
| **Write path** | Random I/O, in place | Sequential append |
| **Write throughput** | Moderate | **High** |
| **Read path** | One lookup | Possibly several files |
| **Read latency** | Predictable | More variable |
| **Space** | Fragmentation | **Amplification** until compaction |
| **The catch** | Write amplification on random updates | Compaction competes with live traffic |

> **The sentence to have ready:** *"LSM trades read latency and background
> compaction work for much higher write throughput, because every write is a
> sequential append instead of a random in-place update. If this table is
> write-dominated and read by key, that trade is worth it."*
>
> And the caveat that shows real experience: **compaction is not free** — it
> consumes disk I/O and CPU, and a poorly tuned compaction strategy shows up as
> unpredictable p99 latency spikes on an otherwise healthy cluster.

---

## 3 · Indexes

An index is a sorted structure that lets you find rows without scanning.

**What it costs, which is the part people forget:**

| Cost | Detail |
|---|---|
| Write slowdown | Every insert/update/delete maintains every index |
| Storage | Often 10–30% of the table per index |
| Planner risk | Too many indexes and the optimiser can choose badly |

**Rules that matter in a design round:**

**Index the columns you filter and join on, not the ones you return.**

**Composite index order follows the query.** An index on `(user_id, created_at)`
serves `WHERE user_id = ? ORDER BY created_at` perfectly, and `WHERE created_at
> ?` not at all. Leftmost-prefix is the rule: an index on `(a, b, c)` can serve
`a`, `a+b`, `a+b+c` — never `b` alone.

**A covering index answers the query from the index alone**, without touching the
table. Adding the selected column to the index turns two I/Os into one, and it
is a good, specific optimisation to name.

| Index type | Structure | For |
|---|---|---|
| B-tree | Sorted tree | Equality, ranges, ordering — the default |
| Hash | Hash table | Equality only; no ranges |
| Inverted | Term → doc list | Full-text search |
| Geospatial | R-tree, geohash | "Near me" |
| Bitmap | Bit per row per value | Low-cardinality analytics |

> **Low selectivity means the index is useless.** An index on a boolean matching
> half the table is slower than a sequential scan, because it does random I/O per
> row and then reads most of the table anyway. Knowing that indexes are not free
> and not always used is a genuine signal.

---

## 4 · Isolation levels

Worth knowing by name — a common follow-up when you mention transactions.

| Level | Prevents | Still allows |
|---|---|---|
| **Read uncommitted** | — | Dirty reads |
| **Read committed** | Dirty reads | Non-repeatable reads, phantoms |
| **Repeatable read** | + non-repeatable reads | Phantoms (in the standard) |
| **Serializable** | Everything | Nothing — but it costs throughput |

The anomalies, concretely:

```
DIRTY READ         you read a value another transaction later rolls back
NON-REPEATABLE     you read a row twice in one transaction, values differ
PHANTOM            you run the same range query twice, rows appear
LOST UPDATE        two read-modify-writes; one silently overwrites the other
```

**Read committed is the common default** (Postgres, Oracle). MySQL/InnoDB
defaults to repeatable read.

> **The lost update is the one that bites real systems**, and it is worth being
> able to fix out loud. `SELECT balance; balance -= 10; UPDATE` from two
> concurrent transactions loses one decrement. Fixes: `SELECT ... FOR UPDATE`
> (pessimistic), a version column checked on write (optimistic), or an atomic
> `UPDATE ... SET balance = balance - 10 WHERE balance >= 10` that pushes the
> whole operation into the database. The third is best where it applies.

---

## 5 · Connection pooling

A small thing that comes up in deep dives and shows operational awareness.

Each Postgres connection is a process with meaningful memory overhead, and the
practical ceiling is a few hundred. With 50 app servers each holding a pool of
20, you have asked for 1,000 connections and the database will fall over.

**A pooler like PgBouncer multiplexes many client connections onto few database
ones.** Mentioning it when your design has a large stateless app tier in front of
one database is a specific, credible detail.

---

## 6 · Polyglot persistence

**Different data, different store — and saying so is usually better than forcing
one.**

| Data | Store | Why |
|---|---|---|
| Users, orders, payments | Postgres | Transactions and correctness matter |
| Sessions, rate counters | Redis | Ephemeral, sub-ms, TTL built in |
| Photos, video, backups | Object storage | Cheap, unbounded, CDN-friendly |
| Search index | Elasticsearch | Inverted index, relevance ranking |
| Event log / analytics | Kafka → warehouse | Append-only, replayable, columnar |
| Timeline / feed | Cassandra or Redis | Huge write volume, key-based reads |

Volunteer the cost: **each store is another thing to operate, monitor, back up,
and keep consistent with the others.** Three stores is often right; seven is a
finding.

---

## 7 · Interview questions

| Question | What to say |
|---|---|
| ⭐ "SQL or NoSQL?" | It depends on whether I know the queries in advance. Postgres by default — transactions, ad hoc queries, and it handles far more load than people assume. I'd move a specific table to a wide-column store when its write volume exceeds a primary and its access is by a known key. Picking Cassandra for 100 writes a second is over-engineering. |
| ⭐ "Why is Cassandra better at writes?" | LSM-tree. Every write is a sequential append to a memtable, later flushed to immutable sorted files, instead of a random in-place page update. The costs are read amplification — mitigated by per-file Bloom filters — and background compaction, which competes with live traffic and shows up as p99 spikes if tuned badly. |
| ⭐ "How would you index this query?" | Composite index on the equality columns first, then the range or sort column — leftmost-prefix determines what it can serve. If the selected columns are few, add them to make it covering so the query never touches the table. And I'd check selectivity: a low-cardinality index is worse than a scan. |
| "What does an index cost?" | Every write maintains every index, plus 10–30% storage each. That is why you index for the queries you actually run rather than defensively. |
| ⭐ "Two users withdraw at the same time." | Lost update. Either `SELECT ... FOR UPDATE` to lock pessimistically, an optimistic version check that retries on conflict, or best where it applies, a single atomic statement — `UPDATE ... SET balance = balance - 10 WHERE balance >= 10` — and check the affected row count. |
| "What isolation level?" | Read committed for most things. Serializable where correctness is worth the throughput, like a booking or a ledger. And I'd name the anomaly I am actually defending against rather than picking a level abstractly. |
| "Your app tier has 50 servers and one database." | Connection limits become the bottleneck before query capacity does — a few hundred connections is the practical Postgres ceiling. I'd put PgBouncer in front to multiplex. |

---

## Stop condition

You know this block when you can:

1. justify Postgres as a default and name what would change your mind,
2. explain B-tree versus LSM including compaction's cost,
3. state the leftmost-prefix rule and what a covering index buys,
4. name four isolation anomalies and three fixes for the lost update, and
5. say why a low-selectivity index is worse than a scan.

Next: [sharding](sharding.html).
