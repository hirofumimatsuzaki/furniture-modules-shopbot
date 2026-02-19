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
    chairCount: 1,
    chairSeatW: 80,
    chairSideOffset: 0,
    chairLegRise: 0,
    chairLegSlim: 0,
    chairLegTop: 40,
    chairBackY: 100,
    chairBackAngle: -74,
    deskCount: 1,
    deskW: 1820,
    deskD: 910,
    deskLegH: 910,
    deskApron: 182,
    deskLegW: 200,
    deskLegRight1: 250,
    deskLegRight2: 250,
    deskLegLeft1: 250,
    deskLegLeft2: 250,
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
  chair: {
    label: "Chair Parts Generator",
    description:
      "椅子の部品セットを生成します。座面幅や脚長、背もたれ長さを調整して、いただいた椅子形状ロジックに近いパーツをSVG出力できます。",
  },
  desk: {
    label: "Desk Parts Generator",
    description:
      "机の部品セットを生成します。天板・幕板・脚・足先を、いただいた机スクリプトの形状に合わせてSVG出力します。",
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
  "chairCount",
  "chairSeatW",
  "chairSideOffset",
  "chairLegRise",
  "chairLegSlim",
  "chairLegTop",
  "chairBackY",
  "chairBackAngle",
  "deskCount",
  "deskW",
  "deskD",
  "deskLegH",
  "deskApron",
  "deskLegW",
  "deskLegRight1",
  "deskLegRight2",
  "deskLegLeft1",
  "deskLegLeft2",
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
  document.getElementById("tab-chair").addEventListener("click", () => setMode("chair"));
  document.getElementById("tab-desk").addEventListener("click", () => setMode("desk"));

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el.type === "checkbox") {
      el.addEventListener("change", regenerate);
    } else {
      el.addEventListener("input", regenerate);
      el.addEventListener("change", regenerate);
    }
  });
}

