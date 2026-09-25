const state = { stores: [], filtered: [], map: null, markers: null, data: null, enrichment: {} };

const els = {
  search: document.querySelector("#search"),
  region: document.querySelector("#region-filter"),
  cluster: document.querySelector("#cluster-filter"),
  week: document.querySelector("#week-filter"),
  risk: document.querySelector("#risk-filter"),
  rows: document.querySelector("#store-rows"),
  empty: document.querySelector("#empty-state"),
};

const fmtDate = (value, options = { month: "short", day: "numeric" }) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(new Date(`${value}T12:00:00Z`));

const startOfWeek = (value) => {
  const d = new Date(`${value}T12:00:00Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
};

const hasFlag = (store, phrase) => store.flags.some(flag => flag.toLowerCase().includes(phrase));

const clusterColors = {
  "145": "#24465f",
  "146": "#4f81bd",
  "147": "#2f7185",
  "148": "#6f6a9c",
  "149": "#9a6a32",
};

const clusterColor = cluster => clusterColors[String(cluster)] || "#56636b";

const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

const detailValue = (value, missingLabel = "Not provided") => {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)) {
    return `<span class="detail-value missing">${escapeHtml(missingLabel)}</span>`;
  }
  return `<span class="detail-value">${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</span>`;
};

const detailRows = rows => `<dl class="detail-list">${rows.map(([label, value, missingLabel]) => `<div><dt>${escapeHtml(label)}</dt><dd>${detailValue(value, missingLabel)}</dd></div>`).join("")}</dl>`;

function setOptions(select, values, format = value => value) {
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = format(value);
    select.append(option);
  });
}

function initializeMap() {
  state.map = L.map("map", { zoomControl: true, scrollWheelZoom: false }).setView([31.1, -98.4], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(state.map);
  state.markers = L.layerGroup().addTo(state.map);
}

function markerIcon(store) {
  const needsReview = hasFlag(store, "location verification");
  return L.divIcon({
    className: "",
    html: `<div title="Cluster ${store.cluster}" style="width:18px;height:18px;border:3px solid ${needsReview ? "#b93b2f" : "#fff"};border-radius:50%;background:${clusterColor(store.cluster)};box-shadow:0 1px 5px rgba(0,0,0,.42)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function renderMap(stores) {
  state.markers.clearLayers();
  const points = [];
  stores.forEach(store => {
    if (!Number.isFinite(store.latitude) || !Number.isFinite(store.longitude)) return;
    const marker = L.marker([store.latitude, store.longitude], { icon: markerIcon(store) });
    marker.bindTooltip(`Store ${store.storeNumber} · ${store.city} · Cluster ${store.cluster}`, { direction: "top", offset: [0, -8] });
    marker.on("click", () => openStoreDetail(store));
    marker.addTo(state.markers);
    points.push([store.latitude, store.longitude]);
  });
  if (points.length > 1) state.map.fitBounds(points, { padding: [28, 28], maxZoom: 8 });
  if (points.length === 1) state.map.setView(points[0], 10);
}

function renderTable(stores) {
  els.rows.replaceChildren();
  stores.forEach(store => {
    const tr = document.createElement("tr");
    tr.className = "store-row";
    tr.tabIndex = 0;
    tr.style.setProperty("--cluster-color", clusterColor(store.cluster));
    const status = store.flags.length ? store.flags.slice(0, 2).join("; ") : "Ready on stated assumptions";
    tr.innerHTML = `
      <td class="store-cell"><strong>${store.storeNumber} · ${store.city}</strong><span>CS ${store.csNumber} · ${store.state} ${store.zip}</span></td>
      <td>${store.region}</td>
      <td><span class="cluster-chip" style="--cluster-color:${clusterColor(store.cluster)}">${store.cluster}</span></td>
      <td class="mono">${fmtDate(store.shipBy)}</td>
      <td class="mono">${fmtDate(store.deliverBy)}</td>
      <td class="mono">${fmtDate(store.msd)}</td>
      <td class="mono">${store.units}${store.configStatus === "TBD" ? "*" : ""}</td>
      <td><span class="status-chip ${store.flags.length ? "watch" : ""}">${status}</span></td>`;
    tr.setAttribute("aria-label", `Open full details for store ${store.storeNumber} in ${store.city}`);
    tr.addEventListener("click", () => openStoreDetail(store));
    tr.addEventListener("keydown", event => { if (event.key === "Enter") tr.click(); });
    els.rows.append(tr);
  });
  els.empty.hidden = stores.length !== 0;
  document.querySelector("#result-count").textContent = stores.length;
}

function openStoreDetail(store) {
  const dialog = document.querySelector("#store-dialog");
  const enrichment = state.enrichment[store.csNumber] || {};
  const address = `${store.address}, ${store.city}, ${store.state} ${store.zip}`;
  const coordinates = Number.isFinite(store.latitude) && Number.isFinite(store.longitude) ? `${store.latitude.toFixed(5)}, ${store.longitude.toFixed(5)}` : "";
  const mapsUrl = coordinates ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.latitude},${store.longitude}`)}` : "";
  const issueTitle = `Store ${store.storeNumber} completion - CS ${store.csNumber}`;
  const completionSubmitUrl = `https://github.com/coreanthony/core-cmci-prefab-logistics/issues/new?template=store-completion.yml&title=${encodeURIComponent(issueTitle)}`;
  const completionPhotos = Array.isArray(enrichment.completionPhotos) ? enrichment.completionPhotos : [];
  const photoMarkup = completionPhotos.length
    ? `<div class="completion-photos">${completionPhotos.map((photo, index) => `<a href="${escapeHtml(photo)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(photo)}" alt="Store ${escapeHtml(store.storeNumber)} completion photo ${index + 1}"></a>`).join("")}</div>`
    : `<p class="detail-value missing">No completion photos submitted</p>`;
  const flags = store.flags.length ? store.flags.join("; ") : "Ready on stated assumptions";

  document.querySelector("#store-dialog-context").textContent = `${store.region} · Cluster ${store.cluster} · CS ${store.csNumber}`;
  document.querySelector("#store-dialog-title").textContent = `Store ${store.storeNumber} · ${store.city}`;
  document.querySelector("#store-detail-content").innerHTML = `
    <div class="detail-summary" style="border-top:5px solid ${clusterColor(store.cluster)};padding-top:16px">
      <div><h3>CVS Store ${escapeHtml(store.storeNumber)}</h3><p class="detail-address">${escapeHtml(address)}</p></div>
      ${mapsUrl ? `<a class="detail-map-link" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Open GPS location</a>` : ""}
    </div>
    <div class="detail-grid">
      <section class="detail-section"><h3>Store identity</h3>${detailRows([
        ["Store number", store.storeNumber], ["CS number", store.csNumber], ["Region", store.region], ["Cluster", store.cluster], ["Store type", store.storeType]
      ])}</section>
      <section class="detail-section"><h3>Location</h3>${detailRows([
        ["Street address", store.address], ["City / State / ZIP", `${store.city}, ${store.state} ${store.zip}`], ["GPS coordinates", coordinates], ["Coordinate basis", store.locationBasis], ["Nearest cross street", enrichment.nearestCrossStreet, "Field verification required"]
      ])}</section>
      <section class="detail-section"><h3>Contacts</h3>${detailRows([
        ["Project manager", store.projectManager], ["PM phone number", enrichment.pmPhone, "Not in source package"], ["Store manager", enrichment.storeManager, "Not in source package"], ["Store manager phone", enrichment.storeManagerPhone, "Not in source package"]
      ])}</section>
      <section class="detail-section"><h3>Schedule and access</h3>${detailRows([
        ["Ship by", fmtDate(store.shipBy, { month: "short", day: "numeric", year: "numeric" })], ["Deliver by", fmtDate(store.deliverBy, { month: "short", day: "numeric", year: "numeric" })], ["MSD", fmtDate(store.msd, { month: "short", day: "numeric", year: "numeric" })], ["CSD", fmtDate(store.csd, { month: "short", day: "numeric", year: "numeric" })], ["Best time to miss traffic", enrichment.bestTrafficWindow, "Route review required"], ["Receiving window", enrichment.receivingWindow, "Store confirmation required"]
      ])}</section>
      <section class="detail-section"><h3>Execution requirements</h3>${detailRows([
        ["Unit configuration", store.configRaw || "", store.configStatus === "TBD" ? `TBD; ${store.units} default units carried` : "Not provided"], ["Planned units", store.units], ["Labor model", store.laborModel], ["MV vendor", store.mvVendor], ["Merchandising hours", store.merchandisingHours], ["Tools needed", enrichment.toolsNeeded, "Tool list not issued"]
      ])}</section>
      <section class="detail-section"><h3>Controls and notes</h3>${detailRows([
        ["Layout status", store.layoutStatus], ["Current flags", flags], ["Source notes", store.sourceNotes, "No source note"], ["Field notes", enrichment.fieldNotes, "No field note"]
      ])}</section>
    </div>
    <section class="completion-record">
      <div class="completion-heading">
        <div><p class="eyebrow">CLOSEOUT EVIDENCE</p><h3>Completion photos and store sign-off</h3></div>
        <a class="detail-map-link" href="${enrichment.completionIssueUrl ? escapeHtml(enrichment.completionIssueUrl) : completionSubmitUrl}" target="_blank" rel="noopener noreferrer">${enrichment.completionIssueUrl ? "View completion record" : "Submit photos + sign-off"}</a>
      </div>
      ${photoMarkup}
      ${detailRows([
        ["Completion status", enrichment.completionStatus, "Not submitted"],
        ["Store representative", enrichment.signedByName, "No sign-off on file"],
        ["Representative title", enrichment.signedByTitle, "No sign-off on file"],
        ["Sign-off date", enrichment.signedAt, "No sign-off on file"],
        ["Sign-off notes", enrichment.signOffNotes, "No sign-off on file"]
      ])}
      <p class="completion-note">Submission opens a controlled record in the private GitHub repository. GitHub login and repository access are required. Photos are attached there; this dashboard displays them after the verified record is linked in the enrichment data.</p>
    </section>
    <p class="detail-data-note">Yellow fields require verified field, PM, store, vendor, or route information before operational reliance.</p>`;
  dialog.showModal();
}

function renderFilteredSummary(stores) {
  const units = stores.reduce((sum, store) => sum + store.units, 0);
  const configTbd = stores.filter(store => store.configStatus === "TBD").length;
  const layoutTbd = stores.filter(store => store.layoutStatus !== "Approved").length;
  const locationReview = stores.filter(store => hasFlag(store, "location verification")).length;
  document.querySelector("#kpi-stores").textContent = stores.length;
  document.querySelector("#kpi-units").textContent = units;
  document.querySelector("#kpi-config").textContent = configTbd;
  document.querySelector("#kpi-layout").textContent = layoutTbd;
  document.querySelector("#kpi-location").textContent = locationReview;
  document.querySelector("#kpi-date-range").textContent = stores.length ? `${fmtDate(stores[0].msd)}–${fmtDate(stores.at(-1).msd, { month: "short", day: "numeric", year: "numeric" })}` : "No matching stores";

  const next = [...stores].sort((a, b) => a.shipBy.localeCompare(b.shipBy))[0];
  if (!next) {
    document.querySelector("#next-date").textContent = "—";
    document.querySelector("#next-title").textContent = "No control date in view";
    document.querySelector("#next-detail").textContent = "Adjust the filters to restore schedule records.";
    return;
  }
  const nextDateStores = stores.filter(store => store.shipBy === next.shipBy);
  document.querySelector("#next-date").textContent = fmtDate(next.shipBy, { month: "short", day: "numeric", year: "numeric" });
  document.querySelector("#next-title").textContent = `${nextDateStores.length} store${nextDateStores.length === 1 ? "" : "s"} at first ship control`;
  document.querySelector("#next-detail").textContent = `${nextDateStores.map(store => `${store.city} ${store.storeNumber}`).join(", ")}. Calculated from the active delivery buffer and regional transit assumptions.`;
}

function renderRegionLoad(stores) {
  const byRegion = new Map();
  stores.forEach(store => {
    const current = byRegion.get(store.region) || { stores: 0, units: 0 };
    current.stores += 1;
    current.units += store.units;
    byRegion.set(store.region, current);
  });
  const maximum = Math.max(1, ...Array.from(byRegion.values(), item => item.stores));
  const container = document.querySelector("#region-load");
  container.replaceChildren();
  Array.from(byRegion.entries()).sort((a, b) => b[1].stores - a[1].stores).forEach(([region, totals]) => {
    const row = document.createElement("div");
    row.className = "region-row";
    row.innerHTML = `<div><span>${region}</span><strong>${totals.stores} / ${totals.units}</strong></div><div class="bar"><span style="width:${(totals.stores / maximum) * 100}%"></span></div>`;
    container.append(row);
  });
}

function applyFilters() {
  const query = els.search.value.trim().toLowerCase();
  const region = els.region.value;
  const cluster = els.cluster.value;
  const week = els.week.value;
  const risk = els.risk.value;
  state.filtered = state.stores.filter(store => {
    const haystack = [store.storeNumber, store.csNumber, store.city, store.state, store.zip, store.region].join(" ").toLowerCase();
    const riskMatch = !risk ||
      (risk === "any" && store.flags.length) ||
      (risk === "config" && store.configStatus === "TBD") ||
      (risk === "layout" && store.layoutStatus !== "Approved") ||
      (risk === "labor" && store.laborModel === "TBD") ||
      (risk === "location" && hasFlag(store, "location verification"));
    return (!query || haystack.includes(query)) && (!region || store.region === region) && (!cluster || store.cluster === cluster) && (!week || startOfWeek(store.msd) === week) && riskMatch;
  });
  renderFilteredSummary(state.filtered);
  renderTable(state.filtered);
  renderRegionLoad(state.filtered);
  renderMap(state.filtered);
}

function renderSummary(data) {
  const stores = data.stores;
  document.querySelector("#as-of").textContent = `Source workbook dated ${fmtDate(data.meta.sourceDate, { month: "long", day: "numeric", year: "numeric" })}. Dates shown are planning controls, not confirmed vendor commitments.`;
  document.querySelector("#data-status").textContent = `${stores.length} stores loaded`;
  document.querySelector("#footer-source").textContent = data.meta.sourceWorkbook;
}

function renderOpenItems(data) {
  document.querySelector("#open-count").textContent = data.openItems.length;
  const container = document.querySelector("#open-items");
  data.openItems.forEach(item => {
    const row = document.createElement("div");
    row.className = "open-item";
    row.innerHTML = `<strong>${item.item}</strong><p>${item.detail}</p><span>${item.owner}</span>`;
    container.append(row);
  });
}

function renderAssumptions(data) {
  const a = data.assumptions;
  const rows = [
    ["Default units when config is blank", a.defaultUnits],
    ["Delivery buffer", `${a.deliveryBufferBusinessDays} business days`],
    ["Install duration", `${a.installDaysPerStore} crew-day`],
    ...Object.entries(a.transitBusinessDays).map(([region, days]) => [`${region} transit`, `${days} business days`]),
  ];
  const list = document.querySelector("#assumption-list");
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.innerHTML = `<dt>${label}</dt><dd>${value}</dd>`;
    list.append(row);
  });
  document.querySelector("#assumption-warning").textContent = a.status;
}

