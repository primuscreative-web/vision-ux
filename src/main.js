const typeLabels = {
  container: "Container",
  equipment: "Equipamento",
  vehicle: "Veiculo",
  person: "Pessoa",
  gate: "Portao",
  sensor: "Sensor",
};

const riskLabels = {
  normal: "Normal",
  attention: "Atencao",
  critical: "Critico",
};

const destinations = ["Patio Norte", "Patio Sul", "Doca 04", "Armazem 03", "Gate 02", "Navio Atlas"];

let zones = [
  zone("ZONE-A", "Area Restrita", "restricted", 8, 12, 24, 22),
  zone("ZONE-B", "Armazem 03", "warehouse", 13, 67, 30, 21),
  zone("ZONE-C", "Patio Norte", "yard", 38, 18, 24, 25),
  zone("ZONE-D", "Gate 02", "gate", 76, 73, 19, 18),
  zone("DOCK-04", "Doca 04 - Berco Atlas", "dock", 81, 9, 12, 72),
];

let assets = [
  asset("CNT-8812", "CNT-8812", "container", "Patio Norte", "Equipe Alfa", "Navio Atlas", "Aguardando embarque", "attention", 18, 26, 21800, 42),
  asset("CNT-4490", "CNT-4490", "container", "Patio Sul", "Equipe Delta", "Armazem 03", "Inspecao alfandegaria", "critical", 41, 58, 26500, 9),
  asset("EMP-07", "Empilhadeira 07", "equipment", "Corredor Leste", "Operador Joao", "Patio Norte", "Em deslocamento", "normal", 66, 34, 7200, 3),
  asset("TRK-22", "Cavalo Mecanico 22", "vehicle", "Gate 02", "Transportadora Rota Azul", "Doca 04", "Entrada autorizada", "normal", 78, 73, 11200, 16),
  asset("SUP-14", "Supervisor Marina", "person", "Doca 04", "Operacoes", "Torre Local", "Ronda ativa", "normal", 52, 18, 0, 5),
  asset("GAT-02", "Gate 02", "gate", "Entrada Rodoviaria", "Seguranca", "Controle de acesso", "Fluxo intenso", "attention", 86, 82, 0, 1),
  asset("SEN-31", "Sensor RFID 31", "sensor", "Armazem 03", "Infraestrutura", "Monitoramento", "Online", "normal", 25, 72, 0, 0),
];

let events = [
  event("EVT-001", "CNT-4490", "CNT-4490", "Gate 02", "Patio Sul", "Operador Lucas", "Supervisora Marina", "Inspecao prioritaria", "08:42"),
  event("EVT-002", "EMP-07", "Empilhadeira 07", "Oficina", "Corredor Leste", "Operador Joao", "Coordenador Nunes", "Apoio de embarque", "08:51"),
  event("EVT-003", "CNT-8812", "CNT-8812", "Armazem 01", "Patio Norte", "Equipe Alfa", "Gerente Paula", "Pre-stage Navio Atlas", "09:04"),
];

let selectedId = assets[0].id;
let selectedKind = "asset";
let query = "";
let activeLayer = "all";
let replayHour = 9;
let editMode = true;

function asset(id, label, type, area, owner, destination, status, risk, x, y, weight, lastMoveMinutes) {
  return {
    id,
    label,
    type,
    area,
    owner,
    destination,
    status,
    risk,
    x,
    y,
    z: 0,
    width: type === "container" ? 12 : type === "person" ? 2 : 8,
    length: type === "container" ? 24 : type === "person" ? 2 : 12,
    height: type === "container" ? 9 : type === "person" ? 6 : 8,
    weight,
    lastMoveMinutes,
  };
}

function zone(id, label, type, x, y, width, height) {
  return { id, label, type, x, y, width, height };
}

function event(id, assetId, assetLabel, from, to, actor, authorizer, reason, time) {
  return { id, assetId, assetLabel, from, to, actor, authorizer, reason, time };
}

function selectedAsset() {
  return assets.find((item) => item.id === selectedId) || assets[0];
}

function selectedZone() {
  return zones.find((item) => item.id === selectedId) || zones[0];
}

function selectedMapItem() {
  return selectedKind === "zone" ? selectedZone() : selectedAsset();
}

