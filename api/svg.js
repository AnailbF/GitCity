/**
 * api/svg.js — catch-all SVG handler
 * Accessed via: /api/svg?u=rishabhbhartiya&theme=matrix
 * The README embed uses this direct URL — no routing magic needed.
 */

const THEMES = {
    matrix: { bg: "#060d06", surface: "#0c1a0c", accent: "#00ff41", muted: "#3d6b3d", text: "#b0ffb0", levels: ["#0c1a0c", "#0e4020", "#1a7535", "#27ae60", "#00ff41"] },
    noir: { bg: "#04080f", surface: "#0c1525", accent: "#00d4ff", muted: "#3d6080", text: "#e0f4ff", levels: ["#0c1525", "#0d2d4e", "#0e5080", "#1a8fc1", "#00d4ff"] },
    aurora: { bg: "#030710", surface: "#0a1428", accent: "#a855f7", muted: "#4060a0", text: "#d0e8ff", levels: ["#0a1428", "#2d1060", "#5b20a0", "#8b35d0", "#a855f7"] },
    ocean: { bg: "#020c14", surface: "#061828", accent: "#00b4d8", muted: "#2a6080", text: "#cceeff", levels: ["#061828", "#0a3060", "#0a6090", "#0090c0", "#00b4d8"] },
    gold: { bg: "#0c0900", surface: "#1a1200", accent: "#ffd700", muted: "#7a6020", text: "#fff3cc", levels: ["#1a1200", "#4a3000", "#806000", "#c09000", "#ffd700"] },
    ice: { bg: "#060810", surface: "#0d1220", accent: "#a8c8ff", muted: "#5060a0", text: "#e8f0ff", levels: ["#0d1220", "#1a2a50", "#2a4a90", "#4a70d0", "#a8c8ff"] },
};

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function errorSVG(msg) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="80" viewBox="0 0 480 80">
  <rect width="480" height="80" rx="8" fill="#0c0c14"/>
  <text x="16" y="34" font-family="monospace" font-size="13" fill="#ff6b6b">GitCity — could not load skyline</text>
  <text x="16" y="58" font-family="monospace" font-size="10" fill="#555">${esc(msg)}</text>
</svg>`;
}

async function fetchContributions(username) {
    const url = `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`;
    const res = await fetch(url, { headers: { "User-Agent": "GitCity/1.0" } });
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.contributions) || json.contributions.length === 0)
        throw new Error("No contribution data");
    return json.contributions.map(d => ({ date: d.date, count: d.count || 0 }));
}

function buildSVG(username, days, themeName) {
    const t = THEMES[themeName] || THEMES.matrix;
    const total = days.reduce((s, d) => s + d.count, 0);
    const maxC = Math.max(...days.map(d => d.count), 1);
    const CELL = 11, GAP = 2, ROWS = 7, PX = 14, PY = 46;

    // Group into weeks
    const weeks = [];
    let week = new Array(7).fill(null);
    days.forEach(d => {
        const dow = new Date(d.date + "T12:00:00Z").getUTCDay();
        week[dow] = d;
        if (dow === 6) { weeks.push(week); week = new Array(7).fill(null); }
    });
    if (week.some(Boolean)) weeks.push(week);

    const W = PX * 2 + weeks.length * (CELL + GAP);
    const H = PY + ROWS * (CELL + GAP) + 30;
    const lv = c => !c ? 0 : c / maxC < .25 ? 1 : c / maxC < .5 ? 2 : c / maxC < .75 ? 3 : 4;

    // Month labels
    let months = ""; let lastM = -1;
    weeks.forEach((w, wi) => {
        const d = w.find(Boolean); if (!d) return;
        const dt = new Date(d.date + "T12:00:00Z");
        const m = dt.getUTCMonth();
        if (m !== lastM) {
            lastM = m;
            months += `<text x="${PX + wi * (CELL + GAP)}" y="14" font-family="monospace" font-size="9" fill="${t.muted}">${dt.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}</text>`;
        }
    });

    // Cells
    let cells = "";
    weeks.forEach((w, wi) => {
        w.forEach((d, dow) => {
            const x = PX + wi * (CELL + GAP), y = PY + dow * (CELL + GAP);
            cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${t.levels[lv(d?.count || 0)]}"/>`;
        });
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="10" fill="${t.bg}"/>
  <text x="${PX}" y="${PY - 22}" font-family="monospace" font-size="12" font-weight="bold" fill="${t.accent}">${esc(username)}</text>
  <text x="${PX + username.length * 7.8}" y="${PY - 22}" font-family="monospace" font-size="10" fill="${t.muted}">'s GitCity Skyline</text>
  <text x="${PX}" y="${PY - 8}" font-family="monospace" font-size="9" fill="${t.muted}">${total.toLocaleString()} contributions · gitcity.natrajx.in</text>
  ${months}${cells}
  <text x="${PX}" y="${H - 8}" font-family="monospace" font-size="8" fill="${t.muted}">Less</text>
  ${[0, 1, 2, 3, 4].map((l, i) => `<rect x="${PX + 28 + i * 14}" y="${H - 16}" width="${CELL}" height="${CELL}" rx="2" fill="${t.levels[l]}"/>`).join("")}
  <text x="${PX + 105}" y="${H - 8}" font-family="monospace" font-size="8" fill="${t.muted}">More</text>
</svg>`;
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") return res.status(200).end();

    // Read username from ?u= or ?username=
    let username = (req.query.u || req.query.username || "").trim();
    username = username.replace(/\.svg$/i, "").trim();
    const theme = (req.query.theme || "matrix").toLowerCase();

    if (!username || !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(username)) {
        res.setHeader("Content-Type", "image/svg+xml");
        return res.status(400).send(errorSVG("Missing or invalid username. Use ?u=YOUR_USERNAME"));
    }

    try {
        const days = await fetchContributions(username);
        const svg = buildSVG(username, days, theme);
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
        return res.status(200).send(svg);
    } catch (err) {
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).send(errorSVG(err.message));
    }
}