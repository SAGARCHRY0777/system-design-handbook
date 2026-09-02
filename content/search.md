---
title: Search & typeahead
slug: search
module: blocks
order: 25
status: live
level: core
summary: Inverted indexes, why the database is the wrong tool, keeping the index in sync, ranking, and the trie behind autocomplete.
---

# Search and typeahead

> **"Add search" is a component in half the designs and a standalone question in
> its own right.** The two things to be able to say: why a relational `LIKE`
> query cannot do this, and how the index stays in sync with the source of truth.

---

## 1 · Why not the database

```sql
SELECT * FROM posts WHERE body LIKE '%distributed systems%';
```

| Problem | Detail |
|---|---|
| **No index can serve it** | A leading wildcard defeats a B-tree; this is a full table scan |
| No relevance | Results are unordered — no notion of a better match |
| No linguistics | "running" will not match "run"; no stemming, no synonyms |
| No typo tolerance | One transposed letter returns nothing |
| No phrase or proximity | Cannot express "these words, near each other" |

**Postgres full-text search (`tsvector` + GIN) is a genuine middle option** and
worth naming — it handles stemming, ranking and phrase queries without adding a
system. Reach for it when search is a feature rather than the product; reach for
Elasticsearch when relevance tuning, faceting, or scale demand it.

> **"I'd start with Postgres full-text search and move to Elasticsearch when we
> need relevance tuning or the volume justifies a separate system" is a better
> answer than either alone**, for the same anti-over-engineering reason as
> everywhere else.

---

## 2 · The inverted index

**The one data structure to be able to explain.**

```
Documents:
  d1: "the quick brown fox"
  d2: "the lazy brown dog"
  d3: "quick brown foxes jump"

Forward index (what you have):   doc -> terms
Inverted index (what you need):  term -> docs

  brown -> [d1, d2, d3]
  quick -> [d1, d3]
  fox   -> [d1, d3]        <- "foxes" stemmed to "fox"
  lazy  -> [d2]
  dog   -> [d2]

Query "quick brown" = INTERSECT postings([quick], [brown]) = [d1, d3]
```

**The analysis pipeline is what makes it work**, and naming the steps shows you
understand where the behaviour comes from:

```
raw text -> tokenise -> lowercase -> remove stopwords
         -> stem/lemmatise -> synonyms -> index terms
```

**The same pipeline must run on the query.** If you stem at index time but not
at query time, "running" will not find "run" — a classic bug, and a good detail
to mention.

**Postings lists carry positions too** (`fox → d1:[3], d3:[3]`), which is what
enables phrase and proximity queries. Without positions you can only ask "both
words appear somewhere".

---

## 3 · Ranking

**BM25 is the default and you should be able to describe its intuition**, not
its formula:

| Factor | Effect |
|---|---|
| **Term frequency** | More occurrences = more relevant, **with diminishing returns** |
| **Inverse document frequency** | Rare terms discriminate; "the" tells you nothing |
| **Field length normalisation** | A match in a 5-word title beats one in a 5,000-word body |

> **The saturation point is what makes BM25 better than raw TF-IDF:** a document
> containing a term 100 times is not 100× more relevant than one containing it
> once. BM25 saturates that curve, which is why keyword stuffing does not work
> against it.

**Beyond text relevance**, real ranking blends signals — recency, popularity,
personalisation, quality — usually as a second-pass reranker over the top few
hundred BM25 candidates. **Two-stage retrieval (cheap recall, expensive rerank)
is the standard shape** and mirrors the pattern in any retrieval system.

---

## 4 · Keeping the index in sync

**The part candidates forget, and the part that breaks in production.**
Elasticsearch is a *derived* store, never the source of truth.

| Approach | How | Trade-off |
|---|---|---|
| **Dual write** | App writes to DB and index | ✗ **Not atomic** — one can fail, and they silently diverge |
| **Transactional outbox** | Write the DB row and an outbox event in one transaction; a relay indexes | ✓ Reliable; a little latency |
| **CDC** | Tail the database's replication log | ✓ **No application change**; captures everything |
| **Periodic rebuild** | Batch reindex | ✓ Simple; stale between runs |

> **Dual write is the wrong answer and knowing why is the point**: there is no
> transaction spanning your database and your search cluster, so a crash between
> the two writes leaves them inconsistent forever, with nothing to detect it.
> Change data capture or a transactional outbox makes the index a *consequence*
> of the committed write rather than a second thing you hope also happened.