function visibleAssets() {
  const normalized = query.trim().toLowerCase();
  return assets.filter((item) => {
    const matchesLayer = activeLayer === "all" || item.type === activeLayer;
    const matchesQuery =
      normalized.length === 0 ||
      item.label.toLowerCase().includes(normalized) ||
      item.area.toLowerCase().includes(normalized) ||
      item.destination.toLowerCase().includes(normalized);
    return matchesLayer && matchesQuery;
  });
}

function setSelected(id) {
  selectedId = id;
  selectedKind = "asset";
  render();
}

function setSelectedZone(id) {
  selectedId = id;
  selectedKind = "zone";
  render();
}

function setLayer(layer) {
  activeLayer = layer;
  render();
}

function updateSelectedAsset(patch, reason = "Edicao cadastral") {
  const before = selectedAsset();
  assets = assets.map((item) => (item.id === selectedId ? { ...item, ...patch } : item));
  const after = selectedAsset();

  if (patch.area && patch.area !== before.area) {
    appendEvent(before, before.area, patch.area, "Alteracao de area pelo editor");
  } else if (patch.x !== undefined || patch.y !== undefined) {
    appendEvent(after, before.area, after.area, reason);
  }
}

function updateSelectedZone(patch) {
  zones = zones.map((item) => (item.id === selectedId ? { ...item, ...patch } : item));
}

function moveSelectedAsset(destination) {
  const current = selectedAsset();
  updateSelectedAsset(
    {
      area: destination,
      destination: destination === "Navio Atlas" ? "Embarque confirmado" : current.destination,
      status: "Movimentado agora",
      lastMoveMinutes: 0,
      risk: destination === "Navio Atlas" ? "normal" : current.risk,
    },
    "Movimentacao operacional",
  );
  render();
}

function repositionSelectedFromMap(pointerEvent) {
  if (!editMode || pointerEvent.target.closest("[data-select]") || pointerEvent.target.closest("[data-zone]")) return;
  const rect = pointerEvent.currentTarget.getBoundingClientRect();
  const x = clamp(Math.round(((pointerEvent.clientX - rect.left) / rect.width) * 100), 2, 98);
  const y = clamp(Math.round(((pointerEvent.clientY - rect.top) / rect.height) * 100), 2, 98);
  if (selectedKind === "zone") {
    updateSelectedZone({ x, y });
  } else {
    updateSelectedAsset({ x, y, status: "Posicao editada no mapa" }, "Reposicionamento no mapa");
  }
  render();
}

function appendEvent(item, from, to, reason) {
  const minute = String((events.length * 7 + 11) % 60).padStart(2, "0");
  events = [
    event(
      `EVT-${String(events.length + 1).padStart(3, "0")}`,
      item.id,
      item.label,
      from,
      to,
      "Editor VISION",
      "Controle Operacional",
      reason,
      `09:${minute}`,
    ),
    ...events,
  ];
}