function setMode(mode) {
  state.mode = mode;
  document.getElementById("tab-modular").classList.toggle("active", mode === "modular");
  document.getElementById("tab-box").classList.toggle("active", mode === "box");
  document.getElementById("tab-chair").classList.toggle("active", mode === "chair");
  document.getElementById("tab-desk").classList.toggle("active", mode === "desk");

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
  next.chairCount = floor(max(1, next.chairCount));
  next.chairSeatW = constrain(next.chairSeatW, 50, 500);
  next.chairSideOffset = constrain(next.chairSideOffset, -100, 500);
  next.chairLegRise = constrain(next.chairLegRise, -50, 500);
  next.chairLegSlim = constrain(next.chairLegSlim, -200, 200);
  next.chairLegTop = constrain(next.chairLegTop, -200, 300);
  next.chairBackY = constrain(next.chairBackY, -500, 160);
  next.chairBackAngle = constrain(next.chairBackAngle, -89, -20);
  next.deskCount = floor(max(1, next.deskCount));
  next.deskW = constrain(next.deskW, 182, 3640);
  next.deskD = constrain(next.deskD, 91, 1820);
  next.deskLegH = constrain(next.deskLegH, 91, 1820);
  next.deskApron = constrain(next.deskApron, 18, 364);
  next.deskLegW = constrain(next.deskLegW, 1, 1000);
  next.deskLegRight1 = constrain(next.deskLegRight1, 1, 1000);
  next.deskLegRight2 = constrain(next.deskLegRight2, 1, 1000);
  next.deskLegLeft1 = constrain(next.deskLegLeft1, 1, 1000);
  next.deskLegLeft2 = constrain(next.deskLegLeft2, 1, 1000);
  next.thickness = max(3, next.thickness);
  next.toolDia = max(1, next.toolDia);
  next.gap = max(4, next.gap);
  next.sheetW = max(200, next.sheetW);
  next.sheetH = max(200, next.sheetH);

  state.params = next;
  const packed =
    state.mode === "box"
      ? buildBoxParts(next)
      : state.mode === "chair"
        ? buildChairParts(next)
        : state.mode === "desk"
          ? buildDeskParts(next)
          : buildModularParts(next);
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
  const chairInfo = state.mode === "chair" ? ` | chairSet ${p.chairCount}` : "";
  const deskInfo = state.mode === "desk" ? ` | deskSet ${p.deskCount}` : "";
  noStroke();
  fill(30);
  textSize(12);
  text(
    `Mode: ${state.mode}${lidInfo}${chairInfo}${deskInfo} | Sheet ${p.sheetW}x${p.sheetH} mm | thickness ${p.thickness} | tool ${p.toolDia} | clearance ${p.clearance} | parts ${state.parts.length} | dropped ${state.dropped}`,
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

function buildChairParts(p) {
  const parts = [];
  for (let i = 0; i < p.chairCount; i++) {
    const set = createChairSet(i + 1, p);
    parts.push(...set);
  }
  return nestParts(parts, p.sheetW, p.sheetH, p.gap);
}

function createChairSet(index, p) {
  const d = p.thickness;
  const s = p.chairSeatW;
  const s2 = p.chairSideOffset;
  const s3 = p.chairLegRise;
  const s5 = p.chairLegSlim;
  const s6 = p.chairLegTop;
  const s7 = 20;
  const s8 = -80;
  const s11 = 0;
  const yp5 = p.chairBackY;
  const backAngleDeg = p.chairBackAngle;

  const x1 = 140 + s8;
  const y1 = 200 - d;
  const legacyX2 = 145 + s7 + s8;
  const legacyY2 = 100;
  const backLen = dist(x1, y1, legacyX2, legacyY2);
  const backRad = radians(backAngleDeg);
  const x2 = x1 + cos(backRad) * backLen;
  const y2 = y1 + sin(backRad) * backLen;
  const x3 = 30;
  const y3 = 200;
  const x4 = 160 + s2;
  const y4 = 200;

  const yp3 = y1 - 20;
  const yp4 = y1 - 60;
  const yp8 = y4 - d / 9;
  const resultX = calculateXFromY(x1, y1, x2, y2, yp3);
  const resultX2 = calculateXFromY(x1, y1, x2, y2, yp4);
  const resultX3 = calculateXFromY(x1, y1, x2, y2, yp5);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = max(0.0001, dist(x1, y1, x2, y2));
  const offsetX = (-dy / len) * d;
  const offsetY = (dx / len) * d;

  const dx2 = x4 - x3;
  const dy2 = y4 - y3;
  const len2 = max(0.0001, dist(x3, y3, x4, y4));
  const offsetY2 = (dx2 / len2) * d;

  const centerY = 120 + s3 + d;
  const s9 = centerY / 4;
  const s10 = centerY / 1.5;
  const length2 = dist(resultX + s2, yp3, resultX2 + s2, yp4);
  const length4 = dist(resultX2 + s2, yp4, resultX3 + s2, yp5);

  const sokumen = normalizePath([
    pnt(x3, y3),
    pnt(x4 + s2, y4 + s11),
    pnt(x4 + s2, y4 + s11 - offsetY2),
    pnt(x1 + s2 - s11 / 5, y4 + s11 - offsetY2 - s11 / 5),
    pnt(resultX + s2, yp3),
    pnt(resultX + offsetX + s2, yp3 + offsetY),
    pnt(resultX2 + offsetX + s2, yp4 + offsetY),
    pnt(resultX2 + s2, yp4),
    pnt(resultX3 + s2, yp5),
    pnt(resultX3 + s2 + d, yp5 + offsetY),
    pnt(30 + 170 + s2, 200 + centerY / 4),
    pnt(30 + 170 + s2 - d, 200 + centerY / 4),
    pnt(30 + 170 + s2 - d, 200 + centerY / 1.5),
    pnt(30 + 170 + s2, 200 + centerY / 1.5),
    pnt(30 + 170 + s2, 200 + 120 + s3 + d),
    pnt(30 + 155 + s2, 200 + 120 + s3 + d),
    pnt(30 + 155 + s2, 200 + 120 + s3),
    pnt(30 + 140 + s2, 200 + 120 + s3),
    pnt(30 + 120 + s5 + s2, 200 + s6),
    pnt(30 + 45 - s5, 200 + s6),
    pnt(30 - d + 30, 200 + 120 + s3),
    pnt(30 - d + 15, 200 + 120 + s3),
    pnt(30 - d + 15, 200 + 120 + s3 + d),
    pnt(30, 200 + 120 + s3 + d),
    pnt(30, 200 + centerY / 1.5),
    pnt(30 - d, 200 + centerY / 1.5),
    pnt(30 - d, 200 + centerY / 4),
    pnt(30, 200 + centerY / 4),
    pnt(30, 200),
  ]);

  const ue = normalizePath([
    pnt(230 + s2 + d, 100),
    pnt(230 + s2 + 40 + s - d, 100),
    pnt(230 + s2 + 40 + s - d, 140),
    pnt(230 + s2 + 40 + s, 140),
    pnt(230 + s2 + 40 + s, 100 + 170 + 5 + d * 2 + s2),
    pnt(230 + s2, 100 + 170 + 5 + d * 2 + s2),
    pnt(230 + s2, 140),
    pnt(230 + s2 + d, 140),
  ]);

  const semotare = normalizePath([
    pnt(330 + s2 + s, 100),
    pnt(330 + s2 + s + 40 + s, 100),
    pnt(330 + s2 + s + 40 + s, 120),
    pnt(330 + s2 + s + 40 + s - d, 120),
    pnt(330 + s2 + s + 40 + s - d, 120 + length4),
    pnt(330 + s2 + s + 40 + s, 120 + length4),
    pnt(330 + s2 + s + 40 + s, 120 + length4 + length2),
    pnt(330 + s2 + s, 120 + length4 + length2),
    pnt(330 + s2 + s, 120 + length4),
    pnt(330 + s2 + s + d, 120 + length4),
    pnt(330 + s2 + s + d, 120),
    pnt(330 + s2 + s, 120),
  ]);

  const mae = normalizePath([
    pnt(450 + s2 + s * 2, 200 + s3 + 10 - d - s3),
    pnt(450 + s2 + s * 2 + s, 200 + s3 + 10 - d - s3),
    pnt(450 + s2 + s * 2 + s, 200 + s3 + 10 - s3),
    pnt(450 + s2 + s * 2 + s + 20, 200 + s3 + 10 - s3),
    pnt(450 + s2 + s * 2 + s + 20, s9 + d),
    pnt(450 + s2 + s * 2 + s + 20 - d, s9 + d),
    pnt(450 + s2 + s * 2 + s + 20 - d, s10 + d),
    pnt(450 + s2 + s * 2 + s + 20, s10 + d),
    pnt(450 + s2 + s * 2 + s + 20, 200 + s3 + 130 + d),
    pnt(450 + s2 + s * 2 + s + 5, 200 + s3 + 130 + d),
    pnt(450 + s2 + s * 2 + s + 5, 200 + s3 + 130),
    pnt(450 + s2 + s * 2 + s - 10, 200 + s3 + 130),
    pnt(450 + s2 + s * 2 + s - 20 + s5 / 2, 200 + s3 + 60 - s3),
    pnt(450 + s2 + s * 2 + 20 - s5 / 2, 200 + s3 + 60 - s3),
    pnt(450 + s2 + s * 2 + 10, 200 + s3 + 130),
    pnt(450 + s2 + s * 2 - 5, 200 + s3 + 130),
    pnt(450 + s2 + s * 2 - 5, 200 + s3 + 130 + d),
    pnt(450 + s2 + s * 2 - 20, 200 + s3 + 130 + d),
    pnt(450 + s2 + s * 2 - 20, s10 + d),
    pnt(450 + s2 + s * 2 - 20 + d, s10 + d),
    pnt(450 + s2 + s * 2 - 20 + d, s9 + d),
    pnt(450 + s2 + s * 2 - 20, s9 + d),
    pnt(450 + s2 + s * 2 - 20, 200 + s3 + 10 - s3),
    pnt(450 + s2 + s * 2, 200 + s3 + 10 - s3),
  ]);

  const ushiro = normalizePath([
    pnt(500 + s2 + s * 3 + d, 200 + s3 + 30 - s3),
    pnt(500 + s2 + s * 3 + s + 40 - d, 200 + s3 + 30 - s3),
    pnt(500 + s2 + s * 3 + s + 40 - d, s9 + d),
    pnt(500 + s2 + s * 3 + s + 40, s9 + d),
    pnt(500 + s2 + s * 3 + s + 40, s10 + d),
    pnt(500 + s2 + s * 3 + s + 40 - d, s10 + d),
    pnt(500 + s2 + s * 3 + s + 40 - d, 200 + s3 + 130 + d),
    pnt(500 + s2 + s * 3 + s + 20, 200 + s3 + 130 + d),
    pnt(500 + s2 + s * 3 + s + 20, 200 + s3 + 130),
    pnt(500 + s2 + s * 3 + s + 5, 200 + s3 + 130),
    pnt(500 + s2 + s * 3 + s + s5 / 2, 200 + s3 + 60 - s3),
    pnt(500 + s2 + s * 3 + 40 - s5 / 2, 200 + s3 + 60 - s3),
    pnt(500 + s2 + s * 3 + 35, 200 + s3 + 130),
    pnt(500 + s2 + s * 3 + 20, 200 + s3 + 130),
    pnt(500 + s2 + s * 3 + 20, 200 + s3 + 130 + d),
    pnt(500 + s2 + s * 3 + d, 200 + s3 + 130 + d),
    pnt(500 + s2 + s * 3 + d, s10 + d),
    pnt(500 + s2 + s * 3, s10 + d),
    pnt(500 + s2 + s * 3, s9 + d),
    pnt(500 + s2 + s * 3 + d, s9 + d),
  ]);

  const ashi = normalizePath([
    pnt(300 + s2, 50),
    pnt(300 + s2 + 15, 50),
    pnt(300 + s2 + 15, 50 - d),
    pnt(300 + s2 + 30, 50 - d),
    pnt(300 + s2 + 30, 50 - d + 15),
    pnt(300 + s2 - d + 15, 50 + 30),
    pnt(300 + s2 - d, 50 + 30),
    pnt(300 + s2 - d, 50 + 15),
    pnt(300 + s2, 50 + 15),
  ]);

  return [
    makeFreePart(`CHAIR${index}-SOKUMEN`, sokumen.path),
    makeFreePart(`CHAIR${index}-UE`, ue.path),
    makeFreePart(`CHAIR${index}-SEMOTARE`, semotare.path),
    makeFreePart(`CHAIR${index}-MAE`, mae.path),
    makeFreePart(`CHAIR${index}-USHIRO`, ushiro.path),
    makeFreePart(`CHAIR${index}-ASHI`, ashi.path),
  ];
}

function makeFreePart(label, path) {
  const box = pathBounds(path);
  return {
    kind: "chair-panel",
    label,
    w: box.w,
    h: box.h,
    outline: path,
    holes: [],
    x: 0,
    y: 0,
  };
}

function normalizePath(path) {
  const b = pathBounds(path);
  return {
    path: path.map((pt) => ({ x: pt.x - b.minX, y: pt.y - b.minY })),
    w: b.w,
    h: b.h,
  };
}

function pathBounds(path) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pt of path) {
    minX = min(minX, pt.x);
    minY = min(minY, pt.y);
    maxX = max(maxX, pt.x);
    maxY = max(maxY, pt.y);
  }
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

function pnt(x, y) {
  return { x, y };
}

function calculateXFromY(x1, y1, x2, y2, yTarget) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (abs(dx) < 0.0001 || abs(dy) < 0.0001) return x1;
  const m = dy / dx;
  return (yTarget - y1) / m + x1;
}

