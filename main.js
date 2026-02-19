const state = {
  mode: "modular",
  params: {
    sheetW: 1200,
    sheetH: 900,
    moduleSize: 240,
    panelCount: 8,
    edgeSlots: 3,
    boxW: 360,
    boxD: 260,
    boxH: 280,
    boxCount: 1,
    boxHasLid: true,
    thickness: 15,
    clearance: 0.2,
    toolDia: 6,
    gap: 16,
  },
  parts: [],
  dropped: 0,
  scale: 1,
};

const modeMeta = {
  modular: {
    label: "Modular Parts Generator",
    description:
      "合板の廃材から再利用しやすい部品を生成します。単位は mm。外周と内側スロットを SVG で出力して CAM へ渡してください。",
  },
  box: {
    label: "Box Kit Generator",
    description:
      "箱を組み立てるための6面パネルセットを生成します。蓋なしを選ぶと側板上辺はフラットになり、並べて棚構成にしやすくなります。",
  },
};

const ids = [
  "sheetW",
  "sheetH",
  "moduleSize",
  "panelCount",
  "edgeSlots",
  "boxW",
  "boxD",
  "boxH",
  "boxCount",
  "boxHasLid",
  "thickness",
  "clearance",
  "toolDia",
  "gap",
];

function setup() {
  const wrap = document.getElementById("canvas-wrap");
  const c = createCanvas(1100, 820);
  c.parent(wrap);
  strokeCap(SQUARE);
  noLoop();
  bindUI();
  setMode("modular");
  regenerate();
}

function draw() {
  background(255);
  const p = state.params;
  const margin = 24;
  state.scale = min((width - margin * 2) / p.sheetW, (height - margin * 2) / p.sheetH);

  push();
  translate((width - p.sheetW * state.scale) * 0.5, (height - p.sheetH * state.scale) * 0.5);
  scale(state.scale);
  drawSheet();
  for (const part of state.parts) {
    drawPart(part);
  }
  pop();

  drawLegend();
}

function bindUI() {
  document.getElementById("apply").addEventListener("click", regenerate);
  document.getElementById("export").addEventListener("click", exportSvg);
  document.getElementById("tab-modular").addEventListener("click", () => setMode("modular"));
  document.getElementById("tab-box").addEventListener("click", () => setMode("box"));

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el.type === "checkbox") {
      el.addEventListener("change", regenerate);
    } else {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") regenerate();
      });
    }
  });
}

function setMode(mode) {
  state.mode = mode;
  document.getElementById("tab-modular").classList.toggle("active", mode === "modular");
  document.getElementById("tab-box").classList.toggle("active", mode === "box");

  const title = document.querySelector("h1");
  const desc = document.getElementById("mode-description");
  title.textContent = modeMeta[mode].label;
  desc.textContent = modeMeta[mode].description;

  const groups = document.querySelectorAll(".group");
  groups.forEach((group) => {
    const groupMode = group.dataset.mode || "all";
    const visible = groupMode === "all" || groupMode === mode;
    group.classList.toggle("hidden", !visible);
  });
  regenerate();
}

function regenerate() {
  const next = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    next[id] = el.type === "checkbox" ? el.checked : Number(el.value);
  }

  next.panelCount = floor(max(1, next.panelCount));
  next.edgeSlots = floor(constrain(next.edgeSlots, 1, 9));
  next.moduleSize = max(80, next.moduleSize);
  next.boxW = max(120, next.boxW);
  next.boxD = max(120, next.boxD);
  next.boxH = max(120, next.boxH);
  next.boxCount = floor(max(1, next.boxCount));
  next.thickness = max(3, next.thickness);
  next.toolDia = max(1, next.toolDia);
  next.gap = max(4, next.gap);
  next.sheetW = max(200, next.sheetW);
  next.sheetH = max(200, next.sheetH);

  state.params = next;
  const packed = state.mode === "box" ? buildBoxParts(next) : buildModularParts(next);
  state.parts = packed.parts;
  state.dropped = packed.dropped;
  redraw();
}