function render() {
  const selected = selectedAsset();
  const selectedItem = selectedMapItem();
  const filtered = visibleAssets();
  const criticalCount = assets.filter((item) => item.risk === "critical").length;
  const totalWeight = assets.reduce((sum, item) => sum + item.weight, 0);
  const app = document.getElementById("root");

  app.innerHTML = `
    <main class="app-shell">
      <aside class="left-rail">
        <div class="brand-block">
          <div class="brand-mark">V</div>
          <div>
            <h1>VISION</h1>
            <p>Centro de Comando Operacional</p>
          </div>
        </div>

        <div class="search-panel">
          <label for="global-search">Busca global</label>
          <input id="global-search" value="${escapeHtml(query)}" placeholder="Ativo, area ou destino" />
        </div>

        <nav class="layer-list" aria-label="Camadas operacionais">
          ${layerButton("all", "Tudo")}
          ${Object.entries(typeLabels).map(([type, label]) => layerButton(type, label)).join("")}
        </nav>

        <section class="asset-list" aria-label="Objetos operacionais">
          ${filtered.map(assetRow).join("")}
        </section>
      </aside>

      <section class="command-center">
        <header class="top-bar">
          <div>
            <h2>Mapa Operacional</h2>
            <p>Porto Santos-01 - Operacao ao vivo - Replay ${String(replayHour).padStart(2, "0")}:00</p>
          </div>
          <div class="top-actions">
            <button type="button" class="${editMode ? "is-active" : ""}" id="toggle-edit">${editMode ? "Modo edicao" : "Modo consulta"}</button>
          </div>
        </header>

        <section class="metrics-grid" aria-label="Indicadores operacionais">
          ${metric("Objetos no mapa", String(assets.length), "cadastro ativo")}
          ${metric("Movimentacoes", String(events.length), "auditadas")}
          ${metric("Riscos criticos", String(criticalCount), "prioridade")}
          ${metric("Peso rastreado", `${Math.round(totalWeight / 1000)}t`, "sob custodia")}
        </section>

        <section class="map-toolbar">
          <strong>${escapeHtml(selectedItem.label)}</strong>
          <span>Clique em qualquer ponto do mapa para reposicionar o item selecionado.</span>
          <span>X ${selectedItem.x} - Y ${selectedItem.y}${selectedKind === "asset" ? ` - Z ${selected.z}` : ""}</span>
        </section>

        <section class="map-stage" id="map-stage" aria-label="Mapa operacional editavel">
          <div class="map-grid"></div>
          ${zones.map(mapZone).join("")}
          ${filtered.map(mapObject).join("")}
        </section>

        <footer class="replay-strip">
          <div>
            <strong>Replay operacional</strong>
            <span>Reconstrucao historica do ambiente</span>
          </div>
          <input id="replay-hour" type="range" min="0" max="23" value="${replayHour}" aria-label="Hora do replay operacional" />
          <span class="replay-time">${String(replayHour).padStart(2, "0")}:00</span>
        </footer>
      </section>

      <aside class="right-panel">
        ${selectedKind === "zone" ? zoneEditor(selectedZone()) : assetEditor(selected)}

        <section class="move-card ${selectedKind === "zone" ? "is-disabled" : ""}">
          <h3>Movimentar ativo</h3>
          <div class="destination-grid">
            ${destinations.map((destination) => `<button type="button" data-move="${destination}">${destination}</button>`).join("")}
          </div>
        </section>

        <section class="timeline-card">
          <h3>Cadeia de custodia</h3>
          <div class="timeline">
            ${events
              .filter((item, index) => item.assetId === selected.id || index < 4)
              .slice(0, 5)
              .map(timelineEvent)
              .join("")}
          </div>
        </section>
      </aside>
    </main>
  `;

  bindEvents();
}

function bindEvents() {
  document.getElementById("global-search").addEventListener("input", (event) => {
    query = event.target.value;
    render();
  });

  document.getElementById("replay-hour").addEventListener("input", (event) => {
    replayHour = Number(event.target.value);
    render();
  });

  document.getElementById("toggle-edit").addEventListener("click", () => {
    editMode = !editMode;
    render();
  });

  document.getElementById("map-stage").addEventListener("click", repositionSelectedFromMap);

  document.querySelectorAll("[data-layer]").forEach((button) => {
    button.addEventListener("click", () => setLayer(button.dataset.layer));
  });

  document.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setSelected(button.dataset.select);
    });
  });

  document.querySelectorAll("[data-zone]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setSelectedZone(button.dataset.zone);
    });
  });

  document.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", () => moveSelectedAsset(button.dataset.move));
  });

  document.querySelectorAll("[data-edit]").forEach((field) => {
    field.addEventListener("change", () => {
      const key = field.dataset.edit;
      const numeric = ["x", "y", "z", "width", "length", "height", "weight"].includes(key);
      const value = numeric ? Number(field.value) : field.value;
      if (selectedKind === "zone") {
        updateSelectedZone({ [key]: value });
      } else {
        updateSelectedAsset({ [key]: value }, "Edicao de propriedade");
      }
      render();
    });
  });
}

function assetEditor(selected) {
  return `
    <section class="editor-card">
      <div class="detail-heading">
        <span class="status-dot risk-${selected.risk}"></span>
        <div>
          <h3>Editor do objeto</h3>
          <p>${selected.id} - ${typeLabels[selected.type]} - ${riskLabels[selected.risk]}</p>
        </div>
      </div>
      <form class="asset-editor" id="asset-editor">
        ${textField("label", "Nome no mapa", selected.label)}
        ${selectField("type", "Tipo", selected.type, typeLabels)}
        ${textField("area", "Area atual", selected.area)}
        ${textField("owner", "Responsavel", selected.owner)}
        ${textField("destination", "Destino", selected.destination)}
        ${textField("status", "Status operacional", selected.status)}
        ${selectField("risk", "Risco", selected.risk, riskLabels)}
        <div class="field-row">
          ${numberField("x", "X", selected.x, 0, 100)}
          ${numberField("y", "Y", selected.y, 0, 100)}
          ${numberField("z", "Z", selected.z, 0, 50)}
        </div>
        <div class="field-row">
          ${numberField("width", "Largura", selected.width, 1, 200)}
          ${numberField("length", "Compr.", selected.length, 1, 200)}
          ${numberField("height", "Altura", selected.height, 1, 100)}
        </div>
        ${numberField("weight", "Peso kg", selected.weight, 0, 100000)}
      </form>
    </section>
  `;
}