function buildDeskParts(p) {
  const parts = [];
  for (let i = 0; i < p.deskCount; i++) {
    parts.push(...createDeskSet(i + 1, p));
  }
  return nestParts(parts, p.sheetW, p.sheetH, p.gap);
}

function createDeskSet(index, p) {
  const d = p.thickness;
  const s = p.deskW;
  const s2 = p.deskD;
  const s3 = p.deskLegH;
  const s4 = p.deskApron;
  const s5 = p.deskLegW;
  const s6 = p.deskLegRight1;
  const s7 = p.deskLegRight2;
  const s8 = p.deskLegLeft1;
  const s9 = p.deskLegLeft2;

  const tenban = normalizePath(deskTenbanPath(10, 10, s, s2, d)).path;
  const makuita = normalizePath(deskMakuitaPath(10, 30 + s2, s, s4, d)).path;
  const makuita2 = normalizePath(deskMakuita2Path(30 + s, 10, s2, s4, d)).path;
  const ashi = normalizePath(deskAshiPath(80 + s + s4, 10, s, s3, s4, s5, s6, s8, d)).path;
  const ashi2 = normalizePath(deskAshi2Path(100 + s * 2 + s4, 10, s2, s3, s4, s5, s7, s9, d)).path;
  const ashisaki = normalizePath(deskAshisakiPath(130 + s * 2 + s4 + s2, 10, s5, d)).path;

  return [
    makeFreePart(`DESK${index}-TENBAN`, tenban),
    makeFreePart(`DESK${index}-MAKUITA1`, makuita),
    makeFreePart(`DESK${index}-MAKUITA2`, makuita2),
    makeFreePart(`DESK${index}-ASHI1`, ashi),
    makeFreePart(`DESK${index}-ASHI2`, ashi2),
    makeFreePart(`DESK${index}-ASHISAKI`, ashisaki),
  ];
}