function exportSvg() {
  const p = state.params;
  if (typeof SVG === "undefined") {
    alert("SVG出力ライブラリ(p5.svg)が読み込めていません。ページを再読み込みしてください。");
    return;
  }

  const g = createGraphics(p.sheetW, p.sheetH, SVG);
  g.background(255);
  renderTo(g, p, state.parts);

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  g.save(`shopbot-${state.mode}-${stamp}.svg`);
}

function renderTo(g, p, parts) {
  g.push();
  g.strokeWeight(0.2);
  g.noFill();
  g.stroke(20);
  g.rect(0, 0, p.sheetW, p.sheetH);
  for (const part of parts) drawPartOn(g, part);
  g.pop();
}

function drawSheet() {
  const p = state.params;
  stroke(80);
  strokeWeight(0.8 / state.scale);
  noFill();
  rect(0, 0, p.sheetW, p.sheetH);
}

function drawPart(part) {
  stroke(20);
  strokeWeight(0.5 / state.scale);
  noFill();
  drawPath(part.outline, part.x, part.y);
  for (const hole of part.holes) drawPath(hole, part.x, part.y);
  fill(40);
  noStroke();
  textSize(8 / state.scale);
  text(part.label, part.x + 4, part.y + 12);
}

function drawPartOn(g, part) {
  g.push();
  g.stroke(20);
  g.strokeWeight(0.2);
  g.noFill();
  drawPathOn(g, part.outline, part.x, part.y);
  for (const hole of part.holes) drawPathOn(g, hole, part.x, part.y);
  g.pop();
}

function drawPath(path, ox = 0, oy = 0) {
  beginShape();
  for (const pt of path) vertex(ox + pt.x, oy + pt.y);
  endShape(CLOSE);
}

function drawPathOn(g, path, ox = 0, oy = 0) {
  g.beginShape();
  for (const pt of path) g.vertex(ox + pt.x, oy + pt.y);
  g.endShape(CLOSE);
}

function drawLegend() {
  const p = state.params;
  const lidInfo = state.mode === "box" ? ` | lid ${p.boxHasLid ? "on" : "off"}` : "";
  noStroke();
  fill(30);
  textSize(12);
  text(
    `Mode: ${state.mode}${lidInfo} | Sheet ${p.sheetW}x${p.sheetH} mm | thickness ${p.thickness} | tool ${p.toolDia} | clearance ${p.clearance} | parts ${state.parts.length} | dropped ${state.dropped}`,
    16,
    18
  );
}

function buildModularParts(p) {
  const parts = [];
  const slotW = p.thickness + p.clearance;
  const slotD = p.thickness;
  const radius = p.toolDia * 0.5;

  for (let i = 0; i < p.panelCount; i++) {
    parts.push({
      kind: "panel",
      label: `PANEL-${i + 1}`,
      w: p.moduleSize,
      h: p.moduleSize,
      outline: slottedRect(p.moduleSize, p.moduleSize, p.edgeSlots, slotW, slotD),
      holes: dogboneSet(p.moduleSize, p.moduleSize, p.edgeSlots, slotW, slotD, radius),
      x: 0,
      y: 0,
    });
  }

  const braceCount = max(2, floor(p.panelCount / 2));
  const braceW = p.moduleSize;
  const braceH = p.thickness * 2.4;
  const braceSlots = max(2, p.edgeSlots + 1);
  for (let i = 0; i < braceCount; i++) {
    parts.push({
      kind: "brace",
      label: `BRACE-${i + 1}`,
      w: braceW,
      h: braceH,
      outline: rectPath(braceW, braceH),
      holes: edgeSlotRects(braceW, braceH, braceSlots, slotW, slotD),
      x: 0,
      y: 0,
    });
  }

  const cornerCount = max(4, floor(p.panelCount / 2));
  const cw = p.thickness * 6;
  const ch = p.thickness * 6;
  for (let i = 0; i < cornerCount; i++) {
    parts.push({
      kind: "corner",
      label: `CORNER-${i + 1}`,
      w: cw,
      h: ch,
      outline: lBracketPath(cw, ch, p.thickness * 2.2),
      holes: cornerSlotRects(cw, ch, slotW, slotD),
      x: 0,
      y: 0,
    });
  }
  return nestParts(parts, p.sheetW, p.sheetH, p.gap);
}

