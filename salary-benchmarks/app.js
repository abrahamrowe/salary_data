/* High Impact Jobs Salary Benchmarks — static client-side app.
   Reads window.SALARY_DATA (from data.js). No dependencies, no network. */
(function () {
  "use strict";

  var DATA = window.SALARY_DATA;
  if (!DATA) { document.body.innerHTML = "<p style='padding:40px'>Could not load data.js</p>"; return; }

  var META = DATA.meta;
  var RECORDS = DATA.records;
  var SYM = { USD: "$", GBP: "£", EUR: "€" };
  var LEVELS = ["Junior", "Mid", "Senior"];
  var LEVEL_SUB = { Junior: "1–4 years", Mid: "5–9 years", Senior: "10+ years" };
  var SMALL_N = 5; // below this, flag the sample as small

  // ---- State ----
  var state = {
    cause: new Set(),
    skill: new Set(),
    loc: new Set(),
    currency: "USD"
  };
  var jobSort = { key: "d", dir: -1 }; // jobs tab sort; default = most recent first
  var lastModel = null;

  // Precompute option counts (over all records) for display in dropdowns
  var counts = { cause: {}, skill: {}, loc: {} };
  RECORDS.forEach(function (r) {
    counts.cause[r.c] = (counts.cause[r.c] || 0) + 1;
    r.s.forEach(function (s) { counts.skill[s] = (counts.skill[s] || 0) + 1; });
    r.l.forEach(function (l) { counts.loc[l] = (counts.loc[l] || 0) + 1; });
  });

  var OPTIONS = {
    cause: META.causeAreas,
    skill: META.skills,
    loc: META.locations
  };
  var LABELS = { cause: "Cause area", skill: "Skills", loc: "Location" };

  // ---- Currency conversion ----
  // usdPerUnit[c] = value of 1 unit of currency c in USD.
  var USD_PER_UNIT = META.usdPerUnit;
  function convert(amount, fromCur, toCur) {
    return amount * USD_PER_UNIT[fromCur] / USD_PER_UNIT[toCur];
  }

  // ---- Stats ----
  function percentile(sorted, p) {
    var n = sorted.length;
    if (n === 0) return null;
    if (n === 1) return sorted[0];
    var idx = (n - 1) * p;
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }
  function median(sorted) { return percentile(sorted, 0.5); }

  // ---- Formatting ----
  function fmt(v, cur) {
    if (v == null) return "—";
    return SYM[cur] + Math.round(v).toLocaleString("en-US");
  }
  function fmtAxis(v, cur) {
    if (v >= 1000) return SYM[cur] + (Math.round(v / 1000)) + "k";
    return SYM[cur] + Math.round(v);
  }

  // ---- Filtering ----
  function passesFilters(r) {
    if (state.cause.size && !state.cause.has(r.c)) return false;
    if (state.skill.size) {
      var hit = false;
      for (var i = 0; i < r.s.length; i++) { if (state.skill.has(r.s[i])) { hit = true; break; } }
      if (!hit) return false;
    }
    if (state.loc.size) {
      var lhit = false;
      for (var j = 0; j < r.l.length; j++) { if (state.loc.has(r.l[j])) { lhit = true; break; } }
      if (!lhit) return false;
    }
    return true;
  }

  // Build the per-seniority stats for the current filter + currency
  function compute() {
    var cur = state.currency;
    var filtered = RECORDS.filter(passesFilters);

    function statsFor(records) {
      var mids = [], lows = [], highs = [];
      records.forEach(function (r) {
        var lo = convert(r.lo, r.cu, cur);
        var hi = convert(r.hi, r.cu, cur);
        mids.push((lo + hi) / 2);
        lows.push(lo);
        highs.push(hi);
      });
      mids.sort(function (a, b) { return a - b; });
      lows.sort(function (a, b) { return a - b; });
      highs.sort(function (a, b) { return a - b; });
      return {
        n: records.length,
        p10: percentile(mids, 0.10),
        p25: percentile(mids, 0.25),
        p50: percentile(mids, 0.50),
        p75: percentile(mids, 0.75),
        p90: percentile(mids, 0.90),
        medLow: median(lows),
        medHigh: median(highs)
      };
    }

    var rows = LEVELS.map(function (lvl) {
      var recs = filtered.filter(function (r) { return r.e.indexOf(lvl) !== -1; });
      var s = statsFor(recs);
      s.level = lvl;
      return s;
    });
    var all = statsFor(filtered);
    all.level = "All roles";
    return { rows: rows, all: all, total: filtered.length, filtered: filtered };
  }

  // ---- Render: table ----
  function renderTable(model) {
    var body = document.getElementById("resultsBody");
    var empty = document.getElementById("emptyMsg");
    var table = document.getElementById("resultsTable");
    var chartSection = document.getElementById("chartSection");
    var cur = state.currency;

    if (model.total === 0) {
      body.innerHTML = "";
      empty.hidden = false;
      table.style.display = "none";
      chartSection.style.display = "none";
      return;
    }
    empty.hidden = true;
    table.style.display = "";
    chartSection.style.display = "";

    function row(s, isAll) {
      var smallN = s.n > 0 && s.n < SMALL_N;
      var sub = isAll ? "any seniority" : LEVEL_SUB[s.level];
      var jobsCell = s.n
        ? '<span class="' + (smallN ? "small-n" : "") + '">' + s.n + "</span>" +
          (smallN ? '<span class="small-n-flag">small sample</span>' : "")
        : "0";
      var range = (s.medLow == null) ? "—" : fmt(s.medLow, cur) + " – " + fmt(s.medHigh, cur);
      return '<tr class="' + (isAll ? "all-row" : "") + '">' +
        '<td class="seniority-cell">' + s.level + '<span class="seniority-sub">' + sub + "</span></td>" +
        '<td class="jobs-cell">' + jobsCell + "</td>" +
        "<td>" + fmt(s.p10, cur) + "</td>" +
        "<td>" + fmt(s.p25, cur) + "</td>" +
        '<td class="median-cell">' + fmt(s.p50, cur) + "</td>" +
        "<td>" + fmt(s.p75, cur) + "</td>" +
        "<td>" + fmt(s.p90, cur) + "</td>" +
        '<td class="range-cell">' + range + "</td>" +
        "</tr>";
    }

    var html = model.rows.map(function (s) { return row(s, false); }).join("");
    html += row(model.all, true);
    body.innerHTML = html;
  }

  // ---- Render: chart (SVG box/whisker per seniority) ----
  function renderChart(model) {
    var cur = state.currency;
    var container = document.getElementById("chart");
    var rows = model.rows.filter(function (s) { return s.n > 0; });
    if (!rows.length) { container.innerHTML = ""; return; }

    var W = 760, padL = 90, padR = 24, padTop = 10, rowH = 64, axisH = 30;
    var H = padTop + rows.length * rowH + axisH;
    var plotW = W - padL - padR;

    var maxV = 0;
    rows.forEach(function (s) { if (s.p90 > maxV) maxV = s.p90; });
    // round up to a nice ceiling
    var step = maxV > 200000 ? 50000 : (maxV > 80000 ? 25000 : 10000);
    var axisMax = Math.ceil(maxV / step) * step;
    if (axisMax === 0) axisMax = step;

    function x(v) { return padL + (v / axisMax) * plotW; }

    var svg = ['<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Salary ranges by seniority">'];

    // gridlines + axis labels
    var ticks = Math.round(axisMax / step);
    for (var t = 0; t <= ticks; t++) {
      var v = t * step;
      var gx = x(v);
      svg.push('<line class="axis-line" x1="' + gx + '" y1="' + padTop + '" x2="' + gx + '" y2="' + (padTop + rows.length * rowH) + '"/>');
      svg.push('<text class="axis-label" x="' + gx + '" y="' + (padTop + rows.length * rowH + 18) + '" text-anchor="middle">' + fmtAxis(v, cur) + "</text>");
    }

    rows.forEach(function (s, i) {
      var cy = padTop + i * rowH + rowH / 2;
      var boxTop = cy - 12, boxH = 24;

      // label
      svg.push('<text class="bar-label" x="' + (padL - 12) + '" y="' + (cy + 5) + '" text-anchor="end">' + s.level + "</text>");

      // whisker line p10..p90
      svg.push('<line x1="' + x(s.p10) + '" y1="' + cy + '" x2="' + x(s.p90) + '" y2="' + cy + '" stroke="var(--whisker)" stroke-width="2"/>');
      // whisker caps
      svg.push('<line x1="' + x(s.p10) + '" y1="' + (cy - 7) + '" x2="' + x(s.p10) + '" y2="' + (cy + 7) + '" stroke="var(--whisker)" stroke-width="2"/>');
      svg.push('<line x1="' + x(s.p90) + '" y1="' + (cy - 7) + '" x2="' + x(s.p90) + '" y2="' + (cy + 7) + '" stroke="var(--whisker)" stroke-width="2"/>');

      // box p25..p75
      var bx = x(s.p25), bw = Math.max(2, x(s.p75) - x(s.p25));
      svg.push('<rect x="' + bx + '" y="' + boxTop + '" width="' + bw + '" height="' + boxH + '" rx="1" fill="var(--box)" opacity="0.85"/>');
      // median line
      svg.push('<line x1="' + x(s.p50) + '" y1="' + (boxTop - 3) + '" x2="' + x(s.p50) + '" y2="' + (boxTop + boxH + 3) + '" stroke="var(--box-strong)" stroke-width="3"/>');

      // value labels: p10 (left), median (above), p90 (right)
      svg.push('<text class="val-label" x="' + (x(s.p10) - 6) + '" y="' + (cy + 4) + '" text-anchor="end">' + fmtAxis(s.p10, cur) + "</text>");
      svg.push('<text class="val-label" x="' + (x(s.p90) + 6) + '" y="' + (cy + 4) + '" text-anchor="start">' + fmtAxis(s.p90, cur) + "</text>");
      svg.push('<text class="val-label" x="' + x(s.p50) + '" y="' + (boxTop - 7) + '" text-anchor="middle" style="font-weight:700;fill:var(--box-strong)">' + fmt(s.p50, cur) + "</text>");
    });

    svg.push("</svg>");
    container.innerHTML = svg.join("");
  }

  // ---- Render: job listings table ----
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function formatDate(iso) {
    var p = (iso || "").split("-");
    if (p.length !== 3) return iso || "—";
    return parseInt(p[2], 10) + " " + MONTHS[parseInt(p[1], 10) - 1] + " " + p[0];
  }

  function jobSortVal(r, key, cur) {
    switch (key) {
      case "t": return (r.t || "").toLowerCase();
      case "o": return (r.o || "").toLowerCase();
      case "c": return (r.c || "").toLowerCase();
      case "sen": return Math.min.apply(null, r.e.map(function (x) { return LEVELS.indexOf(x); }));
      case "loc": return ((r.ci || r.co) || "").toLowerCase();
      case "sal": return (convert(r.lo, r.cu, cur) + convert(r.hi, r.cu, cur)) / 2;
      case "d": return r.d || "";
      default: return "";
    }
  }

  function updateSortArrows() {
    document.querySelectorAll("#jobsTable thead th[data-sort]").forEach(function (th) {
      var ex = th.querySelector(".sort-arrow");
      if (ex) ex.remove();
      if (th.getAttribute("data-sort") === jobSort.key) {
        var s = document.createElement("span");
        s.className = "sort-arrow";
        s.textContent = jobSort.dir > 0 ? "▲" : "▼";
        th.appendChild(s);
      }
    });
  }

  function renderJobs(model) {
    var cur = state.currency;
    var body = document.getElementById("jobsBody");
    var empty = document.getElementById("jobsEmptyMsg");
    var table = document.getElementById("jobsTable");
    var hint = document.getElementById("jobsHint");

    var recs = model.filtered.slice();
    if (!recs.length) {
      body.innerHTML = "";
      empty.hidden = false;
      table.style.display = "none";
      hint.textContent = "";
      updateSortArrows();
      return;
    }
    empty.hidden = true;
    table.style.display = "";

    var k = jobSort.key, dir = jobSort.dir;
    recs.sort(function (a, b) {
      var va = jobSortVal(a, k, cur), vb = jobSortVal(b, k, cur);
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return 0;
    });

    hint.innerHTML = "Showing <strong>" + recs.length.toLocaleString("en-US") + "</strong> job" +
      (recs.length === 1 ? "" : "s") + ". Click a column header to sort; click a title to open the posting.";

    body.innerHTML = recs.map(function (r) {
      var range = fmt(convert(r.lo, r.cu, cur), cur) + " – " + fmt(convert(r.hi, r.cu, cur), cur);
      var orig = (r.cu !== cur) ? '<span class="sal-orig">from ' + r.cu + "</span>" : "";
      var safeLink = /^https?:\/\//i.test(r.k) ? r.k : "";
      var title = safeLink
        ? '<a class="job-title" href="' + escapeAttr(safeLink) + '" target="_blank" rel="noopener">' + escapeHtml(r.t) + "</a>"
        : '<span class="job-title nolink">' + escapeHtml(r.t) + "</span>";
      var loc = escapeHtml((r.ci || "").replace(/,/g, ", "));
      var locSub = "";
      if (loc && r.co) locSub = '<span class="job-sub">' + escapeHtml(r.co) + "</span>";
      else if (!loc && r.co) loc = escapeHtml(r.co);
      var sen = r.e.map(function (x) { return '<span class="sen-pill">' + x + "</span>"; }).join("");
      return "<tr>" +
        "<td>" + title + "</td>" +
        '<td class="job-org">' + escapeHtml(r.o) + "</td>" +
        "<td>" + escapeHtml(r.c) + "</td>" +
        "<td>" + sen + "</td>" +
        '<td class="job-skills">' + escapeHtml(r.s.join(", ")) + "</td>" +
        '<td class="job-loc">' + loc + locSub + "</td>" +
        '<td class="num">' + range + orig + "</td>" +
        '<td class="num">' + (r.d ? formatDate(r.d) : "—") + "</td>" +
        "</tr>";
    }).join("");

    updateSortArrows();
  }

  // ---- Render: active filter chips + sample count ----
  function renderActive(model) {
    var chips = document.getElementById("chips");
    var parts = [];
    ["cause", "skill", "loc"].forEach(function (key) {
      state[key].forEach(function (val) {
        parts.push('<span class="chip">' + escapeHtml(val) +
          '<button type="button" data-key="' + key + '" data-val="' + escapeAttr(val) + '" aria-label="Remove ' + escapeAttr(val) + '">×</button></span>');
      });
    });
    chips.innerHTML = parts.length ? parts.join("") : '<span class="chips-empty">No filters — showing all jobs</span>';

    document.getElementById("sampleCount").innerHTML =
      "<strong>" + model.total.toLocaleString("en-US") + "</strong> job" + (model.total === 1 ? "" : "s") + " sampled";

    // update dropdown button counts
    ["cause", "skill", "loc"].forEach(function (key) {
      var el = document.querySelector("#ms-" + key);
      var cnt = el.querySelector(".ms-count");
      var size = state[key].size;
      cnt.textContent = size ? size + " selected" : "All";
      el.classList.toggle("active", size > 0);
    });
  }

  function escapeHtml(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }

  // ---- Main render ----
  function render() {
    var model = compute();
    lastModel = model;
    renderTable(model);
    renderChart(model);
    renderJobs(model);
    renderActive(model);
    document.getElementById("jobsTabCount").textContent = model.total.toLocaleString("en-US");
  }

  // ---- Build multi-select dropdowns ----
  function buildDropdown(key) {
    var el = document.querySelector("#ms-" + key);
    var panel = el.querySelector(".ms-panel");
    var opts = OPTIONS[key];

    var html = '<div class="ms-actions"><button type="button" data-act="all">Select all</button>' +
      '<button type="button" data-act="clear">Clear</button></div>';
    html += opts.map(function (o) {
      var n = counts[key][o] || 0;
      return '<label class="ms-opt"><input type="checkbox" value="' + escapeAttr(o) + '">' +
        "<span>" + escapeHtml(o) + '</span><span class="opt-n">' + n + "</span></label>";
    }).join("");
    panel.innerHTML = html;

    // toggle open
    var btn = el.querySelector(".ms-btn");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var wasOpen = el.classList.contains("open");
      closeAll();
      if (!wasOpen) { el.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
    });
    panel.addEventListener("click", function (e) { e.stopPropagation(); });

    // checkbox change
    panel.addEventListener("change", function (e) {
      if (e.target.matches("input[type=checkbox]")) {
        var val = e.target.value;
        if (e.target.checked) state[key].add(val); else state[key].delete(val);
        render();
      }
    });

    // select all / clear
    panel.querySelector('[data-act="all"]').addEventListener("click", function () {
      opts.forEach(function (o) { state[key].add(o); });
      syncChecks(key); render();
    });
    panel.querySelector('[data-act="clear"]').addEventListener("click", function () {
      state[key].clear(); syncChecks(key); render();
    });
  }

  function syncChecks(key) {
    var panel = document.querySelector("#ms-" + key + " .ms-panel");
    panel.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
      cb.checked = state[key].has(cb.value);
    });
  }

  function closeAll() {
    document.querySelectorAll(".ms.open").forEach(function (el) {
      el.classList.remove("open");
      el.querySelector(".ms-btn").setAttribute("aria-expanded", "false");
    });
  }

  // ---- Wire up everything ----
  function init() {
    ["cause", "skill", "loc"].forEach(buildDropdown);

    document.addEventListener("click", closeAll);

    // chip removal
    document.getElementById("chips").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-key]");
      if (!b) return;
      state[b.getAttribute("data-key")].delete(b.getAttribute("data-val"));
      syncChecks(b.getAttribute("data-key"));
      render();
    });

    // tab switching
    document.getElementById("tabs").addEventListener("click", function (e) {
      var b = e.target.closest(".tab");
      if (!b) return;
      var tab = b.getAttribute("data-tab");
      this.querySelectorAll(".tab").forEach(function (t) {
        var on = t === b;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.getElementById("panel-benchmarks").hidden = tab !== "benchmarks";
      document.getElementById("panel-jobs").hidden = tab !== "jobs";
    });

    // job table column sorting
    document.querySelector("#jobsTable thead").addEventListener("click", function (e) {
      var th = e.target.closest("th[data-sort]");
      if (!th) return;
      var key = th.getAttribute("data-sort");
      if (jobSort.key === key) {
        jobSort.dir *= -1;
      } else {
        jobSort.key = key;
        jobSort.dir = (key === "sal" || key === "d") ? -1 : 1; // numeric/date desc, text asc
      }
      if (lastModel) renderJobs(lastModel);
    });

    // currency segmented control
    document.getElementById("curSeg").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-cur]");
      if (!b) return;
      state.currency = b.getAttribute("data-cur");
      this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("active", x === b); });
      render();
    });

    // reset
    document.getElementById("resetBtn").addEventListener("click", function () {
      state.cause.clear(); state.skill.clear(); state.loc.clear();
      state.currency = "USD";
      ["cause", "skill", "loc"].forEach(syncChecks);
      document.querySelectorAll("#curSeg button").forEach(function (x) {
        x.classList.toggle("active", x.getAttribute("data-cur") === "USD");
      });
      render();
    });

    // meta lines
    document.getElementById("metaLine").innerHTML =
      "Jobs posted <strong>" + META.dateRangeLabel + "</strong> · <strong>" +
      META.totalJobs.toLocaleString("en-US") + "</strong> jobs · figures shown in your selected currency";

    var u = META.unitsPerUsd;
    document.getElementById("ratesNote").innerHTML =
      "<strong>Exchange rates</strong> are mid-market rates as of " + META.rateDate + ": " +
      "1 USD = " + u.GBP + " GBP = " + u.EUR + " EUR.";

    document.getElementById("footerMeta").textContent =
      "High Impact Jobs Salary Benchmarks · " + META.totalJobs.toLocaleString("en-US") +
      " jobs · exchange rates as of " + META.rateDate;

    render();
  }

  init();
})();
