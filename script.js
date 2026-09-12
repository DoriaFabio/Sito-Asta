// ---- 1. DATI ----
// I dati vengono caricati da data.json (export del tuo Excel).
let DATA = {};

// ---- 2. COLONNE PER RUOLO ----
const COLUMNS = {
  portieri: [
    { key: "nome", label: "Nome" },
    { key: "squadra", label: "Squadra" },
    { key: "quot", label: "Quot.", numeric: true },
    { key: "voto", label: "Voto", numeric: true }
  ],
  difensori: [
    { key: "nome", label: "Nome" },
    { key: "squadra", label: "Squadra" },
    { key: "ruolo", label: "Ruolo" },
    { key: "quot", label: "Quot.", numeric: true },
    { key: "slot", label: "Slot", numeric: true }
  ],
  centrocampisti: [
    { key: "nome", label: "Nome" },
    { key: "squadra", label: "Squadra" },
    { key: "ruolo", label: "Ruolo" },
    { key: "quot", label: "Quot.", numeric: true },
    { key: "slot", label: "Slot", numeric: true }
  ],
  attaccanti: [
    { key: "nome", label: "Nome" },
    { key: "squadra", label: "Squadra" },
    { key: "ruolo", label: "Ruolo" },
    { key: "quot", label: "Quot.", numeric: true },
    { key: "slot", label: "Slot", numeric: true }
  ]
};

// ---- 2b. STEMMI SQUADRE (badge con sigla, in attesa di loghi veri) ----
// Ogni squadra ha una sigla di 3 lettere e un colore. Se in futuro vuoi
// usare immagini vere al posto del badge, vedi renderTeamBadge() più sotto.
const TEAMS = {
  "Atalanta":   { sigla: "ATA", colore: "#1a3a8f" },
  "Bologna":    { sigla: "BOL", colore: "#9B1E31" },
  "Cagliari":   { sigla: "CAG", colore: "#AC1B2C" },
  "Como":       { sigla: "COM", colore: "#0F3F66" },
  "Fiorentina": { sigla: "FIO", colore: "#5b2a8f" },
  "Frosinone":  { sigla: "FRO", colore: "#F6D503" },
  "Genoa":      { sigla: "GEN", colore: "#A6121B" },
  "Inter":      { sigla: "INT", colore: "#001E9B" },
  "Juve":       { sigla: "JUV", colore: "#000000" },
  "Lazio":      { sigla: "LAZ", colore: "#41C2EE" },
  "Lecce":      { sigla: "LEC", colore: "#253960" },
  "Milan":      { sigla: "MIL", colore: "#E61B23" },
  "Monza":      { sigla: "MON", colore: "#DD002A" },
  "Napoli":     { sigla: "NAP", colore: "#01A2DA" },
  "Parma":      { sigla: "PAR", colore: "#F6C903" },
  "Roma":       { sigla: "ROM", colore: "#931A2E" },
  "Sassuolo":   { sigla: "SAS", colore: "#1F9F4E" },
  "Torino":     { sigla: "TOR", colore: "#86291E" },
  "Udinese":    { sigla: "UDI", colore: "#000000" },
  "Venezia":    { sigla: "VEN", colore: "#9B8852" }
};

function renderTeamBadge(squadra) {
  const team = TEAMS[squadra];
  const sigla = team ? team.sigla : squadra.slice(0, 3).toUpperCase();
  const colore = team ? team.colore : "#6b6f76";
  return `<span class="tt-anchor">
    <span class="team-badge" style="background:${colore};">${escapeHtml(sigla)}</span>
    <span class="tt tt-team">
      <span class="tt-title">${escapeHtml(squadra)}</span>
    </span>
  </span>`;
}

// ---- 3. STATO ----
let activeRole = "portieri";
let sortState = {}; // { portieri: {key:'quot', dir:-1}, ... }

// ---- 3b. HELPER: NOME, COMMENTO E INFORTUNIO ----
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Tooltip col commento generale: card chiara ancorata al nome.
function renderCommentTooltip(nome, commento) {
  return `<span class="tt">
    <span class="tt-title">${escapeHtml(nome)}</span>
    <span class="tt-body">${escapeHtml(commento)}</span>
  </span>`;
}

// Calcola giorni trascorsi e progresso (0-100) del recupero da un infortunio,
// se ci sono abbastanza dati (dataInizio + giorniStimati). Altrimenti null.
function injuryProgress(infortunio) {
  if (!infortunio.dataInizio || !infortunio.giorniStimati) return null;
  const start = new Date(infortunio.dataInizio);
  if (isNaN(start)) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.max(0, Math.round((Date.now() - start) / msPerDay));
  const totalDays = infortunio.giorniStimati;
  const percent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  return { elapsedDays, totalDays, percent, remainingDays };
}