function buildBoxParts(p) {
  const parts = [];
  const fingerCount = floor(constrain(p.edgeSlots, 1, 12));
  const depth = p.thickness;
  const radius = p.toolDia * 0.5;

  for (let i = 0; i < p.boxCount; i++) {
    if (p.boxHasLid) {
      parts.push(
        makeFingerPanel(
          `BOX${i + 1}-TOP`,
          p.boxW,
          p.boxD,
          fingerCount,
          depth,
          p.clearance,
          radius,
          { top: "male", right: "male", bottom: "male", left: "male" }
        )
      );
    }
    parts.push(
      makeFingerPanel(
        `BOX${i + 1}-BOTTOM`,
        p.boxW,
        p.boxD,
        fingerCount,
        depth,
        p.clearance,
        radius,
        { top: "male", right: "male", bottom: "male", left: "male" }
      )
    );
    parts.push(
      makeFingerPanel(
        `BOX${i + 1}-FRONT`,
        p.boxW,
        p.boxH,
        fingerCount,
        depth,
        p.clearance,
        radius,
        { top: p.boxHasLid ? "female" : "flat", right: "male", bottom: "female", left: "male" }
      )
    );
    parts.push(
      makeFingerPanel(
        `BOX${i + 1}-BACK`,
        p.boxW,
        p.boxH,
        fingerCount,
        depth,
        p.clearance,
        radius,
        { top: p.boxHasLid ? "female" : "flat", right: "male", bottom: "female", left: "male" }
      )
    );
    parts.push(
      makeFingerPanel(
        `BOX${i + 1}-LEFT`,
        p.boxD,
        p.boxH,
        fingerCount,
        depth,
        p.clearance,
        radius,
        { top: p.boxHasLid ? "female" : "flat", right: "female", bottom: "female", left: "female" }
      )
    );
    parts.push(
      makeFingerPanel(
        `BOX${i + 1}-RIGHT`,
        p.boxD,
        p.boxH,
        fingerCount,
        depth,
        p.clearance,
        radius,
        { top: p.boxHasLid ? "female" : "flat", right: "female", bottom: "female", left: "female" }
      )
    );
  }
  return nestParts(parts, p.sheetW, p.sheetH, p.gap);
}

function makeFingerPanel(label, w, h, fingerCount, depth, clearance, radius, edges) {
  const outline = fingerJointRect(w, h, fingerCount, depth, clearance, edges);
  const holes = fingerReliefs(w, h, fingerCount, depth, edges, radius);
  return {
    kind: "box-panel",
    label,
    w,
    h,
    outline,
    holes,
    x: 0,
    y: 0,
  };
}

function nestParts(parts, sheetW, sheetH, gap) {
  const packed = [];
  let x = gap;
  let y = gap;
  let rowH = 0;

  for (const part of parts) {
    if (x + part.w + gap > sheetW) {
      x = gap;
      y += rowH + gap;
      rowH = 0;
    }
    if (y + part.h + gap > sheetH) break;
    packed.push({ ...part, x, y });
    x += part.w + gap;
    rowH = max(rowH, part.h);
  }
  return { parts: packed, dropped: parts.length - packed.length };
}

function rectPath(w, h) {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}

function slottedRect(w, h, count, slotW, slotD) {
  const out = [];
  const top = edgeWithSlots(0, 0, w, 0, count, slotW, slotD, "down");
  const right = edgeWithSlots(w, 0, w, h, count, slotW, slotD, "left");
  const bottom = edgeWithSlots(w, h, 0, h, count, slotW, slotD, "up");
  const left = edgeWithSlots(0, h, 0, 0, count, slotW, slotD, "right");
  out.push(...top, ...right.slice(1), ...bottom.slice(1), ...left.slice(1));
  return out;
}