function deskTenbanPath(x, y, s, s2, d) {
  return [
    pnt(x, y),
    pnt(x + s / 3 - (d / 2 + d), y),
    pnt(x + s / 3 - (d / 2 + d), y + d),
    pnt(x + s / 3 - d / 2, y + d),
    pnt(x + s / 3 - d / 2, y + d * 2),
    pnt(x + s / 3 + d / 2, y + d * 2),
    pnt(x + s / 3 + d / 2, y + d),
    pnt(x + s / 3 + d + d / 2, y + d),
    pnt(x + s / 3 + d + d / 2, y),
    pnt(x + s * 2 / 3 - (d / 2 + d), y),
    pnt(x + s * 2 / 3 - (d / 2 + d), y + d),
    pnt(x + s * 2 / 3 - d / 2, y + d),
    pnt(x + s * 2 / 3 - d / 2, y + d * 2),
    pnt(x + s * 2 / 3 + d / 2, y + d * 2),
    pnt(x + s * 2 / 3 + d / 2, y + d),
    pnt(x + s * 2 / 3 + d + d / 2, y + d),
    pnt(x + s * 2 / 3 + d + d / 2, y),
    pnt(x + s, y),
    pnt(x + s, y + s2 / 3 - (d / 2 + d)),
    pnt(x + s - d, y + s2 / 3 - (d / 2 + d)),
    pnt(x + s - d, y + s2 / 3 - d / 2),
    pnt(x + s - d * 2, y + s2 / 3 - d / 2),
    pnt(x + s - d * 2, y + s2 / 3 + d / 2),
    pnt(x + s - d, y + s2 / 3 + d / 2),
    pnt(x + s - d, y + s2 / 3 + (d / 2 + d)),
    pnt(x + s, y + s2 / 3 + (d / 2 + d)),
    pnt(x + s, y + s2 * 2 / 3 - (d / 2 + d)),
    pnt(x + s - d, y + s2 * 2 / 3 - (d / 2 + d)),
    pnt(x + s - d, y + s2 * 2 / 3 - d / 2),
    pnt(x + s - d * 2, y + s2 * 2 / 3 - d / 2),
    pnt(x + s - d * 2, y + s2 * 2 / 3 + d / 2),
    pnt(x + s - d, y + s2 * 2 / 3 + d / 2),
    pnt(x + s - d, y + s2 * 2 / 3 + (d / 2 + d)),
    pnt(x + s, y + s2 * 2 / 3 + (d / 2 + d)),
    pnt(x + s, y + s2),
    pnt(x + s * 2 / 3 + d + d / 2, y + s2),
    pnt(x + s * 2 / 3 + d + d / 2, y + s2 - d),
    pnt(x + s * 2 / 3 + d / 2, y + s2 - d),
    pnt(x + s * 2 / 3 + d / 2, y + s2 - d * 2),
    pnt(x + s * 2 / 3 - d / 2, y + s2 - d * 2),
    pnt(x + s * 2 / 3 - d / 2, y + s2 - d),
    pnt(x + s * 2 / 3 - (d / 2 + d), y + s2 - d),
    pnt(x + s * 2 / 3 - (d / 2 + d), y + s2),
    pnt(x + s / 3 + d + d / 2, y + s2),
    pnt(x + s / 3 + d + d / 2, y + s2 - d),
    pnt(x + s / 3 + d / 2, y + s2 - d),
    pnt(x + s / 3 + d / 2, y + s2 - d * 2),
    pnt(x + s / 3 - d / 2, y + s2 - d * 2),
    pnt(x + s / 3 - d / 2, y + s2 - d),
    pnt(x + s / 3 - (d / 2 + d), y + s2 - d),
    pnt(x + s / 3 - (d / 2 + d), y + s2),
    pnt(x, y + s2),
    pnt(x, y + s2 * 2 / 3 + (d / 2 + d)),
    pnt(x + d, y + s2 * 2 / 3 + (d / 2 + d)),
    pnt(x + d, y + s2 * 2 / 3 + d / 2),
    pnt(x + d * 2, y + s2 * 2 / 3 + d / 2),
    pnt(x + d * 2, y + s2 * 2 / 3 - d / 2),
    pnt(x + d, y + s2 * 2 / 3 - d / 2),
    pnt(x + d, y + s2 * 2 / 3 - (d / 2 + d)),
    pnt(x, y + s2 * 2 / 3 - (d / 2 + d)),
    pnt(x, y + s2 / 3 + (d / 2 + d)),
    pnt(x + d, y + s2 / 3 + (d / 2 + d)),
    pnt(x + d, y + s2 / 3 + d / 2),
    pnt(x + d * 2, y + s2 / 3 + d / 2),
    pnt(x + d * 2, y + s2 / 3 - d / 2),
    pnt(x + d, y + s2 / 3 - d / 2),
    pnt(x + d, y + s2 / 3 - (d / 2 + d)),
    pnt(x, y + s2 / 3 - (d / 2 + d)),
  ];
}