function renderClusterLegends(stores) {
  const clusters = [...new Set(stores.map(store => store.cluster))].sort((a, b) => Number(a) - Number(b));
  document.querySelectorAll(".cluster-legend").forEach(container => {
    container.replaceChildren();
    clusters.forEach(cluster => {
      const item = document.createElement("span");
      item.className = "cluster-key";
      item.innerHTML = `<i class="cluster-swatch" style="background:${clusterColor(cluster)}"></i>Cluster ${cluster}`;
      container.append(item);
    });
  });
}

function setDashboardView(cluster = "") {
  els.cluster.value = cluster;
  document.querySelectorAll("[data-cluster-view]").forEach(button => button.classList.toggle("active", button.dataset.clusterView === cluster));
  document.querySelector("#page-title").textContent = cluster ? `Cluster ${cluster} Dashboard` : "Master Dashboard";
  applyFilters();
}

function renderClusterNavigation(stores) {
  const clusters = [...new Set(stores.map(store => store.cluster))].sort((a, b) => Number(a) - Number(b));
  const nav = document.querySelector("#cluster-nav");
  clusters.forEach(cluster => {
    const count = stores.filter(store => store.cluster === cluster).length;
    const button = document.createElement("button");
    button.className = "board-nav-button";
    button.type = "button";
    button.dataset.clusterView = cluster;
    button.innerHTML = `Cluster ${cluster} <span aria-label="${count} stores">(${count})</span>`;
    button.addEventListener("click", () => setDashboardView(cluster));
    nav.append(button);
  });
  document.querySelector('[data-cluster-view=""]').addEventListener("click", () => setDashboardView(""));
}

