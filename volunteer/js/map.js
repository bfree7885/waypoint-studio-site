/**
 * Waypoint Volunteer — Leaflet map (nearby opportunities)
 * Supports category colors, locate, list sync, future clustering hook.
 */
(function (global) {
  "use strict";

  var BASEMAP = {
    base: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    labels:
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  };

  var DEFAULT_CENTER = [40.78, -77.86];
  var DEFAULT_ZOOM = 10;

  function categoryColor(categoryId) {
    var cat =
      global.VolunteerCategories && global.VolunteerCategories.get(categoryId);
    return (cat && cat.color) || "#8b9bb8";
  }

  function createMap(containerId, options) {
    var opts = options || {};
    var map = L.map(containerId, {
      zoomControl: false,
      attributionControl: true
    }).setView(opts.center || DEFAULT_CENTER, opts.zoom || DEFAULT_ZOOM);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer(BASEMAP.base, {
      attribution: BASEMAP.attribution,
      subdomains: BASEMAP.subdomains,
      maxZoom: BASEMAP.maxZoom
    }).addTo(map);

    L.tileLayer(BASEMAP.labels, {
      subdomains: BASEMAP.subdomains,
      maxZoom: BASEMAP.maxZoom,
      pane: "shadowPane"
    }).addTo(map);

    var markersLayer = L.layerGroup().addTo(map);
    var userMarker = null;
    var markerById = {};
    var clusterReady = false;

    /**
     * Future clustering: when Leaflet.markercluster is loaded,
     * swap markersLayer for a MarkerClusterGroup. Hook kept intentional.
     */
    function enableClusteringIfAvailable() {
      if (clusterReady) return;
      if (typeof L.markerClusterGroup !== "function") return;
      map.removeLayer(markersLayer);
      markersLayer = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 48
      });
      markersLayer.addTo(map);
      clusterReady = true;
    }

    function circleIcon(color, selected) {
      var size = selected ? 18 : 14;
      return L.divIcon({
        className: "vol-map-marker",
        html:
          '<span class="vol-map-dot' +
          (selected ? " is-selected" : "") +
          '" style="background:' +
          color +
          ";width:" +
          size +
          "px;height:" +
          size +
          'px"></span>',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
    }

    function setOpportunities(opportunities, selectedId, onSelect) {
      enableClusteringIfAvailable();
      markersLayer.clearLayers();
      markerById = {};

      (opportunities || []).forEach(function (opp) {
        if (typeof opp.lat !== "number" || typeof opp.lon !== "number") return;
        var color = categoryColor(opp.category);
        var marker = L.marker([opp.lat, opp.lon], {
          icon: circleIcon(color, opp.id === selectedId),
          title: opp.title,
          keyboard: true,
          alt: opp.title
        });
        marker.bindTooltip(opp.title, {
          direction: "top",
          offset: [0, -8],
          opacity: 0.95
        });
        marker.on("click", function () {
          if (typeof onSelect === "function") onSelect(opp.id);
        });
        marker.addTo(markersLayer);
        markerById[opp.id] = marker;
      });
    }

    function focusOpportunity(opp, zoom) {
      if (!opp || typeof opp.lat !== "number") return;
      map.setView([opp.lat, opp.lon], zoom || Math.max(map.getZoom(), 12), {
        animate: true
      });
      var marker = markerById[opp.id];
      if (marker) marker.openTooltip();
    }

    function setUserLocation(lat, lon) {
      if (userMarker) {
        userMarker.setLatLng([lat, lon]);
      } else {
        userMarker = L.circleMarker([lat, lon], {
          radius: 7,
          color: "#070b14",
          weight: 2,
          fillColor: "#c6ff4d",
          fillOpacity: 0.95
        }).addTo(map);
        userMarker.bindTooltip("You are here", { direction: "right" });
      }
    }

    function fitToOpportunities(opportunities, userLat, userLon) {
      var points = [];
      (opportunities || []).forEach(function (opp) {
        if (typeof opp.lat === "number" && typeof opp.lon === "number") {
          points.push([opp.lat, opp.lon]);
        }
      });
      if (userLat != null && userLon != null) {
        points.push([userLat, userLon]);
      }
      if (!points.length) {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        return;
      }
      if (points.length === 1) {
        map.setView(points[0], 12);
        return;
      }
      map.fitBounds(points, { padding: [40, 40], maxZoom: 12 });
    }

    function invalidate() {
      map.invalidateSize();
    }

    return {
      map: map,
      setOpportunities: setOpportunities,
      focusOpportunity: focusOpportunity,
      setUserLocation: setUserLocation,
      fitToOpportunities: fitToOpportunities,
      invalidate: invalidate,
      enableClusteringIfAvailable: enableClusteringIfAvailable,
      DEFAULT_CENTER: DEFAULT_CENTER
    };
  }

  global.VolunteerMap = {
    createMap: createMap,
    DEFAULT_CENTER: DEFAULT_CENTER,
    DEFAULT_ZOOM: DEFAULT_ZOOM
  };
})(typeof window !== "undefined" ? window : this);