function deskMakuitaPath(x, y, s, s4, d) {
  return [
    pnt(x, y),
    pnt(x + d * 2, y),
    pnt(x + d * 2, y + d),
    pnt(x + s / 3 - d - d / 2, y + d),
    pnt(x + s / 3 - d - d / 2, y),
    pnt(x + s / 3 + d + d / 2, y),
    pnt(x + s / 3 + d + d / 2, y + d),
    pnt(x + s * 2 / 3 - d - d / 2, y + d),
    pnt(x + s * 2 / 3 - d - d / 2, y),
    pnt(x + s * 2 / 3 + d + d / 2, y),
    pnt(x + s * 2 / 3 + d + d / 2, y + d),
    pnt(x + s - d * 2, y + d),
    pnt(x + s - d * 2, y),
    pnt(x + s, y),
    pnt(x + s, y + d * 2),
    pnt(x + s - d, y + d * 2),
    pnt(x + s - d, y + s4),
    pnt(x + s * 2 / 3 + d / 2, y + s4),
    pnt(x + s * 2 / 3 + d / 2, y + s4 - s4 / 2),
    pnt(x + s * 2 / 3 - d / 2, y + s4 - s4 / 2),
    pnt(x + s * 2 / 3 - d / 2, y + s4),
    pnt(x + s / 3 + d / 2, y + s4),
    pnt(x + s / 3 + d / 2, y + s4 - s4 / 2),
    pnt(x + s / 3 - d / 2, y + s4 - s4 / 2),
    pnt(x + s / 3 - d / 2, y + s4),
    pnt(x + d, y + s4),
    pnt(x + d, y + d * 2),
    pnt(x, y + d * 2),
  ];
}