async function load() {
  try {
    const [response, enrichmentResponse] = await Promise.all([
      fetch("site-data/tracker.json", { cache: "no-store" }),
      fetch("site-data/store-enrichment.json", { cache: "no-store" }),
    ]);
    if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
    const data = await response.json();
    if (enrichmentResponse.ok) {
      const enrichment = await enrichmentResponse.json();
      state.enrichment = enrichment.stores || {};
    }
    state.data = data;
    state.stores = data.stores;
    renderSummary(data);
    renderOpenItems(data);
    renderAssumptions(data);
    setOptions(els.region, [...new Set(state.stores.map(store => store.region))].sort());
    setOptions(els.cluster, [...new Set(state.stores.map(store => store.cluster))].sort((a, b) => Number(a) - Number(b)), value => `Cluster ${value}`);
    setOptions(els.week, [...new Set(state.stores.map(store => startOfWeek(store.msd)))].sort(), value => `Week of ${fmtDate(value)}`);
    renderClusterLegends(state.stores);
    renderClusterNavigation(state.stores);
    initializeMap();
    applyFilters();
  } catch (error) {
    document.querySelector("#data-status").textContent = "Program data unavailable";
    document.querySelector("#as-of").textContent = "The tracker data could not be loaded. Open the site through a web server and confirm site-data/tracker.json is present.";
    console.error(error);
  }
}

[els.search, els.region, els.week, els.risk].forEach(control => control.addEventListener("input", applyFilters));
els.cluster.addEventListener("input", () => setDashboardView(els.cluster.value));
document.querySelector("#reset-filters").addEventListener("click", () => {
  els.search.value = "";
  els.region.value = "";
  els.cluster.value = "";
  els.week.value = "";
  els.risk.value = "";
  setDashboardView("");
});

document.querySelector("#store-dialog-close").addEventListener("click", () => document.querySelector("#store-dialog").close());
document.querySelector("#store-dialog").addEventListener("click", event => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});

load();
