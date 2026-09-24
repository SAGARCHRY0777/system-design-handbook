/**
 * simdefs.js — the simulations themselves. The player lives in sims.js.
 *
 * Each definition registers into window.__SIMS and is drawn with the helper
 * exposed as window.__SIM_D. Definitions are independent blocks: adding a new
 * sim never touches an existing one, and never touches the build.
 *
 * The rule:
 *   THE FRAMES MUST BE THE REAL MECHANISM, IN THE REAL ORDER.
 * Every number on screen is computed from a stated configuration, not typed in
 * to look plausible. If a mechanism has no genuine time axis, it does not get a
 * sim — a fake timeline over a static formula teaches motion that is not there.
 *
 * (system-design-handbook)
 */
(function () {
  "use strict";
  var S = window.__SIMS;
  if (!S) return;

  // >>> SPLICED SIMS

  // ====================================================================
  // ======================================================================
  // SIM · sddatabases  (databases.md)
  // Section 2 — B-tree versus LSM-tree — is the one part of this page with a
  // real time axis: a memtable fills, flushes, and compaction either keeps up
  // with the flushes or does not. So one write ramp is run through three
  // engines that differ only in switches, and every figure on screen is
  // counted off that run.
  //
  // CONFIG — stated, because the page states no throughput figures of its own.
  // Where the handbook does state a figure it is used verbatim:
  //   row size            1 KB        numbers-to-know: "typical database row"
  //   sequential SSD      1,000 MB/s  numbers-to-know: 1 MB sequential = 1 ms
  //   random read         0.1 ms      numbers-to-know: SSD random read 100 us
  //   Bloom FP rate       1%          numbers-to-know: ~10 bits/element -> ~1%
  //   connection ceiling  300         databases.md 5: "a few hundred"
  //   secondary indexes   2           databases.md 3: every write maintains
  //                                   every index -> 1 heap + 2 index pages
  // And this sim's own device/engine settings, declared:
  //   random page ops     30,000/s
  //   memtable            64 MiB = 65,536 rows
  //   L0 compaction trigger 4 files, slowdown 12, stop 24
  //   compaction budget   500 MB/s fed  ·  16 MB/s throttled
  //   background reads    5,000/s, cold (no page cache) in both engines
  //
  // The B-tree row ceiling is therefore COMPUTED, not asserted:
  //   (30,000 random ops/s - 5,000 read seeks/s) / 3 pages per row = 8,333/s
  // which lands inside numbers-to-know's 5k-10k writes/s per primary band.
  // ======================================================================
  var sddatabases_ROW_B = 1024;
  var sddatabases_NIDX = 2;
  var sddatabases_PAGES_PER_ROW = 1 + sddatabases_NIDX;          // 3
  var sddatabases_DEV_IOPS = 30000;                              // random page ops/s
  var sddatabases_SEQ_MBPS = 1000;                               // sequential MB/s
  var sddatabases_SEQ_BPS = sddatabases_SEQ_MBPS * 1e6;
  var sddatabases_SEEK_MS = 0.1;                                 // SSD random read
  var sddatabases_READ_QPS = 5000;
  var sddatabases_BLOOM_FP = 0.01;
  var sddatabases_MEM_MIB = 64;
  var sddatabases_MEM_B = sddatabases_MEM_MIB * 1024 * 1024;     // 67,108,864
  var sddatabases_MEM_ROWS = sddatabases_MEM_B / sddatabases_ROW_B;  // 65,536
  var sddatabases_L0_TRIGGER = 4;
  var sddatabases_L0_SLOW = 12;
  var sddatabases_L0_STOP = 24;
  var sddatabases_MAX_CONN = 300;
  var sddatabases_WAL_MS = 1;
  var sddatabases_FED_MBPS = 500;
  var sddatabases_THROTTLE_MBPS = 16;

  var sddatabases_FRAMES = 8;
  var sddatabases_FRAME_S = 12;
  var sddatabases_SUB_S = 0.2;
  var sddatabases_SUBS = Math.round(sddatabases_FRAME_S / sddatabases_SUB_S);  // 60
  var sddatabases_ARR = [2000, 8000, 30000, 60000, 60000, 60000, 12000, 3000];

  // the B-tree ceiling, computed from the device budget
  var sddatabases_BTREE_CAP =
    (sddatabases_DEV_IOPS - sddatabases_READ_QPS) / sddatabases_PAGES_PER_ROW;

  function sddatabases_pct(a, b) { return b > 0 ? (a / b) * 100 : 0; }
  function sddatabases_k(n) {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
    return String(Math.round(n));
  }
  function sddatabases_mb(bytes) { return (bytes / 1e6).toFixed(0) + " MB"; }
  function sddatabases_gb(bytes) { return (bytes / 1e9).toFixed(2) + " GB"; }
  function sddatabases_secs(s) { return s >= 100 ? s.toFixed(0) + " s" : s.toFixed(1) + " s"; }

  /** Smallest k with P(Binomial(n, p) <= k) >= 0.99 — the p99 of Bloom false hits. */
  function sddatabases_binP99(n, p) {
    if (n <= 0) return 0;
    var q = 1 - p, term = Math.pow(q, n), cum = term, k = 0;
    while (cum < 0.99 && k < n) {
      term = term * ((n - k) / (k + 1)) * (p / q);
      cum += term;
      k++;
    }
    return k;
  }

  /** Point-read cost for a file set: one real seek plus the Bloom false hits. */
  function sddatabases_readCost(files) {
    if (files <= 0) return { files: 0, mean: 0, p99: 0 };
    var extra = sddatabases_binP99(files - 1, sddatabases_BLOOM_FP);
    return {
      files: files,
      mean: 1 + sddatabases_BLOOM_FP * (files - 1),
      p99: 1 + extra
    };
  }

  // ----------------------------------------------------------------------
  // The one engine. "btree" writes every row in place through the random-I/O
  // budget; "lsm" appends to a memtable, flushes 64 MiB SSTables, and merges
  // 4 L0 files at a time inside whatever compaction bandwidth it was given.
  // Admission in both is bounded by the same 300-connection pool, so overload
  // shows up as refusals rather than as an unbounded queue.
  // ----------------------------------------------------------------------
  function sddatabases_run(engine, compactMBps) {
    var compactBps = compactMBps * 1e6;
    var frames = [];
    var backlog = 0, offered = 0, durable = 0, refused = 0;
    var memRows = 0, l0 = 0, l1 = 0, l1Bytes = 0, flushes = 0, compactions = 0;
    var job = null, flushBytes = 0, compactBytes = 0;
    var fDurable = 0, fRefused = 0, fFlush = 0, fCompact = 0;
    var slowSince = -1, stopSince = -1;
    var f, s, t;

    for (f = 0; f < sddatabases_FRAMES; f++) {
      var rate = sddatabases_ARR[f];
      fDurable = 0; fRefused = 0; fFlush = 0; fCompact = 0;
      var capRate = 0, state = "ok";

      for (s = 0; s < sddatabases_SUBS; s++) {
        t = f * sddatabases_SUBS + s;

        // ---- what the engine can retire right now ----------------------
        if (engine === "btree") {
          capRate = sddatabases_BTREE_CAP;
          state = "ok";
        } else if (l0 >= sddatabases_L0_STOP) {
          capRate = 0;
          state = "stop";
          if (stopSince < 0) stopSince = t;
        } else if (l0 >= sddatabases_L0_SLOW) {
          // throttled to exactly the rate compaction is draining files at:
          // each row costs one read and one write of its bytes to merge
          capRate = compactBps / (2 * sddatabases_ROW_B);
          state = "slow";
          if (slowSince < 0) slowSince = t;
        } else {
          // flush takes whatever sequential bandwidth compaction is not using
          capRate = (sddatabases_SEQ_BPS - compactBps) / sddatabases_ROW_B;
          state = "ok";
        }

        // ---- admission through the bounded pool -------------------------
        var arrivals = rate * sddatabases_SUB_S;
        offered += arrivals;
        var waiting = backlog + arrivals;
        var served = Math.min(waiting, capRate * sddatabases_SUB_S);
        var rest = waiting - served;
        backlog = Math.min(rest, sddatabases_MAX_CONN);
        var lost = rest - backlog;
        refused += lost; fRefused += lost;
        durable += served; fDurable += served;

        // ---- the LSM write path ----------------------------------------
        if (engine === "lsm") {
          memRows += served;
          while (memRows >= sddatabases_MEM_ROWS) {
            memRows -= sddatabases_MEM_ROWS;
            l0++; flushes++;
            flushBytes += sddatabases_MEM_B; fFlush += sddatabases_MEM_B;
          }
          // compaction spends its budget on one merge job at a time
          var budget = compactBps * sddatabases_SUB_S;
          while (budget > 0) {
            if (!job) {
              if (l0 < sddatabases_L0_TRIGGER) break;
              // read 4 files and write one merged file of the same bytes
              job = { total: 2 * sddatabases_L0_TRIGGER * sddatabases_MEM_B, done: 0 };
            }
            var spend = Math.min(budget, job.total - job.done);
            job.done += spend; budget -= spend;
            compactBytes += spend; fCompact += spend;
            if (job.done >= job.total) {
              l0 -= sddatabases_L0_TRIGGER;
              l1++; l1Bytes += sddatabases_L0_TRIGGER * sddatabases_MEM_B;
              compactions++;
              job = null;
            }
          }
        }
      }

      // ---- frame snapshot ---------------------------------------------
      // a point read consults every overlapping L0 file plus the one L1 file
      // whose key range covers the key; L1 files do not overlap each other
      var files = engine === "btree" ? 1 : l0 + (l1 > 0 ? 1 : 0);
      var rc = engine === "btree"
        ? { files: 1, mean: 1, p99: 1 }
        : sddatabases_readCost(files);
      var owed = job
        ? (job.total - job.done)
        : 0;
      owed += Math.max(0, l0 - sddatabases_L0_TRIGGER + (job ? sddatabases_L0_TRIGGER : 0)) === 0
        ? 0
        : Math.max(0, l0 - (job ? 0 : 0)) * 2 * sddatabases_MEM_B;

      var devPct = engine === "btree"
        ? sddatabases_pct(
            (fDurable / sddatabases_FRAME_S) * sddatabases_PAGES_PER_ROW + sddatabases_READ_QPS,
            sddatabases_DEV_IOPS)
        : sddatabases_pct((fFlush + fCompact) / sddatabases_FRAME_S, sddatabases_SEQ_BPS);

      frames.push({
        f: f,
        elapsed: (f + 1) * sddatabases_FRAME_S,
        engine: engine, compactMBps: compactMBps,
        rate: rate, capRate: capRate, state: state,
        offered: offered, durable: durable, refused: refused,
        dFrame: fDurable, rFrame: fRefused,
        backlog: backlog,
        latMs: capRate > 0 ? (backlog / capRate) * 1000 + sddatabases_WAL_MS : -1,
        memRows: memRows, l0: l0, l1: l1, l1Bytes: l1Bytes,
        flushes: flushes, compactions: compactions,
        jobPct: job ? sddatabases_pct(job.done, job.total) : 0,
        owedBytes: owed,
        flushBytes: flushBytes, compactBytes: compactBytes,
        fFlush: fFlush, fCompact: fCompact,
        devPct: devPct,
        compactSharePct: sddatabases_pct(fCompact / sddatabases_FRAME_S, sddatabases_SEQ_BPS),
        readFiles: rc.files, readMean: rc.mean, readP99: rc.p99,
        readP99Ms: rc.p99 * sddatabases_SEEK_MS,
        readMeanMs: rc.mean * sddatabases_SEEK_MS
      });
    }

    var i;
    for (i = 0; i < frames.length; i++) frames[i].all = frames;

    return {
      frames: frames, offered: offered, durable: durable, refused: refused,
      flushes: flushes, compactions: compactions,
      slowSince: slowSince, stopSince: stopSince,
      drainRows: compactBps / (2 * sddatabases_ROW_B)
    };
  }

  /** The idle frame, same shape as a snapshot so draw() never guesses. */
  function sddatabases_idle(engine, compactMBps, caption) {
    return {
      caption: caption, flag: "idle",
      f: -1, elapsed: 0, engine: engine, compactMBps: compactMBps,
      rate: 0, capRate: engine === "btree" ? sddatabases_BTREE_CAP : 0, state: "ok",
      offered: 0, durable: 0, refused: 0, dFrame: 0, rFrame: 0,
      backlog: 0, latMs: 0, memRows: 0, l0: 0, l1: 0, l1Bytes: 0,
      flushes: 0, compactions: 0, jobPct: 0, owedBytes: 0,
      flushBytes: 0, compactBytes: 0, fFlush: 0, fCompact: 0,
      devPct: 0, compactSharePct: 0,
      readFiles: engine === "btree" ? 1 : 0,
      readMean: engine === "btree" ? 1 : 0,
      readP99: engine === "btree" ? 1 : 0,
      readP99Ms: engine === "btree" ? sddatabases_SEEK_MS : 0,
      readMeanMs: engine === "btree" ? sddatabases_SEEK_MS : 0,
      all: []
    };
  }

  // ----------------------------------------------------------------------
  // Scenario 1 — the B-tree primary. In-place random I/O, three pages a row.
  // ----------------------------------------------------------------------
  function sddatabases_btreeScenario() {
    var r = sddatabases_run("btree", 0);
    var lsm = sddatabases_run("lsm", sddatabases_FED_MBPS);
    var steps = [sddatabases_idle("btree", 0,
      "A single B-tree primary — Postgres, InnoDB — with " + sddatabases_NIDX +
      " secondary indexes, so every row costs <b>" + sddatabases_PAGES_PER_ROW +
      "</b> random page writes: the heap page and one leaf per index. The device does " +
      sddatabases_DEV_IOPS.toLocaleString("en-US") + " random page operations a second and " +
      sddatabases_READ_QPS.toLocaleString("en-US") + " of those are already spoken for by " +
      "reads, so the write ceiling is <b>" + Math.round(sddatabases_BTREE_CAP) +
      " rows/s</b> — nothing typed in, that is (" + sddatabases_DEV_IOPS.toLocaleString("en-US") +
      " &minus; " + sddatabases_READ_QPS.toLocaleString("en-US") + ") / " +
      sddatabases_PAGES_PER_ROW + ". Writes arrive at " +
      sddatabases_ARR.join(" / ") + " per second. Press Play.")];

    var i, firstRefuse = -1;
    for (i = 0; i < r.frames.length; i++) {
      if (firstRefuse < 0 && r.frames[i].rFrame > 1) { firstRefuse = i; break; }
    }

    for (i = 0; i < r.frames.length; i++) {
      var fr = r.frames[i], cap;
      var servedRate = fr.dFrame / sddatabases_FRAME_S;
      var over = fr.rate / sddatabases_BTREE_CAP;

      if (i === r.frames.length - 1) {
        cap = "<b>" + Math.round(fr.durable).toLocaleString("en-US") + " rows durable of " +
          Math.round(fr.offered).toLocaleString("en-US") + " offered — " +
          sddatabases_pct(fr.refused, fr.offered).toFixed(0) + "% of the write load was " +
          "refused at the pool.</b> The device never misbehaved: it ran at <b>" +
          fr.devPct.toFixed(0) + "%</b> of its random-I/O budget the whole way, doing exactly " +
          "what a B-tree asks of it — " + sddatabases_PAGES_PER_ROW + " random page writes per " +
          "row, in place. That is the shape of the wall. Read latency never moved: <b>" +
          fr.readP99Ms.toFixed(2) + " ms</b> at p99, one seek to the leaf, every single frame — " +
          "which is the half of the trade the B-tree wins. The same ramp through an LSM with " +
          "compaction fed retires <b>" + Math.round(lsm.durable).toLocaleString("en-US") +
          "</b> rows and refuses <b>" + Math.round(lsm.refused) + "</b>.";
      } else if (i === firstRefuse) {
        cap = "<b>" + sddatabases_k(fr.rate) + "/s offered against an " +
          Math.round(sddatabases_BTREE_CAP) + "/s ceiling — the pool starts refusing.</b> " +
          "Demand is <b>" + over.toFixed(1) + "×</b> capacity. There is no queue to absorb it: " +
          "admission is bounded by the connection pool at " + sddatabases_MAX_CONN +
          " in flight, so the excess is not delayed, it is rejected — <b>" +
          Math.round(fr.rFrame).toLocaleString("en-US") + "</b> rows this frame. Write latency " +
          "for the ones that get through is only <b>" + fr.latMs.toFixed(0) + " ms</b> (" +
          sddatabases_MAX_CONN + " in flight / " + Math.round(sddatabases_BTREE_CAP) +
          " per second, plus the " + sddatabases_WAL_MS + " ms WAL fsync). <i>That is the " +
          "signature of a bounded pool: overload shows up as errors, not as a rising p99.</i>";
      } else if (i === 0) {
        cap = "<b>Frame 1 — " + sddatabases_k(fr.rate) + " rows/s, comfortably inside the " +
          "ceiling.</b> " + Math.round(fr.dFrame).toLocaleString("en-US") + " rows durable, " +
          "nothing refused, " + fr.backlog.toFixed(0) + " connections in flight. The device is " +
          "at <b>" + fr.devPct.toFixed(0) + "%</b> of its random budget: " +
          Math.round(servedRate * sddatabases_PAGES_PER_ROW).toLocaleString("en-US") +
          " page writes a second for the rows plus " +
          sddatabases_READ_QPS.toLocaleString("en-US") + " read seeks. This is what " +
          "<i>“Postgres by default”</i> looks like when the estimate says it fits.";
      } else if (fr.rFrame > 1) {
        cap = "<b>Frame " + (i + 1) + " — " + sddatabases_k(fr.rate) + "/s offered, <b>" +
          sddatabases_k(servedRate) + "/s</b> retired.</b> " +
          Math.round(fr.rFrame).toLocaleString("en-US") + " refused this frame, " +
          Math.round(fr.refused).toLocaleString("en-US") + " in total. Device still at <b>" +
          fr.devPct.toFixed(0) + "%</b> — it is saturated, not broken, and no amount of " +
          "index tuning moves a number that is " + sddatabases_PAGES_PER_ROW +
          " random writes per row by construction. Reads are untouched at <b>" +
          fr.readP99Ms.toFixed(2) + " ms</b> p99. <i>This is the “writes exceed what one " +
          "primary can take” row of the page's table, happening.</i>";
      } else {
        cap = "<b>Frame " + (i + 1) + " — " + sddatabases_k(fr.rate) + " rows/s.</b> " +
          Math.round(fr.dFrame).toLocaleString("en-US") + " durable this frame at <b>" +
          fr.devPct.toFixed(0) + "%</b> of the device's random-I/O budget, " +
          Math.round(fr.rFrame) + " refused. Demand is <b>" + over.toFixed(2) +
          "×</b> the " + Math.round(sddatabases_BTREE_CAP) + "/s ceiling. " +
          (over < 1
            ? "Still under it — one primary, no sharding, exactly as the estimate said."
            : "Over it, and the pool is what gives way first.");
      }
      fr.caption = cap;
      fr.flag = fr.rFrame > 1 ? "bad" : fr.devPct > 90 ? "warn" : "ok";
      steps.push(fr);
    }
    return { id: "btree", label: "B-tree primary", steps: steps };
  }

  // ----------------------------------------------------------------------
  // Scenario 2 — the same ramp into an LSM whose compaction is actually fed.
  // ----------------------------------------------------------------------
  function sddatabases_lsmScenario() {
    var r = sddatabases_run("lsm", sddatabases_FED_MBPS);
    var bt = sddatabases_run("btree", 0);
    var steps = [sddatabases_idle("lsm", sddatabases_FED_MBPS,
      "Same table, same " + sddatabases_ARR.join("/") + " per second arrival schedule, same " +
      sddatabases_READ_QPS.toLocaleString("en-US") + " reads/s — an LSM store now. Writes " +
      "append to a " + sddatabases_MEM_MIB + " MiB memtable (" +
      sddatabases_MEM_ROWS.toLocaleString("en-US") + " rows at " + sddatabases_ROW_B +
      " B), which flushes to an immutable sorted file; " + sddatabases_L0_TRIGGER +
      " L0 files are merged at a time, and compaction here gets <b>" +
      sddatabases_FED_MBPS + " MB/s</b> of the device's " + sddatabases_SEQ_MBPS +
      " MB/s. Press Play.")];

    var i, firstFlush = -1, firstCompact = -1, peakFiles = 0, peakAt = 0;
    for (i = 0; i < r.frames.length; i++) {
      if (firstFlush < 0 && r.frames[i].flushes > 0) firstFlush = i;
      if (firstCompact < 0 && r.frames[i].compactions > 0) firstCompact = i;
      if (r.frames[i].readFiles > peakFiles) { peakFiles = r.frames[i].readFiles; peakAt = i; }
    }

    for (i = 0; i < r.frames.length; i++) {
      var fr = r.frames[i], cap;
      var prev = i ? r.frames[i - 1] : null;
      var newFlush = fr.flushes - (prev ? prev.flushes : 0);
      var newComp = fr.compactions - (prev ? prev.compactions : 0);
      var btFr = bt.frames[i];

      if (i === r.frames.length - 1) {
        cap = "<b>" + Math.round(fr.durable).toLocaleString("en-US") + " rows durable, <b>" +
          Math.round(fr.refused) + "</b> refused</b> — against " +
          Math.round(bt.durable).toLocaleString("en-US") + " durable and " +
          Math.round(bt.refused).toLocaleString("en-US") +
          " refused for the B-tree on the identical schedule. " + fr.flushes +
          " flushes and " + fr.compactions + " merges wrote " +
          sddatabases_gb(fr.flushBytes + fr.compactBytes) + " to the device, all of it " +
          "sequential. And here is the bill for it: a point read now consults <b>" +
          fr.readFiles + "</b> files instead of one, so p99 read is <b>" +
          fr.readP99Ms.toFixed(2) + " ms</b> against the B-tree's flat <b>" +
          btFr.readP99Ms.toFixed(2) + " ms</b>. <i>That is the whole trade in two numbers: " +
          Math.round(bt.refused).toLocaleString("en-US") + " refused writes bought back for " +
          (fr.readP99Ms - btFr.readP99Ms).toFixed(2) + " ms of read tail.</i>";
      } else if (i === firstCompact) {
        cap = "<b>The first merge completes.</b> " + sddatabases_L0_TRIGGER +
          " L0 files went in, one L1 file came out — " +
          sddatabases_mb(2 * sddatabases_L0_TRIGGER * sddatabases_MEM_B) + " of read-plus-write " +
          "for " + sddatabases_mb(sddatabases_L0_TRIGGER * sddatabases_MEM_B) + " of live data, " +
          "which is the write amplification everyone forgets to mention. It cost <b>" +
          fr.compactSharePct.toFixed(0) + "%</b> of the device's sequential bandwidth this " +
          "frame, on top of <b>" + (fr.devPct - fr.compactSharePct).toFixed(0) +
          "%</b> for the flushes. L0 is back to " + fr.l0 + " files, so a read touches <b>" +
          fr.readFiles + "</b> of them and p99 is <b>" + fr.readP99Ms.toFixed(2) + " ms</b>.";
      } else if (i === firstFlush) {
        cap = "<b>The memtable flushes.</b> " + sddatabases_MEM_ROWS.toLocaleString("en-US") +
          " rows became one immutable " + sddatabases_MEM_MIB + " MiB sorted file, written " +
          "sequentially in " + ((sddatabases_MEM_B / sddatabases_SEQ_BPS) * 1000).toFixed(0) +
          " ms. No page was found, modified, and written back — that is the entire reason " +
          "the write ceiling moved. The B-tree is retiring " +
          sddatabases_k(btFr.dFrame / sddatabases_FRAME_S) + "/s this frame; this engine is " +
          "retiring <b>" + sddatabases_k(fr.dFrame / sddatabases_FRAME_S) + "/s</b> and " +
          "refusing nothing.";
      } else if (i === 0) {
        cap = "<b>Frame 1 — " + sddatabases_k(fr.rate) + " rows/s, and not one byte has " +
          "reached the device yet.</b> All " + Math.round(fr.memRows).toLocaleString("en-US") +
          " rows are in the memtable, " +
          sddatabases_pct(fr.memRows, sddatabases_MEM_ROWS).toFixed(0) + "% full. Write " +
          "latency is the <b>" + sddatabases_WAL_MS + " ms</b> WAL fsync and nothing else. " +
          "A read right now finds everything in memory — <b>zero</b> seeks — which is why " +
          "the read column of the page's table says <i>“possibly several files”</i> rather " +
          "than a number.";
      } else {
        cap = "<b>Frame " + (i + 1) + " — " + sddatabases_k(fr.rate) + "/s in, <b>" +
          sddatabases_k(fr.dFrame / sddatabases_FRAME_S) + "/s</b> retired, " +
          Math.round(fr.rFrame) + " refused.</b> " + newFlush + " flush" +
          (newFlush === 1 ? "" : "es") + " and " + newComp + " merge" +
          (newComp === 1 ? "" : "s") + " this frame; L0 holds " + fr.l0 + " file" +
          (fr.l0 === 1 ? "" : "s") + ", L1 holds " + fr.l1 + ". Compaction took <b>" +
          fr.compactSharePct.toFixed(0) + "%</b> of the device's bandwidth — it is competing " +
          "with live traffic right now, and it is winning cleanly because it was given room. " +
          "Read p99 <b>" + fr.readP99Ms.toFixed(2) + " ms</b> across " + fr.readFiles +
          " file" + (fr.readFiles === 1 ? "" : "s") + "; the B-tree's is " +
          btFr.readP99Ms.toFixed(2) + " ms.";
      }
      fr.caption = cap;
      fr.flag = fr.rFrame > 1 ? "bad" : fr.readP99 > 2 ? "warn" : "ok";
      steps.push(fr);
    }
    return { id: "lsm", label: "LSM, compaction fed", steps: steps };
  }

  // ----------------------------------------------------------------------
  // Scenario 3 — the page's caveat, run: compaction throttled so it does not
  // "disturb live traffic", which is precisely how it takes the cluster down.
  // ----------------------------------------------------------------------
  function sddatabases_starvedScenario() {
    var r = sddatabases_run("lsm", sddatabases_THROTTLE_MBPS);
    var fed = sddatabases_run("lsm", sddatabases_FED_MBPS);
    var drain = r.drainRows;
    var steps = [sddatabases_idle("lsm", sddatabases_THROTTLE_MBPS,
      "Identical to the previous tab — same rows, same schedule, same memtable, same " +
      sddatabases_L0_TRIGGER + "-file merges — with one setting changed: compaction is " +
      "throttled to <b>" + sddatabases_THROTTLE_MBPS + " MB/s</b> so it will not disturb live " +
      "traffic. At " + sddatabases_ROW_B + " B a row, merging costs one read and one write, so " +
      "that budget drains <b>" + Math.round(drain).toLocaleString("en-US") + " rows/s</b> of " +
      "L0 — which is the number the rest of this run is about. Press Play.")];

    var i, firstSlow = -1, firstStop = -1;
    for (i = 0; i < r.frames.length; i++) {
      if (firstSlow < 0 && r.frames[i].state === "slow") firstSlow = i;
      if (firstStop < 0 && r.frames[i].state === "stop") firstStop = i;
    }

    for (i = 0; i < r.frames.length; i++) {
      var fr = r.frames[i], cap;
      var prev = i ? r.frames[i - 1] : null;
      var fedFr = fed.frames[i];
      var need = (fr.rate * sddatabases_ROW_B * 2) / 1e6;    // MB/s of merge the inflow owes
      var clear = fr.owedBytes / (sddatabases_THROTTLE_MBPS * 1e6);

      if (i === r.frames.length - 1) {
        cap = "<b>" + Math.round(fr.durable).toLocaleString("en-US") + " rows durable and <b>" +
          Math.round(fr.refused).toLocaleString("en-US") + "</b> refused</b>, against " +
          Math.round(fed.durable).toLocaleString("en-US") + " and " +
          Math.round(fed.refused) + " for the same engine with compaction fed. L0 still holds " +
          "<b>" + fr.l0 + "</b> files; at " + sddatabases_THROTTLE_MBPS + " MB/s that backlog " +
          "needs <b>" + sddatabases_secs(clear) + "</b> of merging to clear, and the arrivals " +
          "stopped " + sddatabases_secs(sddatabases_FRAME_S * 2) + " ago. Read p99 is <b>" +
          fr.readP99Ms.toFixed(2) + " ms</b> across " + fr.readFiles + " files, versus <b>" +
          fedFr.readP99Ms.toFixed(2) + " ms</b> in the fed run. <i>Nothing failed a health " +
          "check. The cluster is up, the disks are fine, and it is refusing writes and serving " +
          "reads at " + (fr.readP99Ms / fedFr.readP99Ms).toFixed(0) + "× the tail latency — " +
          "which is exactly what “a poorly tuned compaction strategy” looks like from the " +
          "outside.</i>";
      } else if (i === firstStop) {
        cap = "<b>L0 reaches " + sddatabases_L0_STOP + " files — writes stop.</b> The engine " +
          "refuses rather than let the read path get any worse: " +
          Math.round(fr.rFrame).toLocaleString("en-US") + " rows rejected this frame. A point " +
          "read is now consulting <b>" + fr.readFiles + "</b> files, and at a " +
          (sddatabases_BLOOM_FP * 100).toFixed(0) + "% Bloom false-positive rate the p99 read " +
          "has climbed to <b>" + fr.readP99Ms.toFixed(2) + " ms</b> — " + fr.readP99 +
          " seeks where the B-tree always does one. Compaction is still crawling at " +
          sddatabases_THROTTLE_MBPS + " MB/s while the inflow owes it <b>" + need.toFixed(0) +
          " MB/s</b>.";
      } else if (i === firstSlow) {
        cap = "<b>L0 reaches " + sddatabases_L0_SLOW + " files — the engine throttles " +
          "admission to the rate compaction can drain.</b> That rate is <b>" +
          Math.round(drain).toLocaleString("en-US") + " rows/s</b>, and the B-tree in the " +
          "first tab retires <b>" + Math.round(sddatabases_BTREE_CAP) + " rows/s</b>. " +
          "<i>The LSM chosen for write throughput is now slower at writes than the B-tree it " +
          "replaced</i> — not because LSM is wrong, but because one tuning knob turned the " +
          "sequential-append advantage into a merge queue. " +
          Math.round(fr.rFrame).toLocaleString("en-US") + " rows refused this frame; read p99 " +
          "<b>" + fr.readP99Ms.toFixed(2) + " ms</b> over " + fr.readFiles + " files.";
      } else if (i === 0) {
        cap = "<b>Frame 1 — indistinguishable from the healthy run.</b> " +
          Math.round(fr.dFrame).toLocaleString("en-US") + " rows durable, " +
          Math.round(fr.rFrame) + " refused, L0 at " + fr.l0 + " file" +
          (fr.l0 === 1 ? "" : "s") + ", read p99 <b>" + fr.readP99Ms.toFixed(2) +
          " ms</b>. At " + sddatabases_k(fr.rate) + " rows/s the inflow owes compaction " +
          need.toFixed(1) + " MB/s and compaction has " + sddatabases_THROTTLE_MBPS +
          ". Nothing on a dashboard says anything is wrong, and nothing will for a while.";
      } else {
        var prevL0 = prev ? prev.l0 : 0;
        cap = "<b>Frame " + (i + 1) + " — L0 at " + fr.l0 + " files" +
          (fr.l0 > prevL0 ? ", up " + (fr.l0 - prevL0) + " this frame" : "") + ".</b> " +
          "Arrivals of " + sddatabases_k(fr.rate) + "/s owe compaction <b>" + need.toFixed(0) +
          " MB/s</b> of merging and it is funded at <b>" + sddatabases_THROTTLE_MBPS +
          "</b> — the deficit is what those files are. Reads now touch <b>" + fr.readFiles +
          "</b> files: mean " + fr.readMean.toFixed(2) + " seeks, p99 <b>" + fr.readP99 +
          "</b>, so <b>" + fr.readP99Ms.toFixed(2) + " ms</b> against the fed run's " +
          fedFr.readP99Ms.toFixed(2) + " ms. " +
          (fr.rFrame > 1
            ? Math.round(fr.rFrame).toLocaleString("en-US") + " rows refused this frame."
            : "Writes are still being accepted in full — the damage so far is only in the tail.");
      }
      fr.caption = cap;
      fr.flag = fr.state === "stop" ? "bad" : fr.state === "slow" ? "warn"
        : fr.readP99 > 2 ? "warn" : "ok";
      steps.push(fr);
    }
    return { id: "starved", label: "LSM, compaction starved", steps: steps };
  }

  // ======================================================================
  S["sddatabases"] = {
    title: "Run one write ramp through a B-tree and an LSM",
    note: "One table with " + sddatabases_NIDX + " secondary indexes, one SSD, one arrival " +
      "schedule: <b>" + sddatabases_ARR.join(" / ") + "</b> rows a second across eight " +
      sddatabases_FRAME_S + "-second frames, plus a constant " +
      sddatabases_READ_QPS.toLocaleString("en-US") + " reads/s. Handbook figures are used " +
      "verbatim — rows are <b>" + sddatabases_ROW_B + " B</b> (typical database row), the " +
      "device does <b>" + sddatabases_SEQ_MBPS + " MB/s</b> sequential (1 MB from SSD = 1 ms) " +
      "and a random read costs <b>" + sddatabases_SEEK_MS + " ms</b> (SSD random read = " +
      "100 µs), Bloom filters run at <b>" + (sddatabases_BLOOM_FP * 100).toFixed(0) +
      "%</b> false positives (~10 bits/element), and admission is bounded by the page's " +
      "“few hundred” connection ceiling, taken as <b>" + sddatabases_MAX_CONN + "</b>. This " +
      "sim declares the rest: <b>" + sddatabases_DEV_IOPS.toLocaleString("en-US") +
      "</b> random page ops/s, a <b>" + sddatabases_MEM_MIB + " MiB</b> memtable, merges of <b>" +
      sddatabases_L0_TRIGGER + "</b> L0 files, slowdown at <b>" + sddatabases_L0_SLOW +
      "</b> and stop at <b>" + sddatabases_L0_STOP + "</b> L0 files. Everything else is " +
      "counted off the run — including the B-tree ceiling, (" +
      sddatabases_DEV_IOPS.toLocaleString("en-US") + " − " +
      sddatabases_READ_QPS.toLocaleString("en-US") + ") / " + sddatabases_PAGES_PER_ROW +
      " = <b>" + Math.round(sddatabases_BTREE_CAP) + " rows/s</b>, which lands inside the " +
      "handbook's 5k–10k writes per primary.",
    interval: 1500,

    scenarios: [
      sddatabases_btreeScenario(),
      sddatabases_lsmScenario(),
      sddatabases_starvedScenario()
    ],

    draw: function (step, d, ctx) {
      var i;
      var isB = step.engine === "btree";
      var servedRate = step.f < 0 ? 0 : step.dFrame / sddatabases_FRAME_S;

      // ---- the write path -------------------------------------------------
      var admit = d.node({
        title: "admission · pool of " + sddatabases_MAX_CONN,
        status: step.f < 0 ? "IDLE" : step.rFrame > 1 ? "REFUSING" : "ACCEPTING",
        statusFlag: step.f < 0 ? "idle" : step.rFrame > 1 ? "bad" : "ok",
        badge: step.f < 0 ? "no load" : sddatabases_k(step.rate) + " rows/s offered",
        meta: "beyond " + sddatabases_MAX_CONN + " in flight the pool rejects, it does not queue",
        flag: step.f < 0 ? "idle" : step.rFrame > 1 ? "bad" : "ok",
        gauges: [{
          label: "connections in flight",
          pct: sddatabases_pct(step.backlog, sddatabases_MAX_CONN),
          value: Math.round(step.backlog) + " / " + sddatabases_MAX_CONN,
          flag: step.backlog >= sddatabases_MAX_CONN ? "bad"
            : step.backlog > 0 ? "warn" : "idle"
        }],
        rows: [
          { label: "offered", value: Math.round(step.offered).toLocaleString("en-US") },
          {
            label: "durable",
            value: Math.round(step.durable).toLocaleString("en-US"),
            flag: step.durable > 0 ? "ok" : "idle"
          },
          {
            label: "refused",
            value: Math.round(step.refused).toLocaleString("en-US"),
            flag: step.refused > 1 ? "bad" : "idle"
          }
        ]
      });

      // ---- the engine -----------------------------------------------------
      var engineRows = [];
      if (isB) {
        engineRows.push(d.row("heap page write", "1 random I/O per row", "warn"));
        engineRows.push(d.row(
          sddatabases_NIDX + " index leaf writes",
          sddatabases_NIDX + " random I/O per row", "warn"));
        engineRows.push(d.row(
          "read seeks reserved",
          sddatabases_READ_QPS.toLocaleString("en-US") + " / s", "idle"));
        engineRows.push(d.row(
          "write ceiling",
          Math.round(sddatabases_BTREE_CAP).toLocaleString("en-US") + " rows/s",
          "ok"));
      } else {
        engineRows.push(d.row(
          "memtable",
          Math.round(step.memRows).toLocaleString("en-US") + " / " +
            sddatabases_MEM_ROWS.toLocaleString("en-US") + " rows",
          step.memRows > 0 ? "ok" : "idle"));
        engineRows.push(d.row("flushes", String(step.flushes), step.flushes ? "ok" : "idle"));
        engineRows.push(d.row(
          "merges completed", String(step.compactions), step.compactions ? "ok" : "idle"));
        engineRows.push(d.row(
          "merge in progress",
          step.jobPct > 0 ? step.jobPct.toFixed(0) + "%" : "none",
          step.jobPct > 0 ? "warn" : "idle"));
        engineRows.push(d.row(
          "admission rate now",
          step.capRate > 0
            ? Math.round(step.capRate).toLocaleString("en-US") + " rows/s"
            : "stalled",
          step.state === "stop" ? "bad" : step.state === "slow" ? "warn" : "ok"));
      }

      var engine = d.node({
        title: isB ? "B-tree · in place" : "LSM · append + merge",
        status: step.f < 0 ? "IDLE"
          : isB ? "RANDOM I/O"
          : step.state === "stop" ? "WRITES STOPPED"
          : step.state === "slow" ? "THROTTLED"
          : "APPENDING",
        statusFlag: step.f < 0 ? "idle"
          : step.state === "stop" ? "bad" : step.state === "slow" ? "warn" : "ok",
        badge: isB
          ? sddatabases_PAGES_PER_ROW + " pages/row"
          : "compaction " + step.compactMBps + " MB/s",
        meta: isB
          ? "find the page, modify it, write it back"
          : "append to memtable, flush, merge " + sddatabases_L0_TRIGGER + " files at a time",
        flag: step.f < 0 ? "idle"
          : step.state === "stop" ? "bad" : step.state === "slow" ? "warn" : "ok",
        gauges: [
          {
            label: isB ? "random I/O budget" : "sequential bandwidth",
            pct: step.devPct,
            value: step.devPct.toFixed(0) + "%",
            flag: step.f < 0 ? "idle" : step.devPct >= 95 ? "bad"
              : step.devPct >= 80 ? "warn" : "ok"
          },
          {
            label: isB ? "of the write ceiling" : "compaction's share",
            pct: isB
              ? sddatabases_pct(servedRate, sddatabases_BTREE_CAP)
              : step.compactSharePct,
            value: isB
              ? sddatabases_k(servedRate) + " / " + Math.round(sddatabases_BTREE_CAP)
              : step.compactSharePct.toFixed(0) + "%",
            flag: step.f < 0 ? "idle"
              : isB
                ? (servedRate >= sddatabases_BTREE_CAP * 0.99 ? "bad" : "ok")
                : (step.compactSharePct > 40 ? "warn" : "ok")
          }
        ],
        body: engineRows.join("")
      });

      // ---- what it costs the reader ---------------------------------------
      var readNode = d.node({
        title: "read path",
        status: step.readFiles === 0 ? "MEMTABLE ONLY"
          : step.readFiles === 1 ? "ONE SEEK" : step.readFiles + " FILES CHECKED",
        statusFlag: step.readFiles <= 1 ? "ok" : step.readP99 > 2 ? "bad" : "warn",
        badge: sddatabases_READ_QPS.toLocaleString("en-US") + " reads/s",
        meta: isB
          ? "one descent to the leaf, every time"
          : "memtable, then each file newest-first, Bloom filter per file at " +
            (sddatabases_BLOOM_FP * 100).toFixed(0) + "%",
        flag: step.readP99 > 2 ? "bad" : step.readP99 > 1 ? "warn" : "ok",
        rows: [
          {
            label: "files consulted",
            value: step.readFiles ? String(step.readFiles) : "0 (in RAM)",
            flag: step.readFiles > 4 ? "bad" : step.readFiles > 1 ? "warn" : "ok"
          },
          {
            label: "mean seeks",
            value: step.readFiles ? step.readMean.toFixed(2) : "—",
            flag: "idle"
          },
          {
            label: "p99 seeks",
            value: step.readFiles ? String(step.readP99) : "—",
            flag: step.readP99 > 1 ? "warn" : "ok"
          },
          {
            label: "p99 read latency",
            value: step.readFiles ? step.readP99Ms.toFixed(2) + " ms" : "0 ms",
            flag: step.readP99 > 2 ? "bad" : step.readP99 > 1 ? "warn" : "ok"
          }
        ]
      });

      var head = d.flow([
        d.stack([
          d.big(step.f < 0 ? "—" : step.elapsed + " s", "elapsed"),
          d.dots({
            n: step.f < 0 ? 0 : Math.round(step.rate / 2000),
            label: step.f < 0 ? "no arrivals yet" : sddatabases_k(step.rate) + " rows/s arriving",
            flag: step.f < 0 ? undefined
              : step.rate > sddatabases_BTREE_CAP ? "warn" : undefined
          })
        ]),
        admit,
        engine,
        d.stack([
          d.stat({
            label: "durable",
            value: sddatabases_k(step.durable),
            sub: "of " + sddatabases_k(step.offered) + " offered",
            flag: step.durable > 0 ? "ok" : "idle"
          }),
          d.stat({
            label: "refused",
            value: sddatabases_k(step.refused),
            sub: step.offered > 0
              ? sddatabases_pct(step.refused, step.offered).toFixed(0) + "% of the load"
              : "—",
            flag: step.refused > 1 ? "bad" : "idle"
          }),
          d.stat({
            label: "write latency",
            value: step.f < 0 ? "—" : step.latMs < 0 ? "stalled" : step.latMs.toFixed(0) + " ms",
            sub: step.latMs < 0
              ? "admission closed"
              : Math.round(step.backlog) + " in flight / " +
                Math.round(step.capRate || sddatabases_BTREE_CAP) + " per s",
            flag: step.f < 0 ? "idle" : step.latMs < 0 ? "bad"
              : step.latMs > 20 ? "warn" : "ok"
          })
        ]),
        readNode
      ]);

      // ---- the file set a reader has to walk ------------------------------
      var fileCells = [];
      if (!isB) {
        var shownL0 = Math.min(step.l0, 30);
        for (i = 0; i < shownL0; i++) {
          fileCells.push({
            label: "L0",
            flag: step.l0 >= sddatabases_L0_STOP ? "bad"
              : step.l0 >= sddatabases_L0_SLOW ? "warn" : "ok",
            title: "an unmerged L0 file — overlapping key range, so every point read " +
              "must Bloom-check it"
          });
        }
        if (step.l0 > shownL0) {
          fileCells.push({ label: "+" + (step.l0 - shownL0), flag: "bad", title: "more L0 files" });
        }
        var shownL1 = Math.min(step.l1, 12);
        for (i = 0; i < shownL1; i++) {
          fileCells.push({
            label: "L1", flag: "idle",
            title: "a merged L1 file — non-overlapping, so at most one is ever consulted"
          });
        }
        if (step.l1 > shownL1) {
          fileCells.push({ label: "+" + (step.l1 - shownL1), flag: "idle", title: "more L1 files" });
        }
        if (!fileCells.length) {
          fileCells.push({ label: "—", flag: "idle", title: "nothing on disk yet" });
        }
      }

      // ---- history lanes, one cell per frame -------------------------------
      var all = step.all || [];
      var offeredCells = [], durableCells = [], thirdCells = [];
      for (i = 0; i < sddatabases_FRAMES; i++) {
        var fr = i < all.length ? all[i] : null;
        var reached = fr && i <= step.f;
        offeredCells.push({
          label: reached ? sddatabases_k(fr.rate) : "",
          flag: !reached ? "idle"
            : fr.rate > sddatabases_BTREE_CAP ? "warn" : "ok",
          title: reached
            ? "frame " + (i + 1) + " · " + fr.rate + " rows/s offered"
            : "frame " + (i + 1) + " · not reached"
        });
        durableCells.push({
          label: reached ? sddatabases_k(fr.dFrame / sddatabases_FRAME_S) : "",
          flag: !reached ? "idle" : fr.rFrame > 1 ? "bad" : "ok",
          title: reached
            ? "frame " + (i + 1) + " · " +
              Math.round(fr.dFrame / sddatabases_FRAME_S) + " rows/s durable · " +
              Math.round(fr.rFrame) + " refused"
            : "frame " + (i + 1) + " · not reached"
        });
        thirdCells.push({
          label: reached ? (isB ? String(fr.readP99) : String(fr.l0)) : "",
          flag: !reached ? "idle"
            : isB ? "ok"
            : fr.l0 >= sddatabases_L0_STOP ? "bad"
            : fr.l0 >= sddatabases_L0_SLOW ? "warn"
            : fr.l0 > sddatabases_L0_TRIGGER ? "warn" : "ok",
          title: reached
            ? (isB
              ? "frame " + (i + 1) + " · p99 " + fr.readP99 + " seek"
              : "frame " + (i + 1) + " · " + fr.l0 + " L0 files · p99 " + fr.readP99 +
                " seeks · " + fr.readP99Ms.toFixed(2) + " ms")
            : "frame " + (i + 1) + " · not reached"
        });
      }

      var lanes = d.stack([
        d.lane({ label: "offered", cells: offeredCells }),
        d.lane({ label: "durable", cells: durableCells }),
        d.lane({ label: isB ? "p99 seeks" : "L0 files", cells: thirdCells })
      ]);

      var legend = isB
        ? "One cell per frame. The B-tree's read row never moves — one descent to the leaf, " +
          "<b>" + sddatabases_SEEK_MS.toFixed(2) + " ms</b>, whatever the write load is doing. " +
          "The write row is the one that hits a wall, and the wall is arithmetic: " +
          sddatabases_PAGES_PER_ROW + " random page writes per row against a " +
          sddatabases_DEV_IOPS.toLocaleString("en-US") + "/s device."
        : "Each <b>L0</b> block is an unmerged file whose key range overlaps every other L0 " +
          "file, so a point read Bloom-checks all of them and pays <b>" +
          sddatabases_SEEK_MS.toFixed(2) + " ms</b> for each false positive. <b>L1</b> files " +
          "are the merge output: non-overlapping, so at most one is ever read. The L0 count " +
          "is the health of this store — it is what compaction is for, and what a throttled " +
          "compaction stops doing.";

      return d.stack([
        head,
        isB ? "" : d.cells(fileCells, { label: "files on disk, newest first", dense: true }),
        lanes,
        d.note(legend)
      ]);
    }
  };

})();