**Always have a full rebuild path.** Indexes get corrupted, mappings change, and
bugs cause drift. "We can rebuild from the source of truth in N hours" is the
answer to a whole class of follow-ups.

**Indexing is near-real-time, not real-time.** Elasticsearch refreshes on an
interval (default 1s) — a document is not searchable the instant it is written.
Say that rather than implying otherwise.

---

## 5 · Typeahead / autocomplete

**Different problem, different structure.** Extreme latency requirements
(sub-50 ms, on every keystroke) and a small candidate space.

```
TRIE with top-k cached at each node:

           (root)
             |
             s
             |
             y  -> top-k at this node: ["system design", "syntax", "sync"]
             |
             s  -> ["system design", "system architecture", ...]

Precompute the top k completions AT EACH NODE.
A lookup is then a walk down the trie plus a read -- no ranking at
query time, no scan of candidates.
```

| Decision | Choice | Why |
|---|---|---|
| Structure | Trie with cached top-k per node | Query becomes a prefix walk plus a read |
| Where it lives | In memory, replicated | Latency budget is tens of milliseconds |
| Updates | **Rebuilt offline, periodically** | Real-time updates would invalidate cached top-k constantly |
| Sharding | By prefix | Each shard owns a slice of the keyspace |
| Client | Debounce ~50–100 ms; cache locally | Avoid a request per keystroke |

> **"Precompute the top-k at each node" is the insight**, and the corollary is
> the one to volunteer: it means the structure is *rebuilt*, not updated in
> place. Trending queries appear after the next build, which is a deliberate
> latency-versus-freshness trade rather than a limitation.

**Typo tolerance** at query time uses edit distance (fuzzy matching, usually
limited to distance 1–2 because the candidate space explodes). For search proper,
n-gram indexes and phonetic matching also apply.

---

## 6 · What to say in the round

> *"Search goes to a dedicated inverted index — a `LIKE` query with a leading
> wildcard cannot use an index at all, and there is no relevance ordering.
> Elasticsearch, kept in sync by change data capture off the database's
> replication log rather than dual writes, because there is no transaction across
> both and dual writes diverge silently. The database stays the source of truth
> and I keep a full rebuild path.*
>
> *Ranking is BM25 first for recall, then a reranking pass over the top few
> hundred using recency and engagement. For typeahead it is a separate system
> entirely — a trie with precomputed top-k per node, held in memory and rebuilt
> offline, because the latency budget is tens of milliseconds per keystroke."*

---

## 7 · Interview questions

| Question | What to say |
|---|---|
| ⭐ "Why not `LIKE '%term%'`?" | A leading wildcard cannot use a B-tree index, so it is a full scan — and even then there is no relevance ordering, no stemming, and no typo tolerance. For small data Postgres full-text search covers a lot; beyond that a dedicated index. |
| ⭐ "Explain an inverted index." | A map from term to the list of documents containing it, built by an analysis pipeline — tokenise, lowercase, remove stopwords, stem. A multi-word query intersects postings lists. Positions in the postings enable phrase and proximity queries. The same pipeline must run on the query, or stemming silently fails. |
| ⭐ "How does the index stay in sync?" | Change data capture off the replication log, or a transactional outbox. Not dual writes — no transaction spans the database and the search cluster, so a failure between them diverges permanently with nothing to detect it. And always keep a full rebuild path. |
| "How do you rank?" | BM25 for the first pass: term frequency with saturation, inverse document frequency, and length normalisation. Then rerank the top few hundred with recency, popularity and personalisation. Cheap recall, expensive rerank. |
| ⭐ "Design autocomplete." | A trie with the top-k completions precomputed at each node, in memory, sharded by prefix — so a query is a prefix walk and a read, with no ranking at request time. It is rebuilt offline rather than updated live, because live updates would constantly invalidate the cached top-k; trending terms appear after the next build. |
| "Is a document searchable immediately after writing?" | Not quite — indexes refresh on an interval, typically about a second. It is near-real-time, and I would not promise read-your-writes on search. |
| "How do you handle typos?" | Fuzzy matching by edit distance, capped at one or two because the candidate space grows quickly, plus n-gram indexing and phonetic matching for names. |

---

## Stop condition

You know this block when you can:

1. explain why a leading-wildcard `LIKE` cannot be indexed,
2. describe an inverted index and the analysis pipeline on both sides,
3. give BM25's three factors and the saturation intuition,
4. reject dual writes and name CDC or the outbox, and
5. describe the trie with precomputed top-k and why it is rebuilt rather than updated.