function deskMakuita2Path(x, y, s2, s4, d) {
  return [
    pnt(x, y),
    pnt(x + d * 2, y),
    pnt(x + d * 2, y + d),
    pnt(x + s4, y + d),
    pnt(x + s4, y + s2 - d),
    pnt(x + d * 2, y + s2 - d),
    pnt(x + d * 2, y + s2),
    pnt(x, y + s2),
    pnt(x, y + s2 - d * 2),
    pnt(x + d, y + s2 - d * 2),
    pnt(x + d, y + s2 * 2 / 3 + d + d / 2),
    pnt(x, y + s2 * 2 / 3 + d + d / 2),
    pnt(x, y + s2 * 2 / 3 + d / 2),
    pnt(x + s4 / 2, y + s2 * 2 / 3 + d / 2),
    pnt(x + s4 / 2, y + s2 * 2 / 3 - d / 2),
    pnt(x, y + s2 * 2 / 3 - d / 2),
    pnt(x, y + s2 * 2 / 3 - d - d / 2),
    pnt(x + d, y + s2 * 2 / 3 - d - d / 2),
    pnt(x + d, y + s2 / 3 + d + d / 2),
    pnt(x, y + s2 / 3 + d + d / 2),
    pnt(x, y + s2 / 3 + d / 2),
    pnt(x + s4 / 2, y + s2 / 3 + d / 2),
    pnt(x + s4 / 2, y + s2 / 3 - d / 2),
    pnt(x, y + s2 / 3 - d / 2),
    pnt(x, y + s2 / 3 - d - d / 2),
    pnt(x + d, y + s2 / 3 - d - d / 2),
    pnt(x + d, y + d * 2),
    pnt(x, y + d * 2),
  ];
}