function edgeWithSlots(x1, y1, x2, y2, count, slotW, slotD, inward) {
  const pts = [{ x: x1, y: y1 }];
  const horiz = y1 === y2;
  const len = horiz ? abs(x2 - x1) : abs(y2 - y1);
  const dir = horiz ? Math.sign(x2 - x1) : Math.sign(y2 - y1);
  const margin = len * 0.14;
  const usable = len - margin * 2;
  const step = usable / count;

  for (let i = 0; i < count; i++) {
    const c = margin + step * (i + 0.5);
    const s1 = c - slotW * 0.5;
    const s2 = c + slotW * 0.5;
    const a = edgePoint(x1, y1, horiz, dir, s1);
    const b = edgePoint(x1, y1, horiz, dir, s2);
    pts.push(a);
    pts.push(offsetPoint(a, inward, slotD));
    pts.push(offsetPoint(b, inward, slotD));
    pts.push(b);
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

function edgePoint(x, y, horiz, dir, d) {
  if (horiz) return { x: x + dir * d, y };
  return { x, y: y + dir * d };
}

function offsetPoint(pt, inward, d) {
  if (inward === "down") return { x: pt.x, y: pt.y + d };
  if (inward === "up") return { x: pt.x, y: pt.y - d };
  if (inward === "left") return { x: pt.x - d, y: pt.y };
  return { x: pt.x + d, y: pt.y };
}

function dogboneSet(w, h, count, slotW, slotD, r) {
  const holes = [];
  holes.push(...dogboneEdge(0, 0, w, 0, count, slotW, slotD, "down", r));
  holes.push(...dogboneEdge(w, 0, w, h, count, slotW, slotD, "left", r));
  holes.push(...dogboneEdge(w, h, 0, h, count, slotW, slotD, "up", r));
  holes.push(...dogboneEdge(0, h, 0, 0, count, slotW, slotD, "right", r));
  return holes;
}

function dogboneEdge(x1, y1, x2, y2, count, slotW, slotD, inward, r) {
  const paths = [];
  const horiz = y1 === y2;
  const len = horiz ? abs(x2 - x1) : abs(y2 - y1);
  const dir = horiz ? Math.sign(x2 - x1) : Math.sign(y2 - y1);
  const margin = len * 0.14;
  const usable = len - margin * 2;
  const step = usable / count;

  for (let i = 0; i < count; i++) {
    const c = margin + step * (i + 0.5);
    const s1 = c - slotW * 0.5;
    const s2 = c + slotW * 0.5;
    const a = edgePoint(x1, y1, horiz, dir, s1);
    const b = edgePoint(x1, y1, horiz, dir, s2);
    const ai = offsetPoint(a, inward, slotD);
    const bi = offsetPoint(b, inward, slotD);
    paths.push(circlePath(ai.x, ai.y, r, 10));
    paths.push(circlePath(bi.x, bi.y, r, 10));
  }
  return paths;
}

function circlePath(cx, cy, r, steps) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (TWO_PI * i) / steps;
    pts.push({ x: cx + cos(t) * r, y: cy + sin(t) * r });
  }
  return pts;
}

function fingerJointRect(w, h, count, depth, clearance, edges) {
  const path = [{ x: 0, y: 0 }];
  appendFingerEdge(path, {
    sx: 0,
    sy: 0,
    tx: 1,
    ty: 0,
    nx: 0,
    ny: -1,
    len: w,
    edgeType: edges.top,
    count,
    depth,
    clearance,
  });
  appendFingerEdge(path, {
    sx: w,
    sy: 0,
    tx: 0,
    ty: 1,
    nx: 1,
    ny: 0,
    len: h,
    edgeType: edges.right,
    count,
    depth,
    clearance,
  });
  appendFingerEdge(path, {
    sx: w,
    sy: h,
    tx: -1,
    ty: 0,
    nx: 0,
    ny: 1,
    len: w,
    edgeType: edges.bottom,
    count,
    depth,
    clearance,
  });
  appendFingerEdge(path, {
    sx: 0,
    sy: h,
    tx: 0,
    ty: -1,
    nx: -1,
    ny: 0,
    len: h,
    edgeType: edges.left,
    count,
    depth,
    clearance,
  });
  return path;
}

