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
// SIM · sdantipatterns  (anti-patterns.md)
//
// The page is a list, but the list has a clock inside it. Almost every entry
// is dated: "drawing boxes at minute two", "state the plan at minute one",
// "everything before minute 25 is setup", "at minute 40, stop adding and
// start killing boxes", "by minute 30 nobody can follow the diagram". So the
// time axis is the round itself — one 45-minute interview, minute by minute,
// with the same problem given to three candidates. Nothing here is scored by
// opinion: a phase that does not get its minutes does not produce its
// deliverable, and the anti-patterns that deliverable would have prevented
// fire by omission.
//
// CONFIG — handbook figures used verbatim
//   45-minute round and the six phase windows are the-framework.md's table:
//     1 Requirements & scope  0–5    4 High-level design  13–25
//     2 Estimation            5–8    5 Deep dive          25–40
//     3 API & data model      8–13   6 Failure & wrap     40–45
//   anti-patterns.md's own figures:
//     10,000 users          ("multi-region, sharded, event-sourced — for
//                            10,000 users")
//     5,000 writes/s        ("I'd shard when writes approach 5,000 a second")
//     1000:1 reads          ("establishing 1000:1 reads")
//     minute 25 / minute 30 / minute 40 thresholds, quoted in the captions
//     8 self-check boxes, strong round at 6, "fewer than four" at 4
//     5 rows in "the five that cost the most"
//     22 named anti-patterns (the page's summary rounds this to "twenty";
//        the catalogue below is the actual ### headings, counted)
//   numbers-to-know.md / estimation.md conventions:
//     100,000 seconds per day, peak = 3x average (single-timezone),
//     one app server per 10,000 peak QPS
//
// CONFIG — declared here, because the page states none
//   need[phase]   the minutes a phase needs to produce its deliverable:
//                 4 / 2 / 3 / 8 / 10 / 3   (sums to 30 of the 45)
//   MIN_PER_BOX   2 minutes to draw a box, label it and say why it is there,
//                 so the board size is derived from phase-4 minutes
//   reads/user/day 20
//   Each candidate declares only how many minutes they WANT per phase. The
//   clock is the hard constraint: a phase gets min(wanted, minutes left).
//   Everything else on screen — minutes actually spent, boxes drawn, ticks,
//   anti-patterns tripped, and how many of those were knowledge rather than
//   clock — is counted off that run.
// ======================================================================

var sdantipatterns_TOTAL = 45;

// the-framework.md's phase table, verbatim; `need` is this sim's declaration
var sdantipatterns_PH = [
  { n: 1, name: "Requirements & scope", lo: 0,  hi: 5,  need: 4,
    leave: "a written list of what is in and out" },
  { n: 2, name: "Estimation",           lo: 5,  hi: 8,  need: 2,
    leave: "QPS, storage, and one number that shapes the design" },
  { n: 3, name: "API & data model",     lo: 8,  hi: 13, need: 3,
    leave: "three or four endpoints and the core entities" },
  { n: 4, name: "High-level design",    lo: 13, hi: 25, need: 8,
    leave: "a diagram that satisfies the functional requirements" },
  { n: 5, name: "Deep dive",            lo: 25, hi: 40, need: 10,
    leave: "one or two components taken three levels down" },
  { n: 6, name: "Failure & wrap",       lo: 40, hi: 45, need: 3,
    leave: "what breaks, how you know, what you would do next" }
];

var sdantipatterns_MIN_PER_BOX = 2;
// the board a candidate can draw inside phase 4's own window
var sdantipatterns_BUDGET_BOXES = Math.round(
  (sdantipatterns_PH[3].hi - sdantipatterns_PH[3].lo) / sdantipatterns_MIN_PER_BOX);

// ---- the estimate every candidate is handed the same inputs for ----------
var sdantipatterns_USERS    = 10000;    // page: "for 10,000 users"
var sdantipatterns_RPU      = 20;       // declared: reads per user per day
var sdantipatterns_RW       = 1000;     // page: "1000:1 reads"
var sdantipatterns_SECS_DAY = 100000;   // handbook: use 100,000 s/day
var sdantipatterns_PEAK     = 3;        // handbook: single-timezone peak 3x
var sdantipatterns_SHARD_AT = 5000;     // page: shard near 5,000 writes/s
var sdantipatterns_SRV_CAP  = 10000;    // handbook: peak QPS / 10,000 = servers

var sdantipatterns_READS_DAY  = sdantipatterns_USERS * sdantipatterns_RPU;
var sdantipatterns_WRITES_DAY = sdantipatterns_READS_DAY / sdantipatterns_RW;
var sdantipatterns_R_AVG = sdantipatterns_READS_DAY / sdantipatterns_SECS_DAY;
var sdantipatterns_W_AVG = sdantipatterns_WRITES_DAY / sdantipatterns_SECS_DAY;
var sdantipatterns_R_PEAK = sdantipatterns_R_AVG * sdantipatterns_PEAK;
var sdantipatterns_W_PEAK = sdantipatterns_W_AVG * sdantipatterns_PEAK;
var sdantipatterns_HEADROOM = sdantipatterns_SHARD_AT / sdantipatterns_W_PEAK;
var sdantipatterns_SERVERS = Math.max(
  1, Math.ceil(sdantipatterns_R_PEAK / sdantipatterns_SRV_CAP));

// ---- the page's eight self-check boxes, and the phase each is settled in --
var sdantipatterns_BOX = [
  { ph: 1, q: "Did I write down in-scope and out-of-scope?" },
  { ph: 4, q: "Did one estimate change a decision?" },
  { ph: 4, q: "Can I trace every major choice to a requirement?" },
  { ph: 5, q: "Did I go three levels deep on at least one component?" },
  { ph: 6, q: "Did I name a weakness in my own design unprompted?" },
  { ph: 5, q: "Does every network call have a timeout?" },
  { ph: 6, q: "Did I say what happens when the cache / queue / leader fails?" },
  { ph: 4, q: "Is the board still readable?" }
];
var sdantipatterns_STRONG = 6;   // page: "six or more is a strong round"
var sdantipatterns_WEAK   = 4;   // page: "fewer than four"

// ----------------------------------------------------------------------
// The catalogue: every ### heading on the page, in page order, with the
// phase it is settled in, the test that fires it, and — where the candidate
// would have avoided it given the minutes — the `knew` test that marks the
// trip as a clock loss rather than a knowledge gap.
// ----------------------------------------------------------------------
var sdantipatterns_APS = [
  { s: "process", ph: 1, name: "Designing before scoping",
    f: function (x) { return !x.ok[0]; } },
  { s: "process", ph: 1, name: "Waiting to be led",
    f: function (x) { return !x.tr.narratesPlan; } },
  { s: "process", ph: 2, name: "Silent thinking",
    f: function (x) { return !x.tr.narrates; } },
  { s: "process", ph: 5, name: "Running out of time in the deep dive",
    f: function (x) { return !x.ok[4]; },
    knew: function (x) { return x.want[4] >= sdantipatterns_PH[4].need; } },
  { s: "process", ph: 6, name: "Never reaching failure",
    f: function (x) { return !x.ok[5]; },
    knew: function (x) { return x.want[5] >= sdantipatterns_PH[5].need; } },

  { s: "technical", ph: 4, name: "Over-engineering",
    f: function (x) { return x.tr.overbuild; } },
  { s: "technical", ph: 4, name: "Name-dropping without reasons",
    f: function (x) { return x.tr.nameDrops; } },
  { s: "technical", ph: 4, name: "The magic box",
    f: function (x) { return x.tr.magicBox; } },
  { s: "technical", ph: 4, name: "Ignoring your own requirements",
    f: function (x) { return !x.tr.heedsEstimate; } },
  { s: "technical", ph: 3, name: "Blobs in the database",
    f: function (x) { return x.tr.blobs; } },
  { s: "technical", ph: 5, name: "A cache with no invalidation story",
    f: function (x) { return !(x.tr.cacheStory && x.ok[4]); },
    knew: function (x) { return x.tr.cacheStory; } },
  { s: "technical", ph: 5, name: "Unbounded anything",
    f: function (x) { return !(x.tr.bounds && x.ok[4]); },
    knew: function (x) { return x.tr.bounds; } },
  { s: "technical", ph: 5, name: "Retries without backoff",
    f: function (x) { return !(x.tr.backoff && x.ok[4]); },
    knew: function (x) { return x.tr.backoff; } },
  { s: "technical", ph: 5, name: "Distributed locks as a correctness mechanism",
    f: function (x) { return x.tr.lockAsTruth; } },
  { s: "technical", ph: 5, name: "Ignoring the celebrity / hot-key case",
    f: function (x) { return !(x.tr.hotKey && x.ok[4]); },
    knew: function (x) { return x.tr.hotKey; } },
  { s: "technical", ph: 4, name: "Two-phase commit across services",
    f: function (x) { return x.tr.twoPC; } },
  { s: "technical", ph: 6, name: "Designing only the happy path",
    f: function (x) { return !(x.tr.timeouts && x.ok[4] && x.ok[5]); },
    knew: function (x) { return x.tr.timeouts; } },

  { s: "communication", ph: 5, name: "Defending instead of examining",
    f: function (x) { return x.tr.defends; } },
  { s: "communication", ph: 5, name: "Bluffing",
    f: function (x) { return x.tr.bluffs; } },
  { s: "communication", ph: 4, name: "An unreadable board",
    f: function (x) { return !x.box[7]; } },
  { s: "communication", ph: 4, name: "Presenting instead of designing",
    f: function (x) { return x.tr.presents; } },
  { s: "communication", ph: 6, name: "Never mentioning trade-offs",
    f: function (x) { return !x.tr.volunteersTradeoffs; } }
];

// page §4 "the five that cost the most", mapped onto catalogue indices
var sdantipatterns_FIVE = [
  { label: "Designing before scoping", fix: "Five minutes of questions, written down", i: 0 },
  { label: "Choices with no because", fix: "Every decision traced to a requirement", i: 6 },
  { label: "Presenting one right answer", fix: "Volunteering your own design's weakness", i: 21 },
  { label: "Over-engineering", fix: "The simplest thing, plus the trigger to change", i: 5 },
  { label: "Never reaching failure analysis", fix: "Kill each box at minute 40", i: 4 }
];

function sdantipatterns_n(v, dec) {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("en-US", {
    minimumFractionDigits: dec === undefined ? 0 : dec,
    maximumFractionDigits: dec === undefined ? 0 : dec
  });
}
function sdantipatterns_pct(a, b) { return b > 0 ? (a / b) * 100 : 0; }

// ----------------------------------------------------------------------
// One round. The clock is the only authority: a phase gets what it asks for
// or what is left, whichever is smaller.
// ----------------------------------------------------------------------
function sdantipatterns_run(cfg) {
  var P = sdantipatterns_PH;
  var m = [], ok = [], startAt = [], endAt = [];
  var t = 0, i, want, left, got;

  for (i = 0; i < P.length; i++) {
    want = cfg.want[i];
    left = sdantipatterns_TOTAL - t;
    got = want < left ? want : left;
    if (got < 0) got = 0;
    startAt.push(t);
    t += got;
    m.push(got);
    endAt.push(t);
    ok.push(got >= P[i].need);
  }

  var tr = cfg.traits;
  var boardBudget = P[3].hi - P[3].lo;                 // 12
  var boxes = Math.round(m[3] / sdantipatterns_MIN_PER_BOX);

  var box = [
    ok[0],
    ok[1] && tr.heedsEstimate,
    ok[0] && tr.heedsEstimate,
    ok[4],
    tr.volunteersTradeoffs,
    tr.timeouts && ok[4],
    ok[5],
    m[3] <= boardBudget || tr.redraws
  ];

  var x = { want: cfg.want, m: m, ok: ok, startAt: startAt, endAt: endAt,
            tr: tr, box: box, boxes: boxes };

  // which anti-patterns fire, and which of those are clock losses
  var trip = [], clock = [], nTrip = 0, nClock = 0;
  for (i = 0; i < sdantipatterns_APS.length; i++) {
    var ap = sdantipatterns_APS[i];
    var fired = !!ap.f(x);
    var isClock = fired && !!ap.knew && !!ap.knew(x);
    trip.push(fired);
    clock.push(isClock);
    if (fired) nTrip++;
    if (isClock) nClock++;
  }
  x.trip = trip; x.clock = clock; x.nTrip = nTrip; x.nClock = nClock;

  // minute-by-minute: was this minute spent on the phase the clock said?
  var mins = [];
  for (i = 0; i < P.length; i++) {
    for (var k = 0; k < m[i]; k++) {
      var at = startAt[i] + k;
      mins.push({ at: at, ph: i, onClock: at >= P[i].lo && at < P[i].hi });
    }
  }
  var onClock = 0;
  for (i = 0; i < mins.length; i++) if (mins[i].onClock) onClock++;
  x.mins = mins;
  x.onClock = onClock;

  var ticks = 0;
  for (i = 0; i < box.length; i++) if (box[i]) ticks++;
  x.ticks = ticks;

  return x;
}

/** Counts settled at or before phase p (p = 0 means nothing settled yet). */
function sdantipatterns_upto(x, p) {
  var i, trip = 0, clk = 0, decided = 0, ticks = 0, bDec = 0;
  for (i = 0; i < sdantipatterns_APS.length; i++) {
    if (sdantipatterns_APS[i].ph <= p) {
      decided++;
      if (x.trip[i]) trip++;
      if (x.clock[i]) clk++;
    }
  }
  for (i = 0; i < sdantipatterns_BOX.length; i++) {
    if (sdantipatterns_BOX[i].ph <= p) {
      bDec++;
      if (x.box[i]) ticks++;
    }
  }
  return { trip: trip, clock: clk, decided: decided, ticks: ticks, bDec: bDec };
}

// ----------------------------------------------------------------------
// Frames: idle, one per phase, then the scorecard.
// ----------------------------------------------------------------------
function sdantipatterns_scenario(cfg) {
  var x = sdantipatterns_run(cfg);
  var P = sdantipatterns_PH;
  var steps = [{
    x: x, p: 0, elapsed: 0, flag: "idle",
    caption: cfg.idle
  }];

  for (var i = 0; i < P.length; i++) {
    var u = sdantipatterns_upto(x, P[i].n);
    var prev = sdantipatterns_upto(x, P[i].n - 1);
    var newTrips = u.trip - prev.trip;
    var budget = P[i].hi - P[i].lo;
    var over = x.m[i] - budget;

    var head;
    if (x.m[i] === 0) {
      head = "<b>Phase " + P[i].n + " never happens.</b> The clock reached " +
        x.startAt[i] + " with " + (sdantipatterns_TOTAL - x.startAt[i]) +
        " minutes left and the earlier phases had already spent them. ";
    } else if (x.m[i] < P[i].need) {
      head = "<b>Phase " + P[i].n + " is cut to " + x.m[i] + " minute" +
        (x.m[i] === 1 ? "" : "s") + "</b> — it needs " + P[i].need +
        " to leave with " + P[i].leave + ", and it wanted " + cfg.want[i] + ". ";
    } else if (over > 0) {
      head = "<b>Phase " + P[i].n + " runs " + over + " minute" +
        (over === 1 ? "" : "s") + " past its window</b> (" + x.m[i] + " spent, " +
        budget + " budgeted, clock now at " + x.endAt[i] + "). ";
    } else {
      head = "<b>Phase " + P[i].n + " closes at minute " + x.endAt[i] +
        ", inside its " + P[i].lo + "–" + P[i].hi + " window.</b> ";
    }

    var tail = newTrips === 0
      ? "Nothing on the list fires here; " + (u.decided - u.trip) + " of the " +
        u.decided + " settled so far are clear."
      : "<b>" + newTrips + "</b> anti-pattern" + (newTrips === 1 ? "" : "s") +
        " fire" + (newTrips === 1 ? "s" : "") + " in this phase — " + u.trip +
        " of the " + u.decided + " settled so far.";

    steps.push({
      x: x, p: P[i].n, elapsed: x.endAt[i],
      caption: head + cfg.say[i] + " " + tail,
      flag: x.m[i] === 0 ? "bad"
        : x.m[i] < P[i].need ? "bad"
        : newTrips >= 2 ? "bad"
        : newTrips === 1 ? "warn" : "ok"
    });
  }

  steps.push({
    x: x, p: 7, elapsed: sdantipatterns_TOTAL, report: true,
    caption: cfg.verdict(x),
    flag: x.ticks >= sdantipatterns_STRONG ? "ok"
      : x.ticks < sdantipatterns_WEAK ? "bad" : "warn"
  });

  return { id: cfg.id, label: cfg.label, steps: steps };
}

// ----------------------------------------------------------------------
// Scenario 1 — the page's opening line, run: boxes at minute two.
// ----------------------------------------------------------------------
var sdantipatterns_A = sdantipatterns_scenario({
  id: "boxes", label: "Boxes at minute two",
  want: [2, 0, 3, 34, 15, 5],
  traits: {
    narratesPlan: false, narrates: false, heedsEstimate: false,
    overbuild: false, nameDrops: true, magicBox: true, blobs: false,
    cacheStory: true, bounds: true, backoff: true, timeouts: true,
    lockAsTruth: false, hotKey: true, twoPC: false,
    defends: false, bluffs: false, presents: false,
    volunteersTradeoffs: false, redraws: false
  },
  idle: "<b>Same prompt, same 45 minutes, same interviewer.</b> This candidate " +
    "asks two minutes of questions, skips the estimate entirely, and starts " +
    "drawing. He knows the technical material — caching, backoff, hot keys, " +
    "timeouts are all things he can talk about. Watch where the minutes go " +
    "instead. Press Play.",
  say: [
    "Two questions, no board, no in-scope list — the page's first and most " +
      "expensive failure, and it happens before minute three.",
    "Skipped outright. No QPS, no storage, no number that shapes anything, " +
      "so nothing downstream can be traced to a requirement.",
    "Three minutes of endpoints at minute two, which is the right work in the " +
      "wrong window — bytes to object storage, metadata in Postgres, so at " +
      "least the blob anti-pattern stays clear.",
    "The board grows for 34 minutes. Kafka and Elasticsearch get named with " +
      "no property attached, and a box labelled \"ranking\" never gets opened. " +
      "By minute 30 the page's warning has come true literally: nobody can " +
      "follow the diagram, including him.",
    "Six minutes left for the part that is scored. Cache invalidation, retry " +
      "backoff, queue bounds and the celebrity key are all things he would " +
      "have said — there is no clock left to say them in.",
    "Minute 45 arrives during the deep dive. Nothing is killed, no timeout is " +
      "named, and the rubric line for failure analysis is scored empty."
  ],
  verdict: function (x) {
    return "<b>" + x.nTrip + " of " + sdantipatterns_APS.length +
      " anti-patterns tripped and " + x.ticks + " of " +
      sdantipatterns_BOX.length + " self-check boxes ticked</b> — the page's " +
      "own bar is " + sdantipatterns_STRONG + ", and below " +
      sdantipatterns_WEAK + " it says the design's quality will not save it. " +
      "But read the breakdown before reading the score: <b>" + x.nClock +
      "</b> of those " + x.nTrip + " trips are things this candidate knew and " +
      "never got to say, because the phase they belonged in was handed <b>" +
      x.m[4] + " minutes</b> instead of " + sdantipatterns_PH[4].need +
      ". Only <b>" + x.onClock + " of " + sdantipatterns_TOTAL +
      "</b> minutes (" + sdantipatterns_pct(x.onClock, sdantipatterns_TOTAL).toFixed(0) +
      "%) were spent on the phase the clock said. <i>He did not fail on " +
      "knowledge. He spent " + x.m[3] + " minutes drawing " + x.boxes +
      " boxes and the rubric was somewhere else.</i>";
  }
});

// ----------------------------------------------------------------------
// Scenario 2 — the framework's budget, spent exactly.
// ----------------------------------------------------------------------
var sdantipatterns_B = sdantipatterns_scenario({
  id: "framework", label: "The framework, run",
  want: [5, 3, 5, 12, 15, 5],
  traits: {
    narratesPlan: true, narrates: true, heedsEstimate: true,
    overbuild: false, nameDrops: false, magicBox: false, blobs: false,
    cacheStory: true, bounds: true, backoff: true, timeouts: true,
    lockAsTruth: false, hotKey: true, twoPC: false,
    defends: false, bluffs: false, presents: false,
    volunteersTradeoffs: true, redraws: true
  },
  idle: "<b>The same prompt, to a candidate who says the plan out loud at " +
    "minute one</b> and then spends the handbook's phase budgets — 5 / 3 / 5 / " +
    "12 / 15 / 5 — as written. Same technical knowledge as the first tab. " +
    "The only difference on this run is where the minutes land.",
  say: [
    "Five minutes of questions and an explicit \"does that sound right?\", " +
      "with in-scope and out-of-scope written in the corner where they stay " +
      "visible all round.",
    "Three minutes of arithmetic, narrated the whole way, producing the one " +
      "number the rest of the design gets argued against.",
    "Four endpoints and the core entities, bytes to object storage and " +
      "metadata in the database.",
    "Twelve minutes, six boxes, every arrow labelled, and the estimate cited " +
      "out loud when the data tier is chosen — which is what ticks the two " +
      "traceability boxes rather than the diagram being pretty.",
    "Fifteen minutes three levels down: cache pattern and TTL and what the " +
      "database sees cold, a bounded queue with a stated overflow policy, " +
      "backoff with jitter and a retry budget, and the celebrity key raised " +
      "before the interviewer can ask.",
    "Minute 40 on the dot: stop adding, start killing boxes, and volunteer " +
      "the weakest part of the design before being asked."
  ],
  verdict: function (x) {
    return "<b>" + x.nTrip + " anti-patterns tripped, " + x.ticks + " of " +
      sdantipatterns_BOX.length + " boxes ticked, " + x.onClock + " of " +
      sdantipatterns_TOTAL + " minutes on the phase the clock said.</b> The " +
      "point is not that this candidate is better — the technical traits fed " +
      "into this run are <i>identical</i> to the first tab's. The board is " +
      "<b>" + x.boxes + "</b> boxes against that run's " + sdantipatterns_A.steps[0].x.boxes +
      ", the deep dive got <b>" + x.m[4] + "</b> minutes against its " +
      sdantipatterns_A.steps[0].x.m[4] + ", and that single reallocation is " +
      "worth <b>" + sdantipatterns_A.steps[0].x.nTrip + " anti-patterns and " +
      (x.ticks - sdantipatterns_A.steps[0].x.ticks) + " rubric lines</b>. " +
      "<i>The list on this page is mostly a budgeting document wearing a " +
      "behaviour costume.</i>";
  }
});

// ----------------------------------------------------------------------
// Scenario 3 — the failure mode the page says is actively scored as a
// negative: perfect process, ignored estimate.
// ----------------------------------------------------------------------
var sdantipatterns_C = sdantipatterns_scenario({
  id: "overbuilt", label: "Perfect process, ignored estimate",
  want: [5, 3, 5, 20, 10, 5],
  traits: {
    narratesPlan: true, narrates: true, heedsEstimate: false,
    overbuild: true, nameDrops: true, magicBox: false, blobs: false,
    cacheStory: true, bounds: true, backoff: true, timeouts: true,
    lockAsTruth: false, hotKey: true, twoPC: true,
    defends: true, bluffs: false, presents: false,
    volunteersTradeoffs: false, redraws: true
  },
  idle: "<b>The strongest candidate of the three, and the most interesting " +
    "failure.</b> Scopes properly, estimates properly, narrates, redraws the " +
    "board when it gets crowded — and then designs multi-region, sharded and " +
    "event-sourced for the " + sdantipatterns_n(sdantipatterns_USERS) +
    " users the estimate just measured. Watch the estimate get produced and " +
    "then ignored.",
  say: [
    "Five clean minutes. In-scope and out-of-scope on the board, and an " +
      "explicit confirmation.",
    "The arithmetic is correct and it is about to be discarded: " +
      sdantipatterns_n(sdantipatterns_W_PEAK, 3) + " peak writes a second " +
      "against a " + sdantipatterns_n(sdantipatterns_SHARD_AT) +
      "/s shard trigger is " + sdantipatterns_n(sdantipatterns_HEADROOM) +
      "x of headroom, and " + sdantipatterns_n(sdantipatterns_R_PEAK) +
      " peak reads a second fits on " + sdantipatterns_SERVERS + " app server.",
    "Four endpoints, clean entities, bytes in object storage. Nothing wrong here.",
    "Twenty minutes and a second region, a shard router, an event log and a " +
      "read-model projector — every one of them named without a property " +
      "attached, and a distributed transaction spanning the services the " +
      "design just split into. The board stays readable because he redraws it; " +
      "it is readable and it is wrong.",
    "Exactly the ten minutes the deep dive needs, and the technical content is " +
      "genuinely good — invalidation, bounds, backoff, timeouts, hot keys, all " +
      "present. When the interviewer probes the sharding he defends it instead " +
      "of asking what he is missing.",
    "Two minutes for failure and wrap, because phase 4 ate three. Not enough " +
      "to kill a box, and the design's own weakness is never volunteered."
  ],
  verdict: function (x) {
    var a = sdantipatterns_A.steps[0].x;
    return "<b>" + x.ticks + " of " + sdantipatterns_BOX.length + " — " +
      "below the page's " + sdantipatterns_STRONG + ", above its " +
      sdantipatterns_WEAK + " — with " + x.nTrip + " anti-patterns tripped and " +
      x.onClock + " of " + sdantipatterns_TOTAL + " minutes (" +
      sdantipatterns_pct(x.onClock, sdantipatterns_TOTAL).toFixed(0) +
      "%) on the clock.</b> That is better process than the first tab by <b>" +
      (x.onClock - a.onClock) + " minutes</b> and the most sophisticated " +
      "architecture of the three, and it is still not a strong round. The " +
      "reason is one row: the estimate said <b>" +
      sdantipatterns_n(sdantipatterns_W_PEAK, 3) + " writes a second</b> and " +
      "the design was built for a shard trigger <b>" +
      sdantipatterns_n(sdantipatterns_HEADROOM) + "x</b> away, which costs " +
      "<i>Over-engineering</i>, <i>Ignoring your own requirements</i> and both " +
      "traceability boxes at once. <i>Producing an estimate and then not " +
      "letting it decide anything scores worse than not estimating, because " +
      "the interviewer watched you ask the question and discard the answer.</i>";
  }
});

// ======================================================================
S["sdantipatterns"] = {
  title: "Run one 45-minute round three times",
  note: "One prompt, one interviewer, three candidates, and the handbook's " +
    "phase windows as the only clock: <b>" +
    "1 Requirements 0–5 · 2 Estimation 5–8 · 3 API 8–13 · 4 High-level 13–25 · " +
    "5 Deep dive 25–40 · 6 Failure 40–45</b>. Each candidate declares only how " +
    "many minutes they <i>want</i> per phase; a phase then gets that or " +
    "whatever is left, whichever is smaller, and a phase below the minutes it " +
    "needs (<b>" +
    (function () {
      var a = [], i;
      for (i = 0; i < sdantipatterns_PH.length; i++) a.push(sdantipatterns_PH[i].need);
      return a.join(" / ");
    })() +
    "</b>, declared here) does not produce its deliverable. The shared " +
    "estimate uses the page's own figures — <b>" +
    sdantipatterns_n(sdantipatterns_USERS) + "</b> users at <b>" +
    sdantipatterns_RW + ":1</b> reads, " + sdantipatterns_RPU +
    " reads per user per day, the handbook's " +
    sdantipatterns_n(sdantipatterns_SECS_DAY) + " s/day and " +
    sdantipatterns_PEAK + "x peak — giving <b>" +
    sdantipatterns_n(sdantipatterns_R_PEAK) + "</b> peak reads/s and <b>" +
    sdantipatterns_n(sdantipatterns_W_PEAK, 3) + "</b> peak writes/s against " +
    "the page's <b>" + sdantipatterns_n(sdantipatterns_SHARD_AT) +
    "</b>/s shard trigger. Boards are sized at <b>" +
    sdantipatterns_MIN_PER_BOX + " minutes a box</b>. The catalogue is the " +
    "page's <b>" + sdantipatterns_APS.length + "</b> named anti-patterns (its " +
    "summary rounds that to twenty) and its <b>" + sdantipatterns_BOX.length +
    "</b> self-check boxes; every tick, trip and percentage below is counted " +
    "off the run.",
  interval: 1500,

  scenarios: [sdantipatterns_A, sdantipatterns_B, sdantipatterns_C],

  draw: function (step, d, ctx) {
    var x = step.x, p = step.p, i;
    var P = sdantipatterns_PH;
    var settled = p === 7 ? 6 : p;
    var u = sdantipatterns_upto(x, settled);
    var cur = p >= 1 && p <= 6 ? P[p - 1] : null;
    var mi = p >= 1 && p <= 6 ? p - 1 : -1;

    // ---- headline ------------------------------------------------------
    var head = d.flow([
      d.big(step.elapsed + " min",
        p === 0 ? "the round has not started" : "of " + sdantipatterns_TOTAL + " spent",
        p === 0 ? "idle" : step.elapsed >= sdantipatterns_TOTAL ? "warn" : "ok"),
      d.stat({
        label: "anti-patterns tripped",
        value: p === 0 ? "—" : u.trip + " / " + u.decided,
        sub: p === 0 ? "nothing settled yet"
          : u.clock ? u.clock + " of them for want of minutes"
          : "of " + sdantipatterns_APS.length + " on the page",
        flag: p === 0 ? "idle" : u.trip === 0 ? "ok" : u.trip > u.decided / 2 ? "bad" : "warn"
      }),
      d.stat({
        label: "self-check",
        value: p === 0 ? "—" : u.ticks + " / " + u.bDec,
        sub: "strong round at " + sdantipatterns_STRONG + " of " + sdantipatterns_BOX.length,
        flag: p === 0 ? "idle"
          : u.bDec === 0 ? "idle"
          : u.ticks === u.bDec ? "ok"
          : u.ticks === 0 ? "bad" : "warn"
      }),
      (function () {
        var c = 0, k;
        for (k = 0; k < x.mins.length; k++) {
          if (x.mins[k].at < step.elapsed && x.mins[k].onClock) c++;
        }
        return d.stat({
          label: "minutes on the clock's phase",
          value: p === 0 ? "—" : String(c),
          sub: p === 0 ? "clock at zero" : "of " + step.elapsed + " spent so far",
          flag: p === 0 || step.elapsed === 0 ? "idle"
            : c === step.elapsed ? "ok"
            : c * 2 < step.elapsed ? "bad" : "warn"
        });
      })()
    ]);

    // ---- the phase currently on screen ----------------------------------
    var rows = [];
    if (!cur) {
      rows.push({ label: "round length", value: sdantipatterns_TOTAL + " minutes" });
      rows.push({ label: "phases", value: String(P.length) });
      rows.push({ label: "anti-patterns on the page", value: String(sdantipatterns_APS.length) });
      rows.push({ label: "self-check boxes", value: String(sdantipatterns_BOX.length) });
    } else if (mi === 1) {
      rows.push({ label: "users", value: sdantipatterns_n(sdantipatterns_USERS) });
      rows.push({ label: "peak reads / s",
        value: sdantipatterns_n(sdantipatterns_R_PEAK) });
      rows.push({ label: "peak writes / s",
        value: sdantipatterns_n(sdantipatterns_W_PEAK, 3) });
      rows.push({ label: "shard trigger",
        value: sdantipatterns_n(sdantipatterns_SHARD_AT) + " writes / s" });
      rows.push({
        label: "headroom to the trigger",
        value: x.m[1] > 0 ? sdantipatterns_n(sdantipatterns_HEADROOM) + "x" : "never computed",
        flag: x.m[1] > 0 ? "ok" : "bad"
      });
      rows.push({
        label: "does the design use it?",
        value: x.tr.heedsEstimate ? "yes — it picks the data tier"
          : x.m[1] > 0 ? "no — produced and discarded" : "no estimate exists",
        flag: x.tr.heedsEstimate ? "ok" : "bad"
      });
    } else if (mi === 3) {
      rows.push({
        label: "minutes on the board",
        value: x.m[3] + " of " + (cur.hi - cur.lo),
        flag: x.m[3] > cur.hi - cur.lo ? "bad" : "ok"
      });
      rows.push({
        label: "boxes drawn",
        value: String(x.boxes) + " at " + sdantipatterns_MIN_PER_BOX + " min each",
        flag: x.boxes > sdantipatterns_BUDGET_BOXES
          ? (x.tr.overbuild ? "bad" : "warn") : "ok"
      });
      rows.push({
        label: "board at minute 30",
        value: x.box[7] ? "readable" : "unreadable",
        flag: x.box[7] ? "ok" : "bad"
      });
      rows.push({
        label: "every arrow named for a property",
        value: x.tr.nameDrops ? "no — technologies, no reasons" : "yes",
        flag: x.tr.nameDrops ? "bad" : "ok"
      });
      rows.push({
        label: "clock when the board is done",
        value: "minute " + x.endAt[3],
        flag: x.endAt[3] > cur.hi ? "bad" : "ok"
      });
    } else if (mi === 4) {
      rows.push({
        label: "minutes for the scored phase",
        value: x.m[4] + " of " + (cur.hi - cur.lo) + ", needs " + cur.need,
        flag: x.ok[4] ? "ok" : "bad"
      });
      rows.push({
        label: "three levels deep on a component",
        value: x.ok[4] ? "yes" : "no",
        flag: x.ok[4] ? "ok" : "bad"
      });
      rows.push({
        label: "topics he could have covered",
        value: (x.tr.cacheStory ? 1 : 0) + (x.tr.bounds ? 1 : 0) +
          (x.tr.backoff ? 1 : 0) + (x.tr.hotKey ? 1 : 0) + " of 4"
      });
      rows.push({
        label: "topics the clock let him cover",
        value: x.ok[4]
          ? ((x.tr.cacheStory ? 1 : 0) + (x.tr.bounds ? 1 : 0) +
             (x.tr.backoff ? 1 : 0) + (x.tr.hotKey ? 1 : 0)) + " of 4"
          : "0 of 4",
        flag: x.ok[4] ? "ok" : "bad"
      });
    } else if (mi === 5) {
      rows.push({
        label: "minutes for failure and wrap",
        value: x.m[5] + " of " + (cur.hi - cur.lo) + ", needs " + cur.need,
        flag: x.ok[5] ? "ok" : "bad"
      });
      rows.push({
        label: "boxes killed at minute 40",
        value: x.ok[5] ? String(x.boxes) : "0",
        flag: x.ok[5] ? "ok" : "bad"
      });
      rows.push({
        label: "own weakness volunteered",
        value: x.tr.volunteersTradeoffs ? "yes, unprompted" : "never",
        flag: x.tr.volunteersTradeoffs ? "ok" : "bad"
      });
    } else {
      rows.push({
        label: "minutes spent",
        value: x.m[mi] + " of " + (cur.hi - cur.lo) + " budgeted",
        flag: x.m[mi] === 0 ? "bad" : x.m[mi] >= cur.need ? "ok" : "bad"
      });
      rows.push({
        label: "minutes it needs",
        value: String(cur.need)
      });
      rows.push({
        label: "leaves with",
        value: x.m[mi] >= cur.need ? cur.leave : "nothing",
        flag: x.m[mi] >= cur.need ? "ok" : "bad"
      });
      rows.push({
        label: "clock at the end of it",
        value: "minute " + x.endAt[mi] + " (window ends " + cur.hi + ")",
        flag: x.endAt[mi] > cur.hi ? "bad" : "ok"
      });
    }

    var status;
    if (!cur) status = p === 7 ? "SCORECARD" : "MINUTE 0";
    else if (x.m[mi] === 0) status = "NEVER REACHED";
    else if (x.m[mi] < cur.need) status = "CUT TO " + x.m[mi] + " MIN";
    else if (x.m[mi] > cur.hi - cur.lo) status = "OVER BY " + (x.m[mi] - (cur.hi - cur.lo));
    else status = "ON BUDGET";

    var gauges = [];
    if (cur) {
      gauges.push({
        label: "this phase's minutes",
        pct: sdantipatterns_pct(x.m[mi], cur.hi - cur.lo),
        value: x.m[mi] + " / " + (cur.hi - cur.lo),
        flag: x.m[mi] === 0 ? "bad"
          : x.m[mi] < cur.need ? "bad"
          : x.m[mi] > cur.hi - cur.lo ? "warn" : "ok"
      });
    }
    gauges.push({
      label: "round consumed",
      pct: sdantipatterns_pct(step.elapsed, sdantipatterns_TOTAL),
      value: step.elapsed + " / " + sdantipatterns_TOTAL,
      flag: step.elapsed >= sdantipatterns_TOTAL ? "warn" : step.elapsed > 0 ? "ok" : "idle"
    });

    var node = d.node({
      title: cur ? "Phase " + cur.n + " · " + cur.name + "  (" + cur.lo + "–" + cur.hi + ")"
        : p === 7 ? "the scorecard" : "before minute one",
      status: status,
      statusFlag: step.flag || "idle",
      badge: ctx.scenario.label,
      meta: cur ? "you leave it with: " + cur.leave
        : "one prompt, " + sdantipatterns_TOTAL + " minutes, six phases",
      flag: step.flag || "idle",
      gauges: gauges,
      rows: rows
    });

    // ---- the 45 minutes -------------------------------------------------
    var minCells = [];
    for (i = 0; i < sdantipatterns_TOTAL; i++) {
      var rec = null, k;
      for (k = 0; k < x.mins.length; k++) if (x.mins[k].at === i) { rec = x.mins[k]; break; }
      var spent = rec && i < step.elapsed;
      minCells.push({
        label: "",
        flag: !spent ? "idle" : rec.onClock ? "ok" : "bad",
        title: !rec
          ? "minute " + (i + 1) + " · unspent — the round ended at " + x.endAt[5]
          : !spent
            ? "minute " + (i + 1) + " · not yet reached"
            : "minute " + (i + 1) + " · phase " + P[rec.ph].n + " " + P[rec.ph].name +
              (rec.onClock
                ? " · inside its " + P[rec.ph].lo + "–" + P[rec.ph].hi + " window"
                : " · the clock says this minute belonged to another phase")
      });
    }

    // ---- the 22 anti-patterns -------------------------------------------
    var apCells = [];
    for (i = 0; i < sdantipatterns_APS.length; i++) {
      var ap = sdantipatterns_APS[i];
      var done = ap.ph <= settled;
      apCells.push({
        label: String(i + 1),
        flag: !done ? "idle" : x.clock[i] ? "warn" : x.trip[i] ? "bad" : "ok",
        title: (i + 1) + " · " + ap.s + " · " + ap.name +
          " · settled in phase " + ap.ph +
          (!done ? " — not yet reached"
            : x.clock[i] ? " — TRIPPED, and he knew it: the phase ran out of minutes"
            : x.trip[i] ? " — TRIPPED" : " — avoided")
      });
    }

    // ---- the eight boxes -------------------------------------------------
    var boxCells = [];
    for (i = 0; i < sdantipatterns_BOX.length; i++) {
      var bd = sdantipatterns_BOX[i].ph <= settled;
      boxCells.push({
        label: bd ? (x.box[i] ? "✓" : "✗") : "·",
        flag: !bd ? "idle" : x.box[i] ? "ok" : "bad",
        title: sdantipatterns_BOX[i].q + " · settled in phase " +
          sdantipatterns_BOX[i].ph +
          (!bd ? " — not yet reached" : x.box[i] ? " — yes" : " — no")
      });
    }

    var body = [
      d.cells(minCells, { label: "the 45 minutes · green = spent on the phase the clock said", dense: true }),
      d.cells(apCells, { label: "the page's " + sdantipatterns_APS.length + " anti-patterns · hover for the name", dense: true }),
      d.cells(boxCells, { label: "the self-check, settled as the round runs" })
    ];

    if (p === 7) {
      var fiveRows = [];
      for (i = 0; i < sdantipatterns_FIVE.length; i++) {
        var f5 = sdantipatterns_FIVE[i];
        fiveRows.push([
          String(i + 1),
          f5.label,
          x.trip[f5.i] ? (x.clock[f5.i] ? "tripped — clock" : "tripped") : "avoided",
          f5.fix
        ]);
      }
      body.push(d.table(["#", "the five that cost the most", "this run", "replace with"], fiveRows));

      var byS = { process: [0, 0], technical: [0, 0], communication: [0, 0] };
      for (i = 0; i < sdantipatterns_APS.length; i++) {
        var sec = sdantipatterns_APS[i].s;
        byS[sec][1]++;
        if (x.trip[i]) byS[sec][0]++;
      }
      body.push(d.table(
        ["section", "tripped", "of", "share"],
        [
          ["process", String(byS.process[0]), String(byS.process[1]),
            sdantipatterns_pct(byS.process[0], byS.process[1]).toFixed(0) + "%"],
          ["technical", String(byS.technical[0]), String(byS.technical[1]),
            sdantipatterns_pct(byS.technical[0], byS.technical[1]).toFixed(0) + "%"],
          ["communication", String(byS.communication[0]), String(byS.communication[1]),
            sdantipatterns_pct(byS.communication[0], byS.communication[1]).toFixed(0) + "%"]
        ]
      ));
    }

    var legend = p === 0
      ? "Every cell above is unsettled. Nothing here is scored by taste: a phase " +
        "that does not get its minutes does not produce its deliverable, and the " +
        "anti-patterns that deliverable would have prevented fire on their own."
      : u.clock > 0
        ? "<b>Amber anti-patterns are the ones worth staring at.</b> Those are " +
          "tripped <i>and</i> known — the candidate had the answer and the phase " +
          "it belonged in was handed too few minutes to say it in. " +
          "<b>" + u.clock + "</b> of this run's " + u.trip + " trips so far are " +
          "that shape, which is why the page files half its list under " +
          "<i>process</i> rather than <i>technical</i>."
        : "Green minutes were spent on the phase the handbook's clock says owns " +
          "them; red minutes were spent on work that belonged in a different " +
          "window. Green anti-pattern cells are avoided, red are tripped.";

    return d.stack([head, node, d.stack(body), d.note(legend, step.flag === "bad" ? "bad" : undefined)]);
  }
};

  // ====================================================================
// ======================================================================
// SIM · sdapidesign  (api-design.md)
//
// Two sections of this page have a genuine time axis and they are the same
// walk: a client paging a feed (§3) and resolving each row's author (§1's
// N+1). So one client walks one live feed, page by page, while writers keep
// appending — and every figure is counted off that walk: rows the database
// examined, queries it was sent, rows delivered twice, rows never delivered
// at all.
//
// The page's own request shapes are the ones issued:
//   GET /v1/users/{id}/posts?page=3&limit=20   -> OFFSET 40 LIMIT 20
//   GET /v1/users/{id}/posts?after=<cursor>&limit=20
//        -> WHERE (created_at, id) < (cursor) ORDER BY ... LIMIT 20
//
// CONFIG — page figures used verbatim
//   limit = 20                 §2 and §3 both write ?limit=20
//   100 posts -> 101 calls     §1's N+1 example; this walk passes exactly
//                              100 posts at the end of page 5, and the sim
//                              prints both that number and its own
//   page 1000 costs the same as page 1   §3's claim, computed at the end
//   cursor = base64 of (sort_key, id), and §3's warning that dropping the
//   tiebreaker id makes rows sharing a timestamp "skipped or repeated" —
//   that is scenario 3, and the skipped rows are counted, not asserted
//
// CONFIG — declared here, because the page states none
//   feed             240 posts generated from one LCG,
//                    s = (s*1664525 + 1013904223) mod 2^32, uniforms taken
//                    from the high 24 bits
//   arrival rate     Poisson at 3 posts/second (Knuth's method) into a
//                    SECOND-RESOLUTION created_at column — which is why
//                    timestamps collide at all, and why the collisions have
//                    a realistic spread rather than a fixed clump size
//   snapshot         200 posts already in the table when page 1 is fetched
//   think time       2 s between page fetches, so 3/s x 2 s = 6 posts are
//                    appended in every gap between pages
//   authors          40, drawn uniformly from the same LCG
//   pages walked     6  (6 x 20 = 120 rows requested)
//   rows examined    offset: skipped + returned = p*20 + 20
//                    cursor: one index seek + 20
//   queries          naive resolver: 1 list + 20 author lookups per page
//                    DataLoader:     1 list + 1 WHERE id IN (...) per page
// ======================================================================

var sdapidesign_LIMIT = 20;          // page: ?limit=20
var sdapidesign_PAGES = 6;
var sdapidesign_SNAPSHOT = 200;
var sdapidesign_RATE = 3;            // posts per second
var sdapidesign_THINK_S = 2;         // client think time between pages
var sdapidesign_INSERTS = sdapidesign_RATE * sdapidesign_THINK_S;   // 6
var sdapidesign_AUTHORS = 40;
var sdapidesign_SEED = 20240613;
var sdapidesign_DEEP = 1000;         // page: "page 1000 costs the same as page 1"
var sdapidesign_NPLUS1_N = 100;      // page: "a query for 100 posts"
var sdapidesign_TOTAL_POSTS =
  sdapidesign_SNAPSHOT + (sdapidesign_PAGES - 1) * sdapidesign_INSERTS + 10;

var sdapidesign_S = sdapidesign_SEED >>> 0;
/** One uniform in [0,1) from the LCG's high bits — the low bits of a
 *  power-of-two-modulus LCG have short periods and would bias the author
 *  pool badly. */
function sdapidesign_u() {
  sdapidesign_S = (sdapidesign_S * 1664525 + 1013904223) >>> 0;
  return (sdapidesign_S >>> 8) / 16777216;
}

/** The feed. Arrivals are Poisson at RATE per second (Knuth's method), and
 *  created_at is a SECOND-resolution column, so a second holds however many
 *  posts happened to land in it — which is the entire reason the cursor
 *  needs a tiebreaker. */
function sdapidesign_build(n) {
  var out = [], t = 0, L = Math.exp(-sdapidesign_RATE), k, p, j;
  sdapidesign_S = sdapidesign_SEED >>> 0;
  while (out.length < n) {
    k = 0; p = 1;
    do { k++; p *= sdapidesign_u(); } while (p > L);
    for (j = 0; j < k - 1 && out.length < n; j++) {
      out.push({
        id: out.length + 1, t: t,
        a: 1 + Math.floor(sdapidesign_u() * sdapidesign_AUTHORS)
      });
    }
    t++;
  }
  return out;
}
var sdapidesign_FEED = sdapidesign_build(sdapidesign_TOTAL_POSTS);

function sdapidesign_post(id) { return sdapidesign_FEED[id - 1]; }

/** Largest id whose created_at is strictly below tc — what a cursor that
 *  carries only the timestamp lands on. */
function sdapidesign_firstBelowT(tc, live) {
  for (var id = live; id >= 1; id--) {
    if (sdapidesign_post(id).t < tc) return id;
  }
  return 0;
}

/** How many seconds the whole feed spans, and the worst timestamp collision
 *  in it — both counted, because they are what the tiebreaker is for. */
function sdapidesign_clumps() {
  var counts = {}, i, p, worst = 0, secs = 0, k;
  for (i = 0; i < sdapidesign_SNAPSHOT; i++) {
    p = sdapidesign_FEED[i];
    if (counts[p.t] === undefined) { counts[p.t] = 0; secs++; }
    counts[p.t]++;
  }
  for (k in counts) if (counts.hasOwnProperty(k) && counts[k] > worst) worst = counts[k];
  return { secs: secs, worst: worst, mean: sdapidesign_SNAPSHOT / secs };
}
var sdapidesign_CLUMP = sdapidesign_clumps();

function sdapidesign_cursorTag(id) {
  // an opaque cursor is base64 of (sort_key, id) — shown decoded so the
  // frame teaches what is inside it
  var p = sdapidesign_post(id);
  return "(t=" + p.t + ", id=" + p.id + ")";
}

function sdapidesign_n(v, dec) {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("en-US", {
    minimumFractionDigits: dec === undefined ? 0 : dec,
    maximumFractionDigits: dec === undefined ? 0 : dec
  });
}

// ----------------------------------------------------------------------
// One walk. `mode` picks the pagination scheme, `batch` the resolver.
//   "offset"  OFFSET p*20 LIMIT 20
//   "cursor"  WHERE (created_at, id) < (cursor)  LIMIT 20
//   "notie"   WHERE created_at < (cursor)        LIMIT 20
// ----------------------------------------------------------------------
function sdapidesign_walk(mode, batch) {
  var live = sdapidesign_SNAPSHOT;
  var headAtStart = live;                 // the newest post when page 1 is asked for
  var delivered = {};                     // id -> times delivered
  var pages = [];
  var rows = 0, queries = 0, dupes = 0, unique = 0, inserted = 0;
  var cursor = 0, cursorT = 0;
  var lowestSeen = headAtStart + 1;
  var p, i, id, slice, scanned, startId, q, batchIds, seenA, nDistinct, newHere;

  for (p = 0; p < sdapidesign_PAGES; p++) {
    var added = [];
    if (p > 0) {
      for (i = 0; i < sdapidesign_INSERTS; i++) { live++; added.push(live); }
      inserted += sdapidesign_INSERTS;
    }

    // ---- which rows does this page return, and what did it cost? --------
    slice = [];
    if (mode === "offset") {
      startId = live - p * sdapidesign_LIMIT;
      scanned = p * sdapidesign_LIMIT + sdapidesign_LIMIT;
    } else if (p === 0) {
      startId = live;
      scanned = sdapidesign_LIMIT;
    } else if (mode === "cursor") {
      startId = cursor - 1;               // (t,id) < (t_c,id_c) is exactly id < id_c
      scanned = sdapidesign_LIMIT;
    } else {
      startId = sdapidesign_firstBelowT(cursorT, live);
      scanned = sdapidesign_LIMIT;
    }
    for (i = 0; i < sdapidesign_LIMIT && startId - i >= 1; i++) slice.push(startId - i);

    // ---- what the client got --------------------------------------------
    newHere = 0;
    var dupHere = 0;
    for (i = 0; i < slice.length; i++) {
      id = slice[i];
      if (delivered[id]) { delivered[id]++; dupes++; dupHere++; }
      else { delivered[id] = 1; unique++; newHere++; }
      if (id < lowestSeen) lowestSeen = id;
    }

    // ---- the resolver ----------------------------------------------------
    seenA = {}; nDistinct = 0; batchIds = [];
    for (i = 0; i < slice.length; i++) {
      var au = sdapidesign_post(slice[i]).a;
      if (!seenA[au]) { seenA[au] = 1; nDistinct++; batchIds.push(au); }
    }
    q = batch ? 2 : 1 + slice.length;

    rows += scanned;
    queries += q;
    if (slice.length) {
      cursor = slice[slice.length - 1];
      cursorT = sdapidesign_post(cursor).t;
    }

    pages.push({
      p: p, live: live, added: added, slice: slice, scanned: scanned,
      q: q, rowsTotal: rows, qTotal: queries, unique: unique, dupes: dupes,
      dupHere: dupHere, newHere: newHere, distinct: nDistinct,
      batch: batchIds.length, cursor: cursor, cursorT: cursorT,
      inserted: inserted, fetched: (p + 1) * sdapidesign_LIMIT
    });
  }

  // ---- what the reader set out to read, and what it actually holds -----
  var intendedLo = headAtStart - sdapidesign_PAGES * sdapidesign_LIMIT + 1;
  var missed = 0, skipped = 0, held = 0;
  for (id = headAtStart; id >= intendedLo; id--) if (!delivered[id]) missed++;
  // a row is SILENTLY SKIPPED when the walk passed it and never returned it
  for (id = headAtStart; id >= lowestSeen; id--) if (!delivered[id]) skipped++;
  for (id = headAtStart; id >= 1; id--) if (delivered[id]) held++;

  var deepOffset = (sdapidesign_DEEP - 1) * sdapidesign_LIMIT + sdapidesign_LIMIT;

  return {
    mode: mode, batch: batch, pages: pages, headAtStart: headAtStart,
    intendedLo: intendedLo, lowestSeen: lowestSeen,
    rows: rows, queries: queries, dupes: dupes, unique: unique,
    missed: missed, skipped: skipped, held: held, inserted: inserted,
    fetched: sdapidesign_PAGES * sdapidesign_LIMIT,
    deepOffset: deepOffset, deepRatio: deepOffset / sdapidesign_LIMIT,
    // the page's own N+1 arithmetic, on the 100 posts this walk passes
    nplus1: sdapidesign_NPLUS1_N + 1,
    resolverCalls: batch ? 2 * sdapidesign_PAGES
      : sdapidesign_PAGES * (1 + sdapidesign_LIMIT)
  };
}

var sdapidesign_OFFSET = sdapidesign_walk("offset", false);
var sdapidesign_CURSOR = sdapidesign_walk("cursor", true);
var sdapidesign_NOTIE  = sdapidesign_walk("notie", true);

// ----------------------------------------------------------------------
function sdapidesign_sql(r, pg) {
  if (r.mode === "offset") {
    return "GET /v1/users/7/posts?page=" + (pg.p + 1) + "&limit=" + sdapidesign_LIMIT +
      "   ->   SELECT ... ORDER BY created_at DESC, id DESC" +
      " OFFSET " + (pg.p * sdapidesign_LIMIT) + " LIMIT " + sdapidesign_LIMIT;
  }
  if (pg.p === 0) {
    return "GET /v1/users/7/posts?limit=" + sdapidesign_LIMIT +
      "   ->   SELECT ... ORDER BY created_at DESC, id DESC LIMIT " + sdapidesign_LIMIT;
  }
  var prev = r.pages[pg.p - 1];
  if (r.mode === "cursor") {
    return "GET /v1/users/7/posts?after=<b64>&limit=" + sdapidesign_LIMIT +
      "   ->   WHERE (created_at, id) < " + sdapidesign_cursorTag(prev.cursor) +
      " ORDER BY ... LIMIT " + sdapidesign_LIMIT;
  }
  return "GET /v1/users/7/posts?after=<b64>&limit=" + sdapidesign_LIMIT +
    "   ->   WHERE created_at < " + prev.cursorT +
    " ORDER BY ... LIMIT " + sdapidesign_LIMIT + "      [no tiebreaker]";
}

function sdapidesign_scenario(cfg) {
  var r = cfg.r;
  var steps = [{ r: r, pg: null, i: -1, flag: "idle", caption: cfg.idle }];

  for (var p = 0; p < r.pages.length; p++) {
    var pg = r.pages[p];
    var head, tail;

    if (p === 0) {
      head = "<b>Page 1.</b> " + sdapidesign_n(pg.scanned) + " rows examined, " +
        pg.q + " " + (pg.q === 1 ? "query" : "queries") + ", " + pg.newHere +
        " posts delivered — every scheme looks identical on the first page, " +
        "which is exactly why this choice gets made badly. The newest post in " +
        "the table right now is id " + r.headAtStart + "; that is the snapshot " +
        "the reader believes it is walking.";
    } else {
      head = "<b>Page " + (p + 1) + ".</b> " + sdapidesign_INSERTS +
        " posts were appended in the " + sdapidesign_THINK_S +
        " seconds since the last fetch (" + sdapidesign_RATE +
        "/s), so the table is now " + sdapidesign_n(pg.live) + " rows. This " +
        "page examined <b>" + sdapidesign_n(pg.scanned) + "</b> rows for " +
        sdapidesign_LIMIT + " returned and cost <b>" + pg.q + "</b> " +
        (pg.q === 1 ? "query" : "queries") + ". ";
      if (pg.dupHere) {
        head += "<b>" + pg.dupHere + " of the " + sdapidesign_LIMIT +
          " rows were posts the client already had</b> — the inserts pushed " +
          "everything down by " + sdapidesign_INSERTS + " positions and " +
          "OFFSET " + (pg.p * sdapidesign_LIMIT) + " now points above where " +
          "page " + p + " ended.";
      }
    }

    if (pg.fetched === sdapidesign_NPLUS1_N) {
      tail = " <i>" + sdapidesign_NPLUS1_N + " posts fetched — the page's own " +
        "example. Fetched in one query with their authors it is " +
        sdapidesign_n(r.nplus1) + " calls; this walk has spent <b>" +
        sdapidesign_n(pg.qTotal) + "</b>.</i>";
    } else {
      tail = "";
    }

    steps.push({
      r: r, pg: pg, i: p, caption: cfg.say(pg, head) + tail,
      flag: pg.dupHere ? "bad"
        : (r.mode === "notie" && pg.p > 0 &&
           r.pages[pg.p - 1].cursor - 1 !== pg.slice[0]) ? "bad"
        : pg.scanned > sdapidesign_LIMIT ? "warn" : "ok"
    });
  }

  steps.push({
    r: r, pg: r.pages[r.pages.length - 1], i: r.pages.length, report: true,
    caption: cfg.verdict(r),
    flag: r.dupes || r.skipped ? "bad" : "ok"
  });

  return { id: cfg.id, label: cfg.label, steps: steps };
}

// ----------------------------------------------------------------------
var sdapidesign_S1 = sdapidesign_scenario({
  id: "offset", label: "Offset + N+1",
  r: sdapidesign_OFFSET,
  idle: "<b>The first version of every feed API.</b> <code>?page=n&limit=" +
    sdapidesign_LIMIT + "</code> for the list, and the author field resolved " +
    "once per post. " + sdapidesign_n(sdapidesign_SNAPSHOT) + " posts are in " +
    "the table, writers are appending at " + sdapidesign_RATE +
    "/s, and the client is about to walk " + sdapidesign_PAGES + " pages. " +
    "It works perfectly in development, where nobody is writing. Press Play.",
  say: function (pg, head) {
    if (pg.p === 0) {
      return head + " The " + sdapidesign_LIMIT + " authors are resolved one " +
        "at a time — " + pg.distinct + " distinct people fetched in " +
        sdapidesign_LIMIT + " round trips.";
    }
    return head + " Rows examined so far <b>" + sdapidesign_n(pg.rowsTotal) +
      "</b> for " + sdapidesign_n(pg.fetched) + " rows returned; the database " +
      "is doing " + (pg.rowsTotal / pg.fetched).toFixed(1) + "x the work the " +
      "client asked for, and the ratio climbs with every page.";
  },
  verdict: function (r) {
    var c = sdapidesign_CURSOR;
    return "<b>" + sdapidesign_n(r.rows) + " rows examined and " +
      sdapidesign_n(r.queries) + " queries to hand the client <b>" + r.unique +
      "</b> distinct posts out of the " + sdapidesign_n(r.fetched) +
      " rows it paid for.</b> " + r.dupes + " rows were posts it already had, " +
      "and of the " + sdapidesign_n(sdapidesign_PAGES * sdapidesign_LIMIT) +
      " posts it set out to read it never reached <b>" + r.missed +
      "</b> of them — not because they were deleted, but because " +
      r.inserted + " new posts pushed the window down faster than it could " +
      "page. Both of the page's failures, in one walk. Separate the two " +
      "fixes: cursor pagination alone takes rows examined from " +
      sdapidesign_n(r.rows) + " to " + sdapidesign_n(c.rows) + " (<b>" +
      (r.rows / c.rows).toFixed(1) + "x</b>), and DataLoader alone takes " +
      "queries from " + sdapidesign_n(r.queries) + " to " +
      sdapidesign_n(c.queries) + " (<b>" + (r.queries / c.queries).toFixed(1) +
      "x</b>). <i>At the page's page " + sdapidesign_n(sdapidesign_DEEP) +
      " the offset scan alone would examine " + sdapidesign_n(r.deepOffset) +
      " rows for the same " + sdapidesign_LIMIT + " — " +
      sdapidesign_n(r.deepRatio) + "x the cursor's cost, which is what " +
      "“page 1000 costs the same as page 1” means.</i>";
  }
});

var sdapidesign_S2 = sdapidesign_scenario({
  id: "cursor", label: "Cursor + DataLoader",
  r: sdapidesign_CURSOR,
  idle: "<b>The same feed, the same writers, the same " + sdapidesign_PAGES +
    " pages.</b> Two changes: the cursor is an opaque base64 of <code>" +
    "(created_at, id)</code> — the tiebreaker included — and the author field " +
    "is batched per request, DataLoader-style, into one <code>WHERE id IN " +
    "(...)</code>. Nothing else differs.",
  say: function (pg, head) {
    if (pg.p === 0) {
      return head + " The " + sdapidesign_LIMIT + " posts name " + pg.distinct +
        " distinct authors, so the resolver issues <b>one</b> " +
        "<code>WHERE id IN (...)</code> with " + pg.batch + " ids instead of " +
        sdapidesign_LIMIT + " lookups. The cursor handed back is " +
        sdapidesign_cursorTag(pg.cursor) + ", base64-encoded so the client " +
        "cannot build one and the scheme can change later.";
    }
    return head + " The " + sdapidesign_INSERTS + " new posts sort <i>above</i> " +
      "the cursor, so the predicate never sees them — that is the whole " +
      "stability argument, and it is why this page returned " + pg.newHere +
      " new posts and " + pg.dupHere + " duplicates. Rows examined stays flat " +
      "at " + sdapidesign_LIMIT + " because the index seek lands directly on " +
      sdapidesign_cursorTag(pg.slice[0]) + "; " + pg.distinct +
      " distinct authors this page, still one batch.";
  },
  verdict: function (r) {
    var o = sdapidesign_OFFSET;
    return "<b>" + sdapidesign_n(r.rows) + " rows examined, " +
      sdapidesign_n(r.queries) + " queries, " + r.unique + " distinct posts, " +
      r.dupes + " duplicates, " + r.skipped + " skipped.</b> The client holds " +
      "exactly the " + sdapidesign_n(r.fetched) + " posts it asked for while " +
      r.inserted + " were appended underneath it. Attribute the two changes " +
      "separately, because they fix different things: <b>the cursor</b> bought " +
      "the row count — " + sdapidesign_n(o.rows) + " to " +
      sdapidesign_n(r.rows) + ", and it bought the " + o.dupes +
      " duplicates and " + o.missed + " unreached posts, which are correctness " +
      "and not cost. <b>DataLoader</b> bought the query count — " +
      sdapidesign_n(o.queries) + " to " + sdapidesign_n(r.queries) +
      ", and nothing else; a batched resolver over offset pagination would " +
      "still have shipped every one of those duplicates. <i>The honest cost " +
      "is on the last line of §3: this client cannot jump to page 50. If the " +
      "product needs numbered pages you need offset, so cap the depth and say " +
      "so.</i>";
  }
});

var sdapidesign_S3 = sdapidesign_scenario({
  id: "notie", label: "Cursor, no tiebreaker",
  r: sdapidesign_NOTIE,
  idle: "<b>The same cursor design with one field left out.</b> The cursor " +
    "carries only <code>created_at</code>, not <code>(created_at, id)</code>, " +
    "and the predicate is <code>WHERE created_at &lt; c</code>. It is still " +
    "index-backed, still flat-cost, still batched, still immune to the head " +
    "inserts. Watch the row counts — they will not move — and then watch what " +
    "the client ends up holding. The one thing that changed is that <b>" +
    sdapidesign_CLUMP.mean.toFixed(1) + " posts</b> share the average " +
    "<code>created_at</code> value in this feed, and the predicate can no " +
    "longer tell them apart.",
  say: function (pg, head) {
    if (pg.p === 0) {
      return head + " Identical to the previous tab so far. The cursor handed " +
        "back is just <code>t=" + pg.cursorT + "</code> — the id is dropped, " +
        "and there are " + (function () {
          var c = 0, id;
          for (id = 1; id <= pg.live; id++) if (sdapidesign_post(id).t === pg.cursorT) c++;
          return c;
        })() + " rows in the feed carrying that same timestamp.";
    }
    var prev = sdapidesign_NOTIE.pages[pg.p - 1];
    var lost = prev.cursor - 1 - pg.slice[0];
    return head + (lost > 0
      ? " <b>" + lost + " row" + (lost === 1 ? "" : "s") + " vanished at this " +
        "boundary.</b> Page " + pg.p + " ended on id " + prev.cursor + " at " +
        "t=" + prev.cursorT + ", and <code>created_at &lt; " + prev.cursorT +
        "</code> starts at id " + pg.slice[0] + " — everything between them " +
        "shared that second and is now unreachable. Rows examined is still " +
        sdapidesign_LIMIT + ", the query is still fast, the client got a full " +
        "page, and no error was raised anywhere."
      : " This boundary happened to land on the lowest id of its second, so " +
        "nothing was lost here. That is the shape of the bug: it depends on " +
        "where the page ends, so it is intermittent, unreproducible on small " +
        "data, and invisible in every metric you have.");
  },
  verdict: function (r) {
    var c = sdapidesign_CURSOR;
    return "<b>" + sdapidesign_n(r.rows) + " rows examined, " +
      sdapidesign_n(r.queries) + " queries, " + r.dupes + " duplicates — " +
      "every performance number identical to the correct cursor</b> (" +
      sdapidesign_n(c.rows) + " rows, " + sdapidesign_n(c.queries) +
      " queries). And <b>" + r.skipped + " posts</b> the walk passed straight " +
      "over and never returned: " +
      sdapidesign_pctStr(r.skipped, r.headAtStart - r.lowestSeen + 1) +
      " of the range it covered, gone, with the client believing it has a " +
      "complete feed. The correct cursor skipped " + c.skipped +
      ". <i>This is the failure mode worth carrying out of §3: the loud " +
      "problem with offset pagination is that it is slow, and the quiet one " +
      "with cursor pagination is that a cursor missing its tiebreaker is " +
      "indistinguishable from a correct one on every dashboard you own. " +
      "Include the id.</i>";
  }
});

function sdapidesign_pctStr(a, b) {
  return b > 0 ? ((a / b) * 100).toFixed(1) + "%" : "0%";
}

// ======================================================================
S["sdapidesign"] = {
  title: "Walk one live feed six pages deep",
  note: "One client, one feed, three API designs. <b>" +
    sdapidesign_n(sdapidesign_SNAPSHOT) + "</b> posts are in the table when " +
    "page 1 is requested; writers append at <b>" + sdapidesign_RATE +
    "/s</b> (Poisson) into a <b>second-resolution</b> <code>created_at</code> " +
    "— so the " + sdapidesign_n(sdapidesign_SNAPSHOT) + " posts occupy only <b>" +
    sdapidesign_CLUMP.secs + "</b> distinct timestamps, <b>" +
    sdapidesign_CLUMP.mean.toFixed(1) + "</b> to a value and <b>" +
    sdapidesign_CLUMP.worst + "</b> in the busiest second. The " +
    "client thinks for <b>" + sdapidesign_THINK_S + " s</b> between fetches, " +
    "so <b>" + sdapidesign_INSERTS + "</b> posts land in every gap. The page's " +
    "own request shapes are issued — <code>?page=n&amp;limit=" +
    sdapidesign_LIMIT + "</code> and <code>?after=&lt;cursor&gt;&amp;limit=" +
    sdapidesign_LIMIT + "</code> — over <b>" + sdapidesign_PAGES +
    "</b> pages, so an offset page examines <b>p&times;" + sdapidesign_LIMIT +
    " + " + sdapidesign_LIMIT + "</b> rows and a cursor page examines <b>" +
    sdapidesign_LIMIT + "</b>. Authors come from a pool of <b>" +
    sdapidesign_AUTHORS + "</b>: a naive resolver costs <b>1 + " +
    sdapidesign_LIMIT + "</b> queries a page, DataLoader costs <b>2</b>. The " +
    "feed is one LCG, so the same " + sdapidesign_n(sdapidesign_TOTAL_POSTS) +
    " posts load every time; every row count, query count, duplicate and " +
    "silently-skipped post below is counted off the walk, including the " +
    "page's <b>" + sdapidesign_NPLUS1_N + " posts &rarr; " +
    sdapidesign_n(sdapidesign_NPLUS1_N + 1) + " calls</b>, which this walk " +
    "reaches at the end of page " + (sdapidesign_NPLUS1_N / sdapidesign_LIMIT) +
    ".",
  interval: 1500,

  scenarios: [sdapidesign_S1, sdapidesign_S2, sdapidesign_S3],

  draw: function (step, d, ctx) {
    var r = step.r, pg = step.pg, i, id;
    var started = pg !== null;
    var isOffset = r.mode === "offset";
    var upto = started ? pg.p : -1;

    // ---- headline --------------------------------------------------------
    var head = d.flow([
      d.big(started ? "page " + (pg.p + 1) : "page —",
        started ? "of " + sdapidesign_PAGES + " requested" : "not started",
        started ? (pg.dupHere ? "bad" : "ok") : "idle"),
      d.stat({
        label: "rows examined",
        value: started ? sdapidesign_n(pg.rowsTotal) : "0",
        sub: started
          ? sdapidesign_n(pg.scanned) + " this page for " + pg.slice.length + " returned"
          : "nothing scanned yet",
        flag: !started ? "idle" : pg.scanned > sdapidesign_LIMIT ? "bad" : "ok"
      }),
      d.stat({
        label: "database queries",
        value: started ? sdapidesign_n(pg.qTotal) : "0",
        sub: started
          ? pg.q + " this page (" + (r.batch ? "1 list + 1 batch" : "1 list + " +
            pg.slice.length + " authors") + ")"
          : "none issued yet",
        flag: !started ? "idle" : r.batch ? "ok" : "bad"
      }),
      d.stat({
        label: "distinct posts held",
        value: started ? String(pg.unique) : "0",
        sub: started
          ? "of " + sdapidesign_n(pg.fetched) + " rows paid for"
          : "client is empty",
        flag: !started ? "idle"
          : pg.unique === pg.fetched ? "ok" : "bad"
      })
    ]);

    // ---- the request actually issued -------------------------------------
    var wire = started
      ? d.mono(sdapidesign_sql(r, pg), pg.dupHere ? "bad" : r.mode === "notie" ? "warn" : "ok")
      : d.mono("GET /v1/users/7/posts?limit=" + sdapidesign_LIMIT +
        "   ->   not sent yet", "idle");

    // ---- the pagination engine -------------------------------------------
    var pagRows = [];
    if (!started) {
      pagRows.push({ label: "rows in the table", value: sdapidesign_n(sdapidesign_SNAPSHOT) });
      pagRows.push({ label: "write rate", value: sdapidesign_RATE + " posts / s" });
      pagRows.push({ label: "created_at resolution", value: "1 second" });
      pagRows.push({
        label: "distinct timestamps in " + sdapidesign_n(sdapidesign_SNAPSHOT) + " posts",
        value: String(sdapidesign_CLUMP.secs) + "  (" +
          sdapidesign_CLUMP.mean.toFixed(1) + " rows each, worst " +
          sdapidesign_CLUMP.worst + ")",
        flag: "warn"
      });
    } else {
      pagRows.push({
        label: "rows skipped to reach this page",
        value: isOffset ? sdapidesign_n(pg.p * sdapidesign_LIMIT) : "0 — index seek",
        flag: isOffset && pg.p > 0 ? "bad" : "ok"
      });
      pagRows.push({
        label: "rows examined / rows returned",
        value: sdapidesign_n(pg.scanned) + " / " + pg.slice.length,
        flag: pg.scanned > sdapidesign_LIMIT ? "bad" : "ok"
      });
      pagRows.push({
        label: "rows appended since page 1",
        value: sdapidesign_n(pg.inserted) + " (table now " + sdapidesign_n(pg.live) + ")",
        flag: pg.inserted ? "warn" : "idle"
      });
      pagRows.push({
        label: "cursor handed back",
        value: isOffset ? "none — page number only"
          : r.mode === "notie" ? "t=" + pg.cursorT + "  (id dropped)"
          : sdapidesign_cursorTag(pg.cursor),
        flag: isOffset ? "bad" : r.mode === "notie" ? "warn" : "ok"
      });
      pagRows.push({
        label: "cost of this page vs page 1",
        value: (pg.scanned / sdapidesign_LIMIT).toFixed(1) + "x",
        flag: pg.scanned > sdapidesign_LIMIT ? "bad" : "ok"
      });
    }

    var pagNode = d.node({
      title: isOffset ? "pagination · OFFSET"
        : r.mode === "notie" ? "pagination · cursor, timestamp only"
        : "pagination · cursor on (created_at, id)",
      status: !started ? "IDLE"
        : pg.dupHere ? pg.dupHere + " ROWS RE-SERVED"
        : pg.scanned > sdapidesign_LIMIT ? "RE-SCANNING"
        : "INDEX SEEK",
      statusFlag: !started ? "idle" : pg.dupHere ? "bad"
        : pg.scanned > sdapidesign_LIMIT ? "warn" : "ok",
      badge: ctx.scenario.label,
      meta: isOffset
        ? "the database skips " + sdapidesign_n(started ? pg.p * sdapidesign_LIMIT : 0) +
          " rows to return " + sdapidesign_LIMIT
        : "WHERE " + (r.mode === "notie" ? "created_at" : "(created_at, id)") +
          " < cursor, straight into the index",
      flag: !started ? "idle" : pg.dupHere ? "bad"
        : pg.scanned > sdapidesign_LIMIT ? "warn" : "ok",
      rows: pagRows
    });

    // ---- the resolver ----------------------------------------------------
    var resNode = d.node({
      title: r.batch ? "resolver · batched per request" : "resolver · one call per row",
      status: !started ? "IDLE" : r.batch ? "1 BATCH" : pg.slice.length + " LOOKUPS",
      statusFlag: !started ? "idle" : r.batch ? "ok" : "bad",
      badge: sdapidesign_AUTHORS + " authors in the pool",
      meta: r.batch
        ? "collect the ids requested in one tick, issue one WHERE id IN (...)"
        : "the author field resolves once per post — the N+1 problem",
      flag: !started ? "idle" : r.batch ? "ok" : "bad",
      rows: [
        {
          label: "queries this page",
          value: started ? String(pg.q) : "0",
          flag: !started ? "idle" : r.batch ? "ok" : "bad"
        },
        {
          label: "distinct authors on the page",
          value: started ? pg.distinct + " of " + pg.slice.length + " rows" : "—"
        },
        {
          label: "ids in the batch",
          value: !started ? "—" : r.batch ? String(pg.batch) : "no batch — " +
            pg.slice.length + " separate round trips",
          flag: !started ? "idle" : r.batch ? "ok" : "bad"
        },
        {
          label: "queries after " + sdapidesign_n(sdapidesign_NPLUS1_N) + " posts",
          value: !started || pg.fetched < sdapidesign_NPLUS1_N
            ? "not there yet"
            : sdapidesign_n(r.pages[sdapidesign_NPLUS1_N / sdapidesign_LIMIT - 1].qTotal) +
              "  (page's one-shot figure: " + sdapidesign_n(r.nplus1) + ")",
          flag: !started || pg.fetched < sdapidesign_NPLUS1_N ? "idle"
            : r.batch ? "ok" : "bad"
        }
      ]
    });

    // ---- the feed, from the reader's first page downward -----------------
    var lo = Math.min(r.intendedLo, r.lowestSeen);
    var delivered = {};
    for (i = 0; i <= upto; i++) {
      var sl = r.pages[i].slice;
      for (var k = 0; k < sl.length; k++) {
        delivered[sl[k]] = (delivered[sl[k]] || 0) + 1;
      }
    }
    var reachedLo = upto >= 0 && r.pages[upto].slice.length
      ? r.pages[upto].slice[r.pages[upto].slice.length - 1]
      : r.headAtStart + 1;

    var feedCells = [];
    for (id = r.headAtStart; id >= lo; id--) {
      var n = delivered[id] || 0;
      var passed = id >= reachedLo;
      feedCells.push({
        label: "",
        flag: n > 1 ? "warn" : n === 1 ? "ok" : passed ? "bad" : "idle",
        title: "post " + id + " · t=" + sdapidesign_post(id).t + " · author " +
          sdapidesign_post(id).a +
          (n > 1 ? " · DELIVERED " + n + " TIMES"
            : n === 1 ? " · delivered once"
            : passed ? " · the walk passed it and never returned it"
            : " · not reached yet")
      });
    }

    var newCells = [];
    var newCount = started ? pg.inserted : 0;
    for (i = 0; i < newCount; i++) {
      var nid = r.headAtStart + 1 + i;
      newCells.push({
        label: "",
        flag: delivered[nid] ? "bad" : "idle",
        title: "post " + nid + " · appended while the client was paging" +
          (delivered[nid] ? " · served to the client" : " · correctly never served")
      });
    }
    if (!newCells.length) {
      newCells.push({ label: "·", flag: "idle", title: "nothing appended yet" });
    }

    // ---- per-page lanes --------------------------------------------------
    var rowLane = [], qLane = [], dupLane = [];
    for (i = 0; i < sdapidesign_PAGES; i++) {
      var f = r.pages[i], on = i <= upto;
      rowLane.push({
        label: on ? sdapidesign_n(f.scanned) : "",
        flag: !on ? "idle" : f.scanned > sdapidesign_LIMIT ? "bad" : "ok",
        title: "page " + (i + 1) + (on ? " · " + f.scanned + " rows examined" : " · not fetched")
      });
      qLane.push({
        label: on ? String(f.q) : "",
        flag: !on ? "idle" : f.q > 2 ? "bad" : "ok",
        title: "page " + (i + 1) + (on ? " · " + f.q + " queries" : " · not fetched")
      });
      dupLane.push({
        label: on ? String(f.dupHere) : "",
        flag: !on ? "idle" : f.dupHere ? "bad" : "ok",
        title: "page " + (i + 1) +
          (on ? " · " + f.dupHere + " rows the client already had" : " · not fetched")
      });
    }

    var body = [
      wire, d.cols([pagNode, resNode]),
      d.cells(feedCells, {
        label: "the feed from post " + r.headAtStart + " down, newest first",
        dense: true
      }),
      d.cells(newCells, {
        label: "posts appended while the client was paging (" +
          (started ? pg.inserted : 0) + ")",
        dense: true
      }),
      d.stack([
        d.lane({ label: "rows examined", cells: rowLane }),
        d.lane({ label: "queries", cells: qLane }),
        d.lane({ label: "duplicates", cells: dupLane })
      ])
    ];

    if (step.report) {
      var o = sdapidesign_OFFSET, c = sdapidesign_CURSOR, nt = sdapidesign_NOTIE;
      body.push(d.table(
        ["measure", "offset + N+1", "cursor + batch", "no tiebreaker"],
        [
          ["rows examined", sdapidesign_n(o.rows), sdapidesign_n(c.rows), sdapidesign_n(nt.rows)],
          ["queries", sdapidesign_n(o.queries), sdapidesign_n(c.queries), sdapidesign_n(nt.queries)],
          ["distinct posts held", String(o.unique), String(c.unique), String(nt.unique)],
          ["rows served twice", String(o.dupes), String(c.dupes), String(nt.dupes)],
          ["posts silently skipped", String(o.skipped), String(c.skipped), String(nt.skipped)],
          ["rows examined at page " + sdapidesign_n(sdapidesign_DEEP),
            sdapidesign_n(o.deepOffset), sdapidesign_n(sdapidesign_LIMIT),
            sdapidesign_n(sdapidesign_LIMIT)]
        ]
      ));
    }

    var legend = !started
      ? "Green cells are posts delivered exactly once, amber delivered more " +
        "than once, red passed over and never delivered, grey not yet reached."
      : r.mode === "offset"
        ? "Amber cells are rows the client was charged for twice. The grey tail " +
          "is the part of the feed it set out to read and never reached — the " +
          "window is sliding away from it at " + sdapidesign_INSERTS +
          " posts a page while it advances " + sdapidesign_LIMIT + "."
        : r.mode === "notie"
          ? "<b>The red cells are the whole lesson.</b> Every one is a post the " +
            "walk stepped over because it shared a second with the row the " +
            "cursor stopped on. The query plan, the row counts and the latency " +
            "are identical to the tab beside this one."
          : "Every cell the walk has reached is green: delivered once, in order, " +
            "with " + (started ? pg.inserted : 0) + " posts appended underneath " +
            "it and correctly invisible to the predicate.";

    return d.stack([head, d.stack(body), d.note(legend, step.flag === "bad" ? "bad" : undefined)]);
  }
};

  // ====================================================================
  // ======================================================================
  // SIM · sdcapandconsistenc  (cap-and-consistency.md)
  //
  // The page names its own time axis: "CAP is a question about one moment:
  // DURING A PARTITION." So the mechanism here is a partition opening on a
  // running five-replica store, traffic continuing to cross it, and the
  // partition healing — and the counting of what each consistency policy
  // actually cost: refusals, stale answers, writes silently discarded at
  // reconciliation, duplicate charges, and the milliseconds paid during the
  // waves when nothing was broken at all (PACELC's "else" branch, which the
  // page says is where the system actually lives).
  //
  // FROM THE PAGE, used verbatim:
  //   · section 5's seven operations and the consistency each one needs —
  //     feed and follower count eventual, post read-your-writes, add-to-cart
  //     causal, checkout / inventory decrement / username registration
  //     linearizable
  //   · the page's sentence "ninety-nine percent of this system is eventually
  //     consistent, and I'm happy with that" — so the linearizable share of
  //     the mix is set to exactly 1.0% and the rest to 99.0%
  //   · CAP's narrow definitions: availability means EVERY non-failing node
  //     answers EVERY request, which is why a refusal on the still-running
  //     minority counts against availability here, and consistency means
  //     linearizability, which is why the dedupe check on a linearizable
  //     write is modelled as a quorum read
  //   · PACELC's two branches, reported as a label computed from the run
  //   · section 6: version vectors "detect conflicts rather than silently
  //     losing one" — the only difference between the LWW build and the
  //     engineered build on the causal path
  //
  // CONFIG — declared here, because the page publishes no throughput,
  // latency or failure figures of its own:
  //   replicas            N = 5, majority quorum = floor(5/2)+1 = 3
  //   the split           3 replicas one side, 2 the other
  //   window              20,000 operations in 5 waves of 4,000
  //   partition           opens before wave 2, heals after wave 4
  //                       -> 12,000 of the 20,000 operations cross it
  //   routing             each request goes to the nearest of the 5 replicas,
  //                       uniformly -> 2/5 = 40% of traffic on the minority
  //   latency             local commit 0.5 ms; cross-AZ round trip 2.0 ms,
  //                       so a quorum operation costs 0.5 + 2.0 = 2.5 ms
  //   keyspace            400 user keys (timelines, carts) and 400 order keys
  //   retries             40% of linearizable writes are a client retry of an
  //                       earlier attempt, carrying the SAME idempotency key
  //                       and routed independently — which is how a retry
  //                       lands on the far side of a partition
  //   replication lag     ignored outside a partition: a local read is
  //                       treated as fresh when the cluster is whole, so
  //                       every stale answer below is caused by the split
  //
  // Traffic is one deterministic LCG (s = (s*1664525 + 1013904223) mod 2^32),
  // so all three tabs replay the IDENTICAL 20,000 operations and every count,
  // rate, millisecond and PACELC label on screen is accumulated off that
  // replay rather than asserted.
  // ======================================================================
  var sdcap_N = 5;
  var sdcap_QUORUM = Math.floor(sdcap_N / 2) + 1;          // 3
  var sdcap_MAJ = 3;
  var sdcap_MIN = sdcap_N - sdcap_MAJ;                     // 2
  var sdcap_OPS = 20000;
  var sdcap_WAVES = 5;
  var sdcap_WAVE = sdcap_OPS / sdcap_WAVES;                // 1000
  var sdcap_PSTART = 1;                                    // partition opens on wave index 1
  var sdcap_PEND = 4;                                      // healed before wave index 4
  var sdcap_LOCAL_MS = 0.5;
  var sdcap_RTT_MS = 2.0;
  var sdcap_QMS = sdcap_LOCAL_MS + sdcap_RTT_MS;           // 2.5
  var sdcap_KEYS = 400;
  var sdcap_RETRY = 0.40;
  var sdcap_SEED = 20250927;
  var sdcap_BLOCKS = 50;
  var sdcap_PER_BLOCK = sdcap_OPS / sdcap_BLOCKS;          // 100

  // section 5 of the page, as a workload mix
  var sdcap_MIX = [
    { id: "feed",  label: "view a feed",           need: "eventual", kind: "read",  share: 0.620, space: "user" },
    { id: "count", label: "view follower count",   need: "eventual", kind: "read",  share: 0.200, space: "user" },
    { id: "post",  label: "post a message",        need: "ryw",      kind: "write", share: 0.100, space: "user" },
    { id: "cart",  label: "add to cart",           need: "causal",   kind: "write", share: 0.070, space: "user" },
    { id: "pay",   label: "checkout / payment",    need: "linear",   kind: "write", share: 0.006, space: "order" },
    { id: "inv",   label: "inventory decrement",   need: "linear",   kind: "write", share: 0.003, space: "order" },
    { id: "name",  label: "username registration", need: "linear",   kind: "write", share: 0.001, space: "order" }
  ];

  function sdcap_shareOf(need) {
    var t = 0, i;
    for (i = 0; i < sdcap_MIX.length; i++) if (sdcap_MIX[i].need === need) t += sdcap_MIX[i].share;
    return t;
  }
  var sdcap_STRONG_SHARE = sdcap_shareOf("linear");        // 0.010
  var sdcap_WEAK_SHARE = 1 - sdcap_STRONG_SHARE;           // 0.990

  function sdcap_pct(a, b) { return b > 0 ? (a / b) * 100 : 0; }
  function sdcap_p1(x) { return x.toFixed(1) + "%"; }
  function sdcap_p2(x) { return x.toFixed(2) + "%"; }
  function sdcap_int(n) { return Math.round(n).toLocaleString("en-US"); }
  function sdcap_ms(x) { return x.toFixed(2) + " ms"; }
  function sdcap_plural(n, one, many) { return n === 1 ? one : many; }

  // ----------------------------------------------------------------------
  // The 5,000 logged operations. Same requests in every tab, every browser.
  // ----------------------------------------------------------------------
  function sdcap_traffic() {
    var s = sdcap_SEED >>> 0;
    function u() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    var ops = [], prior = {}, i, j, x, c, m, key, idem, retry, pool, pick, r;
    for (i = 0; i < sdcap_OPS; i++) {
      x = u(); c = 0; m = sdcap_MIX[sdcap_MIX.length - 1];
      for (j = 0; j < sdcap_MIX.length; j++) {
        c += sdcap_MIX[j].share;
        if (x < c) { m = sdcap_MIX[j]; break; }
      }
      key = Math.floor(u() * sdcap_KEYS);
      idem = "";
      retry = false;
      if (m.need === "linear") {
        pool = prior[m.id];
        if (pool && pool.length && u() < sdcap_RETRY) {
          pick = pool[Math.floor(u() * pool.length)];
          key = pick.key;
          idem = pick.idem;
          retry = true;
        } else {
          idem = m.id + "#" + key + "#" + i;
          if (!prior[m.id]) prior[m.id] = [];
          prior[m.id].push({ key: key, idem: idem });
          if (prior[m.id].length > 20) prior[m.id].shift();
        }
      }
      r = Math.floor(u() * sdcap_N);
      ops.push({
        t: m.id, lbl: m.label, need: m.need, kind: m.kind,
        key: m.space + ":" + key, idem: idem, retry: retry,
        repl: r, side: r < sdcap_MAJ ? "A" : "B"
      });
    }
    return ops;
  }
  var sdcap_TRAFFIC = sdcap_traffic();

  /** How many of the 5,000 landed on each operation type — drawn, not assumed. */
  function sdcap_drawn() {
    var by = {}, i, t;
    for (i = 0; i < sdcap_MIX.length; i++) by[sdcap_MIX[i].id] = 0;
    for (i = 0; i < sdcap_TRAFFIC.length; i++) {
      t = sdcap_TRAFFIC[i].t;
      by[t] = (by[t] || 0) + 1;
    }
    return by;
  }
  var sdcap_DRAWN = sdcap_drawn();
  var sdcap_DRAWN_STRONG =
    sdcap_DRAWN.pay + sdcap_DRAWN.inv + sdcap_DRAWN.name;
  var sdcap_DRAWN_MINORITY = (function () {
    var n = 0, i;
    for (i = 0; i < sdcap_TRAFFIC.length; i++) if (sdcap_TRAFFIC[i].side === "B") n++;
    return n;
  })();

  function sdcap_copy(o) {
    var c = {}, k, v, k2;
    for (k in o) {
      if (!o.hasOwnProperty(k)) continue;
      v = o[k];
      if (v && typeof v === "object") {
        c[k] = {};
        for (k2 in v) if (v.hasOwnProperty(k2)) c[k][k2] = v[k2];
      } else {
        c[k] = v;
      }
    }
    return c;
  }

  /** 50 blocks of 100 operations, coloured by the worst outcome inside each. */
  function sdcap_blocks(out, upto) {
    var cells = [], i, j, lo, hi, nref, nstale, nlost, ndup, nghost, flag, bits;
    for (i = 0; i < sdcap_BLOCKS; i++) {
      lo = i * sdcap_PER_BLOCK;
      hi = lo + sdcap_PER_BLOCK;
      if (lo >= upto) {
        cells.push({ label: "", flag: "idle",
          title: "operations " + sdcap_int(lo + 1) + "–" + sdcap_int(hi) + " — not yet issued" });
        continue;
      }
      nref = 0; nstale = 0; nlost = 0; ndup = 0; nghost = 0;
      for (j = lo; j < hi && j < upto; j++) {
        if (out[j] === 1) nref++;
        else if (out[j] === 2) nstale++;
        else if (out[j] === 3) nlost++;
        else if (out[j] === 4) ndup++;
        else if (out[j] === 5) nghost++;
      }
      flag = (nlost + ndup + nghost) > 0 ? "bad" : nref > 0 ? "warn" : "ok";
      bits = [];
      if (nref) bits.push(nref + " refused");
      if (nstale) bits.push(nstale + " stale but in contract");
      if (nlost) bits.push(nlost + " writes discarded at heal");
      if (ndup) bits.push(ndup + " duplicate executions");
      if (nghost) bits.push(nghost + " reads of a vanished write");
      cells.push({
        flag: flag, label: "",
        title: "operations " + sdcap_int(lo + 1) + "–" + sdcap_int(hi) + " — " +
          (bits.length ? bits.join(" · ") : "all served, all correct")
      });
    }
    return cells;
  }

  // ----------------------------------------------------------------------
  // One policy, replayed over the identical traffic.
  //   cfg.policy(need) -> "local" | "quorum"
  //   cfg.merge        -> true when the causal path carries version vectors
  //                       (concurrent updates merge) instead of LWW registers
  // ----------------------------------------------------------------------
  function sdcap_run(cfg) {
    var ops = sdcap_TRAFFIC;
    var seen = { A: {}, B: {} };
    var glob = {};
    var wr = { A: {}, B: {} };
    var doneRec = {}, lostKey = {};
    var out = [], i;
    for (i = 0; i < sdcap_OPS; i++) out.push(0);

    var st = {
      served: 0, refused: 0, stale: 0, lost: 0, dup: 0, deduped: 0, ghost: 0,
      dupPay: 0, dupInv: 0, dupName: 0, divergent: 0, merged: 0,
      quorumN: 0, latSum: 0, latN: 0,
      pTotal: 0, pServed: 0, pRefused: 0,
      eTotal: 0, eQuorum: 0,
      strong: 0, strongRef: 0, weak: 0, weakRef: 0,
      done: 0, reads: 0, retryN: 0,
      refBy: {}, lostBy: {}, ghostBy: {}
    };
    for (i = 0; i < sdcap_MIX.length; i++) {
      st.refBy[sdcap_MIX[i].id] = 0;
      st.lostBy[sdcap_MIX[i].id] = 0;
      st.ghostBy[sdcap_MIX[i].id] = 0;
    }
    var waves = [];

    function part(w) { return w >= sdcap_PSTART && w < sdcap_PEND; }

    function runWave(w) {
      var p = part(w);
      var c = { w: w, part: p, n: 0, served: 0, refused: 0, stale: 0, dup: 0,
                aN: 0, bN: 0, aServed: 0, bServed: 0, writesA: 0, writesB: 0 };
      var lo = w * sdcap_WAVE, hi = lo + sdcap_WAVE;
      var k, op, mode, reach, vis, lat, rec, sees;
      for (k = lo; k < hi; k++) {
        op = ops[k];
        mode = cfg.policy(op.need);
        reach = p ? (op.side === "A" ? sdcap_MAJ : sdcap_MIN) : sdcap_N;
        c.n++;
        if (op.side === "A") c.aN++; else c.bN++;
        if (op.need === "linear") st.strong++; else st.weak++;
        if (p) st.pTotal++; else { st.eTotal++; if (mode === "quorum") st.eQuorum++; }

        if (mode === "quorum" && reach < sdcap_QUORUM) {
          st.refused++; c.refused++;
          st.refBy[op.t]++;
          if (p) st.pRefused++;
          if (op.need === "linear") st.strongRef++; else st.weakRef++;
          out[k] = 1;
          continue;
        }

        st.served++; c.served++;
        if (op.side === "A") c.aServed++; else c.bServed++;
        if (p) st.pServed++;
        lat = mode === "quorum" ? sdcap_QMS : sdcap_LOCAL_MS;
        st.latSum += lat; st.latN++;
        if (mode === "quorum") st.quorumN++;

        if (op.kind === "read") {
          st.reads++;
          vis = mode === "quorum" ? (seen.A[op.key] || 0) : (seen[op.side][op.key] || 0);
          if ((glob[op.key] || 0) > vis) { st.stale++; c.stale++; out[k] = 2; }
          if (lostKey[op.key]) { st.ghost++; st.ghostBy[op.t]++; out[k] = 5; }
          continue;
        }

        // ---- a write ----------------------------------------------------
        if (op.need === "linear") {
          if (op.retry) st.retryN++;
          rec = doneRec[op.idem];
          sees = rec ? (mode === "quorum" ? rec.A : rec[op.side]) : false;
          if (sees) { st.deduped++; continue; }         // correct no-op: the retry is absorbed
          if (rec) {
            st.dup++; c.dup++; out[k] = 4;
            if (op.t === "pay") st.dupPay++;
            else if (op.t === "inv") st.dupInv++;
            else st.dupName++;
          } else {
            doneRec[op.idem] = { A: false, B: false };
            rec = doneRec[op.idem];
            st.done++;
          }
          if (!p) { rec.A = true; rec.B = true; }
          else if (mode === "quorum") { rec.A = true; }
          else { rec[op.side] = true; }
        }

        if (!p) { seen.A[op.key] = k + 1; seen.B[op.key] = k + 1; }
        else if (mode === "quorum") { seen.A[op.key] = k + 1; }
        else {
          seen[op.side][op.key] = k + 1;
          if (!wr[op.side][op.key]) wr[op.side][op.key] = [];
          wr[op.side][op.key].push(k);
        }
        if (op.side === "A") c.writesA++; else c.writesB++;
        if ((glob[op.key] || 0) < k + 1) glob[op.key] = k + 1;
      }
      waves.push(c);
      return c;
    }

    function heal() {
      var k, j, a, b, loser;
      for (k in wr.B) {
        if (!wr.B.hasOwnProperty(k)) continue;
        a = wr.A[k];
        b = wr.B[k];
        if (!a || !a.length || !b.length) continue;
        st.divergent++;
        if (cfg.merge) {
          st.merged += a.length + b.length;
        } else {
          loser = a[a.length - 1] > b[b.length - 1] ? b : a;
          for (j = 0; j < loser.length; j++) {
            out[loser[j]] = 3;
            st.lost++;
            st.lostBy[ops[loser[j]].t]++;
          }
          lostKey[k] = true;
        }
      }
      for (k in glob) if (glob.hasOwnProperty(k)) { seen.A[k] = glob[k]; seen.B[k] = glob[k]; }
      for (k in doneRec) if (doneRec.hasOwnProperty(k)) { doneRec[k].A = true; doneRec[k].B = true; }
    }

    // ---- the frames ------------------------------------------------------
    var steps = [];
    function frame(o) {
      o.st = sdcap_copy(st);
      o.waves = waves.slice(0);
      o.cells = sdcap_blocks(out, o.upto);
      o.cfg = cfg;
      steps.push(o);
    }

    frame({
      phase: 0, upto: 0, link: "up", flag: "idle",
      caption: "<b>" + sdcap_int(sdcap_OPS) + " operations, five replicas, nothing broken.</b> " +
        "The mix is the page's own table: <b>" + sdcap_p1(sdcap_STRONG_SHARE * 100) +
        "</b> linearizable — checkout, inventory decrement, username registration — and <b>" +
        sdcap_p1(sdcap_WEAK_SHARE * 100) + "</b> that is not. " + cfg.opening + " Press Play."
    });

    var c0 = runWave(0);
    frame({
      phase: 1, upto: sdcap_WAVE, link: "up", wave: c0,
      flag: cfg.id === "cp" ? "warn" : "ok",
      caption: "<b>Wave 1 · the cluster is whole — PACELC's <i>else</i> branch.</b> No partition " +
        "to tolerate, and still a choice being made " + sdcap_int(c0.n) + " times: " +
        (st.eQuorum > 0
          ? "<b>" + sdcap_int(st.eQuorum) + " of " + sdcap_int(st.eTotal) + "</b> operations " +
            "waited for a quorum, so they cost <b>" + sdcap_ms(sdcap_QMS) + "</b> instead of " +
            sdcap_ms(sdcap_LOCAL_MS) + " — " + (sdcap_QMS / sdcap_LOCAL_MS).toFixed(1) +
            "× — and the mean so far is <b>" + sdcap_ms(st.latN ? st.latSum / st.latN : 0) + "</b>."
          : "every one answered from its local replica at <b>" + sdcap_ms(sdcap_LOCAL_MS) +
            "</b>, consistency traded away for latency while the network is perfectly healthy.") +
        " This branch runs " + sdcap_p1(sdcap_pct(sdcap_WAVES - (sdcap_PEND - sdcap_PSTART), sdcap_WAVES)) +
        " of the window; CAP describes the other part."
    });

    var c1 = runWave(1);
    frame({
      phase: 2, upto: 2 * sdcap_WAVE, link: "down", wave: c1, flag: "warn",
      caption: "<b>A switch reboots. The cluster splits " + sdcap_MAJ + " | " + sdcap_MIN +
        ".</b> Partition tolerance was never a choice — the only choice is what the <b>" +
        sdcap_int(c1.bN) + "</b> requests that landed on the minority get back. " + cfg.split +
        " Quorum is floor(" + sdcap_N + "/2)+1 = <b>" + sdcap_QUORUM +
        "</b>, so the minority's " + sdcap_MIN + " replicas can never form one."
    });

    var c2 = runWave(2);
    frame({
      phase: 3, upto: 3 * sdcap_WAVE, link: "down", wave: c2, flag: cfg.midFlag,
      caption: cfg.mid(st, c2)
    });

    var c3 = runWave(3);
    frame({
      phase: 4, upto: 4 * sdcap_WAVE, link: "down", wave: c3, flag: cfg.midFlag,
      caption: "<b>Third wave across the split.</b> " + sdcap_int(st.pTotal) +
        " operations have now crossed a partitioned cluster; <b>" +
        sdcap_p1(sdcap_pct(st.pServed, st.pTotal)) + "</b> of them got an answer" +
        (st.pRefused === 0
          ? ". Nothing has failed, nothing has alerted, and the two sides have been diverging " +
            "for " + sdcap_int(st.pTotal) + " operations. The bill arrives at reconciliation."
          : st.weakRef > 0
            ? " and <b>" + sdcap_int(st.pRefused) + "</b> got an error. In CAP's vocabulary " +
              "this system is not available — availability means <i>every</i> non-failing node " +
              "answers <i>every</i> request, and " + sdcap_MIN + " perfectly healthy replicas " +
              "are answering none of theirs."
            : " and <b>" + sdcap_int(st.pRefused) + "</b> got an error — every one of them a " +
              "linearizable write on the minority, " +
              sdcap_p2(sdcap_pct(st.pRefused, st.pTotal)) + " of the traffic crossing the " +
              "split. Strictly, CAP calls that unavailable too; the difference is that you " +
              "chose exactly which requests to pay it with.")
    });

    heal();
    frame({
      phase: 5, upto: 4 * sdcap_WAVE, link: "up", healed: true,
      flag: st.lost ? "bad" : "ok",
      caption: cfg.heal(st)
    });

    var c4 = runWave(4);
    frame({
      phase: 6, upto: 5 * sdcap_WAVE, link: "up", wave: c4,
      flag: st.ghost ? "bad" : "ok",
      caption: "<b>Wave 5 · the network is fine again.</b> Availability is back to " +
        sdcap_p1(sdcap_pct(c4.served, c4.n)) + " for this wave" +
        (st.ghost
          ? ", and <b>" + sdcap_int(st.ghost) + "</b> of this wave's reads came back from a " +
            "timeline or a cart that is permanently missing a write discarded at the merge — " +
            "a post the author watched succeed, simply not there any more, and no error " +
            "anywhere. <b>The partition ended; the cost did not.</b>"
          : ", and nothing from the partition is leaking into it: no writes were discarded, " +
            "so no read comes back missing one.")
    });

    frame({
      phase: 7, upto: sdcap_OPS, link: "up", healed: true, report: true,
      flag: cfg.verdictFlag,
      caption: cfg.verdict(st)
    });
    return { id: cfg.id, label: cfg.label, steps: steps, final: sdcap_copy(st), cfg: cfg };
  }

  function sdcap_anom(s) { return s.lost + s.dup + s.ghost; }
  function sdcap_pacelc(s) {
    return (s.pRefused > 0 ? "PC" : "PA") + "/" + (s.eQuorum > 0 ? "EC" : "EL");
  }

  // ----------------------------------------------------------------------
  // Three policies over the identical 5,000 operations.
  // ----------------------------------------------------------------------
  var sdcap_AP = sdcap_run({
    id: "ap", label: "AP everywhere",
    merge: false,
    policy: function () { return "local"; },
    opening: "This build answers everything from the nearest replica and resolves conflicts " +
      "last-write-wins — the shorthand \"we're AP\", applied to the whole system.",
    split: "This build answers from whichever replicas it can reach, both sides, always.",
    midFlag: "warn",
    mid: function (s, c) {
      return "<b>Second wave across the split — and both sides are still saying yes.</b> " +
        sdcap_int(s.served) + " of " + sdcap_int(s.served + s.refused) +
        " operations served, zero errors, a mean of <b>" +
        sdcap_ms(s.latN ? s.latSum / s.latN : 0) + "</b>. And <b>" + sdcap_int(s.dup) +
        "</b> of the " + sdcap_int(s.retryN) + " client retries so far " +
        sdcap_plural(s.dup, "has", "have") + " executed a second time, because the " +
        "idempotency check is a local read and the record it is looking for is on the other " +
        "side of the break: " + s.dupPay + " double charges, " + s.dupInv +
        " double decrements, " + s.dupName + " duplicate usernames. An idempotency key does " +
        "not save you here — <i>checking</i> one is itself a linearizable read.";
    },
    heal: function (s) {
      return "<b>The link comes back. " + sdcap_int(s.divergent) + " keys were written on " +
        "both sides, and last-write-wins now discards <b>" + sdcap_int(s.lost) +
        "</b> acknowledged writes.</b> " +
        "No error was returned for any of those writes; every one of them was acknowledged as " +
        "successful at the time. That is what \"eventual\" means without version vectors — the " +
        "replicas converge, and convergence is implemented by throwing one side's data away.";
    },
    verdictFlag: "bad",
    verdict: function (s) {
      return "<b>" + sdcap_p2(sdcap_pct(s.served, sdcap_OPS)) + " availability, " +
        sdcap_ms(s.latN ? s.latSum / s.latN : 0) + " mean, and " + sdcap_int(sdcap_anom(s)) +
        " outcomes that should not have happened</b> — " + sdcap_int(s.lost) +
        " writes discarded, " + sdcap_int(s.dup) + " duplicate executions (" + s.dupPay +
        " of them charges), " + sdcap_int(s.ghost) + " reads that came back missing one. " +
        "Classification " + sdcap_pacelc(s) + ". The " + sdcap_int(s.stale) +
        " stale reads are <i>not</i> in that total: they were feed and follower-count reads, " +
        "which the page says can be stale and nobody notices. <b>The damage is concentrated in " +
        "the " + sdcap_p1(sdcap_pct(s.strong, sdcap_OPS)) + " of traffic that needed " +
        "linearizability</b> — one percent of the operations, all of the harm.";
    }
  });

  var sdcap_CP = sdcap_run({
    id: "cp", label: "CP everywhere",
    merge: false,
    policy: function () { return "quorum"; },
    opening: "This build routes every operation — reads included — through a majority quorum. " +
      "One consistency model, applied to the whole system, chosen for the strictest requirement in it.",
    split: "This build needs " + sdcap_QUORUM + " replicas to agree before it answers anything.",
    midFlag: "bad",
    mid: function (s, c) {
      return "<b>Second wave across the split.</b> The majority keeps serving; the minority's " +
        sdcap_MIN + " replicas are up, healthy, and returning errors to every request that " +
        "reaches them — <b>" + sdcap_int(s.refused) + "</b> refusals so far, of which <b>" +
        sdcap_int(s.weakRef) + "</b> were feed views and follower counts that would have been " +
        "perfectly fine served seconds stale. Zero wrong answers, and that is the trade: the " +
        "system chose to refuse rather than risk being wrong, for operations where being wrong " +
        "cost nothing.";
    },
    heal: function (s) {
      return "<b>The link comes back. Nothing to reconcile: " + sdcap_int(s.divergent) +
        " divergent keys, " + sdcap_int(s.lost) + " writes lost.</b> Every write that was " +
        "acknowledged had already reached a majority, so the minority simply catches up. This is " +
        "the half of the trade that is genuinely worth buying — it just was not worth buying " +
        "for the " + sdcap_p1(sdcap_WEAK_SHARE * 100) + " of operations that never needed it.";
    },
    verdictFlag: "warn",
    verdict: function (s) {
      var mean = s.latN ? s.latSum / s.latN : 0;
      return "<b>Zero wrong answers — and " + sdcap_p1(sdcap_pct(s.served, sdcap_OPS)) +
        " availability, " + sdcap_int(s.refused) + " errors returned by healthy machines.</b> " +
        "Classification " + sdcap_pacelc(s) + ": the <i>else</i> branch is the expensive part, " +
        "because all " + sdcap_int(s.eTotal) + " operations in the unpartitioned waves also paid " +
        sdcap_ms(sdcap_QMS) + " instead of " + sdcap_ms(sdcap_LOCAL_MS) + ", giving a mean of <b>" +
        sdcap_ms(mean) + "</b> — " + (mean / sdcap_LOCAL_MS).toFixed(1) +
        "× the local cost, paid continuously, for a partition that occupied " +
        sdcap_p1(sdcap_pct(sdcap_PEND - sdcap_PSTART, sdcap_WAVES)) + " of the window. " +
        "<b>This is what \"design the whole system to the strictest requirement\" buys:</b> " +
        "correctness you already needed on " + sdcap_p1(sdcap_pct(s.strong, sdcap_OPS)) +
        " of the traffic, and a bill on the other " + sdcap_p1(sdcap_pct(s.weak, sdcap_OPS)) + ".";
    }
  });

  var sdcap_PEROP = sdcap_run({
    id: "perop", label: "Per operation",
    merge: true,
    policy: function (need) { return need === "linear" ? "quorum" : "local"; },
    opening: "This build decides per operation, not per system: quorum for checkout, inventory " +
      "and username registration; local reads and version-vector merges for everything else.",
    split: "Feed views, posts and carts keep being served on both sides; only the linearizable " +
      "path needs a quorum, and only it can be refused.",
    midFlag: "ok",
    mid: function (s, c) {
      return "<b>Second wave across the split — and almost nothing notices.</b> <b>" +
        sdcap_int(s.refused) + "</b> operations refused in total, every one of them a " +
        "linearizable write on the minority side; <b>" + sdcap_int(s.weakRef) +
        "</b> eventual or causal operations refused. The " + sdcap_int(s.stale) +
        " stale reads served are feed views and follower counts, which is precisely the " +
        "staleness the page says is invisible. <b>" + sdcap_int(s.dup) +
        "</b> duplicate executions: the idempotency check on a checkout is a quorum read, so " +
        "the retry that landed on the far side was refused rather than silently charged again.";
    },
    heal: function (s) {
      return "<b>The link comes back. " + sdcap_int(s.divergent) + " keys were written on both " +
        "sides — and <b>" + sdcap_int(s.lost) + "</b> writes were lost.</b> " +
        sdcap_int(s.merged) + " concurrent updates merged instead, because the causal path " +
        "carries version vectors rather than a last-write-wins register: a timeline is an " +
        "append and a cart is a set, so two concurrent updates to the same key are both " +
        "keepable. Same partition, same divergence, no data destroyed.";
    },
    verdictFlag: "ok",
    verdict: function (s) {
      var mean = s.latN ? s.latSum / s.latN : 0;
      return "<b>" + sdcap_p2(sdcap_pct(s.served, sdcap_OPS)) + " availability, " +
        sdcap_ms(mean) + " mean, " + sdcap_int(sdcap_anom(s)) + " wrong outcomes.</b> " +
        "The " + sdcap_int(s.refused) + " refusals are all linearizable writes on the minority " +
        "side — " + sdcap_p2(sdcap_pct(s.refused, sdcap_OPS)) + " of the window — and refusing " +
        "them is the correct answer, because a double charge is worse than an error. Only <b>" +
        sdcap_int(s.quorumN) + "</b> operations paid " + sdcap_ms(sdcap_QMS) +
        ", so the mean is " + (sdcap_CP.final.latSum / sdcap_CP.final.latN / mean).toFixed(1) +
        "× cheaper than routing everything through a quorum. The honest label is not one label: " +
        "<b>PA/EL for the " + sdcap_p1(sdcap_pct(s.weak, sdcap_OPS)) + " that is eventual, " +
        "PC/EC for the " + sdcap_p1(sdcap_pct(s.strong, sdcap_OPS)) +
        " that is not</b> — which is the page's whole point, and the sentence worth saying.";
    }
  });

  var sdcap_RUNS = [sdcap_AP, sdcap_CP, sdcap_PEROP];

  function sdcap_compare(d) {
    var rows = [], i, r, s;
    for (i = 0; i < sdcap_RUNS.length; i++) {
      r = sdcap_RUNS[i];
      s = r.final;
      rows.push([
        r.label,
        sdcap_p2(sdcap_pct(s.served, sdcap_OPS)),
        sdcap_ms(s.latN ? s.latSum / s.latN : 0),
        String(sdcap_anom(s)),
        sdcap_pacelc(s)
      ]);
    }
    return d.table(["policy", "available", "mean op", "wrong", "PACELC"], rows);
  }

  S["sdcapandconsistenc"] = {
    title: "Open a partition and count what each policy costs",
    note: "One five-replica store, <b>" + sdcap_int(sdcap_OPS) + " operations</b> in " +
      sdcap_WAVES + " waves of " + sdcap_int(sdcap_WAVE) + ", and a partition that splits it <b>" +
      sdcap_MAJ + " | " + sdcap_MIN + "</b> for waves " + (sdcap_PSTART + 1) + "–" + sdcap_PEND +
      ". Quorum is floor(" + sdcap_N + "/2)+1 = <b>" + sdcap_QUORUM +
      "</b>, so the minority can never form one. The workload is section 5's table — <b>" +
      sdcap_p1(sdcap_STRONG_SHARE * 100) + "</b> linearizable (checkout, inventory, username) " +
      "against <b>" + sdcap_p1(sdcap_WEAK_SHARE * 100) + "</b> that is not, matching the page's " +
      "\"ninety-nine percent of this system is eventually consistent\"; the draw landed on <b>" +
      sdcap_int(sdcap_DRAWN_STRONG) + "</b> linearizable operations and <b>" +
      sdcap_int(sdcap_DRAWN_MINORITY) + "</b> requests on the minority side. Declared, because " +
      "the page publishes no such figures: a local commit costs <b>" + sdcap_ms(sdcap_LOCAL_MS) +
      "</b> and a cross-AZ round trip <b>" + sdcap_ms(sdcap_RTT_MS) + "</b>, so a quorum " +
      "operation costs <b>" + sdcap_ms(sdcap_QMS) + "</b>; " + (sdcap_RETRY * 100).toFixed(0) +
      "% of linearizable writes are client retries carrying the same idempotency key and routed " +
      "independently; replication lag is ignored while the cluster is whole, so every stale " +
      "answer below was caused by the split. All three tabs replay the identical traffic.",
    interval: 1500,
    scenarios: sdcap_RUNS,

    draw: function (step, d, ctx) {
      var s = step.st, cfg = step.cfg, ph = step.phase;
      var total = s.served + s.refused;
      var avail = sdcap_pct(s.served, total);
      var mean = s.latN ? s.latSum / s.latN : 0;
      var anom = sdcap_anom(s);
      var down = step.link === "down";
      var i, w;

      // ---- head ----------------------------------------------------------
      var head = d.cols([
        d.big(ph === 0 ? "—" : sdcap_p2(avail), "answered / asked",
          ph === 0 ? "idle" : avail >= 99.9 ? "ok" : avail >= 95 ? "warn" : "bad"),
        d.stat({
          label: "refused by a healthy node",
          value: sdcap_int(s.refused),
          sub: s.refused ? sdcap_int(s.weakRef) + " of them eventual work" : "none",
          flag: ph === 0 ? "idle" : s.refused ? "warn" : "ok"
        }),
        d.stat({
          label: "wrong outcomes",
          value: sdcap_int(anom),
          sub: s.lost + " discarded · " + s.dup + " run twice · " +
            s.ghost + " reads holed",
          flag: ph === 0 ? "idle" : anom ? "bad" : "ok"
        }),
        d.stat({
          label: "mean per operation",
          value: ph === 0 ? "—" : sdcap_ms(mean),
          sub: ph === 0 ? "nothing run" : sdcap_int(s.quorumN) + " paid for a quorum",
          flag: ph === 0 ? "idle" : mean > sdcap_LOCAL_MS * 2 ? "warn" : "ok"
        })
      ]);

      // ---- the two sides --------------------------------------------------
      var majRows = [
        { label: "replicas", value: sdcap_MAJ + " of " + sdcap_N },
        { label: "quorum of " + sdcap_QUORUM, value: down ? "reachable" : "reachable", flag: "ok" }
      ];
      var minRows = [
        { label: "replicas", value: sdcap_MIN + " of " + sdcap_N },
        { label: "quorum of " + sdcap_QUORUM,
          value: down ? "UNREACHABLE" : "reachable", flag: down ? "bad" : "ok" }
      ];
      if (step.wave) {
        majRows.push({ label: "this wave", value: sdcap_int(step.wave.aN) + " requests" });
        majRows.push({ label: "answered", value: sdcap_int(step.wave.aServed),
          flag: step.wave.aServed === step.wave.aN ? "ok" : "warn" });
        minRows.push({ label: "this wave", value: sdcap_int(step.wave.bN) + " requests" });
        minRows.push({ label: "answered", value: sdcap_int(step.wave.bServed),
          flag: step.wave.bServed === step.wave.bN ? "ok"
            : step.wave.bServed === 0 ? "bad" : "warn" });
      } else {
        majRows.push({ label: "traffic share", value: sdcap_p1(sdcap_pct(sdcap_MAJ, sdcap_N)) });
        minRows.push({ label: "traffic share", value: sdcap_p1(sdcap_pct(sdcap_MIN, sdcap_N)) });
      }
      if (ph >= 5) {
        majRows.push({ label: "divergent keys", value: sdcap_int(s.divergent),
          flag: s.divergent ? "warn" : "ok" });
        minRows.push({ label: cfg.merge ? "updates merged" : "writes discarded",
          value: sdcap_int(cfg.merge ? s.merged : s.lost),
          flag: cfg.merge ? "ok" : s.lost ? "bad" : "ok" });
      }

      var sides = d.cols([
        d.node({
          title: "majority side", status: down ? "SERVING" : "WHOLE",
          statusFlag: "ok", badge: "r1 r2 r3",
          meta: down ? "can still form a quorum" : "one cluster",
          flag: "ok", rows: majRows
        }),
        d.node({
          title: "minority side",
          status: down ? "PARTITIONED" : "WHOLE",
          statusFlag: down ? "bad" : "ok", badge: "r4 r5",
          meta: down ? "up, healthy, and cut off" : "one cluster",
          flag: down ? "bad" : "ok", rows: minRows
        })
      ]);

      // ---- the wave lane ---------------------------------------------------
      var served = [], refused = [];
      for (i = 0; i < sdcap_WAVES; i++) {
        w = step.waves[i];
        if (!w) {
          served.push({ label: "·", flag: "idle", title: "wave " + (i + 1) + " — not yet run" });
          refused.push({ label: "·", flag: "idle", title: "wave " + (i + 1) + " — not yet run" });
        } else {
          served.push({
            label: sdcap_int(w.served),
            flag: w.served === w.n ? "ok" : "warn",
            title: "wave " + (i + 1) + (w.part ? " — partitioned" : " — whole") + " · " +
              sdcap_int(w.served) + " of " + sdcap_int(w.n) + " answered"
          });
          refused.push({
            label: w.refused ? sdcap_int(w.refused) : "0",
            flag: w.refused ? "bad" : "ok",
            title: "wave " + (i + 1) + " · " + sdcap_int(w.refused) + " refused, " +
              sdcap_int(w.stale) + " served stale, " + sdcap_int(w.dup) + " executed twice"
          });
        }
      }
      var lanes = d.stack([
        d.lane({ label: "answered", cells: served }),
        d.lane({ label: "refused", cells: refused })
      ]);

      // ---- report ----------------------------------------------------------
      var extra = [];
      if (step.report) {
        extra.push(d.table(
          ["operation", "needs", "issued", "refused", "damaged"],
          [
            ["feed", "eventual", sdcap_int(sdcap_DRAWN.feed),
              String(s.refBy.feed), s.ghostBy.feed + " holed"],
            ["follower count", "eventual", sdcap_int(sdcap_DRAWN.count),
              String(s.refBy.count), s.ghostBy.count + " holed"],
            ["post", "read-your-writes", sdcap_int(sdcap_DRAWN.post),
              String(s.refBy.post), s.lostBy.post + " lost"],
            ["add to cart", "causal", sdcap_int(sdcap_DRAWN.cart),
              String(s.refBy.cart), s.lostBy.cart + " lost"],
            ["checkout", "linearizable", sdcap_int(sdcap_DRAWN.pay),
              String(s.refBy.pay), s.dupPay + " charged twice"],
            ["inventory", "linearizable", sdcap_int(sdcap_DRAWN.inv),
              String(s.refBy.inv), s.dupInv + " decremented twice"],
            ["username", "linearizable", sdcap_int(sdcap_DRAWN.name),
              String(s.refBy.name), s.dupName + " taken twice"]
          ]
        ));
        extra.push(sdcap_compare(d));
      } else if (ph >= 2) {
        extra.push(d.stack([
          d.bar({ label: "reads served stale (all of them in contract)",
            pct: sdcap_pct(s.stale, Math.max(1, s.reads)),
            value: sdcap_int(s.stale) + " of " + sdcap_int(s.reads),
            flag: s.stale ? "warn" : "ok" }),
          d.bar({ label: "client retries absorbed by the dedupe check",
            pct: sdcap_pct(s.deduped, Math.max(1, s.retryN)),
            value: sdcap_int(s.deduped) + " of " + sdcap_int(s.retryN),
            flag: "ok" }),
          d.bar({ label: "client retries that executed a second time",
            pct: sdcap_pct(s.dup, Math.max(1, s.retryN)),
            value: sdcap_int(s.dup) + " of " + sdcap_int(s.retryN),
            flag: s.dup ? "bad" : "ok" })
        ]));
      }

      return d.stack([
        head,
        sides,
        lanes,
        extra.length ? d.stack(extra) : "",
        d.cells(step.cells, {
          label: "the " + sdcap_int(sdcap_OPS) + " operations · " +
            sdcap_int(sdcap_PER_BLOCK) + " per block", dense: true
        }),
        d.note(
          "Green blocks were answered and stayed correct · amber contains a refusal · " +
          "<b>red contains a write that was thrown away, an operation that executed twice, or a " +
          "read that came back missing one</b> · grey has not been issued. Stale feed " +
          "reads are not red: the page says seconds of staleness there is invisible, and that " +
          "is exactly why they are the " + sdcap_p1(sdcap_WEAK_SHARE * 100) + ".",
          anom ? "bad" : ph === 0 ? undefined : "ok"
        )
      ]);
    }
  };

  // ====================================================================
  // ======================================================================
  // SIM · sdcdnandstorage  (cdn-and-storage.md)
  //
  // The page's section 6 does the arithmetic and section 4 names the thing
  // that unfolds: "the first request at an edge misses and fetches from
  // origin." So the time axis is one DAY of image traffic, three hours at a
  // time, from the moment the CDN is switched on with every edge cache
  // empty — the offload ratio climbing as the popular objects warm, the
  // origin's NICs carrying whatever the edges could not, and the bill
  // accumulating underneath.
  //
  // FROM THE PAGE, used verbatim (section 6's block, and section 4):
  //   20,000 image requests/s · 200 KB each   -> 4 GB/s -> 32 Gbps
  //   x 86,400 s                              -> 345 TB/day
  //   at $0.05/GB cloud egress                -> ~$17k/day -> $6M/year
  //   a 4 MB original vs a 200 KB variant     -> the 20x lever the page
  //                                              calls the biggest one
  //   WebP / AVIF                             -> "another 30%"
  //   95% offload                             -> "your origin serves 1/20th"
  //   Cache-Control: public, max-age=31536000, immutable   (the good case)
  //   Cache-Control: private, max-age=0                    (the page's
  //                                              "usually don't", which is
  //                                              what tab 3 ships by accident)
  // Every one of those figures is recomputed here from the inputs rather
  // than transcribed, and the results are printed so they can be checked
  // against the page: 20,000 x 200,000 B = 4.00 GB/s, x 8 = 32.0 Gbps,
  // x 86,400 = 345.6 TB, x $0.05/GB = $17,280/day = $6.31M/year.
  //
  // DECLARED, because the page gives no figure:
  //   edges                20 PoPs, requests routed to the nearest, uniform
  //   catalogue            50,000,000 objects, Zipf popularity with
  //                        exponent 1.1 — the skew is what produces an
  //                        offload ratio, so it is stated rather than the
  //                        offload ratio being stated
  //   CDN egress           $0.004/GB (the page only says "materially
  //                        cheaper"; this is a volume-tier price)
  //   origin capacity      4 origin servers x 10 GbE = 40 Gbps, so origin
  //                        saturation is a real outcome and not an assertion
  //   diurnal curve        8 three-hour multipliers averaging exactly 1.0,
  //                        so the DAY totals the page's figures exactly
  //
  // THE CACHE MODEL, so the offload number is derived and not typed. The
  // catalogue is split into logarithmic rank buckets. For one object at one
  // PoP with arrival rate lambda and a block of D seconds:
  //     max-age >= D   the object is fetched at most once per PoP, ever;
  //                    the chance this block is the first time is
  //                    1 - exp(-lambda*D), and warmth carries to the next
  //                    block. This is "the first user per region pays the
  //                    miss", integrated over the whole catalogue.
  //     max-age = 0    a shared cache may not store it at all, so every
  //                    request is an origin fetch of the full body.
  // Summing over buckets reproduces the request total exactly, which is the
  // check that the model is consistent.
  // ======================================================================
  var sdcdn_QPS = 20000;                 // page
  var sdcdn_VAR_B = 200000;              // page: 200 KB
  var sdcdn_ORIG_B = 4000000;            // page: a 4 MB original
  var sdcdn_DAY_S = 86400;               // page
  var sdcdn_NBLK = 8;
  var sdcdn_BLK_S = sdcdn_DAY_S / sdcdn_NBLK;          // 10,800 s = 3 h
  var sdcdn_MULT = [0.40, 0.30, 0.65, 1.25, 1.50, 1.40, 1.80, 0.70];
  var sdcdn_CLOUD_GB = 0.05;             // page: "a rough $0.05/GB cloud egress"
  var sdcdn_CDN_GB = 0.004;              // declared
  var sdcdn_ORIGIN_GBPS = 40;            // declared: 4 x 10 GbE
  var sdcdn_POPS = 20;                   // declared
  var sdcdn_CATALOG = 50000000;          // declared
  var sdcdn_ZIPF = 1.1;                  // declared
  var sdcdn_IMMUTABLE_S = 31536000;      // page: max-age=31536000
  var sdcdn_MODERN = 0.30;               // page: "another 30%"
  var sdcdn_PAGE_OFFLOAD = 0.95;         // page
  var sdcdn_NBUCK = 60;

  var sdcdn_MEAN_MULT = (function () {
    var t = 0, i;
    for (i = 0; i < sdcdn_MULT.length; i++) t += sdcdn_MULT[i];
    return t / sdcdn_MULT.length;
  })();

  // ---- the page's own block, recomputed --------------------------------
  var sdcdn_BPS = sdcdn_QPS * sdcdn_VAR_B;                      // 4.0e9 B/s
  var sdcdn_GBPS = sdcdn_BPS * 8 / 1e9;                         // 32.0 Gbps
  var sdcdn_DAY_B = sdcdn_BPS * sdcdn_DAY_S;                    // 3.456e14 B
  var sdcdn_DAY_USD = sdcdn_DAY_B / 1e9 * sdcdn_CLOUD_GB;       // 17,280
  var sdcdn_YEAR_USD = sdcdn_DAY_USD * 365;                     // 6,307,200
  var sdcdn_LEVER = sdcdn_ORIG_B / sdcdn_VAR_B;                 // 20x

  function sdcdn_usd0(x) { return "$" + Math.round(x).toLocaleString("en-US"); }
  function sdcdn_usdM(x) { return "$" + (x / 1e6).toFixed(2) + "M"; }
  function sdcdn_tb(bytes) { return (bytes / 1e12).toFixed(1) + " TB"; }
  function sdcdn_pb(bytes) { return (bytes / 1e15).toFixed(2) + " PB"; }
  function sdcdn_gbps(x) { return x.toFixed(1) + " Gbps"; }
  function sdcdn_p1(x) { return x.toFixed(1) + "%"; }
  function sdcdn_int(n) { return Math.round(n).toLocaleString("en-US"); }
  function sdcdn_pct(a, b) { return b > 0 ? (a / b) * 100 : 0; }
  function sdcdn_m(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + "k";
    return String(Math.round(n));
  }
  function sdcdn_clock(b) {
    var h = b * 3;
    return (h < 10 ? "0" : "") + h + ":00–" + ((h + 3) < 10 ? "0" : "") + (h + 3) + ":00";
  }

  // ---- the catalogue, as logarithmic rank buckets -----------------------
  function sdcdn_buckets() {
    var out = [], prev = 1, j, r, a, b, mass, H = 0, i;
    function F(x) { return Math.pow(x, 1 - sdcdn_ZIPF) / (1 - sdcdn_ZIPF); }
    for (j = 1; j <= sdcdn_NBUCK; j++) {
      r = Math.round(Math.pow(sdcdn_CATALOG, j / sdcdn_NBUCK));
      if (r > sdcdn_CATALOG) r = sdcdn_CATALOG;
      if (r < prev) continue;
      a = prev; b = r;
      mass = F(b + 1) - F(a);
      out.push({ a: a, b: b, n: b - a + 1, mass: mass });
      prev = r + 1;
      if (prev > sdcdn_CATALOG) break;
    }
    for (i = 0; i < out.length; i++) H += out[i].mass;
    for (i = 0; i < out.length; i++) out[i].p = out[i].mass / H / out[i].n;
    return out;
  }
  var sdcdn_BK = sdcdn_buckets();

  /** Eight display groups, one per decade of rank. */
  var sdcdn_GROUPS = [
    { lo: 1, hi: 10, label: "1–10" },
    { lo: 11, hi: 100, label: "10²" },
    { lo: 101, hi: 1000, label: "10³" },
    { lo: 1001, hi: 10000, label: "10⁴" },
    { lo: 10001, hi: 100000, label: "10⁵" },
    { lo: 100001, hi: 1000000, label: "10⁶" },
    { lo: 1000001, hi: 10000000, label: "10⁷" },
    { lo: 10000001, hi: sdcdn_CATALOG, label: "tail" }
  ];

  // ----------------------------------------------------------------------
  // One serving policy, run over the day.
  //   cfg.cdn        is there a CDN in front at all
  //   cfg.ttlAt(b)   the max-age in force during block b (0 = not storable)
  // ----------------------------------------------------------------------
  function sdcdn_day(cfg) {
    var warm = [], i, b;
    for (i = 0; i < sdcdn_BK.length; i++) warm.push(0);

    var blocks = [];
    var cumCost = 0, cumDelivered = 0, cumOrigin = 0, cumShed = 0, cumReq = 0, cumMiss = 0;

    for (b = 0; b < sdcdn_NBLK; b++) {
      var qps = sdcdn_QPS * sdcdn_MULT[b];
      var reqs = qps * sdcdn_BLK_S;
      var ttl = cfg.cdn ? cfg.ttlAt(b) : 0;
      var miss = 0, lam, n, pf, add;

      if (!cfg.cdn || ttl <= 0) {
        miss = reqs;                                    // every request reaches the origin
        if (cfg.cdn) for (i = 0; i < sdcdn_BK.length; i++) warm[i] = 0;
      } else {
        for (i = 0; i < sdcdn_BK.length; i++) {
          lam = qps * sdcdn_BK[i].p / sdcdn_POPS;
          n = lam * sdcdn_BLK_S;
          if (ttl >= sdcdn_BLK_S) {
            pf = 1 - Math.exp(-n);
            add = (1 - warm[i]) * pf;
            warm[i] += add;
          } else {
            add = n / (1 + lam * ttl);
            warm[i] = 1 - Math.exp(-lam * ttl);
          }
          miss += add * sdcdn_BK[i].n * sdcdn_POPS;
        }
        if (miss > reqs) miss = reqs;
      }

      var size = sdcdn_VAR_B;
      var demandGbps = miss * size / sdcdn_BLK_S * 8 / 1e9;
      var capGbps = sdcdn_ORIGIN_GBPS;
      var frac = demandGbps > capGbps ? capGbps / demandGbps : 1;
      var missOk = miss * frac;
      var shed = miss - missOk;
      var hits = reqs - miss;
      var delivered = hits + missOk;
      var originBytes = missOk * size;
      var deliveredBytes = delivered * size;
      var cost = cfg.cdn
        ? deliveredBytes / 1e9 * sdcdn_CDN_GB + originBytes / 1e9 * sdcdn_CLOUD_GB
        : deliveredBytes / 1e9 * sdcdn_CLOUD_GB;

      cumCost += cost; cumDelivered += deliveredBytes; cumOrigin += originBytes;
      cumShed += shed; cumReq += reqs; cumMiss += miss;

      var grp = [];
      for (i = 0; i < sdcdn_GROUPS.length; i++) {
        var g = sdcdn_GROUPS[i], wsum = 0, wn = 0, msum = 0, k;
        for (k = 0; k < sdcdn_BK.length; k++) {
          if (sdcdn_BK[k].b < g.lo || sdcdn_BK[k].a > g.hi) continue;
          wsum += warm[k] * sdcdn_BK[k].n;
          wn += sdcdn_BK[k].n;
          msum += sdcdn_BK[k].p * sdcdn_BK[k].n;
        }
        grp.push({ label: g.label, warm: wn > 0 ? wsum / wn : 0, share: msum });
      }

      var deepest = -1;
      for (i = 0; i < grp.length; i++) if (grp[i].warm >= 0.90) deepest = i;
      var prevOff = blocks.length ? blocks[blocks.length - 1].offload : 0;

      blocks.push({
        b: b, qps: qps, reqs: reqs, miss: miss, hits: hits,
        newPairs: (cfg.cdn && ttl >= sdcdn_BLK_S) ? miss : 0,
        deepest: deepest, dOff: sdcdn_pct(hits, reqs) - prevOff,
        offload: sdcdn_pct(hits, reqs),
        demandGbps: demandGbps, servedGbps: demandGbps * frac, capGbps: capGbps,
        shed: shed, shedPct: sdcdn_pct(shed, reqs),
        userGbps: delivered * size / sdcdn_BLK_S * 8 / 1e9,
        cost: cost, cumCost: cumCost, cumDelivered: cumDelivered,
        cumOrigin: cumOrigin, cumShed: cumShed, cumReq: cumReq,
        dayOffload: sdcdn_pct(cumReq - cumMiss, cumReq),
        ttl: ttl, header: cfg.headerAt ? cfg.headerAt(b) : cfg.header,
        grp: grp
      });
    }
    return blocks;
  }

  /** One warming block, said differently each time because the numbers differ. */
  function sdcdn_warmCaption(bl, blocks, i) {
    var head = "<b>" + sdcdn_clock(bl.b) + " · offload " + sdcdn_p1(bl.offload) +
      (i > 0 ? " (+" + bl.dOff.toFixed(1) + " pts)" : "") + ".</b> ";
    var body;
    if (i === 0) {
      body = "Cold start. <b>" + sdcdn_m(bl.miss) + "</b> of " + sdcdn_m(bl.reqs) +
        " requests were the first time that object had ever been asked for at that PoP, and " +
        "every one paid an origin fetch. That is the entire cost of origin-pull, and it is " +
        "paid once per object per edge — never again.";
    } else if (bl.deepest < 0) {
      body = "<b>" + sdcdn_m(bl.newPairs) + "</b> more object-edge pairs warmed this block, " +
        "but nothing is fully cached yet at " + sdcdn_int(sdcdn_POPS) + " PoPs — the night " +
        "traffic is too thin to reach even the popular objects at every edge.";
    } else {
      var covered = 0, k;
      for (k = 0; k <= bl.deepest; k++) covered += bl.grp[k].share;
      var deeper = i > 0 && blocks[i - 1] && bl.deepest > blocks[i - 1].deepest;
      body = "<b>" + sdcdn_m(bl.newPairs) + "</b> more object-edge pairs warmed. " +
        (deeper
          ? "The cached-everywhere frontier moved a decade deeper, to rank <b>" +
            sdcdn_GROUPS[bl.deepest].label + "</b> — " + sdcdn_p1(covered * 100) +
            " of all requests now come from objects that are warm at every PoP."
          : "The frontier is still rank <b>" + sdcdn_GROUPS[bl.deepest].label + "</b> (" +
            sdcdn_p1(covered * 100) + " of requests), so what warmed was tail: <b>" +
            sdcdn_m(bl.miss) + "</b> origin fetches bought <b>" +
            sdcdn_usd0(bl.miss * sdcdn_VAR_B / 1e9 * sdcdn_CLOUD_GB) +
            "</b> of egress for objects most of which will not be asked for again today.");
    }
    return head + body + " Origin is carrying <b>" + sdcdn_gbps(bl.demandGbps) + "</b> of its " +
      sdcdn_gbps(bl.capGbps) + " — " + sdcdn_p1(sdcdn_pct(bl.demandGbps, bl.capGbps)) +
      " — while users pull <b>" + sdcdn_gbps(bl.userGbps) + "</b>. Day so far: <b>" +
      sdcdn_usd0(bl.cumCost) + "</b>.";
  }

  /** What a full day would cost if the last block's offload held all day. */
  function sdcdn_steady(last, cfg) {
    var missRate = 1 - last.offload / 100;
    var dayBytes = sdcdn_DAY_B;
    var originBytes = dayBytes * missRate;
    return cfg.cdn
      ? dayBytes / 1e9 * sdcdn_CDN_GB + originBytes / 1e9 * sdcdn_CLOUD_GB
      : dayBytes / 1e9 * sdcdn_CLOUD_GB;
  }

  function sdcdn_scenario(cfg) {
    var blocks = sdcdn_day(cfg);
    var last = blocks[blocks.length - 1];
    var steady = sdcdn_steady(last, cfg);
    var steps = [{
      blk: null, cfg: cfg, blocks: blocks, upto: 0, steady: steady,
      flag: "idle",
      caption: "<b>Midnight. " + (cfg.cdn ? sdcdn_int(sdcdn_POPS) + " edge caches, all empty."
        : "No CDN — every byte leaves the origin.") + "</b> " + cfg.opening +
        " A day of " + sdcdn_int(sdcdn_QPS) + " image requests a second on average, at " +
        (sdcdn_VAR_B / 1000) + " KB each — <b>" + (sdcdn_BPS / 1e9).toFixed(2) + " GB/s</b>, <b>" +
        sdcdn_gbps(sdcdn_GBPS) + "</b>, <b>" + sdcdn_tb(sdcdn_DAY_B) +
        "</b> for the day. Press Play."
    }];

    var i;
    for (i = 0; i < blocks.length; i++) {
      var bl = blocks[i];
      steps.push({
        blk: i, cfg: cfg, blocks: blocks, upto: i + 1, steady: steady,
        flag: bl.shed > 0 ? "bad" : bl.offload >= 90 ? "ok" : cfg.cdn ? "warn" : "warn",
        caption: i === blocks.length - 1
          ? cfg.verdict(blocks, steady)
          : cfg.block(bl, blocks, i)
      });
    }
    return { id: cfg.id, label: cfg.label, steps: steps, blocks: blocks, cfg: cfg, steady: steady };
  }

  function sdcdn_dayTotals(blocks) {
    var last = blocks[blocks.length - 1];
    return {
      cost: last.cumCost, delivered: last.cumDelivered, origin: last.cumOrigin,
      shed: last.cumShed, reqs: last.cumReq, offload: last.dayOffload
    };
  }

  // ----------------------------------------------------------------------
  var sdcdn_ORIGINONLY = sdcdn_scenario({
    id: "origin", label: "Origin only",
    cdn: false, header: "no CDN",
    ttlAt: function () { return 0; },
    opening: "The variant lever has already been pulled — the worker resized the " +
      (sdcdn_ORIG_B / 1e6) + " MB original down to " + (sdcdn_VAR_B / 1000) +
      " KB — but the bytes still come off your own NICs.",
    block: function (bl, blocks, i) {
      return "<b>" + sdcdn_clock(bl.b) + " · " + sdcdn_int(bl.qps) + " req/s.</b> Every one is " +
        "an origin miss, because there is nowhere else for it to come from: <b>" +
        sdcdn_gbps(bl.demandGbps) + "</b> demanded against <b>" + sdcdn_gbps(bl.capGbps) +
        "</b> of origin NIC" +
        (bl.shed > 0
          ? " — so <b>" + sdcdn_p1(bl.shedPct) + "</b> of this block's requests get nothing. " +
            "<b>" + sdcdn_m(bl.shed) + " broken images.</b> The bill does not even record them."
          : " — " + sdcdn_p1(sdcdn_pct(bl.demandGbps, bl.capGbps)) +
            (bl.demandGbps >= bl.capGbps * 0.95
              ? " utilised. <b>Exactly at the line</b>: five percent more traffic and images " +
                "start failing, and the next block is +" +
                sdcdn_p1((sdcdn_MULT[bl.b + 1] / sdcdn_MULT[bl.b] - 1) * 100) + "."
              : " utilised, holding.") +
            " The day so far has cost <b>" + sdcdn_usd0(bl.cumCost) + "</b>.");
    },
    verdict: function (blocks, steady) {
      var t = sdcdn_dayTotals(blocks);
      return "<b>" + sdcdn_usd0(t.cost) + " for the day</b> — against the page's " +
        sdcdn_usd0(sdcdn_DAY_USD) + " for " + sdcdn_tb(sdcdn_DAY_B) + " at " +
        sdcdn_usd0(sdcdn_CLOUD_GB * 1000) + " per TB, which is what this would have been if " +
        "the origin could have carried it. It could not: <b>" + sdcdn_m(t.shed) + " requests, " +
        sdcdn_p1(sdcdn_pct(t.shed, t.reqs)) + " of the day, were shed</b> once demand passed " +
        sdcdn_gbps(sdcdn_ORIGIN_GBPS) + ". Annualised at the page's rate that is <b>" +
        sdcdn_usdM(sdcdn_YEAR_USD) + " a year</b> — and note where this number already sits: " +
        "it is <i>after</i> the " + sdcdn_LEVER.toFixed(0) + "× variant lever. Serving the " +
        (sdcdn_ORIG_B / 1e6) + " MB original instead would demand <b>" +
        sdcdn_pb(sdcdn_DAY_B * sdcdn_LEVER) + " a day</b>. <b>The CDN is not an optimisation " +
        "here; it is the architecture.</b>";
    }
  });

  var sdcdn_IMMUTABLE = sdcdn_scenario({
    id: "immutable", label: "Immutable hashes",
    cdn: true,
    header: "public, max-age=" + sdcdn_IMMUTABLE_S + ", immutable",
    ttlAt: function () { return sdcdn_IMMUTABLE_S; },
    opening: "Assets are content-addressed — <code>app.4f3a9c.jpg</code> — and served " +
      "<code>public, max-age=" + sdcdn_IMMUTABLE_S + ", immutable</code>, so a deploy makes a " +
      "new URL and there is never anything to purge.",
    block: sdcdn_warmCaption,
    verdict: function (blocks, steady) {
      var t = sdcdn_dayTotals(blocks);
      var last = blocks[blocks.length - 1];
      var steadyMiss = 1 - last.offload / 100;
      var tenX = (sdcdn_DAY_USD / 10 - sdcdn_DAY_B * steadyMiss / 1e9 * sdcdn_CLOUD_GB) /
        (sdcdn_DAY_B / 1e9);
      return "<b>" + sdcdn_usd0(t.cost) + " for the day at " + sdcdn_p1(t.offload) +
        " offload, and nothing shed.</b> The origin sent <b>" + sdcdn_tb(t.origin) +
        "</b> while users pulled " + sdcdn_tb(t.delivered) + " — <b>" +
        (t.delivered / Math.max(1, t.origin)).toFixed(1) + "×</b> amplification. Against the " +
        "page's uncached " + sdcdn_usd0(sdcdn_DAY_USD) + " that is <b>" +
        (sdcdn_DAY_USD / Math.max(1, t.cost)).toFixed(1) + "× cheaper</b>, and day one is the " +
        "worst day: the last block ran at " + sdcdn_p1(last.offload) + ", which held for a " +
        "full day is <b>" + sdcdn_usd0(steady) + "</b>, <b>" +
        (sdcdn_DAY_USD / Math.max(1, steady)).toFixed(1) + "×</b>. The page says \"roughly an " +
        "order of magnitude\"; at this offload and this CDN price the honest number is the one " +
        "above, and a true 10× would need CDN egress at <b>$" + tenX.toFixed(4) +
        "/GB</b> — which volume tiers do reach. Two levers are still on the table and both " +
        "are bigger than anything above: the " + sdcdn_LEVER.toFixed(0) +
        "× already taken by serving a variant, and " + (sdcdn_MODERN * 100).toFixed(0) +
        "% more from WebP/AVIF, which would take " + (sdcdn_VAR_B / 1000) + " KB to " +
        ((sdcdn_VAR_B * (1 - sdcdn_MODERN)) / 1000).toFixed(0) + " KB and this day to <b>" +
        sdcdn_usd0(t.cost * (1 - sdcdn_MODERN)) + "</b>.";
    }
  });

  var sdcdn_PURGED = sdcdn_scenario({
    id: "purge", label: "The 13:00 deploy",
    cdn: true,
    headerAt: function (b) {
      return b < 4 ? "public, max-age=" + sdcdn_IMMUTABLE_S + ", immutable"
        : "private, max-age=0";
    },
    ttlAt: function (b) { return b < 4 ? sdcdn_IMMUTABLE_S : 0; },
    opening: "Identical to the immutable build — for the first half of the day. At lunchtime " +
      "a deploy ships a header change that was meant for an authenticated JSON route and lands " +
      "on the image path as well.",
    block: function (bl, blocks, i) {
      if (i < 4) {
        return sdcdn_warmCaption(bl, blocks, i) + " <code>" + bl.header + "</code>";
      }
      if (i === 4) {
        return "<b>" + sdcdn_clock(bl.b) + " · the deploy lands. <code>" + bl.header +
          "</code>.</b> <i>private</i> means a shared cache may not store the object at all, so " +
          sdcdn_int(sdcdn_POPS) + " warm edges become " + sdcdn_int(sdcdn_POPS) +
          " pass-throughs in one push. Offload falls from <b>" +
          sdcdn_p1(blocks[3].offload) + "</b> to <b>" + sdcdn_p1(bl.offload) +
          "</b> and the origin goes from " + sdcdn_gbps(blocks[3].demandGbps) + " to <b>" +
          sdcdn_gbps(bl.demandGbps) + "</b> against " + sdcdn_gbps(bl.capGbps) + " of NIC — <b>" +
          sdcdn_p1(bl.shedPct) + " of this block's images fail</b>. No alarm fired on the " +
          "deploy; it was a one-line header change.";
      }
      return "<b>" + sdcdn_clock(bl.b) + " · " + sdcdn_int(bl.qps) + " req/s into a cache that " +
        "is not allowed to cache.</b> Origin demand <b>" + sdcdn_gbps(bl.demandGbps) + "</b>, " +
        (bl.shed > 0
          ? "capacity " + sdcdn_gbps(bl.capGbps) + ", <b>" + sdcdn_m(bl.shed) +
            " requests shed</b> (" + sdcdn_p1(bl.shedPct) + "). "
          : "back inside " + sdcdn_gbps(bl.capGbps) + " as traffic falls off. ") +
        "And you are still paying the CDN for every byte it passes through: the day is now <b>" +
        sdcdn_usd0(bl.cumCost) + "</b>.";
    },
    verdict: function (blocks, steady) {
      var t = sdcdn_dayTotals(blocks);
      var good = sdcdn_dayTotals(sdcdn_IMMUTABLE.blocks);
      return "<b>" + sdcdn_usd0(t.cost) + " for the day — " +
        (t.cost / Math.max(1, good.cost)).toFixed(1) + "× the immutable build — with <b>" +
        sdcdn_m(t.shed) + "</b> broken images, " + sdcdn_p1(sdcdn_pct(t.shed, t.reqs)) +
        " of the day's requests.</b> Half a day of correct behaviour and one header " +
        "undid all of it, because <code>private</code> does not mean \"slower\", it means " +
        "\"do not store\" — the CDN kept billing for delivery while forwarding every byte to " +
        "an origin sized for " + sdcdn_p1(100 - good.offload) + " of the traffic. <b>Note what " +
        "was never needed: a purge.</b> The immutable build's answer to invalidation is that " +
        "there is nothing to invalidate — a new deploy is a new URL. The failure here is the " +
        "opposite mistake, and the two guardrails are the same one: cache-control belongs to " +
        "the asset, not to the route, and <code>stale-while-revalidate</code> so that an " +
        "origin that cannot answer never costs a user their image.";
    }
  });

  var sdcdn_RUNS = [sdcdn_ORIGINONLY, sdcdn_IMMUTABLE, sdcdn_PURGED];

  S["sdcdnandstorage"] = {
    title: "Run a day of image traffic through a cold CDN",
    note: "The page's own block, recomputed: <b>" + sdcdn_int(sdcdn_QPS) +
      "</b> image requests/s × <b>" + (sdcdn_VAR_B / 1000) + " KB</b> = <b>" +
      (sdcdn_BPS / 1e9).toFixed(2) + " GB/s</b> = <b>" + sdcdn_gbps(sdcdn_GBPS) + "</b>; × " +
      sdcdn_int(sdcdn_DAY_S) + " s = <b>" + sdcdn_tb(sdcdn_DAY_B) + "/day</b>; at $" +
      sdcdn_CLOUD_GB.toFixed(2) + "/GB cloud egress = <b>" + sdcdn_usd0(sdcdn_DAY_USD) +
      "/day</b> = <b>" + sdcdn_usdM(sdcdn_YEAR_USD) + "/year</b>. The day is " + sdcdn_NBLK +
      " three-hour blocks whose multipliers average exactly " + sdcdn_MEAN_MULT.toFixed(2) +
      ", so the day totals that figure. <b>Declared</b>, because the page states none of them: " +
      sdcdn_int(sdcdn_POPS) + " PoPs, a catalogue of " + sdcdn_m(sdcdn_CATALOG) +
      " objects with Zipf popularity at exponent " + sdcdn_ZIPF.toFixed(1) +
      " (the skew is stated so that offload can be <i>derived</i>), CDN egress at $" +
      sdcdn_CDN_GB.toFixed(3) + "/GB, and an origin of 4 × 10 GbE = <b>" +
      sdcdn_gbps(sdcdn_ORIGIN_GBPS) + "</b>, so saturation is an outcome rather than a claim. " +
      "An object with arrival rate λ at one PoP misses once per " +
      "<code>max-age</code> window — with <code>max-age=" + sdcdn_int(sdcdn_IMMUTABLE_S) +
      "</code> that is once ever, so the chance a block is the first time is 1−e<sup>−λD</sup>. " +
      "That, summed over the catalogue, is every offload figure below; the page's " +
      (sdcdn_PAGE_OFFLOAD * 100).toFixed(0) + "% and its 20× variant lever are used only to " +
      "check the answers.",
    interval: 1400,
    scenarios: sdcdn_RUNS,

    draw: function (step, d, ctx) {
      var cfg = step.cfg, blocks = step.blocks, i;
      var bl = step.blk === null ? null : blocks[step.blk];
      var off = bl ? bl.offload : 0;
      var util = bl ? sdcdn_pct(bl.demandGbps, bl.capGbps) : 0;

      // ---- head -----------------------------------------------------------
      var head = d.cols([
        d.big(bl ? sdcdn_p1(off) : "—", "offload this block",
          !bl ? "idle" : off >= 90 ? "ok" : off >= 50 ? "warn" : "bad"),
        d.stat({
          label: "origin egress",
          value: bl ? sdcdn_gbps(bl.demandGbps) : "—",
          sub: bl ? sdcdn_p1(util) + " of " + sdcdn_gbps(bl.capGbps) : "not started",
          flag: !bl ? "idle" : util >= 100 ? "bad" : util >= 60 ? "warn" : "ok"
        }),
        d.stat({
          label: "requests shed",
          value: bl ? sdcdn_m(bl.cumShed) : "0",
          sub: bl ? sdcdn_p1(sdcdn_pct(bl.cumShed, bl.cumReq)) + " of the day so far"
            : "nothing served yet",
          flag: !bl ? "idle" : bl.cumShed > 0 ? "bad" : "ok"
        }),
        d.stat({
          label: "spent today",
          value: bl ? sdcdn_usd0(bl.cumCost) : "$0",
          sub: bl ? sdcdn_tb(bl.cumDelivered) + " delivered" : "midnight",
          flag: !bl ? "idle" : bl.cumCost > sdcdn_DAY_USD * 0.5 ? "warn" : "ok"
        })
      ]);

      // ---- the two boxes ----------------------------------------------------
      var edgeRows = [
        { label: "cache-control",
          value: bl ? bl.header : (cfg.headerAt ? cfg.headerAt(0) : cfg.header),
          flag: cfg.cdn ? (bl && bl.ttl <= 0 ? "bad" : "ok") : "bad" },
        { label: "edges", value: cfg.cdn ? sdcdn_int(sdcdn_POPS) + " PoPs" : "none",
          flag: cfg.cdn ? "ok" : "bad" }
      ];
      if (bl) {
        edgeRows.push({ label: "served from cache", value: sdcdn_m(bl.hits),
          flag: bl.hits > 0 ? "ok" : "bad" });
        edgeRows.push({ label: "forwarded to origin", value: sdcdn_m(bl.miss),
          flag: bl.miss > bl.hits ? "bad" : "ok" });
      }

      var originRows = [
        { label: "capacity", value: sdcdn_gbps(sdcdn_ORIGIN_GBPS) },
        { label: "object served", value: (sdcdn_VAR_B / 1000) + " KB variant" }
      ];
      if (bl) {
        originRows.push({ label: "demanded", value: sdcdn_gbps(bl.demandGbps),
          flag: bl.demandGbps > bl.capGbps ? "bad" : "ok" });
        originRows.push({ label: "delivered", value: sdcdn_gbps(bl.servedGbps),
          flag: bl.shed > 0 ? "bad" : "ok" });
        originRows.push({ label: "egress billed today", value: sdcdn_tb(bl.cumOrigin) });
      }

      var boxes = d.cols([
        d.node({
          title: cfg.cdn ? "edge · " + sdcdn_int(sdcdn_POPS) + " PoPs" : "no edge tier",
          status: !bl ? "EMPTY" : !cfg.cdn ? "ABSENT" : bl.ttl <= 0 ? "PASS-THROUGH" : "CACHING",
          statusFlag: !cfg.cdn ? "bad" : !bl ? "idle" : bl.ttl <= 0 ? "bad" : "ok",
          badge: bl ? sdcdn_clock(bl.b) : "00:00",
          meta: bl ? sdcdn_int(bl.qps) + " req/s arriving" : "midnight, nothing yet",
          flag: !cfg.cdn ? "bad" : !bl ? "idle" : bl.ttl <= 0 ? "bad" : "ok",
          rows: edgeRows,
          gauges: cfg.cdn ? [{ label: "offload", pct: off, value: sdcdn_p1(off),
            flag: off >= 90 ? "ok" : off >= 50 ? "warn" : "bad" }] : undefined
        }),
        d.node({
          title: "origin · object store",
          status: !bl ? "IDLE" : bl.shed > 0 ? "SATURATED" : "SERVING",
          statusFlag: !bl ? "idle" : bl.shed > 0 ? "bad" : "ok",
          badge: "4 × 10 GbE",
          meta: "$" + sdcdn_CLOUD_GB.toFixed(2) + "/GB egress",
          flag: !bl ? "idle" : bl.shed > 0 ? "bad" : "ok",
          rows: originRows,
          gauges: [{ label: "NIC utilisation", pct: util,
            value: bl ? sdcdn_p1(util) : "0.0%",
            flag: util >= 100 ? "bad" : util >= 60 ? "warn" : "ok" }]
        })
      ]);

      // ---- the day's lanes ---------------------------------------------------
      var loadC = [], offC = [], origC = [];
      for (i = 0; i < sdcdn_NBLK; i++) {
        var q = blocks[i];
        var reached = i < step.upto;
        loadC.push({
          label: sdcdn_m(q.qps),
          flag: !reached ? "idle" : q.qps > sdcdn_QPS ? "warn" : "ok",
          title: sdcdn_clock(i) + " · " + sdcdn_int(q.qps) + " req/s (×" +
            sdcdn_MULT[i].toFixed(2) + ")"
        });
        offC.push({
          label: reached ? q.offload.toFixed(0) : "·",
          flag: !reached ? "idle" : q.offload >= 90 ? "ok" : q.offload >= 50 ? "warn" : "bad",
          title: reached ? sdcdn_clock(i) + " · offload " + sdcdn_p1(q.offload) + " · " +
            sdcdn_m(q.miss) + " origin fetches" : sdcdn_clock(i) + " · not reached"
        });
        origC.push({
          label: reached ? q.demandGbps.toFixed(0) : "·",
          flag: !reached ? "idle" : q.demandGbps > q.capGbps ? "bad"
            : q.demandGbps > q.capGbps * 0.6 ? "warn" : "ok",
          title: reached ? sdcdn_clock(i) + " · " + sdcdn_gbps(q.demandGbps) + " demanded of " +
            sdcdn_gbps(q.capGbps) + (q.shed > 0 ? " · " + sdcdn_m(q.shed) + " shed" : "")
            : sdcdn_clock(i) + " · not reached"
        });
      }
      var lanes = d.stack([
        d.lane({ label: "req/s", cells: loadC }),
        d.lane({ label: "offload %", cells: offC }),
        d.lane({ label: "origin Gbps", cells: origC })
      ]);

      // ---- catalogue warmth ---------------------------------------------------
      var warmCells = [];
      var grp = bl ? bl.grp : blocks[0].grp;
      for (i = 0; i < sdcdn_GROUPS.length; i++) {
        var w = bl ? grp[i].warm * 100 : 0;
        warmCells.push({
          label: w >= 99.5 ? "100" : w.toFixed(0),
          flag: !bl ? "idle" : w >= 90 ? "ok" : w >= 30 ? "warn" : "bad",
          title: "ranks " + sdcdn_GROUPS[i].label + " · " +
            sdcdn_p1(grp[i].share * 100) + " of all requests · " +
            sdcdn_p1(w) + " of these objects are cached at a given PoP"
        });
      }

      var extra = [];
      if (step.upto === sdcdn_NBLK) {
        var rows = [];
        for (i = 0; i < sdcdn_RUNS.length; i++) {
          var t = sdcdn_dayTotals(sdcdn_RUNS[i].blocks);
          rows.push([
            sdcdn_RUNS[i].label,
            sdcdn_p1(t.offload),
            sdcdn_tb(t.origin),
            sdcdn_usd0(t.cost),
            sdcdn_m(t.shed)
          ]);
        }
        rows.push([
          "page's figure",
          (sdcdn_PAGE_OFFLOAD * 100).toFixed(0) + "%",
          sdcdn_tb(sdcdn_DAY_B * (1 - sdcdn_PAGE_OFFLOAD)),
          sdcdn_usd0(sdcdn_DAY_USD) + " uncached",
          "—"
        ]);
        extra.push(d.table(["build", "offload", "origin out", "day", "shed"], rows));
      }

      return d.stack([
        head,
        boxes,
        lanes,
        d.cells(warmCells, { label: "catalogue warmth by popularity rank, % of objects cached" }),
        extra.length ? d.stack(extra) : "",
        d.note(
          step.upto === 0
            ? "The warmth row is the mechanism. Rank 1–10 is a handful of objects carrying " +
              sdcdn_p1(blocks[0].grp[0].share * 100) + " of all requests — they warm in " +
              "seconds. The <i>tail</i> is " + sdcdn_m(sdcdn_CATALOG - 10000000) +
              " objects carrying " + sdcdn_p1(blocks[0].grp[7].share * 100) +
              ", and most of them will never be requested twice at the same PoP in a day."
            : "Offload is not a setting — it is what the popularity curve leaves behind once " +
              "the head of the catalogue is warm at every edge. <b>The misses that remain are " +
              "the tail</b>, which is why pull costs one fetch per object per PoP and push " +
              "would cost " + sdcdn_m(sdcdn_CATALOG) + " × " + sdcdn_int(sdcdn_POPS) +
              " uploads to avoid it.",
          bl && bl.shed > 0 ? "bad" : step.upto === 0 ? undefined : "ok"
        )
      ]);
    }
  };

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

  // ====================================================================
  // ======================================================================
  // SIM · sddesigncollaborat  (design-collaborative-editor.md)
  //
  // The page supplies both the time axis and the input. Section 4 runs one
  // concrete interleaving — document "HELLO", Alice inserting X at 0, Bob
  // inserting Y at 5, both from the same base version — twice, once through
  // operational transformation and once through a CRDT. So this sim replays
  // exactly that interleaving three times: through last-write-wins (the
  // page's section 3, "AN EDIT IS LOST"), through OT (section 4), and
  // through a CRDT with Bob offline (section 8). Every document string,
  // every position and every count on screen is produced by applying the
  // operations to a real array — nothing is typed into a caption.
  //
  // CONFIG — the page's own figures, used verbatim:
  //   document              "HELLO"          section 4
  //   base version           3               the sequence diagram:
  //                                          "both start from version 3"
  //   Alice's edit           insert("X", 0)  section 4
  //   Bob's edit             insert("Y", 5)  section 4
  //   base character ids     H 1.0  E 2.0  L 3.0  L 4.0  O 5.0    section 4
  //   round trip             50 ms           section 5: "Waiting even 50 ms
  //                                          for a server round trip makes
  //                                          typing feel broken"
  //   typist                 6 keystrokes/s  section 2
  //   whole document         50 KB           section 2 (doc size) and
  //                                          section 3 ("50 KB per keystroke")
  //
  // DECLARED HERE, because the page gives no figure:
  //   one operation on the wire      32 bytes
  //   a CRDT operation carries an explicit id on top     +16 bytes
  //   id allocation rule:  before the first id x -> x / 2
  //                        after  the last  id x -> x + 1
  //                        between a and b      -> (a + b) / 2
  //   That rule is what produces the page's own X(0.5) and Y(6.0); they are
  //   computed from the neighbours, not asserted.
  //
  // DERIVED, not typed:
  //   gap between keystrokes   1000 / 6            = 166.7 ms
  //   a server-gated render    50 / 166.7          = 30.0% of that gap,
  //                            which is the page's "typing feels broken"
  //                            expressed as a number
  //   wire ratio               50 * 1024 / 32      = 1,600x
  // ======================================================================
  var sddesigncollaborat_BASE = "HELLO";
  var sddesigncollaborat_V0 = 3;
  var sddesigncollaborat_RTT = 50;
  var sddesigncollaborat_KPS = 6;
  var sddesigncollaborat_DOC_KB = 50;
  var sddesigncollaborat_OP_B = 32;
  var sddesigncollaborat_ID_B = 16;
  var sddesigncollaborat_CRDT_B = sddesigncollaborat_OP_B + sddesigncollaborat_ID_B;
  var sddesigncollaborat_DOC_B = sddesigncollaborat_DOC_KB * 1024;
  var sddesigncollaborat_GAP_MS = 1000 / sddesigncollaborat_KPS;
  var sddesigncollaborat_GATE_PCT =
    (100 * sddesigncollaborat_RTT) / sddesigncollaborat_GAP_MS;
  var sddesigncollaborat_WIRE_X = sddesigncollaborat_DOC_B / sddesigncollaborat_OP_B;

  // ---- the document as data -------------------------------------------
  function sddesigncollaborat_mk(ch, id, who, key) {
    return { ch: ch, id: id, who: who, op: key, dead: false, lost: false };
  }
  function sddesigncollaborat_seed() {
    var cs = [], i;
    for (i = 0; i < sddesigncollaborat_BASE.length; i++) {
      cs.push(sddesigncollaborat_mk(
        sddesigncollaborat_BASE.charAt(i), i + 1, "base", "b" + i));
    }
    return cs;
  }
  function sddesigncollaborat_copy(cs) {
    var o = [], i;
    for (i = 0; i < cs.length; i++) {
      o.push({
        ch: cs[i].ch, id: cs[i].id, who: cs[i].who, op: cs[i].op,
        dead: cs[i].dead, lost: cs[i].lost
      });
    }
    return o;
  }
  function sddesigncollaborat_text(cs) {
    var o = "", i;
    for (i = 0; i < cs.length; i++) if (!cs[i].dead) o += cs[i].ch;
    return o;
  }

  /** Cells for one replica. mode "pos" labels by index, "id" by CRDT id. */
  function sddesigncollaborat_cells(cs, mode) {
    var out = [], i, c, flag, where, what, vis = 0;
    for (i = 0; i < cs.length; i++) {
      c = cs[i];
      flag = c.lost ? "bad"
        : c.dead ? "idle"
        : c.who === "alice" ? "ok"
        : c.who === "bob" ? "warn"
        : undefined;
      if (mode === "id") where = "id " + c.id.toFixed(1);
      else if (c.dead) where = "no longer in the document";
      else { where = "position " + vis; vis++; }
      what = c.lost ? "destroyed — overwritten by the other replica's document"
        : c.dead ? "tombstone — kept so a concurrent insert beside it keeps its place"
        : c.who === "base" ? "already there at v" + sddesigncollaborat_V0
        : c.who === "alice" ? "Alice's character"
        : "Bob's character";
      out.push({ label: c.ch, flag: flag, title: where + " · " + what });
    }
    return out;
  }

  // ---- operational transformation, the real function -------------------
  // insert/insert: an insert at an earlier position shifts a later one right
  // by one. Ties break on site id, which is how the server's chosen order
  // (Alice first) reaches both clients.
  function sddesigncollaborat_xform(op, against) {
    var shift = against.pos < op.pos ||
      (against.pos === op.pos && against.site < op.site);
    return {
      ch: op.ch, site: op.site,
      pos: shift ? op.pos + 1 : op.pos,
      shifted: shift
    };
  }
  /** A cursor is transformed by the same rule, or it visibly jumps. */
  function sddesigncollaborat_xcur(cur, op) {
    return op.pos <= cur ? cur + 1 : cur;
  }

  // ---- CRDT id allocation ----------------------------------------------
  function sddesigncollaborat_before(x) { return x / 2; }
  function sddesigncollaborat_after(x) { return x + 1; }
  function sddesigncollaborat_between(a, b) { return (a + b) / 2; }
  function sddesigncollaborat_place(cs, e) {
    var i = 0;
    while (i < cs.length && cs[i].id < e.id) i++;
    cs.splice(i, 0, e);
    return cs;
  }
  function sddesigncollaborat_idAt(cs, key) {
    var i;
    for (i = 0; i < cs.length; i++) if (cs[i].op === key) return cs[i].id;
    return 0;
  }
  function sddesigncollaborat_kill(cs, key) {
    var i;
    for (i = 0; i < cs.length; i++) if (cs[i].op === key) { cs[i].dead = true; return; }
  }

  // ---- has this user's intent survived? --------------------------------
  function sddesigncollaborat_hon(op, cs) {
    var i, key = op.kind === "ins" ? op.k : op.target;
    for (i = 0; i < cs.length; i++) {
      if (cs[i].op === key) {
        return op.kind === "ins" ? (!cs[i].dead && !cs[i].lost) : cs[i].dead;
      }
    }
    return false;
  }
  function sddesigncollaborat_kept(ops, a, b) {
    var n = 0, i;
    for (i = 0; i < ops.length; i++) {
      if (sddesigncollaborat_hon(ops[i], a) && sddesigncollaborat_hon(ops[i], b)) n++;
    }
    return n;
  }
  function sddesigncollaborat_lost(ops) {
    var n = 0, i;
    for (i = 0; i < ops.length; i++) if (ops[i].destroyed) n++;
    return n;
  }

  function sddesigncollaborat_kb(bytes) {
    if (bytes >= 1024) return (bytes / 1024).toFixed(bytes >= 10240 ? 0 : 1) + " KB";
    return bytes + " B";
  }
  function sddesigncollaborat_charAt(s, i) {
    return i >= 0 && i < s.length ? '"' + s.charAt(i) + '"' : "end of document";
  }

  // ======================================================================
  // One run. kind = "lww" | "ot" | "crdt". The frames are snapshots of live
  // state, so every number in them is counted rather than declared.
  // ======================================================================
  function sddesigncollaborat_run(kind) {
    var a = sddesigncollaborat_seed();
    var b = sddesigncollaborat_seed();
    var srv = kind === "crdt" ? null : sddesigncollaborat_seed();
    var ops = [], log = [], steps = [];
    var mode = kind === "crdt" ? "id" : "pos";
    var ver = sddesigncollaborat_V0, bytes = 0, xforms = 0;
    var aStatus = "IN SYNC", aFlag = "ok", bStatus = "IN SYNC", bFlag = "ok";
    var midTitle = kind === "crdt" ? "no sequencer" : "session server · one per document";
    var midStatus = "IDLE", midFlag = "idle";
    var midMeta = kind === "crdt"
      ? "merge is a union and a sort by id — order of arrival is irrelevant"
      : "all editors of one document routed here, so ordering is a single-server problem";

    function push(stage, caption, flag, rows) {
      steps.push({
        stage: stage, caption: caption, flag: flag, mode: mode, kind: kind,
        aCells: sddesigncollaborat_cells(a, mode), aDoc: sddesigncollaborat_text(a),
        bCells: sddesigncollaborat_cells(b, mode), bDoc: sddesigncollaborat_text(b),
        sCells: srv ? sddesigncollaborat_cells(srv, mode) : null,
        sDoc: srv ? sddesigncollaborat_text(srv) : "",
        aStatus: aStatus, aFlag: aFlag, bStatus: bStatus, bFlag: bFlag,
        midTitle: midTitle, midStatus: midStatus, midFlag: midFlag, midMeta: midMeta,
        ver: ver, bytes: bytes, xforms: xforms, issued: ops.length,
        kept: sddesigncollaborat_kept(ops, a, b),
        lost: sddesigncollaborat_lost(ops),
        converged: sddesigncollaborat_text(a) === sddesigncollaborat_text(b),
        rows: rows || [], log: log.slice(0)
      });
    }

    var opA = { ch: "X", pos: 0, site: 0 };     // page section 4
    var opB = { ch: "Y", pos: 5, site: 1 };     // page section 4

    // ------------------------------------------------------------------
    if (kind === "lww") {
      push("both editors in sync",
        "One document, <b>version " + sddesigncollaborat_V0 + "</b>, two people in the " +
        "same paragraph. Every other design in this handbook resolves a write conflict by " +
        "picking a winner. Watch what that does here. <i>Press Play.</i>", "idle",
        [
          { label: "document", value: '"' + sddesigncollaborat_BASE + '"' },
          { label: "both replicas at", value: "v" + sddesigncollaborat_V0, flag: "ok" },
          { label: "conflict policy", value: "highest timestamp wins", flag: "bad" }
        ]);

      a.splice(opA.pos, 0, sddesigncollaborat_mk("X", 0.5, "alice", "oX"));
      ops.push({ kind: "ins", k: "oX", who: "alice" });
      aStatus = "AHEAD OF SERVER"; aFlag = "warn";
      log.push(["1", "Alice", 'insert("X", ' + opA.pos + ")", "painted locally in 0 ms"]);
      push("Alice types",
        "Alice's keystroke is painted on her own replica <b>immediately</b> — 0 ms, no " +
        "round trip. That part is right, and it is non-negotiable: gating the render on " +
        "the server costs <b>" + sddesigncollaborat_RTT + " ms</b>, which is <b>" +
        sddesigncollaborat_GATE_PCT.toFixed(1) + "%</b> of the " +
        sddesigncollaborat_GAP_MS.toFixed(0) + " ms gap between keystrokes at " +
        sddesigncollaborat_KPS + " a second.", "ok",
        [
          { label: "render latency", value: "0 ms", flag: "ok" },
          { label: "if the server gated it",
            value: sddesigncollaborat_RTT + " ms · " +
              sddesigncollaborat_GATE_PCT.toFixed(1) + "% of a keystroke gap", flag: "bad" },
          { label: "Alice's document", value: '"' + sddesigncollaborat_text(a) + '"' }
        ]);

      b.splice(opB.pos, 0, sddesigncollaborat_mk("Y", 6, "bob", "oY"));
      ops.push({ kind: "ins", k: "oY", who: "bob" });
      bStatus = "AHEAD OF SERVER"; bFlag = "warn";
      log.push(["2", "Bob", 'insert("Y", ' + opB.pos + ")", "painted locally in 0 ms"]);
      push("Bob types, concurrently",
        "Bob typed from the <b>same base version</b>, so neither keystroke knows about the " +
        "other. The two replicas now differ — which is normal and temporary. What matters " +
        "is what the system does next.", "warn",
        [
          { label: "Alice", value: '"' + sddesigncollaborat_text(a) + '"', flag: "ok" },
          { label: "Bob", value: '"' + sddesigncollaborat_text(b) + '"', flag: "warn" },
          { label: "both based on", value: "v" + sddesigncollaborat_V0 }
        ]);

      bytes += sddesigncollaborat_DOC_B;
      midStatus = "RECEIVING"; midFlag = "warn";
      log.push(["3", "Alice", "PUT whole document",
        sddesigncollaborat_kb(sddesigncollaborat_DOC_B) + " for one character"]);
      push("Alice sends the whole document",
        "No operations here — the client ships the document. That is <b>" +
        sddesigncollaborat_kb(sddesigncollaborat_DOC_B) + " on the wire for one " +
        "keystroke</b>, <b>" + sddesigncollaborat_WIRE_X.toLocaleString("en-US") +
        "×</b> the " + sddesigncollaborat_OP_B + " bytes an operation would cost. The " +
        "bandwidth is the <i>cheap</i> part of what is about to go wrong.", "warn",
        [
          { label: "payload", value: sddesigncollaborat_kb(sddesigncollaborat_DOC_B),
            flag: "bad" },
          { label: "an operation would be", value: sddesigncollaborat_OP_B + " B",
            flag: "ok" },
          { label: "ratio", value: sddesigncollaborat_WIRE_X.toLocaleString("en-US") + "×",
            flag: "bad" }
        ]);

      srv = sddesigncollaborat_copy(a);
      ver = sddesigncollaborat_V0 + 1;
      midStatus = "STORED v" + ver; midFlag = "warn";
      log.push(["4", "server", "store Alice's document", "v" + ver]);
      push("server stores Alice's document",
        "The server holds <b>\"" + sddesigncollaborat_text(srv) + "\"</b> at v" + ver +
        ". So far nothing is lost. The server has no idea Bob is mid-keystroke, because " +
        "a whole-document write carries no information about <i>what changed</i>.", "warn",
        [
          { label: "server document", value: '"' + sddesigncollaborat_text(srv) + '"' },
          { label: "version", value: "v" + ver },
          { label: "edits recorded", value: "1 of " + ops.length, flag: "warn" }
        ]);

      bytes += sddesigncollaborat_DOC_B;
      log.push(["5", "Bob", "PUT whole document", "later timestamp"]);
      push("Bob's write arrives second",
        "Bob's request left his machine at the same moment but landed <b>" +
        sddesigncollaborat_RTT + " ms</b> later, so its timestamp is the higher one. " +
        "Under last-write-wins that is the entire decision procedure — <i>and the clock " +
        "that decided it is a clock on someone's laptop.</i>", "bad",
        [
          { label: "cumulative wire", value: sddesigncollaborat_kb(bytes), flag: "bad" },
          { label: "tie broken by", value: "wall-clock timestamp", flag: "bad" },
          { label: "Bob's document", value: '"' + sddesigncollaborat_text(b) + '"' }
        ]);

      srv = sddesigncollaborat_copy(b);
      ver = sddesigncollaborat_V0 + 2;
      ops[0].destroyed = true;
      midStatus = "OVERWRITTEN v" + ver; midFlag = "bad";
      log.push(["6", "server", "overwrite with Bob's document",
        "Alice's X is not merged — it is deleted"]);
      push("the server overwrites",
        "The server replaces its document with Bob's. <b>Alice's X is gone.</b> Not " +
        "queued, not conflicted, not flagged — deleted, with nothing anywhere recording " +
        "that it ever existed. This is the page's line in one frame: <i>one overwrites " +
        "the other, an edit is lost.</i>", "bad",
        [
          { label: "server document", value: '"' + sddesigncollaborat_text(srv) + '"',
            flag: "bad" },
          { label: "edits issued", value: String(ops.length) },
          { label: "edits destroyed", value: String(sddesigncollaborat_lost(ops)),
            flag: "bad" }
        ]);

      a = sddesigncollaborat_copy(srv);
      var ghost = sddesigncollaborat_mk("X", 0.5, "alice", "oX");
      ghost.dead = true; ghost.lost = true;
      a.splice(0, 0, ghost);
      b = sddesigncollaborat_copy(srv);
      aStatus = "IN SYNC"; aFlag = "bad"; bStatus = "IN SYNC"; bFlag = "ok";
      log.push(["7", "server", "broadcast v" + ver, "Alice watches her own character vanish"]);
      push("both screens agree",
        "<b>Converged — and wrong.</b> Both replicas read \"" +
        sddesigncollaborat_text(a) + "\", " +
        sddesigncollaborat_kb(bytes) + " crossed the wire, and <b>" +
        sddesigncollaborat_lost(ops) + " of " + ops.length + "</b> edits no longer exists. " +
        "This is exactly why the page separates the two requirements: <i>convergence</i> " +
        "says everyone ends with the same bytes, <i>intent preservation</i> says those " +
        "bytes mean what people typed. <b>A system can converge and still be wrong.</b>",
        "bad",
        [
          { label: "convergence", value: "satisfied", flag: "ok" },
          { label: "intent preservation", value: "violated", flag: "bad" },
          { label: "edits honoured", value: sddesigncollaborat_kept(ops, a, b) + " / " +
            ops.length, flag: "bad" },
          { label: "total wire", value: sddesigncollaborat_kb(bytes), flag: "bad" }
        ]);
    }

    // ------------------------------------------------------------------
    if (kind === "ot") {
      push("both editors in sync",
        "The same two keystrokes, now sent as <b>operations</b> instead of documents, " +
        "through the page's section 4. The document stays a plain string; what travels " +
        "is <code>insert(char, position)</code> plus the version it was based on. " +
        "<i>Press Play.</i>", "idle",
        [
          { label: "document", value: '"' + sddesigncollaborat_BASE + '"' },
          { label: "base version", value: "v" + sddesigncollaborat_V0 },
          { label: "operation size", value: sddesigncollaborat_OP_B + " B", flag: "ok" }
        ]);

      a.splice(opA.pos, 0, sddesigncollaborat_mk("X", 0.5, "alice", "oX"));
      ops.push({ kind: "ins", k: "oX", who: "alice" });
      aStatus = "1 PENDING OP"; aFlag = "warn";
      log.push(["1", "Alice", 'insert("X", ' + opA.pos + ") base v" + sddesigncollaborat_V0,
        "applied locally, 0 ms"]);
      push("Alice applies locally first",
        "Apply, paint, <i>then</i> send. The server confirms and reorders; it never gates " +
        "the render. Alice now holds one operation that the server has not seen — the " +
        "queue that the transform will later have to reckon with.", "ok",
        [
          { label: "Alice's document", value: '"' + sddesigncollaborat_text(a) + '"',
            flag: "ok" },
          { label: "render latency", value: "0 ms", flag: "ok" },
          { label: "pending at Alice", value: "1 op", flag: "warn" }
        ]);

      b.splice(opB.pos, 0, sddesigncollaborat_mk("Y", 6, "bob", "oY"));
      ops.push({ kind: "ins", k: "oY", who: "bob" });
      bStatus = "1 PENDING OP"; bFlag = "warn";
      log.push(["2", "Bob", 'insert("Y", ' + opB.pos + ") base v" + sddesigncollaborat_V0,
        "applied locally, 0 ms"]);
      push("Bob applies locally, from the same base",
        "Two operations, <b>both claiming base v" + sddesigncollaborat_V0 + "</b>. That " +
        "shared parent is the definition of concurrent. And it is the reason position 5 " +
        "is about to be the wrong number: <i>a text index is not a stable reference.</i>",
        "warn",
        [
          { label: "Alice", value: '"' + sddesigncollaborat_text(a) + '"', flag: "ok" },
          { label: "Bob", value: '"' + sddesigncollaborat_text(b) + '"', flag: "warn" },
          { label: "shared parent", value: "v" + sddesigncollaborat_V0, flag: "warn" }
        ]);

      bytes += 2 * sddesigncollaborat_OP_B;
      midStatus = "2 OPS QUEUED"; midFlag = "warn";
      log.push(["3", "wire", "both ops in flight",
        2 * sddesigncollaborat_OP_B + " B total"]);
      push("both operations reach the server",
        "<b>" + sddesigncollaborat_kb(2 * sddesigncollaborat_OP_B) + "</b> for both edits, " +
        "against " + sddesigncollaborat_kb(2 * sddesigncollaborat_DOC_B) + " if these were " +
        "whole documents. The server's job is not to merge them — it is to <b>choose an " +
        "order</b>, and then make that order true everywhere.", "warn",
        [
          { label: "ops on the wire", value: "2 × " + sddesigncollaborat_OP_B + " B = " +
            sddesigncollaborat_kb(2 * sddesigncollaborat_OP_B), flag: "ok" },
          { label: "same as documents", value:
            sddesigncollaborat_kb(2 * sddesigncollaborat_DOC_B), flag: "bad" },
          { label: "server document", value: '"' + sddesigncollaborat_text(srv) + '"' }
        ]);

      srv.splice(opA.pos, 0, sddesigncollaborat_mk("X", 0.5, "alice", "oX"));
      ver = sddesigncollaborat_V0 + 1;
      midStatus = "ORDERED · v" + ver; midFlag = "ok";
      log.push(["4", "server", "canonical order: Alice first", "v" + ver + ' "' +
        sddesigncollaborat_text(srv) + '"']);
      push("the server assigns the canonical order",
        "Alice first, so her operation applies unchanged and the document becomes v" + ver +
        ". <b>This single decision is what sharding by document buys you</b> — every " +
        "editor of this document is routed to this one session, so ordering is a " +
        "single-server problem rather than a consensus problem.", "ok",
        [
          { label: "order chosen", value: "Alice, then Bob", flag: "ok" },
          { label: "server document", value: '"' + sddesigncollaborat_text(srv) + '"' },
          { label: "version", value: "v" + ver, flag: "ok" }
        ]);

      var aAtB = sddesigncollaborat_xform(opA, opB);
      xforms++;
      b.splice(aAtB.pos, 0, sddesigncollaborat_mk("X", 0.5, "alice", "oX"));
      var curRaw = opB.pos + 1;
      var curNew = sddesigncollaborat_xcur(curRaw, aAtB);
      var bTxt = sddesigncollaborat_text(b);
      bStatus = "MERGED ALICE"; bFlag = "ok";
      log.push(["5", "Bob", "transform Alice's op against his pending op",
        "position " + opA.pos + " → " + aAtB.pos + " (unchanged)"]);
      push("Bob transforms the incoming operation",
        "Alice inserted <i>before</i> Bob's pending insert, so her position needs no " +
        "adjustment: <b>" + opA.pos + " stays " + aAtB.pos + "</b>. The transform ran " +
        "and returned the identity — which is still the transform doing its job. " +
        "<b>Bob's cursor is transformed by the same rule</b>: untransformed it would sit " +
        "at index " + curRaw + " (" + sddesigncollaborat_charAt(bTxt, curRaw) +
        "), one character back from where he left it. That visible jump is what " +
        "transforming the cursor prevents.", "ok",
        [
          { label: "Alice's op at Bob", value: "pos " + opA.pos + " → " + aAtB.pos,
            flag: "ok" },
          { label: "Bob's document", value: '"' + bTxt + '"', flag: "ok" },
          { label: "cursor if not transformed", value: "index " + curRaw + " · " +
            sddesigncollaborat_charAt(bTxt, curRaw), flag: "bad" },
          { label: "cursor transformed", value: "index " + curNew + " · " +
            sddesigncollaborat_charAt(bTxt, curNew), flag: "ok" },
          { label: "jump avoided", value: (curNew - curRaw) + " character", flag: "ok" }
        ]);

      var bAtS = sddesigncollaborat_xform(opB, opA);
      xforms++;
      srv.splice(bAtS.pos, 0, sddesigncollaborat_mk("Y", 6, "bob", "oY"));
      ver = sddesigncollaborat_V0 + 2;
      midStatus = "TRANSFORMED · v" + ver; midFlag = "ok";
      log.push(["6", "server", "transform Bob's op against Alice's",
        "insert(\"Y\", " + opB.pos + ") → insert(\"Y\", " + bAtS.pos + ")"]);
      push("the server transforms Bob's operation",
        "Here is the whole idea in one line. Bob meant <i>the end of the document</i>, " +
        "but Alice's insert shifted everything right by one, so position " + opB.pos +
        " now points <b>inside</b> \"" + sddesigncollaborat_BASE + "\". Transformed " +
        "against Alice's operation it becomes <b>insert(\"Y\", " + bAtS.pos + ")</b> — " +
        "and applying it gives v" + ver + " = \"" + sddesigncollaborat_text(srv) + "\".",
        "ok",
        [
          { label: "Bob's op as sent", value: 'insert("Y", ' + opB.pos + ")", flag: "warn" },
          { label: "transformed against", value: 'insert("X", ' + opA.pos + ")" },
          { label: "Bob's op as applied", value: 'insert("Y", ' + bAtS.pos + ")",
            flag: "ok" },
          { label: "server document", value: '"' + sddesigncollaborat_text(srv) + '"',
            flag: "ok" }
        ]);

      a.splice(bAtS.pos, 0, sddesigncollaborat_mk("Y", 6, "bob", "oY"));
      aStatus = "MERGED BOB"; aFlag = "ok";
      log.push(["7", "Alice", "apply transformed op at " + bAtS.pos,
        '"' + sddesigncollaborat_text(a) + '"']);
      push("Alice applies the transformed operation",
        "Alice receives Bob's operation already transformed and applies it at " +
        bAtS.pos + ". Her pending queue is empty, and her document matches the " +
        "server's. <i>Note what never happened: her keystroke was never re-rendered, " +
        "re-ordered or rolled back on screen.</i>", "ok",
        [
          { label: "Alice's document", value: '"' + sddesigncollaborat_text(a) + '"',
            flag: "ok" },
          { label: "Bob's document", value: '"' + sddesigncollaborat_text(b) + '"',
            flag: "ok" },
          { label: "pending ops", value: "0", flag: "ok" }
        ]);

      push("converged, with both intents intact",
        "<b>\"" + sddesigncollaborat_text(a) + "\" everywhere — " +
        sddesigncollaborat_kept(ops, a, b) + " of " + ops.length + " edits kept, " +
        sddesigncollaborat_lost(ops) + " lost — for " + sddesigncollaborat_kb(bytes) +
        " and " + xforms + " transform calls.</b> Convergence <i>and</i> intent " +
        "preservation, which last-write-wins could not do at " +
        sddesigncollaborat_WIRE_X.toLocaleString("en-US") + "× the bandwidth. The honest " +
        "cost is on this frame too: those " + xforms + " calls are two of " +
        "<i>O(types²)</i> transform functions you must write and prove, and published OT " +
        "algorithms have shipped with convergence bugs. It also cannot work without that " +
        "server in the middle.", "ok",
        [
          { label: "final document", value: '"' + sddesigncollaborat_text(a) + '"',
            flag: "ok" },
          { label: "edits honoured", value: sddesigncollaborat_kept(ops, a, b) + " / " +
            ops.length, flag: "ok" },
          { label: "transforms computed", value: String(xforms), flag: "warn" },
          { label: "total wire", value: sddesigncollaborat_kb(bytes), flag: "ok" },
          { label: "central sequencer", value: "required", flag: "warn" }
        ]);
    }

    // ------------------------------------------------------------------
    if (kind === "crdt") {
      midStatus = "NOT NEEDED"; midFlag = "ok";
      push("both replicas hold the same ids",
        "Same document, but every character now carries a <b>unique, immutable, " +
        "densely-orderable id</b> — the page's H(1.0) through O(5.0). Nothing refers to a " +
        "position any more, so nothing can be invalidated by someone else's insert. " +
        "<i>Press Play.</i>", "idle",
        [
          { label: "document", value: '"' + sddesigncollaborat_BASE + '"' },
          { label: "ids", value: "1.0 … " +
            sddesigncollaborat_BASE.length.toFixed(1) },
          { label: "sequencer", value: "none", flag: "ok" },
          { label: "op on the wire", value: sddesigncollaborat_OP_B + " B + " +
            sddesigncollaborat_ID_B + " B id = " + sddesigncollaborat_CRDT_B + " B",
            flag: "warn" }
        ]);

      bStatus = "OFFLINE"; bFlag = "warn";
      log.push(["1", "Bob", "loses connectivity", "keeps editing his local replica"]);
      push("Bob goes offline",
        "A tunnel, a flight, a dead café router. Bob keeps typing against his local " +
        "replica and his operations queue up. <b>This is the case CRDTs win outright</b>, " +
        "so it is the case worth running.", "warn",
        [
          { label: "Alice", value: "online", flag: "ok" },
          { label: "Bob", value: "offline — queueing locally", flag: "warn" },
          { label: "ops queued at Bob", value: "0" }
        ]);

      var idX = sddesigncollaborat_before(a[0].id);
      sddesigncollaborat_place(a, sddesigncollaborat_mk("X", idX, "alice", "oX"));
      ops.push({ kind: "ins", k: "oX", who: "alice" });
      aStatus = "1 OP TO BROADCAST"; aFlag = "ok";
      log.push(["2", "Alice", "insert X before H(1.0)",
        "id = 1.0 / 2 = " + idX.toFixed(1)]);
      push("Alice inserts before the first character",
        "No position, an <b>id</b>: before the first character, so the rule gives " +
        a[1].id.toFixed(1) + " / 2 = <b>" + idX.toFixed(1) + "</b>. That is the page's " +
        "X(0.5), and it is <i>computed from its neighbour</i> rather than declared. " +
        "Sorting by id puts it exactly where she meant it.", "ok",
        [
          { label: "neighbour id", value: a[1].id.toFixed(1) },
          { label: "new id", value: idX.toFixed(1), flag: "ok" },
          { label: "Alice's document", value: '"' + sddesigncollaborat_text(a) + '"' }
        ]);

      var idY = sddesigncollaborat_after(b[b.length - 1].id);
      sddesigncollaborat_place(b, sddesigncollaborat_mk("Y", idY, "bob", "oY"));
      ops.push({ kind: "ins", k: "oY", who: "bob" });
      log.push(["3", "Bob (offline)", "insert Y after O(" +
        (idY - 1).toFixed(1) + ")", "id = " + (idY - 1).toFixed(1) + " + 1 = " +
        idY.toFixed(1)]);
      push("Bob inserts at the end, offline",
        "After the last character, so the rule gives " + (idY - 1).toFixed(1) +
        " + 1 = <b>" + idY.toFixed(1) + "</b> — the page's Y(6.0). Bob has no server to " +
        "ask and does not need one: <b>the id is generated locally and is globally " +
        "orderable</b>.", "warn",
        [
          { label: "neighbour id", value: (idY - 1).toFixed(1) },
          { label: "new id", value: idY.toFixed(1), flag: "warn" },
          { label: "Bob's document", value: '"' + sddesigncollaborat_text(b) + '"' },
          { label: "ops queued at Bob", value: "1", flag: "warn" }
        ]);

      sddesigncollaborat_kill(b, "b3");
      ops.push({ kind: "del", target: "b3", who: "bob" });
      log.push(["4", "Bob (offline)", "delete L(" +
        sddesigncollaborat_idAt(b, "b3").toFixed(1) + ")", "tombstone, not removal"]);
      push("Bob deletes a character — as a tombstone",
        "The second L is <b>marked dead, not removed</b>. Bob's screen loses the " +
        "character; the entry stays, holding id " +
        sddesigncollaborat_idAt(b, "b3").toFixed(1) + " open. The next frame is why " +
        "that matters.", "warn",
        [
          { label: "tombstoned id", value: sddesigncollaborat_idAt(b, "b3").toFixed(1),
            flag: "idle" },
          { label: "Bob sees", value: '"' + sddesigncollaborat_text(b) + '"' },
          { label: "entries Bob stores", value: String(b.length), flag: "warn" },
          { label: "ops queued at Bob", value: "2", flag: "warn" }
        ]);

      var idBang = sddesigncollaborat_between(
        sddesigncollaborat_idAt(a, "b3"), sddesigncollaborat_idAt(a, "b4"));
      sddesigncollaborat_place(a, sddesigncollaborat_mk("!", idBang, "alice", "oB"));
      ops.push({ kind: "ins", k: "oB", who: "alice" });
      aStatus = "2 OPS TO BROADCAST";
      log.push(["5", "Alice", "insert ! between L(" +
        sddesigncollaborat_idAt(a, "b3").toFixed(1) + ") and O(" +
        sddesigncollaborat_idAt(a, "b4").toFixed(1) + ")",
        "id = " + idBang.toFixed(1)]);
      push("Alice inserts beside the character Bob just deleted",
        "<b>This is what tombstones are for.</b> Alice anchors her <code>!</code> between " +
        sddesigncollaborat_idAt(a, "b3").toFixed(1) + " and " +
        sddesigncollaborat_idAt(a, "b4").toFixed(1) + ", giving id <b>" +
        idBang.toFixed(1) + "</b> — concurrently with Bob deleting " +
        sddesigncollaborat_idAt(a, "b3").toFixed(1) + ". If that entry had been removed " +
        "instead of marked, her anchor would be gone and her character would have " +
        "nowhere to belong.", "ok",
        [
          { label: "left neighbour", value: sddesigncollaborat_idAt(a, "b3").toFixed(1) +
            " — Bob is deleting it", flag: "warn" },
          { label: "right neighbour",
            value: sddesigncollaborat_idAt(a, "b4").toFixed(1) },
          { label: "new id", value: "(" + sddesigncollaborat_idAt(a, "b3").toFixed(1) +
            " + " + sddesigncollaborat_idAt(a, "b4").toFixed(1) + ") / 2 = " +
            idBang.toFixed(1), flag: "ok" },
          { label: "Alice sees", value: '"' + sddesigncollaborat_text(a) + '"' }
        ]);

      bytes += ops.length * sddesigncollaborat_CRDT_B;
      bStatus = "RECONNECTED"; bFlag = "warn";
      midStatus = "PEER TO PEER"; midFlag = "ok";
      log.push(["6", "both", "reconnect, exchange queues",
        ops.length + " ops × " + sddesigncollaborat_CRDT_B + " B = " +
        sddesigncollaborat_kb(ops.length * sddesigncollaborat_CRDT_B)]);
      push("Bob reconnects and the queues cross",
        "Four operations in flight, <b>" +
        sddesigncollaborat_kb(ops.length * sddesigncollaborat_CRDT_B) + "</b> at " +
        sddesigncollaborat_CRDT_B + " bytes each — " + sddesigncollaborat_OP_B +
        " for the operation and " + sddesigncollaborat_ID_B + " for the id it carries. " +
        "<b>Nothing arbitrates.</b> To make the point, the next two frames deliver them " +
        "to the two replicas in <i>opposite orders</i>.", "warn",
        [
          { label: "ops in flight", value: String(ops.length), flag: "warn" },
          { label: "wire", value: sddesigncollaborat_kb(bytes) },
          { label: "Alice sees", value: '"' + sddesigncollaborat_text(a) + '"' },
          { label: "Bob sees", value: '"' + sddesigncollaborat_text(b) + '"' }
        ]);

      sddesigncollaborat_kill(a, "b3");
      sddesigncollaborat_place(b, sddesigncollaborat_mk("!", idBang, "alice", "oB"));
      log.push(["7a", "Alice", "apply Bob's delete of " +
        sddesigncollaborat_idAt(a, "b3").toFixed(1), '"' +
        sddesigncollaborat_text(a) + '"']);
      log.push(["7b", "Bob", "apply Alice's insert !(" + idBang.toFixed(1) + ")",
        '"' + sddesigncollaborat_text(b) + '"']);
      push("opposite delivery orders — replicas differ",
        "Alice applies Bob's <i>delete</i> first; Bob applies Alice's <i>insert</i> " +
        "first. The two replicas now read \"" + sddesigncollaborat_text(a) +
        "\" and \"" + sddesigncollaborat_text(b) + "\" — <b>genuinely different " +
        "documents</b>, mid-merge. Under OT this would be the dangerous moment. Here it " +
        "is not a moment at all.", "warn",
        [
          { label: "Alice applied", value: "Bob's delete", flag: "warn" },
          { label: "Bob applied", value: "Alice's insert !", flag: "warn" },
          { label: "Alice", value: '"' + sddesigncollaborat_text(a) + '"' },
          { label: "Bob", value: '"' + sddesigncollaborat_text(b) + '"', flag: "warn" },
          { label: "transforms so far", value: String(xforms), flag: "ok" }
        ]);

      sddesigncollaborat_place(a, sddesigncollaborat_mk("Y", idY, "bob", "oY"));
      sddesigncollaborat_place(b, sddesigncollaborat_mk("X", idX, "alice", "oX"));
      aStatus = "CONVERGED"; aFlag = "ok"; bStatus = "CONVERGED"; bFlag = "ok";
      log.push(["8a", "Alice", "apply Bob's insert Y(" + idY.toFixed(1) + ")",
        '"' + sddesigncollaborat_text(a) + '"']);
      log.push(["8b", "Bob", "apply Alice's insert X(" + idX.toFixed(1) + ")",
        '"' + sddesigncollaborat_text(b) + '"']);
      push("union, sorted by id — identical either way",
        "<b>\"" + sddesigncollaborat_text(a) + "\" on both replicas after applying the " +
        "same four operations in <i>different orders</i>, with " + xforms +
        " transforms and no server.</b> That is commutativity, and it is the whole " +
        "property: merge is a union and a sort. " +
        sddesigncollaborat_kept(ops, a, b) + " of " + ops.length + " edits honoured, " +
        sddesigncollaborat_lost(ops) + " lost. The bill is on screen too — <b>" +
        a.length + " entries stored for " + sddesigncollaborat_text(a).length +
        " visible characters</b> (the tombstone never leaves) and " +
        sddesigncollaborat_ID_B + " extra bytes on every operation; the page puts the " +
        "historical memory cost at 2–10×. <i>And the limit worth saying out loud: this " +
        "document is valid, not necessarily sensible. Convergence is not semantic " +
        "correctness.</i>", "ok",
        [
          { label: "final document", value: '"' + sddesigncollaborat_text(a) + '"',
            flag: "ok" },
          { label: "edits honoured", value: sddesigncollaborat_kept(ops, a, b) + " / " +
            ops.length, flag: "ok" },
          { label: "transforms computed", value: String(xforms), flag: "ok" },
          { label: "entries stored / visible", value: a.length + " / " +
            sddesigncollaborat_text(a).length, flag: "warn" },
          { label: "central sequencer", value: "not required", flag: "ok" }
        ]);
    }

    return steps;
  }

  // ======================================================================
  S["sddesigncollaborat"] = {
    title: "Type into the same paragraph, three ways",
    note: "The page's own worked example, replayed three times. Document <code>" +
      sddesigncollaborat_BASE + "</code> at version " + sddesigncollaborat_V0 +
      "; Alice issues <code>insert(\"X\", 0)</code> and Bob <code>insert(\"Y\", 5)</code> " +
      "from that same base — section 4 verbatim, with the base ids H(1.0) … O(5.0). New " +
      "CRDT ids come from one rule, <i>before the first id x → x/2, after the last → x+1, " +
      "between a and b → (a+b)/2</i>, which <b>reproduces</b> the page's X(0.5) and " +
      "Y(6.0) rather than asserting them. A round trip is " + sddesigncollaborat_RTT +
      " ms (the page's \"even 50 ms makes typing feel broken\") against the page's " +
      sddesigncollaborat_KPS + "-keystroke/s typist, so a server-gated render would eat <b>" +
      sddesigncollaborat_GATE_PCT.toFixed(1) + "%</b> of the " +
      sddesigncollaborat_GAP_MS.toFixed(0) + " ms between keystrokes. A whole-document " +
      "write is the page's " + sddesigncollaborat_DOC_KB + " KB; one operation is declared " +
      "here at " + sddesigncollaborat_OP_B + " B, and a CRDT operation carries a further " +
      sddesigncollaborat_ID_B + " B of id. Every document, position, id and count below " +
      "is produced by applying the operations to an array.",
    interval: 1400,

    scenarios: [
      { id: "lww", label: "Last write wins", steps: sddesigncollaborat_run("lww") },
      { id: "ot", label: "OT — transform", steps: sddesigncollaborat_run("ot") },
      { id: "crdt", label: "CRDT — offline", steps: sddesigncollaborat_run("crdt") }
    ],

    draw: function (step, d, ctx) {
      var isCrdt = step.kind === "crdt";

      var head = d.flow([
        d.big(
          step.converged ? "converged" : "diverged",
          step.converged ? "replicas byte-identical" : "replicas differ",
          step.converged ? (step.lost ? "bad" : "ok") : "warn"
        ),
        d.stack([
          d.stat({
            label: "edits honoured everywhere",
            value: step.kept + " / " + step.issued,
            sub: step.issued ? "intent preserved on both replicas" : "nothing typed yet",
            flag: !step.issued ? "idle" : step.kept === step.issued ? "ok" : "warn"
          }),
          d.stat({
            label: "edits lost",
            value: String(step.lost),
            sub: step.lost ? "no record that they existed" : "the hard invariant holds",
            flag: step.lost ? "bad" : "ok"
          })
        ]),
        d.stack([
          d.stat({
            label: "on the wire",
            value: sddesigncollaborat_kb(step.bytes),
            sub: step.kind === "lww" ? "whole documents"
              : isCrdt ? sddesigncollaborat_CRDT_B + " B per op"
              : sddesigncollaborat_OP_B + " B per op",
            flag: !step.bytes ? "idle" : step.kind === "lww" ? "bad" : "ok"
          }),
          d.stat({
            label: "transforms computed",
            value: String(step.xforms),
            sub: isCrdt ? "order is intrinsic to the ids"
              : step.kind === "lww" ? "no operations to transform"
              : "one function per operation pair",
            flag: isCrdt ? "ok" : step.xforms ? "warn" : "idle"
          })
        ])
      ]);

      var stage = d.node({
        title: step.stage,
        status: "STEP " + ctx.i + " / " + ctx.n,
        statusFlag: step.flag || "idle",
        badge: isCrdt ? "ids, not positions" : "positions",
        meta: isCrdt
          ? "every character carries a unique, densely-orderable id"
          : "\"insert at 5\" means something else once someone inserts at 2",
        flag: step.flag || "idle",
        rows: step.rows
      });

      var alice = d.node({
        title: "Alice · local replica",
        status: step.aStatus,
        statusFlag: step.aFlag,
        badge: '"' + step.aDoc + '"',
        meta: "keystrokes painted in 0 ms — the server never gates the render",
        flag: step.aFlag,
        body: d.cells(step.aCells, {
          label: isCrdt ? "entries, sorted by id" : "characters, by position",
          dense: true
        })
      });

      var bob = d.node({
        title: "Bob · local replica",
        status: step.bStatus,
        statusFlag: step.bFlag,
        badge: '"' + step.bDoc + '"',
        meta: "same requirement, same guarantee, other machine",
        flag: step.bFlag,
        body: d.cells(step.bCells, {
          label: isCrdt ? "entries, sorted by id" : "characters, by position",
          dense: true
        })
      });

      var mid = step.sCells
        ? d.node({
            title: step.midTitle,
            status: step.midStatus,
            statusFlag: step.midFlag,
            badge: "v" + step.ver,
            meta: step.midMeta,
            flag: step.midFlag,
            body: d.cells(step.sCells, {
              label: 'server document "' + step.sDoc + '"',
              dense: true
            })
          })
        : d.node({
            title: step.midTitle,
            status: step.midStatus,
            statusFlag: step.midFlag,
            badge: "union + sort by id",
            meta: step.midMeta,
            flag: step.midFlag,
            body: d.mono("merge(A, B) = sort(A ∪ B, by id) — commutative", "ok")
          });

      var legend = isCrdt
        ? "Green is Alice's character, amber is Bob's, grey is a <b>tombstone</b> — " +
          "present in the structure, absent from the text, and still holding its id open " +
          "so a concurrent insert beside it knows where it belongs. Hover any cell for " +
          "its id."
        : step.kind === "lww"
          ? "Green is Alice's character, amber is Bob's, <b>red is a character that no " +
            "longer exists anywhere</b>. Hover any cell for its position."
          : "Green is Alice's character, amber is Bob's. Positions are what travel, and " +
            "positions are what the transform has to fix. Hover any cell for its position.";

      return d.stack([
        head,
        stage,
        alice,
        mid,
        bob,
        step.log.length
          ? d.table(["#", "from", "operation", "effect"], step.log)
          : d.note("Nothing has been typed yet.", "idle"),
        d.note(legend, step.lost ? "bad" : undefined)
      ]);
    }
  };

  // ====================================================================
  // ======================================================================
  // SIM · sddesignecommerce  (design-ecommerce.md)
  //
  // The page names its own time axis: "50,000 people want the same item at
  // 10am" — 100x normal load landing on ONE inventory row. So the sim opens
  // the sale and runs the clock, 250 ms at a time, through three checkout
  // paths: the read-then-write guard (section 5's race), the atomic
  // conditional decrement (section 5's fix), and the flash-sale stack of
  // section 6 — waiting room, Redis pre-check, sharded counters. The
  // reservation state machine runs underneath all three: every reservation
  // settles one frame later into sold, released or held-for-reconciliation,
  // and released units go back into the pool.
  //
  // CONFIG — the page's figures, verbatim:
  //   stock on this SKU          1,000 units     section 6: "Split 1,000
  //                                              units into 10 buckets of 100"
  //   buckets                    10              section 6
  //   units per bucket           1,000 / 10 = 100  (derived; matches the page)
  //   shoppers                   50,000          section 9: "50,000 people
  //                                              want the same item at 10am"
  //   checkout peak, normal day  500/s           section 2
  //   flash sale                 100x normal     section 1
  //   reservation TTL            15 min          section 5
  //   browse-path stock display  from cache      section 4 / section 7
  //
  // DECLARED HERE, because the page gives no figure:
  //   one conditional UPDATE holds the row      1 ms
  //   -> ONE row therefore serialises at        1,000 txn/s   (derived)
  //   -> 10 buckets serialise at               10,000 txn/s   (derived; this
  //      is the page's "10x less contention", computed rather than asserted)
  //   in-flight transactions (pool)             300
  //   checkout timeout                          3 s
  //   -> queue beyond 3 s x 1,000/s = 3,000 is already lost   (derived)
  //   waiting-room admission                    2,000/s
  //   payment provider: 96% approve, 3% decline, 1% timeout
  //
  // ARRIVALS — 8 frames of 250 ms, summing to the page's 50,000 shoppers.
  // The peak frame is 12,500 in 250 ms = 50,000/s, which is exactly the
  // page's 100x on its 500/s checkout peak.
  // ======================================================================
  var sddesignecommerce_STOCK = 1000;
  var sddesignecommerce_BUCKETS = 10;
  var sddesignecommerce_PER_BUCKET = sddesignecommerce_STOCK / sddesignecommerce_BUCKETS;
  var sddesignecommerce_PEAK_QPS = 500;
  var sddesignecommerce_FLASH_X = 100;
  var sddesignecommerce_TTL_MIN = 15;
  var sddesignecommerce_ROW_MS = 1;
  var sddesignecommerce_ROW_TPS = 1000 / sddesignecommerce_ROW_MS;
  var sddesignecommerce_POOL = 300;
  var sddesignecommerce_TIMEOUT_S = 3;
  var sddesignecommerce_QCAP = sddesignecommerce_TIMEOUT_S * sddesignecommerce_ROW_TPS;
  var sddesignecommerce_ADMIT_QPS = 2000;
  var sddesignecommerce_PAY_TO = 0.01;
  var sddesignecommerce_PAY_DECL = 0.03;
  var sddesignecommerce_FRAME_S = 0.25;
  var sddesignecommerce_ARR = [125, 12500, 11250, 8750, 6250, 5000, 3750, 2375];
  var sddesignecommerce_FRAMES = sddesignecommerce_ARR.length;

  function sddesignecommerce_sum(a) {
    var t = 0, i;
    for (i = 0; i < a.length; i++) t += a[i];
    return t;
  }
  var sddesignecommerce_SHOPPERS = sddesignecommerce_sum(sddesignecommerce_ARR);
  var sddesignecommerce_PEAK_RATE =
    Math.max.apply(null, sddesignecommerce_ARR) / sddesignecommerce_FRAME_S;
  var sddesignecommerce_PEAK_MULT =
    sddesignecommerce_PEAK_RATE / sddesignecommerce_PEAK_QPS;
  var sddesignecommerce_ROW_CAP = sddesignecommerce_ROW_TPS * sddesignecommerce_FRAME_S;
  var sddesignecommerce_ADMIT_CAP = sddesignecommerce_ADMIT_QPS * sddesignecommerce_FRAME_S;
  var sddesignecommerce_SHARD_TPS = sddesignecommerce_ROW_TPS * sddesignecommerce_BUCKETS;

  function sddesignecommerce_n(x) {
    return Math.round(x).toLocaleString("en-US");
  }
  function sddesignecommerce_pct(a, b) { return b > 0 ? (a / b) * 100 : 0; }
  function sddesignecommerce_was(n) { return n === 1 ? " was " : " were "; }
  function sddesignecommerce_p1(x) { return x.toFixed(1) + "%"; }
  function sddesignecommerce_lcg(s) { return (s * 1664525 + 1013904223) >>> 0; }
  function sddesignecommerce_total(bk) {
    var t = 0, i;
    for (i = 0; i < bk.length; i++) t += bk[i];
    return t;
  }
  function sddesignecommerce_positive(bk) {
    var t = 0, i;
    for (i = 0; i < bk.length; i++) if (bk[i] > 0) t += bk[i];
    return t;
  }

  // ======================================================================
  // The fallthrough variant, run once so the last frame of the flash tab can
  // price the fix the page proposes: "Fix by falling through to other
  // buckets, which reintroduces some contention." Counts bucket probes.
  // ======================================================================
  function sddesignecommerce_fallthrough() {
    var bk = [], i, f, k, b, probes = 0, taken = 0, tries;
    for (i = 0; i < sddesignecommerce_BUCKETS; i++) bk.push(sddesignecommerce_PER_BUCKET);
    var seed = 777 >>> 0, wr = 0, redis = sddesignecommerce_STOCK;
    for (f = 0; f < sddesignecommerce_FRAMES; f++) {
      wr += sddesignecommerce_ARR[f];
      var admit = Math.min(wr, sddesignecommerce_ADMIT_CAP);
      wr -= admit;
      for (k = 0; k < admit; k++) {
        if (redis <= 0) continue;
        redis--;
        seed = sddesignecommerce_lcg(seed);
        b = seed % sddesignecommerce_BUCKETS;
        tries = 0;
        while (tries < sddesignecommerce_BUCKETS) {
          probes++;
          if (bk[b] > 0) { bk[b]--; taken++; break; }
          b = (b + 1) % sddesignecommerce_BUCKETS;
          tries++;
        }
        if (tries >= sddesignecommerce_BUCKETS) redis++;
      }
    }
    return {
      taken: taken,
      probes: probes,
      per: taken > 0 ? probes / taken : 0,
      stranded: sddesignecommerce_total(bk)
    };
  }
  var sddesignecommerce_FT = sddesignecommerce_fallthrough();

  // ======================================================================
  // One sale. mode = "naive" | "atomic" | "flash".
  // Every count in a frame is accumulated by the loop, never typed.
  // ======================================================================
  function sddesignecommerce_run(mode) {
    var isFlash = mode === "flash";
    var nb = isFlash ? sddesignecommerce_BUCKETS : 1;
    var bk = [], i, f, k;
    for (i = 0; i < nb; i++) {
      bk.push(isFlash ? sddesignecommerce_PER_BUCKET : sddesignecommerce_STOCK);
    }

    var seed = 4242 >>> 0;
    var wr = 0, queue = 0;
    var offered = 0, admitted = 0, edgeRej = 0, shed = 0, attempts = 0;
    var reserved = 0, sold = 0, releasedN = 0, heldN = 0;
    var oversold = 0, oversoldCharged = 0, falseSold = 0, toldOut = 0;
    var redis = isFlash ? sddesignecommerce_STOCK : 0;
    var settling = [], held = [], frames = [];

    for (f = 0; f < sddesignecommerce_FRAMES; f++) {
      var fSold = 0, fDecl = 0, fHeld = 0, fRes = 0, fFalse = 0, fTold = 0;
      var fOver = 0, fShed = 0, fEdge = 0, fAtt = 0, u, r;

      // ---- 1. last frame's reservations settle at the provider ----------
      var batch = settling;
      settling = [];
      for (i = 0; i < batch.length; i++) {
        r = batch[i];
        seed = sddesignecommerce_lcg(seed);
        u = seed / 4294967296;
        if (u < sddesignecommerce_PAY_TO) {
          // outcome unknown: hold the reservation, reconcile later. The unit
          // stays consumed — releasing it risks giving away paid stock.
          held.push(r); reserved--; heldN++; fHeld++;
        } else if (u < sddesignecommerce_PAY_TO + sddesignecommerce_PAY_DECL) {
          bk[r.b] += 1;
          if (isFlash) redis += 1;
          reserved--; releasedN++; fDecl++;
        } else {
          reserved--; sold++; fSold++;
          if (r.over) oversoldCharged++;
        }
      }

      // ---- 2. shoppers arrive -------------------------------------------
      var arr = sddesignecommerce_ARR[f];
      offered += arr;

      // ---- 3. the edge: waiting room + Redis, or nothing at all ---------
      var pass = 0;
      if (isFlash) {
        wr += arr;
        var admit = Math.min(wr, sddesignecommerce_ADMIT_CAP);
        wr -= admit; admitted += admit;
        for (k = 0; k < admit; k++) {
          if (redis > 0) { redis--; pass++; }
          else { edgeRej++; fEdge++; }
        }
        queue = 0;
      } else {
        queue += arr;
        pass = Math.min(queue, sddesignecommerce_ROW_CAP);
        queue -= pass;
        if (queue > sddesignecommerce_QCAP) {
          fShed = queue - sddesignecommerce_QCAP;
          shed += fShed;
          queue = sddesignecommerce_QCAP;
        }
        admitted += pass;
      }
      attempts += pass; fAtt = pass;

      // ---- 4. the inventory write ---------------------------------------
      if (mode === "naive") {
        // the guard lives in the application, so the transactions in flight
        // together — one pool's worth — all read the SAME value before any
        // of them wrote
        var rest = pass;
        while (rest > 0) {
          var w = Math.min(rest, sddesignecommerce_POOL);
          var seen = bk[0];
          if (seen >= 1) {
            for (k = 0; k < w; k++) {
              var over = k >= seen;
              bk[0] -= 1; reserved++; fRes++;
              if (over) { oversold++; fOver++; }
              settling.push({ b: 0, over: over });
            }
          } else {
            toldOut += w; fTold += w;
          }
          rest -= w;
        }
      } else if (mode === "atomic") {
        // UPDATE ... WHERE available >= qty — the database evaluates and
        // writes atomically, so a loser gets zero rows affected
        for (k = 0; k < pass; k++) {
          if (bk[0] >= 1) {
            bk[0] -= 1; reserved++; fRes++;
            settling.push({ b: 0, over: false });
          } else { toldOut++; fTold++; }
        }
      } else {
        for (k = 0; k < pass; k++) {
          seed = sddesignecommerce_lcg(seed);
          var b = seed % sddesignecommerce_BUCKETS;
          if (bk[b] > 0) {
            bk[b] -= 1; reserved++; fRes++;
            settling.push({ b: b, over: false });
          } else if (sddesignecommerce_positive(bk) > 0) {
            // the bucket is empty but the SKU is not — the page's own
            // caveat: "a request may be told 'sold out' while units remain"
            falseSold++; fFalse++; redis += 1;
          } else {
            toldOut++; fTold++;
          }
        }
      }

      var capThis = isFlash
        ? sddesignecommerce_ROW_CAP * sddesignecommerce_BUCKETS
        : sddesignecommerce_ROW_CAP;

      frames.push({
        f: f, mode: mode,
        t: (f + 1) * sddesignecommerce_FRAME_S,
        arr: arr, rate: arr / sddesignecommerce_FRAME_S,
        offered: offered,
        wr: wr, queue: queue,
        admitted: admitted, edgeRej: edgeRej, fEdge: fEdge,
        shed: shed, fShed: fShed,
        attempts: attempts, fAtt: fAtt,
        util: sddesignecommerce_pct(pass, capThis),
        dbWaitS: isFlash
          ? sddesignecommerce_ROW_MS / 1000
          : queue / sddesignecommerce_ROW_TPS + sddesignecommerce_ROW_MS / 1000,
        wrEtaS: isFlash ? wr / sddesignecommerce_ADMIT_QPS : 0,
        buckets: bk.slice(0),
        stock: sddesignecommerce_total(bk),
        redis: redis,
        reserved: reserved, sold: sold, released: releasedN, heldPay: heldN,
        oversold: oversold, oversoldCharged: oversoldCharged,
        falseSold: falseSold, toldOut: toldOut,
        fSold: fSold, fDecl: fDecl, fHeldPay: fHeld, fRes: fRes,
        fFalse: fFalse, fTold: fTold, fOver: fOver,
        settling: settling.length
      });
    }
    return frames;
  }

  // ---- the idle frame, same shape so draw() never guesses ---------------
  function sddesignecommerce_idle(mode) {
    var isFlash = mode === "flash";
    var nb = isFlash ? sddesignecommerce_BUCKETS : 1;
    var bk = [], i;
    for (i = 0; i < nb; i++) {
      bk.push(isFlash ? sddesignecommerce_PER_BUCKET : sddesignecommerce_STOCK);
    }
    return {
      f: -1, mode: mode, t: 0, arr: 0, rate: 0, offered: 0,
      wr: 0, queue: 0, admitted: 0, edgeRej: 0, fEdge: 0, shed: 0, fShed: 0,
      attempts: 0, fAtt: 0, util: 0,
      dbWaitS: 0, wrEtaS: 0,
      buckets: bk, stock: sddesignecommerce_total(bk),
      redis: isFlash ? sddesignecommerce_STOCK : 0,
      reserved: 0, sold: 0, released: 0, heldPay: 0,
      oversold: 0, oversoldCharged: 0, falseSold: 0, toldOut: 0,
      fSold: 0, fDecl: 0, fHeldPay: 0, fRes: 0, fFalse: 0, fTold: 0, fOver: 0,
      settling: 0
    };
  }

  // ======================================================================
  // Scenarios. One sale, three checkout paths.
  // ======================================================================
  function sddesignecommerce_scenario(mode, id, label, idleCap, cap) {
    var fr = sddesignecommerce_run(mode);
    var steps = [], i, s;
    steps.push({ caption: idleCap, flag: "idle", st: sddesignecommerce_idle(mode) });
    for (i = 0; i < fr.length; i++) {
      s = cap(fr[i], i, fr);
      steps.push({ caption: s.caption, flag: s.flag, st: fr[i] });
    }
    return { id: id, label: label, steps: steps };
  }

  // the single-row run, kept so the flash tab can quote what it replaced
  var sddesignecommerce_ROW_RUN = sddesignecommerce_run("atomic");
  var sddesignecommerce_ROW_SHED =
    sddesignecommerce_ROW_RUN[sddesignecommerce_FRAMES - 1].shed;

  function sddesignecommerce_naive() {
    return sddesignecommerce_scenario("naive", "naive", "Read, then write",
      "One SKU, <b>" + sddesignecommerce_n(sddesignecommerce_STOCK) + " units</b>, and <b>" +
      sddesignecommerce_n(sddesignecommerce_SHOPPERS) + " people</b> about to want it. " +
      "Checkout reads the stock, checks it in application code, then writes. Nothing " +
      "stands between the shoppers and the row. <i>Press Play.</i>",
      function (r, i, all) {
        var flag = r.oversold ? "bad" : r.fRes ? "warn" : "idle";
        var cap;
        if (i === 0) {
          cap = "The sale opens. <b>" + sddesignecommerce_n(r.arr) + "</b> checkouts in " +
            (sddesignecommerce_FRAME_S * 1000) + " ms — " + sddesignecommerce_n(r.rate) +
            "/s, which is exactly the page's ordinary checkout peak, the last " +
            "unremarkable frame of the day. Every one reads <code>available</code>, finds " +
            sddesignecommerce_n(sddesignecommerce_STOCK) + ", and decrements. No conflict " +
            "yet, because there is plenty of stock — <i>which is exactly why this bug " +
            "survives testing.</i>";
        } else if (r.fOver > 0 && all[i - 1].oversold === 0) {
          cap = "<b>The crossing.</b> The " + sddesignecommerce_n(r.fAtt) +
            " transactions in flight this frame all read <code>available</code> before " +
            "any of them wrote, and all of them saw <b>" +
            sddesignecommerce_n(r.fAtt - r.fOver) + "</b> units. All " +
            sddesignecommerce_n(r.fAtt) + " passed the application check. All " +
            sddesignecommerce_n(r.fAtt) + " decremented. <b>available is now " +
            sddesignecommerce_n(r.stock) + " — " + sddesignecommerce_n(r.fOver) +
            " orders exist for stock that does not.</b> Nothing errored.";
        } else if (r.oversold && i < all.length - 1) {
          cap = "The row is negative, so every later read correctly refuses — <b>" +
            sddesignecommerce_n(r.toldOut) + "</b> shoppers told sold out so far, " +
            "honestly, and at <b>" + sddesignecommerce_ROW_MS + " ms of row lock each</b>. " +
            "The damage is already behind us and it has settled at the payment provider: " +
            "<b>" + sddesignecommerce_n(r.oversoldCharged) + "</b> of the " +
            sddesignecommerce_n(r.oversold) + " impossible orders have been " +
            "<i>charged</i>, and the row is still " + sddesignecommerce_n(r.stock) + ".";
        } else if (i === all.length - 1) {
          var cross = all[0], j;
          for (j = 0; j < all.length; j++) {
            if (all[j].fOver > 0) { cross = all[j]; break; }
          }
          cap = "<b>" + sddesignecommerce_n(r.sold + r.reserved + r.heldPay) +
            " orders accepted against " +
            sddesignecommerce_n(sddesignecommerce_STOCK) + " units, and " +
            sddesignecommerce_n(r.oversoldCharged) + " customers already charged for " +
            "something that was never there.</b> No lock was contended, no query was " +
            "slow, no error was logged — the race lives entirely in the gap between the " +
            "read and the write, and it opened for exactly one frame, when " +
            sddesignecommerce_n(cross.fAtt) + " transactions were in flight against " +
            "the last " + sddesignecommerce_n(cross.fAtt - cross.fOver) +
            " units. <i>Every one of those orders now needs a refund and an apology, " +
            "which is the one failure an e-commerce system is not allowed to have.</i>";
        } else {
          cap = "<b>" + sddesignecommerce_n(r.fAtt) + "</b> reservations this frame, " +
            "stock down to <b>" + sddesignecommerce_n(r.stock) + "</b>. Meanwhile " +
            sddesignecommerce_n(r.fSold) + " of the previous frame's reservations " +
            "settled as sold and " + sddesignecommerce_n(r.fDecl) +
            sddesignecommerce_was(r.fDecl) + "declined and released back into stock — " +
            "<i>the reservation state machine is working fine; it is the guard that is " +
            "in the wrong place.</i>";
        }
        return { caption: cap, flag: flag };
      });
  }

  function sddesignecommerce_atomic() {
    return sddesignecommerce_scenario("atomic", "atomic", "Atomic decrement",
      "Same sale, same " + sddesignecommerce_n(sddesignecommerce_STOCK) + " units, same " +
      sddesignecommerce_n(sddesignecommerce_SHOPPERS) + " shoppers — but the guard moves " +
      "into the statement: <code>UPDATE inventory SET available = available - 1 WHERE " +
      "sku_id = ? AND available &gt;= 1</code>. Nothing else changes. <i>Press Play.</i>",
      function (r, i, all) {
        var wasted = Math.max(0, r.attempts - r.reserved - r.sold - r.released - r.heldPay);
        var flag = r.fShed > 0 ? "bad" : r.fRes ? "ok" : "warn";
        var cap;
        if (i === 0) {
          cap = "One row, one lock, <b>" + sddesignecommerce_ROW_MS +
            " ms</b> per conditional update — so this row retires <b>" +
            sddesignecommerce_n(sddesignecommerce_ROW_TPS) + " checkouts a second</b>, " +
            sddesignecommerce_n(sddesignecommerce_ROW_CAP) + " in this frame. The first " +
            sddesignecommerce_n(r.fRes) + " all succeed. <i>Watch the queue, not the " +
            "stock.</i>";
        } else if (i === 1) {
          cap = "<b>" + sddesignecommerce_n(r.rate) + "/s arriving, " +
            sddesignecommerce_n(sddesignecommerce_ROW_TPS) + "/s leaving.</b> That is the " +
            "page's point in one line: this is <i>contention</i>, not throughput. The " +
            "queue for one row is now " + sddesignecommerce_n(r.queue) + " deep, which is " +
            r.dbWaitS.toFixed(1) + " s of waiting — at the " +
            sddesignecommerce_TIMEOUT_S + " s checkout timeout — so <b>" +
            sddesignecommerce_n(r.fShed) + "</b> shoppers this frame are already " +
            "destined for a 504.";
        } else if (r.stock <= 0 && all[i - 1].stock > 0) {
          cap = "<b>Sold out — correctly.</b> Every one of the " +
            sddesignecommerce_n(sddesignecommerce_STOCK) + " units is spoken for and <b>" +
            sddesignecommerce_n(r.oversold) + " are oversold</b>. The losers " +
            "got zero rows affected and an honest 409. But look at what the row is doing " +
            "now: every remaining checkout still takes the lock for " +
            sddesignecommerce_ROW_MS + " ms <i>just to be told no</i>.";
        } else if (i === all.length - 1) {
          cap = "<b>Correct, and the store is down.</b> " +
            sddesignecommerce_n(r.sold + r.reserved + r.heldPay) + " orders for " +
            sddesignecommerce_n(sddesignecommerce_STOCK) + " units, " +
            sddesignecommerce_n(r.oversold) + " oversold — the invariant held exactly. " +
            "The bill: of " + sddesignecommerce_n(r.attempts) + " transactions the row " +
            "managed to run, only <b>" + sddesignecommerce_n(r.attempts - r.toldOut) +
            "</b> bought anything; <b>" + sddesignecommerce_n(r.toldOut) +
            "</b> spent a lock slot to hear \"sold out\". And <b>" +
            sddesignecommerce_n(r.shed) + " of " + sddesignecommerce_n(r.offered) +
            "</b> shoppers (" + sddesignecommerce_p1(
              sddesignecommerce_pct(r.shed, r.offered)) + ") queued past the " +
            sddesignecommerce_TIMEOUT_S + " s timeout without reaching the database at " +
            "all. <i>The atomic update solved correctness and solved nothing else.</i>";
        } else {
          cap = "Stock <b>" + sddesignecommerce_n(r.stock) + "</b>, queue <b>" +
            sddesignecommerce_n(r.queue) + "</b>, wait <b>" + r.dbWaitS.toFixed(1) +
            " s</b>. " + sddesignecommerce_n(r.fShed) + " more shoppers shed this frame, " +
            sddesignecommerce_n(r.shed) + " so far. The row is at <b>" +
            r.util.toFixed(0) + "%</b> — it is not slow, it is <i>singular</i>.";
        }
        return { caption: cap, flag: flag };
      });
  }

  function sddesignecommerce_flash() {
    return sddesignecommerce_scenario("flash", "flash", "Waiting room + shards",
      "Same sale again, now with the page's section 6 in front of it: a virtual " +
      "waiting room admitting <b>" + sddesignecommerce_n(sddesignecommerce_ADMIT_QPS) +
      "/s</b>, a Redis counter pre-declared at " +
      sddesignecommerce_n(sddesignecommerce_STOCK) + " that rejects at the edge once it " +
      "hits zero, and the stock split into <b>" + sddesignecommerce_BUCKETS +
      " buckets of " + sddesignecommerce_PER_BUCKET + "</b>. <i>Press Play.</i>",
      function (r, i, all) {
        var empties = 0, j;
        for (j = 0; j < r.buckets.length; j++) if (r.buckets[j] <= 0) empties++;
        var flag = r.fFalse ? "warn" : "ok";
        var cap;
        if (i === 0) {
          cap = "The sale opens and the waiting room admits <b>" +
            sddesignecommerce_n(r.fAtt) + "</b>. The database is at <b>" +
            r.util.toFixed(0) + "%</b> of the " +
            sddesignecommerce_n(sddesignecommerce_SHARD_TPS) + "/s that " +
            sddesignecommerce_BUCKETS + " buckets can serialise — " +
            sddesignecommerce_BUCKETS + "× the single row, because contention is " +
            "per-row and there are now " + sddesignecommerce_BUCKETS + " rows.";
        } else if (i === 1) {
          cap = "<b>" + sddesignecommerce_n(r.rate) + "/s arriving — " +
            sddesignecommerce_PEAK_MULT.toFixed(0) + "× a normal checkout peak — and " +
            "the database sees <b>" + sddesignecommerce_n(r.fAtt) + "</b>.</b> " +
            sddesignecommerce_n(r.wr) + " people are in the waiting room with an ETA of " +
            r.wrEtaS.toFixed(1) + " s, which is a <i>position in a queue</i>, not a " +
            "timeout. Checkout latency for the admitted is " +
            (r.dbWaitS * 1000).toFixed(0) + " ms.";
        } else if (r.fEdge > 0 && all[i - 1].fEdge === 0) {
          cap = "<b>Two things happen at once here.</b> The Redis counter runs low, so " +
            sddesignecommerce_n(r.fEdge) + " admitted shoppers are turned away <i>at the " +
            "edge</i> — no database call, no lock, instant. And <b>" +
            sddesignecommerce_n(r.fFalse) + "</b> of those that did reach the database " +
            "hashed to a bucket that was empty while <b>" +
            sddesignecommerce_n(r.stock) + " units still existed</b> elsewhere. " +
            empties + " of " + sddesignecommerce_BUCKETS + " buckets are now empty. " +
            "Their Redis tokens go back so someone else can try — <i>the stock is not " +
            "lost, the shopper is.</i>";
        } else if (i === all.length - 1) {
          cap = "<b>" + sddesignecommerce_n(r.sold + r.reserved + r.heldPay) +
            " orders, " + sddesignecommerce_n(r.oversold) + " oversold, " +
            sddesignecommerce_n(r.shed) + " timeouts</b> — and only <b>" +
            sddesignecommerce_n(r.attempts) + "</b> of " +
            sddesignecommerce_n(r.offered) + " checkouts (" +
            sddesignecommerce_p1(sddesignecommerce_pct(r.attempts, r.offered)) +
            ") ever touched the inventory tables. The " +
            sddesignecommerce_n(r.wr) + " people still queued hold a position and an " +
            "ETA rather than the " + sddesignecommerce_n(sddesignecommerce_ROW_SHED) +
            " timeouts the single row produced on the same traffic. The honest cost is " +
            "on screen too: <b>" + sddesignecommerce_n(r.falseSold) + " shoppers were " +
            "told sold out while units remained</b>, and " +
            sddesignecommerce_n(r.stock) + " units are still sitting in buckets nobody " +
            "hashed to. Falling through to the next bucket removes that entirely — the " +
            "same sale then strands " +
            sddesignecommerce_n(sddesignecommerce_FT.stranded) + " units and tells " +
            "nobody a lie — but it costs <b>" + sddesignecommerce_FT.per.toFixed(2) +
            " bucket probes per reservation</b> instead of 1.00, which is the " +
            "contention walking back in. <i>That tension is the answer, not the " +
            "technique.</i>";
        } else {
          cap = "Stock <b>" + sddesignecommerce_n(r.stock) + "</b> across " +
            (sddesignecommerce_BUCKETS - empties) + " live buckets · <b>" +
            sddesignecommerce_n(r.fAtt) + "</b> reached the database · <b>" +
            sddesignecommerce_n(r.fEdge) + "</b> rejected at the edge · <b>" +
            sddesignecommerce_n(r.wr) + "</b> still waiting (" + r.wrEtaS.toFixed(1) +
            " s). " + sddesignecommerce_n(r.fFalse) + " more shoppers hashed to an empty " +
            "bucket and were told sold out untruthfully, and " +
            sddesignecommerce_n(r.fDecl) + " declined payment" +
            (r.fDecl === 1 ? "" : "s") + " put units back into the buckets they came " +
            "from.";
        }
        return { caption: cap, flag: flag };
      });
  }

  // ======================================================================
  S["sddesignecommerce"] = {
    title: "Open a flash sale on one inventory row",
    note: "The page's own flash sale, run three ways. <b>" +
      sddesignecommerce_n(sddesignecommerce_SHOPPERS) + " shoppers</b> (the page's " +
      "\"50,000 people want the same item at 10am\") arrive over " +
      sddesignecommerce_FRAMES + " frames of " +
      (sddesignecommerce_FRAME_S * 1000) + " ms for <b>" +
      sddesignecommerce_n(sddesignecommerce_STOCK) + " units</b>, split by the flash tab " +
      "into the page's <b>" + sddesignecommerce_BUCKETS + " buckets of " +
      sddesignecommerce_PER_BUCKET + "</b>. The peak frame is " +
      sddesignecommerce_n(sddesignecommerce_PEAK_RATE) + "/s, exactly <b>" +
      sddesignecommerce_PEAK_MULT.toFixed(0) + "×</b> the page's " +
      sddesignecommerce_PEAK_QPS + "/s checkout peak. Declared here, because the page " +
      "gives no figure: one conditional <code>UPDATE</code> holds the row for " +
      sddesignecommerce_ROW_MS + " ms, so <b>one row serialises at " +
      sddesignecommerce_n(sddesignecommerce_ROW_TPS) + "/s and " +
      sddesignecommerce_BUCKETS + " buckets at " +
      sddesignecommerce_n(sddesignecommerce_SHARD_TPS) + "/s</b> — that is the page's " +
      "\"10× less contention\", computed; " + sddesignecommerce_POOL + " transactions in " +
      "flight; a " + sddesignecommerce_TIMEOUT_S + " s checkout timeout, so anything " +
      "queued past " + sddesignecommerce_n(sddesignecommerce_QCAP) + " is already lost; " +
      "a " + sddesignecommerce_n(sddesignecommerce_ADMIT_QPS) + "/s waiting room; and a " +
      "payment provider that approves 96%, declines 3% and times out 1%. Reservations " +
      "settle one frame later into sold, released or held-for-reconciliation, and every " +
      "number below is counted off that run.",
    interval: 1400,

    scenarios: [
      sddesignecommerce_naive(),
      sddesignecommerce_atomic(),
      sddesignecommerce_flash()
    ],

    draw: function (step, d, ctx) {
      var r = step.st;
      var isFlash = r.mode === "flash";
      var started = r.f >= 0;
      var accepted = r.sold + r.reserved + r.heldPay;
      var i;

      // ---- headline ----------------------------------------------------
      var head = d.flow([
        d.big(
          started ? sddesignecommerce_n(accepted) : "—",
          "orders accepted · " + sddesignecommerce_n(sddesignecommerce_STOCK) + " units",
          !started ? "idle" : r.oversold ? "bad" : "ok"
        ),
        d.stack([
          d.stat({
            label: "orders with no unit behind them",
            value: sddesignecommerce_n(r.oversold),
            sub: r.oversold
              ? sddesignecommerce_n(r.oversoldCharged) + " already charged"
              : "the one hard invariant",
            flag: r.oversold ? "bad" : started ? "ok" : "idle"
          }),
          d.stat({
            label: isFlash ? "told sold out — untrue" : "shed before the database",
            value: sddesignecommerce_n(isFlash ? r.falseSold : r.shed),
            sub: isFlash
              ? "bucket empty, units remained"
              : "queued past the " + sddesignecommerce_TIMEOUT_S + " s timeout",
            flag: (isFlash ? r.falseSold : r.shed) ? "warn" : started ? "ok" : "idle"
          })
        ]),
        d.stack([
          d.stat({
            label: "reached the inventory row",
            value: sddesignecommerce_n(r.attempts),
            sub: r.offered
              ? sddesignecommerce_p1(sddesignecommerce_pct(r.attempts, r.offered)) +
                " of " + sddesignecommerce_n(r.offered) + " offered"
              : "sale not open",
            flag: !started ? "idle" : isFlash ? "ok" : r.shed ? "bad" : "warn"
          }),
          d.stat({
            label: "checkout wait",
            value: started
              ? (r.dbWaitS >= 1 ? r.dbWaitS.toFixed(1) + " s"
                : (r.dbWaitS * 1000).toFixed(0) + " ms")
              : "—",
            sub: started
              ? (isFlash ? "waiting room ETA " + r.wrEtaS.toFixed(1) + " s"
                : "timeout " + sddesignecommerce_TIMEOUT_S + " s")
              : "clock stopped",
            flag: !started ? "idle"
              : r.dbWaitS >= sddesignecommerce_TIMEOUT_S ? "bad"
              : r.dbWaitS > 0.5 ? "warn" : "ok"
          })
        ])
      ]);

      // ---- the edge ------------------------------------------------------
      var edgeRows = [];
      if (isFlash) {
        edgeRows.push({ label: "arrived this frame",
          value: sddesignecommerce_n(r.arr) + "  ·  " +
            sddesignecommerce_n(r.rate) + "/s" });
        edgeRows.push({ label: "admitted", value: sddesignecommerce_n(r.fAtt + r.fEdge) +
          " / " + sddesignecommerce_n(sddesignecommerce_ADMIT_CAP), flag: "ok" });
        edgeRows.push({ label: "Redis counter",
          value: sddesignecommerce_n(r.redis) + " / " +
            sddesignecommerce_n(sddesignecommerce_STOCK),
          flag: r.redis > 0 ? "ok" : "warn" });
        edgeRows.push({ label: "rejected at the edge this frame",
          value: sddesignecommerce_n(r.fEdge),
          flag: r.fEdge ? "warn" : "idle" });
        edgeRows.push({ label: "still in the waiting room",
          value: sddesignecommerce_n(r.wr) + "  ·  ETA " + r.wrEtaS.toFixed(1) + " s",
          flag: r.wr ? "warn" : "ok" });
      } else {
        edgeRows.push({ label: "arrived this frame",
          value: sddesignecommerce_n(r.arr) + "  ·  " +
            sddesignecommerce_n(r.rate) + "/s" });
        edgeRows.push({ label: "row can retire",
          value: sddesignecommerce_n(sddesignecommerce_ROW_CAP) + " this frame",
          flag: "ok" });
        edgeRows.push({ label: "queued on the row",
          value: sddesignecommerce_n(r.queue) + " / " +
            sddesignecommerce_n(sddesignecommerce_QCAP),
          flag: r.queue >= sddesignecommerce_QCAP ? "bad" : r.queue ? "warn" : "ok" });
        edgeRows.push({ label: "shed this frame · 504",
          value: sddesignecommerce_n(r.fShed),
          flag: r.fShed ? "bad" : "idle" });
        edgeRows.push({ label: "shed in total",
          value: sddesignecommerce_n(r.shed),
          flag: r.shed ? "bad" : "idle" });
      }

      var edge = d.node({
        title: isFlash ? "edge · waiting room + Redis" : "edge · nothing in front of the row",
        status: !started ? "SALE NOT OPEN"
          : isFlash ? (r.redis > 0 ? "ADMITTING" : "REJECTING AT THE EDGE")
          : r.queue >= sddesignecommerce_QCAP ? "SHEDDING 504" : "QUEUEING",
        statusFlag: !started ? "idle"
          : isFlash ? "ok" : r.queue >= sddesignecommerce_QCAP ? "bad" : "warn",
        badge: isFlash
          ? sddesignecommerce_n(sddesignecommerce_ADMIT_QPS) + "/s admission"
          : "no admission control",
        meta: isFlash
          ? "a position in a queue, not a timeout"
          : "every shopper goes straight at the inventory row",
        flag: !started ? "idle" : isFlash ? "ok"
          : r.queue >= sddesignecommerce_QCAP ? "bad" : "warn",
        gauges: [{
          label: isFlash
            ? sddesignecommerce_BUCKETS + " buckets · " +
              sddesignecommerce_n(sddesignecommerce_SHARD_TPS) + "/s"
            : "one row · " + sddesignecommerce_n(sddesignecommerce_ROW_TPS) + "/s",
          pct: r.util,
          value: r.util.toFixed(0) + "%",
          flag: !started ? "idle" : r.util >= 99 ? "bad" : r.util >= 60 ? "warn" : "ok"
        }],
        rows: edgeRows
      });

      // ---- inventory -----------------------------------------------------
      var cells = [];
      for (i = 0; i < r.buckets.length; i++) {
        cells.push({
          label: String(r.buckets[i]),
          flag: r.buckets[i] < 0 ? "bad"
            : r.buckets[i] === 0 ? "idle"
            : r.buckets[i] < sddesignecommerce_PER_BUCKET / 2 ? "warn" : "ok",
          title: (isFlash ? "bucket " + i : "inventory row") + " · " +
            r.buckets[i] + " available" +
            (r.buckets[i] < 0 ? " — sold more than existed" : "")
        });
      }

      var inv = d.node({
        title: isFlash
          ? "inventory · sharded by bucket"
          : "inventory · one row for this SKU",
        status: !started ? "AVAILABLE"
          : r.stock < 0 ? "NEGATIVE"
          : r.stock === 0 ? "SOLD OUT" : "AVAILABLE",
        statusFlag: r.stock < 0 ? "bad" : r.stock === 0 ? "warn" : "ok",
        badge: r.mode === "naive"
          ? "guard in the application"
          : "WHERE available >= qty",
        meta: "product page still shows " +
          sddesignecommerce_n(sddesignecommerce_STOCK) +
          " — the cache TTL is minutes and this sale is " +
          (sddesignecommerce_FRAMES * sddesignecommerce_FRAME_S).toFixed(0) +
          " s long, so it never refreshes. Truth is established at reservation.",
        flag: r.stock < 0 ? "bad" : "ok",
        gauges: [{
          label: "units left",
          pct: sddesignecommerce_pct(Math.max(0, r.stock), sddesignecommerce_STOCK),
          value: sddesignecommerce_n(r.stock) + " / " +
            sddesignecommerce_n(sddesignecommerce_STOCK),
          flag: r.stock < 0 ? "bad" : r.stock === 0 ? "warn" : "ok"
        }],
        body: d.cells(cells, {
          label: isFlash
            ? sddesignecommerce_BUCKETS + " buckets of " +
              sddesignecommerce_PER_BUCKET + " — a checkout hashes to one"
            : "one row, one lock",
          dense: true
        })
      });

      // ---- the reservation state machine ---------------------------------
      var pay = d.node({
        title: "reservation → payment → order",
        status: !started ? "IDLE"
          : r.settling ? sddesignecommerce_n(r.settling) + " SETTLING" : "DRAINED",
        statusFlag: !started ? "idle" : r.heldPay ? "warn" : "ok",
        badge: "TTL " + sddesignecommerce_TTL_MIN + " min",
        meta: "reserve before charging; release a decline; never guess on a timeout",
        flag: !started ? "idle" : r.heldPay ? "warn" : "ok",
        rows: [
          { label: "reserved — awaiting payment",
            value: sddesignecommerce_n(r.reserved),
            flag: r.reserved ? "warn" : "idle" },
          { label: "sold — payment confirmed",
            value: sddesignecommerce_n(r.sold),
            flag: r.sold ? "ok" : "idle" },
          { label: "released — declined, stock returned",
            value: sddesignecommerce_n(r.released),
            flag: r.released ? "ok" : "idle" },
          { label: "held — outcome unknown, reconciling",
            value: sddesignecommerce_n(r.heldPay),
            flag: r.heldPay ? "warn" : "idle" },
          { label: "told sold out — correctly",
            value: sddesignecommerce_n(r.toldOut),
            flag: r.toldOut ? "warn" : "idle" },
          { label: isFlash ? "told sold out — untrue" : "created against stock that was gone",
            value: sddesignecommerce_n(isFlash ? r.falseSold : r.oversold),
            flag: (isFlash ? r.falseSold : r.oversold) ? "bad" : "ok" }
        ]
      });

      // ---- history --------------------------------------------------------
      var rows = [];
      var all = ctx.scenario.steps;
      for (i = 1; i <= (r.f + 1); i++) {
        var h = all[i].st;
        rows.push([
          h.t.toFixed(2) + " s",
          sddesignecommerce_n(h.arr),
          sddesignecommerce_n(h.fAtt),
          sddesignecommerce_n(h.fRes),
          sddesignecommerce_n(h.stock),
          sddesignecommerce_n(isFlash ? h.fFalse : h.fOver)
        ]);
      }

      var legend = r.mode === "naive"
        ? "Each cell is an inventory row; the number is <code>available</code>. " +
          "<b>A negative row is the bug</b> — orders that exist for units that do not, " +
          "created without a single error or a single slow query."
        : isFlash
          ? "One cell per bucket, showing units left. <b>Grey is an empty bucket</b>: a " +
            "checkout that hashes to it is told sold out even while other buckets hold " +
            "stock. That is the sharded-counter trade, and it is the reason the page " +
            "says the tension is the answer rather than the technique."
          : "One cell, one row, one lock. The correctness is perfect and the whole sale " +
            "funnels through " + sddesignecommerce_ROW_MS + " ms of it at a time — " +
            "including every checkout that is only going to be told no.";

      return d.stack([
        head,
        edge,
        inv,
        pay,
        rows.length
          ? d.table(
              ["t", "arrived", "to DB", "reserved", "stock",
                isFlash ? "false sold-out" : "oversold"],
              rows)
          : d.note("The sale has not opened yet.", "idle"),
        d.note(legend, r.oversold ? "bad" : r.falseSold ? "warn" : undefined)
      ]);
    }
  };

  // ====================================================================
  // ======================================================================
  // SIM · sddesignloggingmon  (design-logging-monitoring.md)
  //
  // The page's hardest requirement — "the system must survive the outage it
  // is reporting on" — only means anything against a clock. So the time axis
  // is one incident: eight one-minute frames, a datacentre degrading at
  // minute 3, and the same log storm crossing three builds of the same
  // pipeline. Every figure on screen is counted off that run.
  //
  // FROM THE PAGE (used verbatim):
  //   10,000 hosts                            section 1
  //   500 series/host, 10 s scrape            section 2 -> 5M series, 500k pts/s
  //   100 log lines/host/s at 500 B           section 2 -> 1M lines/s, 500 MB/s
  //   5M requests/s sampled at 1%             section 2 -> 50k spans/s
  //   5M events/s peak                        section 1 -> the gateway's size
  //   ~16 B/point raw, 1-2 B compressed       section 2
  //   10:1 log compression, 30 days           section 2 -> ~4 TB/day, ~120 TB
  //   13 months / 30 days / 7 days retention  section 3
  //   rule evaluation every 30 s              section 8
  //   burn rate: 14x over 1h pages, 2x over 6h tickets        section 8
  //   service 50 x region 10 x status 20 = 10,000 series      section 6
  //   x user_id (10,000,000) = 10^11 series                   section 6
  //
  // DECLARED HERE, because the page does not state them:
  //   compressed point      1.2 B    inside the page's 1-2 B band; it is the
  //                                  value that reproduces its ~50 GB/day
  //   consumer headroom     1.3x     over the 1.55M events/s steady rate
  //   agent buffers         8 MiB memory + 32 MiB disk per host
  //   TSDB head             64 GiB at 3 KB per active series
  //   lines per stack trace 4        turns the log storm into an error rate
  //   SLO                   99.9%    so the error budget is 0.1%
  //   datacentres           3        so one failing takes 3,333 hosts
  //   dead-man's switch     180 s of missed heartbeats
  //   request timeout       30 s
  //   log storm             x1, 1, 3, 12, 12, 5, 1.5, 0.8 per frame
  //   per-tenant series cap 1.2x the 5M baseline = 6M series
  //
  // Nothing else is typed. Consumer lag, burn rate, drop counts, series
  // counts and the minute each alert fires are all accumulated by the run.
  // ======================================================================
  var sddesignloggingmon_C = {
    HOSTS: 10000,               // page
    SERIES_HOST: 500,           // page
    SCRAPE_S: 10,               // page
    LINES_HOST_S: 100,          // page
    LINE_B: 500,                // page
    POINT_RAW_B: 16,            // page
    POINT_COMP_B: 1.2,          // declared, inside the page's 1-2 B band
    LOG_COMPRESS: 10,           // page, "~10:1"
    REQ_S: 5e6,                 // page
    SAMPLE: 0.01,               // page
    PEAK_EVENTS: 5e6,           // page, "5M events/s peak"
    METRIC_RET_MO: 13,          // page
    LOG_RET_D: 30,              // page
    TRACE_RET_D: 7,             // page
    HOT_D: 7,                   // page
    EVAL_S: 30,                 // page
    BURN_PAGE: 14,              // page
    BURN_PAGE_WIN: 60,          // page, one hour, in minutes
    BURN_TICKET: 2,             // page
    BURN_TICKET_WIN: 360,       // page, six hours, in minutes
    LBL_SERVICE: 50,            // page
    LBL_REGION: 10,             // page
    LBL_STATUS: 20,             // page
    USERS: 1e7,                 // page
    HEADROOM: 1.3,              // declared
    AGENT_MEM_MIB: 8,           // declared
    AGENT_DISK_MIB: 32,         // declared
    TSDB_MEM_GB: 64,           // declared
    SERIES_MEM_B: 3000,         // declared
    LINES_PER_ERROR: 4,         // declared
    SLO: 0.999,                 // declared
    DATACENTRES: 3,             // declared
    DEADMAN_S: 180,             // declared
    REQ_TIMEOUT_S: 30,          // declared
    CAP_MULT: 1.2,              // declared
    FRAME_S: 60,
    FRAMES: 8,
    LOG_MULT: [1, 1, 3, 12, 12, 5, 1.5, 0.8]
  };

  var sddesignloggingmon_D = (function () {
    var C = sddesignloggingmon_C;
    var o = {};
    o.BASE_SERIES = C.HOSTS * C.SERIES_HOST;                 // 5,000,000
    o.POINTS_S = o.BASE_SERIES / C.SCRAPE_S;                 // 500,000
    o.LOG_S = C.HOSTS * C.LINES_HOST_S;                      // 1,000,000
    o.LOG_BPS = o.LOG_S * C.LINE_B;                          // 500 MB/s
    o.SPANS_S = C.REQ_S * C.SAMPLE;                          // 50,000
    o.STEADY = o.POINTS_S + o.LOG_S + o.SPANS_S;             // 1,550,000
    o.CONSUME_CAP = o.STEADY * C.HEADROOM;                   // 2,015,000
    o.CAP_M = o.POINTS_S * C.HEADROOM;                       // 650,000
    o.CAP_T = o.SPANS_S * C.HEADROOM;                        // 65,000
    o.CAP_L = o.CONSUME_CAP - o.CAP_M - o.CAP_T;             // 1,300,000
    o.GW_CAP = C.PEAK_EVENTS;                                // 5,000,000
    o.GW_LOG = o.GW_CAP - o.POINTS_S - o.SPANS_S;            // 4,450,000
    o.AGENT_MEM_LINES = C.HOSTS * C.AGENT_MEM_MIB * 1048576 / C.LINE_B;
    o.AGENT_DISK_LINES = C.HOSTS * C.AGENT_DISK_MIB * 1048576 / C.LINE_B;
    o.AGENT_BUF_LINES = o.AGENT_MEM_LINES + o.AGENT_DISK_LINES;
    o.TSDB_MEM_B = C.TSDB_MEM_GB * 1e9;
    o.TSDB_SERIES_CAP = o.TSDB_MEM_B / C.SERIES_MEM_B;
    o.SERIES_CAP = o.BASE_SERIES * C.CAP_MULT;               // 6,000,000
    o.BUDGET = 1 - C.SLO;                                    // 0.001
    o.DC_HOSTS = Math.round(C.HOSTS / C.DATACENTRES);        // 3,333
    o.CARD_BASE = C.LBL_SERVICE * C.LBL_REGION * C.LBL_STATUS;      // 10,000
    o.CARD_CEIL = o.CARD_BASE * C.USERS;                            // 1e11
    o.METRIC_RAW_DAY = o.POINTS_S * C.POINT_RAW_B * 86400;
    o.METRIC_COMP_DAY = o.POINTS_S * C.POINT_COMP_B * 86400;
    o.LOG_RAW_DAY = o.LOG_BPS * 86400;
    o.LOG_COMP_DAY = o.LOG_RAW_DAY / C.LOG_COMPRESS;
    o.LOG_TOTAL = o.LOG_COMP_DAY * C.LOG_RET_D;
    o.SPANS_DAY = o.SPANS_S * 86400;
    return o;
  })();

  function sddesignloggingmon_trim(s) {
    if (s.indexOf(".") < 0) return s;
    return s.replace(/0+$/, "").replace(/\.$/, "");
  }
  function sddesignloggingmon_k(n) {
    if (!isFinite(n)) return "—";
    var a = Math.abs(n), t = sddesignloggingmon_trim;
    if (a >= 1e9) return t((n / 1e9).toFixed(a >= 1e10 ? 0 : 2)) + "B";
    if (a >= 1e6) return t((n / 1e6).toFixed(a >= 1e7 ? 1 : 2)) + "M";
    if (a >= 1e3) return t((n / 1e3).toFixed(a >= 1e4 ? 0 : 1)) + "k";
    return String(Math.round(n));
  }
  function sddesignloggingmon_bytes(b) {
    if (!isFinite(b)) return "—";
    if (b >= 1e12) return (b / 1e12).toFixed(b >= 1e13 ? 0 : 1) + " TB";
    if (b >= 1e9) return (b / 1e9).toFixed(b >= 1e10 ? 0 : 1) + " GB";
    if (b >= 1e6) return (b / 1e6).toFixed(0) + " MB";
    return Math.round(b) + " B";
  }
  function sddesignloggingmon_secs(s) {
    if (!isFinite(s)) return "no data";
    if (s < 1) return "0 s";
    if (s < 60) return Math.round(s) + " s";
    var m = Math.floor(s / 60);
    return m + "m " + Math.round(s - m * 60) + "s";
  }
  function sddesignloggingmon_pct(a, b) { return b > 0 ? (a / b) * 100 : 0; }
  function sddesignloggingmon_p1(x) { return (isFinite(x) ? x : 0).toFixed(1) + "%"; }
  function sddesignloggingmon_clock(f) {
    var s = (f + 1) * sddesignloggingmon_C.FRAME_S;
    if (f < 0) s = 0;
    return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  }
  function sddesignloggingmon_x(v) {
    if (!isFinite(v)) return "—";
    return (v >= 100 ? v.toFixed(0) : v.toFixed(v >= 10 ? 1 : 2)) + "×";
  }

  /** Mean burn rate over a window, in minutes, of the samples that ACTUALLY
   *  landed. Minutes before the run are at the SLO baseline, so 1x. */
  function sddesignloggingmon_burnWin(hist, landed, winMin) {
    var lt = Math.max(0, Math.min(landed, hist.length));
    var s = 0, k;
    for (k = 0; k < lt; k++) s += hist[k];
    if (winMin > lt) s += (winMin - lt) * 1;
    var n = Math.max(winMin, lt);
    return n > 0 ? s / n : 1;
  }

  /** Distinct members seen after N draws from a population of P. */
  function sddesignloggingmon_distinct(events, pop) {
    if (pop <= 0) return 0;
    return pop * (1 - Math.exp(-events / pop));
  }

  // ----------------------------------------------------------------------
  // The run. One incident, one config, eight one-minute frames.
  //   cfg.split       three pipelines with their own capacity, or one queue
  //   cfg.kafka       a durable buffer between gateway and store
  //   cfg.block       the agent blocks the application rather than dropping
  //   cfg.cardinality a deploy adds user_id as a label at minute 2
  //   cfg.group       dedupe / group / inhibit before notifying
  // ----------------------------------------------------------------------
  function sddesignloggingmon_run(cfg) {
    var C = sddesignloggingmon_C, D = sddesignloggingmon_D;
    var frames = [], hist = [];
    var shared = 0, kafka = 0, agentBuf = 0, shed = 0, logOffered = 0;
    var sightings = 0, errEvents = 0;
    var series = D.BASE_SERIES, deadAt = -1;
    var pageAt = -1, ticketAt = -1, dmsAt = -1, pendingAt = -1;
    var f;

    for (f = 0; f < C.FRAMES; f++) {
      var mult = C.LOG_MULT[f];
      var logs = D.LOG_S * mult;
      var pts = D.POINTS_S, spans = D.SPANS_S;
      var offered = pts + logs + spans;
      logOffered += logs * C.FRAME_S;

      // The storm IS the incident: every line above the steady rate is an
      // error line, four lines to a stack trace.
      var extra = Math.max(0, logs - D.LOG_S);
      var errS = extra / C.LINES_PER_ERROR;
      var errRate = Math.max(D.BUDGET, errS / C.REQ_S);
      var burn = errRate / D.BUDGET;
      hist.push(burn);

      var mLanded, lLanded, tLanded, mLag, lLag, gwShed = 0, blocking = false;

      if (!cfg.split) {
        // One queue, one consumer pool, FIFO. Everything shares one lag.
        shared = Math.max(0, shared + (offered - D.CONSUME_CAP) * C.FRAME_S);
        var share = offered > D.CONSUME_CAP ? D.CONSUME_CAP / offered : 1;
        mLanded = pts * share; lLanded = logs * share; tLanded = spans * share;
        mLag = shared / D.CONSUME_CAP;
        lLag = mLag;
        blocking = cfg.block && shared > D.AGENT_MEM_LINES;
      } else {
        // Metrics and traces get their own capacity and never queue behind
        // the storm. The gateway admits them first, then logs.
        mLanded = Math.min(pts, D.CAP_M);
        tLanded = Math.min(spans, D.CAP_T);
        mLag = 0;
        var admit = Math.min(logs, D.GW_LOG);
        var spare = Math.max(0, D.GW_LOG - logs);
        var drain = Math.min(agentBuf, spare * C.FRAME_S);
        agentBuf -= drain;
        agentBuf += Math.max(0, logs - D.GW_LOG) * C.FRAME_S;
        if (agentBuf > D.AGENT_BUF_LINES) {
          gwShed = agentBuf - D.AGENT_BUF_LINES;
          shed += gwShed;
          agentBuf = D.AGENT_BUF_LINES;
        }
        kafka = Math.max(0, kafka + admit * C.FRAME_S + drain - D.CAP_L * C.FRAME_S);
        lLanded = Math.min(admit + kafka / C.FRAME_S, D.CAP_L);
        lLag = kafka / D.CAP_L;
      }

      // The one-line code change, and what the incident does to it.
      var deploy = !!cfg.cardinality && f >= 1;
      var newUser = 0, newErr = 0;
      if (deploy && deadAt < 0) {
        var beforeU = sddesignloggingmon_distinct(sightings, C.USERS);
        sightings += C.REQ_S * C.FRAME_S;
        newUser = sddesignloggingmon_distinct(sightings, C.USERS) - beforeU;
        var beforeE = sddesignloggingmon_distinct(errEvents, C.USERS);
        errEvents += errS * C.FRAME_S;
        newErr = sddesignloggingmon_distinct(errEvents, C.USERS) - beforeE;
        series += newUser + newErr;
      }
      var mem = series * C.SERIES_MEM_B;
      if (deadAt < 0 && mem > D.TSDB_MEM_B) deadAt = f;
      var dead = deadAt >= 0 && f >= deadAt;
      if (dead) { mLanded = 0; mLag = Infinity; }

      // What the alerting rule can actually see.
      var landed;
      if (dead) landed = deadAt;
      else if (!isFinite(mLag)) landed = 0;
      else landed = (f + 1) - Math.ceil(mLag / C.FRAME_S);
      var b1 = sddesignloggingmon_burnWin(hist, landed, C.BURN_PAGE_WIN);
      var b6 = sddesignloggingmon_burnWin(hist, landed, C.BURN_TICKET_WIN);
      if (pendingAt < 0 && landed >= f + 1 && burn >= C.BURN_PAGE) pendingAt = f;
      if (ticketAt < 0 && b6 >= C.BURN_TICKET) ticketAt = f;
      if (pageAt < 0 && b1 >= C.BURN_PAGE) pageAt = f;
      if (dead && dmsAt < 0 && (f - deadAt) * C.FRAME_S >= C.DEADMAN_S) dmsAt = f;

      var state = "OK", sFlag = "ok";
      if (dmsAt >= 0 && f >= dmsAt) { state = "DEAD-MAN"; sFlag = "bad"; }
      else if (dead) { state = "BLIND"; sFlag = "bad"; }
      else if (pageAt >= 0 && f >= pageAt) { state = "PAGING"; sFlag = "warn"; }
      else if (ticketAt >= 0 && f >= ticketAt) { state = "TICKET"; sFlag = "warn"; }
      else if (pendingAt >= 0 && f >= pendingAt) { state = "PENDING"; sFlag = "warn"; }

      // Notification fan-out on the firing frame.
      var raw = D.DC_HOSTS + C.LBL_SERVICE + 1;
      var pages = cfg.group ? 1 : raw;

      frames.push({
        f: f, mult: mult, offered: offered, pts: pts, logs: logs, spans: spans,
        mLanded: mLanded, lLanded: lLanded, tLanded: tLanded,
        mLag: mLag, lLag: lLag, blocking: blocking,
        agentBuf: agentBuf, shed: shed, gwShed: gwShed, kafka: kafka,
        shared: shared, logOffered: logOffered,
        errRate: errRate, burn: burn, b1: b1, b6: b6, landed: landed,
        deploy: deploy, series: series, mem: mem, newUser: newUser, newErr: newErr,
        dead: dead, deadAt: deadAt, state: state, sFlag: sFlag,
        pages: pages, rawAlerts: raw,
        pageAt: pageAt, ticketAt: ticketAt, dmsAt: dmsAt, pendingAt: pendingAt,
        cfg: cfg
      });
    }

    var sum = [], i;
    for (i = 0; i < frames.length; i++) {
      sum.push({
        mLag: frames[i].mLag, lLag: frames[i].lLag,
        b1: frames[i].b1, burn: frames[i].burn, state: frames[i].state
      });
    }
    for (i = 0; i < frames.length; i++) frames[i].sum = sum;
    frames.totals = {
      shed: shed, logOffered: logOffered, agentBuf: agentBuf, kafka: kafka,
      pageAt: pageAt, ticketAt: ticketAt, dmsAt: dmsAt, deadAt: deadAt,
      series: series, mem: series * C.SERIES_MEM_B
    };
    return frames;
  }

  // ----------------------------------------------------------------------
  function sddesignloggingmon_scenario(cfg) {
    var C = sddesignloggingmon_C, D = sddesignloggingmon_D;
    var k = sddesignloggingmon_k, secs = sddesignloggingmon_secs;
    var by = sddesignloggingmon_bytes, xx = sddesignloggingmon_x;
    var R = sddesignloggingmon_run(cfg);
    var T = R.totals;
    var steps = [{ f: -1, sum: R[0].sum, cfg: cfg, caption: cfg.blurb, flag: "idle" }];
    var i;

    for (i = 0; i < R.length; i++) {
      var fr = R[i], prev = i ? R[i - 1] : null, cap;
      var mlost = fr.pts - fr.mLanded;

      if (!cfg.split) {
        // ---------------- one pipeline, blocking agent ------------------
        if (i === 0) {
          cap = "<b>Minute 1, steady state.</b> " + k(fr.offered) + " events/s into one " +
            "queue and one consumer pool sized at " + k(D.CONSUME_CAP) + "/s — " +
            C.HEADROOM.toFixed(1) + "× the steady rate. Lag <b>0 s</b>, burn rate <b>" +
            xx(fr.b1) + "</b>, everything landed. Nothing about this frame is wrong, which " +
            "is the problem: a shared pipeline looks identical to a split one until the " +
            "moment it matters.";
        } else if (i === 1) {
          cap = "<b>Minute 2.</b> Still " + k(fr.offered) + " events/s, still no lag. The " +
            "three signals are interleaved in one topic, so the " + k(fr.pts) +
            " metric points a second are sitting in the same FIFO as the " + k(fr.logs) +
            " log lines. <b>Order of arrival is the only priority this build has.</b>";
        } else if (i === 2) {
          cap = "<b>Minute 3 — a datacentre degrades.</b> " +
            sddesignloggingmon_p1(fr.errRate * 100) + " of requests are failing, so the log " +
            "rate goes to <b>" + fr.mult + "×</b> and offered load is <b>" +
            k(fr.offered) + "/s</b> against " + k(D.CONSUME_CAP) + "/s of consumers. " +
            "The queue starts filling: <b>" + k(fr.shared) + "</b> events backed up, lag <b>" +
            secs(fr.mLag) + "</b>. True burn rate is <b>" + xx(fr.burn) +
            "</b> — far past the page's " + C.BURN_PAGE + "× page threshold — so the " +
            "rule goes <b>PENDING</b>. Note the windowed figure though: <b>" + xx(fr.b1) +
            "</b>. One minute of 100× burn inside a one-hour window is only " +
            xx(fr.b1) + ", and that smoothing is deliberate.";
        } else if (i === 3) {
          cap = "<b>Minute 4 — the storm, and the pipeline inverts.</b> " + fr.mult +
            "× logs put <b>" + k(fr.offered) + "/s</b> into a " + k(D.CONSUME_CAP) +
            "/s pool, so each signal gets its arrival share: metrics land at <b>" +
            k(fr.mLanded) + "/s</b> of " + k(fr.pts) + ". Backlog <b>" + k(fr.shared) +
            "</b> events, lag <b>" + secs(fr.mLag) + "</b>. The agent buffer (" +
            C.AGENT_MEM_MIB + " MiB/host = " + k(D.AGENT_MEM_LINES) + " lines fleet-wide) " +
            "filled " + secs(D.AGENT_MEM_LINES / (fr.offered - D.CONSUME_CAP)) +
            " in, so <b>the agent is now blocking</b>: a log call waits " + secs(fr.mLag) +
            " for a slot against a " + C.REQ_TIMEOUT_S + " s request timeout, at <b>" +
            (fr.offered / C.REQ_S).toFixed(2) + " events per request</b>. " +
            "<i>The monitoring agent is the outage now.</i>";
        } else if (i === 4) {
          cap = "<b>Minute 5 — peak, and the rule has gone quiet.</b> Lag <b>" +
            secs(fr.mLag) + "</b>. The newest metric sample the alerting engine can read is " +
            secs(fr.mLag) + " old, so its one-hour window contains <b>no data at all</b> " +
            "from the incident. True burn is <b>" + xx(fr.burn) + "</b>; the rule computes <b>" +
            xx(fr.b1) + "</b> and stays silent. This is the page's sentence made literal: " +
            "<b>a missing metric looks exactly like a healthy one.</b>";
        } else if (i === 5) {
          cap = "<b>Minute 6 — the incident is easing, the pipeline is not.</b> Logs down to " +
            fr.mult + "×, offered " + k(fr.offered) + "/s, still above the " +
            k(D.CONSUME_CAP) + "/s pool. Backlog <b>" + k(fr.shared) + "</b>, lag <b>" +
            secs(fr.mLag) + "</b> and still climbing. Once the storm ends this pool has " +
            k(D.CONSUME_CAP - D.STEADY) + "/s of spare capacity to drain with — the " +
            ((C.HEADROOM - 1) * 100).toFixed(0) + "% headroom it was provisioned with — " +
            "so clearing what is already queued takes <b>" +
            secs(fr.shared / (D.CONSUME_CAP - D.STEADY)) + "</b>.";
        } else if (i === 6) {
          cap = "<b>Minute 7.</b> Offered " + k(fr.offered) + "/s has dropped under the pool " +
            "at last, but the backlog is <b>" + k(fr.shared) + "</b> events and the lag is " +
            "<b>" + secs(fr.mLag) + "</b>. Traces are " + secs(fr.mLag) + " late too, and so " +
            "are the logs — <b>one queue means one lag</b>, so the cheap signal you needed " +
            "in real time and the expensive one you needed in an hour arrive together, late.";
        } else {
          cap = "<b>Eight minutes, and nobody was paged.</b> The incident peaked at <b>" +
            xx(R[4].burn) + "</b> the error budget — " +
            sddesignloggingmon_p1(R[4].errRate * 100) + " of " + k(C.REQ_S) +
            " requests a second failing — and the rule's one-hour burn never rose above <b>" +
            xx(Math.max.apply(null, [R[0].b1, R[1].b1, R[2].b1, R[3].b1, R[4].b1, R[5].b1,
              R[6].b1, R[7].b1])) + "</b>, because from minute 4 onward there was no data in " +
            "the window to compute it from. Meanwhile the blocking agent held every log " +
            "call for up to <b>" + secs(R[6].mLag) + "</b>, past the " + C.REQ_TIMEOUT_S +
            " s request timeout. <b>Two failures from one decision:</b> sharing a pipeline " +
            "let the cheapest signal starve the one alerting depends on, and blocking " +
            "instead of dropping turned an incident into a second incident. Backlog still " +
            "standing: " + k(fr.shared) + " events, " + secs(fr.mLag) + " behind.";
        }
        fr.flag = i < 2 ? "ok" : fr.blocking ? "bad" : "warn";
      } else if (!cfg.cardinality) {
        // ---------------- three pipelines, Kafka, drop-not-block --------
        if (i === 0) {
          cap = "<b>Minute 1, steady state.</b> Same " + k(fr.offered) + " events/s, same " +
            k(D.CONSUME_CAP) + "/s of consumers — but split by signal at the same " +
            C.HEADROOM.toFixed(1) + "× headroom each: <b>" + k(D.CAP_M) +
            "/s metrics, " + k(D.CAP_L) + "/s logs, " + k(D.CAP_T) +
            "/s traces</b>. Identical hardware, three budgets instead of one queue.";
        } else if (i === 1) {
          cap = "<b>Minute 2.</b> Nothing has changed and nothing is supposed to. The point " +
            "of the split is invisible until a signal misbehaves — which is exactly why " +
            "it has to be a structural decision rather than something you add during the " +
            "incident.";
        } else if (i === 2) {
          cap = "<b>Minute 3 — the same datacentre degrades.</b> Logs go to <b>" + fr.mult +
            "×</b>, " + k(fr.logs) + "/s against a " + k(D.CAP_L) + "/s log consumer, " +
            "so <b>Kafka starts absorbing</b>: " + k(fr.kafka) + " lines buffered, log lag " +
            secs(fr.lLag) + ". Metrics are untouched — " + k(fr.mLanded) + "/s of " +
            k(fr.pts) + " landed, lag <b>0 s</b> — so the rule sees the real burn of <b>" +
            xx(fr.burn) + "</b> and goes <b>PENDING</b>. The one-hour window reads " +
            xx(fr.b1) + " so far.";
        } else if (i === 3) {
          cap = "<b>Minute 4 — the gateway starts refusing, and the first alert opens.</b> " +
            fr.mult + "× logs is " + k(fr.logs) + "/s against the " + k(D.GW_CAP) +
            "/s the page provisions for; metrics and traces are admitted first, so logs get " +
            k(D.GW_LOG) + "/s and the rest is <b>429'd back to the agents</b>, which buffer " +
            k(fr.agentBuf) + " lines to memory and disk. Metrics still land in full. " +
            "Six-hour burn crosses the page's <b>" + C.BURN_TICKET + "×</b> at <b>" +
            xx(fr.b6) + "</b> — <b>a ticket, not a page</b>. The one-hour window is " +
            xx(fr.b1) + ", still under " + C.BURN_PAGE + "×.";
        } else if (i === 4) {
          cap = "<b>Minute 5 — the page fires, and the agents start dropping.</b> One-hour " +
            "burn reaches <b>" + xx(fr.b1) + "</b> and crosses " + C.BURN_PAGE +
            "×. That is two minutes after the instantaneous burn hit " + xx(R[2].burn) +
            " — the window <i>is</i> the <code>for</code> duration, and it is what stops a " +
            "30-second blip paging anyone. The agents are full at <b>" + k(D.AGENT_BUF_LINES) +
            "</b> lines (" + C.AGENT_MEM_MIB + " MiB memory + " + C.AGENT_DISK_MIB +
            " MiB disk per host) so they shed the oldest low-priority lines: <b>" +
            k(fr.gwShed) + " dropped this minute, and counted.</b>";
        } else if (i === 5) {
          cap = "<b>Minute 6 — one page, not " + k(fr.rawAlerts) + ".</b> The failing " +
            "datacentre holds " + k(D.DC_HOSTS) + " of the " + k(C.HOSTS) + " hosts, and " +
            C.LBL_SERVICE + " services run on them, so the raw alert count is <b>" +
            k(fr.rawAlerts) + "</b> instances of three rules. Dedupe collapses the host " +
            "copies, grouping merges what is left into one notification, and inhibition " +
            "drops the " + C.LBL_SERVICE + " service alerts the datacentre alert caused. " +
            "<b>" + fr.pages + " notification.</b> " + k(fr.shed) + " log lines shed so far.";
        } else if (i === 6) {
          cap = "<b>Minute 7 — recovery, and the lag that does not matter.</b> Logs are back " +
            "under the gateway limit, so the agents drain " +
            k(Math.max(0, prev.agentBuf - fr.agentBuf)) + " buffered lines this minute. " +
            "Kafka holds <b>" + k(fr.kafka) + "</b> lines — " + by(fr.kafka * C.LINE_B) +
            " — and the search index is <b>" + secs(fr.lLag) + " behind</b>. " +
            "<i>Nobody is waiting on it.</i> Metric lag has been <b>0 s</b> for eight " +
            "straight minutes, which is the only lag the page's alerting depends on.";
        } else {
          cap = "<b>Paged at minute " + (T.pageAt + 1) + ", ticketed at minute " +
            (T.ticketAt + 1) + ", " + sddesignloggingmon_p1(
              sddesignloggingmon_pct(T.shed, T.logOffered)) + " of log lines dropped and " +
            "every one counted.</b> " + k(T.shed) + " of " + k(T.logOffered) +
            " lines went in the bin so that " + k(C.REQ_S) + " requests a second never " +
            "waited on a log write — the page's trade, taken explicitly. The log index is " +
            "still <b>" + secs(fr.lLag) + "</b> behind with " + k(fr.agentBuf) +
            " lines queued on agent disks, and that is the correct thing to be behind on. " +
            "<b>Same hardware as the first tab.</b> The difference is that capacity was " +
            "divided by signal before the incident, and the agent was told to drop rather " +
            "than block.";
        }
        fr.flag = i < 2 ? "ok" : fr.gwShed > 0 ? "warn" : "ok";
        if (i >= (T.pageAt >= 0 ? T.pageAt : 99)) fr.flag = "ok";
      } else {
        // ---------------- the one-line code change ----------------------
        if (i === 0) {
          cap = "<b>Minute 1.</b> The engineered pipeline from the previous tab, unchanged: " +
            "three consumers, Kafka in the middle, agents that drop and count. <b>" +
            k(fr.series) + " active series</b> — " + k(C.HOSTS) + " hosts × " +
            C.SERIES_HOST + " — at " + (C.SERIES_MEM_B / 1000) + " KB of index and head " +
            "chunk each, so <b>" + by(fr.mem) + "</b> of the TSDB's " +
            by(D.TSDB_MEM_B) + ". Comfortable.";
        } else if (i === 1) {
          cap = "<b>Minute 2 — a deploy ships one extra label.</b> <code>user_id</code> is " +
            "added to <code>http_requests</code>. Every request carries a user, so at " +
            k(C.REQ_S) + " requests a second the fleet sees <b>" + k(fr.newUser) +
            " distinct users</b> inside this one minute and mints a series for each. Active " +
            "series: " + k(D.BASE_SERIES) + " → <b>" + k(fr.series) + "</b>. Memory <b>" +
            by(fr.mem) + " of " + by(D.TSDB_MEM_B) + "</b> — " +
            sddesignloggingmon_p1(sddesignloggingmon_pct(fr.mem, D.TSDB_MEM_B)) +
            ". <b>Nothing has broken.</b> Dashboards are fine, alerts are fine, the change " +
            "passed review. The bomb is armed, not lit.";
        } else if (i === 2) {
          cap = "<b>Minute 3 — the incident lights it.</b> The same datacentre degrades, " +
            sddesignloggingmon_p1(fr.errRate * 100) + " of requests start returning 5xx, " +
            "and every user who sees their <i>first</i> error mints another series — same " +
            "user, new <code>status</code>. <b>" + k(fr.newErr) + " new series in sixty " +
            "seconds.</b> Total <b>" + k(fr.series) + "</b>, needing <b>" + by(fr.mem) +
            "</b> against " + by(D.TSDB_MEM_B) + ". The head block will not fit. <b>The " +
            "time-series database OOMs</b>, replays its WAL, recreates the same series and " +
            "OOMs again.";
        } else if (i === 3) {
          cap = "<b>Minute 4 — blind.</b> Metric ingest is <b>0/s</b>. The alerting engine " +
            "is healthy, its rules are correct, and it has nothing to evaluate: one-hour " +
            "burn reads <b>" + xx(fr.b1) + "</b> against a true <b>" + xx(fr.burn) +
            "</b>. Look at the other two columns though — <b>logs and traces are fine</b>, " +
            k(fr.lLanded) + "/s still landing, Kafka absorbing the storm exactly as before. " +
            "Separate pipelines meant the cardinality bomb took <i>one</i> of them.";
        } else if (i === 4) {
          cap = "<b>Minute 5 — the peak nobody can see.</b> " +
            sddesignloggingmon_p1(fr.errRate * 100) + " of " + k(C.REQ_S) +
            " requests a second are failing, <b>" + xx(fr.burn) + "</b> the error budget. " +
            "In the previous tab this was the minute the page fired. Here the on-call's " +
            "dashboard shows a flat line, which reads as <i>healthy</i> — the failure mode " +
            "the page calls out by name. Log search still works, but nothing has told " +
            "anyone to go and search.";
        } else if (i === 5) {
          cap = "<b>Minute 6 — the dead-man's switch fires.</b> An external service outside " +
            "this failure domain has not had a heartbeat for <b>" + C.DEADMAN_S +
            " s</b>, so it pages: not <i>your service is broken</i> but <b>your monitoring " +
            "has stopped reporting</b>. That is the only alert this build produces, it is " +
            "three minutes late, and it is the difference between a bad night and a silent " +
            "one. <b>Silence is the dangerous failure, not an error.</b>";
        } else if (i === 6) {
          cap = "<b>Minute 7 — the incident recovers on its own.</b> Error rate back to " +
            sddesignloggingmon_p1(fr.errRate * 100) + ", logs draining, and the TSDB still " +
            "crash-looping on <b>" + k(fr.series) + "</b> series needing " + by(fr.mem) +
            ". Restarting it does not help: the WAL rebuilds the same index. The fix is to " +
            "delete the label and drop the blocks, and the outage lasts as long as that " +
            "takes.";
        } else {
          var kept = Math.min(fr.series, D.SERIES_CAP);
          var rejected = fr.series - kept;
          cap = "<b>One label, one database, no alerts for eight minutes.</b> " +
            k(fr.series) + " active series at " + (C.SERIES_MEM_B / 1000) + " KB each is " +
            by(fr.mem) + " against a " + by(D.TSDB_MEM_B) + " head — and that is only the " +
            "users seen in two minutes. The page's ceiling for this one metric is " +
            C.LBL_SERVICE + " × " + C.LBL_REGION + " × " + C.LBL_STATUS +
            " × " + k(C.USERS) + " = <b>" + k(D.CARD_CEIL) + " series</b>, which at " +
            "this footprint is " + by(D.CARD_CEIL * C.SERIES_MEM_B) + " of index — <b>" +
            Math.ceil(D.CARD_CEIL * C.SERIES_MEM_B / D.TSDB_MEM_B).toLocaleString("en-US") +
            " machines</b> for one metric. <b>The per-tenant cap is the whole fix:</b> at " +
            k(D.SERIES_CAP) + " series (" + C.CAP_MULT.toFixed(1) + "× the " +
            k(D.BASE_SERIES) + " baseline) ingest rejects <b>" + k(rejected) +
            "</b> new series and alerts on the rejection, the " + k(D.BASE_SERIES) +
            " real series keep flowing, memory holds at " + by(kept * C.SERIES_MEM_B) +
            ", and the page fires at minute " + (sddesignloggingmon_run({
              split: true, kafka: true, block: false, group: true
            }).totals.pageAt + 1) + " exactly as in the previous tab. <i>And the honest " +
            "answer is still that per-user data belongs in traces.</i>";
        }
        fr.flag = i === 0 ? "ok" : i === 1 ? "warn" : "bad";
      }
      fr.caption = cap;
      steps.push(fr);
    }
    return { id: cfg.id, label: cfg.label, steps: steps };
  }

  // ======================================================================
  S["sddesignloggingmon"] = {
    title: "Run one incident through three builds of the pipeline",
    note: (function () {
      var C = sddesignloggingmon_C, D = sddesignloggingmon_D;
      var k = sddesignloggingmon_k, by = sddesignloggingmon_bytes;
      return "The page's own estimation, run against a clock. " + k(C.HOSTS) +
        " hosts: " + C.SERIES_HOST + " series each scraped every " + C.SCRAPE_S + " s = <b>" +
        k(D.POINTS_S) + " points/s</b>; " + C.LINES_HOST_S + " log lines/s each at " +
        C.LINE_B + " B = <b>" + k(D.LOG_S) + " lines/s</b>; " + k(C.REQ_S) +
        " requests/s sampled at " + (C.SAMPLE * 100).toFixed(0) + "% = <b>" + k(D.SPANS_S) +
        " spans/s</b>. That is " + k(D.STEADY) + " events/s steady against the page's <b>" +
        k(C.PEAK_EVENTS) + " events/s peak</b>, which is what the ingest gateway is sized " +
        "for. Consumers are provisioned at " + C.HEADROOM.toFixed(1) +
        "× steady = " + k(D.CONSUME_CAP) + "/s, split per signal in the last two tabs " +
        "(" + k(D.CAP_M) + " metrics / " + k(D.CAP_L) + " logs / " + k(D.CAP_T) +
        " traces). Eight one-minute frames; rules evaluate every " + C.EVAL_S +
        " s and page at the page's <b>" + C.BURN_PAGE + "× over 1h</b>, ticket at <b>" +
        C.BURN_TICKET + "× over 6h</b>. <b>Declared here</b>, because the page does " +
        "not state them: " + C.POINT_COMP_B + " B per compressed point (inside its 1–2 B " +
        "band, and the value that reproduces its ~50 GB/day), agent buffers of " +
        C.AGENT_MEM_MIB + " MiB memory + " + C.AGENT_DISK_MIB + " MiB disk per host, a " +
        by(D.TSDB_MEM_B) + " TSDB head at " + (C.SERIES_MEM_B / 1000) +
        " KB per active series, " + C.LINES_PER_ERROR + " log lines per stack trace, a " +
        (C.SLO * 100).toFixed(1) + "% SLO, " + C.DATACENTRES + " datacentres, a " +
        C.DEADMAN_S + " s dead-man's switch, and a log storm of ×" +
        C.LOG_MULT.join(", ") + " per minute. Consumer lag, burn rate, drop counts, series " +
        "counts and the minute each alert fires are all counted off the run.";
    })(),
    interval: 1500,

    scenarios: [
      sddesignloggingmon_scenario({
        id: "one", label: "One pipeline, agent blocks",
        split: false, kafka: false, block: true, cardinality: false, group: false,
        blurb: "<b>Build 1: one topic, one consumer pool, one store</b>, and an agent that " +
          "blocks the application when its buffer fills rather than dropping. Everything " +
          "here is provisioned correctly for the steady rate. Press Play and watch what a " +
          "log storm does to a metric."
      }),
      sddesignloggingmon_scenario({
        id: "split", label: "Three pipelines, drop not block",
        split: true, kafka: true, block: false, cardinality: false, group: true,
        blurb: "<b>Build 2: the same hardware, divided by signal.</b> Kafka between gateway " +
          "and storage, metrics and traces admitted ahead of logs, agents that shed the " +
          "oldest low-priority lines and count them, and dedupe / grouping / inhibition in " +
          "front of the pager. Same storm, same minute."
      }),
      sddesignloggingmon_scenario({
        id: "card", label: "+ user_id label, no cap",
        split: true, kafka: true, block: false, cardinality: true, group: true,
        blurb: "<b>Build 3: build 2, plus a one-line deploy at minute 2</b> that adds " +
          "<code>user_id</code> as a label on <code>http_requests</code>. No per-tenant " +
          "series cap at ingest. Same storm again."
      })
    ],

    draw: function (step, d, ctx) {
      var C = sddesignloggingmon_C, D = sddesignloggingmon_D;
      var k = sddesignloggingmon_k, secs = sddesignloggingmon_secs;
      var by = sddesignloggingmon_bytes, xx = sddesignloggingmon_x;
      var pct = sddesignloggingmon_pct;
      var cfg = step.cfg || {};
      var idle = !step || step.f === undefined || step.f < 0;

      // ---- head ---------------------------------------------------------
      var head = d.flow([
        d.big(sddesignloggingmon_clock(idle ? -1 : step.f),
          idle ? "before the incident" : "into the incident",
          idle ? "idle" : step.flag),
        d.stat({
          label: "offered",
          value: idle ? k(D.STEADY) + "/s" : k(step.offered) + "/s",
          sub: (idle ? (D.STEADY / C.PEAK_EVENTS) : (step.offered / C.PEAK_EVENTS)).toFixed(2) +
            "× the " + k(C.PEAK_EVENTS) + "/s peak",
          flag: idle ? "idle" : step.offered > C.PEAK_EVENTS ? "bad"
            : step.offered > D.CONSUME_CAP ? "warn" : "ok"
        }),
        d.stat({
          label: "on-call",
          value: idle ? "QUIET" : step.state,
          sub: idle ? "no rule has matched"
            : step.state === "OK" ? "1h burn " + xx(step.b1)
            : step.state === "DEAD-MAN" ? "monitoring stopped reporting"
            : step.state === "BLIND" ? "no metric data to evaluate"
            : step.state === "PAGING" ? step.pages + " notification, 1h burn " + xx(step.b1)
            : step.state === "TICKET" ? "6h burn " + xx(step.b6) + " ≥ " + C.BURN_TICKET
            : "instant burn " + xx(step.burn) + ", window " + xx(step.b1),
          flag: idle ? "idle" : step.sFlag
        })
      ]);

      // ---- the idle frame shows the estimation, not the incident --------
      if (idle) {
        var est = d.table(
          ["signal", "rate", "raw/day", "stored/day", "keep"],
          [
            ["metrics", k(D.POINTS_S) + " pts/s", by(D.METRIC_RAW_DAY),
              by(D.METRIC_COMP_DAY), C.METRIC_RET_MO + " mo"],
            ["logs", k(D.LOG_S) + " lines/s", by(D.LOG_RAW_DAY),
              by(D.LOG_COMP_DAY), C.LOG_RET_D + " d"],
            ["traces", k(D.SPANS_S) + " spans/s", "—",
              k(D.SPANS_DAY) + " spans", C.TRACE_RET_D + " d"]
          ]
        );
        return d.stack([
          head,
          d.node({
            title: "three signals, three shapes",
            status: "IDLE", statusFlag: "idle", flag: "idle",
            badge: k(D.STEADY) + " events/s steady",
            meta: C.POINT_RAW_B + " B/point raw → " + C.POINT_COMP_B +
              " B compressed · logs " + C.LOG_COMPRESS + ":1",
            body: est
          }),
          d.cols([
            d.stat({ label: "logs kept", value: by(D.LOG_TOTAL),
              sub: C.LOG_RET_D + " days at " + by(D.LOG_COMP_DAY) + "/day", flag: "warn" }),
            d.stat({ label: "logs vs metrics", value:
              (D.LOG_RAW_DAY / D.METRIC_RAW_DAY).toFixed(0) + "×",
              sub: "the bytes, for a fraction of the query value", flag: "warn" }),
            d.stat({ label: "consumer budget", value: k(D.CONSUME_CAP) + "/s",
              sub: C.HEADROOM.toFixed(1) + "× the steady rate", flag: "ok" })
          ]),
          d.note("Press Play. The clock runs one minute per frame; the storm starts at " +
            "minute 3.")
        ]);
      }

      // ---- three signal columns ------------------------------------------
      var mFlag = step.dead ? "bad" : step.mLag > 300 ? "bad" : step.mLag > 0 ? "warn" : "ok";
      var metrics = d.node({
        title: "metrics",
        status: step.dead ? "OOM LOOP" : step.mLag > 300 ? "STALE" : step.mLag > 0 ? "LAGGING" : "FRESH",
        statusFlag: mFlag, flag: mFlag,
        badge: cfg.split ? k(D.CAP_M) + "/s consumer" : "shared pool",
        meta: C.SCRAPE_S + " s scrape · " + C.METRIC_RET_MO + " month retention",
        gauges: [{
          label: "landed", pct: pct(step.mLanded, step.pts),
          value: k(step.mLanded) + " / " + k(step.pts), flag: mFlag
        }],
        rows: [
          { label: "age of newest sample", value: secs(step.mLag), flag: mFlag },
          { label: "active series", value: k(step.series),
            flag: step.series > D.SERIES_CAP ? "bad" : "ok" },
          { label: "head memory",
            value: by(step.mem) + " / " + by(D.TSDB_MEM_B),
            flag: step.mem > D.TSDB_MEM_B ? "bad"
              : step.mem > D.TSDB_MEM_B * 0.6 ? "warn" : "ok" }
        ]
      });

      var lFlag = step.lLag > 600 ? "warn" : step.lLag > 0 ? "warn" : "ok";
      var logs = d.node({
        title: "logs",
        status: step.gwShed > 0 ? "SHEDDING" : step.blocking ? "BLOCKING APPS"
          : step.lLag > 0 ? "BEHIND" : "FRESH",
        statusFlag: step.blocking ? "bad" : lFlag, flag: step.blocking ? "bad" : lFlag,
        badge: cfg.split ? k(D.CAP_L) + "/s consumer" : "shared pool",
        meta: C.HOT_D + " d hot index · " + C.LOG_RET_D + " d cold object storage",
        gauges: [{
          label: "landed", pct: pct(step.lLanded, step.logs),
          value: k(step.lLanded) + " / " + k(step.logs),
          flag: step.lLanded >= step.logs ? "ok" : "warn"
        }],
        rows: cfg.split ? [
          { label: "buffered in Kafka", value: k(step.kafka) + " lines",
            flag: step.kafka > 0 ? "warn" : "ok" },
          { label: "held on agent disks", value: k(step.agentBuf) + " / " +
            k(D.AGENT_BUF_LINES), flag: step.agentBuf >= D.AGENT_BUF_LINES ? "bad" : "ok" },
          { label: "dropped, counted", value: k(step.shed) + "  ·  " +
            sddesignloggingmon_p1(pct(step.shed, step.logOffered)),
            flag: step.shed > 0 ? "warn" : "ok" }
        ] : [
          { label: "queue backlog", value: k(step.shared) + " events",
            flag: step.shared > 0 ? "bad" : "ok" },
          { label: "agent state",
            value: step.blocking ? "BLOCKING at " + secs(step.mLag) : "buffering",
            flag: step.blocking ? "bad" : "warn" },
          { label: "dropped, counted", value: "0  ·  nothing drops, everything waits",
            flag: step.blocking ? "bad" : "ok" }
        ]
      });

      var traces = d.node({
        title: "traces",
        status: step.tLanded >= step.spans ? "FRESH" : "LAGGING",
        statusFlag: step.tLanded >= step.spans ? "ok" : "warn",
        flag: step.tLanded >= step.spans ? "ok" : "warn",
        badge: cfg.split ? k(D.CAP_T) + "/s consumer" : "shared pool",
        meta: (C.SAMPLE * 100).toFixed(0) + "% sampled · " + C.TRACE_RET_D + " d",
        rows: [
          { label: "landed", value: k(step.tLanded) + " / " + k(step.spans),
            flag: step.tLanded >= step.spans ? "ok" : "warn" },
          { label: "age", value: secs(cfg.split ? 0 : step.mLag),
            flag: cfg.split ? "ok" : step.mLag > 0 ? "warn" : "ok" },
          { label: "where per-user detail belongs", value: "here", flag: "ok" }
        ]
      });

      // ---- alerting -------------------------------------------------------
      var alerting = d.node({
        title: "alerting engine",
        status: step.state, statusFlag: step.sFlag, flag: step.sFlag,
        badge: "evaluates every " + C.EVAL_S + " s",
        meta: cfg.split ? "own failure domain" : "same cluster as everything else",
        gauges: [
          { label: "1h burn vs " + C.BURN_PAGE + "× page",
            pct: Math.min(100, pct(step.b1, C.BURN_PAGE)),
            value: xx(step.b1),
            flag: step.b1 >= C.BURN_PAGE ? "warn" : step.burn >= C.BURN_PAGE ? "bad" : "ok" },
          { label: "6h burn vs " + C.BURN_TICKET + "× ticket",
            pct: Math.min(100, pct(step.b6, C.BURN_TICKET)),
            value: xx(step.b6),
            flag: step.b6 >= C.BURN_TICKET ? "warn" : "ok" }
        ],
        rows: [
          { label: "true burn rate this minute", value: xx(step.burn),
            flag: step.burn >= C.BURN_PAGE ? "bad" : "ok" },
          { label: "minutes of data the rule can see",
            value: Math.max(0, step.landed) + " of " + (step.f + 1),
            flag: step.landed >= step.f + 1 ? "ok" : "bad" },
          { label: "raw alert instances", value: k(step.rawAlerts) + " → " +
            step.pages + " sent",
            flag: cfg.group ? "ok" : "warn" },
          { label: "dead-man's switch",
            value: step.dmsAt >= 0 && step.f >= step.dmsAt
              ? "FIRED — heartbeats stopped " + C.DEADMAN_S + " s ago"
              : step.dead ? "arming (" + ((step.f - step.deadAt) * C.FRAME_S) + " / " +
                C.DEADMAN_S + " s)"
              : "heartbeat ok",
            flag: step.dmsAt >= 0 && step.f >= step.dmsAt ? "bad"
              : step.dead ? "warn" : "ok" }
        ]
      });

      // ---- the eight-minute record ----------------------------------------
      function ageCell(v, i) {
        var future = i > step.f;
        if (future) return { label: "", flag: "idle", title: "minute " + (i + 1) + " · not reached" };
        if (!isFinite(v)) return { label: "✕", flag: "bad", title: "minute " + (i + 1) + " · no data" };
        var lab = v < 1 ? "0" : v < 60 ? String(Math.round(v)) : Math.round(v / 60) + "m";
        return {
          label: lab,
          flag: v <= 0 ? "ok" : v < C.FRAME_S ? "warn" : "bad",
          title: "minute " + (i + 1) + " · newest sample " + secs(v) + " old"
        };
      }
      var laneM = [], laneL = [], laneB = [], laneA = [], i2;
      for (i2 = 0; i2 < step.sum.length; i2++) {
        var s2 = step.sum[i2], fut = i2 > step.f;
        laneM.push(ageCell(s2.mLag, i2));
        laneL.push(ageCell(s2.lLag, i2));
        laneB.push({
          label: fut ? "" : s2.b1 >= 10 ? String(Math.round(s2.b1)) : s2.b1.toFixed(1),
          flag: fut ? "idle" : s2.b1 >= C.BURN_PAGE ? "bad"
            : s2.b1 >= C.BURN_TICKET ? "warn" : "ok",
          title: fut ? "minute " + (i2 + 1) + " · not reached"
            : "minute " + (i2 + 1) + " · window " + xx(s2.b1) + " · true " + xx(s2.burn)
        });
        laneA.push({
          label: fut ? "" : s2.state === "OK" ? "·" : s2.state === "PENDING" ? "P"
            : s2.state === "TICKET" ? "T" : s2.state === "PAGING" ? "!"
            : s2.state === "DEAD-MAN" ? "S" : "✕",
          flag: fut ? "idle" : s2.state === "OK" ? "ok"
            : s2.state === "PAGING" ? "ok"
            : s2.state === "PENDING" || s2.state === "TICKET" ? "warn" : "bad",
          title: fut ? "minute " + (i2 + 1) + " · not reached"
            : "minute " + (i2 + 1) + " · " + s2.state
        });
      }

      var lanes = d.stack([
        d.lane({ label: "metric age", cells: laneM }),
        d.lane({ label: "log age", cells: laneL }),
        d.lane({ label: "1h burn", cells: laneB }),
        d.lane({ label: "on-call", cells: laneA })
      ]);

      var legend = "One cell per minute. <b>metric age</b> and <b>log age</b> are the age of " +
        "the newest sample each store holds — green 0 s, amber under a minute, red over, " +
        "<b>✕ no data at all</b>. <b>1h burn</b> is what the rule actually computes " +
        "from the data that landed; compare it with the true burn in the tooltip. " +
        "<b>on-call</b>: · quiet, <b>P</b> pending, <b>T</b> ticket opened, <b>!</b> " +
        "paged, <b>S</b> the external dead-man's switch, ✕ blind.";

      return d.stack([
        head,
        d.cols([metrics, logs, traces]),
        alerting,
        lanes,
        d.note(legend, step.dead ? "bad" : undefined)
      ]);
    }
  };

  // ====================================================================
  // ======================================================================
  // SIM · sddesignnewsfeed  (design-news-feed.md)
  //
  // The page's whole argument is a comparison of two costs, and both are
  // rates, so the time axis is eighty seconds of real traffic: a load ramp
  // into peak, a celebrity with 100,000,000 followers posting at second 30,
  // and that post being deleted at second 60. The same eighty seconds run
  // through pull, push and the hybrid. Every figure is counted off the run.
  //
  // FROM THE PAGE (used verbatim):
  //   500M DAU, 0.2 posts/day       -> 100M posts/day, 100 GB/day at 1 KB
  //   ~1,000 posts/s, peak 3,000/s               section 2
  //   ~12,000 feed loads/s, peak 30,000/s        section 2
  //   average followers 200                      section 2
  //   1,000 x 200 = 200,000 timeline writes/s, peak 600,000/s   section 2
  //   30,000 reads/s x 200 queries = 6M queries/s               section 3
  //   100M followers x one post = 100 MILLION timeline writes;
  //     at 200,000 writes/s that is over 8 minutes for ONE post section 3
  //   celebrity threshold ~100,000 followers                    section 3
  //   timeline: 800 entries, IDs at 8 B, active users ~20%
  //     -> 100M x 800 x 8 B = 640 GB, and 3.2 TB for everyone   section 5
  //   LRANGE timeline 0 49, ~1 ms                               section 4
  //   feed p99 < 200 ms; "a few seconds stale" is acceptable    section 1
  //   cache miss rebuild ~1 s                                   section 5
  //
  // DECLARED HERE, because the page does not state them:
  //   frame                10 s, eight of them
  //   load profile         0.15, 0.35, 0.6, 1.0, 1.0, 0.8, 0.5, 0.3 of peak
  //   post-store shard     50,000 point queries/s, 24 shards provisioned
  //   shard round trip     2 ms, 20 queries in flight per feed load
  //   k-way merge          6 ms for 200 lists
  //   rank                 12 ms   ·  hydrate (MGET) 8 ms
  //   celebrity merge      1.5 ms each, and the median user follows 3
  //   timeline cache       8 shards x 100,000 ops/s = 800,000 ops/s, and
  //                        fan-out WRITES land on the same cluster as reads
  //   fan-out workers      1.25x the 600,000/s peak = 750,000 writes/s,
  //                        across 64 queue partitions
  //   request timeout      2,000 ms
  //   staleness            a feed is stale if it is missing a post it should
  //                        have; that is Poisson in the fan-out lag, at
  //                        200 follows x 0.2 posts/day each
  //
  // Nothing else is typed. Queue depth, lag, p99, stale fraction, failed
  // feed loads and the celebrity's fan-out progress are all accumulated.
  // ======================================================================
  var sddesignnewsfeed_C = {
    DAU: 500e6,                 // page
    POSTS_USER_DAY: 0.2,        // page
    READS_USER_DAY: 2,          // page
    POSTS_PEAK: 3000,           // page
    READS_PEAK: 30000,          // page
    FOLLOWERS: 200,             // page, "average followers ~ 200"
    POST_B: 1000,               // page, 1 KB
    TL_ENTRIES: 800,            // page
    ID_B: 8,                    // page
    ACTIVE_FRAC: 0.2,           // page, "active users only (~20%)"
    CELEB_THRESHOLD: 100000,    // page
    CELEB_FOLLOWERS: 100e6,     // page
    PAGE_DRAIN: 200000,         // page, the rate its 8-minute figure uses
    LRANGE_N: 50,               // page, LRANGE timeline 0 49
    LRANGE_MS: 1,               // page, "~1ms"
    P99_BUDGET_MS: 200,         // page
    REBUILD_MS: 1000,           // page, "~1s"
    FRAME_S: 10,                // declared
    FRAMES: 8,
    LOAD: [0.15, 0.35, 0.6, 1.0, 1.0, 0.8, 0.5, 0.3],   // declared
    SHARD_QPS: 50000,           // declared
    SHARDS: 24,                 // declared
    SHARD_RTT_MS: 2,            // declared
    PARALLEL: 20,               // declared
    MERGE_MS: 6,                // declared
    RANK_MS: 12,                // declared
    HYDRATE_MS: 8,              // declared
    CELEB_MERGE_MS: 1.5,        // declared
    CELEB_FOLLOWED: 3,          // declared
    TL_SHARDS: 8,               // declared
    TL_QPS: 100000,             // declared
    WORKER_HEADROOM: 1.25,      // declared
    PARTITIONS: 64,             // declared
    TIMEOUT_MS: 2000,           // declared
    CELEB_FRAME: 2,             // the celebrity posts in frame 3
    DELETE_FRAME: 5             // the post is deleted in frame 6
  };

  var sddesignnewsfeed_D = (function () {
    var C = sddesignnewsfeed_C;
    var o = {};
    o.POSTS_DAY = C.DAU * C.POSTS_USER_DAY;                  // 100,000,000
    o.READS_DAY = C.DAU * C.READS_USER_DAY;                  // 1,000,000,000
    o.POST_BYTES_DAY = o.POSTS_DAY * C.POST_B;               // 100 GB
    o.POST_BYTES_YEAR = o.POST_BYTES_DAY * 365;              // 36.5 TB
    o.FANOUT_PEAK = C.POSTS_PEAK * C.FOLLOWERS;              // 600,000/s
    o.FANOUT_AVG = (o.POSTS_DAY / 86400) * C.FOLLOWERS;      // ~231,000/s
    o.PULL_QPS_PEAK = C.READS_PEAK * C.FOLLOWERS;            // 6,000,000/s
    o.ACTIVE_USERS = C.DAU * C.ACTIVE_FRAC;                  // 100,000,000
    o.TL_BYTES_ACTIVE = o.ACTIVE_USERS * C.TL_ENTRIES * C.ID_B;   // 640 GB
    o.TL_BYTES_ALL = C.DAU * C.TL_ENTRIES * C.ID_B;               // 3.2 TB
    o.CELEB_SECONDS = C.CELEB_FOLLOWERS / C.PAGE_DRAIN;      // 500 s, page's 8 min
    o.PULL_CAP = C.SHARDS * C.SHARD_QPS;                     // 1,200,000 q/s
    o.PULL_SHARDS_NEEDED = Math.ceil(o.PULL_QPS_PEAK / C.SHARD_QPS);  // 120
    o.TL_CAP = C.TL_SHARDS * C.TL_QPS;                       // 800,000 ops/s
    o.FANOUT_CAP = o.FANOUT_PEAK * C.WORKER_HEADROOM;        // 750,000/s
    o.ROUNDS = C.FOLLOWERS / C.PARALLEL;                     // 10
    o.BASE_PULL = o.ROUNDS * C.SHARD_RTT_MS + C.MERGE_MS + C.RANK_MS + C.HYDRATE_MS;
    o.BASE_PUSH = C.LRANGE_MS + C.RANK_MS + C.HYDRATE_MS;
    o.CELEB_MERGE = C.CELEB_FOLLOWED * C.CELEB_MERGE_MS;
    o.BASE_HYBRID = o.BASE_PUSH + o.CELEB_MERGE;
    o.POST_PER_FOLLOW_S = C.POSTS_USER_DAY / 86400;          // 2.315e-6
    o.SEEN_PER_S = C.FOLLOWERS * o.POST_PER_FOLLOW_S;        // 4.63e-4 posts/s
    o.CELEB_REACH = C.CELEB_FOLLOWERS / C.DAU;               // 0.2 of DAU
    return o;
  })();

  function sddesignnewsfeed_trim(s) {
    if (s.indexOf(".") < 0) return s;
    return s.replace(/0+$/, "").replace(/\.$/, "");
  }
  function sddesignnewsfeed_k(n) {
    if (!isFinite(n)) return "—";
    var a = Math.abs(n), t = sddesignnewsfeed_trim;
    if (a >= 1e9) return t((n / 1e9).toFixed(a >= 1e10 ? 0 : 2)) + "B";
    if (a >= 1e6) return t((n / 1e6).toFixed(a >= 1e7 ? 1 : 2)) + "M";
    if (a >= 1e3) return t((n / 1e3).toFixed(a >= 1e4 ? 0 : 1)) + "k";
    return String(Math.round(n));
  }
  function sddesignnewsfeed_bytes(b) {
    if (!isFinite(b)) return "—";
    if (b >= 1e12) return sddesignnewsfeed_trim((b / 1e12).toFixed(1)) + " TB";
    if (b >= 1e9) return sddesignnewsfeed_trim((b / 1e9).toFixed(b >= 1e11 ? 0 : 1)) + " GB";
    if (b >= 1e6) return Math.round(b / 1e6) + " MB";
    return Math.round(b) + " B";
  }
  function sddesignnewsfeed_ms(x) {
    if (!isFinite(x)) return "—";
    if (x >= 1000) return (x / 1000).toFixed(x >= 10000 ? 0 : 2) + " s";
    return (x >= 100 ? Math.round(x) : x.toFixed(1)) + " ms";
  }
  function sddesignnewsfeed_secs(s) {
    if (!isFinite(s)) return "—";
    if (s < 60) return Math.round(s) + " s";
    var m = Math.floor(s / 60);
    return m + "m " + Math.round(s - m * 60) + "s";
  }
  function sddesignnewsfeed_pct(a, b) { return b > 0 ? (a / b) * 100 : 0; }
  function sddesignnewsfeed_p1(x) { return (isFinite(x) ? x : 0).toFixed(1) + "%"; }

  // ----------------------------------------------------------------------
  // The run. Eighty seconds, one strategy.
  //   mode "pull"    one insert on write, N queries on read
  //   mode "push"    fan out to every follower, one lookup on read
  //   mode "hybrid"  fan out to ACTIVE followers under the threshold only,
  //                  merge the celebrities at read time
  // ----------------------------------------------------------------------
  function sddesignnewsfeed_run(mode) {
    var C = sddesignnewsfeed_C, D = sddesignnewsfeed_D;
    var frames = [];
    var head = 0, tail = 0, celebRem = 0, celebDone = 0;
    var served = 0, failed = 0, stale = 0, offeredAll = 0, wasted = 0;
    var f;

    for (f = 0; f < C.FRAMES; f++) {
      var L = C.LOAD[f];
      var posts = C.POSTS_PEAK * L;
      var reads = C.READS_PEAK * L;
      var celebNow = f === C.CELEB_FRAME;
      var deleted = f >= C.DELETE_FRAME;
      offeredAll += reads * C.FRAME_S;

      var fanEach = mode === "push" ? C.FOLLOWERS
        : mode === "hybrid" ? C.FOLLOWERS * C.ACTIVE_FRAC : 0;
      var demand = posts * fanEach;
      var arrivals = demand * C.FRAME_S;
      wasted += mode === "push" ? arrivals * (1 - C.ACTIVE_FRAC) : 0;

      // FIFO queue: ordinary writes already queued, then the celebrity block,
      // then everything that arrived behind it.
      if (celebRem > 0) tail += arrivals; else head += arrivals;
      if (celebNow && mode === "push") celebRem = C.CELEB_FOLLOWERS;

      var budget = mode === "pull" ? 0 : D.FANOUT_CAP * C.FRAME_S;
      var take = Math.min(head, budget); head -= take; budget -= take;
      take = Math.min(celebRem, budget); celebRem -= take; celebDone += take; budget -= take;
      take = Math.min(tail, budget); tail -= take; budget -= take;
      if (celebRem <= 0 && tail > 0) { head += tail; tail = 0; }
      var queue = head + celebRem + tail;
      var lag = mode === "pull" ? 0 : queue / D.FANOUT_CAP;

      // The stores, and how hard each one is being pushed.
      var pullQ = mode === "pull" ? reads * C.FOLLOWERS : 0;
      var pullRho = pullQ / D.PULL_CAP;
      var tlWrites = mode === "pull" ? 0
        : Math.min(D.FANOUT_CAP, queue / C.FRAME_S + demand);
      var tlRho = (tlWrites + (mode === "pull" ? 0 : reads)) / D.TL_CAP;

      var base = mode === "pull" ? D.BASE_PULL
        : mode === "push" ? D.BASE_PUSH : D.BASE_HYBRID;
      var rho = mode === "pull" ? pullRho : tlRho;
      var p99, sv, fl;
      if (rho >= 1) {
        p99 = C.TIMEOUT_MS;
        sv = mode === "pull" ? D.PULL_CAP / C.FOLLOWERS : D.TL_CAP - tlWrites;
        sv = Math.max(0, Math.min(reads, sv));
      } else {
        p99 = Math.min(C.TIMEOUT_MS, base / (1 - rho));
        sv = reads;
      }
      fl = reads - sv;
      served += sv * C.FRAME_S;
      failed += fl * C.FRAME_S;

      // Stale = the feed is missing a post it should be showing. Poisson in
      // the fan-out lag, plus the celebrity post nobody has been given yet.
      var missOrdinary = 1 - Math.exp(-D.SEEN_PER_S * lag);
      var missCeleb = (mode === "push" && !deleted)
        ? (celebRem / C.DAU) : 0;
      var staleFrac = 1 - (1 - missOrdinary) * (1 - missCeleb);
      stale += sv * C.FRAME_S * staleFrac;

      // Deleting the post: what it would cost to correct every timeline.
      var deleteWrites = 0;
      if (f === C.DELETE_FRAME) {
        deleteWrites = mode === "push" ? celebDone : 0;
        if (mode === "push") { celebRem = 0; }
      }

      frames.push({
        f: f, mode: mode, load: L, posts: posts, reads: reads,
        celebNow: celebNow, deleted: deleted, deleteWrites: deleteWrites,
        fanEach: fanEach, demand: demand, queue: queue, lag: lag,
        head: head, tail: tail, celebRem: celebRem, celebDone: celebDone,
        pullQ: pullQ, pullRho: pullRho, tlWrites: tlWrites, tlRho: tlRho,
        rho: rho, base: base, p99: p99, sv: sv, fl: fl,
        staleFrac: staleFrac, missOrdinary: missOrdinary, missCeleb: missCeleb,
        served: served, failed: failed, stale: stale,
        offeredAll: offeredAll, wasted: wasted
      });
    }

    var sum = [], i;
    for (i = 0; i < frames.length; i++) {
      sum.push({
        p99: frames[i].p99, lag: frames[i].lag,
        okFrac: frames[i].reads > 0 ? frames[i].sv / frames[i].reads : 1,
        staleFrac: frames[i].staleFrac
      });
    }
    for (i = 0; i < frames.length; i++) frames[i].sum = sum;
    frames.totals = {
      served: served, failed: failed, stale: stale, offeredAll: offeredAll,
      wasted: wasted, celebDone: celebDone, queue: frames[frames.length - 1].queue
    };
    return frames;
  }

  // ----------------------------------------------------------------------
  function sddesignnewsfeed_scenario(cfg) {
    var C = sddesignnewsfeed_C, D = sddesignnewsfeed_D;
    var k = sddesignnewsfeed_k, ms = sddesignnewsfeed_ms;
    var secs = sddesignnewsfeed_secs, p1 = sddesignnewsfeed_p1;
    var pc = sddesignnewsfeed_pct;
    var R = sddesignnewsfeed_run(cfg.mode);
    var T = R.totals;
    var steps = [{ f: -1, mode: cfg.mode, sum: R[0].sum, caption: cfg.blurb, flag: "idle" }];
    var i;

    for (i = 0; i < R.length; i++) {
      var fr = R[i], cap;

      if (cfg.mode === "pull") {
        if (i === 0) {
          cap = "<b>Second 10 — " + (fr.load * 100).toFixed(0) + "% of peak, and it " +
            "works.</b> " + k(fr.reads) + " feed loads a second, each fetching the recent " +
            "posts of " + C.FOLLOWERS + " followed accounts: <b>" + k(fr.pullQ) +
            " post-store queries a second</b> against " + C.SHARDS + " shards at " +
            k(C.SHARD_QPS) + "/s = " + k(D.PULL_CAP) + "/s. Utilisation <b>" +
            p1(fr.pullRho * 100) + "</b>, p99 <b>" + ms(fr.p99) + "</b> against the " +
            C.P99_BUDGET_MS + " ms budget. Writes are one insert. <i>This is the build " +
            "every team ships first, and at launch traffic it is correct.</i>";
        } else if (i === 1) {
          cap = "<b>Second 20 — " + (fr.load * 100).toFixed(0) + "% of peak, and it " +
            "has stopped working.</b> " + k(fr.reads) + " feed loads means <b>" +
            k(fr.pullQ) + " queries/s</b> against " + k(D.PULL_CAP) + "/s of shards — " +
            "utilisation <b>" + p1(fr.pullRho * 100) + "</b>. The fan-in is " + C.FOLLOWERS +
            ", so a " + ((fr.load / C.LOAD[0])).toFixed(1) + "× traffic increase is a " +
            ((fr.load / C.LOAD[0])).toFixed(1) + "× <i>query</i> increase. <b>" +
            k(fr.fl) + " feed loads a second now time out.</b>";
        } else if (i === 2) {
          cap = "<b>Second 30 — a celebrity with " + k(C.CELEB_FOLLOWERS) +
            " followers posts, and pull does not care.</b> One row in the post store, " +
            "done. <i>That is the one thing this strategy is genuinely good at</i>, and it " +
            "is worth saying out loud before rejecting it. The read side is still drowning: " +
            k(fr.pullQ) + " queries/s at " + p1(fr.pullRho * 100) + " utilisation, " +
            k(fr.sv) + " of " + k(fr.reads) + " feed loads served.";
        } else if (i === 3) {
          cap = "<b>Second 40 — peak, and the page's exact number.</b> " + k(fr.reads) +
            " feed loads × " + C.FOLLOWERS + " follows = <b>" + k(fr.pullQ) +
            " post-store queries a second.</b> Serving that needs <b>" +
            D.PULL_SHARDS_NEEDED + " shards</b> at " + k(C.SHARD_QPS) + "/s each; there are " +
            C.SHARDS + ". The fleet serves " + k(fr.sv) + "/s and times out <b>" + k(fr.fl) +
            "/s</b> — " + p1(pc(fr.fl, fr.reads)) + " of feed loads. p99 is the <b>" +
            ms(C.TIMEOUT_MS) + " timeout</b>, not a latency.";
        } else if (i === 4) {
          cap = "<b>Second 50 — peak held.</b> Nothing about this is a capacity " +
            "accident you can provision away: reads run at <b>" +
            (C.READS_PEAK / C.POSTS_PEAK).toFixed(0) + "×</b> the rate of writes, and " +
            "pull puts " + C.FOLLOWERS + " units of work on the read. <b>" + k(fr.pullQ) +
            " queries/s to answer " + k(fr.reads) + " questions.</b> Push would do " +
            k(D.FANOUT_PEAK) + " writes/s for the same peak — " +
            (D.PULL_QPS_PEAK / D.FANOUT_PEAK).toFixed(0) + "× less work, on the path " +
            "that runs " + (C.READS_PEAK / C.POSTS_PEAK).toFixed(0) + "× less often.";
        } else if (i === 5) {
          cap = "<b>Second 60 — the celebrity post is deleted.</b> Cost: one delete. " +
            "Nothing to unwind, because nothing was ever copied. Pull's write path is " +
            "flawless and its read path is unaffordable, which is exactly the shape the " +
            "page rejects it on. Still " + p1(pc(fr.fl, fr.reads)) + " of feed loads " +
            "timing out at " + p1(fr.pullRho * 100) + " shard utilisation.";
        } else if (i === 6) {
          cap = "<b>Second 70 — load falls to " + (fr.load * 100).toFixed(0) +
            "% and the shards are <i>still</i> over.</b> " + k(fr.pullQ) + " queries/s " +
            "against " + k(D.PULL_CAP) + "/s. The breaking point was " +
            p1(pc(D.PULL_CAP / C.FOLLOWERS, C.READS_PEAK)) + " of peak — <b>" +
            k(D.PULL_CAP / C.FOLLOWERS) + " feed loads a second</b> — and every hour " +
            "of the day except the quietest is above it.";
        } else {
          cap = "<b>" + p1(pc(T.served, T.offeredAll)) + " of feed loads served in eighty " +
            "seconds.</b> " + k(T.served) + " of " + k(T.offeredAll) + "; <b>" + k(T.failed) +
            " timed out</b>. Every feed that did return was perfectly fresh — that is " +
            "pull's real property and it is not nothing. But the ceiling is arithmetic, not " +
            "tuning: " + k(C.READS_PEAK) + " reads × " + C.FOLLOWERS + " follows = " +
            k(D.PULL_QPS_PEAK) + " queries a second, needing " + D.PULL_SHARDS_NEEDED +
            " shards to answer questions that a precomputed list answers with <b>one " +
            "lookup</b>. <i>With reads running " + (C.READS_PEAK / C.POSTS_PEAK).toFixed(0) +
            "× writes, doing the expensive work on read is backwards.</i>";
        }
        fr.flag = fr.fl > 0 ? "bad" : fr.p99 > C.P99_BUDGET_MS ? "warn" : "ok";
      } else if (cfg.mode === "push") {
        if (i === 0) {
          cap = "<b>Second 10 — the work moved to the write path.</b> " + k(fr.posts) +
            " posts/s × " + C.FOLLOWERS + " followers = <b>" + k(fr.demand) +
            " timeline writes/s</b> against " + k(D.FANOUT_CAP) + "/s of workers. Queue <b>" +
            "empty</b>. A feed load is now <code>LRANGE timeline 0 " + (C.LRANGE_N - 1) +
            "</code> — <b>" + ms(fr.p99) + " p99</b> against a " + C.P99_BUDGET_MS +
            " ms budget, where pull needed " + ms(D.BASE_PULL) + " with no load at all.";
        } else if (i === 1) {
          cap = "<b>Second 20 — and here is the bill.</b> " + k(fr.demand) +
            " writes/s, of which <b>" + k(fr.demand * (1 - C.ACTIVE_FRAC)) +
            "/s are wasted</b>: only " + (C.ACTIVE_FRAC * 100).toFixed(0) +
            "% of followers are active, so " + ((1 - C.ACTIVE_FRAC) * 100).toFixed(0) +
            "% of these writes land in a timeline nobody will open. Reads are still <b>" +
            ms(fr.p99) + "</b>. The trade the page names: <i>do the work once per post, or " +
            "once per read?</i> — and this build does it once per post, per follower.";
        } else if (i === 2) {
          cap = "<b>Second 30 — the celebrity posts.</b> " + k(C.CELEB_FOLLOWERS) +
            " followers, so <b>" + k(C.CELEB_FOLLOWERS) + " timeline writes</b> hit the " +
            "queue in one enqueue. The page's own arithmetic: at its " + k(C.PAGE_DRAIN) +
            "/s average fan-out rate that is <b>" + secs(D.CELEB_SECONDS) +
            "</b> for one post. Queue depth <b>" + k(fr.queue) + "</b>, so an ordinary " +
            "post enqueued right now is <b>" + secs(fr.lag) + "</b> from reaching its " +
            "followers. <i>The author still sees their own post instantly — that one " +
            "write is synchronous, before the 201.</i>";
        } else if (i === 3) {
          cap = "<b>Second 40 — peak, and the queue is FIFO.</b> The " + k(fr.demand) +
            " writes/s from every <i>other</i> user are behind " + k(fr.celebRem) +
            " celebrity writes. Fan-out lag <b>" + secs(fr.lag) + "</b>. And look at the " +
            "read path: the workers are draining at <b>" + k(fr.tlWrites) +
            "/s</b> into the same timeline cache the reads use, so it is at <b>" +
            p1(fr.tlRho * 100) + "</b> and p99 has gone from " + ms(R[0].p99) + " to <b>" +
            ms(fr.p99) + "</b> — <i>past the " + C.P99_BUDGET_MS +
            " ms budget the whole strategy existed to protect</i>.";
        } else if (i === 4) {
          cap = "<b>Second 50 — " + p1(fr.staleFrac * 100) + " of feed loads are " +
            "missing something.</b> Two sources, both computed: a " + secs(fr.lag) +
            " lag means a user following " + C.FOLLOWERS + " accounts at " +
            C.POSTS_USER_DAY + " posts/day each is missing a post " +
            p1(fr.missOrdinary * 100) + " of the time; and <b>" +
            p1(fr.missCeleb * 100) + "</b> of all users follow the celebrity and have not " +
            "been given the post yet. <b>" + k(fr.celebDone) + " of " +
            k(C.CELEB_FOLLOWERS) + "</b> fanned out — " +
            p1(pc(fr.celebDone, C.CELEB_FOLLOWERS)) + " after " +
            ((C.CELEB_FRAME === 2 ? (i - C.CELEB_FRAME + 1) : 1) * C.FRAME_S) + " seconds.";
        } else if (i === 5) {
          cap = "<b>Second 60 — the post is deleted, and here is the second bill.</b> " +
            "It is already sitting in <b>" + k(fr.deleteWrites) +
            " timelines</b>. Correcting them eagerly is " + k(fr.deleteWrites) +
            " more writes, which at " + k(D.FANOUT_CAP) + "/s is another <b>" +
            secs(fr.deleteWrites / D.FANOUT_CAP) + "</b> of queue. <b>The page's answer is " +
            "to do none of it:</b> timelines hold IDs, and hydration drops an ID whose post " +
            "no longer exists. Fix on read, not on write.";
        } else if (i === 6) {
          cap = "<b>Second 70 — load drops and the queue finally drains.</b> " +
            k(fr.demand) + " writes/s arriving against " + k(D.FANOUT_CAP) +
            "/s of workers, so the backlog falls to <b>" + k(fr.queue) +
            "</b> and lag to " + secs(fr.lag) + ". Scaling workers is the obvious fix and " +
            "it is capped at <b>" + C.PARTITIONS + " partitions</b> — you cannot add " +
            "consumers past the partition count. <i>Consumer lag is the number to page on, " +
            "because a stale feed looks exactly like a quiet one.</i>";
        } else {
          cap = "<b>Every feed load served, " + ms(R[3].p99) + " p99 at the worst, and <b>" +
            p1(pc(T.stale, T.served)) + " of them missing content.</b></b> One post from " +
            "one account did that. The read path is right — one lookup, " +
            ms(R[0].p99) + " — and " + k(T.wasted) + " of the " +
            k(T.served + T.wasted) + " timeline writes this run performed went to " +
            "followers who never opened the app. The celebrity's fan-out reached <b>" +
            k(T.celebDone) + " of " + k(C.CELEB_FOLLOWERS) + "</b> before the post was " +
            "deleted. <i>The distribution is the problem:</i> follower counts are " +
            "power-law, so a strategy tuned for the " + k(C.FOLLOWERS) +
            "-follower median cannot survive the tail.";
        }
        fr.flag = fr.p99 > C.P99_BUDGET_MS ? "bad" : fr.lag > 5 ? "warn" : "ok";
      } else {
        if (i === 0) {
          cap = "<b>Second 10 — same push machinery, two filters in front of it.</b> " +
            "Authors over <b>" + k(C.CELEB_THRESHOLD) + " followers</b> are not fanned out " +
            "at all, and inactive followers are not maintained — only the " +
            (C.ACTIVE_FRAC * 100).toFixed(0) + "% who have opened the app. So " + k(fr.posts) +
            " posts/s fans out to <b>" + fr.fanEach + " timelines each</b>, not " +
            C.FOLLOWERS + ": <b>" + k(fr.demand) + " writes/s</b> where push needed " +
            k(C.POSTS_PEAK * fr.load * C.FOLLOWERS) + ".";
        } else if (i === 1) {
          cap = "<b>Second 20.</b> " + k(fr.demand) + " writes/s against " + k(D.FANOUT_CAP) +
            "/s of workers — <b>" + p1(pc(fr.demand, D.FANOUT_CAP)) +
            " utilisation</b>. A feed load is " + ms(C.LRANGE_MS) + " for the list, " +
            ms(D.CELEB_MERGE) + " to merge the " + C.CELEB_FOLLOWED + " over-threshold " +
            "accounts this user follows, " + ms(C.RANK_MS) + " to rank and " +
            ms(C.HYDRATE_MS) + " to hydrate: <b>" + ms(fr.p99) + " p99</b>. The merge is " +
            "the hybrid's whole cost, and it is " + ms(D.CELEB_MERGE) + ".";
        } else if (i === 2) {
          cap = "<b>Second 30 — the same celebrity posts, and nothing happens.</b> " +
            k(C.CELEB_FOLLOWERS) + " followers is " +
            (C.CELEB_FOLLOWERS / C.CELEB_THRESHOLD).toFixed(0) + "× the " +
            k(C.CELEB_THRESHOLD) + " threshold, so the fan-out workers never see the post: " +
            "<b>0 timeline writes</b>, queue still empty, lag still <b>" + secs(fr.lag) +
            "</b>. Their " + k(C.CELEB_FOLLOWERS) + " followers get it on their next read, " +
            "from a merge that costs " + ms(C.CELEB_MERGE_MS) + ". <i>The author's own " +
            "timeline is still written synchronously, so they see it immediately.</i>";
        } else if (i === 3) {
          cap = "<b>Second 40 — peak.</b> " + k(fr.reads) + " feed loads/s and " +
            k(fr.demand) + " timeline writes/s on a cache rated " + k(D.TL_CAP) +
            "/s: <b>" + p1(fr.tlRho * 100) + "</b> utilisation, p99 <b>" + ms(fr.p99) +
            "</b>. Push at this same instant was at " + p1(R[3].tlRho * 100) +
            " and " + ms(R[3].p99) + " — and it was only there because its workers " +
            "were hammering the cache the readers share. <b>The threshold is the knob:</b> " +
            "lower it and read-time merges grow; raise it and fan-out volume grows.";
        } else if (i === 4) {
          cap = "<b>Second 50 — " + p1(fr.staleFrac * 100) + " stale.</b> Fan-out lag " +
            "is <b>" + secs(fr.lag) + "</b>, so nothing under the threshold is late; and " +
            "nothing over it can be late, because it was never copied — the merge " +
            "reads the celebrity's posts <i>now</i>. Compare the same second under pure " +
            "push: " + p1(R[4].staleFrac * 100) + " of feeds missing content, " +
            secs(R[4].lag) + " of lag. <i>Freshness came back for free the moment the " +
            "celebrity stopped being copied.</i>";
        } else if (i === 5) {
          cap = "<b>Second 60 — the post is deleted. Cost: <b>" + fr.deleteWrites +
            " timeline writes</b>.</b> It was never in a timeline to begin with, and even " +
            "for an ordinary post the answer is the same: the list holds IDs, so hydration " +
            "simply drops what no longer exists or is no longer visible. Unfollows and " +
            "blocks ride the same mechanism, and the stale entries age out of the " +
            C.TL_ENTRIES + "-entry capped list on their own.";
        } else if (i === 6) {
          cap = "<b>Second 70 — an inactive user opens the app.</b> They have no " +
            "timeline, because the hybrid stopped maintaining it, so the read misses and " +
            "rebuilds from the post store: <b>" + ms(C.REBUILD_MS) + "</b>, once. That is " +
            "the price of the " + ((1 - C.ACTIVE_FRAC) * 100).toFixed(0) +
            "% of fan-out writes this build never performs, and of a timeline cache of <b>" +
            sddesignnewsfeed_bytes(D.TL_BYTES_ACTIVE) + "</b> rather than " +
            sddesignnewsfeed_bytes(D.TL_BYTES_ALL) + ".";
        } else {
          cap = "<b>" + k(T.served) + " feed loads, " + k(T.failed) + " failed, " +
            p1(pc(T.stale, T.served)) + " stale, worst p99 <b>" +
            ms(Math.max(R[0].p99, R[1].p99, R[2].p99, R[3].p99, R[4].p99, R[5].p99,
              R[6].p99, R[7].p99)) + "</b>.</b> Against pull's " +
            p1(pc(sddesignnewsfeed_run("pull").totals.served, T.offeredAll)) +
            " served, and push's " +
            p1(pc(sddesignnewsfeed_run("push").totals.stale,
              sddesignnewsfeed_run("push").totals.served)) + " stale. <b>This is not a " +
            "compromise between two strategies, it is the only one that fits the " +
            "distribution:</b> ordinary accounts have few followers so copying is cheap, " +
            "celebrities are few so merging is cheap, and the " + k(C.CELEB_THRESHOLD) +
            " threshold is a knob you set from real data — it trades " + k(fr.demand) +
            "/s of fan-out against " + ms(D.CELEB_MERGE) + " of read-time merge.";
        }
        fr.flag = fr.p99 > C.P99_BUDGET_MS ? "bad" : "ok";
      }
      fr.caption = cap;
      steps.push(fr);
    }
    return { id: cfg.id, label: cfg.label, steps: steps };
  }

  // ======================================================================
  S["sddesignnewsfeed"] = {
    title: "Push one celebrity post through three feed designs",
    note: (function () {
      var C = sddesignnewsfeed_C, D = sddesignnewsfeed_D;
      var k = sddesignnewsfeed_k, by = sddesignnewsfeed_bytes;
      return "The page's estimation, run for eighty seconds. " + k(C.DAU) + " DAU at " +
        C.POSTS_USER_DAY + " posts and " + C.READS_USER_DAY + " feed loads a day is " +
        k(D.POSTS_DAY) + " posts/day and " + k(D.READS_DAY) + " reads/day — the page's " +
        "<b>" + k(C.POSTS_PEAK) + " posts/s</b> and <b>" + k(C.READS_PEAK) +
        " feed loads/s</b> at peak. At its average <b>" + C.FOLLOWERS +
        " followers</b> that is <b>" + k(D.FANOUT_PEAK) + " timeline writes/s</b> pushed, " +
        "or <b>" + k(D.PULL_QPS_PEAK) + " post-store queries/s</b> pulled. Eight 10-second " +
        "frames at " + C.LOAD.join(", ") + " of peak; a celebrity with " +
        k(C.CELEB_FOLLOWERS) + " followers posts in frame " + (C.CELEB_FRAME + 1) +
        " and the post is deleted in frame " + (C.DELETE_FRAME + 1) + ". <b>Declared " +
        "here</b>, because the page does not state them: post-store shards of " +
        k(C.SHARD_QPS) + " queries/s (" + C.SHARDS + " provisioned, " + C.SHARD_RTT_MS +
        " ms round trip, " + C.PARALLEL + " in flight per read); a timeline cache of " +
        C.TL_SHARDS + " × " + k(C.TL_QPS) + " = " + k(D.TL_CAP) +
        " ops/s that carries fan-out writes <i>and</i> reads; fan-out workers at " +
        C.WORKER_HEADROOM + "× the " + k(D.FANOUT_PEAK) + "/s peak = " +
        k(D.FANOUT_CAP) + "/s over " + C.PARTITIONS + " partitions; " + C.MERGE_MS +
        " ms to merge " + C.FOLLOWERS + " lists, " + C.RANK_MS + " ms to rank, " +
        C.HYDRATE_MS + " ms to hydrate, " + C.CELEB_MERGE_MS +
        " ms per celebrity merged at read, and a median user following " +
        C.CELEB_FOLLOWED + " over-threshold accounts. Latency is base ÷ (1 − " +
        "utilisation), capped at the " + (C.TIMEOUT_MS / 1000) + " s timeout. The page's " +
        "own figures reproduce exactly: " + by(D.TL_BYTES_ACTIVE) + " of timeline cache, " +
        by(D.TL_BYTES_ALL) + " if you cached everyone, and " + k(C.CELEB_FOLLOWERS) +
        " writes at " + k(C.PAGE_DRAIN) + "/s = " + sddesignnewsfeed_secs(D.CELEB_SECONDS) +
        " for one post.";
    })(),
    interval: 1500,

    scenarios: [
      sddesignnewsfeed_scenario({
        id: "pull", label: "Fan-out on read",
        mode: "pull",
        blurb: "<b>Pull.</b> A post is one insert. A feed load fetches the recent posts of " +
          "every account you follow, merges them and ranks. Always fresh, nothing " +
          "precomputed, nothing wasted. Press Play and watch the load ramp."
      }),
      sddesignnewsfeed_scenario({
        id: "push", label: "Fan-out on write",
        mode: "push",
        blurb: "<b>Push.</b> A post is written into every follower's timeline list by an " +
          "async worker; a feed load is one <code>LRANGE</code>. The author's own timeline " +
          "is written inline so they see their post immediately. Same eighty seconds."
      }),
      sddesignnewsfeed_scenario({
        id: "hybrid", label: "The hybrid",
        mode: "hybrid",
        blurb: "<b>The hybrid.</b> Push, with two exclusions: authors over the " +
          "100,000-follower threshold are never fanned out and are merged at read time " +
          "instead, and inactive followers' timelines are not maintained. Same eighty " +
          "seconds again."
      })
    ],

    draw: function (step, d, ctx) {
      var C = sddesignnewsfeed_C, D = sddesignnewsfeed_D;
      var k = sddesignnewsfeed_k, ms = sddesignnewsfeed_ms;
      var secs = sddesignnewsfeed_secs, by = sddesignnewsfeed_bytes;
      var p1 = sddesignnewsfeed_p1, pc = sddesignnewsfeed_pct;
      var mode = step && step.mode ? step.mode : "pull";
      var idle = !step || step.f === undefined || step.f < 0;
      var modeName = mode === "pull" ? "fan-out on read"
        : mode === "push" ? "fan-out on write" : "hybrid";

      var head = d.flow([
        d.big(idle ? "0 s" : ((step.f + 1) * C.FRAME_S) + " s",
          idle ? "before the ramp" : "of peak traffic",
          idle ? "idle" : step.flag),
        d.stat({
          label: "feed loads",
          value: idle ? "—" : k(step.sv) + " / " + k(step.reads),
          sub: idle ? "not started" : step.fl > 0
            ? k(step.fl) + "/s timing out"
            : p1(step.staleFrac * 100) + " missing a post",
          flag: idle ? "idle" : step.fl > 0 ? "bad"
            : step.staleFrac > 0.01 ? "warn" : "ok"
        }),
        d.stat({
          label: "p99",
          value: idle ? "—" : ms(step.p99),
          sub: "budget " + C.P99_BUDGET_MS + " ms",
          flag: idle ? "idle" : step.p99 >= C.TIMEOUT_MS ? "bad"
            : step.p99 > C.P99_BUDGET_MS ? "bad" : "ok"
        })
      ]);

      if (idle) {
        return d.stack([
          head,
          d.node({
            title: "the estimation, before a line of code",
            status: "IDLE", statusFlag: "idle", flag: "idle",
            badge: modeName,
            meta: k(C.DAU) + " DAU · " + C.FOLLOWERS + " followers average",
            body: d.table(
              ["quantity", "derivation", "value"],
              [
                ["posts / day", k(C.DAU) + " × " + C.POSTS_USER_DAY, k(D.POSTS_DAY)],
                ["feed loads / day", k(C.DAU) + " × " + C.READS_USER_DAY,
                  k(D.READS_DAY)],
                ["peak posts / s", "the page's figure", k(C.POSTS_PEAK)],
                ["peak feed loads / s", "the page's figure", k(C.READS_PEAK)],
                ["fan-out writes / s", k(C.POSTS_PEAK) + " × " + C.FOLLOWERS,
                  k(D.FANOUT_PEAK)],
                ["pull queries / s", k(C.READS_PEAK) + " × " + C.FOLLOWERS,
                  k(D.PULL_QPS_PEAK)],
                ["post store", k(D.POSTS_DAY) + " × " + C.POST_B + " B",
                  by(D.POST_BYTES_DAY) + "/day"],
                ["timeline cache", k(D.ACTIVE_USERS) + " × " + C.TL_ENTRIES + " × " +
                  C.ID_B + " B", by(D.TL_BYTES_ACTIVE)],
                ["if you cached everyone", k(C.DAU) + " × " + C.TL_ENTRIES + " × " +
                  C.ID_B + " B", by(D.TL_BYTES_ALL)],
                ["one celebrity post", k(C.CELEB_FOLLOWERS) + " ÷ " + k(C.PAGE_DRAIN) +
                  "/s", secs(D.CELEB_SECONDS)]
              ]
            )
          }),
          d.note("<b>The trade, in one line:</b> do the work once per post, or once per " +
            "read? " + k(D.FANOUT_PEAK) + " writes a second against " + k(D.PULL_QPS_PEAK) +
            " queries a second — and reads run " +
            (C.READS_PEAK / C.POSTS_PEAK).toFixed(0) + "× as often as writes. " +
            "Press Play.")
        ]);
      }

      // ---- write path ----------------------------------------------------
      var wRows;
      if (mode === "pull") {
        wRows = [
          { label: "posts this second", value: k(step.posts) },
          { label: "store writes", value: k(step.posts) + "  ·  one insert each",
            flag: "ok" },
          { label: "write amplification", value: "1×", flag: "ok" },
          { label: "celebrity post cost", value: step.celebNow ? "1 insert" : "—",
            flag: "ok" }
        ];
      } else {
        wRows = [
          { label: "posts this second", value: k(step.posts) },
          { label: "fan-out per post", value: step.fanEach + " timelines" +
            (mode === "hybrid" ? "  ·  active followers only" : ""),
            flag: mode === "hybrid" ? "ok" : "warn" },
          { label: "timeline writes demanded", value: k(step.demand) + "/s",
            flag: step.demand > D.FANOUT_CAP ? "bad" : "ok" },
          { label: "wasted on inactive followers",
            value: mode === "push"
              ? k(step.demand * (1 - C.ACTIVE_FRAC)) + "/s  ·  " +
                ((1 - C.ACTIVE_FRAC) * 100).toFixed(0) + "%"
              : "0  ·  not maintained",
            flag: mode === "push" ? "warn" : "ok" },
          { label: "over the " + k(C.CELEB_THRESHOLD) + " threshold",
            value: mode === "push" ? "fanned out anyway" : "merged at read, 0 writes",
            flag: mode === "push" ? "bad" : "ok" }
        ];
      }

      var writeNode = d.node({
        title: "write path · " + modeName,
        status: mode === "pull" ? "ONE INSERT"
          : step.queue > D.FANOUT_CAP ? "BACKLOGGED"
          : step.queue > 0 ? "DRAINING" : "KEEPING UP",
        statusFlag: mode === "pull" ? "ok" : step.lag > 5 ? "bad" : step.queue > 0 ? "warn" : "ok",
        flag: mode === "pull" ? "ok" : step.lag > 5 ? "bad" : "ok",
        badge: mode === "pull" ? "no queue" : k(D.FANOUT_CAP) + "/s workers",
        meta: mode === "pull" ? "nothing precomputed"
          : C.PARTITIONS + " queue partitions · own timeline written inline",
        gauges: mode === "pull" ? [] : [
          { label: "worker utilisation", pct: pc(step.tlWrites, D.FANOUT_CAP),
            value: k(step.tlWrites) + " / " + k(D.FANOUT_CAP),
            flag: step.tlWrites >= D.FANOUT_CAP ? "bad" : "ok" },
          { label: "fan-out lag", pct: Math.min(100, pc(step.lag, 180)),
            value: secs(step.lag) + (step.queue ? "  ·  " + k(step.queue) + " queued" : ""),
            flag: step.lag > 5 ? "bad" : step.lag > 0 ? "warn" : "ok" }
        ],
        rows: wRows
      });

      // ---- read path ------------------------------------------------------
      var rRows = [];
      if (mode === "pull") {
        rRows.push([D.ROUNDS + " rounds × " + C.SHARD_RTT_MS + " ms shard RTT",
          ms(D.ROUNDS * C.SHARD_RTT_MS)]);
        rRows.push(["k-way merge of " + C.FOLLOWERS + " lists", ms(C.MERGE_MS)]);
      } else {
        rRows.push(["LRANGE timeline 0 " + (C.LRANGE_N - 1), ms(C.LRANGE_MS)]);
        if (mode === "hybrid") {
          rRows.push(["merge " + C.CELEB_FOLLOWED + " celebrities × " +
            ms(C.CELEB_MERGE_MS), ms(D.CELEB_MERGE)]);
        }
      }
      rRows.push(["rank", ms(C.RANK_MS)]);
      rRows.push(["hydrate: MGET posts + authors", ms(C.HYDRATE_MS)]);
      rRows.push(["queueing at " + p1(step.rho * 100) + " utilisation",
        step.rho >= 1 ? "unbounded" : ms(step.p99 - step.base)]);
      rRows.push(["p99", ms(step.p99)]);

      var readNode = d.node({
        title: "read path",
        status: step.fl > 0 ? "TIMING OUT"
          : step.p99 > C.P99_BUDGET_MS ? "OVER BUDGET"
          : step.staleFrac > 0.01 ? "FAST BUT STALE" : "FRESH",
        statusFlag: step.fl > 0 ? "bad" : step.p99 > C.P99_BUDGET_MS ? "bad"
          : step.staleFrac > 0.01 ? "warn" : "ok",
        flag: step.fl > 0 ? "bad" : step.p99 > C.P99_BUDGET_MS ? "bad" : "ok",
        badge: mode === "pull" ? C.FOLLOWERS + " queries per feed" : "1 lookup per feed",
        meta: mode === "pull"
          ? C.SHARDS + " shards × " + k(C.SHARD_QPS) + "/s = " + k(D.PULL_CAP) + "/s"
          : C.TL_SHARDS + " cache shards × " + k(C.TL_QPS) + "/s = " + k(D.TL_CAP) + "/s",
        gauges: [{
          label: "p99 against the " + C.P99_BUDGET_MS + " ms budget",
          pct: Math.min(100, pc(step.p99, C.P99_BUDGET_MS)),
          value: ms(step.p99),
          flag: step.p99 > C.P99_BUDGET_MS ? "bad" : "ok"
        }],
        body: d.table(["read path step", "cost"], rRows)
      });

      // ---- the stores under load -------------------------------------------
      var bars = [];
      if (mode === "pull") {
        bars.push(d.bar({
          label: "post store · " + k(step.pullQ) + " of " + k(D.PULL_CAP) + " q/s",
          pct: Math.min(100, pc(step.pullQ, D.PULL_CAP)),
          value: p1(step.pullRho * 100),
          flag: step.pullRho >= 1 ? "bad" : step.pullRho > 0.7 ? "warn" : "ok"
        }));
        bars.push(d.bar({
          label: "shards needed for this load",
          pct: Math.min(100, pc(step.pullQ / C.SHARD_QPS, D.PULL_SHARDS_NEEDED)),
          value: Math.ceil(step.pullQ / C.SHARD_QPS) + " of " + C.SHARDS + " provisioned",
          flag: step.pullQ / C.SHARD_QPS > C.SHARDS ? "bad" : "ok"
        }));
      } else {
        bars.push(d.bar({
          label: "timeline cache · " + k(step.tlWrites) + " writes + " + k(step.reads) +
            " reads of " + k(D.TL_CAP) + " ops/s",
          pct: Math.min(100, pc(step.tlRho, 1)),
          value: p1(step.tlRho * 100),
          flag: step.tlRho >= 0.95 ? "bad" : step.tlRho > 0.7 ? "warn" : "ok"
        }));
        bars.push(d.bar({
          label: "celebrity fan-out · " + k(step.celebDone) + " of " +
            k(C.CELEB_FOLLOWERS) + " timelines",
          pct: Math.min(100, pc(step.celebDone, C.CELEB_FOLLOWERS)),
          value: mode === "hybrid" ? "never fanned out"
            : p1(pc(step.celebDone, C.CELEB_FOLLOWERS)),
          flag: mode === "hybrid" ? "ok" : step.celebRem > 0 ? "bad" : "ok"
        }));
      }
      bars.push(d.bar({
        label: "feed loads missing a post they should have",
        pct: Math.min(100, step.staleFrac * 100),
        value: p1(step.staleFrac * 100),
        flag: step.staleFrac > 0.05 ? "bad" : step.staleFrac > 0.005 ? "warn" : "ok"
      }));

      // ---- the eighty-second record ------------------------------------------
      var laneP = [], laneL = [], laneOK = [], laneS = [], i2;
      for (i2 = 0; i2 < step.sum.length; i2++) {
        var s2 = step.sum[i2], fut = i2 > step.f;
        var tip = "second " + ((i2 + 1) * C.FRAME_S);
        laneP.push({
          label: fut ? "" : s2.p99 >= C.TIMEOUT_MS ? "TO" : String(Math.round(s2.p99)),
          flag: fut ? "idle" : s2.p99 >= C.TIMEOUT_MS ? "bad"
            : s2.p99 > C.P99_BUDGET_MS ? "bad" : "ok",
          title: fut ? tip + " · not reached" : tip + " · p99 " + ms(s2.p99)
        });
        laneL.push({
          label: fut ? "" : s2.lag < 1 ? "0" : s2.lag < 60 ? String(Math.round(s2.lag))
            : Math.round(s2.lag / 60) + "m",
          flag: fut ? "idle" : s2.lag <= 5 ? "ok" : "bad",
          title: fut ? tip + " · not reached" : tip + " · fan-out lag " + secs(s2.lag)
        });
        laneOK.push({
          label: fut ? "" : Math.round(s2.okFrac * 100) + "",
          flag: fut ? "idle" : s2.okFrac >= 0.999 ? "ok" : s2.okFrac >= 0.9 ? "warn" : "bad",
          title: fut ? tip + " · not reached"
            : tip + " · " + p1(s2.okFrac * 100) + " of feed loads served"
        });
        laneS.push({
          label: fut ? "" : s2.staleFrac < 0.005 ? "·" :
            Math.round(s2.staleFrac * 100) + "",
          flag: fut ? "idle" : s2.staleFrac < 0.005 ? "ok"
            : s2.staleFrac < 0.05 ? "warn" : "bad",
          title: fut ? tip + " · not reached"
            : tip + " · " + p1(s2.staleFrac * 100) + " of feeds missing a post"
        });
      }

      var lanes = d.stack([
        d.lane({ label: "p99 ms", cells: laneP }),
        d.lane({ label: "fan-out lag s", cells: laneL }),
        d.lane({ label: "served %", cells: laneOK }),
        d.lane({ label: "stale %", cells: laneS })
      ]);

      return d.stack([
        head,
        d.cols([writeNode, readNode]),
        d.stack(bars),
        lanes,
        d.note("One cell per 10-second frame. <b>p99</b> green under the " +
          C.P99_BUDGET_MS + " ms budget, <b>TO</b> the " + (C.TIMEOUT_MS / 1000) +
          " s timeout. <b>fan-out lag</b> is how long a post now waits before it reaches " +
          "a follower — green is inside the page's \"a few seconds stale\". " +
          "<b>served %</b> is feed loads answered, <b>stale %</b> feed loads missing a " +
          "post they should have, which is Poisson in the lag plus anyone still waiting " +
          "on the celebrity.", step.fl > 0 ? "bad" : undefined)
      ]);
    }
  };

  // ====================================================================
  // ======================================================================
  // SIM · sdestimation  (estimation.md)
  // The page's five-line template (§4) executed one line at a time on the
  // page's own two worked examples (§5, §6), and then a third run of the
  // same template with the page's three commonest mistakes switched on
  // (§8) — provision for the average, forget the replication factor, stop
  // before the conclusion — so the arithmetic itself shows which decisions
  // flip. The time axis is the template: USERS → QPS → STORAGE →
  // BANDWIDTH → DECIDE, which is the order the three minutes are spent in.
  //
  // CONFIG — every constant below is the page's, quoted:
  //   seconds/day shortcut  100,000         §3 "use 100,000" (real 86,400)
  //   peak multiplier       ×3              §3 "peak is 2-3x"; both worked
  //                                         examples use 3
  //   days/year             365             §4 template line 3
  //   replication factor    ×3              §5 "x3 (replication)"
  //   tweet (with metadata) 1 KB            §2 size table
  //   compressed photo      1 MB            §2 size table
  //   thumbnail served      200 KB          §6 bandwidth line
  //   web/app server       10,000 QPS       §2 throughput, low end of 10k-50k
  //   SQL primary           5,000 writes/s  §2 throughput, low end of 5k-10k
  //   server RAM            64 GB           §2, and §5 "~10 nodes at 64 GB"
  //   timeline entry        800 ids × 8 B   §5 follow-up
  //   active fraction       20%             §5 follow-up
  //   failure headroom      +2 servers      §9 "30,000 QPS at 10k per server
  //                                         is 3, so provision 5"
  //   Twitter   500M DAU · 0.2 tweets/day · 2 timeline reads/day    §5
  //   Photos    100M DAU · 0.5 uploads/day · 20 views/day           §6
  //
  // DECLARED HERE, because the page does not publish it: a primary is not
  // run above 50% of its quoted ceiling. That one rule is what makes the
  // page's own call come out right — it says 3,000 writes/s is "past a
  // single primary (~5-10k, and that is optimistic with indexes)", and
  // 3,000 > 0.5 × 5,000 is the arithmetic behind that sentence.
  //
  // Two rows of the §7 decision table are evaluated with ≥ rather than >,
  // and the screen says so: Twitter's read:write ratio is exactly 10 and a
  // photo is exactly 1 MB, so a strict > would silently drop the two
  // decisions the page itself makes. Every other figure on screen is
  // computed from the config above; nothing is transcribed.
  // ======================================================================
  var sdestimation_SEC = 1e5;              // the shortcut
  var sdestimation_SEC_REAL = 86400;       // the truth
  var sdestimation_DAYS = 365;
  var sdestimation_TRUE_PEAK = 3;
  var sdestimation_TRUE_REPL = 3;
  var sdestimation_KB = 1e3;
  var sdestimation_MB = 1e6;
  var sdestimation_APP_QPS = 10000;
  var sdestimation_PRIMARY = 5000;
  var sdestimation_HEADROOM = 0.5;                                        // declared
  var sdestimation_USABLE = sdestimation_PRIMARY * sdestimation_HEADROOM; // 2,500/s
  var sdestimation_SPARE = 2;              // the page's 3 -> 5
  var sdestimation_NODE_B = 64 * 1e9;
  var sdestimation_TL_IDS = 800;
  var sdestimation_ID_B = 8;
  var sdestimation_ACTIVE = 0.20;

  // how wrong the shortcut is, both ways round
  var sdestimation_DIV_HIGH =
    (sdestimation_SEC / sdestimation_SEC_REAL - 1) * 100;                 // 15.7%
  var sdestimation_QPS_LOW =
    (1 - sdestimation_SEC_REAL / sdestimation_SEC) * 100;                 // 13.6%

  function sdestimation_num(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  /** 1e8 -> "100M", for the user-facing per-day counts. */
  function sdestimation_big(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + "k";
    return String(Math.round(n));
  }
  function sdestimation_trim(s) {
    return s.indexOf(".0") === s.length - 2 ? s.slice(0, -2) : s;
  }
  /** Decimal units, the way the page writes them: 100 GB, 36.5 TB, 18.3 PB. */
  function sdestimation_scale(v, units) {
    var i = 0;
    while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
    return sdestimation_trim(v >= 100 ? v.toFixed(0) : v.toFixed(1)) + " " + units[i];
  }
  function sdestimation_bytes(b) {
    return sdestimation_scale(b, ["B", "KB", "MB", "GB", "TB", "PB", "EB"]);
  }
  function sdestimation_bps(bytesPerSec) {
    return sdestimation_scale(bytesPerSec, ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"]);
  }
  function sdestimation_bits(bitsPerSec) {
    return sdestimation_scale(bitsPerSec, ["bps", "kbps", "Mbps", "Gbps", "Tbps"]);
  }
  function sdestimation_qps(n) { return sdestimation_num(n) + "/s"; }
  function sdestimation_p1(x) { return x.toFixed(1) + "%"; }
  function sdestimation_plural(n, word) {
    return n + " " + word + (Math.abs(n) === 1 ? "" : "s");
  }

  /** The whole estimate. Five lines of template, nothing else. */
  function sdestimation_solve(cfg) {
    var r = {};
    r.writesDay = cfg.dau * cfg.wPer;
    r.readsDay = cfg.dau * cfg.rPer;
    r.wAvg = r.writesDay / sdestimation_SEC;
    r.rAvg = r.readsDay / sdestimation_SEC;
    r.wPeak = r.wAvg * cfg.peak;
    r.rPeak = r.rAvg * cfg.peak;
    r.dayB = r.writesDay * cfg.wBytes;
    r.yearB = r.dayB * sdestimation_DAYS;
    r.storeB = r.yearB * cfg.repl;
    r.bwB = r.rAvg * cfg.outBytes;          // the page bills egress off AVERAGE reads
    r.bwBits = r.bwB * 8;
    r.ratio = r.wAvg > 0 ? r.rAvg / r.wAvg : 0;

    // provisioning, from the numbers this run believes
    r.apps = Math.ceil(r.rPeak / sdestimation_APP_QPS);
    r.appsProv = r.apps + sdestimation_SPARE;
    r.shards = Math.ceil(r.wPeak / sdestimation_USABLE);
    r.util = (r.wPeak / sdestimation_PRIMARY) * 100;

    // what peak and replication actually are, whatever this run assumed
    r.trueWPeak = r.wAvg * sdestimation_TRUE_PEAK;
    r.trueRPeak = r.rAvg * sdestimation_TRUE_PEAK;
    r.trueStoreB = r.yearB * sdestimation_TRUE_REPL;
    r.trueShards = Math.ceil(r.trueWPeak / sdestimation_USABLE);
    r.trueApps = Math.ceil(r.trueRPeak / sdestimation_APP_QPS) + sdestimation_SPARE;

    // survive losing one server and still absorb the real peak (§9)
    r.survives = (r.appsProv - 1) * sdestimation_APP_QPS;
    r.shortfall = r.trueRPeak - r.survives;
    r.shortfallPct = r.trueRPeak > 0 ? (Math.max(0, r.shortfall) / r.trueRPeak) * 100 : 0;

    // §5's follow-up: the timeline cache
    r.cacheAllB = cfg.dau * sdestimation_TL_IDS * sdestimation_ID_B;
    r.cacheHotB = r.cacheAllB * sdestimation_ACTIVE;
    r.cacheNodes = Math.ceil(r.cacheHotB / sdestimation_NODE_B);

    // §6's follow-up: serving originals instead of resized variants
    r.origBits = r.rAvg * cfg.wBytes * 8;
    r.variantX = cfg.outBytes > 0 ? cfg.wBytes / cfg.outBytes : 0;
    return r;
  }

  /** §7 transcribed, evaluated against whatever this run produced. */
  function sdestimation_rules(r, cfg, w, rd, storeB, peakMult) {
    var ratio = w > 0 ? rd / w : 0;
    return [
      { k: "Write QPS", is: "< 1,000", then: "Single primary; do not shard",
        on: w < 1000 },
      { k: "Write QPS", is: "> 10,000", then: "Shard; name the shard key",
        on: w > 10000 },
      { k: "Read QPS", is: "≥ 10× writes", then: "Cache layer; consider precomputation",
        on: ratio >= 10 },
      { k: "Read QPS", is: "> 100k", then: "CDN or edge cache, not just a cache tier",
        on: rd > 100000 },
      { k: "Storage/yr", is: "< 1 TB", then: "One machine; it fits in RAM territory",
        on: storeB < 1e12 },
      { k: "Storage/yr", is: "> 100 TB", then: "Sharded, tiered, lifecycle policies",
        on: storeB > 1e14 },
      { k: "Payload", is: "≥ 1 MB", then: "Object storage + CDN; DB holds metadata",
        on: cfg.wBytes >= sdestimation_MB },
      { k: "Bandwidth", is: "> 10 Gbps", then: "CDN is the architecture; cost drives it",
        on: r.bwBits > 1e10 },
      { k: "Peak/avg", is: "> 5×", then: "Queue to absorb; autoscaling is too slow",
        on: peakMult > 5 }
    ];
  }

  function sdestimation_fired(rules) {
    var out = [], i;
    for (i = 0; i < rules.length; i++) if (rules[i].on) out.push(rules[i]);
    return out;
  }

  /** The worked sheet, one line added per template step. */
  function sdestimation_sheet(r, cfg, st) {
    var rows = [];
    if (st >= 1) {
      rows.push(["1 USERS",
        sdestimation_big(cfg.dau) + " DAU × " + cfg.wPer + " " + cfg.wNoun,
        sdestimation_big(r.writesDay) + "/day"]);
      rows.push(["",
        sdestimation_big(cfg.dau) + " DAU × " + cfg.rPer + " " + cfg.rNoun,
        sdestimation_big(r.readsDay) + "/day"]);
    }
    if (st >= 2) {
      rows.push(["2 QPS w",
        sdestimation_big(r.writesDay) + " / 100,000 × " + cfg.peak,
        sdestimation_qps(r.wPeak) + " peak"]);
    }
    if (st >= 3) {
      rows.push(["2 QPS r",
        sdestimation_big(r.readsDay) + " / 100,000 × " + cfg.peak,
        sdestimation_qps(r.rPeak) + " peak"]);
    }
    if (st >= 4) {
      rows.push(["3 STORE",
        sdestimation_big(r.writesDay) + " × " + sdestimation_bytes(cfg.wBytes) +
          " × 365 × " + cfg.repl,
        sdestimation_bytes(r.storeB) + "/yr"]);
    }
    if (st >= 5) {
      rows.push(["4 BW",
        sdestimation_qps(r.rAvg) + " × " + sdestimation_bytes(cfg.outBytes),
        sdestimation_bits(r.bwBits)]);
    }
    if (st >= 6) {
      rows.push(["5 CONCL",
        sdestimation_fired(
          sdestimation_rules(r, cfg, r.wPeak, r.rPeak, r.storeB, cfg.peak)
        ).length + " of 9 rules fire",
        r.shards + " shard(s) · " + r.appsProv + " app servers"]);
    }
    return rows;
  }

  function sdestimation_scenario(cfg) {
    var r = sdestimation_solve(cfg);
    var s = [];

    s.push({
      st: 0, r: r, cfg: cfg,
      caption: "<b>" + cfg.title + ".</b> " + cfg.blurb + " The template is five lines " +
        "and the budget is three minutes — the framework gives estimation minutes 5 to 8 " +
        "of the round. Every number from here down is arithmetic on two inputs: <b>" +
        sdestimation_big(cfg.dau) + " DAU</b> and what one of them does in a day."
    });

    s.push({
      st: 1, r: r, cfg: cfg, flag: "ok",
      caption: "<b>1 · USERS.</b> " + sdestimation_big(cfg.dau) + " × " + cfg.wPer + " " +
        cfg.wNoun + "/day = <b>" + sdestimation_big(r.writesDay) + " " + cfg.wNoun +
        "/day</b>; × " + cfg.rPer + " " + cfg.rNoun + "/day = <b>" +
        sdestimation_big(r.readsDay) + "/day</b>. Neither of these is estimated — they are " +
        "the two numbers you asked for in scoping. The read:write ratio is already visible " +
        "at <b>" + r.ratio.toFixed(0) + ":1</b>, and the framework calls that the single " +
        "most useful number in the round."
    });

    s.push({
      st: 2, r: r, cfg: cfg, flag: cfg.peak >= 2 ? "ok" : "bad",
      caption: "<b>2 · QPS, writes.</b> " + sdestimation_big(r.writesDay) +
        " / 100,000 = <b>" + sdestimation_qps(r.wAvg) + "</b> average. A day is 86,400 s; " +
        "calling it 100,000 makes the divisor " + sdestimation_p1(sdestimation_DIV_HIGH) +
        " high and the QPS it returns " + sdestimation_p1(sdestimation_QPS_LOW) +
        " low — inside the page's 16%, and a decimal shift instead of a long division. " +
        (cfg.peak >= 2
          ? "× " + cfg.peak + " for peak = <b>" + sdestimation_qps(r.wPeak) +
            "</b>, and saying <i>which</i> multiplier and why is part of the answer."
          : "<b>× 1.</b> This run provisions for the average — the page's fourth mistake, " +
            "and the one that does the most damage, because nothing about it looks wrong yet.")
    });

    s.push({
      st: 3, r: r, cfg: cfg, flag: cfg.peak >= 2 ? "ok" : "bad",
      caption: "<b>2 · QPS, reads.</b> " + sdestimation_big(r.readsDay) + " / 100,000 × " +
        cfg.peak + " = <b>" + sdestimation_qps(r.rPeak) + "</b> peak. At " +
        sdestimation_num(sdestimation_APP_QPS) + " QPS per app server that is <b>" +
        sdestimation_plural(r.apps, "server") +
        "</b> of pure capacity; the page provisions <b>" + r.appsProv +
        "</b>, because you have to survive losing one and still absorb a spike. " +
        (cfg.peak >= 2
          ? "That +" + sdestimation_SPARE + " is the whole difference between a capacity " +
            "number and a provisioning decision."
          : "Provisioned off the average, that is <b>" + r.appsProv +
            "</b> servers — hold on to it until the last frame.")
    });

    s.push({
      st: 4, r: r, cfg: cfg, flag: cfg.repl >= 3 ? "ok" : "bad",
      caption: "<b>3 · STORAGE.</b> " + sdestimation_big(r.writesDay) + " × " +
        sdestimation_bytes(cfg.wBytes) + " = <b>" + sdestimation_bytes(r.dayB) +
        "/day</b>, × 365 = <b>" + sdestimation_bytes(r.yearB) + "/year</b>" +
        (cfg.repl > 1
          ? ", × " + cfg.repl + " replication = <b>" + sdestimation_bytes(r.storeB) +
            "</b>. " + cfg.storeNote
          : ". <b>And that is where this run stops</b> — no replication factor, the page's " +
            "fifth mistake. Three copies is not an optimisation, it is how the data survives " +
            "a disk; leaving it out is a 3× error in the only number that buys hardware.")
    });

    s.push({
      st: 5, r: r, cfg: cfg, flag: r.bwBits > 1e10 ? "warn" : "ok",
      caption: "<b>4 · BANDWIDTH.</b> The template says <i>only if payloads are large</i>. " +
        sdestimation_qps(r.rAvg) + " × " + sdestimation_bytes(cfg.outBytes) + " = " +
        sdestimation_bps(r.bwB) + " = <b>" + sdestimation_bits(r.bwBits) + "</b>. " +
        cfg.bwNote
    });

    s.push({
      st: 6, r: r, cfg: cfg, flag: cfg.decideFlag,
      caption: cfg.decide(r)
    });

    s.push({
      st: 7, r: r, cfg: cfg, flag: cfg.followFlag,
      caption: cfg.follow(r)
    });

    s.push({
      st: 8, r: r, cfg: cfg, flag: cfg.verdictFlag,
      caption: cfg.verdict(r)
    });

    return { id: cfg.id, label: cfg.label, steps: s };
  }

  var sdestimation_TWITTER = sdestimation_scenario({
    id: "tw", label: "Twitter timeline", title: "Twitter-scale timeline",
    dau: 500e6, wPer: 0.2, rPer: 2,
    wNoun: "tweets", rNoun: "timeline reads",
    wBytes: sdestimation_KB, outBytes: sdestimation_KB,
    peak: 3, repl: 3, followKind: "cache",
    blurb: "The page's first worked example, run line by line.",
    storeNote: "The page writes ~36 TB and ~110 TB; the arithmetic gives these. " +
      "Rounding is the point — nobody is checking, and the magnitude is what decides.",
    bwNote: "Two orders of magnitude under the 10 Gbps line, so it binds nothing. " +
      "Computing it took four seconds and saying <i>“bandwidth is not the interesting " +
      "number here”</i> is worth more than the number itself.",
    decideFlag: "ok",
    decide: function (r) {
      return "<b>5 · CONCLUDE.</b> Watch the write row: <b>" + sdestimation_qps(r.wPeak) +
        "</b> fires <i>neither</i> of the page's two write rules — it is not under 1,000 and " +
        "not over 10,000. The decision comes from the memorised number instead: a primary " +
        "does " + sdestimation_num(sdestimation_PRIMARY) + " writes/s and you do not run one " +
        "above half of that, so " + sdestimation_qps(r.wPeak) + " is <b>" +
        r.util.toFixed(0) + "%</b> of a primary and needs <b>" + r.shards +
        " shards, keyed by tweet ID</b>. Reads are exactly <b>" + r.ratio.toFixed(0) +
        "×</b> writes — on the line, and the page still caches, because " +
        sdestimation_qps(r.rPeak) + " cannot reach a database at all.";
    },
    followFlag: "ok",
    follow: function (r) {
      return "<b>The follow-up: how much RAM does the timeline cache need?</b> " +
        sdestimation_big(500e6) + " users × " + sdestimation_TL_IDS + " cached tweet ids × " +
        sdestimation_ID_B + " B = <b>" + sdestimation_bytes(r.cacheAllB) + "</b>. Then the " +
        "refinement, which <i>is</i> the answer: " +
        ((1 - sdestimation_ACTIVE) * 100).toFixed(0) + "% of users are not active today and " +
        "can be rebuilt on demand, so cache the active " +
        (sdestimation_ACTIVE * 100).toFixed(0) + "% — <b>" +
        sdestimation_bytes(r.cacheHotB) + "</b>, about <b>" + r.cacheNodes +
        " nodes at 64 GB</b>. Noticing you do not have to cache everyone, and saying what a " +
        "miss costs, is the level-2 to level-3 step.";
    },
    verdictFlag: "ok",
    verdict: function (r) {
      return "<b>Three numbers, three decisions, under three minutes.</b> Shard the tweet " +
        "store (" + r.shards + " shards by tweet ID), serve timelines from <b>" +
        r.cacheNodes + " cache nodes</b>, provision <b>" + r.appsProv +
        "</b> app servers — and losing one still leaves " + sdestimation_qps(r.survives) +
        " against a " + sdestimation_qps(r.trueRPeak) + " peak. The binding constraint here " +
        "was <b>read QPS</b>. Keep that word: the next tab runs the identical template and " +
        "the binding constraint is somewhere else entirely.";
    }
  });

  var sdestimation_PHOTO = sdestimation_scenario({
    id: "ph", label: "Photo service", title: "A photo service",
    dau: 100e6, wPer: 0.5, rPer: 20,
    wNoun: "uploads", rNoun: "photo views",
    wBytes: sdestimation_MB, outBytes: 200 * sdestimation_KB,
    peak: 3, repl: 3, followKind: "variant",
    blurb: "Same template, same shortcuts, media instead of text.",
    storeNote: "The page writes ~18 PB and ~55 PB. Note what just happened: the same " +
      "template line, three orders of magnitude of difference, because one field in the " +
      "config went from 1 KB to 1 MB.",
    bwNote: "<b>This is the number that decides the architecture</b> — and for Twitter it " +
      "was not even worth computing. The shape of the problem changed, and noticing that is " +
      "the difference between reading the problem and running a ritual.",
    decideFlag: "warn",
    decide: function (r) {
      var fired = sdestimation_fired(
        sdestimation_rules(r, this, r.wPeak, r.rPeak, r.storeB, this.peak)).length;
      return "<b>5 · CONCLUDE.</b> " + fired + " rules fire and the interesting one is which " +
        "does <i>not</i>: read QPS is " + sdestimation_qps(r.rPeak) + ", under the 100k line, so " +
        "the CDN is <b>not</b> justified by request rate. It is justified by <b>" +
        sdestimation_bits(r.bwBits) + " of egress</b>, which is a cost problem rather than a " +
        "capacity problem. Storage at " + sdestimation_bytes(r.storeB) +
        "/year rules out blobs in a database — object storage for the bytes, the DB holds " +
        "metadata, and writes are only " + sdestimation_qps(r.wPeak) + ", which is " +
        r.util.toFixed(0) + "% of one primary: <b>" + r.shards + " metadata shard</b>.";
    },
    followFlag: "warn",
    follow: function (r) {
      return "<b>The follow-up: what if you served originals?</b> " +
        sdestimation_qps(r.rAvg) + " × " + sdestimation_bytes(1e6) + " = <b>" +
        sdestimation_bits(r.origBits) + "</b> instead of " + sdestimation_bits(r.bwBits) +
        " — the same <b>" + r.variantX.toFixed(0) + "×</b> that separates a " +
        sdestimation_bytes(200e3) + " thumbnail from a " + sdestimation_bytes(1e6) +
        " original. One resize decision moves more bandwidth than every other saving on the " +
        "table put together, and it is a product choice, not an infrastructure one.";
    },
    verdictFlag: "ok",
    verdict: function (r) {
      return "<b>Same five lines, a different architecture.</b> Object storage + CDN + " +
        "resized variants, <b>" + r.appsProv + "</b> app servers for a " +
        sdestimation_qps(r.rPeak) + " peak (losing one still leaves " +
        sdestimation_qps(r.survives) + "), and a single metadata primary. The binding " +
        "constraint was <b>egress cost</b>, not QPS and not storage. The template does not " +
        "tell you which number binds — it just makes sure you have all of them by minute " +
        "eight, so you can see it.";
    }
  });

  var sdestimation_NAIVE = sdestimation_scenario({
    id: "avg", label: "Average, un-replicated", title: "The same Twitter estimate, three mistakes in",
    dau: 500e6, wPer: 0.2, rPer: 2,
    wNoun: "tweets", rNoun: "timeline reads",
    wBytes: sdestimation_KB, outBytes: sdestimation_KB,
    peak: 1, repl: 1, followKind: "reveal",
    blurb: "Identical inputs to tab one. Three switches move: provision for the average, " +
      "skip the replication factor, and stop at the numbers.",
    storeNote: "",
    bwNote: "Still nothing. This one the run gets right, because the mistake in this run " +
      "is not in the arithmetic — every line above is correctly computed from what was " +
      "fed in.",
    decideFlag: "warn",
    decide: function (r) {
      return "<b>5 · CONCLUDE — except there is no conclusion.</b> The numbers are on the " +
        "board and the candidate moves on. Look at what the table says about them: <b>" +
        sdestimation_qps(r.wPeak) + "</b> is not under 1,000 and not over 10,000, so no " +
        "write rule fires; <b>" + sdestimation_bytes(r.storeB) +
        "</b> is not under 1 TB and not over 100 TB, so no storage rule fires. Two of the " +
        "three headline numbers produced <b>zero decisions</b> and nobody noticed, because " +
        "nobody asked the numbers to decide anything. That is the page's third mistake, " +
        "and it is invisible from the inside.";
    },
    followFlag: "bad",
    follow: function (r) {
      return "<b>The interviewer asks two questions.</b> <i>“Is that peak or average?”</i> " +
        "and <i>“is that replicated?”</i> Peak is ×" + sdestimation_TRUE_PEAK + ": writes " +
        "are really <b>" + sdestimation_qps(r.trueWPeak) + "</b>, which is <b>" +
        ((r.trueWPeak / sdestimation_PRIMARY) * 100).toFixed(0) + "%</b> of a primary and " +
        "needs <b>" + r.trueShards + " shards</b>, not the " + r.shards +
        " this run concluded. Replication is ×" + sdestimation_TRUE_REPL + ": storage is " +
        "really <b>" + sdestimation_bytes(r.trueStoreB) + "/year</b>, which crosses the " +
        "100 TB line the un-replicated " + sdestimation_bytes(r.storeB) + " sat under. " +
        "<b>Both decisions flip</b>, and neither was an arithmetic error.";
    },
    verdictFlag: "bad",
    verdict: function (r) {
      return "<b>The fleet is short by " + (r.trueApps - r.appsProv) + " servers.</b> " +
        r.appsProv + " were provisioned off a " + sdestimation_qps(r.rAvg) +
        " average; the real peak is " + sdestimation_qps(r.trueRPeak) + " and needs " +
        r.trueApps + ". Lose one machine at peak and " + (r.appsProv - 1) + " × " +
        sdestimation_num(sdestimation_APP_QPS) + " = " + sdestimation_qps(r.survives) +
        " serves <b>" + sdestimation_p1(100 - r.shortfallPct) + "</b> of the offered load — " +
        "<b>" + sdestimation_qps(r.shortfall) + " of readers get an error</b>. Three " +
        "mistakes, none of them arithmetic: an un-multiplied average, a forgotten replication " +
        "factor, and a phase that ended without a <i>“so this means…”</i>. The estimate was " +
        "not wrong. It was unused.";
    }
  });

  S["sdestimation"] = {
    title: "Run the estimation template on the clock",
    note: "Two inputs per run — DAU and actions per user per day — and the page's five-line " +
      "template. Constants are the page's: a day is <b>100,000 s</b>, peak is <b>×3</b>, a " +
      "year is <b>365</b> days, replication is <b>×3</b>, a tweet is <b>1 KB</b> and a photo " +
      "<b>1 MB</b>, an app server does <b>10k QPS</b>, a SQL primary <b>5k writes/s</b>, a " +
      "cache node holds <b>64 GB</b>, and provisioning adds <b>+2</b> servers so you survive " +
      "losing one (the page's “30,000 at 10k per server is 3, so provision 5”). One rule is " +
      "declared here rather than quoted, because the page does not publish it: <b>a primary " +
      "is not run above 50% of its ceiling</b> — that is the arithmetic behind the page " +
      "calling 3,000 writes/s “past a single primary”. Every figure below is computed; the " +
      "§7 decision table is transcribed and then evaluated, not asserted.",
    interval: 1400,

    scenarios: [sdestimation_TWITTER, sdestimation_PHOTO, sdestimation_NAIVE],

    draw: function (step, d, ctx) {
      var r = step.r, cfg = step.cfg, st = step.st;
      var names = [
        "the prompt", "1 · USERS", "2 · QPS writes", "2 · QPS reads",
        "3 · STORAGE", "4 · BANDWIDTH", "5 · CONCLUDE", "the follow-up", "the decision"
      ];

      var rules = sdestimation_rules(r, cfg, r.wPeak, r.rPeak, r.storeB, cfg.peak);
      var fired = sdestimation_fired(rules);

      var head = d.cols([
        d.big(st >= 2 ? sdestimation_qps(r.wPeak) : "—", "write QPS · peak",
          st < 2 ? "idle" : cfg.peak >= 2 ? "ok" : "bad"),
        d.stat({
          label: "read QPS · peak",
          value: st >= 3 ? sdestimation_qps(r.rPeak) : "—",
          sub: st >= 3 ? r.appsProv + " app servers" : "not computed",
          flag: st < 3 ? "idle" : cfg.peak >= 2 ? "ok" : "bad"
        }),
        d.stat({
          label: "storage / year",
          value: st >= 4 ? sdestimation_bytes(r.storeB) : "—",
          sub: st >= 4 ? "× " + cfg.repl + " replication" : "not computed",
          flag: st < 4 ? "idle" : cfg.repl >= 3 ? "ok" : "bad"
        }),
        d.stat({
          label: "egress",
          value: st >= 5 ? sdestimation_bits(r.bwBits) : "—",
          sub: st >= 5 ? (r.bwBits > 1e10 ? "over the 10 Gbps line" : "not binding") : "not computed",
          flag: st < 5 ? "idle" : r.bwBits > 1e10 ? "warn" : "ok"
        })
      ]);

      // the template, with the current line lit
      var tpl = ["1 USERS", "2 QPS", "3 STORAGE", "4 BANDWIDTH", "5 CONCLUDE"];
      var reached = [st >= 1, st >= 2, st >= 4, st >= 5, st >= 6];
      var cells = [], i;
      for (i = 0; i < tpl.length; i++) {
        cells.push({
          label: tpl[i],
          flag: !reached[i] ? "idle"
            : (i === 4 && cfg.followKind === "reveal") ? "bad" : "ok",
          title: reached[i] ? "done" : "not reached yet"
        });
      }

      var rows = [];
      if (st === 0) {
        rows.push({ label: "DAU", value: sdestimation_big(cfg.dau) });
        rows.push({ label: cfg.wNoun + " per user per day", value: String(cfg.wPer) });
        rows.push({ label: cfg.rNoun + " per user per day", value: String(cfg.rPer) });
        rows.push({ label: "bytes per write", value: sdestimation_bytes(cfg.wBytes) });
      } else if (st === 1) {
        rows.push({ label: cfg.wNoun + " / day", value: sdestimation_big(r.writesDay), flag: "ok" });
        rows.push({ label: cfg.rNoun + " / day", value: sdestimation_big(r.readsDay), flag: "ok" });
        rows.push({ label: "read : write", value: r.ratio.toFixed(0) + " : 1" });
      } else if (st === 2) {
        rows.push({ label: "divisor used", value: sdestimation_num(sdestimation_SEC) + " s" });
        rows.push({ label: "real seconds in a day", value: sdestimation_num(sdestimation_SEC_REAL) + " s" });
        rows.push({ label: "average writes", value: sdestimation_qps(r.wAvg) });
        rows.push({ label: "peak multiplier", value: "× " + cfg.peak,
          flag: cfg.peak >= 2 ? "ok" : "bad" });
        rows.push({ label: "peak writes", value: sdestimation_qps(r.wPeak),
          flag: cfg.peak >= 2 ? "ok" : "bad" });
      } else if (st === 3) {
        rows.push({ label: "average reads", value: sdestimation_qps(r.rAvg) });
        rows.push({ label: "peak reads", value: sdestimation_qps(r.rPeak),
          flag: cfg.peak >= 2 ? "ok" : "bad" });
        rows.push({ label: "at " + sdestimation_num(sdestimation_APP_QPS) + " QPS/server",
          value: r.apps + " for capacity" });
        rows.push({ label: "provisioned (+" + sdestimation_SPARE + " for failure)",
          value: String(r.appsProv), flag: cfg.peak >= 2 ? "ok" : "bad" });
      } else if (st === 4) {
        rows.push({ label: "per day", value: sdestimation_bytes(r.dayB) });
        rows.push({ label: "per year, one copy", value: sdestimation_bytes(r.yearB) });
        rows.push({ label: "replication factor", value: "× " + cfg.repl,
          flag: cfg.repl >= 3 ? "ok" : "bad" });
        rows.push({ label: "stored per year", value: sdestimation_bytes(r.storeB),
          flag: cfg.repl >= 3 ? "ok" : "bad" });
      } else if (st === 5) {
        rows.push({ label: "bytes per response", value: sdestimation_bytes(cfg.outBytes) });
        rows.push({ label: "average read QPS", value: sdestimation_qps(r.rAvg) });
        rows.push({ label: "egress", value: sdestimation_bps(r.bwB) + "  ·  " +
          sdestimation_bits(r.bwBits), flag: r.bwBits > 1e10 ? "warn" : "ok" });
      } else if (st === 6) {
        rows.push({ label: "rules fired", value: fired.length + " of " + rules.length,
          flag: fired.length ? "ok" : "bad" });
        rows.push({ label: "peak writes vs one primary",
          value: r.util.toFixed(0) + "% of " + sdestimation_num(sdestimation_PRIMARY) + "/s",
          flag: r.util > 50 ? "warn" : "ok" });
        rows.push({ label: "shards at 50% headroom", value: String(r.shards),
          flag: r.shards > 1 ? "warn" : "ok" });
      } else if (st === 7) {
        if (cfg.followKind === "cache") {
          rows.push({ label: "every user", value: sdestimation_bytes(r.cacheAllB), flag: "warn" });
          rows.push({ label: "active " + (sdestimation_ACTIVE * 100).toFixed(0) + "% only",
            value: sdestimation_bytes(r.cacheHotB), flag: "ok" });
          rows.push({ label: "nodes at 64 GB", value: String(r.cacheNodes), flag: "ok" });
        } else if (cfg.followKind === "variant") {
          rows.push({ label: "serving 200 KB variants", value: sdestimation_bits(r.bwBits), flag: "ok" });
          rows.push({ label: "serving 1 MB originals", value: sdestimation_bits(r.origBits), flag: "bad" });
          rows.push({ label: "difference", value: r.variantX.toFixed(0) + "×", flag: "warn" });
        } else {
          rows.push({ label: "peak writes, believed", value: sdestimation_qps(r.wPeak) });
          rows.push({ label: "peak writes, actual", value: sdestimation_qps(r.trueWPeak), flag: "bad" });
          rows.push({ label: "storage, believed", value: sdestimation_bytes(r.storeB) });
          rows.push({ label: "storage, actual", value: sdestimation_bytes(r.trueStoreB), flag: "bad" });
        }
      } else {
        rows.push({ label: "shards concluded", value: String(r.shards),
          flag: r.shards === r.trueShards ? "ok" : "bad" });
        rows.push({ label: "app servers provisioned", value: String(r.appsProv),
          flag: r.appsProv >= r.trueApps ? "ok" : "bad" });
        rows.push({ label: "capacity after losing one", value: sdestimation_qps(r.survives),
          flag: r.survives >= r.trueRPeak ? "ok" : "bad" });
        rows.push({ label: "real peak to serve", value: sdestimation_qps(r.trueRPeak) });
      }

      var body = [];
      if (st >= 6) {
        var rr = [], k, src = st >= 7 && cfg.followKind === "reveal"
          ? sdestimation_rules(r, cfg, r.trueWPeak, r.trueRPeak, r.trueStoreB,
              sdestimation_TRUE_PEAK)
          : rules;
        for (k = 0; k < src.length; k++) {
          rr.push([src[k].k, src[k].is, src[k].on ? src[k].then : "—"]);
        }
        body.push(d.table(
          [st >= 7 && cfg.followKind === "reveal" ? "§7 · on the real numbers" : "§7 · if you compute",
            "and it is", "then"],
          rr
        ));
      }

      return d.stack([
        head,
        d.cells(cells, { label: "the template" }),
        d.node({
          title: names[st],
          status: st === 0 ? "3 MIN" : st === 8 ? "DECIDED" : "LINE " + Math.min(st, 5) + " / 5",
          statusFlag: step.flag || "idle",
          badge: cfg.label,
          meta: sdestimation_big(cfg.dau) + " DAU · peak ×" + cfg.peak +
            " · replication ×" + cfg.repl,
          flag: step.flag || "idle",
          rows: rows,
          body: body.length ? d.stack(body) : undefined
        }),
        d.table(["step", "arithmetic", "result"], sdestimation_sheet(r, cfg, st)),
        d.note(
          st >= 6
            ? "The estimate is not the number — it is the row in the right-hand column. " +
              "A run that produces figures and fires no rule spent three minutes on nothing."
            : "Every line is two inputs and a constant. Nothing here needs a calculator, " +
              "which is the entire reason the shortcuts exist.",
          st >= 6 ? (fired.length ? undefined : "bad") : undefined
        )
      ]);
    }
  };

  // ====================================================================
  // ======================================================================
  // SIM · sdfailureandresili  (failure-and-resilience.md)
  // One incident, eight seconds long, run three times with different
  // policies. The dependency does not die — it gets slow, which the page
  // calls the dangerous one, and the whole mechanism is Little's Law:
  // threads held = arrival rate × hold time. Every number on screen comes
  // out of that one identity plus the policy switches.
  //
  // CONFIG — the page's figures, quoted:
  //   thread pool            100 shared        §5 "one shared pool of 100"
  //   bulkhead split         recs 20 · checkout 50 · everything else 30
  //                                            §5, verbatim (sums to 100)
  //   healthy hold           50 ms             §1 "10 seconds instead of
  //                                            50 milliseconds"
  //   degraded dependency    10 s              §1, same sentence
  //   naive retry policy     3 attempts, immediate   §3 "immediately, 3
  //                                            times each"
  //   retry budget           10% of traffic    §3 "~10% of total traffic
  //                                            across the client"
  //   criticality tiers      checkout critical · search important ·
  //                          recommendations nice-to-have       §6
  //   hours/year 8,760 · hours/month 720       §7 SLA table reproduces
  //                                            exactly on these
  //
  // DECLARED HERE, because the page publishes none of these:
  //   traffic        checkout 150/s · search 250/s · recs 300/s  (700/s)
  //   recs p99       500 ms, so the timeout is 600 ms — §2 requires a
  //                  timeout ABOVE p99, or it fails healthy requests
  //   breaker        opens above a 50% failure rate, 1 s cooldown, and
  //                  half-open lets 1% of traffic probe
  //   fail-fast cost 1 ms for a call the breaker refuses
  //   incident       the dependency degrades at t=2 and heals at t=6
  //
  // THE MODEL, in three lines:
  //   demand_i    = offered_i × hold_i            (thread-seconds per s)
  //   φ_i         = min(1, pool_i / demand_i)     (share admitted)
  //   served_i    = offered_i × φ_i
  // A shared pool gives every tier the same φ, which is exactly why one
  // slow dependency takes checkout down with it. Because φ applies to
  // every request alike, the fraction of FRESH requests served is φ — so
  // per-tier availability is the mean of φ over the run, not an assertion.
  // ======================================================================
  var sdfailureandresili_TIERS = [
    { key: "checkout", label: "checkout", rank: "critical",
      base: 150, dep: false, pool: 50 },
    { key: "search", label: "search", rank: "important",
      base: 250, dep: false, pool: 30 },
    { key: "recs", label: "recommendations", rank: "nice-to-have",
      base: 300, dep: true, pool: 20 }
  ];
  var sdfailureandresili_POOL = 100;
  var sdfailureandresili_FAST = 0.050;
  var sdfailureandresili_SLOW = 10.0;
  var sdfailureandresili_P99 = 0.500;
  var sdfailureandresili_TIMEOUT = 0.600;
  var sdfailureandresili_FAILFAST = 0.001;
  var sdfailureandresili_THRESH = 0.50;
  var sdfailureandresili_COOL = 1;
  var sdfailureandresili_PROBE = 0.01;
  var sdfailureandresili_BUDGET = 0.10;
  var sdfailureandresili_ATTEMPTS = 3;
  var sdfailureandresili_TICKS = 7;
  var sdfailureandresili_DEG0 = 2;
  var sdfailureandresili_HEAL = 6;
  var sdfailureandresili_HOURS_Y = 8760;
  var sdfailureandresili_HOURS_M = 720;

  var sdfailureandresili_BASE = 0;
  (function () {
    var i;
    for (i = 0; i < sdfailureandresili_TIERS.length; i++) {
      sdfailureandresili_BASE += sdfailureandresili_TIERS[i].base;
    }
  })();
  // a healthy pool serves this many requests a second
  var sdfailureandresili_CAP = sdfailureandresili_POOL / sdfailureandresili_FAST;

  function sdfailureandresili_n(v) {
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function sdfailureandresili_p1(x) { return x.toFixed(1) + "%"; }
  /** failures × attempts, rounded so the product matches the count on screen. */
  function sdfailureandresili_x(fails, attempts) {
    return sdfailureandresili_n(Math.round(fails) * attempts);
  }
  function sdfailureandresili_ms(sec) {
    return sec >= 1 ? sdfailureandresili_trim(sec.toFixed(1)) + " s"
                    : Math.round(sec * 1000) + " ms";
  }
  function sdfailureandresili_trim(s) {
    return s.indexOf(".0") === s.length - 2 ? s.slice(0, -2) : s;
  }
  function sdfailureandresili_dur(seconds) {
    if (seconds >= 3600) return sdfailureandresili_trim((seconds / 3600).toFixed(1)) + " h";
    if (seconds >= 60) return sdfailureandresili_trim((seconds / 60).toFixed(1)) + " min";
    return sdfailureandresili_trim(seconds.toFixed(1)) + " s";
  }

  /**
   * The offered load that a retry policy can sustain without the loop
   * feeding itself:  o = base + a(o − C)  has an UNSTABLE fixed point at
   * (aC − base)/(a − 1) whenever a > 1. Above it, every tick makes the
   * next one worse — the page's metastable failure.
   */
  function sdfailureandresili_tipping(attempts, cap, base) {
    if (attempts <= 1) return Infinity;
    return (attempts * cap - base) / (attempts - 1);
  }

  /** One eight-second incident under one policy. */
  function sdfailureandresili_run(p) {
    var N = sdfailureandresili_TIERS.length;
    var sched = [], t, i;
    for (t = 0; t < sdfailureandresili_TICKS + 6; t++) sched.push([0, 0, 0]);

    var breaker = p.breaker ? "closed" : "none";
    var cool = 0;
    var ticks = [];
    var sumOk = [0, 0, 0], sumBase = [0, 0, 0];

    for (t = 0; t <= sdfailureandresili_TICKS; t++) {
      var deg = t >= sdfailureandresili_DEG0 && t < sdfailureandresili_HEAL;
      var depLat = deg ? sdfailureandresili_SLOW : sdfailureandresili_FAST;
      var capped = p.timeout ? Math.min(depLat, p.timeout) : depLat;
      var entering = breaker;

      var offered = [], retried = [], refused = [], hold = [], demand = [];
      var phi = [], served = [], failed = [], busy = [];
      var tier, want, allow;

      for (i = 0; i < N; i++) {
        tier = sdfailureandresili_TIERS[i];
        want = sched[t][i];
        allow = p.budget ? Math.min(want, sdfailureandresili_BUDGET * tier.base) : want;
        retried[i] = allow;
        refused[i] = want - allow;
        offered[i] = tier.base + allow;

        if (!tier.dep) {
          hold[i] = sdfailureandresili_FAST;
        } else if (entering === "open") {
          hold[i] = sdfailureandresili_FAILFAST;
        } else if (entering === "half") {
          hold[i] = sdfailureandresili_PROBE * capped +
            (1 - sdfailureandresili_PROBE) * sdfailureandresili_FAILFAST;
        } else {
          hold[i] = capped;
        }
        demand[i] = offered[i] * hold[i];
      }

      var total = demand[0] + demand[1] + demand[2];
      if (p.bulkhead) {
        for (i = 0; i < N; i++) {
          phi[i] = demand[i] > 0
            ? Math.min(1, sdfailureandresili_TIERS[i].pool / demand[i]) : 1;
          busy[i] = Math.min(sdfailureandresili_TIERS[i].pool, demand[i]);
        }
      } else {
        var f = total > 0 ? Math.min(1, sdfailureandresili_POOL / total) : 1;
        for (i = 0; i < N; i++) { phi[i] = f; busy[i] = demand[i] * f; }
      }

      var busyAll = busy[0] + busy[1] + busy[2];
      var offAll = 0, servedAll = 0, failedAll = 0, refusedAll = 0;
      for (i = 0; i < N; i++) {
        served[i] = offered[i] * phi[i];
        failed[i] = offered[i] - served[i];
        offAll += offered[i];
        servedAll += served[i];
        failedAll += failed[i];
        refusedAll += refused[i];
        sumOk[i] += sdfailureandresili_TIERS[i].base * phi[i];
        sumBase[i] += sdfailureandresili_TIERS[i].base;

        if (p.attempts > 0 && failed[i] > 0.0001) {
          if (p.backoff) {           // base × 2^n ticks, jittered across the slot
            sched[t + 1][i] += failed[i];
            sched[t + 2][i] += failed[i];
            sched[t + 4][i] += failed[i];
          } else {                   // all attempts land at once
            sched[t + 1][i] += failed[i] * p.attempts;
          }
        }
      }

      // the breaker only ever watches the dependency tier
      var rate = offered[2] > 0 ? failed[2] / offered[2] : 0;
      var probeOK = !deg;
      var fallback = (entering === "open" || entering === "half")
        ? served[2] : 0;
      if (p.breaker) {
        if (entering === "closed") {
          if (rate > sdfailureandresili_THRESH) { breaker = "open"; cool = sdfailureandresili_COOL; }
        } else if (entering === "open") {
          cool -= 1;
          if (cool <= 0) breaker = "half";
        } else if (entering === "half") {
          if (probeOK) breaker = "closed";
          else { breaker = "open"; cool = sdfailureandresili_COOL; }
        }
      }

      ticks.push({
        t: t, deg: deg, depLat: depLat, hold: hold, offered: offered,
        retried: retried, refused: refused, demand: demand, total: total,
        phi: phi, served: served, failed: failed, busy: busyAll,
        offAll: offAll, servedAll: servedAll, failedAll: failedAll,
        refusedAll: refusedAll, breakerIn: entering, breakerOut: breaker,
        rate: rate, fallback: fallback, probeOK: probeOK
      });
    }

    var avail = [], k;
    for (k = 0; k < N; k++) {
      avail.push(sumBase[k] > 0 ? sumOk[k] / sumBase[k] : 1);
    }
    var last = ticks[ticks.length - 1];
    return {
      ticks: ticks, avail: avail, last: last,
      burn: 1 - last.phi[0],
      tipping: sdfailureandresili_tipping(
        p.backoff ? p.attempts : p.attempts, sdfailureandresili_CAP, sdfailureandresili_BASE)
    };
  }

  /** §7's table, computed from the two hour counts rather than transcribed. */
  function sdfailureandresili_slaRows(d, measured) {
    var slas = [0.99, 0.999, 0.9999, 0.99999], rows = [], i, dn;
    for (i = 0; i < slas.length; i++) {
      dn = 1 - slas[i];
      rows.push([
        (slas[i] * 100).toFixed(slas[i] >= 0.9999 ? 3 : 1) + "%",
        sdfailureandresili_dur(dn * sdfailureandresili_HOURS_Y * 3600),
        sdfailureandresili_dur(dn * sdfailureandresili_HOURS_M * 3600)
      ]);
    }
    rows.push([
      "this run, if sustained",
      sdfailureandresili_dur((1 - measured) * sdfailureandresili_HOURS_Y * 3600),
      sdfailureandresili_dur((1 - measured) * sdfailureandresili_HOURS_M * 3600)
    ]);
    return rows;
  }

  function sdfailureandresili_scenario(cfg) {
    var run = sdfailureandresili_run(cfg);
    var s = [], t, k;
    for (t = 0; t <= sdfailureandresili_TICKS; t++) {
      k = run.ticks[t];
      s.push({
        st: t, k: k, run: run, cfg: cfg,
        flag: t === 0 ? undefined
          : k.phi[0] > 0.99 ? "ok" : k.phi[0] > 0.9 ? "warn" : "bad",
        caption: cfg.caption(k, run, t)
      });
    }
    s.push({
      st: sdfailureandresili_TICKS + 1, k: run.last, run: run, cfg: cfg,
      verdict: true, flag: cfg.verdictFlag,
      caption: cfg.verdict(run)
    });
    return { id: cfg.id, label: cfg.label, steps: s };
  }

  /** Shared narration for the ticks all three runs have in common. */
  function sdfailureandresili_common(k, run, t, cfg) {
    if (t === 0) {
      return "<b>Resting state.</b> " + sdfailureandresili_n(sdfailureandresili_BASE) +
        " req/s across three criticality tiers, every call answering in " +
        sdfailureandresili_ms(sdfailureandresili_FAST) + ". Little's Law: " +
        sdfailureandresili_n(sdfailureandresili_BASE) + " × " +
        sdfailureandresili_ms(sdfailureandresili_FAST) + " = <b>" + k.busy.toFixed(0) +
        " threads</b> of " + sdfailureandresili_POOL + " held at any instant. " + cfg.setup;
    }
    if (t === 1) {
      return "<b>t = 1 s. Still healthy.</b> " + k.busy.toFixed(0) + " of " +
        sdfailureandresili_POOL + " threads busy, φ = 1 everywhere, nothing queued. " +
        "The pool has " + (sdfailureandresili_POOL - k.busy).toFixed(0) +
        " threads spare, which feels like plenty — and it is, until the multiplier " +
        "on the next line changes.";
    }
    return null;
  }

  var sdfailureandresili_NAIVE = sdfailureandresili_scenario({
    id: "naive", label: "Shared pool, no timeout",
    timeout: 0, bulkhead: false, breaker: false,
    attempts: sdfailureandresili_ATTEMPTS, backoff: false, budget: false,
    setup: "One shared pool, no timeout on the dependency call, and the library default " +
      "retry: three attempts, immediately.",
    caption: function (k, run, t) {
      var c = sdfailureandresili_common(k, run, t, this);
      if (c) return c;
      if (t === 2) {
        return "<b>t = 2 s. The recommendation service goes to " +
          sdfailureandresili_ms(sdfailureandresili_SLOW) + ".</b> It is not down — every " +
          "health check still passes. But the hold time in Little's Law just went up " +
          (sdfailureandresili_SLOW / sdfailureandresili_FAST).toFixed(0) + "× with no " +
          "timeout to stop it: " + sdfailureandresili_n(k.offered[2]) + " req/s × " +
          sdfailureandresili_ms(k.hold[2]) + " = <b>" + sdfailureandresili_n(k.demand[2]) +
          " thread-seconds</b> demanded from a " + sdfailureandresili_POOL +
          "-thread pool. φ = <b>" + sdfailureandresili_p1(k.phi[0] * 100) +
          "</b>, and φ is shared — so <b>" + sdfailureandresili_p1((1 - k.phi[0]) * 100) +
          " of checkouts fail too</b>. The whole site is down because recommendations " +
          "got slow.";
      }
      if (t === 3) {
        return "<b>t = 3 s. The retries arrive.</b> " +
          sdfailureandresili_n(run.ticks[2].failedAll) + " requests failed last second and " +
          "each one retried " + sdfailureandresili_ATTEMPTS + " times immediately: <b>+" +
          sdfailureandresili_x(run.ticks[2].failedAll, sdfailureandresili_ATTEMPTS) +
          " req/s</b> of pure retry, offered load now <b>" +
          sdfailureandresili_n(k.offAll) + "/s</b> against " +
          sdfailureandresili_n(sdfailureandresili_BASE) + " of real traffic. The pool " +
          "cannot serve more than it could a second ago, so the extra load buys nothing " +
          "and costs everything: φ falls to " + sdfailureandresili_p1(k.phi[0] * 100) + ".";
      }
      if (t === 4 || t === 5) {
        return "<b>t = " + t + " s. Self-sustaining.</b> Offered <b>" +
          sdfailureandresili_n(k.offAll) + "/s</b>, of which <b>" +
          sdfailureandresili_p1(((k.offAll - sdfailureandresili_BASE) / k.offAll) * 100) +
          "</b> is retry traffic. Every failure spawns " + sdfailureandresili_ATTEMPTS +
          " more requests, so the load is now a function of the failure rate rather than " +
          "of the users — which is the definition of a <b>metastable failure</b> and the " +
          "reason this will not stop when the dependency does.";
      }
      if (t === 6) {
        return "<b>t = 6 s. The dependency recovers.</b> Hold time is back to " +
          sdfailureandresili_ms(sdfailureandresili_FAST) + ", so the pool can serve " +
          sdfailureandresili_n(sdfailureandresili_CAP) + " req/s again — " +
          (sdfailureandresili_CAP / sdfailureandresili_BASE).toFixed(1) + "× the real " +
          "traffic. And it does not matter: offered load is <b>" +
          sdfailureandresili_n(k.offAll) + "/s</b> from the retry backlog, φ = " +
          sdfailureandresili_p1(k.phi[0] * 100) + ". <b>The trigger is gone and the " +
          "outage is not.</b>";
      }
      return "<b>t = 7 s. Still down, with a healthy dependency.</b> The tipping point is " +
        "arithmetic: with " + sdfailureandresili_ATTEMPTS + " attempts against a " +
        sdfailureandresili_n(sdfailureandresili_CAP) + "/s pool and " +
        sdfailureandresili_n(sdfailureandresili_BASE) + "/s of real traffic, any offered " +
        "load above <b>" + sdfailureandresili_n(run.tipping) + "/s</b> feeds itself. This " +
        "run is at " + sdfailureandresili_n(k.offAll) + "/s. Nothing short of shedding the " +
        "retry traffic — or restarting the clients — brings it back.";
    },
    verdictFlag: "bad",
    verdict: function (run) {
      return "<b>Checkout availability across the eight seconds on the clock: " +
        sdfailureandresili_p1(run.avail[0] * 100) + ".</b> A nice-to-have dependency that " +
        "never went down took the critical path with it, through a shared thread pool, and " +
        "then the retry policy made the outage permanent. Note which of the two did more " +
        "damage: the slow dependency cost " +
        sdfailureandresili_p1((1 - run.ticks[2].phi[0]) * 100) + " of checkouts in its " +
        "first second, and the retries kept that going after the cause was fixed. Burn " +
        "rate at the last tick is " + run.burn.toFixed(3) + " s of error budget per second, " +
        "so a 99.9% monthly budget of " +
        sdfailureandresili_dur(0.001 * sdfailureandresili_HOURS_M * 3600) +
        " is spent in " + sdfailureandresili_dur(
          (0.001 * sdfailureandresili_HOURS_M * 3600) / Math.max(run.burn, 1e-9)) +
        " — and this design has nothing that stops the clock.";
    }
  });

  var sdfailureandresili_TIMEOUT_ONLY = sdfailureandresili_scenario({
    id: "timeout", label: "Timeout + backoff",
    timeout: sdfailureandresili_TIMEOUT, bulkhead: false, breaker: false,
    attempts: sdfailureandresili_ATTEMPTS, backoff: true, budget: false,
    setup: "This run has read the first half of the page: a timeout set above the " +
      "dependency's p99 (" + sdfailureandresili_ms(sdfailureandresili_P99) + " → " +
      sdfailureandresili_ms(sdfailureandresili_TIMEOUT) + "), and retries capped at " +
      sdfailureandresili_ATTEMPTS + " with exponential backoff and jitter. Still one " +
      "shared pool, still no breaker.",
    caption: function (k, run, t) {
      var c = sdfailureandresili_common(k, run, t, this);
      if (c) return c;
      if (t === 2) {
        return "<b>t = 2 s. The timeout does its job — and it is not enough.</b> The hold " +
          "time is capped at " + sdfailureandresili_ms(sdfailureandresili_TIMEOUT) +
          " instead of " + sdfailureandresili_ms(sdfailureandresili_SLOW) + ", a <b>" +
          (sdfailureandresili_SLOW / sdfailureandresili_TIMEOUT).toFixed(0) +
          "× reduction</b> in damage. Then Little's Law again: " +
          sdfailureandresili_n(k.offered[2]) + " × " +
          sdfailureandresili_ms(sdfailureandresili_TIMEOUT) + " = <b>" +
          k.demand[2].toFixed(0) + " thread-seconds</b> against a " +
          sdfailureandresili_POOL + "-thread pool that also owes " +
          (k.demand[0] + k.demand[1]).toFixed(0) + " to the other two tiers. φ = <b>" +
          sdfailureandresili_p1(k.phi[0] * 100) + "</b>: half of every checkout fails.";
      }
      if (t === 3) {
        return "<b>t = 3 s. Backoff spreads the retries; it does not shrink them.</b> " +
          "Each failure still schedules " + sdfailureandresili_ATTEMPTS +
          " attempts — at 1, 2 and 4 seconds out instead of all at once. Offered load <b>" +
          sdfailureandresili_n(k.offAll) + "/s</b>, φ down to " +
          sdfailureandresili_p1(k.phi[0] * 100) + ". A per-request cap bounds what <i>one</i> " +
          "client does; it says nothing about what the fleet does in aggregate, and " +
          "aggregate is what the pool sees.";
      }
      if (t === 4 || t === 5) {
        return "<b>t = " + t + " s. The slots stack.</b> This second receives the 1-second " +
          "retries of the last tick, the 2-second retries of the one before, and the " +
          "4-second retries from the start of the incident: <b>" +
          sdfailureandresili_n(k.offAll - sdfailureandresili_BASE) + "/s</b> of retry on " +
          sdfailureandresili_n(sdfailureandresili_BASE) + "/s of users. Jitter fixed the " +
          "<i>waves</i> — nothing is synchronised any more — and the steady-state " +
          "amplification is still " + sdfailureandresili_ATTEMPTS + "×.";
      }
      if (t === 6) {
        return "<b>t = 6 s. The dependency recovers.</b> Hold time back to " +
          sdfailureandresili_ms(sdfailureandresili_FAST) + ", pool capacity back to " +
          sdfailureandresili_n(sdfailureandresili_CAP) + " req/s, offered load <b>" +
          sdfailureandresili_n(k.offAll) + "/s</b> — and the queued backoff slots are still " +
          "arriving. φ = " + sdfailureandresili_p1(k.phi[0] * 100) + ". Compare the " +
          "tipping point, " + sdfailureandresili_n(run.tipping) + "/s: that is the number " +
          "deciding whether this recovers on its own.";
      }
      return "<b>t = 7 s.</b> Offered " + sdfailureandresili_n(k.offAll) + "/s against a " +
        sdfailureandresili_n(sdfailureandresili_CAP) + "/s pool, φ = " +
        sdfailureandresili_p1(k.phi[0] * 100) + ". The timeout was necessary and " +
        "insufficient; the cap and the jitter were necessary and insufficient. The page " +
        "names the missing piece: a <b>retry budget</b>, which caps retries as a fraction " +
        "of the client's whole traffic rather than per request.";
    },
    verdictFlag: "warn",
    verdict: function (run) {
      return "<b>Checkout availability " + sdfailureandresili_p1(run.avail[0] * 100) +
        "</b> — better than no timeout, and still an outage on the critical path caused by " +
        "a feature nobody would pay for. Two lessons, both quantitative. <b>One:</b> the " +
        "timeout cut the hold time " +
        (sdfailureandresili_SLOW / sdfailureandresili_TIMEOUT).toFixed(0) +
        "× and the tier still overflowed the pool, because " +
        sdfailureandresili_n(sdfailureandresili_TIERS[2].base) + "/s × " +
        sdfailureandresili_ms(sdfailureandresili_TIMEOUT) + " = " +
        (sdfailureandresili_TIERS[2].base * sdfailureandresili_TIMEOUT).toFixed(0) +
        " thread-seconds is more than the " + sdfailureandresili_POOL +
        " that exist. A timeout converts a slow failure into a fast one — it does not stop " +
        "you making the call. <b>Two:</b> backoff and a 3-attempt cap change the shape of " +
        "the amplification, not its size.";
    }
  });

  var sdfailureandresili_ENGINEERED = sdfailureandresili_scenario({
    id: "full", label: "Bulkhead + breaker + budget",
    timeout: sdfailureandresili_TIMEOUT, bulkhead: true, breaker: true,
    attempts: sdfailureandresili_ATTEMPTS, backoff: true, budget: true,
    setup: "Same timeout, plus the page's other three: the pool is split " +
      sdfailureandresili_TIERS[2].pool + " / " + sdfailureandresili_TIERS[0].pool + " / " +
      sdfailureandresili_TIERS[1].pool + " by criticality, a breaker opens above a " +
      (sdfailureandresili_THRESH * 100).toFixed(0) + "% failure rate, and retries are " +
      "capped at " + (sdfailureandresili_BUDGET * 100).toFixed(0) + "% of traffic " +
      "client-wide.",
    caption: function (k, run, t) {
      var c = sdfailureandresili_common(k, run, t, this);
      if (c) return c;
      if (t === 2) {
        return "<b>t = 2 s. The bulkhead holds the blast radius.</b> Recommendations " +
          "demands " + k.demand[2].toFixed(0) + " thread-seconds and owns <b>" +
          sdfailureandresili_TIERS[2].pool + "</b> threads, so φ for that tier is <b>" +
          sdfailureandresili_p1(k.phi[2] * 100) + "</b> — it is having an outage. Checkout " +
          "owns " + sdfailureandresili_TIERS[0].pool + " threads and needs " +
          k.demand[0].toFixed(1) + ": φ = <b>" + sdfailureandresili_p1(k.phi[0] * 100) +
          "</b>. Same incident, same second, and the critical path does not know it is " +
          "happening. The breaker meanwhile measures a failure rate of " +
          sdfailureandresili_p1(k.rate * 100) + " — over the " +
          (sdfailureandresili_THRESH * 100).toFixed(0) + "% threshold, so it <b>opens</b>.";
      }
      if (t === 3) {
        return "<b>t = 3 s. Breaker open — and this is the half candidates miss.</b> Calls " +
          "return immediately with the cached fallback (" +
          sdfailureandresili_ms(sdfailureandresili_FAILFAST) + ", " +
          k.demand[2].toFixed(1) + " thread-seconds for the whole tier), so the product " +
          "page renders without that section instead of erroring. <b>" +
          sdfailureandresili_n(k.fallback) + " req/s degraded, 0 failed.</b> The second " +
          "benefit is invisible from here: the dependency is no longer receiving " +
          sdfailureandresili_n(sdfailureandresili_TIERS[2].base) +
          " req/s it cannot answer, which is the only condition under which an overloaded " +
          "service recovers.";
      }
      if (t === 4) {
        return "<b>t = 4 s. Half-open.</b> After the " + sdfailureandresili_COOL +
          "-second cooldown the breaker lets <b>" +
          (sdfailureandresili_PROBE * 100).toFixed(0) + "%</b> of the tier through to test " +
          "the water — " + (sdfailureandresili_TIERS[2].base * sdfailureandresili_PROBE).toFixed(0) +
          " req/s, costing " + k.demand[2].toFixed(1) + " thread-seconds. The probes time " +
          "out, so it trips straight back to open. The cost of being wrong here is bounded " +
          "by the probe fraction, which is the entire reason half-open exists.";
      }
      if (t === 5) {
        return "<b>t = 5 s. Open again, and the retry budget is why nothing accumulated.</b> " +
          "The " + sdfailureandresili_n(run.ticks[2].failed[2]) + " failures at t = 2 scheduled " +
          sdfailureandresili_x(run.ticks[2].failed[2], sdfailureandresili_ATTEMPTS) +
          " retries across three backoff slots; the client-wide budget of " +
          (sdfailureandresili_BUDGET * 100).toFixed(0) + "% let <b>" +
          sdfailureandresili_n(run.ticks[3].retried[2]) + "/s</b> through in the next " +
          "second and <b>refused " +
          sdfailureandresili_n(run.ticks[3].refused[2]) + "/s</b>. A refused retry is an " +
          "error returned a little sooner. An accepted one, in tab 1, was an error returned " +
          "to everybody.";
      }
      if (t === 6) {
        return "<b>t = 6 s. The dependency recovers and the probe finds out.</b> This " +
          "second's " + (sdfailureandresili_TIERS[2].base * sdfailureandresili_PROBE).toFixed(0) +
          " probe requests succeed in " + sdfailureandresili_ms(sdfailureandresili_FAST) +
          ", so the breaker closes. Note the honest cost: the dependency was healthy for " +
          "part of a second before anything noticed, because a closed breaker is a " +
          "decision made on evidence and the evidence is sampled.";
      }
      return "<b>t = 7 s. Fully restored.</b> All " +
        sdfailureandresili_n(k.offAll) + " req/s served, " + k.busy.toFixed(0) + " of " +
        sdfailureandresili_POOL + " threads held, no backlog to drain because none was " +
        "ever created. Checkout's line on the chart is flat across the whole incident — it " +
        "is the only line that had to be.";
    },
    verdictFlag: "ok",
    verdict: function (run) {
      return "<b>Checkout " + sdfailureandresili_p1(run.avail[0] * 100) + ", search " +
        sdfailureandresili_p1(run.avail[1] * 100) + ", recommendations " +
        sdfailureandresili_p1(run.avail[2] * 100) + ".</b> That third number is not a " +
        "failure of the design, it <i>is</i> the design: criticality was ranked during " +
        "scoping and the system shed in that order — and it counts a fallback as " +
        "served, because a product page without a recommendations strip is still a " +
        "served page. Four mechanisms, each doing one job — " +
        "the <b>timeout</b> bounded the hold time, the <b>bulkhead</b> bounded whose " +
        "threads it could take, the <b>breaker</b> stopped calling and handed back a " +
        "fallback, and the <b>budget</b> bounded the amplification. Remove any one and " +
        "re-read tab 2, which had exactly one of them.";
    }
  });

  S["sdfailureandresili"] = {
    title: "Make one dependency slow and watch what it takes with it",
    note: "A dependency that never goes down — it goes from <b>50 ms to 10 s</b> at t = 2 " +
      "and back at t = 6. Traffic is <b>700 req/s</b> in the page's three criticality " +
      "tiers (checkout 150 critical, search 250 important, recommendations 300 " +
      "nice-to-have; only the last calls the failing dependency). The pool is the page's " +
      "<b>100 threads</b>, split <b>20 / 50 / 30</b> when bulkheaded. Declared here because " +
      "the page publishes no p99: the dependency's p99 is <b>500 ms</b>, so the timeout is " +
      "set at <b>600 ms</b> — above p99, as §2 requires. One identity produces every " +
      "figure below — <b>threads held = rate × hold time</b> — and the share of requests a " +
      "pool can admit is <code>min(1, pool ÷ demand)</code>, which a shared pool applies " +
      "equally to every tier. That last clause is the whole page.",
    interval: 1500,

    scenarios: [
      sdfailureandresili_NAIVE,
      sdfailureandresili_TIMEOUT_ONLY,
      sdfailureandresili_ENGINEERED
    ],

    draw: function (step, d, ctx) {
      var k = step.k, run = step.run, cfg = step.cfg, i;
      var verdict = !!step.verdict;

      var head = d.cols([
        d.big(sdfailureandresili_p1(k.phi[0] * 100), "checkout requests served",
          k.phi[0] > 0.99 ? "ok" : k.phi[0] > 0.9 ? "warn" : "bad"),
        d.stat({
          label: "offered load",
          value: sdfailureandresili_n(k.offAll) + "/s",
          sub: sdfailureandresili_n(sdfailureandresili_BASE) + "/s users + " +
            sdfailureandresili_n(k.offAll - sdfailureandresili_BASE) + "/s retries",
          flag: k.offAll > sdfailureandresili_BASE * 1.5 ? "bad"
            : k.offAll > sdfailureandresili_BASE ? "warn" : "ok"
        }),
        d.stat({
          label: "dependency hold time",
          value: sdfailureandresili_ms(k.hold[2]),
          sub: k.deg ? "dependency at " + sdfailureandresili_ms(sdfailureandresili_SLOW)
                     : "dependency healthy",
          flag: k.hold[2] >= 1 ? "bad" : k.hold[2] > sdfailureandresili_FAST ? "warn" : "ok"
        }),
        d.stat({
          label: "circuit breaker",
          value: cfg.breaker ? k.breakerIn : "none",
          sub: cfg.breaker ? "fails at >" + (sdfailureandresili_THRESH * 100).toFixed(0) +
            "% · now " + sdfailureandresili_p1(k.rate * 100) : "every call is attempted",
          flag: !cfg.breaker ? "bad"
            : k.breakerIn === "closed" ? "ok" : k.breakerIn === "half" ? "warn" : "warn"
        })
      ]);

      var bars = [];
      for (i = 0; i < sdfailureandresili_TIERS.length; i++) {
        var tr = sdfailureandresili_TIERS[i];
        var degraded = i === 2 && k.fallback > 0;
        bars.push(d.bar({
          label: tr.label + " · " + tr.rank,
          pct: k.phi[i] * 100,
          value: sdfailureandresili_n(k.served[i]) + " of " +
            sdfailureandresili_n(k.offered[i]) + "/s" +
            (degraded ? " · fallback" : ""),
          flag: degraded ? "warn"
            : k.phi[i] > 0.99 ? "ok" : k.phi[i] > 0.9 ? "warn" : "bad"
        }));
      }

      var gauges = [];
      if (cfg.bulkhead) {
        for (i = 0; i < sdfailureandresili_TIERS.length; i++) {
          gauges.push({
            label: sdfailureandresili_TIERS[i].label + " pool",
            pct: (Math.min(sdfailureandresili_TIERS[i].pool, k.demand[i]) /
                  sdfailureandresili_TIERS[i].pool) * 100,
            value: Math.min(sdfailureandresili_TIERS[i].pool, k.demand[i]).toFixed(0) +
              " / " + sdfailureandresili_TIERS[i].pool,
            flag: k.demand[i] >= sdfailureandresili_TIERS[i].pool ? "bad"
              : k.demand[i] > sdfailureandresili_TIERS[i].pool * 0.8 ? "warn" : "ok"
          });
        }
      } else {
        gauges.push({
          label: "shared pool",
          pct: (k.busy / sdfailureandresili_POOL) * 100,
          value: k.busy.toFixed(0) + " / " + sdfailureandresili_POOL + " threads",
          flag: k.busy >= sdfailureandresili_POOL ? "bad"
            : k.busy > sdfailureandresili_POOL * 0.8 ? "warn" : "ok"
        });
        gauges.push({
          label: "thread-seconds demanded",
          pct: (k.total / sdfailureandresili_POOL) * 100,
          value: sdfailureandresili_n(k.total) + " demanded · " +
            sdfailureandresili_POOL + " available",
          flag: k.total > sdfailureandresili_POOL ? "bad" : "ok"
        });
      }

      // the incident record, one row per elapsed second
      var hist = [], kk;
      for (i = 0; i <= Math.min(k.t, sdfailureandresili_TICKS); i++) {
        kk = run.ticks[i];
        hist.push([
          "t=" + kk.t,
          sdfailureandresili_n(kk.offAll),
          sdfailureandresili_n(kk.total),
          sdfailureandresili_p1(kk.phi[0] * 100),
          sdfailureandresili_n(kk.failedAll)
        ]);
      }

      var body = [];
      if (verdict) {
        body.push(d.table(["availability", "downtime / year", "downtime / month"],
          sdfailureandresili_slaRows(d, run.avail[0])));
        body.push(d.table(["dependency arithmetic", "gives", "in downtime"], [
          ["3 services in series @ 99.9%",
            (Math.pow(0.999, 3) * 100).toFixed(2) + "%",
            sdfailureandresili_dur((1 - Math.pow(0.999, 3)) * sdfailureandresili_HOURS_Y * 3600) + "/yr"],
          ["2 independent replicas @ 99%",
            ((1 - Math.pow(0.01, 2)) * 100).toFixed(2) + "%",
            sdfailureandresili_dur(Math.pow(0.01, 2) * sdfailureandresili_HOURS_Y * 3600) + "/yr"],
          ["this run's checkout, if sustained",
            (run.avail[0] * 100).toFixed(2) + "%",
            sdfailureandresili_dur((1 - run.avail[0]) * sdfailureandresili_HOURS_Y * 3600) + "/yr"]
        ]));
      }

      var rows = [
        { label: "recommendations demand",
          value: sdfailureandresili_n(k.offered[2]) + "/s × " +
            sdfailureandresili_ms(k.hold[2]) + " = " +
            sdfailureandresili_n(k.demand[2]) + " thread-s",
          flag: k.demand[2] > (cfg.bulkhead ? sdfailureandresili_TIERS[2].pool
                                            : sdfailureandresili_POOL) ? "bad" : "ok" },
        { label: "checkout demand",
          value: sdfailureandresili_n(k.offered[0]) + "/s × " +
            sdfailureandresili_ms(k.hold[0]) + " = " + k.demand[0].toFixed(1) + " thread-s" },
        { label: "requests failed this second",
          value: sdfailureandresili_n(k.failedAll) + "/s",
          flag: k.failedAll > 0 ? "bad" : "ok" },
        { label: "retries refused by the budget",
          value: cfg.budget ? sdfailureandresili_n(k.refusedAll) + "/s" : "no budget set",
          flag: cfg.budget ? "ok" : "bad" }
      ];
      if (verdict) {
        rows = [
          { label: "checkout availability",
            value: sdfailureandresili_p1(run.avail[0] * 100),
            flag: run.avail[0] > 0.99 ? "ok" : "bad" },
          { label: "search availability",
            value: sdfailureandresili_p1(run.avail[1] * 100),
            flag: run.avail[1] > 0.99 ? "ok" : "warn" },
          { label: "recommendations availability",
            value: sdfailureandresili_p1(run.avail[2] * 100),
            flag: run.avail[2] > 0.99 ? "ok" : "warn" },
          { label: "offered load at the last tick",
            value: sdfailureandresili_n(run.last.offAll) + "/s",
            flag: run.last.offAll > run.tipping ? "bad" : "ok" },
          { label: "self-sustaining above",
            value: run.tipping === Infinity ? "no amplification"
              : sdfailureandresili_n(run.tipping) + "/s" }
        ];
      }

      return d.stack([
        head,
        d.node({
          title: verdict ? "the incident, added up"
            : "t = " + k.t + " s" + (k.deg ? " · dependency degraded" : " · dependency healthy"),
          status: verdict ? "REPORT" : k.t + " / " + sdfailureandresili_TICKS,
          statusFlag: step.flag || "idle",
          badge: cfg.label,
          meta: (cfg.timeout ? "timeout " + sdfailureandresili_ms(cfg.timeout)
                             : "no timeout") +
            " · " + (cfg.bulkhead ? "bulkheaded" : "one shared pool") +
            " · " + (cfg.budget ? "retry budget " + (sdfailureandresili_BUDGET * 100).toFixed(0) + "%"
                                : "unbudgeted retries"),
          flag: step.flag || "idle",
          gauges: gauges,
          rows: rows,
          body: body.length ? d.stack(body) : undefined
        }),
        d.stack(bars),
        d.table(["sec", "offered/s", "thread-s", "checkout ok", "failed/s"], hist),
        d.note(
          verdict
            ? "Availability multiplies down a chain and up a redundancy — <b>but only if " +
              "the failures are independent</b>. Two of these tiers shared a thread pool, " +
              "which is exactly the correlation the arithmetic assumes away."
            : "Each bar is the share of that tier's offered requests that got a thread. A " +
              "shared pool hands every tier the <i>same</i> share, which is why the " +
              "critical row moves whenever the nice-to-have row does."
        )
      ]);
    }
  };

  // ====================================================================
  // ====================================================================
  // ======================================================================
  // SIM · sdloadbalancing  (load-balancing.md)
  // Section 3 is the one part of this page with a genuine time axis: a node
  // leaves the pool, keys are reassigned, misses land on the database, and the
  // survivors either absorb the extra share or tip over one after another.
  // So ONE failure — cache-C dying — is run through three key-placement
  // schemes that differ in nothing else, and every share, QPS and moved-key
  // count below is counted off a real hash ring built at load time.
  //
  // CONFIG — stated, because the page states no capacity figures of its own.
  // Where the handbook does state a figure it is used verbatim:
  //   cache nodes            6
  //   node ceiling      100,000 QPS   numbers-to-know: "Redis / Memcached
  //                                   ~100k QPS per node"
  //   offered load      330,000 QPS   = 55% of the 6 x 100k fleet. 55% is
  //                                   chosen so that one node inheriting a
  //                                   whole neighbour's share lands just over
  //                                   100% — the cascade the page describes
  //                                   turns on exactly that crossing.
  //   baseline hit rate      95%      -> the read tier sees 5% of 330k
  //   read-tier ceiling 100,000 /s    = 2 x the 50k top of numbers-to-know's
  //                                   "SQL database reads 10k-50k/s"
  //   sampled keys        1,024       uniform traffic, so one key = 322.3 QPS
  //   virtual nodes         150       load-balancing.md 3: "each physical
  //                                   server occupies ~150 points on the ring"
  //   plain hash        server = hash(key) % N        page's own formula
  //
  // THE RING IS REAL. Node points and key positions are FNV-1a 32-bit hashes;
  // ownership is the first point clockwise, found by binary search. Nothing
  // about the placement is typed in. The one authored choice is the ring salt
  // "r60901:", picked from a scan so that the one-point-per-node ring starts
  // with every node inside its ceiling — otherwise that tab would already be
  // failing before the node dies and the death would teach nothing. The
  // imbalance it shows (5.9x) is the hash's, not the author's.
  //
  // WHAT THE THREE RUNS PRODUCE (all computed below, listed here so the
  // numbers can be checked against the page's claims):
  //   hash % N        868 / 1,024 keys move (84.8%, page: "EVERY key moves")
  //                   -> 279,727 QPS of misses at a 100,000/s read tier
  //   ring, 1 point   217 keys move (21.2%, page: "only ~1/N of keys move")
  //                   -> but all 217 land on the single next node clockwise,
  //                      which crosses 100% and tips, and so on: 5 of 6 nodes
  //                      gone. The page's "dumping them on its single
  //                      neighbour" and "cascading-failure mode".
  //   ring, 150 pts   160 keys move (15.6%), spread over all five survivors,
  //                   busiest survivor 71% of ceiling, database peak 52%.
  // ======================================================================
  var sdloadbalancing_NAMES =
    ["cache-A", "cache-B", "cache-C", "cache-D", "cache-E", "cache-F"];
  var sdloadbalancing_N = sdloadbalancing_NAMES.length;
  var sdloadbalancing_NODE_QPS = 100000;
  var sdloadbalancing_UTIL0 = 0.55;
  var sdloadbalancing_OFFERED =
    sdloadbalancing_N * sdloadbalancing_NODE_QPS * sdloadbalancing_UTIL0;
  var sdloadbalancing_KEYS = 1024;
  var sdloadbalancing_HIT = 0.95;
  var sdloadbalancing_DB_CEIL = 100000;
  var sdloadbalancing_VNODES = 150;
  var sdloadbalancing_SALT = "r60901:";
  var sdloadbalancing_DEAD = 2;                 // cache-C
  var sdloadbalancing_BUCKETS = 64;             // 16 keys per block on screen
  var sdloadbalancing_PERKEY = sdloadbalancing_OFFERED / sdloadbalancing_KEYS;
  var sdloadbalancing_BASE_DB = sdloadbalancing_OFFERED * (1 - sdloadbalancing_HIT);

  // ---- FNV-1a 32-bit ----------------------------------------------------
  function sdloadbalancing_hash(str) {
    var i, h = 2166136261;
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  var sdloadbalancing_KEYH = (function () {
    var a = [], i;
    for (i = 0; i < sdloadbalancing_KEYS; i++) a.push(sdloadbalancing_hash("key:" + i));
    return a;
  }());

  /** Ownership under a consistent-hash ring: first point clockwise. */
  function sdloadbalancing_ring(alive, vnodes) {
    var pts = [], i, j, out = [], lo, hi, m, at;
    for (i = 0; i < alive.length; i++) {
      for (j = 0; j < vnodes; j++) {
        pts.push({
          p: sdloadbalancing_hash(
            sdloadbalancing_SALT + sdloadbalancing_NAMES[alive[i]] + "#" + j),
          n: alive[i]
        });
      }
    }
    pts.sort(function (a, b) { return a.p - b.p; });
    if (!pts.length) return out;
    for (i = 0; i < sdloadbalancing_KEYS; i++) {
      lo = 0; hi = pts.length - 1; at = -1;
      while (lo <= hi) {
        m = (lo + hi) >> 1;
        if (pts[m].p >= sdloadbalancing_KEYH[i]) { at = m; hi = m - 1; } else lo = m + 1; }
      out.push(at === -1 ? pts[0].n : pts[at].n);
    }
    return out;
  }

  /** Ownership under the page's plain `server = hash(key) % N`. */
  function sdloadbalancing_mod(alive) {
    var out = [], i;
    if (!alive.length) return out;
    for (i = 0; i < sdloadbalancing_KEYS; i++) {
      out.push(alive[sdloadbalancing_KEYH[i] % alive.length]);
    }
    return out;
  }

  function sdloadbalancing_counts(own) {
    var c = {}, i;
    for (i = 0; i < sdloadbalancing_N; i++) c[i] = 0;
    for (i = 0; i < own.length; i++) c[own[i]]++;
    return c;
  }
  function sdloadbalancing_movedKeys(a, b) {
    var cold = [], i;
    for (i = 0; i < sdloadbalancing_KEYS; i++) cold.push(a[i] !== b[i]);
    return cold;
  }
  function sdloadbalancing_ownedBy(own, who) {
    var cold = [], i;
    for (i = 0; i < sdloadbalancing_KEYS; i++) cold.push(own[i] === who);
    return cold;
  }
  function sdloadbalancing_none() {
    var cold = [], i;
    for (i = 0; i < sdloadbalancing_KEYS; i++) cold.push(false);
    return cold;
  }
  function sdloadbalancing_tally(cold) {
    var n = 0, i;
    for (i = 0; i < cold.length; i++) if (cold[i]) n++;
    return n;
  }

  // ---- formatting -------------------------------------------------------
  function sdloadbalancing_num(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function sdloadbalancing_pct(x) { return x.toFixed(1) + "%"; }
  function sdloadbalancing_k(n) { return sdloadbalancing_num(n) + " QPS"; }

  /**
   * What the read tier sees when `cold` keys of the sample have no cached
   * copy: all of their traffic, plus the ordinary miss rate on the rest.
   */
  function sdloadbalancing_dbLoad(cold) {
    var f = cold / sdloadbalancing_KEYS;
    return f * sdloadbalancing_OFFERED +
      (1 - f) * sdloadbalancing_OFFERED * (1 - sdloadbalancing_HIT);
  }

  // ---- one on-screen frame ---------------------------------------------
  // live=false leaves the tier drawn but idle (the 0 / N frame).
  function sdloadbalancing_snap(own, down, live, cold) {
    var cnt = sdloadbalancing_counts(own), nodes = [], i, keys, qps, mx = 0, mn = 1e9;
    for (i = 0; i < sdloadbalancing_N; i++) {
      var isDown = down.indexOf(i) >= 0;
      keys = isDown ? 0 : cnt[i];
      qps = live ? keys * sdloadbalancing_PERKEY : 0;
      nodes.push({
        name: sdloadbalancing_NAMES[i], keys: keys, qps: qps, down: isDown,
        util: qps / sdloadbalancing_NODE_QPS * 100,
        share: keys / sdloadbalancing_KEYS * 100
      });
      if (!isDown) { if (keys > mx) mx = keys; if (keys < mn) mn = keys; }
    }
    // the on-screen keyspace strip: 16 keys per block
    var per = sdloadbalancing_KEYS / sdloadbalancing_BUCKETS, strip = [], b, j, hot;
    for (b = 0; b < sdloadbalancing_BUCKETS; b++) {
      hot = 0;
      for (j = 0; j < per; j++) if (cold[b * per + j]) hot++;
      strip.push(!live ? "idle" : hot === per ? "bad" : hot ? "warn" : "ok");
    }
    return {
      nodes: nodes, strip: strip,
      moved: sdloadbalancing_tally(cold),
      spread: mn > 0 ? mx / mn : 0,
      alive: sdloadbalancing_N - down.length
    };
  }

  /**
   * Assembles a frame. dbQps is passed in because what the read tier sees
   * depends on the story beat: baseline miss rate, a remap storm, or a whole
   * tier's traffic arriving at once.
   */
  function sdloadbalancing_frame(base, o) {
    var f = {
      nodes: base.nodes, strip: base.strip, moved: base.moved,
      spread: base.spread, alive: base.alive,
      live: o.live !== false,
      phase: o.phase, caption: o.caption, flag: o.flag,
      dbQps: o.dbQps || 0, hit: o.hit === undefined ? sdloadbalancing_HIT : o.hit,
      headline: o.headline, headLabel: o.headLabel, headFlag: o.headFlag,
      ledger: o.ledger || false, movedNote: o.movedNote
    };
    return f;
  }

  // ======================================================================
  // The three runs. Same fleet, same 1,024 keys, same node dies.
  // ======================================================================
  var sdloadbalancing_ALL = [0, 1, 2, 3, 4, 5];
  var sdloadbalancing_ALIVE5 = [0, 1, 3, 4, 5];

  // --- plain hash % N ----------------------------------------------------
  var sdloadbalancing_MOD6 = sdloadbalancing_mod(sdloadbalancing_ALL);
  var sdloadbalancing_MOD5 = sdloadbalancing_mod(sdloadbalancing_ALIVE5);
  var sdloadbalancing_MOD_COLD = sdloadbalancing_movedKeys(
    sdloadbalancing_MOD6, sdloadbalancing_MOD5);
  var sdloadbalancing_MOD_MOVED = sdloadbalancing_tally(sdloadbalancing_MOD_COLD);
  var sdloadbalancing_MOD_STORM = sdloadbalancing_MOD_MOVED /
    sdloadbalancing_KEYS * sdloadbalancing_OFFERED;
  var sdloadbalancing_MOD_DB = sdloadbalancing_dbLoad(sdloadbalancing_MOD_MOVED);
  // the second storm: the node comes back and N goes 5 -> 6 again
  var sdloadbalancing_MOD_BACK = sdloadbalancing_movedKeys(
    sdloadbalancing_MOD5, sdloadbalancing_MOD6);
  var sdloadbalancing_MOD_BACK_N = sdloadbalancing_tally(sdloadbalancing_MOD_BACK);

  // --- ring, one point per node -----------------------------------------
  var sdloadbalancing_R1_6 = sdloadbalancing_ring(sdloadbalancing_ALL, 1);
  var sdloadbalancing_R1_ORPHAN = sdloadbalancing_ownedBy(
    sdloadbalancing_R1_6, sdloadbalancing_DEAD);

  /** Runs the one-point ring forward, tipping every node over its ceiling. */
  function sdloadbalancing_cascade() {
    var alive = sdloadbalancing_ALIVE5.slice(), prev = sdloadbalancing_R1_6;
    var rounds = [], guard = 0;
    while (guard++ < sdloadbalancing_N + 1) {
      var own = sdloadbalancing_ring(alive, 1);
      var cnt = sdloadbalancing_counts(own), over = [], i;
      for (i = 0; i < alive.length; i++) {
        if (cnt[alive[i]] * sdloadbalancing_PERKEY > sdloadbalancing_NODE_QPS) {
          over.push(alive[i]);
        }
      }
      rounds.push({
        own: own, cold: sdloadbalancing_movedKeys(prev, own),
        down: sdloadbalancing_ALL.filter(function (x) { return alive.indexOf(x) < 0; }),
        over: over.slice(), cnt: cnt
      });
      if (!over.length || alive.length <= 1) break;
      prev = own;
      alive = alive.filter(function (x) { return over.indexOf(x) < 0; });
    }
    return rounds;
  }
  var sdloadbalancing_CASCADE = sdloadbalancing_cascade();

  // --- ring, 150 virtual nodes ------------------------------------------
  var sdloadbalancing_RV_6 = sdloadbalancing_ring(sdloadbalancing_ALL, sdloadbalancing_VNODES);
  var sdloadbalancing_RV_5 = sdloadbalancing_ring(sdloadbalancing_ALIVE5, sdloadbalancing_VNODES);
  var sdloadbalancing_RV_COLD = sdloadbalancing_movedKeys(
    sdloadbalancing_RV_6, sdloadbalancing_RV_5);
  var sdloadbalancing_RV_MOVED = sdloadbalancing_tally(sdloadbalancing_RV_COLD);
  var sdloadbalancing_RV_STORM = sdloadbalancing_RV_MOVED /
    sdloadbalancing_KEYS * sdloadbalancing_OFFERED;
  var sdloadbalancing_RV_DB = sdloadbalancing_dbLoad(sdloadbalancing_RV_MOVED);

  var sdloadbalancing_C6 = sdloadbalancing_counts(sdloadbalancing_R1_6);
  var sdloadbalancing_CV6 = sdloadbalancing_counts(sdloadbalancing_RV_6);
  var sdloadbalancing_CV5 = sdloadbalancing_counts(sdloadbalancing_RV_5);

  /** Largest / smallest share of the keyspace held by any live node, %. */
  function sdloadbalancing_peak(snap, field) {
    var mx = 0, i;
    for (i = 0; i < snap.nodes.length; i++) {
      if (!snap.nodes[i].down && snap.nodes[i][field] > mx) mx = snap.nodes[i][field];
    }
    return mx;
  }
  function sdloadbalancing_floor(snap, field) {
    var mn = -1, i;
    for (i = 0; i < snap.nodes.length; i++) {
      if (!snap.nodes[i].down && (mn < 0 || snap.nodes[i][field] < mn)) {
        mn = snap.nodes[i][field];
      }
    }
    return mn < 0 ? 0 : mn;
  }

  function sdloadbalancing_maxUtil(cnt, alive) {
    var mx = 0, i, q;
    for (i = 0; i < alive.length; i++) {
      q = cnt[alive[i]] * sdloadbalancing_PERKEY;
      if (q > mx) mx = q;
    }
    return mx;
  }
  var sdloadbalancing_RV_MAX = sdloadbalancing_maxUtil(
    sdloadbalancing_CV5, sdloadbalancing_ALIVE5);
  var sdloadbalancing_R1_FIRST = sdloadbalancing_CASCADE[0];
  var sdloadbalancing_R1_HEIR = sdloadbalancing_R1_FIRST.over.length
    ? sdloadbalancing_R1_FIRST.over[0] : -1;
  var sdloadbalancing_R1_MOVED = sdloadbalancing_tally(sdloadbalancing_R1_FIRST.cold);

  // the strip of gains the survivors take under virtual nodes
  function sdloadbalancing_gains() {
    var g = [], i;
    for (i = 0; i < sdloadbalancing_ALIVE5.length; i++) {
      var k = sdloadbalancing_ALIVE5[i];
      g.push(sdloadbalancing_NAMES[k].slice(6) + " +" +
        (sdloadbalancing_CV5[k] - sdloadbalancing_CV6[k]));
    }
    return g.join(" · ");
  }

  // The comparison table, shown on each run's last frame. Every cell counted.
  function sdloadbalancing_ledger() {
    return [
      ["hash % N",
        sdloadbalancing_MOD_MOVED + " (" +
          sdloadbalancing_pct(sdloadbalancing_MOD_MOVED / sdloadbalancing_KEYS * 100) + ")",
        sdloadbalancing_num(sdloadbalancing_MOD_DB),
        "0 of 6"],
      ["ring · 1 point",
        sdloadbalancing_R1_MOVED + " (" +
          sdloadbalancing_pct(sdloadbalancing_R1_MOVED / sdloadbalancing_KEYS * 100) + ")",
        sdloadbalancing_num(sdloadbalancing_OFFERED),
        (sdloadbalancing_N - 1) + " of 6"],
      ["ring · " + sdloadbalancing_VNODES + " points",
        sdloadbalancing_RV_MOVED + " (" +
          sdloadbalancing_pct(sdloadbalancing_RV_MOVED / sdloadbalancing_KEYS * 100) + ")",
        sdloadbalancing_num(sdloadbalancing_RV_DB),
        "0 of 6"]
    ];
  }

  // ---- run 1: plain hash -------------------------------------------------
  function sdloadbalancing_runMod() {
    var s = [], warm = sdloadbalancing_none();
    var idle = sdloadbalancing_snap(sdloadbalancing_MOD6, [], false, warm);
    var on = sdloadbalancing_snap(sdloadbalancing_MOD6, [], true, warm);
    var orphan = sdloadbalancing_snap(
      sdloadbalancing_MOD6, [sdloadbalancing_DEAD], true,
      sdloadbalancing_ownedBy(sdloadbalancing_MOD6, sdloadbalancing_DEAD));
    var remap = sdloadbalancing_snap(
      sdloadbalancing_MOD5, [sdloadbalancing_DEAD], true, sdloadbalancing_MOD_COLD);
    var back = sdloadbalancing_snap(
      sdloadbalancing_MOD6, [], true, sdloadbalancing_MOD_BACK);

    var orphanQps = sdloadbalancing_tally(
      sdloadbalancing_ownedBy(sdloadbalancing_MOD6, sdloadbalancing_DEAD)) /
      sdloadbalancing_KEYS * sdloadbalancing_OFFERED;
    var warmQps = sdloadbalancing_OFFERED - sdloadbalancing_MOD_STORM;
    var dropped = sdloadbalancing_MOD_DB - sdloadbalancing_DB_CEIL;

    s.push(sdloadbalancing_frame(idle, {
      live: false, phase: "at rest",
      headline: sdloadbalancing_N + " nodes", headLabel: "cache tier",
      caption: "Six cache nodes, <b>" + sdloadbalancing_num(sdloadbalancing_KEYS) +
        "</b> sampled keys placed by <code>hash(key) % " + sdloadbalancing_N +
        "</code>, no traffic yet. Press Play."
    }));

    s.push(sdloadbalancing_frame(on, {
      phase: "steady", flag: "ok", dbQps: sdloadbalancing_BASE_DB,
      headline: sdloadbalancing_num(sdloadbalancing_OFFERED), headLabel: "QPS offered",
      headFlag: "ok",
      caption: "<b>" + sdloadbalancing_k(sdloadbalancing_OFFERED) + " on.</b> The modulo " +
        "spreads keys evenly — " + sdloadbalancing_num(sdloadbalancing_OFFERED /
        sdloadbalancing_N) + " QPS a node, <b>" +
        (sdloadbalancing_UTIL0 * 100).toFixed(0) + "%</b> of the " +
        sdloadbalancing_num(sdloadbalancing_NODE_QPS) + " ceiling. At a " +
        (sdloadbalancing_HIT * 100).toFixed(0) + "% hit rate the read tier behind it sees " +
        "<b>" + sdloadbalancing_k(sdloadbalancing_BASE_DB) + "</b>, " +
        (sdloadbalancing_BASE_DB / sdloadbalancing_DB_CEIL * 100).toFixed(0) +
        "% of its ceiling."
    }));

    s.push(sdloadbalancing_frame(orphan, {
      phase: "cache-C down", flag: "warn",
      dbQps: sdloadbalancing_dbLoad(sdloadbalancing_counts(sdloadbalancing_MOD6)[sdloadbalancing_DEAD]),
      headline: sdloadbalancing_NAMES[sdloadbalancing_DEAD], headLabel: "health check failed",
      headFlag: "warn",
      caption: "<b>" + sdloadbalancing_NAMES[sdloadbalancing_DEAD] + " fails a health check.</b> " +
        "Its <b>" + sdloadbalancing_counts(sdloadbalancing_MOD6)[sdloadbalancing_DEAD] +
        "</b> keys have nowhere to be served from, so that " +
        sdloadbalancing_k(orphanQps) + " goes straight to the database. " +
        "One sixth of the tier is gone and the read tier is still inside its ceiling."
    }));

    s.push(sdloadbalancing_frame(remap, {
      phase: "N: 6 → 5", flag: "bad", dbQps: sdloadbalancing_BASE_DB,
      headline: sdloadbalancing_pct(sdloadbalancing_MOD_MOVED / sdloadbalancing_KEYS * 100),
      headLabel: "keyspace remapped", headFlag: "bad",
      movedNote: true,
      caption: "<b>N changed, so every key recomputed.</b> <code>hash(key) % 5</code> " +
        "does not agree with <code>hash(key) % 6</code> about anything: <b>" +
        sdloadbalancing_MOD_MOVED + " of " + sdloadbalancing_num(sdloadbalancing_KEYS) +
        "</b> keys — " + sdloadbalancing_pct(sdloadbalancing_MOD_MOVED /
        sdloadbalancing_KEYS * 100) + " — now hash to a different node, and every one " +
        "of them is a cold slot. Only " +
        (sdloadbalancing_KEYS - sdloadbalancing_MOD_MOVED) + " keys kept their home."
    }));

    s.push(sdloadbalancing_frame(remap, {
      phase: "miss storm", flag: "bad", dbQps: sdloadbalancing_MOD_DB,
      hit: (sdloadbalancing_KEYS - sdloadbalancing_MOD_MOVED) / sdloadbalancing_KEYS,
      headline: sdloadbalancing_num(sdloadbalancing_MOD_DB), headLabel: "reads/s at the DB",
      headFlag: "bad",
      caption: "<b>The misses arrive.</b> " + sdloadbalancing_pct(sdloadbalancing_MOD_MOVED /
        sdloadbalancing_KEYS * 100) + " of " + sdloadbalancing_k(sdloadbalancing_OFFERED) +
        " is <b>" + sdloadbalancing_k(sdloadbalancing_MOD_STORM) + "</b> of cold reads; " +
        "with the ordinary " + ((1 - sdloadbalancing_HIT) * 100).toFixed(0) +
        "% miss rate on what is left, the read tier sees <b>" +
        sdloadbalancing_num(sdloadbalancing_MOD_DB) + "</b> against a ceiling of " +
        sdloadbalancing_num(sdloadbalancing_DB_CEIL) + " — <b>" +
        (sdloadbalancing_MOD_DB / sdloadbalancing_DB_CEIL).toFixed(1) +
        "×</b> its ceiling. This is the page's sentence made arithmetic: a cache-tier " +
        "resize becomes a total cache miss and the database falls over."
    }));

    s.push(sdloadbalancing_frame(remap, {
      phase: "saturated", flag: "bad", dbQps: sdloadbalancing_DB_CEIL,
      hit: (sdloadbalancing_KEYS - sdloadbalancing_MOD_MOVED) / sdloadbalancing_KEYS,
      headline: sdloadbalancing_num(dropped), headLabel: "QPS failing",
      headFlag: "bad",
      caption: "<b>The database saturates and the cache cannot refill.</b> It serves its " +
        sdloadbalancing_num(sdloadbalancing_DB_CEIL) + "; the other <b>" +
        sdloadbalancing_k(dropped) + "</b> times out — " +
        (dropped / sdloadbalancing_OFFERED * 100).toFixed(0) + "% of all traffic. " +
        "The " + sdloadbalancing_num(warmQps) + " QPS still hitting warm keys is the only " +
        "thing being served properly."
    }));

    s.push(sdloadbalancing_frame(back, {
      phase: "N: 5 → 6", flag: "bad", dbQps: sdloadbalancing_MOD_DB,
      hit: (sdloadbalancing_KEYS - sdloadbalancing_MOD_BACK_N) / sdloadbalancing_KEYS,
      headline: sdloadbalancing_pct(sdloadbalancing_MOD_BACK_N / sdloadbalancing_KEYS * 100),
      headLabel: "remapped again", headFlag: "bad", movedNote: true,
      caption: "<b>And then cache-C comes back.</b> N returns to " + sdloadbalancing_N +
        ", so the modulo changes again and <b>" + sdloadbalancing_MOD_BACK_N +
        "</b> keys move a second time. Recovery costs exactly what the failure cost. " +
        "<i>Every</i> change of N — a failure, a restart, a deploy, adding capacity — is " +
        "a full cache flush."
    }));

    s.push(sdloadbalancing_frame(back, {
      phase: "verdict", flag: "bad", dbQps: sdloadbalancing_MOD_DB,
      hit: (sdloadbalancing_KEYS - sdloadbalancing_MOD_BACK_N) / sdloadbalancing_KEYS,
      headline: "0 of 6", headLabel: "cache nodes overloaded", headFlag: "warn",
      ledger: true,
      caption: "<b>Not one cache node ever exceeded its ceiling.</b> Five nodes at " +
        sdloadbalancing_num(sdloadbalancing_OFFERED / (sdloadbalancing_N - 1)) +
        " QPS is " + (sdloadbalancing_OFFERED / (sdloadbalancing_N - 1) /
        sdloadbalancing_NODE_QPS * 100).toFixed(0) + "% of capacity — the tier was fine. " +
        "What failed is the database, because <code>% N</code> makes losing " +
        (100 / sdloadbalancing_N).toFixed(0) + "% of the tier mean re-reading <b>" +
        sdloadbalancing_pct(sdloadbalancing_MOD_MOVED / sdloadbalancing_KEYS * 100) +
        "</b> of the keyspace."
    }));
    return { id: "mod", label: "hash % N", steps: s };
  }

  // ---- run 2: consistent hashing, one point per node ---------------------
  function sdloadbalancing_runRing1() {
    var s = [], warm = sdloadbalancing_none();
    var idle = sdloadbalancing_snap(sdloadbalancing_R1_6, [], false, warm);
    var on = sdloadbalancing_snap(sdloadbalancing_R1_6, [], true, warm);
    var orphan = sdloadbalancing_snap(
      sdloadbalancing_R1_6, [sdloadbalancing_DEAD], true, sdloadbalancing_R1_ORPHAN);
    var i, r, prevOver, heir, heirKeys, heirQps, crossed = false;

    s.push(sdloadbalancing_frame(idle, {
      live: false, phase: "at rest",
      headline: sdloadbalancing_N + " points", headLabel: "on the ring",
      caption: "Same six nodes, same " + sdloadbalancing_num(sdloadbalancing_KEYS) +
        " keys — but placed on a hash <b>ring</b>, one point per server, key owned by the " +
        "next server clockwise. Press Play."
    }));

    s.push(sdloadbalancing_frame(on, {
      phase: "steady", flag: "warn", dbQps: sdloadbalancing_BASE_DB,
      headline: on.spread.toFixed(1) + "×", headLabel: "busiest ÷ quietest",
      headFlag: "warn",
      caption: "<b>Nothing has failed and the load is already " + on.spread.toFixed(1) +
        "× out of balance.</b> Six random points cut the ring into six arcs of very " +
        "different length: the busiest node holds <b>" +
        sdloadbalancing_pct(sdloadbalancing_peak(on, "share")) + "</b> of the keyspace " +
        "and the quietest <b>" + sdloadbalancing_pct(sdloadbalancing_floor(on, "share")) +
        "</b>. Every node is still inside its ceiling — the busiest is at " +
        sdloadbalancing_peak(on, "util").toFixed(0) + "% — so this looks survivable."
    }));

    s.push(sdloadbalancing_frame(orphan, {
      phase: "cache-C down", flag: "warn",
      dbQps: sdloadbalancing_dbLoad(sdloadbalancing_tally(sdloadbalancing_R1_ORPHAN)),
      headline: sdloadbalancing_pct(sdloadbalancing_tally(sdloadbalancing_R1_ORPHAN) /
        sdloadbalancing_KEYS * 100),
      headLabel: "keys orphaned", headFlag: "warn", movedNote: true,
      caption: "<b>" + sdloadbalancing_NAMES[sdloadbalancing_DEAD] +
        " fails.</b> Its point leaves the ring and only <b>its own " +
        sdloadbalancing_tally(sdloadbalancing_R1_ORPHAN) + " keys</b> are affected — " +
        sdloadbalancing_pct(sdloadbalancing_tally(sdloadbalancing_R1_ORPHAN) /
        sdloadbalancing_KEYS * 100) + " rather than the modulo's " +
        sdloadbalancing_pct(sdloadbalancing_MOD_MOVED / sdloadbalancing_KEYS * 100) +
        ". <b>This is consistent hashing working exactly as advertised.</b>"
    }));

    for (i = 0; i < sdloadbalancing_CASCADE.length; i++) {
      r = sdloadbalancing_CASCADE[i];
      var snap = sdloadbalancing_snap(r.own, r.down, true, r.cold);
      var movedN = sdloadbalancing_tally(r.cold);
      var storm = movedN / sdloadbalancing_KEYS * sdloadbalancing_OFFERED;
      heir = r.over.length ? r.over[0] : -1;
      heirKeys = heir >= 0 ? r.cnt[heir] : 0;
      heirQps = heirKeys * sdloadbalancing_PERKEY;
      var lost = r.down.length;
      var last = i === sdloadbalancing_CASCADE.length - 1;
      var fleet = (sdloadbalancing_N - lost) * sdloadbalancing_NODE_QPS;
      var cap;

      if (last) {
        cap = "<b>" + sdloadbalancing_NAMES[prevOver] + " tips out and the tier is over.</b> " +
          "One node is left holding all " + sdloadbalancing_num(sdloadbalancing_KEYS) +
          " keys at " + (heirQps / sdloadbalancing_NODE_QPS * 100).toFixed(0) +
          "% of ceiling, so effectively the whole " +
          sdloadbalancing_k(sdloadbalancing_OFFERED) + " arrives at a database sized for " +
          sdloadbalancing_num(sdloadbalancing_DB_CEIL) + " — <b>" +
          (sdloadbalancing_OFFERED / sdloadbalancing_DB_CEIL).toFixed(1) + "×</b> its " +
          "ceiling. Started as one node of six failing.";
      } else if (i === 0) {
        cap = "<b>All " + movedN + " land on one node.</b> A key's next point clockwise " +
          "was " + sdloadbalancing_NAMES[sdloadbalancing_DEAD] + "; now it is <b>" +
          sdloadbalancing_NAMES[heir] + "</b>, which inherits the lot and goes from " +
          sdloadbalancing_counts(sdloadbalancing_R1_6)[heir] + " keys to <b>" + heirKeys +
          "</b> — " + sdloadbalancing_k(heirQps) + ", <b>" +
          (heirQps / sdloadbalancing_NODE_QPS * 100).toFixed(0) + "%</b> of a " +
          sdloadbalancing_num(sdloadbalancing_NODE_QPS) + " ceiling. It cannot hold that.";
      } else if (i === 1) {
        cap = "<b>" + sdloadbalancing_NAMES[prevOver] + " tips out, and the ring does the " +
          "same thing again.</b> Its " + movedN + " keys — its own plus the ones it just " +
          "inherited — all go clockwise to <b>" + sdloadbalancing_NAMES[heir] + "</b>, now " +
          "at " + heirKeys + " keys and <b>" +
          (heirQps / sdloadbalancing_NODE_QPS * 100).toFixed(0) + "%</b> of ceiling. " +
          "Each step hands the next survivor <i>more</i> than the last one carried. " +
          "That is what makes it a cascade rather than a failure.";
      } else if (fleet > sdloadbalancing_OFFERED) {
        cap = "<b>" + sdloadbalancing_NAMES[prevOver] + " tips out — " + lost + " of " +
          sdloadbalancing_N + " gone.</b> The " + (sdloadbalancing_N - lost) +
          " nodes still up could carry " + sdloadbalancing_k(fleet) + " between them, more " +
          "than the " + sdloadbalancing_k(sdloadbalancing_OFFERED) + " offered. <b>Capacity " +
          "is not the problem; placement is.</b> The ring insists one of them take " +
          heirKeys + " keys — " + (heirQps / sdloadbalancing_NODE_QPS * 100).toFixed(0) +
          "% of ceiling — while another sits at " +
          sdloadbalancing_floor(snap, "util").toFixed(0) + "%.";
      } else if (!crossed) {
        crossed = true;
        cap = "<b>" + sdloadbalancing_NAMES[prevOver] + " tips out — " + lost + " of " +
          sdloadbalancing_N + " gone, and the tier has crossed the point of no return.</b> " +
          "The " + (sdloadbalancing_N - lost) + " survivors can carry " +
          sdloadbalancing_k(fleet) + " between them against " +
          sdloadbalancing_k(sdloadbalancing_OFFERED) + " offered, so from here even " +
          "perfect balance would not hold. The cascade has destroyed <b>" + (lost - 1) +
          "×</b> the capacity the original failure did.";
      } else {
        cap = "<b>" + sdloadbalancing_NAMES[prevOver] + " goes, " +
          (sdloadbalancing_N - lost) + " left.</b> " + movedN + " keys — " +
          sdloadbalancing_pct(movedN / sdloadbalancing_KEYS * 100) + " of the keyspace — " +
          "move in this step alone, so by now the ring has reassigned far more than the " +
          sdloadbalancing_pct(sdloadbalancing_R1_MOVED / sdloadbalancing_KEYS * 100) +
          " it started with. Consistent hashing's 1/N guarantee holds for <i>one</i> " +
          "change; it says nothing about a chain of them.";
      }

      s.push(sdloadbalancing_frame(snap, {
        phase: last ? "tier gone" : (lost + " down"),
        flag: "bad",
        dbQps: last ? sdloadbalancing_OFFERED : sdloadbalancing_dbLoad(movedN),
        hit: last ? 0 : (sdloadbalancing_KEYS - movedN) / sdloadbalancing_KEYS,
        headline: last ? sdloadbalancing_num(sdloadbalancing_OFFERED)
          : (heirQps / sdloadbalancing_NODE_QPS * 100).toFixed(0) + "%",
        headLabel: last ? "QPS at the DB" : "busiest node",
        headFlag: "bad", movedNote: true, caption: cap
      }));
      prevOver = heir;
      if (!r.over.length) break;
    }

    s.push(sdloadbalancing_frame(
      sdloadbalancing_snap(
        sdloadbalancing_CASCADE[sdloadbalancing_CASCADE.length - 1].own,
        sdloadbalancing_CASCADE[sdloadbalancing_CASCADE.length - 1].down, true,
        sdloadbalancing_none()), {
      phase: "verdict", flag: "bad", dbQps: sdloadbalancing_OFFERED, hit: 0,
      headline: (sdloadbalancing_N - 1) + " of " + sdloadbalancing_N,
      headLabel: "nodes lost", headFlag: "bad", ledger: true,
      caption: "<b>Consistent hashing moved only " +
        sdloadbalancing_pct(sdloadbalancing_R1_MOVED / sdloadbalancing_KEYS * 100) +
        " of the keyspace and the tier still died.</b> Moving few keys is not enough if " +
        "they all land in one place: with one point per node a death dumps its entire " +
        "share on its single clockwise neighbour. <b>Virtual nodes are the part people " +
        "omit</b>, and this is what omitting them costs."
    }));
    return { id: "ring1", label: "Ring · 1 point", steps: s };
  }

  // ---- run 3: consistent hashing with virtual nodes ----------------------
  function sdloadbalancing_runRingV() {
    var s = [], warm = sdloadbalancing_none();
    var idle = sdloadbalancing_snap(sdloadbalancing_RV_6, [], false, warm);
    var on = sdloadbalancing_snap(sdloadbalancing_RV_6, [], true, warm);
    var orphanCold = sdloadbalancing_ownedBy(sdloadbalancing_RV_6, sdloadbalancing_DEAD);
    var orphan = sdloadbalancing_snap(
      sdloadbalancing_RV_6, [sdloadbalancing_DEAD], true, orphanCold);
    var moved = sdloadbalancing_snap(
      sdloadbalancing_RV_5, [sdloadbalancing_DEAD], true, sdloadbalancing_RV_COLD);
    var healed = sdloadbalancing_snap(
      sdloadbalancing_RV_5, [sdloadbalancing_DEAD], true, warm);
    var points = sdloadbalancing_N * sdloadbalancing_VNODES;
    var one = sdloadbalancing_snap(sdloadbalancing_R1_6, [], true, warm);

    s.push(sdloadbalancing_frame(idle, {
      live: false, phase: "at rest",
      headline: sdloadbalancing_num(points), headLabel: "points on the ring",
      caption: "Same six nodes, same " + sdloadbalancing_num(sdloadbalancing_KEYS) +
        " keys, same ring — but each server now occupies <b>" + sdloadbalancing_VNODES +
        "</b> points instead of one, so the ring carries " +
        sdloadbalancing_num(points) + " of them. Press Play."
    }));

    s.push(sdloadbalancing_frame(on, {
      phase: "steady", flag: "ok", dbQps: sdloadbalancing_BASE_DB,
      headline: on.spread.toFixed(2) + "×", headLabel: "busiest ÷ quietest",
      headFlag: "ok",
      caption: "<b>" + sdloadbalancing_VNODES + " points a node averages the arcs out.</b> " +
        "Imbalance falls from <b>" + one.spread.toFixed(1) + "×</b> with one point to <b>" +
        on.spread.toFixed(2) + "×</b>, and the busiest node sits at <b>" +
        sdloadbalancing_peak(on, "util").toFixed(0) + "%</b> of its ceiling rather than " +
        sdloadbalancing_peak(one, "util").toFixed(0) + "%. Nothing else changed — same " +
        "hash, same keys, same servers."
    }));

    s.push(sdloadbalancing_frame(orphan, {
      phase: "cache-C down", flag: "warn",
      dbQps: sdloadbalancing_RV_DB,
      headline: sdloadbalancing_RV_MOVED, headLabel: "keys orphaned", headFlag: "warn",
      movedNote: true,
      caption: "<b>" + sdloadbalancing_NAMES[sdloadbalancing_DEAD] + " fails</b> and all " +
        sdloadbalancing_VNODES + " of its points leave the ring at once. <b>" +
        sdloadbalancing_RV_MOVED + " keys</b> — " +
        sdloadbalancing_pct(sdloadbalancing_RV_MOVED / sdloadbalancing_KEYS * 100) +
        ", close to the 1/" + sdloadbalancing_N + " the page promises — need a new owner."
    }));

    s.push(sdloadbalancing_frame(moved, {
      phase: "reassigned", flag: "ok",
      dbQps: sdloadbalancing_RV_DB,
      hit: (sdloadbalancing_KEYS - sdloadbalancing_RV_MOVED) / sdloadbalancing_KEYS,
      headline: "5", headLabel: "nodes share the load", headFlag: "ok", movedNote: true,
      caption: "<b>They scatter.</b> Its " + sdloadbalancing_VNODES + " points were " +
        "spread right around the ring, each with its own clockwise neighbour, so the " +
        sdloadbalancing_RV_MOVED + " keys split across <b>all five survivors</b>: " +
        sdloadbalancing_gains() + ". This is the difference the whole technique " +
        "buys: one point sends one node's whole share to one node; " +
        sdloadbalancing_VNODES + " points send it everywhere."
    }));

    s.push(sdloadbalancing_frame(moved, {
      phase: "survivors", flag: "ok",
      dbQps: sdloadbalancing_RV_DB,
      hit: (sdloadbalancing_KEYS - sdloadbalancing_RV_MOVED) / sdloadbalancing_KEYS,
      headline: (sdloadbalancing_RV_MAX / sdloadbalancing_NODE_QPS * 100).toFixed(0) + "%",
      headLabel: "busiest survivor", headFlag: "ok",
      caption: "<b>Nobody crosses the line.</b> The busiest survivor reaches <b>" +
        sdloadbalancing_k(sdloadbalancing_RV_MAX) + "</b> — " +
        (sdloadbalancing_RV_MAX / sdloadbalancing_NODE_QPS * 100).toFixed(0) +
        "% of the " + sdloadbalancing_num(sdloadbalancing_NODE_QPS) + " ceiling, against " +
        "the " + (sdloadbalancing_R1_FIRST.cnt[sdloadbalancing_R1_HEIR] *
        sdloadbalancing_PERKEY / sdloadbalancing_NODE_QPS * 100).toFixed(0) +
        "% the single neighbour hit on the previous tab. No node tips, so there is " +
        "nothing to cascade."
    }));

    s.push(sdloadbalancing_frame(moved, {
      phase: "miss burst", flag: "warn",
      dbQps: sdloadbalancing_RV_DB,
      hit: (sdloadbalancing_KEYS - sdloadbalancing_RV_MOVED) / sdloadbalancing_KEYS,
      headline: sdloadbalancing_num(sdloadbalancing_RV_DB),
      headLabel: "reads/s at the DB", headFlag: "warn",
      caption: "<b>The database takes the burst and holds.</b> " +
        sdloadbalancing_pct(sdloadbalancing_RV_MOVED / sdloadbalancing_KEYS * 100) +
        " of traffic is cold, so reads jump to <b>" +
        sdloadbalancing_k(sdloadbalancing_RV_DB) + "</b> — " +
        (sdloadbalancing_RV_DB / sdloadbalancing_DB_CEIL * 100).toFixed(0) + "% of the " +
        sdloadbalancing_num(sdloadbalancing_DB_CEIL) + " ceiling, against <b>" +
        (sdloadbalancing_MOD_DB / sdloadbalancing_DB_CEIL * 100).toFixed(0) +
        "%</b> under <code>% N</code>. Same dead node; the spike is bounded by 1/" +
        sdloadbalancing_N + " instead of being the whole keyspace."
    }));

    s.push(sdloadbalancing_frame(healed, {
      phase: "warm again", flag: "ok", dbQps: sdloadbalancing_BASE_DB,
      headline: (sdloadbalancing_HIT * 100).toFixed(0) + "%", headLabel: "hit rate restored",
      headFlag: "ok",
      caption: "<b>The moved keys refill and the burst ends.</b> Five nodes carry " +
        sdloadbalancing_num(sdloadbalancing_OFFERED / (sdloadbalancing_N - 1)) +
        " QPS each on average — " + (sdloadbalancing_OFFERED / (sdloadbalancing_N - 1) /
        sdloadbalancing_NODE_QPS * 100).toFixed(0) + "% of ceiling — and the read tier is " +
        "back to " + sdloadbalancing_k(sdloadbalancing_BASE_DB) + ". Degraded capacity, " +
        "no incident."
    }));

    s.push(sdloadbalancing_frame(healed, {
      phase: "verdict", flag: "ok", dbQps: sdloadbalancing_BASE_DB,
      headline: "0", headLabel: "nodes lost to the failure", headFlag: "ok", ledger: true,
      caption: "<b>One node died in all three runs.</b> <code>% N</code> moved " +
        sdloadbalancing_pct(sdloadbalancing_MOD_MOVED / sdloadbalancing_KEYS * 100) +
        " of the keyspace and took the database with it; a ring with one point per node " +
        "moved " + sdloadbalancing_pct(sdloadbalancing_R1_MOVED /
        sdloadbalancing_KEYS * 100) + " and still lost " + (sdloadbalancing_N - 1) +
        " of " + sdloadbalancing_N + " nodes to the cascade; a ring with " +
        sdloadbalancing_VNODES + " points moved " +
        sdloadbalancing_pct(sdloadbalancing_RV_MOVED / sdloadbalancing_KEYS * 100) +
        " and lost nothing. <b>Consistent hashing bounds how many keys move; virtual " +
        "nodes decide where they land — you need both.</b>"
    }));
    return { id: "ringv", label: "Ring · " + sdloadbalancing_VNODES + " points", steps: s };
  }

  S["sdloadbalancing"] = {
    title: "Kill one cache node, three ways of placing keys",
    note: "Six cache nodes at <b>" + sdloadbalancing_num(sdloadbalancing_NODE_QPS) +
      " QPS</b> each (numbers-to-know: <i>Redis / Memcached ~100k QPS per node</i>) " +
      "carrying <b>" + sdloadbalancing_k(sdloadbalancing_OFFERED) + "</b> — " +
      (sdloadbalancing_UTIL0 * 100).toFixed(0) + "% of fleet capacity — over a <b>" +
      sdloadbalancing_num(sdloadbalancing_KEYS) + "-key</b> sample of the keyspace with " +
      "uniform traffic, so one key is " + sdloadbalancing_PERKEY.toFixed(1) + " QPS. " +
      "At a " + (sdloadbalancing_HIT * 100).toFixed(0) + "% hit rate the read tier behind " +
      "them sees " + sdloadbalancing_k(sdloadbalancing_BASE_DB) + " against a <b>" +
      sdloadbalancing_num(sdloadbalancing_DB_CEIL) + "/s</b> ceiling (2× the 50k top of " +
      "the handbook's SQL-read figure). Virtual nodes: <b>" + sdloadbalancing_VNODES +
      "</b> points per server, the page's number. <b>" +
      sdloadbalancing_NAMES[sdloadbalancing_DEAD] + " fails at the same moment in all " +
      "three runs.</b> Ownership is a real FNV-1a hash ring resolved by binary search — " +
      "every share, QPS and moved-key count below is counted off it.",
    interval: 1500,

    scenarios: [
      sdloadbalancing_runMod(),
      sdloadbalancing_runRing1(),
      sdloadbalancing_runRingV()
    ],

    draw: function (step, d, ctx) {
      var bars = [], i, nd;
      for (i = 0; i < step.nodes.length; i++) {
        nd = step.nodes[i];
        bars.push(d.bar({
          label: nd.name,
          pct: nd.down ? 0 : nd.util,
          value: nd.down ? "down"
            : sdloadbalancing_num(nd.qps) + " · " + nd.util.toFixed(0) + "%",
          flag: nd.down ? "bad"
            : !step.live ? "idle"
              : nd.util > 100 ? "bad"
                : nd.util > 85 ? "warn" : "ok"
        }));
      }

      var dbPct = step.dbQps / sdloadbalancing_DB_CEIL * 100;
      var db = d.node({
        title: "read tier",
        status: !step.live ? "IDLE"
          : dbPct > 100 ? "SATURATED" : dbPct > 60 ? "ABSORBING" : "STEADY",
        statusFlag: !step.live ? "idle" : dbPct > 100 ? "bad" : dbPct > 60 ? "warn" : "ok",
        badge: "ceiling " + sdloadbalancing_num(sdloadbalancing_DB_CEIL) + " /s",
        meta: "primary + replica, 50k reads/s each",
        flag: !step.live ? "idle" : dbPct > 100 ? "bad" : dbPct > 60 ? "warn" : "ok",
        gauges: [{
          label: "reads/s",
          pct: dbPct,
          value: sdloadbalancing_num(step.dbQps) +
            (dbPct > 100 ? " (" + (dbPct / 100).toFixed(1) + "× over)" : ""),
          flag: dbPct > 100 ? "bad" : dbPct > 60 ? "warn" : "ok"
        }],
        rows: [
          { label: "cache hit rate",
            value: (step.hit * 100).toFixed(0) + "%",
            flag: !step.live ? "idle" : step.hit >= 0.9 ? "ok"
              : step.hit >= 0.5 ? "warn" : "bad" },
          { label: "nodes serving",
            value: step.alive + " of " + sdloadbalancing_N,
            flag: step.alive === sdloadbalancing_N ? "ok"
              : step.alive > 1 ? "warn" : "bad" }
        ]
      });

      var head = d.flow([
        d.stack([
          d.big(step.headline === undefined ? "—" : step.headline,
            step.headLabel || "", step.headFlag),
          d.pill(step.phase, step.flag || "idle")
        ]),
        db
      ]);

      var cells = [], f;
      for (i = 0; i < step.strip.length; i++) {
        f = step.strip[i];
        cells.push({
          flag: f,
          title: "keys " + (i * sdloadbalancing_KEYS / sdloadbalancing_BUCKETS) + "–" +
            ((i + 1) * sdloadbalancing_KEYS / sdloadbalancing_BUCKETS - 1) + " · " +
            (f === "bad" ? "all cold — reassigned this step"
              : f === "warn" ? "partly cold"
                : f === "ok" ? "warm, owner unchanged" : "no traffic yet")
        });
      }

      var out = [head, d.stack(bars),
        d.cells(cells, {
          label: "keyspace · " + sdloadbalancing_num(sdloadbalancing_KEYS) +
            " sampled keys, " + (sdloadbalancing_KEYS / sdloadbalancing_BUCKETS) +
            " per block" + (step.movedNote
              ? " · " + step.moved + " cold (" +
                (step.moved / sdloadbalancing_KEYS * 100).toFixed(1) + "%)" : ""),
          dense: true
        })];

      if (step.ledger) {
        out.push(d.table(
          ["placement", "keys moved", "DB peak /s", "nodes lost"],
          sdloadbalancing_ledger()));
      }

      out.push(d.note(
        "Bars are cache nodes against a " + sdloadbalancing_num(sdloadbalancing_NODE_QPS) +
        " QPS ceiling. In the keyspace strip <b>green</b> is warm and unmoved, " +
        "<b>red</b> a block whose keys all changed owner this step and are therefore " +
        "cold, amber a partly-moved block.",
        step.flag === "bad" ? "bad" : undefined));

      return d.stack(out);
    }
  };

  // ====================================================================
  // ======================================================================
  // SIM · sdnumberstoknow  (numbers-to-know.md)
  //
  // The page is a reference card, but §8 is a procedure with a real order —
  // "the 60-second estimation script", seven numbered steps where each one
  // consumes the previous one's output. That is the time axis: one product
  // run down those seven lines, one line per frame, with §9's sanity checks
  // arming themselves as soon as the figure they judge exists.
  //
  // Three runs of the same seven lines:
  //   1. the same product estimated with four of §9's named errors in it,
  //   2. the same product estimated correctly, and
  //   3. the same traffic with a media payload, where every line through
  //      step 5 is IDENTICAL and step 7 concludes something else entirely.
  //
  // CONFIG — every figure on screen derives from these. Page figures used
  // verbatim, cited by section:
  //   §4  100,000 seconds per day (real 86,400)
  //   §4  peak = 2x average for a global service
  //   §4  the anchor row: 1 billion/day  ->  10,000 QPS
  //   §8  step 4: writes/day x bytes x 365 x 3
  //   §8  step 5: peak QPS / 10,000 = app servers, round UP for headroom
  //   §2  SQL writes 5k-10k/s per primary; web/app server 10k-50k QPS;
  //       Redis ~100k QPS per node
  //   §3  typical database row ~1 KB; minute of 1080p ~50 MB
  //   §7  read:write 100:1 (social) to 1000:1; hot data 20%; replication 3
  //   §6  object storage $20-25/TB, database storage $100-200/TB,
  //       cloud egress $50-90/TB, CDN egress $10-40/TB,
  //       app server $100-150, cache node 32 GB at $200-400
  //       (midpoints taken where the page gives a band; stated in the note)
  //   §9  the six sanity checks, applied as written
  //
  // This sim's own inputs, declared because the page states no product:
  //   DAU 200,000,000 x 5 actions/day        -> 1e9 actions/day, the anchor
  //   feed response 4 KB  (four 1 KB rows)
  //   upload 4 minutes of 1080p              -> 200 MB
  //   average view 2 minutes of 1080p        -> 100 MB
  //   headroom = one spare app server (the page says "round UP")
  //   the naive run's server figure is 500,000 QPS, which is §9's own
  //   "a single server at 500k QPS" row, 10x the top of §2's 10k-50k band
  // ======================================================================
  var sdnumberstoknow_SEC_EST = 100000;        // §4
  var sdnumberstoknow_SEC_REAL = 86400;        // §4
  var sdnumberstoknow_PEAK = 2;                // §4, global service
  var sdnumberstoknow_SERVER_QPS = 10000;      // §8 step 5
  var sdnumberstoknow_SERVER_BAND_HI = 50000;  // §2, top of 10k-50k
  var sdnumberstoknow_SPARE = 1;               // "round UP for headroom"
  var sdnumberstoknow_ROW_B = 1024;            // §3
  var sdnumberstoknow_REPL = 3;                // §7
  var sdnumberstoknow_HOT = 0.20;              // §7, 80/20
  var sdnumberstoknow_DAYS = 365;              // §8 step 4
  var sdnumberstoknow_MONTH_D = 30;
  var sdnumberstoknow_PRIMARY_LO = 5000;       // §2
  var sdnumberstoknow_PRIMARY_HI = 10000;      // §2
  var sdnumberstoknow_REDIS_QPS = 100000;      // §2
  var sdnumberstoknow_CACHE_GB = 32;           // §6
  var sdnumberstoknow_CACHE_USD = 300;         // §6, mid of $200-400
  var sdnumberstoknow_APP_USD = 125;           // §6, mid of $100-150
  var sdnumberstoknow_OBJ_USD = 22.5;          // §6, mid of $20-25/TB
  var sdnumberstoknow_DB_USD = 150;            // §6, mid of $100-200/TB
  var sdnumberstoknow_EGRESS_USD = 70;         // §6, mid of $50-90/TB
  var sdnumberstoknow_CDN_USD = 25;            // §6, mid of $10-40/TB
  var sdnumberstoknow_MIN_1080_B = 50e6;       // §3
  var sdnumberstoknow_NAIVE_SRV_QPS = 500000;  // §9's own wrong number
  var sdnumberstoknow_PB = 1e15;               // §9 "> 1 PB/day of text"
  var sdnumberstoknow_MQ = 1e6;                // §9 "> 1M QPS for a normal app"

  var sdnumberstoknow_DAU = 200e6;
  var sdnumberstoknow_ACTS = 5;

  var sdnumberstoknow_LINES = [
    "1 · DAU × actions",
    "2 · ÷ 100,000",
    "3 · × peak",
    "4 · storage/yr",
    "5 · app servers",
    "6 · cache RAM",
    "7 · CONCLUDE"
  ];

  function sdnumberstoknow_int(n) {
    if (!isFinite(n)) return "—";
    return Math.round(n).toLocaleString("en-US");
  }
  function sdnumberstoknow_b(x) {
    if (!isFinite(x) || x <= 0) return "—";
    if (x >= 1e15) return (x / 1e15).toFixed(x >= 1e16 ? 0 : 1) + " PB";
    if (x >= 1e12) return (x / 1e12).toFixed(x >= 1e13 ? 0 : 2) + " TB";
    if (x >= 1e9) return (x / 1e9).toFixed(x >= 1e11 ? 0 : 1) + " GB";
    if (x >= 1e6) return (x / 1e6).toFixed(0) + " MB";
    return Math.round(x) + " B";
  }
  function sdnumberstoknow_tb(x) { return x / 1e12; }
  function sdnumberstoknow_usd(x) {
    if (!isFinite(x)) return "—";
    if (x >= 1e6) return "$" + (x / 1e6).toFixed(1) + "M";
    return "$" + Math.round(x).toLocaleString("en-US");
  }
  function sdnumberstoknow_x(a, b) {
    if (!(b > 0)) return "—";
    var r = a / b;
    return (r >= 10 ? r.toFixed(0) : r.toFixed(1)) + "×";
  }

  // ---- one run of the seven lines, fully costed -------------------------
  function sdnumberstoknow_plan(o) {
    var p = {};
    p.name = o.name;
    p.kind = o.kind;                                  // "rows" | "media"
    p.isText = o.isText;
    p.rw = o.rw;
    p.writeB = o.writeB;
    p.respB = o.respB;
    p.skipPeak = !!o.skipPeak;
    p.skipRepl = !!o.skipRepl;
    p.cacheAll = !!o.cacheAll;
    p.srvQps = o.srvQps;
    p.spare = o.spare;
    p.conclude = !!o.conclude;

    // 1
    p.actions = sdnumberstoknow_DAU * sdnumberstoknow_ACTS;
    // 2
    p.avg = p.actions / sdnumberstoknow_SEC_EST;
    p.avgReal = p.actions / sdnumberstoknow_SEC_REAL;    // the honest divisor
    // 3
    p.peakMult = p.skipPeak ? 1 : sdnumberstoknow_PEAK;
    p.peak = p.avg * p.peakMult;
    // the split the ratio implies
    p.writes = p.actions / (p.rw + 1);
    p.reads = p.actions - p.writes;
    p.wAvg = p.writes / sdnumberstoknow_SEC_EST;
    p.wPeak = p.wAvg * p.peakMult;
    // 4
    p.repl = p.skipRepl ? 1 : sdnumberstoknow_REPL;
    p.bytesDay = p.writes * p.writeB;
    p.logicalYear = p.bytesDay * sdnumberstoknow_DAYS;
    p.storeYear = p.logicalYear * p.repl;
    // 5
    p.raw = p.peak / p.srvQps;
    p.servers = Math.ceil(p.raw) + p.spare;
    // 6
    p.rowsYear = p.writes * sdnumberstoknow_DAYS;
    p.hotFrac = p.cacheAll ? 1 : sdnumberstoknow_HOT;
    // the cached entry is the metadata row, whatever the payload weighs
    p.cacheB = p.rowsYear * p.hotFrac * sdnumberstoknow_ROW_B;
    p.cacheNodes = Math.ceil(p.cacheB / (sdnumberstoknow_CACHE_GB * 1e9));
    p.readPeak = p.peak * (p.reads / p.actions);
    p.redisNodes = Math.ceil(p.readPeak / sdnumberstoknow_REDIS_QPS);
    // 7 — the bill
    p.egressDay = p.reads * p.respB;
    p.egressMonthTB = sdnumberstoknow_tb(p.egressDay * sdnumberstoknow_MONTH_D);
    p.storeTB = sdnumberstoknow_tb(p.storeYear);
    p.cSrv = p.servers * sdnumberstoknow_APP_USD;
    p.cCache = p.cacheNodes * sdnumberstoknow_CACHE_USD;
    p.cStore = p.storeTB * (p.kind === "media"
      ? sdnumberstoknow_OBJ_USD : sdnumberstoknow_DB_USD);
    p.cCdn = p.egressMonthTB * sdnumberstoknow_CDN_USD;
    p.cRaw = p.egressMonthTB * sdnumberstoknow_EGRESS_USD;
    p.total = p.cSrv + p.cCache + p.cStore + p.cCdn;
    p.cdnSaves = p.cRaw - p.cCdn;
    p.egressShare = p.total > 0 ? p.cCdn / p.total : 0;
    p.computeStore = p.cSrv + p.cStore + p.cCache;
    // the decision step 7 is actually for
    p.shard = p.wPeak > sdnumberstoknow_PRIMARY_LO;
    p.primaryUse = p.wPeak / sdnumberstoknow_PRIMARY_LO;

    // ---- §9, applied as written -------------------------------------
    p.checks = [
      { key: "pb", at: 4, label: "> 1 PB/day of text",
        fired: p.isText && p.bytesDay > sdnumberstoknow_PB,
        why: "dropped a factor of 1,000" },
      { key: "mq", at: 3, label: "> 1M QPS, normal app",
        fired: p.peak > sdnumberstoknow_MQ,
        why: "confused per-day with per-second" },
      { key: "srv", at: 5, label: "one server at 500k QPS",
        fired: p.srvQps > sdnumberstoknow_SERVER_BAND_HI,
        why: "off by " + sdnumberstoknow_x(p.srvQps, sdnumberstoknow_SERVER_BAND_HI) },
      { key: "repl", at: 4, label: "storage without ×3",
        fired: p.repl === 1, why: "forgot replication" },
      { key: "peak", at: 3, label: "sized for average",
        fired: p.skipPeak, why: "forgot peak" },
      { key: "cache", at: 6, label: "cache RAM ≥ all data",
        fired: p.cacheB >= p.logicalYear, why: "caching cold rows too" }
    ];
    var i;
    p.fired = 0;
    for (i = 0; i < p.checks.length; i++) if (p.checks[i].fired) p.fired++;
    return p;
  }

  var sdnumberstoknow_PLANS = [
    sdnumberstoknow_plan({
      name: "Social feed — the fast version", kind: "rows", isText: true,
      rw: 100, writeB: sdnumberstoknow_ROW_B, respB: 4 * sdnumberstoknow_ROW_B,
      skipPeak: true, skipRepl: true, cacheAll: true,
      srvQps: sdnumberstoknow_NAIVE_SRV_QPS, spare: 0, conclude: false
    }),
    sdnumberstoknow_plan({
      name: "Social feed — the script", kind: "rows", isText: true,
      rw: 100, writeB: sdnumberstoknow_ROW_B, respB: 4 * sdnumberstoknow_ROW_B,
      srvQps: sdnumberstoknow_SERVER_QPS, spare: sdnumberstoknow_SPARE,
      conclude: true
    }),
    sdnumberstoknow_plan({
      name: "Video — same traffic, media payload", kind: "media", isText: false,
      rw: 1000, writeB: 4 * sdnumberstoknow_MIN_1080_B,
      respB: 2 * sdnumberstoknow_MIN_1080_B,
      srvQps: sdnumberstoknow_SERVER_QPS, spare: sdnumberstoknow_SPARE,
      conclude: true
    })
  ];

  var sdnumberstoknow_TRUE = sdnumberstoknow_PLANS[1];   // the reference run

  // ---- frames ------------------------------------------------------------
  function sdnumberstoknow_run(pl, id, label, opening) {
    var s = [];
    var i;

    s.push({ q: 0, pl: pl, caption: "<b>" + pl.name + ".</b> " + opening +
      " Seven lines, in the page's order. Press Play." });

    // 1 ------------------------------------------------------------------
    s.push({ q: 1, pl: pl, flag: "warn",
      caption: "<b>1 · DAU × actions/day.</b> " + sdnumberstoknow_int(sdnumberstoknow_DAU) +
        " daily actives × " + sdnumberstoknow_ACTS + " actions = <b>" +
        sdnumberstoknow_int(pl.actions) + " actions/day</b>. That is the page's anchor row " +
        "exactly — one billion a day — so the next line is already memorised rather than " +
        "divided." });

    // 2 ------------------------------------------------------------------
    s.push({ q: 2, pl: pl, flag: "warn",
      caption: "<b>2 · ÷ 100,000.</b> " + sdnumberstoknow_int(pl.actions) + " ÷ " +
        sdnumberstoknow_int(sdnumberstoknow_SEC_EST) + " = <b>" +
        sdnumberstoknow_int(pl.avg) + " QPS</b> average. The real divisor is " +
        sdnumberstoknow_int(sdnumberstoknow_SEC_REAL) + ", which would give " +
        sdnumberstoknow_int(pl.avgReal) + " — a " +
        ((sdnumberstoknow_SEC_EST - sdnumberstoknow_SEC_REAL) /
          sdnumberstoknow_SEC_REAL * 100).toFixed(0) + "% error you are buying deliberately, " +
        "because <i>" + sdnumberstoknow_int(pl.avg) + "</i> is divisible in your head and <i>" +
        sdnumberstoknow_int(pl.avgReal) + "</i> is not." });

    // 3 ------------------------------------------------------------------
    s.push({ q: 3, pl: pl, flag: pl.skipPeak ? "bad" : "ok",
      caption: pl.skipPeak
        ? "<b>3 · × peak — skipped.</b> The number carried forward is the average, <b>" +
          sdnumberstoknow_int(pl.peak) + " QPS</b>. §9 names this one: <i>provisioning for " +
          "average load — forgot peak</i>. Traffic is not flat, so every capacity figure " +
          "downstream of here is now <b>" + sdnumberstoknow_PEAK + "×</b> short, and it will " +
          "not look wrong — it will look like a smaller estimate."
        : "<b>3 · × peak.</b> " + sdnumberstoknow_int(pl.avg) + " × " + sdnumberstoknow_PEAK +
          " = <b>" + sdnumberstoknow_int(pl.peak) + " QPS</b> peak. The page's rule is 2–3×: " +
          "2 for a global service whose load is spread across timezones, 3 for a " +
          "single-timezone one that goes quiet at night. You provision for this number, " +
          "not the one above it." });

    // 4 ------------------------------------------------------------------
    s.push({ q: 4, pl: pl, flag: pl.skipRepl ? "bad" : "ok",
      caption: "<b>4 · writes/day × bytes × 365 × " + pl.repl + ".</b> At " + pl.rw +
        ":1 read:write, " + sdnumberstoknow_int(pl.writes) + " writes/day × " +
        sdnumberstoknow_b(pl.writeB) + " = <b>" + sdnumberstoknow_b(pl.bytesDay) +
        "/day</b>, × 365 = " + sdnumberstoknow_b(pl.logicalYear) +
        (pl.skipRepl
          ? ". And it stops there. §9: <i>storage without replication — forgot the ×" +
            sdnumberstoknow_REPL + "</i>. The disk you actually buy is <b>" +
            sdnumberstoknow_b(pl.logicalYear * sdnumberstoknow_REPL) + "</b>."
          : " × " + sdnumberstoknow_REPL + " replicas = <b>" +
            sdnumberstoknow_b(pl.storeYear) + "/year</b>. The ×3 is not a safety margin, " +
            "it is the disk that exists.") });

    // 5 ------------------------------------------------------------------
    s.push({ q: 5, pl: pl, flag: pl.srvQps > sdnumberstoknow_SERVER_BAND_HI ? "bad" : "ok",
      caption: "<b>5 · peak QPS ÷ server capacity.</b> " + sdnumberstoknow_int(pl.peak) +
        " ÷ " + sdnumberstoknow_int(pl.srvQps) + " = " + pl.raw.toFixed(2) + " → <b>" +
        pl.servers + " app server" + (pl.servers === 1 ? "" : "s") + "</b>" +
        (pl.spare ? " (round up, plus one spare)" : " (no headroom added)") + ". " +
        (pl.srvQps > sdnumberstoknow_SERVER_BAND_HI
          ? "But " + sdnumberstoknow_int(pl.srvQps) + " QPS per box is §9's own worked " +
            "example of being wrong: the page's band is 10k–50k, so this is <b>" +
            sdnumberstoknow_x(pl.srvQps, sdnumberstoknow_SERVER_BAND_HI) +
            "</b> the top of it. Two errors now compound — average load divided by a " +
            "fictional server."
          : "The divisor is the page's 10,000, the conservative end of the 10k–50k band. " +
            "Rounding up is not politeness: a fleet sized exactly at peak has no capacity " +
            "left to lose a machine.") });

    // 6 ------------------------------------------------------------------
    s.push({ q: 6, pl: pl, flag: pl.cacheAll ? "bad" : "ok",
      caption: "<b>6 · hot data × entry size.</b> A year is " +
        sdnumberstoknow_int(pl.rowsYear) + " rows; " +
        (pl.cacheAll
          ? "all of them go in the cache. " + sdnumberstoknow_b(pl.cacheB) + " of RAM = <b>" +
            pl.cacheNodes + " cache nodes</b> at " + sdnumberstoknow_usd(pl.cCache) +
            "/month. §9: <i>more cache RAM than total data — caching everything, including " +
            "cold</i>. The 80/20 rule exists to stop exactly this."
          : "the page's 80/20 rule says " + (sdnumberstoknow_HOT * 100).toFixed(0) +
            "% of them carry 80% of the traffic, so " + sdnumberstoknow_int(pl.rowsYear *
              sdnumberstoknow_HOT) + " × 1 KB = <b>" + sdnumberstoknow_b(pl.cacheB) +
            "</b> = " + pl.cacheNodes + " nodes of " + sdnumberstoknow_CACHE_GB + " GB. " +
            "Note which constraint binds: at " + sdnumberstoknow_int(pl.readPeak) +
            " peak reads/s you need " + pl.redisNodes + " node" +
            (pl.redisNodes === 1 ? "" : "s") + " for throughput and " + pl.cacheNodes +
            " for memory — this cache is sized by <b>bytes</b>, not by QPS.") });

    // 7 ------------------------------------------------------------------
    var verdict;
    if (!pl.conclude) {
      verdict = "<b>7 · … and the estimate stops.</b> Six correct-looking lines, no sentence " +
        "beginning “so”. The page is blunt about this: <i>step 7 is the only one being " +
        "scored</i>. Worse, the answer it would have supported is wrong in both directions " +
        "at once — <b>" + pl.servers + "</b> app server" + (pl.servers === 1 ? "" : "s") +
        " where the honest run needs <b>" + sdnumberstoknow_TRUE.servers + "</b>, and " +
        sdnumberstoknow_b(pl.storeYear) + " of disk where it needs " +
        sdnumberstoknow_b(sdnumberstoknow_TRUE.storeYear) + ". The monthly bill is <b>" +
        sdnumberstoknow_usd(pl.total) + "</b> against <b>" +
        sdnumberstoknow_usd(sdnumberstoknow_TRUE.total) + "</b> — " +
        sdnumberstoknow_x(pl.total, sdnumberstoknow_TRUE.total) + " too much, almost all of " +
        "it cache nobody will hit. <b>" + pl.fired + " of " + pl.checks.length +
        "</b> sanity checks fired and none were read.";
    } else if (pl.kind === "media") {
      verdict = "<b>7 · So: this is a bandwidth system.</b> Identical traffic, identical " +
        "server count — <b>" + pl.servers + "</b>, the same as the feed — and a completely " +
        "different design. Egress is " + sdnumberstoknow_usd(pl.cCdn) + "/month over a CDN, " +
        "<b>" + (pl.egressShare * 100).toFixed(0) + "%</b> of the bill and " +
        sdnumberstoknow_x(pl.cCdn, pl.computeStore) + " compute and storage combined, " +
        "exactly as §6 warns. Serving that same " +
        sdnumberstoknow_int(pl.egressMonthTB) + " TB straight out of the cloud at $" +
        sdnumberstoknow_EGRESS_USD + "/TB instead of $" + sdnumberstoknow_CDN_USD +
        " costs <b>" + sdnumberstoknow_usd(pl.cdnSaves) + " a month more</b>. The CDN is not " +
        "an optimisation on this design, it is the design. Writes peak at " +
        pl.wPeak.toFixed(0) + "/s, so the database is a rounding error.";
    } else {
      verdict = "<b>7 · So: one primary, and the money is in RAM.</b> Peak writes are <b>" +
        pl.wPeak.toFixed(0) + "/s</b> against the page's 5k–10k per primary — " +
        (pl.primaryUse * 100).toFixed(0) + "% of the conservative end — so this does " +
        "<b>not</b> shard, and saying so with the number behind it is the whole point of " +
        "the exercise. What it does need is " + sdnumberstoknow_b(pl.cacheB) + " of cache, " +
        sdnumberstoknow_usd(pl.cCache) + "/month, <b>" +
        (pl.cCache / pl.total * 100).toFixed(0) + "%</b> of a " +
        sdnumberstoknow_usd(pl.total) + " bill — more than storage and servers together. " +
        "The estimate changed a decision twice: no shard, and bound the cache window.";
    }
    s.push({ q: 7, pl: pl,
      flag: !pl.conclude ? "bad" : "ok",
      caption: verdict });

    for (i = 0; i < s.length; i++) s[i].n = i;
    return { id: id, label: label, steps: s };
  }

  // ======================================================================
  S["sdnumberstoknow"] = {
    title: "Run the 60-second estimation script",
    note: "One product — " + sdnumberstoknow_int(sdnumberstoknow_DAU) + " DAU × " +
      sdnumberstoknow_ACTS + " actions = <b>" +
      sdnumberstoknow_int(sdnumberstoknow_PLANS[1].actions) + " actions/day</b>, the page's " +
      "own anchor row — pushed down §8's seven lines. Divisor <b>" +
      sdnumberstoknow_int(sdnumberstoknow_SEC_EST) + " s/day</b> (real " +
      sdnumberstoknow_int(sdnumberstoknow_SEC_REAL) + "), peak <b>×" + sdnumberstoknow_PEAK +
      "</b>, read:write <b>100:1</b> for the feed and <b>1000:1</b> for video, row <b>1 KB</b>, " +
      "replication <b>×" + sdnumberstoknow_REPL + "</b>, hot data <b>" +
      (sdnumberstoknow_HOT * 100).toFixed(0) + "%</b>, app server <b>" +
      sdnumberstoknow_int(sdnumberstoknow_SERVER_QPS) + " QPS</b>, cache node <b>" +
      sdnumberstoknow_CACHE_GB + " GB</b>, upload <b>4 min of 1080p</b> and view <b>2 min</b> " +
      "at the page's 50 MB/min. Prices are the midpoints of §6's bands — $" +
      sdnumberstoknow_OBJ_USD + "/TB object, $" + sdnumberstoknow_DB_USD + "/TB database, $" +
      sdnumberstoknow_CDN_USD + "/TB CDN against $" + sdnumberstoknow_EGRESS_USD +
      "/TB cloud egress, $" + sdnumberstoknow_APP_USD + "/server, $" +
      sdnumberstoknow_CACHE_USD + "/cache node. §9's six checks arm themselves as soon as " +
      "the figure they judge exists.",
    interval: 1400,

    scenarios: [
      sdnumberstoknow_run(sdnumberstoknow_PLANS[0], "fast", "Skipping the awkward lines",
        "Every line is answered in about four seconds, four of them wrongly, and the run " +
        "never reaches a sentence beginning “so”."),
      sdnumberstoknow_run(sdnumberstoknow_PLANS[1], "script", "The script, as written",
        "Same product, same inputs, every line taken at its face value including the two " +
        "multipliers people drop."),
      sdnumberstoknow_run(sdnumberstoknow_PLANS[2], "video", "Same traffic, video payload",
        "Identical DAU, identical actions, identical server count — only the bytes per " +
        "write and per read change.")
    ],

    draw: function (step, d, ctx) {
      var pl = step.pl, q = step.q || 0, i;
      var done = function (k) { return q >= k; };

      // ---- the seven lines ------------------------------------------
      var lane = [];
      for (i = 0; i < sdnumberstoknow_LINES.length; i++) {
        var li = i + 1;
        var fl;
        if (q === 0) fl = "idle";
        else if (li < q) fl = "ok";
        else if (li === q) fl = "warn";
        else fl = "idle";
        if (li <= q) {
          if (li === 3 && pl.skipPeak) fl = "bad";
          if (li === 4 && pl.skipRepl) fl = "bad";
          if (li === 5 && pl.srvQps > sdnumberstoknow_SERVER_BAND_HI) fl = "bad";
          if (li === 6 && pl.cacheAll) fl = "bad";
          if (li === 7) fl = pl.conclude ? "ok" : "bad";
        }
        lane.push({
          label: sdnumberstoknow_LINES[i],
          flag: fl,
          title: li < q ? "answered" : li === q ? "answering now" : "not reached"
        });
      }

      // ---- §9, armed progressively ----------------------------------
      var chk = [];
      for (i = 0; i < pl.checks.length; i++) {
        var c = pl.checks[i];
        var live = q >= c.at;
        chk.push({
          label: c.label,
          flag: !live ? "idle" : c.fired ? "bad" : "ok",
          title: !live ? "not yet computable"
            : c.fired ? "FIRED — " + c.why : "clear"
        });
      }

      // ---- the running estimate --------------------------------------
      var rows = [
        { label: "actions / day", value: done(1) ? sdnumberstoknow_int(pl.actions) : "—",
          flag: done(1) ? "ok" : "idle" },
        { label: "average QPS", value: done(2) ? sdnumberstoknow_int(pl.avg) : "—",
          flag: done(2) ? "ok" : "idle" },
        { label: "peak QPS", value: done(3) ? sdnumberstoknow_int(pl.peak) +
            " (×" + pl.peakMult + ")" : "—",
          flag: !done(3) ? "idle" : pl.skipPeak ? "bad" : "ok" },
        { label: "storage / year", value: done(4) ? sdnumberstoknow_b(pl.storeYear) +
            " (×" + pl.repl + ")" : "—",
          flag: !done(4) ? "idle" : pl.skipRepl ? "bad" : "ok" },
        { label: "app servers", value: done(5) ? String(pl.servers) : "—",
          flag: !done(5) ? "idle"
            : pl.srvQps > sdnumberstoknow_SERVER_BAND_HI ? "bad" : "ok" },
        { label: "cache RAM", value: done(6) ? sdnumberstoknow_b(pl.cacheB) +
            " · " + pl.cacheNodes + " nodes" : "—",
          flag: !done(6) ? "idle" : pl.cacheAll ? "bad" : "ok" }
      ];

      // ---- the headline ----------------------------------------------
      var bigV = "—", bigL = "press play", bigF = "idle";
      if (q === 1) { bigV = sdnumberstoknow_int(pl.actions); bigL = "actions / day"; bigF = "warn"; }
      else if (q === 2) { bigV = sdnumberstoknow_int(pl.avg); bigL = "average QPS"; bigF = "warn"; }
      else if (q === 3) {
        bigV = sdnumberstoknow_int(pl.peak); bigL = "peak QPS";
        bigF = pl.skipPeak ? "bad" : "ok";
      } else if (q === 4) {
        bigV = sdnumberstoknow_b(pl.storeYear); bigL = "storage / year";
        bigF = pl.skipRepl ? "bad" : "ok";
      } else if (q === 5) {
        bigV = String(pl.servers); bigL = "app servers";
        bigF = pl.srvQps > sdnumberstoknow_SERVER_BAND_HI ? "bad" : "ok";
      } else if (q === 6) {
        bigV = sdnumberstoknow_b(pl.cacheB); bigL = "cache RAM";
        bigF = pl.cacheAll ? "bad" : "ok";
      } else if (q === 7) {
        bigV = sdnumberstoknow_usd(pl.total); bigL = "per month";
        bigF = pl.conclude ? "ok" : "bad";
      }

      // ---- the body under the estimate --------------------------------
      var body;
      if (q === 7) {
        body = d.table(["line", "figure", "what it decides"], [
          ["1 · DAU × acts", sdnumberstoknow_int(pl.actions) + "/day", "the scale of everything"],
          ["2 · ÷ 100,000", sdnumberstoknow_int(pl.avg) + " QPS", "average, not a capacity"],
          ["3 · × peak", sdnumberstoknow_int(pl.peak) + " QPS",
            pl.skipPeak ? "MISSING — sized for average" : "what you provision for"],
          ["4 · storage/yr", sdnumberstoknow_b(pl.storeYear),
            pl.skipRepl ? "MISSING ×" + sdnumberstoknow_REPL : "disk you buy"],
          ["5 · servers", String(pl.servers),
            pl.srvQps > sdnumberstoknow_SERVER_BAND_HI
              ? "from a fictional " + sdnumberstoknow_int(pl.srvQps) + " QPS box"
              : "fleet size, +1 spare"],
          ["6 · cache", sdnumberstoknow_b(pl.cacheB) + " · " + pl.cacheNodes + "n",
            pl.cacheAll ? "the whole dataset in RAM" : "hot set only"],
          ["7 · conclude", pl.conclude
            ? (pl.kind === "media"
                ? "CDN or bust" : (pl.shard ? "shard" : "one primary"))
            : "— nothing said —",
            pl.conclude ? "the only scored line" : "the estimate was wasted"]
        ]);
      } else if (q === 6) {
        var scale6 = Math.max(pl.cacheB, pl.logicalYear, 1);
        body = d.stack([
          d.bar({ label: "cache RAM", pct: (pl.cacheB / scale6) * 100,
            value: sdnumberstoknow_b(pl.cacheB), flag: pl.cacheAll ? "bad" : "ok" }),
          d.bar({ label: "all data (pre-replication)", pct: (pl.logicalYear / scale6) * 100,
            value: sdnumberstoknow_b(pl.logicalYear), flag: "warn" }),
          d.row("nodes by memory (" + sdnumberstoknow_CACHE_GB + " GB each)",
            String(pl.cacheNodes), pl.cacheAll ? "bad" : "ok"),
          d.row("nodes by throughput (" + sdnumberstoknow_int(sdnumberstoknow_REDIS_QPS) +
            " QPS each)", String(pl.redisNodes), "ok")
        ]);
      } else if (q === 5) {
        var scale5 = Math.max(pl.srvQps, sdnumberstoknow_SERVER_BAND_HI);
        body = d.stack([
          d.bar({ label: "assumed capacity / server",
            pct: (pl.srvQps / scale5) * 100, value: sdnumberstoknow_int(pl.srvQps) + " QPS",
            flag: pl.srvQps > sdnumberstoknow_SERVER_BAND_HI ? "bad" : "ok" }),
          d.bar({ label: "top of the page's 10k–50k band",
            pct: (sdnumberstoknow_SERVER_BAND_HI / scale5) * 100,
            value: sdnumberstoknow_int(sdnumberstoknow_SERVER_BAND_HI) + " QPS", flag: "warn" }),
          d.row("peak ÷ capacity", pl.raw.toFixed(2), "warn"),
          d.row("rounded up, plus " + pl.spare + " spare", String(pl.servers),
            pl.spare ? "ok" : "bad")
        ]);
      } else if (q === 4) {
        var scale4 = pl.logicalYear * sdnumberstoknow_REPL;
        body = d.stack([
          d.bar({ label: "one day", pct: (pl.bytesDay / scale4) * 100,
            value: sdnumberstoknow_b(pl.bytesDay), flag: "warn" }),
          d.bar({ label: "× 365", pct: (pl.logicalYear / scale4) * 100,
            value: sdnumberstoknow_b(pl.logicalYear), flag: "warn" }),
          d.bar({ label: "× " + sdnumberstoknow_REPL + " replicas",
            pct: pl.skipRepl ? 0 : 100,
            value: pl.skipRepl ? "not applied" : sdnumberstoknow_b(pl.storeYear),
            flag: pl.skipRepl ? "bad" : "ok" })
        ]);
      } else if (q === 3) {
        body = d.stack([
          d.bar({ label: "average", pct: (pl.avg / (pl.avg * sdnumberstoknow_PEAK)) * 100,
            value: sdnumberstoknow_int(pl.avg) + " QPS", flag: "warn" }),
          d.bar({ label: "peak (×" + sdnumberstoknow_PEAK + ", global)", pct: 100,
            value: sdnumberstoknow_int(pl.avg * sdnumberstoknow_PEAK) + " QPS",
            flag: pl.skipPeak ? "bad" : "ok" }),
          d.row("carried forward", sdnumberstoknow_int(pl.peak) + " QPS",
            pl.skipPeak ? "bad" : "ok")
        ]);
      } else if (q === 2) {
        body = d.stack([
          d.row("÷ " + sdnumberstoknow_int(sdnumberstoknow_SEC_EST) + " (the shortcut)",
            sdnumberstoknow_int(pl.avg) + " QPS", "ok"),
          d.row("÷ " + sdnumberstoknow_int(sdnumberstoknow_SEC_REAL) + " (the truth)",
            sdnumberstoknow_int(pl.avgReal) + " QPS", "warn"),
          d.row("error you are buying",
            ((sdnumberstoknow_SEC_EST - sdnumberstoknow_SEC_REAL) /
              sdnumberstoknow_SEC_REAL * 100).toFixed(1) + "%", "warn")
        ]);
      } else if (q === 1) {
        body = d.stack([
          d.row("daily actives", sdnumberstoknow_int(sdnumberstoknow_DAU), "ok"),
          d.row("actions each", String(sdnumberstoknow_ACTS), "ok"),
          d.row("read : write", pl.rw + " : 1", "warn"),
          d.row("writes/day implied", sdnumberstoknow_int(pl.writes), "warn")
        ]);
      } else {
        body = d.stack([
          d.row("payload per write", sdnumberstoknow_b(pl.writeB), "idle"),
          d.row("payload per read", sdnumberstoknow_b(pl.respB), "idle"),
          d.row("read : write", pl.rw + " : 1", "idle")
        ]);
      }

      return d.stack([
        d.flow([
          d.big(bigV, bigL, bigF),
          d.stat({
            label: "peak writes/s",
            value: q >= 3 ? pl.wPeak.toFixed(0) : "—",
            sub: "vs " + sdnumberstoknow_int(sdnumberstoknow_PRIMARY_LO) + "–" +
              sdnumberstoknow_int(sdnumberstoknow_PRIMARY_HI) + " per primary",
            flag: q < 3 ? "idle" : pl.shard ? "bad" : "ok"
          }),
          d.stat({
            label: "checks fired",
            value: q === 0 ? "—" : String((function () {
              var k = 0, j;
              for (j = 0; j < pl.checks.length; j++) {
                if (q >= pl.checks[j].at && pl.checks[j].fired) k++;
              }
              return k;
            })()),
            sub: "of " + pl.checks.length + " in §9",
            flag: q === 0 ? "idle" : pl.fired && q >= 3 ? "bad" : "ok"
          })
        ]),
        d.lane({ label: "§8 script", cells: lane }),
        d.node({
          title: pl.name,
          status: q === 0 ? "ON THE BOARD"
            : q < 7 ? "LINE " + q + " OF 7"
            : pl.conclude ? "CONCLUDED" : "NO CONCLUSION",
          statusFlag: q === 0 ? "idle" : q < 7 ? "warn" : pl.conclude ? "ok" : "bad",
          badge: pl.kind === "media" ? "media payload" : "1 KB rows",
          meta: sdnumberstoknow_b(pl.writeB) + " per write · " +
            sdnumberstoknow_b(pl.respB) + " per read",
          flag: q === 7 ? (pl.conclude ? "ok" : "bad") : undefined,
          rows: rows,
          body: body
        }),
        d.lane({ label: "§9 checks", cells: chk }),
        q === 0
          ? d.note("None of this is a calculation you look up. The whole card exists so the " +
            "seven lines take sixty seconds and the seventh is the one you actually say.")
          : q === 7
          ? d.note(pl.conclude
              ? "An estimate that changes a decision was worth the minute. This one changed " +
                "two."
              : "Six numbers, no decision. §9 caught four of the errors on the way past and " +
                "nobody was reading.", step.flag)
          : d.note("Line " + q + " of 7 — <b>" +
              sdnumberstoknow_LINES[q - 1].replace(/^\d+ · /, "") + "</b>. Each line eats the " +
              "one above it, which is why a dropped multiplier never looks like an error.")
      ]);
    }
  };

  // ====================================================================
  // ======================================================================
  // SIM · sdobservability  (observability.md)
  //
  // The page's own workflow is the time axis: "a metric alert tells you
  // something is wrong, a trace tells you which service, and logs from that
  // service tell you why." So one incident is played minute by minute — a
  // deploy to ranking-service that slows a slice of requests — and the three
  // tabs differ only in what was instrumented before it started.
  //
  //   1. averages on the dashboard, CPU thresholds for alerts, head-only
  //      sampling, prose logs,
  //   2. RED histograms, multi-window burn-rate alerting, tail-based
  //      sampling, trace id in every log line,
  //   3. the same as (2) with one service that does not forward
  //      'traceparent' — the page's stated failure mode.
  //
  // Nothing on screen is typed. Each minute is a population of
  // N = 1,000 requests in three latency buckets; every percentile, mean,
  // burn rate, budget figure and utilisation is computed off that
  // population.
  //
  // PAGE FIGURES used verbatim
  //   §2  the mistake: 990 at 10 ms + 10 at 5,000 ms  (mean/p99 recomputed
  //       below: the exact mean of the page's own numbers is 59.9 ms; the
  //       page prints 59 ms)
  //   §2  p50 / p95 / p99 / p99.9 as the four quantiles worth naming
  //   §4  the waterfall, span for span: api-gateway 12, user-service 45,
  //       postgres:SELECT 18, feed-service 240, redis:MGET 8,
  //       ranking-service 210, render 30, trace total 340 ms
  //   §4  sample 1% of traces plus 100% of errors and slow requests
  //   §5  SLO "99.9% of timeline reads under 200 ms over 30 days",
  //       error budget = 0.1% ~ 43 minutes a month
  //   §6  page at 14x normal burn, ticket at 2x
  //
  // THIS SIM'S OWN CONFIG, declared
  //   N = 1,000 requests per minute, flat; one frame = one minute
  //   latency buckets: 10 ms healthy, 1,200 ms queued, 5,000 ms stalled
  //   the incident's bucket schedule (queued, stalled) per minute, below
  //   percentile convention: nearest rank, index = floor(N x q) + 1, which
  //     reproduces the page's own p99 = 5,000 ms on its own example
  //   ranking-service scoring pool = 2 concurrent slots; utilisation and
  //     queue growth come from Little's law, L = lambda x S
  //   ranking-service CPU holds at 41% throughout - the pool is blocked on
  //     a downstream call, not computing, which is why a CPU threshold is
  //     the wrong alert
  //   burn-rate windows compressed to 1 minute (short) and 3 minutes (long)
  //     so an eight-minute incident fits; the page's 14x and 2x thresholds
  //     are used unchanged
  // ======================================================================
  var sdobservability_N = 1000;                 // requests per minute
  var sdobservability_FAST = 10;                // ms
  var sdobservability_MID = 1200;               // ms
  var sdobservability_SLOW = 5000;              // ms, and §2's own slow value
  var sdobservability_SLO_MS = 200;             // §5
  var sdobservability_SLO = 0.999;              // §5
  var sdobservability_WINDOW_MIN = 30 * 24 * 60;    // 30 days
  var sdobservability_PAGE_BURN = 14;           // §6
  var sdobservability_TICKET_BURN = 2;          // §6
  var sdobservability_LONG = 3;                 // minutes, compressed from 1 h
  var sdobservability_HEAD = 0.01;              // §4, 1% head sampling
  var sdobservability_POOL = 2;                 // scoring slots
  var sdobservability_CPU = 41;                 // % — flat, blocked not busy
  var sdobservability_CPU_ALERT = 80;           // the threshold nobody crosses
  var sdobservability_SERVICES = 12;            // §8's "12-service call chain"

  // the error budget, in requests and in minutes of total failure
  var sdobservability_BUDGET_REQ =
    (1 - sdobservability_SLO) * sdobservability_N * sdobservability_WINDOW_MIN;
  var sdobservability_BUDGET_MIN = sdobservability_BUDGET_REQ / sdobservability_N;

  // (queued, stalled) counts per minute while the bad build is live
  var sdobservability_SHAPE = [
    [0, 0], [0, 2], [8, 4], [20, 10], [45, 15], [45, 15], [45, 15], [45, 15], [45, 15]
  ];
  var sdobservability_TMAX = sdobservability_SHAPE.length - 1;   // 8 minutes

  // §4's waterfall, span for span. depth 0 = root.
  var sdobservability_SPANS = [
    { name: "api-gateway", ms: 12, depth: 0, under: "" },
    { name: "user-service", ms: 45, depth: 1, under: "api-gateway" },
    { name: "postgres:SELECT", ms: 18, depth: 2, under: "user-service" },
    { name: "feed-service", ms: 240, depth: 1, under: "api-gateway" },
    { name: "redis:MGET", ms: 8, depth: 2, under: "feed-service" },
    { name: "ranking-service", ms: 210, depth: 2, under: "feed-service" },
    { name: "render", ms: 30, depth: 1, under: "api-gateway" }
  ];
  var sdobservability_TRACE_MS = 340;           // §4's printed total

  function sdobservability_ms(x) {
    if (!isFinite(x)) return "—";
    return x >= 1000 ? (x / 1000).toFixed(x >= 10000 ? 1 : 2) + " s"
      : x >= 10 ? x.toFixed(0) + " ms" : x.toFixed(1) + " ms";
  }
  function sdobservability_int(n) {
    return Math.round(n).toLocaleString("en-US");
  }
  function sdobservability_secs(s) {
    return s >= 60 ? (s / 60).toFixed(1) + " min" : s.toFixed(1) + " s";
  }

  /** Nearest-rank quantile over the three-bucket population. */
  function sdobservability_q(rec, q) {
    var idx = Math.floor(sdobservability_N * q) + 1;
    if (idx > sdobservability_N) idx = sdobservability_N;
    if (idx <= rec.fast) return sdobservability_FAST;
    if (idx <= rec.fast + rec.mid) return sdobservability_MID;
    return sdobservability_SLOW;
  }
  function sdobservability_mean(fast, mid, slow) {
    return (fast * sdobservability_FAST + mid * sdobservability_MID +
      slow * sdobservability_SLOW) / (fast + mid + slow);
  }

  // the page's own §2 example, recomputed rather than quoted
  var sdobservability_PAGE_MEAN = sdobservability_mean(990, 0, 10);       // 59.9
  var sdobservability_PAGE_P99 = sdobservability_q(
    { fast: 990, mid: 0, slow: 10 }, 0.99);                               // 5000

  /**
   * One run of the incident. 'rollback' is the last minute on which the bad
   * build is still serving; everything after it is healthy again.
   */
  function sdobservability_sim(rollback) {
    var recs = [], burns = [], queue = 0, cum = 0, t;
    for (t = 0; t <= sdobservability_TMAX; t++) {
      var live = t >= 1 && t <= rollback;
      var sh = live ? sdobservability_SHAPE[t] : [0, 0];
      var mid = sh[0], slow = sh[1];
      var fast = sdobservability_N - mid - slow;
      var r = { t: t, fast: fast, mid: mid, slow: slow, live: live };
      r.mean = sdobservability_mean(fast, mid, slow);
      r.p50 = sdobservability_q(r, 0.5);
      r.p95 = sdobservability_q(r, 0.95);
      r.p99 = sdobservability_q(r, 0.99);
      r.p999 = sdobservability_q(r, 0.999);
      r.bad = mid + slow;                                  // over the 200 ms SLI
      r.good = sdobservability_N - r.bad;
      r.burn = (r.bad / sdobservability_N) / (1 - sdobservability_SLO);
      burns.push(r.burn);
      var lo = burns.length - sdobservability_LONG, sum = 0, k;
      for (k = 0; k < sdobservability_LONG; k++) {
        sum += (lo + k) >= 0 ? burns[lo + k] : 0;
      }
      r.longBurn = sum / sdobservability_LONG;
      cum += r.bad;
      r.cum = cum;
      r.budgetPct = (cum / sdobservability_BUDGET_REQ) * 100;
      r.budgetSecs = (cum / sdobservability_BUDGET_REQ) * sdobservability_BUDGET_MIN * 60;
      // Little's law on the scoring pool
      r.offered = (sdobservability_N / 60) * (r.mean / 1000);
      r.util = (r.offered / sdobservability_POOL) * 100;
      queue = Math.max(0, queue + (r.offered - sdobservability_POOL) * 60);
      r.queue = queue;
      // how many of this minute's traces survive each sampling policy
      r.headOnly = Math.floor(sdobservability_HEAD * sdobservability_N);
      r.headSlow = Math.floor(sdobservability_HEAD * r.bad);
      r.tailKept = Math.floor(sdobservability_HEAD * r.good) + r.bad;
      recs.push(r);
    }
    // the burn-rate rules, evaluated whether or not this tab has them wired
    var tick = -1, pg = -1;
    for (t = 1; t <= sdobservability_TMAX; t++) {
      if (tick < 0 && recs[t].longBurn >= sdobservability_TICKET_BURN) tick = t;
      if (pg < 0 && recs[t].burn >= sdobservability_PAGE_BURN &&
        recs[t].longBurn >= sdobservability_PAGE_BURN) pg = t;
    }
    return {
      recs: recs, rollback: rollback, ticketAt: tick, pageAt: pg,
      total: recs[sdobservability_TMAX].cum,
      hoursToBurn: recs[sdobservability_TMAX].bad > 0
        ? sdobservability_BUDGET_REQ / recs[sdobservability_TMAX].bad / 60 : 0
    };
  }

  var sdobservability_R_GOOD = sdobservability_sim(6);     // rolled back at t=6
  var sdobservability_R_BLIND = sdobservability_sim(99);   // never rolled back
  var sdobservability_R_LOST = sdobservability_sim(7);     // one minute later

  /** p99 averaged across two servers, versus the merged distribution. */
  function sdobservability_split(rec) {
    var nA = 700, nB = sdobservability_N - nA;             // all the bad land on A
    var badA = Math.min(rec.bad, nA);
    var midA = Math.min(rec.mid, badA), slowA = badA - midA;
    var a = { fast: nA - badA, mid: midA, slow: slowA };
    var idxA = Math.floor(nA * 0.99) + 1, cumA = a.fast, pA;
    if (idxA <= cumA) pA = sdobservability_FAST;
    else if (idxA <= cumA + a.mid) pA = sdobservability_MID;
    else pA = sdobservability_SLOW;
    var pB = sdobservability_FAST;                          // B saw none of it
    return { nA: nA, nB: nB, pA: pA, pB: pB, avg: (pA + pB) / 2, real: rec.p99 };
  }

  // ---- frames -----------------------------------------------------------
  function sdobservability_frames(run, mode, phases) {
    var s = [], t;
    for (t = 0; t <= sdobservability_TMAX; t++) {
      s.push({ t: t, mode: mode, run: run, rec: run.recs[t], phase: phases[t] });
    }
    return s;
  }

  function sdobservability_blind() {
    var run = sdobservability_R_BLIND, ref = sdobservability_R_GOOD;
    var f = sdobservability_frames(run, "blind",
      ["idle", "deploy", "tail", "green", "green2", "avgtrap", "report", "guess", "post"]);
    var r = run.recs, sp = sdobservability_split(r[5]);

    f[0].caption = "<b>Steady state.</b> One dashboard, one number on it: mean latency, <b>" +
      sdobservability_ms(r[0].mean) + "</b>. One alert rule: ranking-service CPU above " +
      sdobservability_CPU_ALERT + "%. Traces are head-sampled at " +
      (sdobservability_HEAD * 100) + "% and the logs are prose. Press Play — a bad build " +
      "ships to ranking-service in one minute.";
    f[1].flag = "warn";
    f[1].caption = "<b>t+1 · the build lands.</b> " + r[1].slow + " of " +
      sdobservability_int(sdobservability_N) + " requests stall at " +
      sdobservability_ms(sdobservability_SLOW) + ". The mean moves from " +
      sdobservability_ms(r[0].mean) + " to <b>" + sdobservability_ms(r[1].mean) +
      "</b> — nobody would look twice. Only p99.9 has moved, and this dashboard does not " +
      "have one.";
    f[2].flag = "warn";
    f[2].caption = "<b>t+2.</b> " + r[2].bad + " requests over the " +
      sdobservability_SLO_MS + " ms objective. The mean reads <b>" +
      sdobservability_ms(r[2].mean) + "</b> and is still green against a " +
      sdobservability_SLO_MS + " ms target. Burn rate is already <b>" +
      r[2].burn.toFixed(0) + "×</b> normal, which is the number that would have opened a " +
      "ticket — if anything were measuring it.";
    f[3].flag = "bad";
    f[3].caption = "<b>t+3 · the minute this should have paged.</b> Same traffic, judged by " +
      "the page's own rule — burn ≥ <b>" + sdobservability_PAGE_BURN +
      "×</b> on both windows — fires <i>here</i>: " + r[3].burn.toFixed(0) +
      "× this minute, " + r[3].longBurn.toFixed(1) + "× over three. Instead the only rule " +
      "wired is CPU > " + sdobservability_CPU_ALERT + "%, and ranking-service CPU is <b>" +
      sdobservability_CPU + "%</b> — it is blocked on a downstream call, not computing. A " +
      "cause-based alert cannot see a cause that does not burn CPU.";
    f[4].flag = "bad";
    f[4].caption = "<b>t+4.</b> " + r[4].bad + " users a minute now wait more than " +
      sdobservability_SLO_MS + " ms, and the mean is <b>" + sdobservability_ms(r[4].mean) +
      "</b> — under target, because " + r[4].fast + " of " +
      sdobservability_int(sdobservability_N) + " requests are still " +
      sdobservability_ms(sdobservability_FAST) + ". <b>That is the entire argument against " +
      "averages</b>, in one row: the arithmetic mean of a bimodal distribution describes " +
      "nobody. Pool utilisation just crossed 100% — the queue starts growing from here.";
    f[5].flag = "bad";
    f[5].caption = "<b>t+5 · someone adds a p99 panel.</b> It averages the two replicas' " +
      "p99s: replica A, carrying all " + r[5].bad + " bad requests of its " + sp.nA +
      ", reports <b>" + sdobservability_ms(sp.pA) + "</b>; replica B reports <b>" +
      sdobservability_ms(sp.pB) + "</b>. Their mean is <b>" + sdobservability_ms(sp.avg) +
      "</b>. The merged distribution's p99 is <b>" + sdobservability_ms(sp.real) +
      "</b>. <i>You cannot average percentiles</i> — off by " +
      (sp.real / sp.avg).toFixed(1) + "× here, and in the direction that reassures you.";
    f[6].flag = "bad";
    f[6].caption = "<b>t+6 · a customer emails.</b> Six minutes of detection by human, " +
      "against <b>" + ref.pageAt + " minutes</b> for a burn-rate alert on the identical " +
      "traffic. They quote no trace id, because nothing returns one. The request crossed <b>" +
      sdobservability_SERVICES + "</b> services and there is no way to ask which one was slow.";
    f[7].flag = "bad";
    f[7].caption = "<b>t+7 · bisecting by hand.</b> " + sdobservability_HEAD * 100 +
      "% head sampling stored <b>" + r[7].headOnly + "</b> traces this minute, of which <b>" +
      r[7].headSlow + "</b> are slow ones — head-based sampling decides before it knows the " +
      "answer, so the interesting requests are kept at exactly the rate of the boring ones. " +
      "The logs say <code>\"feed timed out for user 8812\"</code>, which is unqueryable and " +
      "names the wrong service.";
    f[8].flag = "bad";
    f[8].caption = "<b>t+8 · still burning.</b> <b>" + sdobservability_int(r[8].cum) +
      "</b> requests over objective, <b>" + r[8].budgetPct.toFixed(2) +
      "%</b> of the month's error budget — " + sdobservability_secs(r[8].budgetSecs) +
      " of its " + sdobservability_BUDGET_MIN.toFixed(1) + " minutes. At the current <b>" +
      r[8].bad + "/min</b> the whole budget is gone in <b>" + run.hoursToBurn.toFixed(1) +
      " hours</b>. Nothing is broken about this system's monitoring except what it chose to " +
      "measure: an average, a cause, and a sample taken before the answer was known.";
    return { id: "blind", label: "Averages and CPU alerts", steps: f };
  }

  function sdobservability_red() {
    var run = sdobservability_R_GOOD;
    var f = sdobservability_frames(run, "red",
      ["idle", "deploy", "ticket", "page", "trace", "logs", "mitigate", "recover", "post"]);
    var r = run.recs;
    var rank = 210, trace = sdobservability_TRACE_MS;

    f[0].caption = "<b>Steady state.</b> RED on every service — rate, errors and duration " +
      "as a <b>histogram</b>, so a quantile is computed from the merged distribution at " +
      "query time rather than averaged from pre-aggregated numbers. SLO: <b>" +
      (sdobservability_SLO * 100).toFixed(1) + "% of reads under " + sdobservability_SLO_MS +
      " ms over 30 days</b>, a budget of " + sdobservability_int(sdobservability_BUDGET_REQ) +
      " requests — " + sdobservability_BUDGET_MIN.toFixed(1) + " minutes. Press Play.";
    f[1].flag = "warn";
    f[1].caption = "<b>t+1 · the build lands.</b> p50 " + sdobservability_ms(r[1].p50) +
      ", p95 " + sdobservability_ms(r[1].p95) + ", p99 " + sdobservability_ms(r[1].p99) +
      " — all unchanged. <b>p99.9 is " + sdobservability_ms(r[1].p999) + "</b>. Two " +
      "requests in a thousand. This is what p99.9 is for, and why the histogram has to " +
      "keep the bucket: the tail arrives before the body.";
    f[2].flag = "warn";
    f[2].caption = "<b>t+2 · ticket.</b> p99 crosses to <b>" +
      sdobservability_ms(r[2].p99) + "</b>, past the " + sdobservability_SLO_MS +
      " ms objective. Burn rate <b>" + r[2].burn.toFixed(0) + "×</b> this minute, <b>" +
      r[2].longBurn.toFixed(1) + "×</b> over the long window — above the <b>" +
      sdobservability_TICKET_BURN + "×</b> slow-burn threshold, below the page threshold. " +
      "So it files a ticket and wakes nobody. That distinction is the whole point of " +
      "multi-window alerting.";
    f[3].flag = "bad";
    f[3].caption = "<b>t+3 · page.</b> Burn <b>" + r[3].burn.toFixed(0) +
      "×</b> short and <b>" + r[3].longBurn.toFixed(1) + "×</b> long, both over <b>" +
      sdobservability_PAGE_BURN + "×</b> — the page fires on a <i>symptom</i>: users are " +
      "outside the objective and the budget is going fast enough to matter. Ranking-service " +
      "CPU is " + sdobservability_CPU + "%, so every cause-based rule in the building is " +
      "silent, and correctly so.";
    f[4].flag = "warn";
    f[4].caption = "<b>t+4 · the trace answers “which service”.</b> Sampling is " +
      (sdobservability_HEAD * 100) + "% of everything <i>plus</i> 100% of slow and errored " +
      "requests, so this minute stored <b>" + r[4].tailKept + "</b> traces of " +
      sdobservability_int(sdobservability_N) + " — " +
      (r[4].tailKept / sdobservability_N * 100).toFixed(1) + "% of the traffic, and all <b>" +
      r[4].bad + "</b> of the interesting ones. The waterfall: <b>ranking-service owns " +
      rank + " of " + trace + " ms</b>, " + (rank / trace * 100).toFixed(0) +
      "% of the request and " + (rank / 240 * 100).toFixed(0) +
      "% of its parent's span. One glance, not " + sdobservability_SERVICES + " guesses.";
    f[5].flag = "warn";
    f[5].caption = "<b>t+5 · the logs answer “why”.</b> The trace id is in every log line, " +
      "so one query returns this request's ranking-service logs and nothing else. " +
      "Structured, so it aggregates: the same query grouped by <code>reason</code> shows " +
      "all <b>" + r[5].bad + "</b> of this minute's slow requests share one. The pool has " +
      "been over 100% utilised since t+4 and the queue is <b>" + Math.round(r[5].queue) +
      "</b> deep — saturation was the leading indicator, and it is still rising.";
    f[6].flag = "warn";
    f[6].caption = "<b>t+6 · rollback.</b> Mitigate first, diagnose after. This minute still " +
      "serves the bad build: <b>" + sdobservability_int(r[6].cum) + "</b> requests over " +
      "objective so far, <b>" + r[6].budgetPct.toFixed(2) + "%</b> of the month's budget.";
    f[7].flag = "ok";
    f[7].caption = "<b>t+7 · recovered.</b> p99 back to " +
      sdobservability_ms(r[7].p99) + ", p99.9 to " + sdobservability_ms(r[7].p999) +
      ", burn <b>" + r[7].burn.toFixed(0) + "×</b>. The queue drains in one minute because " +
      "offered concurrency fell to " + r[7].offered.toFixed(2) + " against " +
      sdobservability_POOL + " slots — the backlog was the pool being over-subscribed, " +
      "nothing more.";
    f[8].flag = "ok";
    f[8].caption = "<b>t+8 · the bill.</b> Detected at <b>t+" + run.pageAt +
      "</b>, cause named at <b>t+4</b>, mitigated at <b>t+" + run.rollback + "</b>. Total " +
      "cost <b>" + sdobservability_int(run.total) + "</b> requests over objective = <b>" +
      r[8].budgetPct.toFixed(2) + "%</b> of the month — " +
      sdobservability_secs(r[8].budgetSecs) + " of " +
      sdobservability_BUDGET_MIN.toFixed(1) + " minutes. Budget remaining: <b>" +
      (100 - r[8].budgetPct).toFixed(1) + "%</b>, so the team keeps shipping. That is what " +
      "the budget is for — it converted “how reliable should this be?” into a number " +
      "everyone had already agreed.";
    return { id: "red", label: "RED + traces + burn rate", steps: f };
  }

  function sdobservability_lost() {
    var run = sdobservability_R_LOST, ref = sdobservability_R_GOOD;
    var f = sdobservability_frames(run, "lost",
      ["idle", "deploy", "ticket", "page", "broken", "wrongteam", "found", "mitigate", "post"]);
    var r = run.recs;
    var i, visMs = 0, lostMs = 0, visN = 0;
    for (i = 0; i < sdobservability_SPANS.length; i++) {
      var sp = sdobservability_SPANS[i];
      if (sp.under === "feed-service") lostMs += sp.ms;
      else { visMs += sp.ms; visN++; }
    }
    var trace = sdobservability_TRACE_MS;

    f[0].caption = "<b>Steady state — and one gap nobody has noticed.</b> Same histograms, " +
      "same burn-rate alerting, same tail-based sampling as the previous tab. But " +
      "feed-service builds its downstream requests with a fresh client and does not forward " +
      "the <code>traceparent</code> header. Nothing about that is visible until you need it. " +
      "Press Play.";
    f[1].flag = "warn";
    f[1].caption = "<b>t+1 · the build lands.</b> Identical to the instrumented run: p99.9 " +
      "goes to " + sdobservability_ms(r[1].p999) + " on " + r[1].slow +
      " requests in " + sdobservability_int(sdobservability_N) + ". The metrics pipeline " +
      "does not care about trace context, so everything through the alert is unaffected.";
    f[2].flag = "warn";
    f[2].caption = "<b>t+2 · ticket.</b> Burn <b>" + r[2].longBurn.toFixed(1) +
      "×</b> over the long window, past <b>" + sdobservability_TICKET_BURN +
      "×</b>. Same minute as the healthy run. Metrics are fine here — the missing header " +
      "costs nothing until the question changes from <i>is something wrong</i> to " +
      "<i>which service</i>.";
    f[3].flag = "bad";
    f[3].caption = "<b>t+3 · page.</b> <b>" + r[3].burn.toFixed(0) + "×</b> short, <b>" +
      r[3].longBurn.toFixed(1) + "×</b> long. Detection is identical: <b>t+" + run.pageAt +
      "</b>, the same minute as the tab before. Everything that is about to go wrong goes " +
      "wrong in the next step.";
    f[4].flag = "bad";
    f[4].caption = "<b>t+4 · the trace is a stump.</b> " + visN + " spans of " +
      sdobservability_SPANS.length + " arrive. feed-service started a new, unlinked trace " +
      "for everything it called, so <b>redis:MGET</b> and <b>ranking-service</b> are simply " +
      "absent — <b>" + lostMs + " ms</b> of the " + trace + " ms request, " +
      (lostMs / trace * 100).toFixed(0) + "% of it, gone. What is left says feed-service is " +
      "a leaf holding <b>240 ms</b>, " + (240 / trace * 100).toFixed(0) +
      "% of the trace. The waterfall is not wrong so much as confidently mistaken.";
    f[5].flag = "bad";
    f[5].caption = "<b>t+5 · the wrong team is woken.</b> The feed on-call reads their own " +
      "RED panels: rate normal, errors zero, their handler's own duration in the low " +
      "milliseconds. They are looking at a service that is fast and being told it owns " +
      "<b>240 ms</b>. Meanwhile the incident runs: <b>" + r[5].bad +
      "</b> more requests over objective this minute, queue <b>" + Math.round(r[5].queue) +
      "</b> and rising.";
    f[6].flag = "bad";
    f[6].caption = "<b>t+6 · found the hard way.</b> Someone opens every downstream " +
      "service's RED dashboard by hand and ranking-service's duration histogram is the one " +
      "that moved. Cause named at <b>t+6</b> against <b>t+4</b> with the header intact — " +
      "<b>two extra minutes</b>, spent entirely on an attribution the trace was supposed to " +
      "give for free.";
    f[7].flag = "warn";
    f[7].caption = "<b>t+7 · rollback, a minute later than it needed to be.</b> This minute " +
      "still serves the bad build: <b>" + r[7].bad + "</b> more requests over objective, " +
      "taking the total to <b>" + sdobservability_int(r[7].cum) + "</b>.";
    f[8].flag = "bad";
    f[8].caption = "<b>t+8 · the price of one header.</b> <b>" +
      sdobservability_int(run.total) + "</b> requests over objective against <b>" +
      sdobservability_int(ref.total) + "</b> for the identical incident with propagation " +
      "working — <b>" + (run.total - ref.total) + " more</b>, <b>" +
      ((run.total / ref.total - 1) * 100).toFixed(0) + "%</b> more budget, <b>" +
      sdobservability_secs(r[8].budgetSecs - ref.recs[8].budgetSecs) + "</b> extra against a " +
      sdobservability_BUDGET_MIN.toFixed(1) + "-minute month. Detection was identical; " +
      "attribution was not. <b>One service that drops the context blinds everything below " +
      "it</b>, and it costs nothing until the night it costs everything.";
    return { id: "lost", label: "One service drops traceparent", steps: f };
  }

  // ======================================================================
  S["sdobservability"] = {
    title: "Debug one incident three ways",
    note: "A bad build reaches ranking-service and stalls a slice of requests. One frame = " +
      "one minute, <b>" + sdobservability_int(sdobservability_N) + " requests</b> a minute " +
      "in three buckets — " + sdobservability_FAST + " ms healthy, " + sdobservability_MID +
      " ms queued, " + sdobservability_SLOW + " ms stalled. Every percentile is nearest-rank " +
      "over that population, which reproduces the page's own example exactly: 990 at 10 ms " +
      "plus 10 at 5,000 ms gives mean <b>" + sdobservability_PAGE_MEAN.toFixed(1) +
      " ms</b> (the page prints 59) and p99 <b>" +
      sdobservability_int(sdobservability_PAGE_P99) + " ms</b>. SLO is the page's — <b>" +
      (sdobservability_SLO * 100).toFixed(1) + "% under " + sdobservability_SLO_MS +
      " ms over 30 days</b> — so the budget is " +
      sdobservability_int(sdobservability_BUDGET_REQ) + " requests, <b>" +
      sdobservability_BUDGET_MIN.toFixed(1) + " minutes</b> a month. Alert thresholds are " +
      "the page's <b>" + sdobservability_PAGE_BURN + "×</b> to page and <b>" +
      sdobservability_TICKET_BURN + "×</b> to ticket, on windows compressed to 1 and " +
      sdobservability_LONG + " minutes so an eight-minute incident fits. Pool utilisation " +
      "is Little's law on <b>" + sdobservability_POOL + "</b> scoring slots; the waterfall " +
      "is §4's, span for span, totalling " + sdobservability_TRACE_MS + " ms.",
    interval: 1400,

    scenarios: [sdobservability_blind(), sdobservability_red(), sdobservability_lost()],

    draw: function (step, d, ctx) {
      var r = step.rec, run = step.run, mode = step.mode, ph = step.phase, i;
      var t = step.t;
      var blind = mode === "blind";
      var lost = mode === "lost";

      // ---- the minute lane ------------------------------------------
      var lane = [];
      for (i = 0; i <= sdobservability_TMAX; i++) {
        var ri = run.recs[i];
        lane.push({
          label: i > t ? "" : ri.bad ? String(ri.bad) : "·",
          flag: i > t ? "idle"
            : ri.bad >= 30 ? "bad" : ri.bad > 0 ? "warn" : "ok",
          title: i > t ? "minute " + i + " — not reached"
            : "t+" + i + " · " + ri.bad + " over " + sdobservability_SLO_MS +
              " ms · burn " + ri.burn.toFixed(0) + "× · queue " + Math.round(ri.queue)
        });
      }

      // ---- percentiles, always drawn --------------------------------
      var scale = sdobservability_SLOW;
      var pbars = d.stack([
        d.bar({ label: "mean (what an average dashboard shows)",
          pct: (r.mean / scale) * 100, value: sdobservability_ms(r.mean),
          flag: r.mean > sdobservability_SLO_MS ? "bad" : blind && r.bad ? "warn" : "ok" }),
        d.bar({ label: "p50", pct: (r.p50 / scale) * 100,
          value: sdobservability_ms(r.p50),
          flag: r.p50 > sdobservability_SLO_MS ? "bad" : "ok" }),
        d.bar({ label: "p95", pct: (r.p95 / scale) * 100,
          value: sdobservability_ms(r.p95),
          flag: r.p95 > sdobservability_SLO_MS ? "bad" : "ok" }),
        d.bar({ label: "p99  ← the number to design against",
          pct: (r.p99 / scale) * 100, value: sdobservability_ms(r.p99),
          flag: r.p99 > sdobservability_SLO_MS ? "bad" : "ok" }),
        d.bar({ label: "p99.9", pct: (r.p999 / scale) * 100,
          value: sdobservability_ms(r.p999),
          flag: r.p999 > sdobservability_SLO_MS ? "bad" : "ok" })
      ]);

      // ---- the body switches with the phase --------------------------
      var body, extra = "";
      if (ph === "trace" || ph === "broken") {
        var bars = [];
        for (i = 0; i < sdobservability_SPANS.length; i++) {
          var sp = sdobservability_SPANS[i];
          var dropped = lost && sp.under === "feed-service";
          var pad = sp.depth === 0 ? "" : sp.depth === 1 ? "└ " : "   └ ";
          bars.push(d.bar({
            label: pad + sp.name + (dropped ? "  (never arrived)" : ""),
            pct: dropped ? 0 : (sp.ms / sdobservability_TRACE_MS) * 100,
            value: dropped ? "—" : sp.ms + " ms",
            flag: dropped ? "bad"
              : sp.name === "ranking-service" ? "bad"
              : sp.ms >= 240 ? "warn" : "ok"
          }));
        }
        body = d.stack(bars);
        extra = d.mono("traceparent: 00-7b3f9c21a4e05d18-" +
          (lost ? "DROPPED AT feed-service" : "b7ad6b7169203331") + "-01" +
          "   ·   trace total " + sdobservability_TRACE_MS + " ms",
          lost ? "bad" : "ok");
      } else if (ph === "logs") {
        body = d.stack([
          d.row("query", "trace_id = 7b3f9c21 AND service = ranking", "ok"),
          d.row("lines returned", "1 of this request's " +
            sdobservability_SPANS.length + " spans", "ok"),
          d.row("same query, grouped", r.bad + " slow requests, one reason", "ok"),
          d.row("traces stored this minute", r.tailKept + " of " +
            sdobservability_int(sdobservability_N), "ok")
        ]);
        extra = d.mono('{"event":"score_timeout","trace_id":"7b3f9c21",' +
          '"service":"ranking","model":"v41","latency_ms":' + sdobservability_SLOW +
          ',"pool_queue":' + Math.round(r.queue) + "}", "ok");
      } else if (ph === "avgtrap") {
        var sp2 = sdobservability_split(r);
        body = d.stack([
          d.bar({ label: "replica A p99 (" + sp2.nA + " reqs, all " + r.bad + " bad ones)",
            pct: (sp2.pA / scale) * 100, value: sdobservability_ms(sp2.pA), flag: "bad" }),
          d.bar({ label: "replica B p99 (" + sp2.nB + " reqs)",
            pct: (sp2.pB / scale) * 100, value: sdobservability_ms(sp2.pB), flag: "ok" }),
          d.bar({ label: "mean of the two p99s  ← what the panel plots",
            pct: (sp2.avg / scale) * 100, value: sdobservability_ms(sp2.avg), flag: "bad" }),
          d.bar({ label: "p99 of the merged distribution  ← the truth",
            pct: (sp2.real / scale) * 100, value: sdobservability_ms(sp2.real), flag: "warn" })
        ]);
      } else if (ph === "post") {
        body = d.table(["", "this run", "instrumented run"], [
          ["detected",
            blind ? "t+6, by a customer" : "t+" + run.pageAt + ", burn rate",
            "t+" + sdobservability_R_GOOD.pageAt],
          ["cause named",
            blind ? "not yet, t+8" : lost ? "t+6" : "t+4", "t+4"],
          ["mitigated",
            blind ? "—" : "t+" + run.rollback,
            "t+" + sdobservability_R_GOOD.rollback],
          ["over objective", sdobservability_int(run.total) + " reqs",
            sdobservability_int(sdobservability_R_GOOD.total) + " reqs"],
          ["budget spent", r.budgetPct.toFixed(2) + "%",
            sdobservability_R_GOOD.recs[sdobservability_TMAX].budgetPct.toFixed(2) + "%"],
          ["= of " + sdobservability_BUDGET_MIN.toFixed(1) + " min",
            sdobservability_secs(r.budgetSecs),
            sdobservability_secs(sdobservability_R_GOOD.recs[sdobservability_TMAX].budgetSecs)]
        ]);
      } else {
        body = pbars;
      }

      // ---- alerting node ---------------------------------------------
      var fired, fireFlag, ruleTxt;
      if (blind) {
        fired = "SILENT";
        fireFlag = t >= 1 ? "bad" : "idle";
        ruleTxt = "CPU > " + sdobservability_CPU_ALERT + "% · actual " +
          sdobservability_CPU + "%";
      } else {
        var paged = run.pageAt >= 0 && t >= run.pageAt && r.burn >= sdobservability_PAGE_BURN;
        var ticketed = run.ticketAt >= 0 && t >= run.ticketAt;
        fired = paged ? "PAGING" : ticketed && r.bad ? "TICKETED" : t === 0 ? "ARMED" : "QUIET";
        fireFlag = paged ? "bad" : ticketed && r.bad ? "warn" : t === 0 ? "idle" : "ok";
        ruleTxt = "page ≥ " + sdobservability_PAGE_BURN + "× · ticket ≥ " +
          sdobservability_TICKET_BURN + "×";
      }

      var alertNode = d.node({
        title: blind ? "alerting · cause-based" : "alerting · burn rate",
        status: fired,
        statusFlag: fireFlag,
        badge: blind ? "thresholds" : "multi-window",
        meta: ruleTxt,
        flag: fireFlag,
        gauges: [{
          label: "error budget spent",
          pct: r.budgetPct,
          value: r.budgetPct.toFixed(2) + "% · " + sdobservability_secs(r.budgetSecs),
          flag: r.budgetPct > 2 ? "bad" : r.budgetPct > 0.5 ? "warn" : "ok"
        }],
        rows: [
          { label: "burn, this minute", value: r.burn.toFixed(0) + "×",
            flag: r.burn >= sdobservability_PAGE_BURN ? "bad"
              : r.burn >= sdobservability_TICKET_BURN ? "warn" : "ok" },
          { label: "burn, " + sdobservability_LONG + "-min window",
            value: r.longBurn.toFixed(1) + "×",
            flag: r.longBurn >= sdobservability_PAGE_BURN ? "bad"
              : r.longBurn >= sdobservability_TICKET_BURN ? "warn" : "ok" },
          { label: "over " + sdobservability_SLO_MS + " ms", value: r.bad + " / " +
              sdobservability_int(sdobservability_N),
            flag: r.bad ? "bad" : "ok" }
        ]
      });

      var useNode = d.node({
        title: "ranking-service · USE",
        status: r.util >= 100 ? "SATURATED" : r.util >= 70 ? "BUSY" : "HEALTHY",
        statusFlag: r.util >= 100 ? "bad" : r.util >= 70 ? "warn" : "ok",
        badge: sdobservability_POOL + " scoring slots",
        meta: "CPU " + sdobservability_CPU + "% — blocked, not computing",
        flag: r.util >= 100 ? "bad" : r.util >= 70 ? "warn" : "ok",
        gauges: [{
          label: "utilisation (L = λ × S)",
          pct: Math.min(r.util, 100),
          value: r.util.toFixed(0) + "%",
          flag: r.util >= 100 ? "bad" : r.util >= 70 ? "warn" : "ok"
        }],
        rows: [
          { label: "offered concurrency", value: r.offered.toFixed(2),
            flag: r.offered > sdobservability_POOL ? "bad" : "ok" },
          { label: "saturation · queue depth", value: String(Math.round(r.queue)),
            flag: r.queue > 20 ? "bad" : r.queue > 0 ? "warn" : "ok" },
          { label: "traces kept this minute",
            value: String(blind ? r.headOnly : r.tailKept) +
              (blind ? " (" + r.headSlow + " slow)" : " (all " + r.bad + " slow)"),
            flag: blind && r.bad ? "bad" : "ok" }
        ]
      });

      return d.stack([
        d.flow([
          d.big(t === 0 ? "t+0" : "t+" + t, ph === "post" ? "post-mortem" : "minutes in",
            t === 0 ? "idle" : r.bad ? "bad" : "ok"),
          d.stat({
            label: "p99",
            value: sdobservability_ms(r.p99),
            sub: "objective " + sdobservability_SLO_MS + " ms",
            flag: r.p99 > sdobservability_SLO_MS ? "bad" : "ok"
          }),
          d.stat({
            label: "mean",
            value: sdobservability_ms(r.mean),
            sub: r.mean > sdobservability_SLO_MS ? "over target" : "reads green",
            flag: r.mean > sdobservability_SLO_MS ? "bad" : r.bad ? "warn" : "ok"
          }),
          d.stat({
            label: "budget left",
            value: (100 - r.budgetPct).toFixed(1) + "%",
            sub: "of " + sdobservability_BUDGET_MIN.toFixed(1) + " min/month",
            flag: r.budgetPct > 2 ? "bad" : r.budgetPct > 0.5 ? "warn" : "ok"
          })
        ]),
        d.lane({ label: "minutes", cells: lane }),
        d.cols([alertNode, useNode]),
        d.node({
          title: ph === "trace" || ph === "broken" ? "trace 7b3f… · one request"
            : ph === "logs" ? "logs, joined by trace id"
            : ph === "avgtrap" ? "the p99 panel someone just added"
            : ph === "post" ? "post-mortem"
            : "latency distribution · " + sdobservability_int(sdobservability_N) +
              " requests this minute",
          status: ph === "broken" ? (sdobservability_SPANS.length - 2) + " OF " +
              sdobservability_SPANS.length + " SPANS"
            : ph === "trace" ? sdobservability_SPANS.length + " SPANS"
            : r.bad ? r.bad + " OVER OBJECTIVE" : "ALL UNDER " + sdobservability_SLO_MS + " MS",
          statusFlag: ph === "broken" ? "bad" : r.bad ? "bad" : "ok",
          flag: ph === "broken" ? "bad" : undefined,
          body: body + extra
        }),
        ph === "post"
          ? d.note(blind
              ? "Metrics, traces and logs are a <b>workflow</b>, and this run had none of " +
                "it: the metric was an average so nothing said <i>something is wrong</i>, " +
                "there was no trace so nothing said <i>which service</i>, and the logs were " +
                "prose so nothing said <i>why</i>."
              : lost
              ? "The alert was right, the sampling was right, the logs were right. One " +
                "missing header moved the answer to the wrong team for two minutes."
              : "Metric → trace → log, in that order, each answering a different question. " +
                "Saying that sentence at the end of a design round takes fifteen seconds.",
              step.flag)
          : ph === "idle"
          ? d.note("Nothing is wrong yet. What is already decided is how much of the next " +
              "eight minutes you will be able to see.")
          : d.note("Minute " + t + " of " + sdobservability_TMAX + ". " +
              (r.bad
                ? "<b>" + r.bad + "</b> requests past the " + sdobservability_SLO_MS +
                  " ms objective — burn <b>" + r.burn.toFixed(0) + "×</b>, budget spent <b>" +
                  r.budgetPct.toFixed(2) + "%</b>."
                : "Every request inside the objective; the budget stops moving."))
      ]);
    }
  };

  // ====================================================================
  // ======================================================================
  // SIM · sdqueuesandstreams  (queues-and-streams.md)
  //
  // The page's time axis is section 5. "Lag rising steadily", "lag spiking
  // then draining" and "lag rising with idle consumers" are three different
  // shapes of the same graph, and the page asks you to tell them apart on
  // sight. So one partitioned log is run three times under the same burst and
  // the lag is COUNTED, tick by tick, off a real consumer schedule.
  //
  // CONFIG — every figure on screen derives from these.
  //   partitions            4            page 4: "topic with 4 partitions"
  //   consumer group        2, then 4, then 4+1
  //                                      page 4: "consumer group of 2",
  //                                      "scale to 4 -> one partition each",
  //                                      "scale to 5 -> one sits IDLE"
  //   handler cost         40 ms         this sim's figure -> 25 msg/s/consumer
  //   tick                 40 ms         = one handler invocation
  //   frame                25 ticks = 1.000 s;  8 frames = 8 s
  //   baseline arrivals    20 msg/s
  //   burst                10x baseline  page 1: "A 10x spike becomes a
  //                                      longer queue, not a crash"
  //   overload arrivals    1.5x the four-consumer capacity
  //   partition key        author_id, uniform -> round robin over 4 partitions
  //                                      page 8: "Partition by author ID"
  //   retry                delay = 100 ms x 2^(n-1), +-25% jitter, capped 2 s
  //                                      page 6: "delay = base x 2^n +- random"
  //   max attempts         5             page 8: "land in a DLQ after five
  //                                      attempts"
  //   dedupe key           (event_id, follower_id), unique constraint  page 8
  //   upstream timeout     30 s          this sim's figure, for the projection
  //
  // Capacity is therefore computed, never typed:
  //   4 consumers x (1000 / 40) = 100 messages/s;  2 consumers = 50/s.
  // The poison message is one single event, injected on partition 2 at the
  // start of frame 2. Nothing else about the three runs differs.
  // ======================================================================
  var sdqueuesandstreams_PARTS = 4;
  var sdqueuesandstreams_HANDLER_MS = 40;
  var sdqueuesandstreams_TICK_MS = sdqueuesandstreams_HANDLER_MS;
  var sdqueuesandstreams_FRAME_MS = 1000;
  var sdqueuesandstreams_FRAME_TICKS =
    Math.round(sdqueuesandstreams_FRAME_MS / sdqueuesandstreams_TICK_MS);   // 25
  var sdqueuesandstreams_FRAMES = 8;
  var sdqueuesandstreams_RATE = 1000 / sdqueuesandstreams_HANDLER_MS;       // 25/s
  var sdqueuesandstreams_BASE = 20;                                         // msg/s
  var sdqueuesandstreams_SPIKE = 10;                                        // page: 10x
  var sdqueuesandstreams_BACKOFF_MS = 100;
  var sdqueuesandstreams_BACKOFF_MAX = 2000;
  var sdqueuesandstreams_JITTER = 0.25;
  var sdqueuesandstreams_ATTEMPTS = 5;
  var sdqueuesandstreams_TIMEOUT_S = 30;
  var sdqueuesandstreams_POISON_FRAME = 1;      // 0-based: the start of frame 2
  var sdqueuesandstreams_POISON_PART = 2;

  // capacity, computed
  function sdqueuesandstreams_cap(n) { return n * sdqueuesandstreams_RATE; }
  var sdqueuesandstreams_CAP4 = sdqueuesandstreams_cap(4);                  // 100/s
  var sdqueuesandstreams_CAP2 = sdqueuesandstreams_cap(2);                  // 50/s

  // the burst schedule: baseline, then a 10x spike for three seconds
  var sdqueuesandstreams_MULT = [1, 10, 10, 10, 1, 1, 1, 1];
  function sdqueuesandstreams_burstArr() {
    var a = [], i;
    for (i = 0; i < sdqueuesandstreams_FRAMES; i++) {
      a.push(sdqueuesandstreams_BASE * sdqueuesandstreams_MULT[i]);
    }
    return a;
  }
  // the overload schedule: persistently 1.5x what four consumers can retire
  function sdqueuesandstreams_overArr() {
    var a = [], i;
    for (i = 0; i < sdqueuesandstreams_FRAMES; i++) {
      a.push(Math.round(sdqueuesandstreams_CAP4 * 1.5));
    }
    return a;
  }
  var sdqueuesandstreams_ARR_BURST = sdqueuesandstreams_burstArr();
  var sdqueuesandstreams_ARR_OVER = sdqueuesandstreams_overArr();

  // ---- small helpers ---------------------------------------------------
  function sdqueuesandstreams_pct(a, b) { return b > 0 ? (a / b) * 100 : 0; }
  function sdqueuesandstreams_secs(ms) {
    return (ms / 1000).toFixed(ms < 10000 ? 2 : 1) + " s";
  }
  function sdqueuesandstreams_plural(n, one, many) {
    return n + " " + (n === 1 ? one : many);
  }
  var sdqueuesandstreams_SEED = 20250927;
  function sdqueuesandstreams_rand() {
    sdqueuesandstreams_SEED = (sdqueuesandstreams_SEED * 16807) % 2147483647;
    return sdqueuesandstreams_SEED / 2147483647;
  }
  // page 6: delay = base x 2^n +- random.  n is 1-based here.
  function sdqueuesandstreams_backoff(n) {
    var ms = sdqueuesandstreams_BACKOFF_MS * Math.pow(2, n - 1);
    if (ms > sdqueuesandstreams_BACKOFF_MAX) ms = sdqueuesandstreams_BACKOFF_MAX;
    return ms * (1 + sdqueuesandstreams_JITTER * (sdqueuesandstreams_rand() * 2 - 1));
  }
  // page 4: partitions are handed out in contiguous blocks; more consumers
  // than partitions and the extras own nothing.
  function sdqueuesandstreams_assign(live) {
    var own = [], p, k = live.length;
    for (p = 0; p < sdqueuesandstreams_PARTS; p++) {
      own.push(k ? live[Math.floor(p * k / sdqueuesandstreams_PARTS)] : -1);
    }
    return own;
  }

  // ======================================================================
  // The run. One tick = one handler invocation per live consumer.
  // cfg = { consumers, dlq, poison, arrivals, crashFrame, scaleFrame, scaleTo }
  // ======================================================================
  function sdqueuesandstreams_run(cfg) {
    sdqueuesandstreams_SEED = 20250927;                 // reproducible jitter
    var P = sdqueuesandstreams_PARTS;
    var TICKS = sdqueuesandstreams_FRAMES * sdqueuesandstreams_FRAME_TICKS;
    var q = [], blockUntil = [], attempts = [], grid = [];
    var p, c, f, t, i;

    for (p = 0; p < P; p++) {
      q.push([]); blockUntil.push(-1); attempts.push(0);
      grid.push([]);
      for (f = 0; f < sdqueuesandstreams_FRAMES; f++) {
        grid[p].push({ lag: 0, blocked: 0, acked: 0 });
      }
    }

    var nc = cfg.consumers;
    var aliveFlag = [], cursor = [], busyC = [], idleC = [], lastC = [];
    for (c = 0; c < nc; c++) {
      aliveFlag.push(true); cursor.push(0); busyC.push(0); idleC.push(0); lastC.push(null);
    }
    function liveList() {
      var a = [], k;
      for (k = 0; k < aliveFlag.length; k++) if (aliveFlag[k]) a.push(k);
      return a;
    }
    var owners = sdqueuesandstreams_assign(liveList());

    var seq = 0, arrived = 0, acked = 0, retryTicks = 0, dlq = 0;
    var redelivered = 0, dupSuppressed = 0, poisonAttempts = 0, blockedTicks = 0;
    var busy = 0, slotTicks = 0, frames = [], peakLag = 0, crashed = -1;
    var ackedFrame = 0;

    for (t = 0; t < TICKS; t++) {
      f = Math.floor(t / sdqueuesandstreams_FRAME_TICKS);
      var inFrame = t % sdqueuesandstreams_FRAME_TICKS;
      if (inFrame === 0) ackedFrame = 0;

      // ---- scale out: the extra consumer the page says sits idle --------
      if (cfg.scaleFrame === f && inFrame === 0 && aliveFlag.length < cfg.scaleTo) {
        while (aliveFlag.length < cfg.scaleTo) {
          aliveFlag.push(true); cursor.push(0); busyC.push(0); idleC.push(0); lastC.push(null);
        }
        owners = sdqueuesandstreams_assign(liveList());
      }

      // ---- a consumer dies: page 4, "what happens when a consumer dies" -
      if (cfg.crashFrame === f && inFrame === 0 && crashed < 0) {
        var victim = -1, lv = liveList();
        for (i = 0; i < lv.length; i++) if (lastC[lv[i]]) victim = lv[i];
        if (victim < 0 && lv.length) victim = lv[lv.length - 1];
        if (victim >= 0) {
          crashed = victim;
          aliveFlag[victim] = false;
          // processed but never acked -> it comes back. That is the duplicate.
          if (lastC[victim]) {
            q[lastC[victim]].unshift({ poison: 0, dup: 1, at: t });
            redelivered++;
          }
          owners = sdqueuesandstreams_assign(liveList());
        }
      }

      // ---- arrivals, spread evenly across the frame's ticks -------------
      var A = cfg.arrivals[f];
      var due = Math.floor(A * (inFrame + 1) / sdqueuesandstreams_FRAME_TICKS) -
                Math.floor(A * inFrame / sdqueuesandstreams_FRAME_TICKS);
      for (i = 0; i < due; i++) {
        q[seq % P].push({ poison: 0, dup: 0, at: t });
        seq++; arrived++;
      }
      if (cfg.poison && f === sdqueuesandstreams_POISON_FRAME && inFrame === 0) {
        q[sdqueuesandstreams_POISON_PART].push({ poison: 1, dup: 0, at: t });
        arrived++;
      }

      // ---- one handler invocation per live consumer ---------------------
      for (c = 0; c < aliveFlag.length; c++) {
        if (!aliveFlag[c]) continue;
        slotTicks++;
        var pick = -1;
        for (i = 0; i < P; i++) {
          var cand = (cursor[c] + i) % P;
          if (owners[cand] !== c) continue;
          if (!q[cand].length) continue;
          if (blockUntil[cand] > t) continue;
          pick = cand; break;
        }
        if (pick < 0) { idleC[c]++; lastC[c] = null; continue; }
        cursor[c] = (pick + 1) % P;
        var m = q[pick][0];

        if (m.poison) {
          attempts[pick]++; poisonAttempts++; retryTicks++; busy++; busyC[c]++;
          lastC[c] = null;
          if (cfg.dlq && attempts[pick] >= sdqueuesandstreams_ATTEMPTS) {
            q[pick].shift(); dlq++; attempts[pick] = 0; blockUntil[pick] = -1;
          } else {
            blockUntil[pick] = t + Math.ceil(
              sdqueuesandstreams_backoff(attempts[pick]) / sdqueuesandstreams_TICK_MS);
          }
        } else if (m.dup) {
          // the unique constraint on (event_id, follower_id) rejects it — the
          // round trip is still a handler invocation, so it still costs a tick
          q[pick].shift(); dupSuppressed++; busy++; busyC[c]++; lastC[c] = null;
        } else {
          q[pick].shift(); acked++; ackedFrame++; busy++; busyC[c]++; lastC[c] = pick;
        }
      }

      for (p = 0; p < P; p++) if (blockUntil[p] > t) blockedTicks++;

      // ---- frame snapshot ----------------------------------------------
      if (inFrame === sdqueuesandstreams_FRAME_TICKS - 1) {
        var lagBy = [], blocked = [], lag = 0, oldest = 0;
        for (p = 0; p < P; p++) {
          lagBy.push(q[p].length);
          lag += q[p].length;
          blocked.push(blockUntil[p] > t ? 1 : 0);
          if (q[p].length) {
            var age = (t - q[p][0].at) * sdqueuesandstreams_TICK_MS;
            if (age > oldest) oldest = age;
          }
          grid[p][f] = { lag: q[p].length, blocked: blockUntil[p] > t ? 1 : 0, acked: acked };
        }
        if (lag > peakLag) peakLag = lag;
        var rows = [], live = liveList();
        for (c = 0; c < aliveFlag.length; c++) {
          var mine = [];
          for (p = 0; p < P; p++) if (owners[p] === c) mine.push(p);
          rows.push({
            id: c, alive: aliveFlag[c], parts: mine,
            busy: busyC[c], idle: idleC[c],
            util: sdqueuesandstreams_pct(busyC[c], busyC[c] + idleC[c])
          });
        }
        frames.push({
          f: f, t: (f + 1) * sdqueuesandstreams_FRAME_MS,
          arrivals: cfg.arrivals[f], arrived: arrived, acked: acked, made: ackedFrame,
          lag: lag, lagBy: lagBy, blocked: blocked, oldest: oldest,
          dlq: dlq, attempts: poisonAttempts, redelivered: redelivered,
          dupSuppressed: dupSuppressed, retryTicks: retryTicks,
          consumers: live.length, crashed: crashed, rows: rows, grid: grid,
          idleConsumers: (function () {
            var k, z = 0;
            for (k = 0; k < rows.length; k++) if (rows[k].alive && rows[k].parts.length === 0) z++;
            return z;
          })(),
          util: sdqueuesandstreams_pct(busy, slotTicks),
          cap: sdqueuesandstreams_cap(live.length),
          peakLag: peakLag,
          dlqOn: !!cfg.dlq
        });
      }
    }
    return { frames: frames, grid: grid, acked: acked, arrived: arrived, dlq: dlq, peakLag: peakLag };
  }

  /** The idle frame — same shape as a snapshot, so draw() never guesses. */
  function sdqueuesandstreams_idle(cfg, caption) {
    var p, c, grid = [], lagBy = [], blocked = [], rows = [];
    for (p = 0; p < sdqueuesandstreams_PARTS; p++) {
      lagBy.push(0); blocked.push(0); grid.push([]);
      for (c = 0; c < sdqueuesandstreams_FRAMES; c++) grid[p].push({ lag: 0, blocked: 0, acked: 0 });
    }
    for (c = 0; c < cfg.consumers; c++) {
      var mine = [];
      for (p = 0; p < sdqueuesandstreams_PARTS; p++) {
        if (sdqueuesandstreams_assign((function () {
          var a = [], k;
          for (k = 0; k < cfg.consumers; k++) a.push(k);
          return a;
        })())[p] === c) mine.push(p);
      }
      rows.push({ id: c, alive: true, parts: mine, busy: 0, idle: 0, util: 0 });
    }
    return {
      caption: caption, flag: "idle",
      f: -1, t: 0, arrivals: 0, arrived: 0, acked: 0, made: 0,
      lag: 0, lagBy: lagBy, blocked: blocked, oldest: 0,
      dlq: 0, attempts: 0, redelivered: 0, dupSuppressed: 0, retryTicks: 0,
      consumers: cfg.consumers, crashed: -1, rows: rows, grid: grid,
      idleConsumers: 0, util: 0, cap: sdqueuesandstreams_cap(cfg.consumers),
      peakLag: 0, dlqOn: !!cfg.dlq
    };
  }

  // ----------------------------------------------------------------------
  // Scenario 1 — two consumers for four partitions, and no dead-letter queue.
  // The default you get by not deciding. Both of the page's bad lag shapes
  // appear in one run: a steady rise from underprovisioning, and a partition
  // that keeps rising after the burst is over because one message is stuck.
  // ----------------------------------------------------------------------
  function sdqueuesandstreams_naive() {
    var cfg = {
      consumers: 2, dlq: false, poison: true,
      arrivals: sdqueuesandstreams_ARR_BURST, crashFrame: -1, scaleFrame: -1, scaleTo: 0
    };
    var r = sdqueuesandstreams_run(cfg);
    var steps = [sdqueuesandstreams_idle(cfg,
      "A topic with <b>" + sdqueuesandstreams_PARTS + " partitions</b> and a consumer group " +
      "of <b>2</b> — the page's own diagram. Each handler takes " +
      sdqueuesandstreams_HANDLER_MS + " ms, so the group retires <b>" +
      sdqueuesandstreams_CAP2 + " messages/s</b>. Baseline traffic is " +
      sdqueuesandstreams_BASE + "/s and a <b>" + sdqueuesandstreams_SPIKE +
      "×</b> spike is about to arrive. One message in the spike is unprocessable, " +
      "and there is no dead-letter queue. Press Play.")];

    var i, firstBlock = -1;
    for (i = 0; i < r.frames.length; i++) {
      if (firstBlock < 0 && r.frames[i].blocked[sdqueuesandstreams_POISON_PART]) firstBlock = i;
    }

    for (i = 0; i < r.frames.length; i++) {
      var fr = r.frames[i], prev = i ? r.frames[i - 1] : null, cap;
      var rise = fr.lag - (prev ? prev.lag : 0);
      var pl = fr.lagBy[sdqueuesandstreams_POISON_PART];

      if (i === 0) {
        cap = "<b>Steady state.</b> " + fr.arrivals + " events arrived, " + fr.made +
          " were acked, lag <b>" + fr.lag + "</b>. Two consumers own two partitions each, " +
          "so each partition is drained at <b>" +
          (sdqueuesandstreams_RATE / 2).toFixed(1) + " msg/s</b> — the consumer alternates " +
          "between the two it owns. At " + sdqueuesandstreams_BASE +
          "/s offered against " + sdqueuesandstreams_CAP2 + "/s of capacity nothing is wrong yet, " +
          "which is exactly why nobody notices the partition count.";
      } else if (i === 1) {
        cap = "<b>The " + sdqueuesandstreams_SPIKE + "× spike lands.</b> " + fr.arrivals +
          " events this second against <b>" + sdqueuesandstreams_CAP2 +
          "/s</b> of capacity — demand is <b>" +
          (fr.arrivals / sdqueuesandstreams_CAP2).toFixed(1) + "×</b> what this group can " +
          "retire, so lag jumps by " + rise + " in one second. This is the queue doing its " +
          "job: the spike became a longer queue and not a crash. The poison message also " +
          "arrived, on P" + sdqueuesandstreams_POISON_PART + ", and has already failed " +
          fr.attempts + (fr.attempts === 1 ? " time" : " times") + ".";
      } else if (i === firstBlock + 1 && firstBlock >= 0) {
        cap = "<b>P" + sdqueuesandstreams_POISON_PART + " is head-of-line blocked.</b> The " +
          "unprocessable message has failed <b>" + fr.attempts + "</b> times and every retry " +
          "backs off further — " + sdqueuesandstreams_BACKOFF_MS + " ms × 2ⁿ with jitter, " +
          "capped at " + (sdqueuesandstreams_BACKOFF_MAX / 1000) + " s. Nothing behind it " +
          "can be delivered, because ordering inside a partition is the guarantee. P" +
          sdqueuesandstreams_POISON_PART + " is now <b>" + pl + "</b> deep while the other " +
          "three carry " + (fr.lag - pl) + " between them.";
      } else if (i === r.frames.length - 1) {
        var others = fr.lag - pl;
        var plRise = pl - (prev ? prev.lagBy[sdqueuesandstreams_POISON_PART] : 0);
        cap = "<b>Lag " + fr.lag + ", four seconds after the burst ended — and the two halves " +
          "of that number are moving in opposite directions.</b> " + fr.acked + " of " +
          fr.arrived + " events were delivered. Both of the page's bad lag shapes are on this " +
          "chart at once: P0, P1 and P3 hold <b>" + others +
          "</b> between them and are draining " + Math.abs(others - (prev ? prev.lag - prev.lagBy[sdqueuesandstreams_POISON_PART] : 0)) +
          "/s — that is <i>underprovisioning</i>, and adding consumers fixes it. P" +
          sdqueuesandstreams_POISON_PART + " holds <b>" + pl + "</b>, rising <b>+" + plRise +
          "/s</b> <i>while its own consumer has capacity to spare</i> — that is a " +
          "poison message, and no amount of scaling fixes it. <b>" + fr.attempts +
          "</b> retries have been spent on one event, the oldest unread event on that " +
          "partition is <b>" + sdqueuesandstreams_secs(fr.oldest) + "</b> old, and without a " +
          "dead-letter queue it stays that way forever.";
      } else if (fr.blocked[sdqueuesandstreams_POISON_PART]) {
        cap = "<b>Second " + (i + 1) + ".</b> " + fr.made + " acked, group utilisation <b>" +
          fr.util.toFixed(0) + "%</b>, total lag <b>" + fr.lag + "</b> (" +
          (rise >= 0 ? "+" : "") + rise + " this second). P" + sdqueuesandstreams_POISON_PART +
          " is still blocked on attempt <b>" + fr.attempts + "</b> — past the <b>" +
          sdqueuesandstreams_ATTEMPTS + "</b> where a dead-letter queue would have moved the " +
          "message aside and let the other <b>" + pl + "</b> events behind it through.";
      } else {
        cap = "<b>Second " + (i + 1) + ".</b> " + fr.made + " acked against " + fr.arrivals +
          " arrived; lag <b>" + fr.lag + "</b>, " + (rise >= 0 ? "+" : "") + rise +
          " this second. Both consumers are at <b>" + fr.util.toFixed(0) +
          "%</b> — they are not the problem in any instant, they are just half as many as " +
          "there are partitions.";
      }
      fr.caption = cap;
      fr.flag = fr.lag > 200 ? "bad" : fr.lag > 60 ? "warn" : "ok";
      steps.push(fr);
    }
    return { id: "naive", label: "2 consumers, no DLQ", steps: steps };
  }

  // ----------------------------------------------------------------------
  // Scenario 2 — one consumer per partition, a DLQ after five attempts, and a
  // consumer crash to make the at-least-once duplicate real.
  // ----------------------------------------------------------------------
  function sdqueuesandstreams_fixed() {
    var cfg = {
      consumers: sdqueuesandstreams_PARTS, dlq: true, poison: true,
      arrivals: sdqueuesandstreams_ARR_BURST, crashFrame: 5, scaleFrame: -1, scaleTo: 0
    };
    var r = sdqueuesandstreams_run(cfg);
    var naive = sdqueuesandstreams_run({
      consumers: 2, dlq: false, poison: true,
      arrivals: sdqueuesandstreams_ARR_BURST, crashFrame: -1, scaleFrame: -1, scaleTo: 0
    });
    var steps = [sdqueuesandstreams_idle(cfg,
      "Same topic, same burst, same poison message. Three changes: the group is scaled to <b>" +
      sdqueuesandstreams_PARTS + "</b> so every partition has its own consumer — <b>" +
      sdqueuesandstreams_CAP4 + " msg/s</b> of capacity — the handler is idempotent on <code>" +
      "(event_id, follower_id)</code>, and a failing message goes to a dead-letter queue after <b>" +
      sdqueuesandstreams_ATTEMPTS + "</b> attempts. A consumer will also be killed mid-message. " +
      "Press Play.")];

    var i, dlqFrame = -1, crashFrame = -1;
    for (i = 0; i < r.frames.length; i++) {
      if (dlqFrame < 0 && r.frames[i].dlq > 0) dlqFrame = i;
      if (crashFrame < 0 && r.frames[i].crashed >= 0) crashFrame = i;
    }

    for (i = 0; i < r.frames.length; i++) {
      var fr = r.frames[i], prev = i ? r.frames[i - 1] : null, cap;
      var rise = fr.lag - (prev ? prev.lag : 0);
      var nf = naive.frames[i];

      if (i === 0) {
        cap = "<b>Steady state, four consumers.</b> " + fr.made + " acked of " + fr.arrivals +
          " arrived, lag <b>" + fr.lag + "</b>. Each consumer owns exactly one partition, so " +
          "each partition drains at the full <b>" + sdqueuesandstreams_RATE +
          " msg/s</b> instead of half of it. Partitions are the unit of parallelism and there " +
          "are " + sdqueuesandstreams_PARTS + " of them — this is the ceiling, not a setting.";
      } else if (i === 1) {
        cap = "<b>The same " + sdqueuesandstreams_SPIKE + "× spike.</b> " + fr.arrivals +
          " arrived, " + fr.made + " acked, lag <b>" + fr.lag + "</b> against <b>" + nf.lag +
          "</b> in the two-consumer run. Demand is <b>" +
          (fr.arrivals / sdqueuesandstreams_CAP4).toFixed(1) + "×</b> capacity, so lag still " +
          "grows — doubling the consumers halved the slope, it did not repeal arithmetic. The " +
          "poison message is failing on P" + sdqueuesandstreams_POISON_PART + ": attempt <b>" +
          fr.attempts + "</b> of " + sdqueuesandstreams_ATTEMPTS + ".";
      } else if (i === dlqFrame) {
        cap = "<b>Five attempts spent — the message moves aside.</b> Backoff ran " +
          sdqueuesandstreams_BACKOFF_MS + " ms, " + (sdqueuesandstreams_BACKOFF_MS * 2) +
          " ms, " + (sdqueuesandstreams_BACKOFF_MS * 4) + " ms, " +
          (sdqueuesandstreams_BACKOFF_MS * 8) + " ms with ±" +
          (sdqueuesandstreams_JITTER * 100) + "% jitter, and on attempt <b>" +
          sdqueuesandstreams_ATTEMPTS + "</b> the event went to the dead-letter queue. P" +
          sdqueuesandstreams_POISON_PART + " unblocked with <b>" +
          fr.lagBy[sdqueuesandstreams_POISON_PART] + "</b> events behind it, and they are " +
          "moving again. <b>DLQ depth " + fr.dlq + "</b> — alert on it, because a dead-letter " +
          "queue nobody reads is a silent data-loss channel that looks healthy.";
      } else if (i === crashFrame) {
        cap = "<b>Consumer " + fr.crashed + " dies mid-message.</b> It had processed an event " +
          "and not yet acked it, so the group coordinator rebalances its partition to a " +
          "survivor and the new owner resumes from the <i>last committed offset</i> — which " +
          "is before that event. <b>" + fr.redelivered + " redelivery</b>, which is a " +
          "duplicate, which is at-least-once working exactly as specified. The group is down " +
          "to <b>" + fr.consumers + "</b> consumers and <b>" + fr.cap +
          " msg/s</b>, so lag ticks " + (rise >= 0 ? "up " : "down ") + Math.abs(rise) + ".";
      } else if (i === r.frames.length - 1) {
        cap = "<b>Lag down to " + fr.lag + " from a peak of " + fr.peakLag +
          " — spiked, then drained.</b> That shape is the " +
          "healthy one: <b>" + fr.acked + "</b> of " + fr.arrived + " events delivered, peak " +
          "lag <b>" + fr.peakLag + "</b>, oldest unread event <b>" +
          sdqueuesandstreams_secs(fr.oldest) + "</b>. The two-consumer run ended the same " +
          "eight seconds at lag <b>" + nf.lag + "</b>, one partition of it still climbing. " +
          "One event is in the " +
          "dead-letter queue instead of blocking its partition, and the one duplicate the " +
          "crash produced hit the unique constraint on <code>(event_id, follower_id)</code> — <b>" +
          fr.dupSuppressed + " suppressed, 0 double effects</b>. That is exactly-once " +
          "<i>processing</i> built out of at-least-once delivery, which is the only version " +
          "of it that exists.";
      } else if (i > crashFrame && crashFrame >= 0) {
        cap = "<b>Second " + (i + 1) + ", three consumers.</b> " + fr.made + " acked, lag <b>" +
          fr.lag + "</b> (" + (rise >= 0 ? "+" : "") + rise + "). The survivor that inherited " +
          "the dead consumer's partition now alternates between two, so that partition drains " +
          "at <b>" + (sdqueuesandstreams_RATE / 2).toFixed(1) +
          " msg/s</b>. Capacity is <b>" + fr.cap + "/s</b> until the replacement joins and " +
          "the group rebalances again.";
      } else {
        cap = "<b>Second " + (i + 1) + ".</b> " + fr.made + " acked against " + fr.arrivals +
          " arrived; lag <b>" + fr.lag + "</b> versus <b>" + nf.lag +
          "</b> in the two-consumer run. Utilisation <b>" + fr.util.toFixed(0) + "%</b>" +
          (fr.blocked[sdqueuesandstreams_POISON_PART]
            ? ", and P" + sdqueuesandstreams_POISON_PART + " is backing off on attempt " +
              fr.attempts + " of " + sdqueuesandstreams_ATTEMPTS + "."
            : ", every partition flowing.");
      }
      fr.caption = cap;
      fr.flag = i === crashFrame ? "warn" : fr.lag > 200 ? "warn" : fr.lag > 60 ? "warn" : "ok";
      steps.push(fr);
    }
    return { id: "fixed", label: "4 consumers + DLQ", steps: steps };
  }

  // ----------------------------------------------------------------------
  // Scenario 3 — the engineered stack, with arrival rate held above service
  // rate. Nothing is broken and nothing can be fixed by scaling: the page's
  // "an unbounded queue is not a solution, it is a deferred outage".
  // ----------------------------------------------------------------------
  function sdqueuesandstreams_overload() {
    var cfg = {
      consumers: sdqueuesandstreams_PARTS, dlq: true, poison: false,
      arrivals: sdqueuesandstreams_ARR_OVER, crashFrame: -1,
      scaleFrame: 4, scaleTo: sdqueuesandstreams_PARTS + 1
    };
    var r = sdqueuesandstreams_run(cfg);
    var over = sdqueuesandstreams_ARR_OVER[0] - sdqueuesandstreams_CAP4;
    var steps = [sdqueuesandstreams_idle(cfg,
      "The engineered stack from the previous tab — " + sdqueuesandstreams_PARTS +
      " consumers, a dead-letter queue, idempotent handlers — with one thing changed: arrivals " +
      "hold at <b>" + sdqueuesandstreams_ARR_OVER[0] + "/s</b>, which is <b>1.5×</b> the <b>" +
      sdqueuesandstreams_CAP4 + "/s</b> this group can retire. No burst, no poison, no crash. " +
      "A fifth consumer will be added halfway. Press Play.")];

    var i;
    for (i = 0; i < r.frames.length; i++) {
      var fr = r.frames[i], prev = i ? r.frames[i - 1] : null, cap;
      var rise = fr.lag - (prev ? prev.lag : 0);
      var wait = fr.cap > 0 ? (fr.lag / fr.cap) * 1000 : 0;

      if (i === 0) {
        cap = "<b>Second 1 — and nothing looks wrong.</b> " + fr.made + " events acked, " +
          "every consumer at <b>" + fr.util.toFixed(0) + "%</b>, lag <b>" + fr.lag +
          "</b>. A dashboard showing throughput and CPU shows a healthy system. The only " +
          "number that shows the problem is the one the page tells you to alert on.";
      } else if (i === cfg.scaleFrame) {
        cap = "<b>A fifth consumer joins — and owns nothing.</b> The group rebalances, " +
          sdqueuesandstreams_PARTS + " partitions go to " + sdqueuesandstreams_PARTS +
          " consumers, and consumer " + sdqueuesandstreams_PARTS + " sits <b>idle at 0% " +
          "forever</b>. Capacity is still <b>" + fr.cap + "/s</b>, because partitions are the " +
          "unit of parallelism and you cannot have more useful consumers than partitions. Lag " +
          "went " + (rise >= 0 ? "+" : "") + rise + " anyway, to <b>" + fr.lag + "</b>. " +
          "Repartitioning a live topic changes key placement, which is why the partition " +
          "count was a capacity decision made months ago.";
      } else if (i > cfg.scaleFrame && i < r.frames.length - 1) {
        cap = "<b>Second " + (i + 1) + ", " + fr.consumers + " consumers, " +
          fr.idleConsumers + " of them idle.</b> Lag <b>" + fr.lag + "</b>, " +
          (rise >= 0 ? "+" : "") + rise + " again — the same slope as before the scale-out, " +
          "because the slope is <b>" + sdqueuesandstreams_ARR_OVER[i] + " − " + fr.cap +
          " = " + over + "/s</b> and the new consumer changed neither term. End-to-end delay " +
          "for an event arriving now: <b>" + sdqueuesandstreams_secs(wait) + "</b>.";
      } else if (i === r.frames.length - 1) {
        var burn = over;
        var toTimeout = burn > 0
          ? ((sdqueuesandstreams_TIMEOUT_S * fr.cap) - fr.lag) / burn : 0;
        cap = "<b>Lag " + fr.lag + ", rising " + over + "/s, for the whole run.</b> " +
          fr.acked + " of " + fr.arrived + " events delivered; the other <b>" + fr.lag +
          "</b> are waiting. Every consumer that owns a partition is at <b>" +
          fr.util.toFixed(0) + "%</b> — there is no slack to find and nothing to fix. An event " +
          "arriving now waits <b>" + sdqueuesandstreams_secs(wait) + "</b>; at " + over +
          "/s of accumulation it crosses the " + sdqueuesandstreams_TIMEOUT_S +
          " s upstream timeout in <b>" + Math.round(toTimeout) + " more seconds</b>, and " +
          "after that the queue is only deciding <i>when</i> you fail, not whether. The " +
          "answers are on the producer side: shed load at the edge, rate-limit the producer, " +
          "or sample. Adding queue depth is a deferred outage.";
      } else {
        cap = "<b>Second " + (i + 1) + ".</b> " + fr.arrivals + " arrived, " + fr.made +
          " acked, lag <b>" + fr.lag + "</b> — up " + rise + ", the same " + over +
          " per second as the last frame and the one before it. That straight line is the " +
          "page's first lag shape: <i>rising steadily</i>, which means underprovisioned " +
          "consumers. The oldest unread event is <b>" + sdqueuesandstreams_secs(fr.oldest) +
          "</b> old and getting older by " +
          (fr.cap > 0 ? (over / fr.cap).toFixed(1) : "0") + " s every second.";
      }
      fr.caption = cap;
      fr.flag = i >= cfg.scaleFrame ? "bad" : "warn";
      steps.push(fr);
    }
    return { id: "over", label: "Arrival > service rate", steps: steps };
  }

  // ======================================================================
  S["sdqueuesandstreams"] = {
    title: "Watch consumer lag, three ways",
    note: "A topic with <b>" + sdqueuesandstreams_PARTS + " partitions</b> keyed by author id, " +
      "and a handler that costs <b>" + sdqueuesandstreams_HANDLER_MS +
      " ms</b> — so one consumer retires " + sdqueuesandstreams_RATE + " messages/s and the " +
      "group's capacity is <b>consumers × " + sdqueuesandstreams_RATE + "/s</b>, capped at " +
      sdqueuesandstreams_PARTS + " useful consumers. Baseline traffic " +
      sdqueuesandstreams_BASE + "/s, spike <b>" + sdqueuesandstreams_SPIKE + "×</b> that for " +
      "three seconds. Retries back off <code>" + sdqueuesandstreams_BACKOFF_MS +
      " ms × 2ⁿ</code> with ±" + (sdqueuesandstreams_JITTER * 100) + "% jitter and a " +
      (sdqueuesandstreams_BACKOFF_MAX / 1000) + " s cap, and a dead-letter queue takes the " +
      "message after <b>" + sdqueuesandstreams_ATTEMPTS + "</b> attempts. One frame is one " +
      "second, simulated as " + sdqueuesandstreams_FRAME_TICKS + " handler slots per consumer. " +
      "Every number below is counted off that run.",
    interval: 1400,

    scenarios: [sdqueuesandstreams_naive(), sdqueuesandstreams_fixed(), sdqueuesandstreams_overload()],

    draw: function (step, d, ctx) {
      var p, c, i;

      // ---- producer ----------------------------------------------------
      var prod = d.stack([
        d.big(step.f < 0 ? "—" : sdqueuesandstreams_secs(step.t), "elapsed"),
        d.dots({
          n: Math.round(step.arrivals / 10),
          label: step.arrivals + " events/s in",
          flag: step.arrivals > step.cap ? "warn" : undefined
        })
      ]);

      // ---- the log -----------------------------------------------------
      var pRows = [];
      for (p = 0; p < sdqueuesandstreams_PARTS; p++) {
        pRows.push(d.row(
          "P" + p + (step.blocked[p] ? " · blocked" : ""),
          step.lagBy[p] + " behind",
          step.blocked[p] ? "bad" : step.lagBy[p] > 40 ? "warn" : step.lagBy[p] ? "warn" : "ok"
        ));
      }
      var logNode = d.node({
        title: "log · " + sdqueuesandstreams_PARTS + " partitions",
        status: step.f < 0 ? "IDLE" : step.lag > 200 ? "LAG HIGH" : step.lag ? "LAG" : "CAUGHT UP",
        statusFlag: step.f < 0 ? "idle" : step.lag > 200 ? "bad" : step.lag ? "warn" : "ok",
        badge: "key: author_id",
        meta: "append-only, retained",
        flag: step.lag > 200 ? "bad" : step.lag > 60 ? "warn" : "ok",
        gauges: [{
          label: "consumer lag",
          pct: sdqueuesandstreams_pct(step.lag, 400),
          value: step.lag + " msgs",
          flag: step.lag > 200 ? "bad" : step.lag > 60 ? "warn" : step.lag ? "warn" : "ok"
        }],
        body: pRows.join("")
      });

      // ---- the consumer group -------------------------------------------
      var cRows = [];
      for (i = 0; i < step.rows.length; i++) {
        var R = step.rows[i];
        var names = [];
        for (c = 0; c < R.parts.length; c++) names.push("P" + R.parts[c]);
        cRows.push(d.row(
          "c" + R.id + (R.alive ? "" : " · dead"),
          !R.alive ? "rebalanced away"
            : R.parts.length === 0 ? "no partition · idle"
            : names.join(" ") + " · " + R.util.toFixed(0) + "%",
          !R.alive ? "bad" : R.parts.length === 0 ? "bad" : R.util >= 85 ? "ok"
            : step.f < 0 ? "idle" : "warn"
        ));
      }
      var grpNode = d.node({
        title: "consumer group",
        status: step.f < 0 ? "IDLE"
          : step.crashed >= 0 ? "REBALANCED"
          : step.idleConsumers ? "OVER-SCALED" : "CONSUMING",
        statusFlag: step.f < 0 ? "idle" : step.crashed >= 0 ? "warn"
          : step.idleConsumers ? "warn" : "ok",
        badge: step.cap + " msg/s",
        meta: sdqueuesandstreams_plural(step.consumers, "consumer", "consumers") + " · " +
          sdqueuesandstreams_PARTS + " partitions",
        flag: step.idleConsumers ? "warn" : step.f < 0 ? "idle" : "ok",
        gauges: [{
          label: "handler slots used",
          pct: step.util,
          value: step.util.toFixed(0) + "%",
          flag: step.util >= 90 ? "ok" : step.f < 0 ? "idle" : "warn"
        }],
        body: cRows.join("")
      });

      // ---- the numbers ---------------------------------------------------
      var stats = d.stack([
        d.stat({
          label: "acked",
          value: String(step.acked),
          sub: "of " + step.arrived + " published",
          flag: step.acked ? "ok" : "idle"
        }),
        d.stat({
          label: "oldest unread",
          value: step.oldest ? sdqueuesandstreams_secs(step.oldest) : "—",
          sub: "lag ÷ drain rate",
          flag: step.oldest > 3000 ? "bad" : step.oldest > 1000 ? "warn"
            : step.oldest ? "ok" : "idle"
        }),
        d.stat({
          label: step.dlqOn ? "dead-letter queue" : "retries burned",
          value: String(step.dlqOn ? step.dlq : step.attempts),
          sub: step.dlqOn
            ? (step.dupSuppressed + " duplicate" + (step.dupSuppressed === 1 ? "" : "s") +
               " suppressed")
            : "on one message",
          flag: step.dlqOn
            ? (step.dlq ? "warn" : "idle")
            : (step.attempts > sdqueuesandstreams_ATTEMPTS ? "bad" : step.attempts ? "warn" : "idle")
        })
      ]);

      // ---- lag per partition, frame by frame -----------------------------
      var lanes = [];
      for (p = 0; p < sdqueuesandstreams_PARTS; p++) {
        var cells = [];
        for (i = 0; i < sdqueuesandstreams_FRAMES; i++) {
          var reached = step.f >= i;
          var g = step.grid[p][i];
          cells.push({
            label: !reached ? "" : g.blocked ? "×" : String(g.lag),
            flag: !reached ? "idle"
              : g.blocked ? "bad"
              : g.lag > 60 ? "bad" : g.lag > 15 ? "warn" : "ok",
            title: !reached
              ? "P" + p + " · second " + (i + 1) + " · not reached"
              : "P" + p + " · second " + (i + 1) + " · " + g.lag + " unread" +
                (g.blocked ? " · blocked on a retry" : "")
          });
        }
        lanes.push(d.lane({ label: "P" + p, cells: cells }));
      }

      var legend = step.dlqOn
        ? "One cell per partition per second, showing how many events are unread. <b>×</b> is a " +
          "partition blocked behind a failing message — nothing after it can be delivered, " +
          "because ordering within a partition is the guarantee you bought. Green is under " +
          "15 unread, amber under 60."
        : "One cell per partition per second, showing how many events are unread. <b>×</b> is a " +
          "partition blocked behind a failing message. Watch P" +
          sdqueuesandstreams_POISON_PART + " after the burst is over: three partitions drain " +
          "and one does not. <b>Lag that keeps rising while its consumer has spare capacity " +
          "is a poison message, not a scaling problem</b> — and that is the distinction the " +
          "on-call page cannot make for you.";

      return d.stack([
        d.cols([prod, logNode, grpNode, stats]),
        d.stack(lanes),
        d.note(legend)
      ]);
    }
  };

  // ====================================================================
  // ======================================================================
  // SIM · sdsearch  (search.md)
  //
  // The page hands over its own time axis: three documents, an analysis
  // pipeline with four named stages, an inverted index, and the query
  // "quick brown" intersecting two postings lists. Three tabs push a query
  // at the SAME three documents through three builds -- a LIKE scan, a
  // correctly analysed index, and an index whose query-side pipeline was
  // never wired up.
  //
  // FROM THE PAGE, verbatim:
  //   d1 "the quick brown fox"  d2 "the lazy brown dog"
  //   d3 "quick brown foxes jump"
  //   brown -> [d1,d2,d3]   quick -> [d1,d3]   fox -> [d1,d3]
  //   lazy  -> [d2]         dog   -> [d2]
  //   query "quick brown" = INTERSECT postings([quick],[brown]) = [d1,d3]
  //   positions  fox -> d1:[3], d3:[3]   <- 1-based AFTER stopword removal
  //              is the only convention that reproduces BOTH of the page's
  //              numbers, so the index is built that way and prints them
  //              back rather than hard-coding them
  //   pipeline   tokenise -> lowercase -> remove stopwords -> stem
  //   SQL        SELECT * FROM posts WHERE body LIKE '%...%'
  //   "foxes" stemmed to "fox"
  //   BM25's three factors, and "a document containing a term 100 times is
  //   not 100x more relevant than one containing it once"
  //   fuzzy matching "usually limited to distance 1-2"
  //   Elasticsearch refresh interval, default 1s
  //
  // CONFIG declared here, because the page publishes no constants:
  //   stopwords   the, a, an, and, of, to, in
  //   stemmer     -ing/-ed when len>4, -es/-s when len>3; "foxes" -> "fox"
  //   BM25        k1 = 1.2, b = 0.75 (the standard defaults)
  //               idf(t)  = ln(1 + (N - df + 0.5) / (df + 0.5))
  //               tf part = tf(k1+1) / (tf + k1(1 - b + b*len/avgdl))
  //   LIKE cost   candidate offsets tried on a row = len(body)-len(pat)+1,
  //               which is what a naive substring match walks
  //   scale       2,000,000 posts, 220 chars of body each, and a query term
  //               present in 0.05% of them -- used only in the scale ledger
  //
  // Every posting, position, document frequency, idf, BM25 score, rank,
  // scanned offset and edit distance on screen is computed from those three
  // documents at load time. Nothing below is transcribed.
  // ======================================================================
  var sdsearch_DOCS = [
    { id: "d1", body: "the quick brown fox" },
    { id: "d2", body: "the lazy brown dog" },
    { id: "d3", body: "quick brown foxes jump" }
  ];
  var sdsearch_STOP = ["the", "a", "an", "and", "of", "to", "in"];
  var sdsearch_K1 = 1.2;
  var sdsearch_B = 0.75;
  var sdsearch_QUERY = "quick brown";          // the page's query
  var sdsearch_BADQ = "The Quick Brown Foxes"; // the query that exposes tab 3
  var sdsearch_PROD_ROWS = 2000000;
  var sdsearch_PROD_CHARS = 220;
  var sdsearch_PROD_SEL = 0.0005;
  var sdsearch_REFRESH_S = 1;                  // the page's default

  function sdsearch_num(n) { return n.toLocaleString("en-US"); }
  function sdsearch_f3(x) { return (Math.round(x * 1000) / 1000).toFixed(3); }
  function sdsearch_f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }

  function sdsearch_isStop(t) {
    for (var i = 0; i < sdsearch_STOP.length; i++) if (sdsearch_STOP[i] === t) return true;
    return false;
  }

  /** The declared stemmer. Longest suffix first. */
  function sdsearch_stem(t) {
    if (t.length > 4 && t.slice(-3) === "ing") return t.slice(0, t.length - 3);
    if (t.length > 4 && t.slice(-2) === "ed") return t.slice(0, t.length - 2);
    if (t.length > 3 && t.slice(-2) === "es") return t.slice(0, t.length - 2);
    if (t.length > 3 && t.slice(-1) === "s") return t.slice(0, t.length - 1);
    return t;
  }

  function sdsearch_split(text) {
    var parts = String(text).split(/[^A-Za-z]+/), out = [], i;
    for (i = 0; i < parts.length; i++) if (parts[i]) out.push(parts[i]);
    return out;
  }

  /**
   * The page's pipeline, one stage per flag, so the same function runs the
   * index side and the query side and the difference between them is a
   * config object rather than two code paths.
   */
  function sdsearch_pipeline(text, cfg) {
    var raw = sdsearch_split(text), lower = [], kept = [], terms = [], i;
    for (i = 0; i < raw.length; i++) lower.push(cfg.lower ? raw[i].toLowerCase() : raw[i]);
    for (i = 0; i < lower.length; i++) {
      if (cfg.stop && sdsearch_isStop(lower[i])) continue;
      kept.push(lower[i]);
    }
    for (i = 0; i < kept.length; i++) terms.push(cfg.stem ? sdsearch_stem(kept[i]) : kept[i]);
    return { raw: raw, lower: lower, kept: kept, terms: terms };
  }

  var sdsearch_FULL = { lower: true, stop: true, stem: true };
  var sdsearch_V1 = { lower: false, stop: false, stem: false };

  function sdsearch_build() {
    var idx = {}, docs = [], i, j, t, e, k, p;
    for (i = 0; i < sdsearch_DOCS.length; i++) {
      p = sdsearch_pipeline(sdsearch_DOCS[i].body, sdsearch_FULL);
      docs.push({
        id: sdsearch_DOCS[i].id, body: sdsearch_DOCS[i].body,
        terms: p.terms, len: p.terms.length, p: p
      });
      for (j = 0; j < p.terms.length; j++) {
        t = p.terms[j];
        if (!idx[t]) idx[t] = [];
        e = null;
        for (k = 0; k < idx[t].length; k++) if (idx[t][k].id === docs[i].id) e = idx[t][k];
        if (!e) { e = { id: docs[i].id, pos: [] }; idx[t].push(e); }
        e.pos.push(j + 1);   // 1-based, AFTER stopword removal
      }
    }
    return { idx: idx, docs: docs };
  }
  var sdsearch_IX = sdsearch_build();

  function sdsearch_avgdl() {
    var s = 0, i;
    for (i = 0; i < sdsearch_IX.docs.length; i++) s += sdsearch_IX.docs[i].len;
    return sdsearch_IX.docs.length ? s / sdsearch_IX.docs.length : 1;
  }
  var sdsearch_AVGDL = sdsearch_avgdl();

  function sdsearch_vocab() {
    var out = [], t;
    for (t in sdsearch_IX.idx) if (sdsearch_IX.idx.hasOwnProperty(t)) out.push(t);
    out.sort();
    return out;
  }
  var sdsearch_VOCAB = sdsearch_vocab();

  function sdsearch_entries() {
    var n = 0, i;
    for (i = 0; i < sdsearch_VOCAB.length; i++) n += sdsearch_IX.idx[sdsearch_VOCAB[i]].length;
    return n;
  }
  var sdsearch_ENTRIES = sdsearch_entries();

  function sdsearch_post(t) { return sdsearch_IX.idx[t] || []; }
  function sdsearch_df(t) { return sdsearch_post(t).length; }

  function sdsearch_postStr(t) {
    var p = sdsearch_post(t), s = [], i;
    for (i = 0; i < p.length; i++) s.push(p[i].id + ":[" + p[i].pos.join(",") + "]");
    return s.length ? s.join(" ") : "— not in the index";
  }

  function sdsearch_idf(t) {
    var n = sdsearch_df(t), N = sdsearch_IX.docs.length;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  }
  function sdsearch_kfac(len) {
    return sdsearch_K1 * (1 - sdsearch_B + sdsearch_B * len / (sdsearch_AVGDL || 1));
  }
  function sdsearch_tfpart(tf, len) {
    var k = sdsearch_kfac(len);
    return (tf + k) > 0 ? tf * (sdsearch_K1 + 1) / (tf + k) : 0;
  }
  function sdsearch_tf(doc, t) {
    var c = 0, i;
    for (i = 0; i < doc.terms.length; i++) if (doc.terms[i] === t) c++;
    return c;
  }
  function sdsearch_score(doc, terms) {
    var s = 0, i, tf;
    for (i = 0; i < terms.length; i++) {
      tf = sdsearch_tf(doc, terms[i]);
      if (!tf) continue;
      s += sdsearch_idf(terms[i]) * sdsearch_tfpart(tf, doc.len);
    }
    return s;
  }
  function sdsearch_doc(id) {
    var i;
    for (i = 0; i < sdsearch_IX.docs.length; i++) if (sdsearch_IX.docs[i].id === id) return sdsearch_IX.docs[i];
    return null;
  }

  /** term -> docs, intersected. Returns ids present in EVERY postings list. */
  function sdsearch_intersect(terms) {
    if (!terms.length) return [];
    var out = [], i, j, k, ok, p;
    for (i = 0; i < sdsearch_IX.docs.length; i++) {
      ok = true;
      for (j = 0; j < terms.length; j++) {
        p = sdsearch_post(terms[j]);
        for (k = 0, ok = false; k < p.length; k++) if (p[k].id === sdsearch_IX.docs[i].id) ok = true;
        if (!ok) break;
      }
      if (ok) out.push(sdsearch_IX.docs[i].id);
    }
    return out;
  }
  function sdsearch_touched(terms) {
    var n = 0, i;
    for (i = 0; i < terms.length; i++) n += sdsearch_post(terms[i]).length;
    return n;
  }

  /** Phrase check straight off the positions the page says enable it. */
  function sdsearch_phrase(id, terms) {
    var i, j, k, a, b, ok;
    if (terms.length < 2) return true;
    a = null;
    for (i = 0; i < sdsearch_post(terms[0]).length; i++) {
      if (sdsearch_post(terms[0])[i].id === id) a = sdsearch_post(terms[0])[i].pos;
    }
    if (!a) return false;
    for (i = 0; i < a.length; i++) {
      ok = true;
      for (j = 1; j < terms.length; j++) {
        b = null;
        for (k = 0; k < sdsearch_post(terms[j]).length; k++) {
          if (sdsearch_post(terms[j])[k].id === id) b = sdsearch_post(terms[j])[k].pos;
        }
        if (!b) return false;
        ok = false;
        for (k = 0; k < b.length; k++) if (b[k] === a[i] + j) ok = true;
        if (!ok) break;
      }
      if (ok) return true;
    }
    return false;
  }

  function sdsearch_lev(a, b) {
    var m = a.length, n = b.length, prev = [], cur = [], i, j, c;
    for (j = 0; j <= n; j++) prev.push(j);
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) {
        c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c));
      }
      prev = cur;
    }
    return prev[n];
  }
  function sdsearch_fuzzy(term, cap) {
    var out = [], i, dist;
    for (i = 0; i < sdsearch_VOCAB.length; i++) {
      dist = sdsearch_lev(term, sdsearch_VOCAB[i]);
      if (dist <= cap) out.push({ t: sdsearch_VOCAB[i], dist: dist });
    }
    return out;
  }

  /** One LIKE '%pat%' pass: offsets tried per row, and whether it matched. */
  function sdsearch_scan(pat) {
    var rows = [], i, body, at, tries, total = 0, hits = 0;
    for (i = 0; i < sdsearch_DOCS.length; i++) {
      body = sdsearch_DOCS[i].body;
      at = body.indexOf(pat);
      tries = Math.max(0, body.length - pat.length + 1);
      total += tries;
      if (at >= 0) hits++;
      rows.push({ id: sdsearch_DOCS[i].id, body: body, tries: tries, at: at });
    }
    return { rows: rows, tries: total, hits: hits };
  }

  var sdsearch_SCAN = sdsearch_scan(sdsearch_QUERY);
  var sdsearch_QTERMS = sdsearch_pipeline(sdsearch_QUERY, sdsearch_FULL).terms;
  var sdsearch_CAND = sdsearch_intersect(sdsearch_QTERMS);
  var sdsearch_TOUCH = sdsearch_touched(sdsearch_QTERMS);

  function sdsearch_ranked(ids, terms) {
    var out = [], i;
    for (i = 0; i < ids.length; i++) {
      out.push({ id: ids[i], score: sdsearch_score(sdsearch_doc(ids[i]), terms) });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }
  var sdsearch_RANK = sdsearch_ranked(sdsearch_CAND, sdsearch_QTERMS);

  /** The saturation curve, on the shortest document's length. */
  var sdsearch_TFS = [1, 2, 3, 5, 10, 100];
  function sdsearch_satRows() {
    var rows = [], i, base = sdsearch_tfpart(1, sdsearch_doc("d1").len), v;
    for (i = 0; i < sdsearch_TFS.length; i++) {
      v = sdsearch_tfpart(sdsearch_TFS[i], sdsearch_doc("d1").len);
      rows.push([
        String(sdsearch_TFS[i]),
        sdsearch_f3(v),
        base > 0 ? sdsearch_f2(v / base) + "×" : "—",
        sdsearch_TFS[i] + "×"
      ]);
    }
    return rows;
  }
  var sdsearch_SAT = sdsearch_satRows();
  var sdsearch_SATMAX = sdsearch_tfpart(100, sdsearch_doc("d1").len) /
    sdsearch_tfpart(1, sdsearch_doc("d1").len);

  // ---- the scale ledger, from the declared production config -----------
  var sdsearch_PROD_OFFSETS = sdsearch_PROD_ROWS *
    Math.max(0, sdsearch_PROD_CHARS - sdsearch_QUERY.length + 1);
  var sdsearch_PROD_POSTINGS = Math.round(
    sdsearch_QTERMS.length * sdsearch_PROD_ROWS * sdsearch_PROD_SEL);
  var sdsearch_PROD_RATIO = sdsearch_PROD_POSTINGS
    ? sdsearch_PROD_ROWS / sdsearch_PROD_POSTINGS : 0;

  function sdsearch_railCells(names, done, cur) {
    var cells = [], i;
    for (i = 0; i < names.length; i++) {
      cells.push({
        label: names[i],
        flag: i < done ? "ok" : i === cur ? "warn" : "idle",
        title: names[i] + (i < done ? " · done" : i === cur ? " · running" : " · not reached")
      });
    }
    return cells;
  }

  // ======================================================================
  // Tab 1 — the relational answer.
  // ======================================================================
  function sdsearch_tabLike() {
    var f = [], i, r, acc = 0, seen = [], probes = [];
    var PIPE = ["tokenise", "lowercase", "stopwords", "stem", "index"];

    f.push({
      big: "—", bigLabel: "no query issued yet", bigFlag: "idle",
      examined: 0, touched: 0, results: 0,
      railLabel: "analysis pipeline", rail: sdsearch_railCells(PIPE, 0, -1),
      lines: [
        ["table", "posts (" + sdsearch_DOCS.length + " rows)", "idle"],
        ["index", "btree(body)", "idle"],
        ["query", "body LIKE '%" + sdsearch_QUERY + "%'", "idle"]
      ],
      table: { head: ["row", "body", "chars"], rows: (function () {
        var rr = [], k;
        for (k = 0; k < sdsearch_DOCS.length; k++) {
          rr.push([sdsearch_DOCS[k].id, sdsearch_DOCS[k].body, String(sdsearch_DOCS[k].body.length)]);
        }
        return rr;
      })() },
      stage: "the table", flag: "idle",
      caption: "The page's three documents, sitting in a relational table with a " +
        "<code>btree(body)</code> index on them, and the page's query shape: a substring " +
        "match with a wildcard on both ends. Press <b>Play</b> and watch what the planner " +
        "does with that index."
    });

    f.push({
      big: "Seq Scan", bigLabel: "chosen plan", bigFlag: "bad",
      examined: 0, touched: 0, results: 0,
      railLabel: "analysis pipeline", rail: sdsearch_railCells(PIPE, 0, -1),
      lines: [
        ["pattern", "'%" + sdsearch_QUERY + "%'", "warn"],
        ["known prefix of the pattern", "none — the wildcard is first", "bad"],
        ["btree(body) usable", "no", "bad"],
        ["estimated rows to examine", sdsearch_DOCS.length + " of " + sdsearch_DOCS.length, "bad"]
      ],
      stage: "planner", flag: "bad",
      caption: "<b>The index is there and the planner will not use it.</b> A B-tree stores " +
        "keys in sorted order, so it can seek to a known <i>prefix</i> and walk. " +
        "<code>'%" + sdsearch_QUERY + "%'</code> has no known prefix, so there is nothing to " +
        "seek to — the only correct plan is to look at every row. That is the page's first " +
        "claim, and it is a property of the data structure, not a tuning problem."
    });

    for (i = 0; i < sdsearch_SCAN.rows.length; i++) {
      r = sdsearch_SCAN.rows[i];
      acc += r.tries;
      seen = seen.concat([{
        label: r.id, flag: r.at >= 0 ? "ok" : "warn",
        title: r.id + " · " + r.tries + " offsets tried · " +
          (r.at >= 0 ? "matched at offset " + r.at : "no match")
      }]);
      f.push({
        big: sdsearch_num(acc), bigLabel: "candidate offsets walked", bigFlag: "warn",
        examined: i + 1, touched: 0, results: sdsearch_SCAN.rows.slice(0, i + 1).filter(function (x) {
          return x.at >= 0;
        }).length,
        railLabel: "rows of posts", rail: seen.slice(0).concat(
          sdsearch_railCells([], 0, -1)),
        lines: [
          ["row", r.id + "  “" + r.body + "”", "idle"],
          ["offsets tried on this row", "len " + r.body.length + " − pat " +
            sdsearch_QUERY.length + " + 1 = " + r.tries, "warn"],
          ["substring found at", r.at >= 0 ? "offset " + r.at : "not found",
            r.at >= 0 ? "ok" : "idle"],
          ["offsets walked so far", sdsearch_num(acc), "warn"]
        ],
        stage: "seq scan · row " + (i + 1) + " of " + sdsearch_DOCS.length,
        flag: r.at >= 0 ? "ok" : "warn",
        caption: "<b>" + r.id + ".</b> The engine slides the pattern along the body one " +
          "character at a time: <b>" + r.tries + "</b> candidate offsets on this row" +
          (r.at >= 0
            ? ", and it matches at offset <b>" + r.at + "</b>."
            : ", and none of them match.") +
          " Running total <b>" + sdsearch_num(acc) + "</b> offsets — and the row count this " +
          "grows with is the whole table, every time."
      });
    }

    f.push({
      big: String(sdsearch_SCAN.hits), bigLabel: "rows returned", bigFlag: "warn",
      examined: sdsearch_DOCS.length, touched: 0, results: sdsearch_SCAN.hits,
      railLabel: "rows of posts", rail: seen,
      lines: [
        ["rows examined", sdsearch_DOCS.length + " of " + sdsearch_DOCS.length, "bad"],
        ["rows returned", String(sdsearch_SCAN.hits), "warn"],
        ["ordering", "physical row order — there is no score column", "bad"],
        ["best match first", "the engine has no opinion", "bad"]
      ],
      table: { head: ["rank", "row", "relevance"], rows: (function () {
        var rr = [], k = 0, j;
        for (j = 0; j < sdsearch_SCAN.rows.length; j++) {
          if (sdsearch_SCAN.rows[j].at >= 0) {
            k++;
            rr.push([String(k), sdsearch_SCAN.rows[j].id, "none — LIKE is a boolean"]);
          }
        }
        return rr;
      })() },
      stage: "result set", flag: "warn",
      caption: "<b>Two rows, and the right two — on three documents.</b> But look at the " +
        "third column: <code>LIKE</code> returns a set, not a ranking. There is no notion of " +
        "a <i>better</i> match, so page one of the results is whatever order the rows " +
        "happen to be stored in. On three rows that is invisible; on a million it is the " +
        "entire product."
    });

    probes = [];
    r = sdsearch_scan("brown quick");
    probes.push(["'%brown quick%'", "same two words, reordered", String(r.hits) + " rows"]);
    f.push({
      big: String(r.hits), bigLabel: "rows for the reordered query", bigFlag: "bad",
      examined: sdsearch_DOCS.length, touched: 0, results: r.hits,
      railLabel: "rows of posts", rail: seen,
      lines: [
        ["pattern", "'%brown quick%'", "warn"],
        ["offsets walked", sdsearch_num(r.tries), "warn"],
        ["rows returned", String(r.hits), "bad"],
        ["what the user typed", "the same two words", "bad"]
      ],
      table: { head: ["probe", "what it asks", "rows"], rows: probes.slice(0) },
      stage: "probe · word order", flag: "bad",
      caption: "<b>Swap the two words and the answer is " + r.hits + " rows.</b> " +
        "<code>LIKE</code> matches a literal byte sequence, so “brown quick” is a " +
        "different string from “quick brown” — it is not a query over words at all. " +
        "It still walked <b>" + sdsearch_num(r.tries) + "</b> offsets to tell you nothing."
    });

    var typo = "quikc brown";
    var tr = sdsearch_scan(typo);
    var fz = sdsearch_fuzzy("quikc", 2);
    var fzTxt = [];
    for (i = 0; i < fz.length; i++) fzTxt.push(fz[i].t + " (distance " + fz[i].dist + ")");
    probes.push(["'%foxes%'", "the plural of an indexed word",
      String(sdsearch_scan("foxes").hits) + " rows"]);
    probes.push(["'%" + typo + "%'", "one transposed letter", String(tr.hits) + " rows"]);
    f.push({
      big: String(tr.hits), bigLabel: "rows for the typo", bigFlag: "bad",
      examined: sdsearch_DOCS.length, touched: 0, results: tr.hits,
      railLabel: "rows of posts", rail: seen,
      lines: [
        ["pattern", "'%" + typo + "%'", "warn"],
        ["offsets walked", sdsearch_num(tr.tries), "warn"],
        ["rows returned", String(tr.hits), "bad"],
        ["an index would fuzzy-match it to",
          fzTxt.length ? fzTxt.join(", ") : "nothing within distance 2", "ok"]
      ],
      table: { head: ["probe", "what it asks", "rows"], rows: probes.slice(0) },
      stage: "probe · typo and plural", flag: "bad",
      caption: "<b>One transposed letter and the result set is empty.</b> An inverted index " +
        "answers this by edit distance over its vocabulary — " +
        (fzTxt.length ? "“quikc” is " + fzTxt.join(", ") + ", inside the page's " +
          "cap of 1–2" : "nothing within the page's cap of 1–2") +
        " — but a substring match has no vocabulary to compare against. Same story for " +
        "“foxes” against a corpus that also says “fox”: no stemming, " +
        "so no linguistics."
    });

    f.push({
      big: sdsearch_num(sdsearch_PROD_ROWS), bigLabel: "rows examined at scale", bigFlag: "bad",
      examined: sdsearch_DOCS.length, touched: 0, results: sdsearch_SCAN.hits,
      railLabel: "rows of posts", rail: seen,
      lines: [
        ["rows examined by the scan", sdsearch_num(sdsearch_PROD_ROWS), "bad"],
        ["candidate offsets walked", sdsearch_num(sdsearch_PROD_OFFSETS), "bad"],
        ["postings an inverted index would touch",
          sdsearch_num(sdsearch_PROD_POSTINGS), "ok"],
        ["ratio", sdsearch_num(Math.round(sdsearch_PROD_RATIO)) + "× fewer rows", "ok"]
      ],
      table: { head: ["capability", "LIKE", "inverted index"], rows: [
        ["uses an index", "no", "yes"],
        ["relevance ordering", "none", "BM25"],
        ["stemming", "none", "foxes → fox"],
        ["typo tolerance", "none", "edit distance ≤ 2"],
        ["phrase / proximity", "literal only", "from stored positions"]
      ] },
      stage: "the same query at scale", flag: "bad",
      caption: "<b>Scale the same plan to " + sdsearch_num(sdsearch_PROD_ROWS) + " posts of " +
        sdsearch_PROD_CHARS + " characters</b> and the scan walks " +
        sdsearch_num(sdsearch_PROD_OFFSETS) + " candidate offsets across every row in the " +
        "table; an index touches the postings of the two query terms — " +
        sdsearch_num(sdsearch_PROD_POSTINGS) + " entries at a 0.05% document frequency, " +
        "<b>" + sdsearch_num(Math.round(sdsearch_PROD_RATIO)) + "×</b> less work. And " +
        "the cost column is the <i>smaller</i> half of the argument: the right-hand column " +
        "lists five things this query cannot do at any speed."
    });

    return { id: "like", label: "LIKE '%…%'", steps: f };
  }

  // ======================================================================
  // Tab 2 — the inverted index, built and queried by the same pipeline.
  // ======================================================================
  function sdsearch_tabIndex() {
    var f = [], i, PIPE = ["tokenise", "lowercase", "stopwords", "stem", "index"];
    var qp = sdsearch_pipeline(sdsearch_QUERY, sdsearch_FULL);
    var d1 = sdsearch_doc("d1"), d3 = sdsearch_doc("d3");

    f.push({
      big: "0", bigLabel: "postings in the index", bigFlag: "idle",
      examined: 0, touched: 0, results: 0,
      railLabel: "analysis pipeline", rail: sdsearch_railCells(PIPE, 0, -1),
      lines: [
        ["documents to index", String(sdsearch_DOCS.length), "idle"],
        ["vocabulary", "empty", "idle"],
        ["query waiting", "“" + sdsearch_QUERY + "”", "idle"]
      ],
      stage: "empty index", flag: "idle",
      caption: "Same three documents, nothing indexed yet. The page's pipeline is " +
        "<b>tokenise → lowercase → remove stopwords → stem</b>, and the thing " +
        "to watch is that it will run <i>twice</i>: once here, once on the query."
    });

    var pipeRows = [], p;
    for (i = 0; i < sdsearch_IX.docs.length; i++) {
      p = sdsearch_IX.docs[i].p;
      pipeRows.push([
        sdsearch_IX.docs[i].id,
        p.raw.join(" "),
        p.lower.join(" "),
        p.kept.join(" "),
        p.terms.join(" ")
      ]);
    }
    f.push({
      big: String(sdsearch_VOCAB.length), bigLabel: "distinct index terms", bigFlag: "ok",
      examined: sdsearch_DOCS.length, touched: 0, results: 0,
      railLabel: "analysis pipeline", rail: sdsearch_railCells(PIPE, 4, 4),
      lines: [
        ["stopwords dropped", sdsearch_STOP.join(", "), "ok"],
        ["stemmer fired on", "foxes → " + sdsearch_stem("foxes"), "ok"],
        ["d1 length after analysis", String(d1.len) + " terms", "idle"],
        ["d3 length after analysis", String(d3.len) + " terms", "idle"],
        ["average document length", sdsearch_f3(sdsearch_AVGDL) + " terms", "idle"]
      ],
      table: { head: ["doc", "tokenise", "lowercase", "stopwords", "stem"], rows: pipeRows },
      stage: "analysis · index side", flag: "ok",
      caption: "<b>Four stages, one column each.</b> “the” disappears at the " +
        "stopword stage — it is in every document, so it discriminates nothing — and the " +
        "stemmer folds <b>foxes → " + sdsearch_stem("foxes") + "</b>, which is the " +
        "page's own example and the reason a search for one will find the other. Note the " +
        "lengths that fall out: d1 is <b>" + d1.len + "</b> terms, d3 is <b>" + d3.len +
        "</b>. BM25 will use that in two frames' time."
    });

    var postRows = [];
    for (i = 0; i < sdsearch_VOCAB.length; i++) {
      postRows.push([
        sdsearch_VOCAB[i],
        String(sdsearch_df(sdsearch_VOCAB[i])),
        sdsearch_postStr(sdsearch_VOCAB[i])
      ]);
    }
    f.push({
      big: String(sdsearch_ENTRIES), bigLabel: "postings written", bigFlag: "ok",
      examined: sdsearch_DOCS.length, touched: 0, results: 0,
      railLabel: "analysis pipeline", rail: sdsearch_railCells(PIPE, 5, -1),
      lines: [
        ["direction", "term → docs, not doc → terms", "ok"],
        ["positions stored", "yes — 1-based, after stopword removal", "ok"],
        ["searchable immediately", "no — refresh interval, default " +
          sdsearch_REFRESH_S + "s", "warn"]
      ],
      table: { head: ["term", "df", "postings · positions"], rows: postRows },
      stage: "the inverted index", flag: "ok",
      caption: "<b>The one data structure.</b> Read the middle rows back against the page: " +
        "<code>brown → " + sdsearch_postStr("brown").replace(/:\[[0-9,]*\]/g, "") +
        "</code>, <code>quick → " + sdsearch_postStr("quick").replace(/:\[[0-9,]*\]/g, "") +
        "</code>, <code>fox → " + sdsearch_postStr("fox") + "</code> — the positions " +
        "printed there were counted by the indexer, not typed. One caveat worth saying out " +
        "loud: a document is not searchable the instant it is written; the index refreshes " +
        "on an interval, about " + sdsearch_REFRESH_S + " second by default."
    });

    f.push({
      big: String(qp.terms.length), bigLabel: "query terms after analysis", bigFlag: "ok",
      examined: 0, touched: 0, results: 0,
      railLabel: "analysis pipeline · query side",
      rail: sdsearch_railCells(PIPE, 4, -1),
      lines: [
        ["raw query", "“" + sdsearch_QUERY + "”", "idle"],
        ["tokenise", qp.raw.join(" · "), "ok"],
        ["lowercase", qp.lower.join(" · "), "ok"],
        ["stopwords", qp.kept.join(" · "), "ok"],
        ["stem", qp.terms.join(" · "), "ok"],
        ["analyser used", "the same one that built the index", "ok"]
      ],
      stage: "analysis · query side", flag: "ok",
      caption: "<b>The query goes through the identical pipeline.</b> This frame looks " +
        "redundant and it is the single most load-bearing detail on the page: index terms " +
        "and query terms have to come out of the <i>same</i> function, or the two sides " +
        "speak different vocabularies and the failure is silent. Tab three is that failure."
    });

    var interRows = [];
    for (i = 0; i < qp.terms.length; i++) {
      interRows.push([qp.terms[i], String(sdsearch_df(qp.terms[i])), sdsearch_postStr(qp.terms[i])]);
    }
    interRows.push(["INTERSECT", String(sdsearch_CAND.length), sdsearch_CAND.join(", ")]);
    f.push({
      big: sdsearch_CAND.join(" · "), bigLabel: "candidates after intersection", bigFlag: "ok",
      examined: sdsearch_CAND.length, touched: sdsearch_TOUCH, results: sdsearch_CAND.length,
      railLabel: "analysis pipeline · query side",
      rail: sdsearch_railCells(PIPE, 5, -1),
      lines: [
        ["postings entries read", String(sdsearch_TOUCH), "ok"],
        ["documents opened", "0 — the postings are the answer", "ok"],
        ["dropped by the intersection", "d2 (has brown, has no quick)", "idle"],
        ["phrase check from positions", (function () {
          var ph = [], k;
          for (k = 0; k < sdsearch_CAND.length; k++) {
            if (sdsearch_phrase(sdsearch_CAND[k], qp.terms)) ph.push(sdsearch_CAND[k]);
          }
          return ph.length ? ph.join(", ") + " — adjacent" : "no adjacent pair";
        })(), "ok"]
      ],
      table: { head: ["term", "df", "postings"], rows: interRows },
      stage: "intersect postings", flag: "ok",
      caption: "<b>" + sdsearch_TOUCH + " postings entries read, and the query is answered.</b> " +
        "The engine never opened a document — it intersected two lists and got <b>" +
        sdsearch_CAND.join(", ") + "</b>, which is the page's answer exactly. And because " +
        "the postings carry positions, the same read also answers “were the words " +
        "<i>adjacent</i>?”: in both survivors quick is at 1 and brown at 2, so this is " +
        "a phrase match, not just a bag of words."
    });

    var idfRows = [], mx = 0;
    for (i = 0; i < qp.terms.length; i++) {
      if (sdsearch_idf(qp.terms[i]) > mx) mx = sdsearch_idf(qp.terms[i]);
    }
    for (i = 0; i < qp.terms.length; i++) {
      idfRows.push({
        label: qp.terms[i] + " · df " + sdsearch_df(qp.terms[i]) + " of " + sdsearch_IX.docs.length,
        pct: mx ? (sdsearch_idf(qp.terms[i]) / mx) * 100 : 0,
        value: sdsearch_f3(sdsearch_idf(qp.terms[i])),
        flag: sdsearch_idf(qp.terms[i]) >= mx ? "ok" : "warn"
      });
    }
    var idfRatio = sdsearch_idf("brown") > 0 ? sdsearch_idf("quick") / sdsearch_idf("brown") : 0;
    f.push({
      big: sdsearch_f2(idfRatio) + "×", bigLabel: "quick discriminates over brown", bigFlag: "ok",
      examined: sdsearch_CAND.length, touched: sdsearch_TOUCH, results: sdsearch_CAND.length,
      railLabel: "BM25 · three factors",
      rail: sdsearch_railCells(["idf", "term frequency", "length norm"], 1, 0),
      lines: [
        ["idf(quick)", sdsearch_f3(sdsearch_idf("quick")) + "  (df " + sdsearch_df("quick") + ")", "ok"],
        ["idf(brown)", sdsearch_f3(sdsearch_idf("brown")) + "  (df " + sdsearch_df("brown") + ")", "warn"],
        ["formula", "ln(1 + (N − df + 0.5) / (df + 0.5)), N = " + sdsearch_IX.docs.length, "idle"]
      ],
      bars: idfRows,
      stage: "BM25 · inverse document frequency", flag: "ok",
      caption: "<b>Rare terms carry the query.</b> “brown” is in all " +
        sdsearch_df("brown") + " documents, so it separates nothing and earns " +
        sdsearch_f3(sdsearch_idf("brown")) + "; “quick” is in " +
        sdsearch_df("quick") + " and earns " + sdsearch_f3(sdsearch_idf("quick")) + " — <b>" +
        sdsearch_f2(idfRatio) + "×</b> as much. This is the same instinct that makes " +
        "“the” a stopword, expressed as a weight instead of a delete."
    });

    var lenRows = [], mxs = 0;
    for (i = 0; i < sdsearch_RANK.length; i++) if (sdsearch_RANK[i].score > mxs) mxs = sdsearch_RANK[i].score;
    for (i = 0; i < sdsearch_RANK.length; i++) {
      lenRows.push({
        label: sdsearch_RANK[i].id + " · " + sdsearch_doc(sdsearch_RANK[i].id).len +
          " terms · “" + sdsearch_doc(sdsearch_RANK[i].id).body + "”",
        pct: mxs ? (sdsearch_RANK[i].score / mxs) * 100 : 0,
        value: sdsearch_f3(sdsearch_RANK[i].score),
        flag: i === 0 ? "ok" : "warn"
      });
    }
    f.push({
      big: sdsearch_RANK.length ? sdsearch_RANK[0].id : "—",
      bigLabel: "ranked first", bigFlag: "ok",
      examined: sdsearch_CAND.length, touched: sdsearch_TOUCH, results: sdsearch_CAND.length,
      railLabel: "BM25 · three factors",
      rail: sdsearch_railCells(["idf", "term frequency", "length norm"], 3, 2),
      lines: [
        ["d1 length / avg", d1.len + " / " + sdsearch_f3(sdsearch_AVGDL), "ok"],
        ["d3 length / avg", d3.len + " / " + sdsearch_f3(sdsearch_AVGDL), "warn"],
        ["term frequencies", "identical — 1 and 1 in both", "idle"],
        ["idf contribution", "identical — same two terms", "idle"],
        ["so the only difference is", "document length", "ok"]
      ],
      bars: lenRows,
      stage: "BM25 · length normalisation", flag: "ok",
      caption: "<b>Both survivors contain both terms once, so tf and idf cancel out exactly " +
        "— and they still rank differently.</b> d1 is " + d1.len + " terms and d3 is " +
        d3.len + ", so the same evidence is a larger fraction of the shorter document: " +
        sdsearch_f3(sdsearch_RANK[0].score) + " against " +
        (sdsearch_RANK.length > 1 ? sdsearch_f3(sdsearch_RANK[1].score) : "—") +
        ". That is the page's “a match in a 5-word title beats one in a 5,000-word " +
        "body”, isolated to a single variable."
    });

    f.push({
      big: sdsearch_f2(sdsearch_SATMAX) + "×",
      bigLabel: "score at tf 100 vs tf 1", bigFlag: "ok",
      examined: sdsearch_CAND.length, touched: sdsearch_TOUCH, results: sdsearch_CAND.length,
      railLabel: "BM25 · three factors",
      rail: sdsearch_railCells(["idf", "term frequency", "length norm"], 3, 1),
      lines: [
        ["k1", sdsearch_f2(sdsearch_K1) + " — the saturation knob", "idle"],
        ["ceiling of the tf term", "k1 + 1 = " + sdsearch_f2(sdsearch_K1 + 1), "ok"],
        ["100 occurrences buys", sdsearch_f2(sdsearch_SATMAX) + "×, not 100×", "ok"]
      ],
      table: { head: ["tf", "BM25 tf term", "vs tf=1", "raw TF would say"], rows: sdsearch_SAT },
      stage: "BM25 · saturation", flag: "ok",
      caption: "<b>The measurement behind the page's claim.</b> Repeat “quick” in " +
        "d1 and watch the tf term climb to a hard ceiling of k1 + 1 = " +
        sdsearch_f2(sdsearch_K1 + 1) + ": a hundred occurrences score <b>" +
        sdsearch_f2(sdsearch_SATMAX) + "×</b> one occurrence, where raw TF-IDF would " +
        "have said 100×. That curve <i>is</i> why keyword stuffing does not work — the " +
        "fourth column is the attack this replaced."
    });

    f.push({
      big: sdsearch_num(sdsearch_PROD_POSTINGS), bigLabel: "postings touched at scale", bigFlag: "ok",
      examined: sdsearch_CAND.length, touched: sdsearch_TOUCH, results: sdsearch_CAND.length,
      railLabel: "two-stage retrieval",
      rail: sdsearch_railCells(["cheap recall (BM25)", "expensive rerank"], 2, -1),
      lines: [
        ["stage 1 — BM25 over the index", "cheap, high recall, " +
          sdsearch_num(sdsearch_PROD_POSTINGS) + " postings at scale", "ok"],
        ["stage 2 — rerank the top few hundred", "recency, popularity, personalisation", "ok"],
        ["the scan would have examined", sdsearch_num(sdsearch_PROD_ROWS) + " rows", "bad"],
        ["kept in sync by", "CDC off the replication log, not dual writes", "ok"],
        ["source of truth", "the database — the index is derived", "ok"]
      ],
      table: { head: ["capability", "LIKE", "this index"], rows: [
        ["uses an index", "no", "yes"],
        ["ranking", "none", "BM25, top = " + (sdsearch_RANK.length ? sdsearch_RANK[0].id : "—")],
        ["stemming", "none", "foxes → " + sdsearch_stem("foxes")],
        ["phrase / proximity", "literal bytes", "positions in the postings"],
        ["rows examined at scale", sdsearch_num(sdsearch_PROD_ROWS),
          sdsearch_num(sdsearch_PROD_POSTINGS) + " postings"]
      ] },
      stage: "the shape of the real system", flag: "ok",
      caption: "<b>Cheap recall, expensive rerank.</b> BM25 over the index is stage one and " +
        "is what the " + sdsearch_num(sdsearch_PROD_POSTINGS) + " postings buy you; the " +
        "second pass reorders only the survivors with signals BM25 knows nothing about. Two " +
        "things to volunteer with it: the index is a <i>derived</i> store fed by change data " +
        "capture off the replication log — never a dual write, because no transaction spans " +
        "both — and you keep a full rebuild path for when it drifts anyway."
    });

    return { id: "index", label: "Inverted index + BM25", steps: f };
  }

  // ======================================================================
  // Tab 3 — the page's "classic bug": stem at index time, not at query time.
  // ======================================================================
  function sdsearch_tabSkew() {
    var f = [], i, probes = [];
    var raw = sdsearch_pipeline(sdsearch_BADQ, sdsearch_V1).terms;
    var fixed = sdsearch_pipeline(sdsearch_BADQ, sdsearch_FULL).terms;
    var fixedCand = sdsearch_intersect(fixed);
    var fixedRank = sdsearch_ranked(fixedCand, fixed);
    var PIPE = ["tokenise", "lowercase", "stopwords", "stem"];

    f.push({
      big: String(sdsearch_ENTRIES), bigLabel: "postings in the index", bigFlag: "ok",
      examined: 0, touched: 0, results: 0,
      railLabel: "query-side pipeline", rail: sdsearch_railCells(PIPE, 0, -1),
      lines: [
        ["index built by", "analyser v2 — lowercase, stopwords, stem", "ok"],
        ["vocabulary", sdsearch_VOCAB.join(", "), "ok"],
        ["incoming query", "“" + sdsearch_BADQ + "”", "idle"]
      ],
      stage: "a healthy index", flag: "idle",
      caption: "The index from tab two, unchanged and correct: <b>" + sdsearch_ENTRIES +
        "</b> postings over <b>" + sdsearch_VOCAB.length + "</b> lowercase, stemmed terms. " +
        "A user types <i>“" + sdsearch_BADQ + "”</i> — four words, all of which " +
        "this corpus contains. Press <b>Play</b>."
    });

    f.push({
      big: "v2 / v1", bigLabel: "index analyser / query analyser", bigFlag: "bad",
      examined: 0, touched: 0, results: 0,
      railLabel: "query-side pipeline", rail: sdsearch_railCells(PIPE, 0, -1),
      lines: [
        ["index side — tokenise", "yes", "ok"],
        ["index side — lowercase / stopwords / stem", "yes / yes / yes", "ok"],
        ["query side — tokenise", "yes", "ok"],
        ["query side — lowercase / stopwords / stem", "no / no / no", "bad"],
        ["tests covering this", "index-side unit tests, all green", "bad"]
      ],
      stage: "the configuration drift", flag: "bad",
      caption: "<b>The analyser was upgraded on one side only.</b> The indexer runs all four " +
        "stages; the query path still splits on whitespace and sends the words straight to " +
        "the index. Nothing here is broken in a way a test notices — the index-side tests " +
        "pass, because the index side is fine."
    });

    f.push({
      big: String(raw.length), bigLabel: "terms sent to the index", bigFlag: "warn",
      examined: 0, touched: 0, results: 0,
      railLabel: "query-side pipeline", rail: sdsearch_railCells(PIPE, 1, 0),
      lines: [
        ["raw query", "“" + sdsearch_BADQ + "”", "idle"],
        ["after the query analyser", raw.join(" · "), "warn"],
        ["what analyser v2 would have produced", fixed.join(" · "), "ok"]
      ],
      stage: "query analysis (such as it is)", flag: "warn",
      caption: "<b>Two term lists, and they will never meet.</b> The query path emits " +
        "<code>" + raw.join(" · ") + "</code>; the index holds <code>" + fixed.join(" · ") +
        "</code>. Every lookup from here is a lookup of a string the indexer never wrote."
    });

    var touchAcc = 0;
    for (i = 0; i < raw.length; i++) {
      touchAcc += sdsearch_post(raw[i]).length;
      probes.push([
        raw[i],
        String(sdsearch_post(raw[i]).length),
        sdsearch_post(raw[i]).length ? sdsearch_postStr(raw[i]) : "no such term",
        sdsearch_stem(raw[i].toLowerCase()) +
          (sdsearch_isStop(raw[i].toLowerCase()) ? " (stopword)" : "")
      ]);
      f.push({
        big: String(touchAcc), bigLabel: "postings found so far", bigFlag: "bad",
        examined: 0, touched: touchAcc, results: 0,
        railLabel: "query-side pipeline", rail: sdsearch_railCells(PIPE, 1, 0),
        lines: [
          ["looking up", "“" + raw[i] + "”", "warn"],
          ["postings found", String(sdsearch_post(raw[i]).length), "bad"],
          ["the index holds instead",
            sdsearch_isStop(raw[i].toLowerCase())
              ? "nothing — “" + raw[i].toLowerCase() + "” is a stopword"
              : "“" + sdsearch_stem(raw[i].toLowerCase()) + "” → " +
                sdsearch_postStr(sdsearch_stem(raw[i].toLowerCase())),
            "ok"],
          ["error raised", "none — a missing term is just an empty list", "bad"]
        ],
        table: { head: ["looked up", "hits", "postings", "v2 would have asked for"],
          rows: probes.slice(0) },
        stage: "lookup " + (i + 1) + " of " + raw.length, flag: "bad",
        caption: "<b>“" + raw[i] + "” → " + sdsearch_post(raw[i]).length +
          " postings.</b> " +
          (sdsearch_isStop(raw[i].toLowerCase())
            ? "It is a stopword, so the indexer deliberately never wrote it — but the query " +
              "side does not know that stage exists, so it asks anyway."
            : sdsearch_stem(raw[i].toLowerCase()) !== raw[i].toLowerCase()
              ? "The indexer stemmed it to “" + sdsearch_stem(raw[i].toLowerCase()) +
                "”, which does have postings — " + sdsearch_postStr(sdsearch_stem(raw[i].toLowerCase())) +
                " — but nobody stemmed the query, so the lookup misses by one suffix. This is " +
                "the page's “running will not find run”, exactly."
              : "The vocabulary is lowercase and the query is not, so the string does not " +
                "exist in the index. No error: a term with no postings is simply a term with " +
                "no postings.")
      });
    }

    f.push({
      big: "0", bigLabel: "documents returned", bigFlag: "bad",
      examined: 0, touched: 0, results: 0,
      railLabel: "query-side pipeline", rail: sdsearch_railCells(PIPE, 1, 0),
      lines: [
        ["intersection of the postings lists", "∅", "bad"],
        ["HTTP status", "200 OK", "bad"],
        ["errors logged", "0", "bad"],
        ["latency", "fast — there was nothing to read", "bad"],
        ["what the user sees", "“No results”", "bad"]
      ],
      table: { head: ["looked up", "hits", "postings", "v2 would have asked for"],
        rows: probes.slice(0) },
      stage: "the response", flag: "bad",
      caption: "<b>Zero results, 200 OK, nothing in the error log, and a latency number that " +
        "looks better than usual.</b> Every dashboard this system has says it is healthy. " +
        "The only signal that anything is wrong is the one nobody graphs: the fraction of " +
        "queries returning no hits."
    });

    var fixRows = [];
    for (i = 0; i < fixedRank.length; i++) {
      fixRows.push([
        String(i + 1), fixedRank[i].id,
        sdsearch_f3(fixedRank[i].score),
        sdsearch_doc(fixedRank[i].id).body
      ]);
    }
    f.push({
      big: String(fixedRank.length), bigLabel: "documents the corpus actually held", bigFlag: "ok",
      examined: fixedCand.length, touched: sdsearch_touched(fixed), results: fixedRank.length,
      railLabel: "query-side pipeline", rail: sdsearch_railCells(PIPE, 4, -1),
      lines: [
        ["same query, analyser v2", fixed.join(" · "), "ok"],
        ["postings entries read", String(sdsearch_touched(fixed)), "ok"],
        ["documents returned", String(fixedRank.length), "ok"],
        ["index changed", "not by one byte", "ok"],
        ["fix", "one analyser, referenced twice", "ok"]
      ],
      table: { head: ["rank", "doc", "BM25", "body"], rows: fixRows },
      stage: "the same query, analysed", flag: "ok",
      caption: "<b>Run the identical query through the identical index with the query-side " +
        "pipeline switched on and it returns " + fixedRank.length + " documents</b>, top " +
        "hit " + (fixedRank.length ? fixedRank[0].id + " at " + sdsearch_f3(fixedRank[0].score) : "—") +
        ". The index was never the problem. That is what makes this bug worth naming in an " +
        "interview: it is not a search-quality issue you tune, it is an asymmetry between " +
        "two copies of a pipeline, and the fix is to have only one copy."
    });

    return { id: "skew", label: "Stemmed at index, not at query", steps: f };
  }

  S["sdsearch"] = {
    title: "Send one query at three documents three ways",
    note: "The corpus is the page's own — <code>d1 “the quick brown fox”</code>, " +
      "<code>d2 “the lazy brown dog”</code>, <code>d3 “quick brown foxes " +
      "jump”</code> — and every posting, position, document frequency and score " +
      "below is computed from those three strings at load time. The analysis pipeline is " +
      "the page's four stages with a declared stopword list (" + sdsearch_STOP.join(", ") +
      ") and a declared suffix stemmer (‑ing/‑ed above 4 letters, ‑es/‑s " +
      "above 3), which is what folds <b>foxes → " + sdsearch_stem("foxes") + "</b>. " +
      "Positions are 1-based after stopword removal — the only convention that " +
      "reproduces the page's <code>fox → d1:[3], d3:[3]</code>, and the index prints " +
      "them back rather than asserting them. Ranking is BM25 at the standard <b>k1 = " +
      sdsearch_f2(sdsearch_K1) + ", b = " + sdsearch_f2(sdsearch_B) + "</b> with " +
      "idf = ln(1 + (N − df + 0.5)/(df + 0.5)) over N = " + sdsearch_IX.docs.length +
      " and avgdl = " + sdsearch_f3(sdsearch_AVGDL) + " terms. The <code>LIKE</code> cost is " +
      "the candidate offsets a naive substring match walks, len(body) − len(pattern) + 1 " +
      "per row; the scale ledger declares " + sdsearch_num(sdsearch_PROD_ROWS) + " posts of " +
      sdsearch_PROD_CHARS + " characters with a query term in 0.05% of them.",
    interval: 1500,

    scenarios: [sdsearch_tabLike(), sdsearch_tabIndex(), sdsearch_tabSkew()],

    draw: function (step, d, ctx) {
      var i, body = [];

      var head = d.flow([
        d.big(step.big, step.bigLabel, step.bigFlag),
        d.stat({
          label: "documents examined",
          value: String(step.examined),
          sub: "of " + sdsearch_DOCS.length + " in the corpus",
          flag: step.examined >= sdsearch_DOCS.length ? "bad"
            : step.examined ? "ok" : "idle"
        }),
        d.stat({
          label: "postings entries read",
          value: String(step.touched),
          sub: step.touched ? "term → docs lookups" : "no index consulted",
          flag: step.touched ? "ok" : "idle"
        }),
        d.stat({
          label: "results returned",
          value: String(step.results),
          sub: step.results ? "ranked" : "empty result set",
          flag: step.results ? "ok" : "idle"
        })
      ]);

      var lines = "";
      if (step.lines) {
        for (i = 0; i < step.lines.length; i++) {
          lines += d.row(step.lines[i][0], step.lines[i][1], step.lines[i][2]);
        }
      }

      var node = d.node({
        title: step.stage,
        status: ctx.done ? "END" : "STEP " + ctx.i + " / " + ctx.n,
        statusFlag: step.flag,
        badge: ctx.scenario.label,
        meta: "N = " + sdsearch_IX.docs.length + " docs · avgdl " +
          sdsearch_f3(sdsearch_AVGDL) + " · k1 " + sdsearch_f2(sdsearch_K1) +
          " · b " + sdsearch_f2(sdsearch_B),
        flag: step.flag,
        body: lines || undefined
      });

      if (step.rail && step.rail.length) {
        body.push(d.lane({ label: step.railLabel || "stages", cells: step.rail }));
      }
      if (step.bars && step.bars.length) {
        for (i = 0; i < step.bars.length; i++) body.push(d.bar(step.bars[i]));
      }
      if (step.table && step.table.rows && step.table.rows.length) {
        body.push(d.table(step.table.head, step.table.rows));
      }

      return d.stack([
        head,
        node,
        body.length ? d.stack(body) : "",
        d.note(
          "The engine only ever reads what the middle panel lists. A scan's cost grows with " +
          "the <b>table</b>; an index's cost grows with the <b>postings of the query's " +
          "terms</b> — and the second number is the one the index exists to shrink.",
          step.flag === "bad" ? "bad" : step.flag === "ok" ? "ok" : undefined
        )
      ]);
    }
  };

})();