function deskAshiPath(x, y, s, s3, s4, s5, s6, s8, d) {
  return [
    pnt(x, y + d),
    pnt(x + s / 3 - d - d / 2, y + d),
    pnt(x + s / 3 - d - d / 2, y),
    pnt(x + s / 3 - d / 2, y),
    pnt(x + s / 3 - d / 2, y + d * 2),
    pnt(x + s / 3 + d / 2, y + d * 2),
    pnt(x + s / 3 + d / 2, y),
    pnt(x + s / 3 + d + d / 2, y),
    pnt(x + s / 3 + d + d / 2, y + d),
    pnt(x + s * 2 / 3 - d - d / 2, y + d),
    pnt(x + s * 2 / 3 - d - d / 2, y),
    pnt(x + s * 2 / 3 - d / 2, y),
    pnt(x + s * 2 / 3 - d / 2, y + d * 2),
    pnt(x + s * 2 / 3 + d / 2, y + d * 2),
    pnt(x + s * 2 / 3 + d / 2, y),
    pnt(x + s * 2 / 3 + d + d / 2, y),
    pnt(x + s * 2 / 3 + d + d / 2, y + d),
    pnt(x + s - d, y + d),
    pnt(x + s - d, y + s4),
    pnt(x + s, y + s4),
    pnt(x + s, y + s4 + (s3 - s4) / 2),
    pnt(x + s - d, y + s4 + (s3 - s4) / 2),
    pnt(x + s - d, y + s3),
    pnt(x + s - d - s5 / 2, y + s3),
    pnt(x + s - d - s5 / 2, y + s3 - d),
    pnt(x + s - d - s5, y + s3 - d),
    pnt(x + s - d - s6, y + s4),
    pnt(x + s8, y + s4),
    pnt(x + s5, y + s3 - d),
    pnt(x + s5 / 2, y + s3 - d),
    pnt(x + s5 / 2, y + s3),
    pnt(x, y + s3),
    pnt(x, y + s4 + (s3 - s4) / 2),
    pnt(x + d, y + s4 + (s3 - s4) / 2),
    pnt(x + d, y + s4),
    pnt(x, y + s4),
  ];
}