// Tooltip infortunio: card chiara + barra di avanzamento del recupero.
function renderInjuryTooltip(infortunio) {
  const progress = injuryProgress(infortunio);
  const title = infortunio.descrizione || "Infortunato";

  let barHtml = "";
  if (progress) {
    barHtml = `
    <span class="tt-bar-track"><span class="tt-bar-fill" style="width:${progress.percent}%;"></span></span>
    <span class="tt-bar-caption">
      <span>Fermo da ${progress.elapsedDays} gg</span>
      <span>${progress.remainingDays > 0 ? `~${progress.remainingDays} gg al rientro` : "Rientro imminente"}</span>
    </span>`;
  } else if (infortunio.rientro) {
    barHtml = `<span class="tt-body">Rientro previsto: ${escapeHtml(infortunio.rientro)}</span>`;
  }

  return `<span class="tt tt-injury">
    <span class="tt-pill">Infortunato</span>
    <span class="tt-title">${escapeHtml(title)}</span>${barHtml}
  </span>`;
}

function renderInjuryDot(infortunio) {
  return `<span class="injury-dot"></span>${renderInjuryTooltip(infortunio)}`;
}

// ---- 4. RENDER ----
function render() {
  const query = document.getElementById("search").value.trim().toLowerCase();

  Object.keys(DATA).forEach(role => {
    const panel = document.getElementById(role + "-panel");
    let rows = DATA[role];

    if (query) {
      rows = rows.filter(r =>
        r.nome.toLowerCase().includes(query) ||
        r.squadra.toLowerCase().includes(query)
      );
    }

    const sort = sortState[role];
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        if (typeof av === "number") return (av - bv) * sort.dir;
        return String(av).localeCompare(String(bv)) * sort.dir;
      });
    }

    const cols = COLUMNS[role];
    const thead = `<thead><tr>${cols.map(c => {
      const isSorted = sort && sort.key === c.key;
      const arrow = isSorted ? (sort.dir === 1 ? "▲" : "▼") : "▲";
      return `<th class="${isSorted ? "sorted" : ""}" data-key="${c.key}">${c.label}<span class="arrow">${arrow}</span></th>`;
    }).join("")}</tr></thead>`;

    const tbody = rows.length
      ? `<tbody>${rows.map(r => `<tr>${cols.map(c => {
          const value = r[c.key];
          if (c.key === "nome") {
            const hasComment = !!r.commento;
            const nameGroup = hasComment
              ? `<span class="tt-anchor" tabindex="0"><span class="player-name has-comment">${escapeHtml(value)}</span>${renderCommentTooltip(value, r.commento)}</span>`
              : `<span class="player-name">${escapeHtml(value)}</span>`;
            const injuryGroup = r.infortunio
              ? `<span class="tt-anchor" tabindex="0">${renderInjuryDot(r.infortunio)}</span>`
              : "";
            return `<td class="nome"><span class="player-cell">${nameGroup}${injuryGroup}</span></td>`;
          }
          if (c.key === "squadra") {
            return `<td class="squadra">${renderTeamBadge(value)}</td>`;
          }
          return `<td class="${c.key === "quot" ? "quot" : ""}">${value}</td>`;
        }).join("")}</tr>`).join("")}</tbody>`
      : `<tbody><tr><td colspan="${cols.length}" class="empty">Nessun risultato</td></tr></tbody>`;

    panel.innerHTML = `<table>${thead}${tbody}</table>`;

    panel.querySelectorAll("th").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        const current = sortState[role];
        const dir = current && current.key === key ? -current.dir : 1;
        sortState[role] = { key, dir };
        render();
      });
    });
  });

  const visibleCount = document.querySelector(`#${activeRole}-panel tbody`).children.length;
  const total = DATA[activeRole].length;
  document.getElementById("count").textContent =
    query ? `${visibleCount} di ${total} risultati` : `${total} giocatori`;
}

// ---- 5. TAB SWITCHING ----
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    activeRole = tab.dataset.role;
    document.getElementById(activeRole + "-panel").classList.add("active");
    render();
  });
});

document.getElementById("search").addEventListener("input", render);

// ---- 6. CARICAMENTO DATI E AVVIO ----
fetch("data.json")
  .then(res => res.json())
  .then(data => {
    DATA = data;
    render();
  })
  .catch(err => {
    console.error("Errore nel caricamento di data.json:", err);
    document.getElementById("count").textContent = "Errore nel caricamento dei dati.";
  });
