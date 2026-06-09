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
let query = "";
let activeLayer = "all";
let replayHour = 9;

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

function event(id, assetId, assetLabel, from, to, actor, authorizer, reason, time) {
  return { id, assetId, assetLabel, from, to, actor, authorizer, reason, time };
}

function filteredAssets() {
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

function selectedAsset() {
  return assets.find((item) => item.id === selectedId) || assets[0];
}

function moveSelectedAsset(destination) {
  const current = selectedAsset();
  const minute = String((events.length * 7 + 11) % 60).padStart(2, "0");
  const newEvent = event(
    `EVT-${String(events.length + 1).padStart(3, "0")}`,
    current.id,
    current.label,
    current.area,
    destination,
    "Operador VISION",
    "Torre de Controle",
    "Movimentacao validada pelo motor espacial",
    `09:${minute}`,
  );

  assets = assets.map((item) =>
    item.id === selectedId
      ? {
          ...item,
          area: destination,
          destination: destination === "Navio Atlas" ? "Embarque confirmado" : item.destination,
          status: "Movimentado agora",
          lastMoveMinutes: 0,
          x: Math.min(88, Math.max(12, item.x + 9 - events.length)),
          y: Math.min(84, Math.max(16, item.y + 6)),
          risk: destination === "Navio Atlas" ? "normal" : item.risk,
        }
      : item,
  );
  events = [newEvent, ...events];
  render();
}

function setLayer(layer) {
  activeLayer = layer;
  render();
}

function setSelected(id) {
  selectedId = id;
  render();
}

function iconGlyph(type) {
  return {
    container: "▤",
    equipment: "⌁",
    vehicle: "▰",
    person: "●",
    gate: "⌂",
    sensor: "◌",
  }[type];
}

function render() {
  const selected = selectedAsset();
  const visibleAssets = filteredAssets();
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
          <input id="global-search" value="${escapeHtml(query)}" placeholder="Container, area, destino" />
        </div>

        <nav class="layer-list" aria-label="Camadas operacionais">
          ${layerButton("all", "Tudo")}
          ${Object.entries(typeLabels)
            .map(([type, label]) => layerButton(type, label))
            .join("")}
        </nav>

        <section class="asset-list" aria-label="Objetos operacionais">
          ${visibleAssets
            .map(
              (item) => `
                <button class="asset-row ${item.id === selectedId ? "is-selected" : ""}" data-select="${item.id}">
                  <span class="status-dot risk-${item.risk}"></span>
                  <span>
                    <strong>${item.label}</strong>
                    <small>${item.area}</small>
                  </span>
                </button>
              `,
            )
            .join("")}
        </section>
      </aside>

      <section class="command-center">
        <header class="top-bar">
          <div>
            <h2>Digital Twin Corporativo</h2>
            <p>Porto Santos-01 · operacao ao vivo · replay ${String(replayHour).padStart(2, "0")}:00</p>
          </div>
          <div class="top-actions">
            ${iconButton("target", "Centralizar mapa")}
            ${iconButton("layers", "Alternar camadas")}
            ${iconButton("shield", "Abrir auditoria")}
          </div>
        </header>

        <section class="metrics-grid" aria-label="Indicadores operacionais">
          ${metric("Objetos vivos", String(assets.length), "+3 hoje")}
          ${metric("Movimentacoes", String(events.length), "tempo real")}
          ${metric("Riscos criticos", String(criticalCount), "acao imediata")}
          ${metric("Peso rastreado", `${Math.round(totalWeight / 1000)}t`, "sob custodia")}
        </section>

        <section class="map-stage" aria-label="Mapa operacional">
          <div class="map-grid"></div>
          <div class="restricted-zone zone-a">Area Restrita</div>
          <div class="restricted-zone zone-b">Armazem 03</div>
          <div class="dock-line">Doca 04 · Berco Atlas</div>
          ${visibleAssets
            .map(
              (item) => `
                <button
                  class="map-object ${item.type} risk-${item.risk} ${item.id === selectedId ? "is-selected" : ""}"
                  style="left:${item.x}%; top:${item.y}%"
                  data-select="${item.id}"
                  aria-label="Selecionar ${item.label}"
                >
                  <span class="object-icon">${iconGlyph(item.type)}</span>
                  <span>${item.label}</span>
                </button>
              `,
            )
            .join("")}
        </section>

        <footer class="replay-strip">
          <div>
            <strong>Replay operacional</strong>
            <span>Reconstrua o ambiente por data e hora</span>
          </div>
          <input id="replay-hour" type="range" min="0" max="23" value="${replayHour}" aria-label="Hora do replay operacional" />
          <span class="replay-time">${String(replayHour).padStart(2, "0")}:00</span>
        </footer>
      </section>

      <aside class="right-panel">
        <section class="detail-card">
          <div class="detail-heading">
            <span class="status-dot risk-${selected.risk}"></span>
            <div>
              <h3>${selected.label}</h3>
              <p>${typeLabels[selected.type]} · ${riskLabels[selected.risk]}</p>
            </div>
          </div>
          <dl class="asset-specs">
            ${spec("Local atual", selected.area)}
            ${spec("Responsavel", selected.owner)}
            ${spec("Destino", selected.destination)}
            ${spec("XYZ", `${selected.x}, ${selected.y}, ${selected.z}`)}
            ${spec("Dimensoes", `${selected.width} x ${selected.length} x ${selected.height} m`)}
            ${spec("Status", selected.status)}
          </dl>
        </section>

        <section class="move-card">
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
              .map(
                (item) => `
                  <article class="timeline-event">
                    <time>${item.time}</time>
                    <strong>${item.assetLabel}</strong>
                    <p>${item.from} -> ${item.to}</p>
                    <small>${item.actor} · ${item.authorizer}</small>
                  </article>
                `,
              )
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

  document.querySelectorAll("[data-layer]").forEach((button) => {
    button.addEventListener("click", () => setLayer(button.dataset.layer));
  });

  document.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => setSelected(button.dataset.select));
  });

  document.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", () => moveSelectedAsset(button.dataset.move));
  });
}

function layerButton(layer, label) {
  return `<button type="button" class="${activeLayer === layer ? "is-active" : ""}" data-layer="${layer}">${label}</button>`;
}

function metric(label, value, trend) {
  return `<article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${trend}</small></article>`;
}

function spec(label, value) {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

function iconButton(name, label) {
  return `<button type="button" aria-label="${label}">${iconSvg(name)}</button>`;
}

function iconSvg(name) {
  const paths = {
    target: `<circle cx="12" cy="12" r="7"></circle><circle cx="12" cy="12" r="2"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>`,
    layers: `<path d="m12 3 8 4-8 4-8-4 8-4Z"></path><path d="m4 12 8 4 8-4"></path><path d="m4 17 8 4 8-4"></path>`,
    shield: `<path d="M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z"></path><path d="m9 12 2 2 4-5"></path>`,
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

render();
