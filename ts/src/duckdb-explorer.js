/**
 * DuckDB-WASM data explorer — browser module for SQL querying of SOLAR LINE data.
 * Lazy-loads DuckDB-WASM only when the explorer page is visited.
 * Integrates with uPlot for query-driven visualization.
 */

/* global uPlot */

(function () {
  "use strict";

  // DuckDB-WASM CDN URLs
  var DUCKDB_CDN = "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/dist";

  var db = null;
  var conn = null;
  var statusEl = null;
  var queryInput = null;
  var resultEl = null;
  var chartEl = null;
  var presetsEl = null;

  // Preset queries for common analyses
  var PRESET_QUERIES = [
    {
      label: "全軌道遷移一覧",
      description: "エピソード別の全遷移とΔV・判定を表示",
      sql: "SELECT episode, id, description, computedDeltaV AS dv_km_s, verdict FROM transfers ORDER BY episode, id",
    },
    {
      label: "ΔV ランキング",
      description: "計算ΔVの大きい順に並べ替え",
      sql: "SELECT id, episode, description, computedDeltaV AS dv_km_s, verdict FROM transfers WHERE computedDeltaV IS NOT NULL ORDER BY computedDeltaV DESC",
    },
    {
      label: "判定別集計",
      description: "verdict ごとの遷移数",
      sql: "SELECT verdict, COUNT(*) AS count FROM transfers GROUP BY verdict ORDER BY count DESC",
    },
    {
      label: "エピソード別統計",
      description: "各エピソードの遷移数と平均ΔV",
      sql: "SELECT episode, COUNT(*) AS transfer_count, ROUND(AVG(computedDeltaV), 2) AS avg_dv_km_s, MIN(computedDeltaV) AS min_dv, MAX(computedDeltaV) AS max_dv FROM transfers WHERE computedDeltaV IS NOT NULL GROUP BY episode ORDER BY episode",
    },
    {
      label: "話者別台詞数",
      description: "話者ごとの台詞数を集計",
      sql: "SELECT speakerName, COUNT(*) AS line_count, COUNT(DISTINCT episode) AS episodes FROM dialogue GROUP BY speakerName ORDER BY line_count DESC",
    },
    {
      label: "エピソード別台詞数",
      description: "各エピソードの台詞数と話者数",
      sql: "SELECT episode, COUNT(*) AS lines, COUNT(DISTINCT speakerName) AS speakers FROM dialogue GROUP BY episode ORDER BY episode",
    },
    {
      label: "DAG ノード種別",
      description: "DAG ノードの種別ごとの数",
      sql: "SELECT type, status, COUNT(*) AS count FROM dag_nodes GROUP BY type, status ORDER BY type, status",
    },
    {
      label: "DAG 依存関係（上位）",
      description: "被依存数の多いノード上位10件",
      sql: "SELECT e.\"to\" AS node_id, n.label, n.type, COUNT(*) AS dependents FROM dag_edges e JOIN dag_nodes n ON e.\"to\" = n.id GROUP BY e.\"to\", n.label, n.type ORDER BY dependents DESC LIMIT 10",
    },
  ];

  /** Set status message */
  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "explorer-status" + (isError ? " explorer-error" : "");
  }

  /** Load DuckDB-WASM dynamically */
  async function loadDuckDB() {
    setStatus("DuckDB-WASM を読み込み中…");

    // Dynamic import of DuckDB-WASM
    var duckdb = await import(DUCKDB_CDN + "/duckdb-eh.mjs");

    var DUCKDB_BUNDLES = {
      mvp: {
        mainModule: DUCKDB_CDN + "/duckdb-mvp.wasm",
        mainWorker: DUCKDB_CDN + "/duckdb-browser-mvp.worker.js",
      },
      eh: {
        mainModule: DUCKDB_CDN + "/duckdb-eh.wasm",
        mainWorker: DUCKDB_CDN + "/duckdb-browser-eh.worker.js",
      },
    };

    var bundle = await duckdb.selectBundle(DUCKDB_BUNDLES);
    var worker = new Worker(bundle.mainWorker);
    var logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule);
    conn = await db.connect();

    setStatus("データを読み込み中…");
  }

  /** Load explorer data JSON and register as DuckDB tables */
  async function loadData() {
    var data;

    // Support inline test data for standalone example pages
    if (window.__EXPLORER_TEST_DATA) {
      data = window.__EXPLORER_TEST_DATA;
    } else {
      var basePath = document.querySelector("meta[name='base-path']");
      var base = basePath ? basePath.content : ".";
      var dataUrl = base + "/explorer-data.json";
      var resp = await fetch(dataUrl);
      if (!resp.ok) throw new Error("explorer-data.json の取得に失敗: " + resp.status);
      data = await resp.json();
    }

    await conn.query("DROP TABLE IF EXISTS transfers");
    await conn.query("DROP TABLE IF EXISTS dialogue");
    await conn.query("DROP TABLE IF EXISTS dag_nodes");
    await conn.query("DROP TABLE IF EXISTS dag_edges");

    // Create transfers table
    if (data.transfers.length > 0) {
      var cols = Object.keys(data.transfers[0]);
      var colDefs = cols.map(function (c) {
        var val = data.transfers[0][c];
        if (typeof val === "number") return '"' + c + '" DOUBLE';
        if (typeof val === "boolean") return '"' + c + '" BOOLEAN';
        return '"' + c + '" VARCHAR';
      }).join(", ");
      await conn.query("CREATE TABLE transfers (" + colDefs + ")");

      for (var t of data.transfers) {
        var vals = cols.map(function (c) {
          var v = t[c];
          if (v === null || v === undefined) return "NULL";
          if (typeof v === "number") return String(v);
          if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
          return "'" + String(v).replace(/'/g, "''") + "'";
        }).join(", ");
        await conn.query("INSERT INTO transfers VALUES (" + vals + ")");
      }
    } else {
      await conn.query("CREATE TABLE transfers (id VARCHAR, episode INTEGER, description VARCHAR, verdict VARCHAR)");
    }

    // Create dialogue table
    if (data.dialogue.length > 0) {
      await conn.query("CREATE TABLE dialogue (episode INTEGER, lineId VARCHAR, speakerId VARCHAR, speakerName VARCHAR, text VARCHAR, startMs INTEGER, endMs INTEGER, confidence VARCHAR, sceneId VARCHAR)");
      for (var d of data.dialogue) {
        await conn.query("INSERT INTO dialogue VALUES (" +
          d.episode + ", " +
          "'" + d.lineId.replace(/'/g, "''") + "', " +
          "'" + d.speakerId.replace(/'/g, "''") + "', " +
          "'" + d.speakerName.replace(/'/g, "''") + "', " +
          "'" + d.text.replace(/'/g, "''") + "', " +
          d.startMs + ", " + d.endMs + ", " +
          "'" + d.confidence.replace(/'/g, "''") + "', " +
          "'" + (d.sceneId || "").replace(/'/g, "''") + "')");
      }
    } else {
      await conn.query("CREATE TABLE dialogue (episode INTEGER, lineId VARCHAR, speakerName VARCHAR, text VARCHAR)");
    }

    // Create DAG tables
    if (data.dagNodes.length > 0) {
      await conn.query("CREATE TABLE dag_nodes (id VARCHAR, label VARCHAR, type VARCHAR, status VARCHAR)");
      for (var n of data.dagNodes) {
        await conn.query("INSERT INTO dag_nodes VALUES ('" +
          n.id.replace(/'/g, "''") + "', '" +
          n.label.replace(/'/g, "''") + "', '" +
          n.type.replace(/'/g, "''") + "', '" +
          n.status.replace(/'/g, "''") + "')");
      }
    } else {
      await conn.query("CREATE TABLE dag_nodes (id VARCHAR, label VARCHAR, type VARCHAR, status VARCHAR)");
    }

    if (data.dagEdges.length > 0) {
      await conn.query("CREATE TABLE dag_edges (\"from\" VARCHAR, \"to\" VARCHAR)");
      for (var e of data.dagEdges) {
        await conn.query("INSERT INTO dag_edges VALUES ('" +
          e.from.replace(/'/g, "''") + "', '" +
          e.to.replace(/'/g, "''") + "')");
      }
    } else {
      await conn.query('CREATE TABLE dag_edges ("from" VARCHAR, "to" VARCHAR)');
    }

    var stats = data.transfers.length + " 遷移, " + data.dialogue.length + " 台詞, " + data.dagNodes.length + " DAG ノード";
    setStatus("準備完了 — " + stats);
  }

  /** Execute SQL query and display results */
  async function executeQuery(sql) {
    if (!conn) {
      setStatus("DuckDB が初期化されていません", true);
      return;
    }

    resultEl.innerHTML = "";
    if (chartEl) chartEl.innerHTML = "";

    try {
      var startTime = performance.now();
      var result = await conn.query(sql);
      var elapsed = (performance.now() - startTime).toFixed(1);

      var columns = result.schema.fields.map(function (f) { return f.name; });
      var rows = result.toArray().map(function (row) {
        var obj = {};
        columns.forEach(function (col) { obj[col] = row[col]; });
        return obj;
      });

      renderResultTable(columns, rows, elapsed);
      tryRenderChart(columns, rows);
    } catch (err) {
      resultEl.innerHTML = '<div class="explorer-error">エラー: ' + escapeHtml(err.message) + "</div>";
    }
  }

  /** Render query results as an HTML table */
  function renderResultTable(columns, rows, elapsed) {
    if (rows.length === 0) {
      resultEl.innerHTML = '<p class="explorer-empty">結果なし (' + elapsed + ' ms)</p>';
      return;
    }

    var html = '<div class="explorer-result-meta">' + rows.length + ' 行 (' + elapsed + ' ms)</div>';
    html += '<div class="explorer-table-wrap"><table class="explorer-table"><thead><tr>';
    for (var c of columns) {
      html += "<th>" + escapeHtml(c) + "</th>";
    }
    html += "</tr></thead><tbody>";

    var maxRows = Math.min(rows.length, 500);
    for (var i = 0; i < maxRows; i++) {
      html += "<tr>";
      for (var col of columns) {
        var val = rows[i][col];
        var display = val === null || val === undefined ? '<span class="null-val">NULL</span>' : escapeHtml(formatValue(val));
        html += "<td>" + display + "</td>";
      }
      html += "</tr>";
    }
    html += "</tbody></table></div>";

    if (rows.length > maxRows) {
      html += '<p class="explorer-truncated">（' + maxRows + ' / ' + rows.length + ' 行を表示）</p>';
    }

    resultEl.innerHTML = html;
  }

  /** Try to render a uPlot chart from query results */
  function tryRenderChart(columns, rows) {
    if (!chartEl || typeof uPlot === "undefined") return;
    if (rows.length < 2) return;

    // Detect numeric columns for charting
    var numericCols = columns.filter(function (c) {
      return rows.some(function (r) { return typeof r[c] === "number" || (typeof r[c] === "bigint"); });
    });

    var labelCol = columns.find(function (c) { return !numericCols.includes(c); });

    if (numericCols.length === 0) return;

    // Build uPlot data: x = row index (or label index), y = numeric columns
    var xData = rows.map(function (_, i) { return i; });
    var data = [xData];
    var series = [{}]; // x-axis series placeholder

    var colors = ["#3fb950", "#58a6ff", "#ff6644", "#d2a8ff", "#ffaa00", "#79c0ff"];
    numericCols.forEach(function (col, ci) {
      series.push({
        label: col,
        stroke: colors[ci % colors.length],
        width: 2,
      });
      data.push(rows.map(function (r) { return Number(r[col]) || 0; }));
    });

    chartEl.innerHTML = "";
    var target = document.createElement("div");
    chartEl.appendChild(target);

    var opts = {
      width: Math.min(chartEl.clientWidth || 600, 800),
      height: 250,
      axes: [
        {
          label: labelCol || "行",
          stroke: "#aaa",
          grid: { stroke: "#333" },
          values: labelCol ? function (u, vals) {
            return vals.map(function (v) {
              var idx = Math.round(v);
              if (idx >= 0 && idx < rows.length) {
                var label = String(rows[idx][labelCol] || "");
                return label.length > 12 ? label.slice(0, 12) + "…" : label;
              }
              return "";
            });
          } : undefined,
        },
        { label: numericCols.length === 1 ? numericCols[0] : "値", stroke: "#aaa", grid: { stroke: "#333" } },
      ],
      series: series,
    };

    new uPlot(opts, data, target);
  }

  /** Format a value for display */
  function formatValue(val) {
    if (typeof val === "number") {
      if (Number.isInteger(val)) return String(val);
      return val.toFixed(4);
    }
    if (typeof val === "bigint") return String(val);
    return String(val);
  }

  /** Escape HTML special characters */
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Render preset query buttons */
  function renderPresets() {
    if (!presetsEl) return;
    presetsEl.innerHTML = "";

    for (var preset of PRESET_QUERIES) {
      var btn = document.createElement("button");
      btn.className = "preset-btn";
      btn.textContent = preset.label;
      btn.title = preset.description;
      btn.setAttribute("data-sql", preset.sql);
      btn.addEventListener("click", function () {
        var sql = this.getAttribute("data-sql");
        if (queryInput) queryInput.value = sql;
        executeQuery(sql);
      });
      presetsEl.appendChild(btn);
    }
  }

  /** Initialize the explorer */
  async function init() {
    statusEl = document.getElementById("explorer-status");
    queryInput = document.getElementById("explorer-query");
    resultEl = document.getElementById("explorer-result");
    chartEl = document.getElementById("explorer-chart");
    presetsEl = document.getElementById("explorer-presets");

    if (!statusEl || !queryInput || !resultEl) return;

    renderPresets();

    // Bind execute button
    var execBtn = document.getElementById("explorer-exec");
    if (execBtn) {
      execBtn.addEventListener("click", function () {
        if (queryInput.value.trim()) executeQuery(queryInput.value.trim());
      });
    }

    // Ctrl+Enter to execute
    queryInput.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (queryInput.value.trim()) executeQuery(queryInput.value.trim());
      }
    });

    // Schema info button
    var schemaBtn = document.getElementById("explorer-schema");
    if (schemaBtn) {
      schemaBtn.addEventListener("click", function () {
        executeQuery("SELECT table_name, column_name, data_type FROM information_schema.columns ORDER BY table_name, ordinal_position");
      });
    }

    try {
      await loadDuckDB();
      await loadData();
    } catch (err) {
      setStatus("初期化エラー: " + err.message, true);
      console.error("DuckDB Explorer init error:", err);
    }
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