function zoneEditor(selected) {
  return `
    <section class="editor-card">
      <div class="detail-heading">
        <span class="zone-marker"></span>
        <div>
          <h3>Editor da area</h3>
          <p>${selected.id} - ${selected.type}</p>
        </div>
      </div>
      <form class="asset-editor" id="asset-editor">
        ${textField("label", "Nome no mapa", selected.label)}
        ${selectField("type", "Tipo de area", selected.type, {
          restricted: "Restrita",
          warehouse: "Armazem",
          yard: "Patio",
          gate: "Portao",
          dock: "Doca",
        })}
        <div class="field-row">
          ${numberField("x", "X", selected.x, 0, 100)}
          ${numberField("y", "Y", selected.y, 0, 100)}
          ${numberField("width", "Largura", selected.width, 1, 100)}
        </div>
        ${numberField("height", "Altura", selected.height, 1, 100)}
      </form>
    </section>
  `;
}

function assetRow(item) {
  return `
    <button class="asset-row ${item.id === selectedId ? "is-selected" : ""}" data-select="${item.id}">
      <span class="status-dot risk-${item.risk}"></span>
      <span>
        <strong>${escapeHtml(item.label)}</strong>
        <small>${escapeHtml(item.area)} - ${typeLabels[item.type]}</small>
      </span>
    </button>
  `;
}

function mapObject(item) {
  return `
    <button
      class="map-object ${item.type} risk-${item.risk} ${item.id === selectedId ? "is-selected" : ""}"
      style="left:${item.x}%; top:${item.y}%"
      data-select="${item.id}"
      aria-label="Selecionar ${escapeHtml(item.label)}"
    >
      <span class="object-icon">${typeInitial(item.type)}</span>
      <span>${escapeHtml(item.label)}</span>
    </button>
  `;
}

function mapZone(item) {
  return `
    <button
      class="map-zone ${item.type} ${selectedKind === "zone" && item.id === selectedId ? "is-selected" : ""}"
      style="left:${item.x}%; top:${item.y}%; width:${item.width}%; height:${item.height}%"
      data-zone="${item.id}"
      aria-label="Editar area ${escapeHtml(item.label)}"
    >
      ${escapeHtml(item.label)}
    </button>
  `;
}

function timelineEvent(item) {
  return `
    <article class="timeline-event">
      <time>${item.time}</time>
      <strong>${escapeHtml(item.assetLabel)}</strong>
      <p>${escapeHtml(item.from)} -> ${escapeHtml(item.to)}</p>
      <small>${escapeHtml(item.actor)} - ${escapeHtml(item.authorizer)}</small>
    </article>
  `;
}

function layerButton(layer, label) {
  return `<button type="button" class="${activeLayer === layer ? "is-active" : ""}" data-layer="${layer}">${label}</button>`;
}

function metric(label, value, trend) {
  return `<article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${trend}</small></article>`;
}

function textField(key, label, value) {
  return `<label class="field"><span>${label}</span><input data-edit="${key}" value="${escapeHtml(String(value))}" /></label>`;
}

function numberField(key, label, value, min, max) {
  return `<label class="field"><span>${label}</span><input type="number" data-edit="${key}" value="${value}" min="${min}" max="${max}" /></label>`;
}

function selectField(key, label, value, options) {
  const optionHtml = Object.entries(options)
    .map(([optionValue, optionLabel]) => `<option value="${optionValue}" ${optionValue === value ? "selected" : ""}>${optionLabel}</option>`)
    .join("");
  return `<label class="field"><span>${label}</span><select data-edit="${key}">${optionHtml}</select></label>`;
}

function typeInitial(type) {
  return {
    container: "C",
    equipment: "E",
    vehicle: "V",
    person: "P",
    gate: "G",
    sensor: "S",
  }[type];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

render();
