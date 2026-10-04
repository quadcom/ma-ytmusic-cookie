// Tick and warning icons, built as DOM nodes rather than HTML strings so no page ever assigns
// markup to innerHTML (Mozilla's review flags that).
const ICON_PATHS = { ok: ["M5 12l5 5 9-10"], warn: ["M12 4 21 20H3Z", "M12 10v4M12 17h.01"] };

function iconSvg(kind) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const d of ICON_PATHS[kind]) {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}