function deskAshi2Path(x, y, s2, s3, s4, s5, s7, s9, d) {
  return [
    pnt(x, y + d),
    pnt(x + s2 / 3 - d - d / 2, y + d),
    pnt(x + s2 / 3 - d - d / 2, y),
    pnt(x + s2 / 3 - d / 2, y),
    pnt(x + s2 / 3 - d / 2, y + d * 2),
    pnt(x + s2 / 3 + d / 2, y + d * 2),
    pnt(x + s2 / 3 + d / 2, y),
    pnt(x + s2 / 3 + d + d / 2, y),
    pnt(x + s2 / 3 + d + d / 2, y + d),
    pnt(x + s2 * 2 / 3 - d - d / 2, y + d),
    pnt(x + s2 * 2 / 3 - d - d / 2, y),
    pnt(x + s2 * 2 / 3 - d / 2, y),
    pnt(x + s2 * 2 / 3 - d / 2, y + d * 2),
    pnt(x + s2 * 2 / 3 + d / 2, y + d * 2),
    pnt(x + s2 * 2 / 3 + d / 2, y),
    pnt(x + s2 * 2 / 3 + d + d / 2, y),
    pnt(x + s2 * 2 / 3 + d + d / 2, y + d),
    pnt(x + s2 - d, y + d),
    pnt(x + s2 - d, y + s4),
    pnt(x + s2, y + s4),
    pnt(x + s2, y + s4 + (s3 - s4) / 2),
    pnt(x + s2 - d, y + s4 + (s3 - s4) / 2),
    pnt(x + s2 - d, y + s3),
    pnt(x + s2 - d - s5 / 2, y + s3),
    pnt(x + s2 - d - s5 / 2, y + s3 - d),
    pnt(x + s2 - d - s5, y + s3 - d),
    pnt(x + s2 - d - s7, y + s4),
    pnt(x + s9, y + s4),
    pnt(x + s5, y + s3 - d),
    pnt(x + s5 / 2, y + s3 - d),
    pnt(x + s5 / 2, y + s3),
    pnt(x, y + s3),
    pnt(x, y + s4 + (s3 - s4) / 2),
    pnt(x + d, y + s4 + (s3 - s4) / 2),
    pnt(x + d, y + s4),
    pnt(x, y + s4),
  ];
}

function deskAshisakiPath(x, y, s5, d) {
  return [
    pnt(x + s5 / 2 - d, y),
    pnt(x + (s5 + s5 / 2) / 2, y),
    pnt(x + s5 + s5 / 2 - d, y + (s5 + s5 / 2) / 2),
    pnt(x + s5 + s5 / 2 - d, y + s5 + d),
    pnt(x + s5 - d, y + s5 + d),
    pnt(x + s5 - d, y + s5),
    pnt(x + s5 / 2, y + s5),
    pnt(x + s5 / 2, y + s5 / 2),
    pnt(x + s5 / 2 - d, y + s5 / 2),
  ];
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
