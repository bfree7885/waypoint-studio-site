/**
 * Activation Zone engine for SignalTerrain (SOTA).
 *
 * Summit elevation (SOTA catalogue) + Vertical Distance + DEM grid
 * → 4-connected terrain above the threshold associated with the summit
 * → closed polygon of the connected cell footprints. Never a radius.
 */
(function (global) {
  "use strict";

  var ALGORITHM_VERSION = "signalterrain-sota-az-v0";
  var MATERIAL_DISCREPANCY_M = 5;
  var CONFLICT_M = 15;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function emptyAz(query, status, reason, extra) {
    var q = query || {};
    var base = {
      status: status,
      reason: reason || null,
      summitId: q.summitId || null,
      summitCoordinate: q.coordinate || null,
      summitElevationUsedM: null,
      summitElevationSource: null,
      demSummitM: null,
      elevationDiscrepancyM: null,
      rule: q.rule || null,
      thresholdM: null,
      geometry: null,
      latlngs: null,
      dem: q.demMeta || null,
      retrievedAt: null,
      calculationVersion: ALGORITHM_VERSION,
      confidence: null,
      edgeClipped: false,
      cellCount: 0,
      areaHintKm2: null
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        base[k] = extra[k];
      });
    }
    return base;
  }

  function cellLat(grid, r) {
    if (!grid.rows || grid.rows === 1) return grid.nw.lat;
    return grid.nw.lat + (r / (grid.rows - 1)) * (grid.se.lat - grid.nw.lat);
  }

  function cellLng(grid, c) {
    if (!grid.cols || grid.cols === 1) return grid.nw.lng;
    return grid.nw.lng + (c / (grid.cols - 1)) * (grid.se.lng - grid.nw.lng);
  }

  function nearestCell(grid, lat, lng) {
    var best = 0;
    var bestD = Infinity;
    var i;
    for (var r = 0; r < grid.rows; r += 1) {
      var la = cellLat(grid, r);
      for (var c = 0; c < grid.cols; c += 1) {
        var lo = cellLng(grid, c);
        var dlat = la - lat;
        var dlng = lo - lng;
        var d = dlat * dlat + dlng * dlng;
        i = r * grid.cols + c;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    return { index: best, r: Math.floor(best / grid.cols), c: best % grid.cols };
  }

  function floodFill4(mask, rows, cols, sr, sc) {
    var n = rows * cols;
    var seen = new Uint8Array(n);
    var out = [];
    function push(r, c) {
      if (r < 0 || c < 0 || r >= rows || c >= cols) return;
      var i = r * cols + c;
      if (seen[i] || !mask[i]) return;
      seen[i] = 1;
      out.push(i);
    }
    push(sr, sc);
    for (var nq = 0; nq < out.length; nq += 1) {
      var i = out[nq];
      var r = Math.floor(i / cols);
      var c = i % cols;
      push(r - 1, c);
      push(r + 1, c);
      push(r, c - 1);
      push(r, c + 1);
    }
    return { cells: out, seen: seen };
  }

  /**
   * Closed outline of 4-connected qualifying cells (square cell footprint).
   * Reliable for cones, ridges, and single-cell peaks. Not a radius.
   */
  function maskOutline(seen, grid) {
    var rows = grid.rows;
    var cols = grid.cols;
    function on(r, c) {
      if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
      return !!seen[r * cols + c];
    }
    function at(r, c) {
      var lat0 = cellLat(grid, 0);
      var lat1 = cellLat(grid, rows - 1);
      var lng0 = cellLng(grid, 0);
      var lng1 = cellLng(grid, cols - 1);
      var rf = rows === 1 ? 0 : r / (rows - 1);
      var cf = cols === 1 ? 0 : c / (cols - 1);
      return [lat0 + rf * (lat1 - lat0), lng0 + cf * (lng1 - lng0)];
    }
    var segs = [];
    function add(a, b) {
      segs.push([a, b]);
    }
    var r;
    var c;
    for (r = 0; r < rows; r += 1) {
      for (c = 0; c < cols; c += 1) {
        if (!on(r, c)) continue;
        if (!on(r - 1, c)) add(at(r - 0.5, c - 0.5), at(r - 0.5, c + 0.5));
        if (!on(r + 1, c)) add(at(r + 0.5, c + 0.5), at(r + 0.5, c - 0.5));
        if (!on(r, c - 1)) add(at(r + 0.5, c - 0.5), at(r - 0.5, c - 0.5));
        if (!on(r, c + 1)) add(at(r - 0.5, c + 0.5), at(r + 0.5, c + 0.5));
      }
    }
    return stitchRings(segs);
  }

  function key(p) {
    return p[0].toFixed(7) + "," + p[1].toFixed(7);
  }

  function stitchRings(segs) {
    var unused = segs.slice();
    var rings = [];
    function take(fromKey) {
      for (var i = 0; i < unused.length; i += 1) {
        var s = unused[i];
        if (key(s[0]) === fromKey) {
          unused.splice(i, 1);
          return s;
        }
        if (key(s[1]) === fromKey) {
          unused.splice(i, 1);
          return [s[1], s[0]];
        }
      }
      return null;
    }
    while (unused.length) {
      var start = unused.pop();
      var ring = [start[0], start[1]];
      var guard = 0;
      while (guard < 20000) {
        guard += 1;
        var nxt = take(key(ring[ring.length - 1]));
        if (!nxt) break;
        ring.push(nxt[1]);
        if (key(nxt[1]) === key(ring[0])) break;
      }
      if (ring.length >= 4) rings.push(ring);
    }
    rings.sort(function (a, b) {
      return Math.abs(ringArea(b)) - Math.abs(ringArea(a));
    });
    return rings;
  }

  function ringArea(ring) {
    var a = 0;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      a += ring[j][1] * ring[i][0] - ring[i][1] * ring[j][0];
    }
    return a / 2;
  }

  function makeSyntheticGrid(spec) {
    var rows = spec.rows;
    var cols = spec.cols;
    var cell = spec.cellSizeM || 10;
    var origin = spec.origin || { lat: 42, lng: -74 };
    var Geo = global.SignalTerrainSotaGeo;
    var nw = Geo.destinationOffset(origin.lat, origin.lng, ((rows - 1) / 2) * cell, -((cols - 1) / 2) * cell);
    var se = Geo.destinationOffset(origin.lat, origin.lng, -((rows - 1) / 2) * cell, ((cols - 1) / 2) * cell);
    var elevations = [];
    var grid = { rows: rows, cols: cols, cellSizeM: cell, nw: nw, se: se };
    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < cols; c += 1) {
        var lat = cellLat(grid, r);
        var lng = cellLng(grid, c);
        elevations.push(spec.fn(r, c, lat, lng, grid));
      }
    }
    return { grid: grid, elevations: elevations };
  }

  function computeAz(summit, dem, options) {
    var opts = options || {};
    var Rules = global.SignalTerrainSotaRules;
    var Geo = global.SignalTerrainSotaGeo;
    var query = {
      summitId: summit && (summit.id || summit.reference),
      coordinate: summit && summit.lat != null ? { lat: summit.lat, lng: summit.lng } : null
    };
    if (!Rules) return emptyAz(query, "rule-unavailable", "SOTA rule metadata is unavailable.");
    var rule = opts.rule || Rules.ruleForSummit(summit);
    query.rule = rule;
    if (!rule || rule.status === "unavailable" || rule.verticalDistanceM == null) {
      return emptyAz(query, "rule-unavailable", (rule && rule.reason) || "Applicable SOTA Activation Zone rule is unavailable.");
    }
    if (!summit || !isFiniteNumber(summit.lat) || !isFiniteNumber(summit.lng)) {
      return emptyAz(query, "malformed", "Summit coordinate is missing.");
    }
    if (!isFiniteNumber(summit.elevationM)) {
      return emptyAz(query, "malformed", "SOTA catalogue elevation is missing; the Activation Zone is not guessed.");
    }
    if (!dem || !dem.grid || !Array.isArray(dem.elevations)) {
      return emptyAz(query, "dem-unavailable", "DEM data is unavailable for this summit.");
    }
    var grid = dem.grid;
    var elev = dem.elevations;
    if (elev.length !== grid.rows * grid.cols) {
      return emptyAz(query, "malformed", "Malformed terrain grid.");
    }
    var missing = 0;
    var i;
    for (i = 0; i < elev.length; i += 1) {
      if (!isFiniteNumber(elev[i])) missing += 1;
    }
    if (missing === elev.length) {
      return emptyAz(query, "dem-unavailable", "DEM samples are empty.");
    }
    if (missing > elev.length * 0.25) {
      return emptyAz(query, "insufficient-dem", "Too much DEM no-data to form a reliable Activation Zone.");
    }
    var sotaM = summit.elevationM;
    var threshold = Rules.thresholdM(sotaM, rule);
    var near = nearestCell(grid, summit.lat, summit.lng);
    var demAt = elev[near.index];
    var discrepancy = isFiniteNumber(demAt) ? demAt - sotaM : null;
    var extra = {
      summitElevationUsedM: sotaM,
      summitElevationSource: "sota-catalogue",
      demSummitM: demAt,
      elevationDiscrepancyM: discrepancy,
      thresholdM: threshold,
      dem: dem.source || null,
      retrievedAt: (dem.source && dem.source.retrievedAt) || new Date().toISOString()
    };
    function elevationConflictAz() {
      if (discrepancy == null || Math.abs(discrepancy) < CONFLICT_M || (isFiniteNumber(demAt) && demAt >= threshold)) {
        return null;
      }
      return emptyAz(
        query,
        "elevation-conflict",
        "SOTA catalogue elevation and DEM elevation at the summit coordinate disagree by " +
          Math.abs(discrepancy).toFixed(1) +
          " m, and the DEM cell is below the Activation threshold. The SOTA record is not altered.",
        extra
      );
    }
    var mask = new Uint8Array(elev.length);
    var above = 0;
    for (i = 0; i < elev.length; i += 1) {
      if (isFiniteNumber(elev[i]) && elev[i] >= threshold) {
        mask[i] = 1;
        above += 1;
      }
    }
    if (!above) {
      return elevationConflictAz() || emptyAz(query, "calculation-failed", "No DEM cells reach the Activation threshold derived from the SOTA summit elevation.", extra);
    }
    var seed = near;
    if (!mask[seed.index]) {
      var best = -Infinity;
      var bi = -1;
      for (var rr = seed.r - 2; rr <= seed.r + 2; rr += 1) {
        for (var cc = seed.c - 2; cc <= seed.c + 2; cc += 1) {
          if (rr < 0 || cc < 0 || rr >= grid.rows || cc >= grid.cols) continue;
          var ii = rr * grid.cols + cc;
          if (mask[ii] && elev[ii] > best) {
            best = elev[ii];
            bi = ii;
          }
        }
      }
      if (bi < 0) {
        return (
          elevationConflictAz() ||
          emptyAz(
            query,
            "calculation-failed",
            "The DEM cell at the SOTA coordinate is below the Activation threshold, and no neighbouring qualifying cell is attached.",
            extra
          )
        );
      }
      seed = { index: bi, r: Math.floor(bi / grid.cols), c: bi % grid.cols };
    }
    var filled = floodFill4(mask, grid.rows, grid.cols, seed.r, seed.c);
    if (!filled.cells.length) {
      return emptyAz(query, "calculation-failed", "Terrain connectivity did not yield qualifying cells associated with this summit.", extra);
    }
    var edgeClipped = false;
    for (i = 0; i < filled.cells.length; i += 1) {
      var r = Math.floor(filled.cells[i] / grid.cols);
      var c = filled.cells[i] % grid.cols;
      if (r === 0 || c === 0 || r === grid.rows - 1 || c === grid.cols - 1) {
        edgeClipped = true;
        break;
      }
    }
    var disconnected = above - filled.cells.length;
    var rings = maskOutline(filled.seen, grid);
    if (!rings.length) {
      return emptyAz(query, "calculation-failed", "A contour could not be traced around the qualifying terrain.", extra);
    }
    var outer = rings[0];
    if (key(outer[0]) !== key(outer[outer.length - 1])) outer.push(outer[0]);
    var latlngs = outer;
    var coords = latlngs.map(function (p) {
      return [p[1], p[0]];
    });
    var cellAreaKm2 = ((grid.cellSizeM || 10) * (grid.cellSizeM || 10)) / 1e6;
    var confidence = "ok";
    var reasons = [];
    if (discrepancy != null && Math.abs(discrepancy) >= MATERIAL_DISCREPANCY_M) {
      confidence = "elevation-discrepancy";
      reasons.push(
        "SOTA catalogue elevation is " +
          sotaM.toFixed(1) +
          " m; DEM at the coordinate is " +
          demAt.toFixed(1) +
          " m. The SOTA record is not altered. The threshold uses the SOTA catalogue elevation."
      );
    }
    if (disconnected > 0) {
      reasons.push(
        disconnected +
          " above-threshold DEM cells were excluded because they are not 4-connected to this summit (nearby high ground / neighbouring peak)."
      );
    }
    if (edgeClipped) {
      confidence = "edge-clipped";
      reasons.push("Qualifying terrain reaches the edge of the sampled DEM window; the polygon may be truncated.");
    }
    var az = emptyAz(query, "ok", reasons.length ? reasons.join(" ") : null, extra);
    az.geometry = { type: "Polygon", coordinates: [coords] };
    az.latlngs = latlngs;
    az.confidence = confidence;
    az.edgeClipped = edgeClipped;
    az.cellCount = filled.cells.length;
    az.excludedHighCells = disconnected;
    az.areaHintKm2 = filled.cells.length * cellAreaKm2;
    az.seed = { r: seed.r, c: seed.c };
    az.notARadius = true;
    az.caveat =
      "SignalTerrain's Activation Zone is a terrain-derived planning aid. Operators remain responsible for complying with current SOTA rules and verifying their activation.";
    az.claimForbidden =
      "Geographic presence inside this polygon is not a valid SOTA activation. Radio contacts and other expedition rules still apply.";
    if (Geo && Geo.formatElevationM) {
      az.summitElevationLabel = Geo.formatElevationM(sotaM);
      az.thresholdLabel = Geo.formatElevationM(threshold);
    }
    return az;
  }

  function pointInAz(az, lat, lng) {
    var Geo = global.SignalTerrainSotaGeo;
    if (!az || az.status !== "ok" || !az.latlngs) return false;
    if (!Geo || typeof Geo.pointInPolygon !== "function") return false;
    return Geo.pointInPolygon(lat, lng, az.latlngs);
  }

  function locationStatus(az, geo) {
    if (!az || az.status !== "ok") {
      return { status: "az-unavailable", label: "AZ unavailable", inside: null };
    }
    if (!geo || geo.status !== "granted" || !isFiniteNumber(geo.lat) || !isFiniteNumber(geo.lng)) {
      return { status: "location-unavailable", label: "Location unavailable", inside: null };
    }
    var inside = pointInAz(az, geo.lat, geo.lng);
    return {
      status: inside ? "inside" : "outside",
      label: inside ? "Inside mapped Activation Zone" : "Outside mapped Activation Zone",
      inside: inside,
      note: "Geographic status only. Not a valid-activation claim."
    };
  }

  function relateRoute(az, route) {
    var Geo = global.SignalTerrainSotaGeo;
    var out = {
      status: "unknown",
      enters: null,
      entry: null,
      distanceToEntryKm: null,
      remainingToSummitKm: null,
      crossings: 0,
      reason: null
    };
    if (!route || route.status !== "ok" || !route.geometry || route.geometry.length < 2) {
      out.status = "route-unavailable";
      out.reason = "No calculated hiking route to compare.";
      return out;
    }
    if (!az || az.status !== "ok" || !az.latlngs) {
      out.status = "az-unavailable";
      out.reason = "Activation Zone is unavailable; the route is unchanged.";
      return out;
    }
    var geom = route.geometry;
    var insidePrev = pointInAz(az, geom[0].lat, geom[0].lng);
    var dist = 0;
    if (insidePrev) {
      out.status = "enters";
      out.enters = true;
      out.crossings = 1;
      out.entry = { lat: geom[0].lat, lng: geom[0].lng, distanceKm: 0, elevationM: geom[0].elevM != null ? geom[0].elevM : null };
      out.distanceToEntryKm = 0;
      var rest0 = 0;
      for (var k = 1; k < geom.length; k += 1) rest0 += Geo.haversineKm(geom[k - 1].lat, geom[k - 1].lng, geom[k].lat, geom[k].lng) || 0;
      out.remainingToSummitKm = rest0;
      out.reason = "The calculated route starts inside the mapped Activation Zone.";
      return out;
    }
    for (var i = 1; i < geom.length; i += 1) {
      var a = geom[i - 1];
      var b = geom[i];
      var step = Geo.haversineKm(a.lat, a.lng, b.lat, b.lng) || 0;
      var inside = pointInAz(az, b.lat, b.lng);
      if (inside !== insidePrev) {
        out.crossings += 1;
        if (inside && !out.entry) {
          var t = 0.5;
          var lo = 0;
          var hi = 1;
          for (var bin = 0; bin < 12; bin += 1) {
            t = (lo + hi) / 2;
            var lat = a.lat + (b.lat - a.lat) * t;
            var lng = a.lng + (b.lng - a.lng) * t;
            if (pointInAz(az, lat, lng)) hi = t;
            else lo = t;
          }
          t = hi;
          var elat = a.lat + (b.lat - a.lat) * t;
          var elng = a.lng + (b.lng - a.lng) * t;
          out.entry = {
            lat: elat,
            lng: elng,
            distanceKm: dist + step * t,
            elevationM: a.elevM != null && b.elevM != null ? a.elevM + (b.elevM - a.elevM) * t : null
          };
          out.distanceToEntryKm = out.entry.distanceKm;
        }
      }
      dist += step;
      insidePrev = inside;
    }
    if (out.entry) {
      out.status = "enters";
      out.enters = true;
      var rest = 0;
      var reached = false;
      var acc = 0;
      for (var j = 1; j < geom.length; j += 1) {
        var ds = Geo.haversineKm(geom[j - 1].lat, geom[j - 1].lng, geom[j].lat, geom[j].lng) || 0;
        if (!reached && acc + ds >= out.distanceToEntryKm) {
          rest += acc + ds - out.distanceToEntryKm;
          reached = true;
        } else if (reached) rest += ds;
        acc += ds;
      }
      out.remainingToSummitKm = rest;
      out.reason = "The calculated route enters the mapped Activation Zone. The route geometry was not altered.";
    } else {
      out.status = "does-not-enter";
      out.enters = false;
      out.reason = "The calculated route does not enter the mapped Activation Zone. The route geometry was not altered.";
    }
    return out;
  }

  function attachEntryElevation(rel, elev) {
    if (!rel || !rel.entry) return rel;
    if (rel.entry.elevationM != null) return rel;
    var pts = elev && elev.points;
    if (!pts || !pts.length || rel.distanceToEntryKm == null) return rel;
    var target = rel.distanceToEntryKm;
    var best = pts[0];
    var bestD = Math.abs((pts[0].distanceKm || 0) - target);
    for (var i = 1; i < pts.length; i += 1) {
      var d = Math.abs((pts[i].distanceKm || 0) - target);
      if (d < bestD) {
        bestD = d;
        best = pts[i];
      }
    }
    var em = best.elevSmoothM != null ? best.elevSmoothM : best.elevM;
    if (isFiniteNumber(em)) rel.entry.elevationM = em;
    return rel;
  }

  var api = {
    ALGORITHM_VERSION: ALGORITHM_VERSION,
    MATERIAL_DISCREPANCY_M: MATERIAL_DISCREPANCY_M,
    emptyAz: emptyAz,
    computeAz: computeAz,
    makeSyntheticGrid: makeSyntheticGrid,
    cellLat: cellLat,
    cellLng: cellLng,
    nearestCell: nearestCell,
    floodFill4: floodFill4,
    pointInAz: pointInAz,
    locationStatus: locationStatus,
    relateRoute: relateRoute,
    attachEntryElevation: attachEntryElevation
  };

  global.SignalTerrainSotaAzModel = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.AzModel = api;
})(typeof window !== "undefined" ? window : globalThis);