function appendFingerEdge(path, cfg) {
  const segments = cfg.count * 2 + 1;
  const segLen = cfg.len / segments;
  const offset = cfg.edgeType === "male" ? cfg.depth : cfg.edgeType === "female" ? -cfg.depth : 0;
  const widthAdjust =
    cfg.edgeType === "male" ? -cfg.clearance : cfg.edgeType === "female" ? cfg.clearance : 0;

  for (let i = 0; i < segments; i++) {
    const sA = i * segLen;
    const sB = (i + 1) * segLen;
    const active = i % 2 === 1 && (cfg.edgeType === "male" || cfg.edgeType === "female");

    if (!active) {
      path.push(pointOnEdge(cfg, sB, 0));
      continue;
    }

    const span = constrain(segLen + widthAdjust, segLen * 0.35, segLen * 1.65);
    const trim = (segLen - span) * 0.5;
    const s0 = sA + trim;
    const s1 = sB - trim;

    path.push(pointOnEdge(cfg, s0, 0));
    path.push(pointOnEdge(cfg, s0, offset));
    path.push(pointOnEdge(cfg, s1, offset));
    path.push(pointOnEdge(cfg, s1, 0));
    path.push(pointOnEdge(cfg, sB, 0));
  }
}

function pointOnEdge(cfg, s, normalOffset) {
  return {
    x: cfg.sx + cfg.tx * s + cfg.nx * normalOffset,
    y: cfg.sy + cfg.ty * s + cfg.ny * normalOffset,
  };
}

function fingerReliefs(w, h, count, depth, edges, radius) {
  const holes = [];
  const specs = [
    { sx: 0, sy: 0, tx: 1, ty: 0, nx: 0, ny: -1, len: w, edgeType: edges.top },
    { sx: w, sy: 0, tx: 0, ty: 1, nx: 1, ny: 0, len: h, edgeType: edges.right },
    { sx: w, sy: h, tx: -1, ty: 0, nx: 0, ny: 1, len: w, edgeType: edges.bottom },
    { sx: 0, sy: h, tx: 0, ty: -1, nx: -1, ny: 0, len: h, edgeType: edges.left },
  ];

  for (const spec of specs) {
    if (spec.edgeType !== "female") continue;
    const segments = count * 2 + 1;
    const segLen = spec.len / segments;
    for (let i = 1; i < segments; i += 2) {
      const sA = i * segLen;
      const sB = (i + 1) * segLen;
      const p1 = pointOnEdge(spec, sA, -depth);
      const p2 = pointOnEdge(spec, sB, -depth);
      holes.push(circlePath(p1.x, p1.y, radius, 10));
      holes.push(circlePath(p2.x, p2.y, radius, 10));
    }
  }
  return holes;
}

function edgeSlotRects(w, h, count, slotW, slotD) {
  const holes = [];
  const margin = w * 0.12;
  const usable = w - margin * 2;
  const step = usable / count;
  for (let i = 0; i < count; i++) {
    const cx = margin + step * (i + 0.5);
    holes.push([
      { x: cx - slotW * 0.5, y: 0 },
      { x: cx + slotW * 0.5, y: 0 },
      { x: cx + slotW * 0.5, y: slotD },
      { x: cx - slotW * 0.5, y: slotD },
    ]);
    holes.push([
      { x: cx - slotW * 0.5, y: h - slotD },
      { x: cx + slotW * 0.5, y: h - slotD },
      { x: cx + slotW * 0.5, y: h },
      { x: cx - slotW * 0.5, y: h },
    ]);
  }
  return holes;
}

function lBracketPath(w, h, cut) {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: cut },
    { x: cut, y: cut },
    { x: cut, y: h },
    { x: 0, y: h },
  ];
}

function cornerSlotRects(w, h, slotW, slotD) {
  const holes = [];
  const cx = w * 0.5;
  const cy = h * 0.5;
  holes.push([
    { x: cx - slotW * 0.5, y: 0 },
    { x: cx + slotW * 0.5, y: 0 },
    { x: cx + slotW * 0.5, y: slotD },
    { x: cx - slotW * 0.5, y: slotD },
  ]);
  holes.push([
    { x: 0, y: cy - slotW * 0.5 },
    { x: slotD, y: cy - slotW * 0.5 },
    { x: slotD, y: cy + slotW * 0.5 },
    { x: 0, y: cy + slotW * 0.5 },
  ]);
  return holes;
}
