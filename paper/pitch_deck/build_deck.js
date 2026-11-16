// SwarSetu pitch deck v2: bright, star motif (Taare Zameen Par), pptxgenjs
const pptxgen = require("pptxgenjs");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const OUT = process.argv[2] || "SwarSetu_Pitch_Deck.pptx";
const AUTHOR = "Ahaan Luther", EMAIL = "ahaanluther@gmail.com";

const P = {
  ink: "1E1B4B", deep: "3B0F8C", violet: "7C3AED", pink: "DB2777", yellow: "FBBF24",
  cyan: "0891B2", green: "059669", orange: "EA580C", white: "FFFFFF", muted: "64748B",
  lav: "F5F3FF", tCyan: "ECFEFF", tPink: "FDF2F8", tOrange: "FFF7ED", tGreen: "ECFDF5", tYellow: "FEF9C3",
  base: "CBD5E1",
};
const THEME = {
  name: "SwarSetu Bright", headFontFace: "Arial Black", bodyFontFace: "Calibri",
  colors: { dk1: P.ink, lt1: P.white, dk2: P.deep, lt2: P.lav, accent1: P.violet, accent2: P.pink,
    accent3: P.yellow, accent4: P.cyan, accent5: P.green, accent6: P.orange, hlink: P.violet, folHlink: P.pink },
};
const HF = THEME.headFontFace, BF = THEME.bodyFontFace;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: HF, bodyFontFace: BF };
pres.title = "SwarSetu: AI screening for learning disorders";
pres.author = AUTHOR;
const S = pres.ShapeType;

// ---------- generated art ----------
function starPts(cx, cy, R, r, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n, rad = i % 2 ? r : R;
    pts.push((cx + rad * Math.cos(a)).toFixed(1) + "," + (cy + rad * Math.sin(a)).toFixed(1));
  }
  return pts.join(" ");
}
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
async function bgPNG(stops, nStars, seed, starColors, blobs = true, avoid = []) {
  const r = rng(seed), W = 1920, Hh = 1080;
  let stars = "";
  for (let i = 0; i < nStars; i++) {
    const x = r() * W, y = r() * Hh, R = 4 + r() * (i % 9 === 0 ? 26 : 10), c = starColors[i % starColors.length];
    if (avoid.some(([x0, y0, x1, y1]) => x > x0 - R && x < x1 + R && y > y0 - R && y < y1 + R)) continue;
    stars += `<polygon points="${starPts(x, y, R, R * 0.45)}" fill="#${c}" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  }
  const g = stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)) * 100}%" stop-color="#${c}"/>`).join("");
  const b = blobs ? `<circle cx="1720" cy="140" r="380" fill="#ffffff" opacity="0.07"/><circle cx="160" cy="980" r="300" fill="#ffffff" opacity="0.06"/><circle cx="1500" cy="1020" r="200" fill="#FBBF24" opacity="0.10"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${g}</linearGradient></defs><rect width="${W}" height="${Hh}" fill="url(#g)"/>${b}${stars}</svg>`;
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}
async function cornerStars() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
    <polygon points="${starPts(300, 95, 80, 34)}" fill="#FBBF24"/>
    <polygon points="${starPts(160, 120, 48, 20)}" fill="#DB2777"/>
    <polygon points="${starPts(70, 60, 30, 13)}" fill="#0891B2"/></svg>`;
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}
const iconCache = {};
async function icon(name, color = "FFFFFF") {
  const key = name + color;
  if (!iconCache[key]) {
    const svg = renderToStaticMarkup(React.createElement(fa[name], { color: "#" + color, size: 256 }));
    iconCache[key] = "image/png;base64," + (await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer()).toString("base64");
  }
  return iconCache[key];
}

// ---------- helpers ----------
async function iconCircle(slide, name, x, y, d, fill, iconColor = P.white) {
  slide.addShape(S.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill }, objectName: name.replace(/^Fa/, "") + " circle" });
  const p = d * 0.24;
  slide.addImage({ data: await icon(name, iconColor), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, altText: name.replace(/^Fa/, "") + " icon" });
}
function card(slide, x, y, w, h, fill, objectName = "card", shadow = true) {
  slide.addShape(S.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.15, objectName,
    shadow: shadow ? { type: "outer", color: "4C1D95", opacity: 0.18, blur: 10, offset: 3, angle: 90 } : undefined });
}
function txt(slide, text, o) {
  slide.addText(text, { isTextBox: true, margin: 0, color: P.ink, fontSize: 14, fontFace: BF, valign: "top", ...o });
}
function star(slide, x, y, d, color, transparency = 0) {
  slide.addShape(S.star5, { x, y, w: d, h: d, fill: { color, transparency }, line: { color, transparency }, objectName: "star" });
}
function pill(slide, text, x, y, w, h, fill, color = P.white, fontSize = 14) {
  slide.addShape(S.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: h / 2, objectName: "pill" });
  txt(slide, text, { x, y, w, h, fontSize, bold: true, color, align: "center", valign: "middle" });
}
function source(slide, text) {
  txt(slide, text, { x: 6.0, y: 7.05, w: 5.9, h: 0.3, fontSize: 10, color: P.muted, align: "right", italic: true });
}
function head(slide, kicker, title) {
  slide.addText(kicker.toUpperCase(), { placeholder: "kicker" });
  slide.addText(title, { placeholder: "title" });
}
function chartBase(extra) {
  return {
    catAxisLabelColor: "334155", valAxisLabelColor: "64748B",
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt",
    legendFontFace: "+mn-lt", titleFontFace: "+mn-lt",
    catAxisLabelFontSize: 13, valAxisLabelFontSize: 11, dataLabelFontSize: 13, legendFontSize: 12,
    valGridLine: { color: "EDE9FE", size: 0.75 }, catGridLine: { style: "none" },
    valAxisLineShow: false,
    showValue: true, dataLabelColor: P.ink, dataLabelPosition: "outEnd", dataLabelFontBold: true,
    showTitle: true, titleFontSize: 15, titleColor: P.ink, titleBold: true,
    ...extra,
  };
}

(async () => {
  const HERO = await bgPNG(["3B0F8C", "7C3AED", "DB2777", "F97316"], 90, 7, ["FFFFFF", "FBBF24", "FDE68A"], true, [[60, 120, 1180, 1000], [1220, 150, 1900, 820]]);
  const NIGHT = await bgPNG(["0F0A2E", "2E1065", "4C1D95"], 200, 42, ["FBBF24", "FFFFFF", "FDE68A", "F9A8D4"], false, [[40, 20, 1880, 215], [40, 1000, 1000, 1070]]);
  const CORNER = await cornerStars();

  pres.defineSlideMaster({ title: "HERO", background: { data: HERO } });
  pres.defineSlideMaster({ title: "NIGHT", background: { data: NIGHT },
    objects: [
      { placeholder: { options: { name: "kicker", type: "body", x: 0.6, y: 0.4, w: 9, h: 0.32, fontFace: BF, fontSize: 13, bold: true, color: P.yellow, charSpacing: 3, margin: 0 }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.75, w: 12, h: 0.8, fontFace: HF, fontSize: 30, color: P.white, valign: "middle", align: "left", margin: 0 }, text: "" } },
    ] });
  pres.defineSlideMaster({
    title: "CONTENT", background: { color: P.white },
    objects: [
      { image: { x: 11.85, y: 0.32, w: 1.0, h: 0.5, data: CORNER } },
      { placeholder: { options: { name: "kicker", type: "body", x: 0.6, y: 0.38, w: 9, h: 0.32, fontFace: BF, fontSize: 13, bold: true, color: P.pink, charSpacing: 3, margin: 0 }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.72, w: 11.1, h: 0.8, fontFace: HF, fontSize: 28, color: P.ink, valign: "middle", align: "left", margin: 0 }, text: "" } },
      { text: { text: "SwarSetu  |  " + AUTHOR, options: { x: 0.6, y: 7.05, w: 5, h: 0.3, fontFace: BF, fontSize: 10, color: P.muted, margin: 0 } } },
    ],
    slideNumber: { x: 12.25, y: 7.05, w: 0.5, h: 0.3, fontFace: BF, fontSize: 10, color: P.violet, bold: true, align: "right" },
  });

  let s;
  // ================= 1. Title =================
  pres.addSection({ title: "Opening" });
  s = pres.addSlide({ masterName: "HERO", sectionTitle: "Opening" });
  pill(s, "AI  +  DSM-5  +  CLASSROOM", 0.7, 1.2, 3.6, 0.45, P.yellow, P.ink, 13);
  txt(s, "SwarSetu", { x: 0.7, y: 1.9, w: 7.5, h: 1.3, fontFace: HF, fontSize: 66, color: P.white, valign: "middle" });
  txt(s, "Screening dyslexia, dyscalculia and dysgraphia together, in one classroom session",
    { x: 0.7, y: 3.25, w: 6.9, h: 1.0, fontSize: 24, color: P.white });
  txt(s, [{ text: "Every child is special. ", options: { bold: true, color: P.yellow } }, { text: "Let's find them early.", options: { color: P.white } }],
    { x: 0.7, y: 4.45, w: 6.9, h: 0.5, fontSize: 20, italic: true });
  card(s, 0.7, 5.6, 5.4, 1.1, P.white, "author card");
  await iconCircle(s, "FaUserGraduate", 0.9, 5.78, 0.74, P.violet);
  txt(s, AUTHOR, { x: 1.85, y: 5.75, w: 4.1, h: 0.42, fontSize: 20, bold: true, color: P.ink });
  txt(s, EMAIL, { x: 1.85, y: 6.17, w: 4.1, h: 0.35, fontSize: 15, color: P.violet });
  // three disorder bubbles
  const bub = [["FaBookOpen", P.cyan, "Reading", 8.55, 1.35], ["FaCalculator", P.orange, "Maths", 10.85, 1.35], ["FaPenNib", P.pink, "Writing", 9.7, 3.85]];
  s.addShape(S.line, { x: 10.45, y: 2.3, w: 0.4, h: 0, line: { color: "FFFFFF", width: 3, dashType: "dash" } });
  for (const [ic, col, lab, x, y] of bub) {
    s.addShape(S.ellipse, { x, y, w: 1.9, h: 1.9, fill: { color: P.white }, line: { color: P.white }, objectName: lab + " bubble",
      shadow: { type: "outer", color: "1E1B4B", opacity: 0.3, blur: 14, offset: 4, angle: 90 } });
    await iconCircle(s, ic, x + 0.3, y + 0.22, 1.3, col);
    txt(s, lab, { x: x - 0.2, y: y + 1.98, w: 2.3, h: 0.4, fontSize: 16, bold: true, color: P.white, align: "center" });
  }
  star(s, 12.1, 1.0, 0.6, P.yellow); star(s, 11.6, 5.6, 0.4, P.white); star(s, 7.6, 0.6, 0.35, P.yellow, 20);
  s.addNotes("Good morning. My name is Ahaan Luther and this is SwarSetu. Swar means voice and Setu means bridge. It is a classroom tool that screens children for the three most common specific learning disorders, dyslexia, dyscalculia and dysgraphia, together in a single session, using tasks aligned with DSM-5. In the next few minutes I will show you why this matters, how it works, what our evidence says, and what it does not yet say.");

  // ================= 2. Taare Zameen Par =================
  pres.addSection({ title: "Problem" });
  s = pres.addSlide({ masterName: "NIGHT", sectionTitle: "Problem" });
  head(s, "Why this matters", "Remember Ishaan from Taare Zameen Par?");
  const story = [
    ["FaTimesCircle", P.pink, "Labelled lazy", "Letters danced on the page. Teachers saw a careless, stubborn 8-year-old, not a child who could not decode."],
    ["FaSadTear", P.orange, "Punished, then sent away", "Red marks, scoldings and comparisons with his brother. Finally, boarding school."],
    ["FaHeart", P.green, "One teacher noticed", "Art teacher Ram Shankar Nikumbh recognised dyslexia, adapted his teaching, and Ishaan bloomed."],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.1;
    card(s, x, 1.95, 3.8, 3.35, P.white, "story card " + (i + 1));
    await iconCircle(s, story[i][0], x + 0.3, 2.2, 0.85, story[i][1]);
    txt(s, String(i + 1), { x: x + 2.9, y: 2.15, w: 0.65, h: 0.9, fontFace: HF, fontSize: 40, color: P.lav, align: "right" });
    txt(s, story[i][2], { x: x + 0.3, y: 3.2, w: 3.3, h: 0.45, fontSize: 20, bold: true, color: story[i][1] });
    txt(s, story[i][3], { x: x + 0.3, y: 3.7, w: 3.25, h: 1.5, fontSize: 15 });
    if (i < 2) s.addShape(S.rightArrow, { x: x + 3.83, y: 3.45, w: 0.24, h: 0.34, fill: { color: P.yellow }, line: { color: P.yellow }, objectName: "story arrow" });
  }
  s.addShape(S.roundRect, { x: 0.6, y: 5.6, w: 12.1, h: 1.0, fill: { color: P.yellow }, line: { color: P.yellow }, rectRadius: 0.5, objectName: "lucky callout" });
  star(s, 0.85, 5.8, 0.6, P.pink);
  txt(s, [{ text: "Ishaan was lucky. ", options: { bold: true } }, { text: "Most children never meet their Nikumbh. SwarSetu puts a Nikumbh's eye in every classroom.", options: {} }],
    { x: 1.65, y: 5.6, w: 10.9, h: 1.0, fontSize: 19, color: P.ink, valign: "middle" });
  txt(s, "Taare Zameen Par (\"Stars on Earth\"), 2007, directed by Aamir Khan", { x: 0.6, y: 6.85, w: 8, h: 0.3, fontSize: 11, italic: true, color: "E9D5FF" });
  s.addNotes("Many of you will remember Ishaan Awasthi from Taare Zameen Par. An eight-year-old for whom letters danced on the page. His teachers saw a lazy, careless child. He was punished, compared with his brother and finally sent to boarding school. It took one art teacher, Ram Shankar Nikumbh, to recognise dyslexia and change his life. The film's title means stars on earth, which is why you will see stars throughout this deck. Ishaan was lucky. Most children never meet their Nikumbh. SwarSetu tries to put that teacher's eye into every classroom.");

  // ================= 3. Scale =================
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Problem" });
  head(s, "The problem", "The scale of the problem in India");
  const big = [
    ["FaSchool", P.violet, "25 crore", "children in Indian schools"],
    ["FaChild", P.cyan, "5 to 15%", "have a specific learning disorder"],
    ["FaUsers", P.pink, "1.25 to 3.75 cr", "children could be affected"],
    ["FaLink", P.orange, "25 to 50%", "of them have more than one disorder"],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 3.08;
    card(s, x, 1.8, 2.85, 2.75, big[i][1], "stat card " + (i + 1));
    await iconCircle(s, big[i][0], x + 0.25, 2.0, 0.7, P.white, big[i][1]);
    txt(s, big[i][2], { x: x + 0.25, y: 2.85, w: 2.45, h: 0.75, fontFace: HF, fontSize: i === 2 ? 22 : 30, color: P.white, valign: "middle" });
    txt(s, big[i][3], { x: x + 0.25, y: 3.65, w: 2.45, h: 0.75, fontSize: 15, color: P.white });
  }
  txt(s, "What usually happens to these children", { x: 0.6, y: 4.85, w: 8, h: 0.4, fontSize: 17, bold: true, color: P.ink });
  const path = [["FaBook", "Struggles in class"], ["FaCommentSlash", "Called lazy or careless"], ["FaArrowDown", "Falls behind, loses confidence"], ["FaHourglassEnd", "Diagnosed years late, if ever"]];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 3.08;
    card(s, x, 5.35, 2.85, 1.35, [P.tCyan, P.tYellow, P.tOrange, P.tPink][i], "path card " + (i + 1), false);
    await iconCircle(s, path[i][0], x + 0.2, 5.6, 0.85, [P.cyan, "CA8A04", P.orange, P.pink][i]);
    txt(s, path[i][1], { x: x + 1.2, y: 5.35, w: 1.55, h: 1.35, fontSize: 15, bold: true, valign: "middle" });
    if (i < 3) s.addShape(S.rightArrow, { x: x + 2.88, y: 5.88, w: 0.17, h: 0.3, fill: { color: P.muted }, line: { color: P.muted }, objectName: "path arrow" });
  }
  source(s, "UDISE+ 2023-24; APA DSM-5 (2013); Willcutt et al. (2013). Affected range = 25 cr x 5 to 15%.");
  s.addNotes("India has about 25 crore children in school. DSM-5 estimates that 5 to 15 percent of school-age children have a specific learning disorder. Even at the low end, that is over a crore of children. Between a quarter and half of affected children have more than one disorder, so dyslexia often comes with a maths or writing difficulty. And the usual path is the one Ishaan took: struggle, get called lazy, fall behind, and get diagnosed years late, if ever.");

  // ================= 4. Why missed =================
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Problem" });
  head(s, "The gap", "Why children like Ishaan are missed");
  const why = [
    ["FaUserMd", P.violet, P.lav, "Few specialists", "Clinical psychologists are scarce and concentrated in big cities."],
    ["FaRupeeSign", P.orange, P.tOrange, "Costly assessments", "Private evaluations are out of reach for most families."],
    ["FaGlobeAmericas", P.cyan, P.tCyan, "English-first tests", "Most tools are normed on Western, English-speaking children."],
    ["FaLayerGroup", P.pink, P.tPink, "One disorder at a time", "Reading-only screens miss the maths or writing difficulty."],
    ["FaRulerHorizontal", P.green, P.tGreen, "Same cut-off for all", "A Hindi-speaking 7-year-old is judged like an English-speaking 12-year-old."],
    ["FaQuestion", "CA8A04", P.tYellow, "Only yes or no", "No way to say \"I am not sure, please see a specialist\"."],
  ];
  for (let i = 0; i < 6; i++) {
    const col = i % 3, row = Math.floor(i / 3), x = 0.6 + col * 4.1, y = 1.8 + row * 2.55;
    card(s, x, y, 3.85, 2.3, why[i][2], "why card " + (i + 1), false);
    await iconCircle(s, why[i][0], x + 0.3, y + 0.3, 0.85, why[i][1]);
    txt(s, why[i][3], { x: x + 1.35, y: y + 0.3, w: 2.35, h: 0.85, fontSize: 19, bold: true, color: why[i][1], valign: "middle" });
    txt(s, why[i][4], { x: x + 0.3, y: y + 1.3, w: 3.3, h: 0.9, fontSize: 15 });
  }
  source(s, "Prior tools: Rello & Ballesteros (2015); Asselborn et al. (2018)");
  s.addNotes("Why are these children missed? Six reasons. Specialists are few and concentrated in cities. Assessments are expensive. Most tests are English-first and normed on Western children. Existing digital tools, such as eye tracking for dyslexia or tablet analysis for dysgraphia, screen one disorder at a time. They compare every child against the same cut-off, regardless of age or home language. And they only answer yes or no, with no way to say they are unsure. SwarSetu was designed against each of these six.");

  // ================= 5. Meet SwarSetu =================
  pres.addSection({ title: "Solution" });
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Solution" });
  head(s, "The solution", "Meet SwarSetu");
  card(s, 0.6, 1.8, 4.6, 4.9, P.violet, "name meaning panel");
  star(s, 4.3, 2.0, 0.6, P.yellow); star(s, 3.85, 2.55, 0.3, "F9A8D4");
  txt(s, "Swar", { x: 0.95, y: 2.15, w: 3.5, h: 0.75, fontFace: HF, fontSize: 36, color: P.yellow });
  txt(s, "voice", { x: 0.95, y: 2.9, w: 3.5, h: 0.45, fontSize: 20, color: P.white, italic: true });
  txt(s, "Setu", { x: 0.95, y: 3.55, w: 3.5, h: 0.75, fontFace: HF, fontSize: 36, color: P.yellow });
  txt(s, "bridge", { x: 0.95, y: 4.3, w: 3.5, h: 0.45, fontSize: 20, color: P.white, italic: true });
  txt(s, "A bridge from a child's voice to the help they need.", { x: 0.95, y: 5.15, w: 3.95, h: 1.2, fontSize: 18, bold: true, color: P.white });
  const feat = [
    ["FaChalkboardTeacher", P.pink, "Run by the class teacher", "No specialist needed for the first screen"],
    ["FaLanguage", P.cyan, "Bilingual: Hindi and English", "Interface and reports in both languages"],
    ["FaTabletAlt", P.orange, "Works on a budget tablet", "Finger, stylus or mouse input"],
    ["FaRobot", P.green, "Saathi AI assistant", "Explains results to teachers and parents"],
    ["FaShieldAlt", P.violet, "Private by design", "Screening data stays in the school's store"],
  ];
  for (let i = 0; i < feat.length; i++) {
    const y = 1.8 + i * 1.0;
    await iconCircle(s, feat[i][0], 5.6, y + 0.05, 0.75, feat[i][1]);
    txt(s, feat[i][2], { x: 6.6, y: y + 0.02, w: 6.1, h: 0.42, fontSize: 19, bold: true, color: P.ink });
    txt(s, feat[i][3], { x: 6.6, y: y + 0.44, w: 6.1, h: 0.38, fontSize: 15, color: P.muted });
  }
  s.addNotes("Meet SwarSetu. Swar means voice, Setu means bridge: a bridge from a child's voice to the help they need. It is run by the class teacher, so no specialist is needed for the first screen. The interface and reports are in Hindi and English. It runs on a budget tablet with finger, stylus or mouse. Saathi, the built-in AI assistant, explains results in plain language to teachers and parents. And screening data stays in the school's own store.");

  // ================= 6. Three tests =================
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Solution" });
  head(s, "The battery", "One session, three DSM-5 tests");
  const tests = [
    ["FaBookOpen", P.cyan, P.tCyan, "Dyslexia", "DSM-5: impaired reading", ["Oral reading fluency", "Decoding and accuracy", "Comprehension"], "FaMicrophone", "Speech scored by Whisper"],
    ["FaCalculator", P.orange, P.tOrange, "Dyscalculia", "DSM-5: impaired mathematics", ["Number sense", "Arithmetic fact fluency", "Working memory"], "FaStopwatch", "Timed, adaptive items"],
    ["FaPenNib", P.pink, P.tPink, "Dysgraphia", "DSM-5: impaired written expression", ["Spelling and composition", "Legibility read by TrOCR", "Stroke fluency and jitter"], "FaSignature", "Works on any input device"],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.1, [ic, col, tint, name, dsm, items, ic2, tech] = tests[i];
    card(s, x, 1.8, 3.85, 1.45, col, "test header " + (i + 1));
    await iconCircle(s, ic, x + 0.25, 2.1, 0.85, P.white, col);
    txt(s, name, { x: x + 1.3, y: 2.0, w: 2.45, h: 0.55, fontFace: HF, fontSize: 20, color: P.white, valign: "middle" });
    txt(s, dsm, { x: x + 1.3, y: 2.55, w: 2.45, h: 0.55, fontSize: 13, color: P.white });
    card(s, x, 3.4, 3.85, 2.55, tint, "test body " + (i + 1), false);
    txt(s, items.map((t, j) => ({ text: t, options: { bullet: { indent: 18 }, breakLine: j < items.length - 1 } })),
      { x: x + 0.3, y: 3.6, w: 3.35, h: 1.4, fontSize: 17, paraSpaceAfter: 8, bold: true, color: P.ink });
    await iconCircle(s, ic2, x + 0.3, 5.15, 0.55, col);
    txt(s, tech, { x: x + 1.0, y: 5.15, w: 2.75, h: 0.55, fontSize: 14, italic: true, color: P.ink, valign: "middle" });
  }
  s.addShape(S.roundRect, { x: 0.6, y: 6.15, w: 12.1, h: 0.65, fill: { color: P.ink }, line: { color: P.ink }, rectRadius: 0.32, objectName: "protocol pill" });
  star(s, 0.78, 6.25, 0.45, P.yellow);
  txt(s, [{ text: "Full battery by default. ", options: { bold: true, color: P.yellow } },
          { text: "A single test needs teacher permission and a recorded reason.", options: { color: P.white } }],
    { x: 1.4, y: 6.15, w: 11.1, h: 0.65, fontSize: 16, valign: "middle" });
  s.addNotes("Each child takes three short tests, each mapped to a DSM-5 impairment domain. Reading: fluency, decoding and comprehension, with the child's speech transcribed by Whisper. Maths: number sense, fact fluency and working memory, with timed adaptive items. Writing: spelling and composition, legibility read by TrOCR, and stroke features that work on finger, stylus or mouse. The full battery is enforced by the app. A teacher can run a single test only with explicit permission and a logged reason, because comorbidity can only be caught if all three are measured.");

  // ================= 7. Journey =================
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Solution" });
  head(s, "How it works", "A screening session, step by step");
  const steps = [
    ["FaUserPlus", P.violet, "Add student", "Age, home language, device"],
    ["FaBookOpen", P.cyan, "Reading test", "Read aloud, decode, answer"],
    ["FaCalculator", P.orange, "Maths test", "Numbers, facts, memory"],
    ["FaPenNib", P.pink, "Writing test", "Spell and write on screen"],
    ["FaClipboardCheck", P.green, "Instant report", "Risk tier for each disorder"],
  ];
  s.addShape(S.line, { x: 1.4, y: 2.55, w: 10.5, h: 0, line: { color: "DDD6FE", width: 6 } });
  for (let i = 0; i < 5; i++) {
    const cx = 1.4 + i * 2.625;
    s.addShape(S.ellipse, { x: cx - 0.7, y: 1.85, w: 1.4, h: 1.4, fill: { color: P.white }, line: { color: steps[i][1], width: 4 }, objectName: "step ring " + (i + 1) });
    await iconCircle(s, steps[i][0], cx - 0.55, 2.0, 1.1, steps[i][1]);
    pill(s, String(i + 1), cx + 0.3, 1.75, 0.45, 0.45, P.yellow, P.ink, 14);
    txt(s, steps[i][2], { x: cx - 1.2, y: 3.4, w: 2.4, h: 0.45, fontSize: 18, bold: true, color: steps[i][1], align: "center" });
    txt(s, steps[i][3], { x: cx - 1.2, y: 3.85, w: 2.4, h: 0.45, fontSize: 14, align: "center", color: P.muted });
  }
  txt(s, "Every report sorts each disorder into a clear next step", { x: 0.6, y: 4.65, w: 12, h: 0.4, fontSize: 17, bold: true });
  const tiers = [[P.pink, "REFER", "Send for specialist assessment", "Catches at least 85% of affected children"],
                 ["CA8A04", "MONITOR", "Re-screen and watch in class", "Catches at least 95% together with Refer"],
                 [P.green, "LOW RISK", "No action needed now", "Negative screens are 98.4% reliable"]];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.1;
    card(s, x, 5.15, 3.85, 1.6, [P.tPink, P.tYellow, P.tGreen][i], "tier card " + (i + 1), false);
    pill(s, tiers[i][1], x + 0.25, 5.35, 1.6, 0.42, tiers[i][0], P.white, 13);
    txt(s, tiers[i][2], { x: x + 0.25, y: 5.85, w: 3.4, h: 0.4, fontSize: 16, bold: true });
    txt(s, tiers[i][3], { x: x + 0.25, y: 6.25, w: 3.4, h: 0.4, fontSize: 13, color: P.muted });
  }
  s.addNotes("Here is what a session looks like for the teacher. Add the student with age, home language and device. The child takes the reading, maths and writing tests. The report appears immediately, with a tier for each disorder. Refer means send for specialist assessment, and that tier is set to catch at least 85 percent of affected children. Monitor means re-screen and watch, and together with refer it catches at least 95 percent. Low risk means no action now, and a negative screen is 98 percent reliable.");

  // ================= 8. Engine =================
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Solution" });
  head(s, "Under the hood", "Inside the engine");
  const eng = [
    ["FaTabletAlt", P.violet, "Capture", "Voice, taps and strokes"],
    ["FaListOl", P.cyan, "64 features", "16 per test block"],
    ["FaBalanceScale", P.yellow, "Norm", "vs typical peers of same age, language, device"],
    ["FaTree", P.green, "LightGBM x3", "One small model per disorder"],
    ["FaTrafficLight", P.orange, "Tiers", "Thresholds fixed in advance"],
    ["FaQuestionCircle", P.pink, "Unsure flag", "Mondrian conformal set"],
  ];
  for (let i = 0; i < 6; i++) {
    const x = 0.6 + i * 2.07, hl = i === 2;
    card(s, x, 1.8, 1.8, 3.1, hl ? P.yellow : P.white, "engine step " + (i + 1));
    if (!hl) s.addShape(S.roundRect, { x, y: 1.8, w: 1.8, h: 3.1, fill: { color: P.white, transparency: 100 }, line: { color: eng[i][1], width: 2 }, rectRadius: 0.15, objectName: "engine outline" });
    await iconCircle(s, eng[i][0], x + 0.45, 2.05, 0.9, hl ? P.ink : eng[i][1], hl ? P.yellow : P.white);
    txt(s, eng[i][2], { x: x + 0.1, y: 3.1, w: 1.6, h: 0.45, fontSize: 17, bold: true, align: "center", color: P.ink });
    txt(s, eng[i][3], { x: x + 0.15, y: 3.6, w: 1.5, h: 1.2, fontSize: 13, align: "center", color: P.ink });
    if (i < 5) s.addShape(S.rightArrow, { x: x + 1.82, y: 3.2, w: 0.22, h: 0.3, fill: { color: P.violet }, line: { color: P.violet }, objectName: "engine arrow" });
  }
  const spec = [["FaSeedling", P.green, "300 trees, 7 leaves", "Deliberately small for small data"], ["FaBullseye", P.violet, "ECE 0.017", "Calibrated with no post-processing"], ["FaFingerprint", P.pink, "SHA-256 bundle", "Model version logged with every result"]];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.1;
    card(s, x, 5.2, 3.85, 1.5, P.lav, "spec card " + (i + 1), false);
    await iconCircle(s, spec[i][0], x + 0.25, 5.5, 0.85, spec[i][1]);
    txt(s, spec[i][2], { x: x + 1.3, y: 5.45, w: 2.45, h: 0.45, fontSize: 18, bold: true, color: spec[i][1] });
    txt(s, spec[i][3], { x: x + 1.3, y: 5.9, w: 2.45, h: 0.7, fontSize: 14 });
  }
  source(s, "LightGBM: Ke et al. (2017); conformal prediction: Angelopoulos & Bates (2021)");
  s.addNotes("Under the hood: the app captures voice, taps and strokes and turns them into 64 features, 16 per test block. The key step, highlighted in yellow, is norming. Every feature is expressed relative to typical children of the same age, home language and device. Then one deliberately small LightGBM model per disorder produces a calibrated risk. Thresholds are fixed in advance on validation data. Finally a class-conditional conformal set flags the cases the model genuinely cannot decide. Every result is stored with a hashed model version.");

  // ================= 9. Benchmark =================
  pres.addSection({ title: "Evidence" });
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Evidence" });
  head(s, "Honest evaluation", "We rebuilt our benchmark to be honest");
  card(s, 0.6, 1.8, 4.5, 4.9, P.tPink, "old benchmark", false);
  txt(s, "Our first benchmark", { x: 0.9, y: 2.0, w: 4, h: 0.4, fontSize: 17, bold: true, color: P.pink });
  txt(s, "0.97", { x: 0.9, y: 2.45, w: 4, h: 0.95, fontFace: HF, fontSize: 54, color: P.muted, valign: "middle" });
  txt(s, "AUROC, looked excellent", { x: 0.9, y: 3.4, w: 4, h: 0.4, fontSize: 15 });
  txt(s, "0.96", { x: 0.9, y: 3.95, w: 4, h: 0.95, fontFace: HF, fontSize: 54, color: P.pink, valign: "middle" });
  txt(s, "plain logistic regression scored this too", { x: 0.9, y: 4.9, w: 4, h: 0.4, fontSize: 15 });
  pill(s, "It measured nothing", 0.9, 5.7, 3.0, 0.5, P.pink, P.white, 15);
  txt(s, "Realistic cohort generator", { x: 5.5, y: 1.8, w: 7, h: 0.4, fontSize: 17, bold: true, color: P.violet });
  const tiles = [
    ["FaChild", P.cyan, "Ages 7 to 13", "skills rise 0.25 SD a year"],
    ["FaLanguage", P.orange, "60% Hindi-dominant", "lower English phonology, no disorder"],
    ["FaHandPointer", P.pink, "70% finger input", "no pen pressure, noisier strokes"],
    ["FaTag", P.violet, "10% label noise", "missed cases in the ground truth"],
    ["FaPuzzlePiece", P.green, "8% missing items", "plus 10% skipped modules"],
    ["FaMapMarkerAlt", "CA8A04", "External site B", "younger, 85% Hindi, more cases"],
  ];
  for (let i = 0; i < 6; i++) {
    const col = i % 2, row = Math.floor(i / 2), x = 5.5 + col * 3.65, y = 2.3 + row * 1.08;
    await iconCircle(s, tiles[i][0], x, y + 0.08, 0.75, tiles[i][1]);
    txt(s, tiles[i][2], { x: x + 0.9, y: y + 0.05, w: 2.7, h: 0.42, fontSize: 17, bold: true, color: tiles[i][1] });
    txt(s, tiles[i][3], { x: x + 0.9, y: y + 0.47, w: 2.7, h: 0.45, fontSize: 13 });
  }
  s.addShape(S.roundRect, { x: 5.5, y: 5.65, w: 7.2, h: 1.05, fill: { color: P.violet }, line: { color: P.violet }, rectRadius: 0.15, objectName: "ceiling callout" });
  star(s, 5.7, 5.85, 0.6, P.yellow);
  txt(s, [{ text: "Oracle ceiling is about 0.90 AUROC. ", options: { bold: true, color: P.yellow } }, { text: "Our 0.86 sits close to what is achievable.", options: { color: P.white } }],
    { x: 6.45, y: 5.65, w: 6.1, h: 1.05, fontSize: 17, valign: "middle" });
  s.addNotes("I want to be upfront. Our first benchmark gave an AUROC of 0.97, until we saw that plain logistic regression also scored 0.96. A benchmark where the simplest model is near perfect measures nothing. So we rebuilt it. The new generator gives each child correlated latent abilities, lets comorbidity emerge naturally, and adds real classroom mess: age effects, a 60 percent Hindi-dominant population, finger input, label noise and missing items. We also built a shifted external site. Because labels are noisy, even an oracle reaches only about 0.90, so that is the ceiling to compare against.");

  // ================= 10. Results =================
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Evidence" });
  head(s, "Results", "Beats a transformer on every disorder");
  s.addChart(pres.ChartType.bar, [
    { name: "SwarSetu (LightGBM)", labels: ["Dyslexia", "Dyscalculia", "Dysgraphia"], values: [0.855, 0.853, 0.859] },
    { name: "FT-Transformer", labels: ["Dyslexia", "Dyscalculia", "Dysgraphia"], values: [0.808, 0.817, 0.789] },
  ], chartBase({
    x: 0.6, y: 1.75, w: 7.5, h: 5.05, barDir: "col", barGapWidthPct: 55, barOverlapPct: -10,
    title: "AUROC per disorder, 4,000-child test set", chartColors: [P.violet, P.base],
    valAxisMinVal: 0.5, valAxisMaxVal: 0.9, valAxisMajorUnit: 0.1, dataLabelFormatCode: "0.000", valAxisLabelFormatCode: "0.0",
    showLegend: true, legendPos: "b", objectName: "AUROC per disorder chart",
  }));
  const res = [["FaChartLine", P.violet, "0.858", "macro AUROC", "95% CI 0.846 to 0.869"], ["FaSearch", P.pink, "0.856", "sensitivity", "at the refer threshold"], ["FaCheckCircle", P.green, "0.984", "negative predictive value", "a negative screen is reliable"]];
  for (let i = 0; i < 3; i++) {
    const y = 1.8 + i * 1.7;
    card(s, 8.5, y, 4.2, 1.5, P.white, "result card " + (i + 1));
    s.addShape(S.roundRect, { x: 8.5, y, w: 4.2, h: 1.5, fill: { color: P.white, transparency: 100 }, line: { color: res[i][1], width: 2 }, rectRadius: 0.15, objectName: "result outline" });
    await iconCircle(s, res[i][0], 8.75, y + 0.33, 0.85, res[i][1]);
    txt(s, res[i][2], { x: 9.8, y: y + 0.12, w: 2.8, h: 0.7, fontFace: HF, fontSize: 32, color: res[i][1], valign: "middle" });
    txt(s, [{ text: res[i][3], options: { bold: true, breakLine: true } }, { text: res[i][4], options: { color: P.muted } }], { x: 9.8, y: y + 0.82, w: 2.8, h: 0.6, fontSize: 13 });
  }
  source(s, "Axis starts at 0.5 (chance). Mean of 5 seeds. Synthetic benchmark.");
  s.addNotes("On the held-out test set of 4,000 synthetic children, SwarSetu reaches AUROC 0.855 for dyslexia, 0.853 for dyscalculia and 0.859 for dysgraphia. The FT-Transformer, a strong deep tabular model, scores 0.808, 0.817 and 0.789, so we are ahead on all three. Macro AUROC is 0.858 with a tight confidence interval. Sensitivity at the refer threshold is 0.856, and negative predictive value is 0.984.");

  // ================= 11. Norming =================
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Evidence" });
  head(s, "Why it works", "Norming drives the gain");
  s.addChart(pres.ChartType.bar, [
    { name: "AUROC", labels: ["FT-Transformer", "Logistic regression", "Same model, no age or language", "SwarSetu, normed"], values: [0.804, 0.807, 0.803, 0.858] },
  ], chartBase({
    x: 0.6, y: 1.75, w: 6.2, h: 4.3, barDir: "bar", barGapWidthPct: 45,
    title: "Full data", chartColors: [P.base, P.base, P.pink, P.violet],
    valAxisMinVal: 0.5, valAxisMaxVal: 0.9, valAxisMajorUnit: 0.1, dataLabelFormatCode: "0.000", valAxisLabelFormatCode: "0.0",
    showLegend: false, objectName: "Norming ablation chart",
  }));
  s.addChart(pres.ChartType.bar, [
    { name: "AUROC", labels: ["SwarSetu", "LR + covariates", "FT-Transformer"], values: [0.811, 0.760, 0.697] },
  ], chartBase({
    x: 7.1, y: 1.75, w: 5.6, h: 4.3, barDir: "col", barGapWidthPct: 55,
    title: "Only 250 children", chartColors: [P.violet, P.base, P.orange],
    valAxisMinVal: 0.5, valAxisMaxVal: 0.9, valAxisMajorUnit: 0.1, dataLabelFormatCode: "0.000", valAxisLabelFormatCode: "0.0",
    showLegend: false, objectName: "Small data chart",
  }));
  const nb = [[P.violet, "+0.048 to +0.062", "AUROC over unadjusted models, p < 0.001"], [P.pink, "0.858 to 0.803", "if age and language are not collected"], [P.orange, "0.697", "transformer collapses on small data"]];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.1;
    card(s, x, 6.15, 3.85, 0.75, P.lav, "norm fact " + (i + 1), false);
    txt(s, [{ text: nb[i][1] + "  ", options: { bold: true, color: nb[i][0], fontSize: 16 } }, { text: nb[i][2], options: { fontSize: 12 } }],
      { x: x + 0.2, y: 6.15, w: 3.5, h: 0.75, valign: "middle" });
  }
  s.addNotes("Where does the gain come from? Not from LightGBM itself. Feed the same model without age and language, the pink bar, and it drops from 0.858 to 0.803, the same level as logistic regression and the transformer. Norming is the real contribution, and I say that honestly. The right chart shows why we still chose small trees: with only 250 children, SwarSetu keeps 0.811 while the transformer collapses to 0.697. Real learning-disorder datasets are small, so that is the regime that matters.");

  // ================= 12. Trust =================
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Evidence" });
  head(s, "Trust", "Scores a teacher can trust");
  s.addChart(pres.ChartType.bar, [
    { name: "ECE", labels: ["SwarSetu", "FT (asym. loss)", "FT + temp. scaling"], values: [0.017, 0.275, 0.314] },
  ], chartBase({
    x: 0.6, y: 1.75, w: 5.8, h: 4.9, barDir: "col", barGapWidthPct: 55,
    title: "Calibration error (lower is better)", chartColors: [P.green, P.pink, P.pink],
    valAxisMinVal: 0, valAxisMaxVal: 0.35, valAxisMajorUnit: 0.1, dataLabelFormatCode: "0.000", valAxisLabelFormatCode: "0.0",
    showLegend: false, objectName: "Calibration chart",
  }));
  card(s, 6.8, 1.8, 5.9, 4.85, P.lav, "coverage panel", false);
  txt(s, "How often the \"unsure\" set covers affected children", { x: 7.1, y: 2.0, w: 5.4, h: 0.45, fontSize: 16, bold: true });
  const cov = [["0%", "Old system's \"90% guaranteed\" interval", P.pink, 0.0], ["52 to 64%", "Ordinary conformal prediction", P.orange, 0.58], ["94%", "Mondrian conformal (SwarSetu)", P.green, 0.94]];
  for (let i = 0; i < 3; i++) {
    const y = 2.65 + i * 1.2;
    txt(s, cov[i][0], { x: 7.1, y, w: 2.3, h: 0.55, fontFace: HF, fontSize: 22, color: cov[i][2], valign: "middle" });
    txt(s, cov[i][1], { x: 9.45, y, w: 3.05, h: 0.55, fontSize: 13, valign: "middle" });
    s.addShape(S.roundRect, { x: 7.1, y: y + 0.65, w: 5.4, h: 0.22, fill: { color: P.white }, line: { color: "DDD6FE" }, rectRadius: 0.11, objectName: "coverage track" });
    if (cov[i][3] > 0) s.addShape(S.roundRect, { x: 7.1, y: y + 0.65, w: 5.4 * cov[i][3], h: 0.22, fill: { color: cov[i][2] }, line: { color: cov[i][2] }, rectRadius: 0.11, objectName: "coverage bar" });
  }
  txt(s, "Unaffected children: 90% covered.", { x: 7.1, y: 6.15, w: 5.4, h: 0.35, fontSize: 13, italic: true, color: P.muted });
  source(s, "Calibration: Guo et al. (2017). Ordinary conformal bar drawn at the range midpoint.");
  s.addNotes("A risk score is only useful if 30 percent really means about 30 percent. SwarSetu's calibration error is 0.017 with no post-processing. The transformer with asymmetric loss sits at 0.275, and temperature scaling made it worse, 0.314. On the right: ordinary conformal prediction promises 90 percent coverage overall but covers only 52 to 64 percent of affected children. Class-conditional Mondrian conformal covers 94 percent of affected and 90 percent of unaffected children. The old system's interval covered nobody.");

  // ================= 13. Fairness =================
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Evidence" });
  head(s, "Robustness and fairness", "Robust and fairer across languages");
  const rob = [["FaMapMarkerAlt", P.cyan, "0.846", "AUROC at a new site", "a drop of only 0.012"], ["FaPuzzlePiece", P.orange, "0.813", "with 40% extra missing data", "logistic regression: 0.757"], ["FaCheckDouble", P.green, "22 / 22", "stress-test settings", "best or within 0.005 of best"]];
  for (let i = 0; i < 3; i++) {
    const y = 1.8 + i * 1.65;
    card(s, 0.6, y, 5.3, 1.45, rob[i][1], "robust card " + (i + 1));
    await iconCircle(s, rob[i][0], 0.85, y + 0.3, 0.85, P.white, rob[i][1]);
    txt(s, rob[i][2], { x: 1.95, y: y + 0.12, w: 1.9, h: 1.2, fontFace: HF, fontSize: 28, color: P.white, valign: "middle" });
    txt(s, [{ text: rob[i][3], options: { bold: true, breakLine: true } }, { text: rob[i][4], options: {} }], { x: 3.85, y: y + 0.12, w: 1.95, h: 1.2, fontSize: 13, color: P.white, valign: "middle" });
  }
  s.addChart(pres.ChartType.bar, [
    { name: "Hindi-dominant", labels: ["Unadjusted model", "After norming"], values: [0.48, 0.36] },
    { name: "English-dominant", labels: ["Unadjusted model", "After norming"], values: [0.38, 0.34] },
  ], chartBase({
    x: 6.3, y: 1.75, w: 6.4, h: 4.45, barDir: "col", barGapWidthPct: 60,
    title: "Dyslexia false-alarm rate by home language", chartColors: [P.orange, P.cyan],
    valAxisMinVal: 0, valAxisMaxVal: 0.6, valAxisMajorUnit: 0.1, dataLabelFormatCode: "0.00", valAxisLabelFormatCode: "0.0",
    showLegend: true, legendPos: "b", objectName: "Language fairness chart",
  }));
  pill(s, "Language gap shrinks from 0.10 to 0.02", 6.6, 6.3, 5.8, 0.5, P.violet, P.white, 15);
  s.addNotes("Three robustness results on the left. At a new site with younger, more Hindi-dominant children, AUROC drops by only 0.012. With 40 percent extra missing data we hold 0.813, while logistic regression falls to 0.757. Across 22 variations of our generator's assumptions we are best or within 0.005 of best every time. On the right, fairness: an unadjusted model falsely flags 48 percent of Hindi-dominant children versus 38 percent of English-dominant children. After norming it is 36 versus 34. The small remaining gap is routed to review through DSM-5 Criterion D.");

  // ================= 14. Audit =================
  pres.addSection({ title: "Deployment" });
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Deployment" });
  head(s, "Deployment audit", "Audit: the live screen flagged no one");
  const au = [["FaBug", P.pink, "17", "defects found in the live system"], ["FaUserSlash", P.orange, "0", "children flagged at risk"], ["FaDiceThree", P.violet, "0.475", "AUROC of legacy models with untrained random weights"]];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.1;
    card(s, x, 1.8, 3.85, 2.2, au[i][1], "audit card " + (i + 1));
    await iconCircle(s, au[i][0], x + 0.25, 2.05, 0.8, P.white, au[i][1]);
    txt(s, au[i][2], { x: x + 1.25, y: 1.95, w: 2.4, h: 1.0, fontFace: HF, fontSize: 44, color: P.white, valign: "middle" });
    txt(s, au[i][3], { x: x + 0.25, y: 3.05, w: 3.4, h: 0.8, fontSize: 15, color: P.white, bold: true });
  }
  txt(s, "Why: served scores never reached the thresholds", { x: 0.6, y: 4.3, w: 12, h: 0.4, fontSize: 17, bold: true });
  const sx = 0.9, sw = 11.5, sy = 5.3;
  s.addShape(S.roundRect, { x: sx, y: sy, w: sw, h: 0.34, fill: { color: P.lav }, line: { color: "DDD6FE" }, rectRadius: 0.17, objectName: "score scale" });
  s.addShape(S.roundRect, { x: sx + sw * 0.22, y: sy - 0.06, w: sw * 0.11, h: 0.46, fill: { color: P.pink }, line: { color: P.pink }, rectRadius: 0.1, objectName: "served band" });
  s.addShape(S.roundRect, { x: sx + sw * 0.91, y: sy - 0.06, w: sw * 0.02 + 0.06, h: 0.46, fill: { color: P.violet }, line: { color: P.violet }, rectRadius: 0.05, objectName: "threshold band" });
  txt(s, "Served scores 0.22 to 0.33", { x: sx + sw * 0.275 - 1.6, y: sy - 0.5, w: 3.2, h: 0.35, fontSize: 14, bold: true, color: P.pink, align: "center" });
  txt(s, "Thresholds 0.91 to 0.93", { x: sx + sw * 0.93 - 2.7, y: sy - 0.5, w: 2.8, h: 0.35, fontSize: 14, bold: true, color: P.violet, align: "right" });
  ["0", "0.5", "1"].forEach((t, i) => txt(s, t, { x: sx + sw * (i / 2) - 0.3, y: sy + 0.45, w: 0.6, h: 0.3, fontSize: 12, color: P.muted, align: "center" }));
  card(s, 0.6, 6.05, 12.1, 0.75, P.tGreen, "fix note", false);
  await iconCircle(s, "FaWrench", 0.78, 6.13, 0.58, P.green);
  txt(s, [{ text: "An impaired reader scored 0.264, a strong reader 0.247: both \"Low\". ", options: {} }, { text: "Fixed: hash-checked model bundle + API regression tests.", options: { bold: true, color: P.green } }],
    { x: 1.55, y: 6.05, w: 11.0, h: 0.75, fontSize: 15, valign: "middle" });
  s.addNotes("Our second contribution is an audit of the system as it was actually deployed. We found 17 defects. Together they meant the live screen flagged no child at all. Served scores sat between 0.22 and 0.33 while the thresholds were above 0.9, so sensitivity was zero. An impaired reader scored 0.264 and a strong reader 0.247, and both came back Low. The legacy neural models had never been trained. We fixed this with a single hash-checked model bundle and regression tests that call the real API. Lesson: evaluate the deployed system, not just the notebook.");

  // ================= 15. School of 500 =================
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Deployment" });
  head(s, "Real-world impact", "What it means for a school of 500");
  txt(s, "40 affected children (per disorder)", { x: 0.6, y: 1.75, w: 5.6, h: 0.4, fontSize: 17, bold: true });
  for (let i = 0; i < 40; i++) {
    const col = i % 8, row = Math.floor(i / 8), found = i < 34;
    s.addShape(S.star5, { x: 0.65 + col * 0.68, y: 2.25 + row * 0.66, w: 0.58, h: 0.58,
      fill: { color: found ? P.yellow : P.white }, line: { color: found ? "D97706" : P.base, width: 1.25 }, objectName: "child star " + (i + 1) });
  }
  card(s, 0.6, 5.7, 5.45, 1.05, P.yellow, "found card", false);
  txt(s, [{ text: "34 of 40 ", options: { fontFace: HF, fontSize: 28 } }, { text: " found by the refer tier", options: { fontSize: 16, bold: true } }],
    { x: 0.85, y: 5.7, w: 5.0, h: 1.05, valign: "middle", color: P.ink });
  txt(s, "About 180 referrals", { x: 6.8, y: 1.75, w: 5.9, h: 0.4, fontSize: 17, bold: true });
  const rw = 5.9, ry = 2.25, tp = 34 / 179;
  s.addShape(S.roundRect, { x: 6.8, y: ry, w: rw, h: 0.75, fill: { color: P.lav }, line: { color: "DDD6FE" }, rectRadius: 0.12, objectName: "referral bar" });
  s.addShape(S.roundRect, { x: 6.8, y: ry, w: rw * tp, h: 0.75, fill: { color: P.violet }, line: { color: P.violet }, rectRadius: 0.12, objectName: "true positives" });
  txt(s, "34", { x: 6.8, y: ry, w: rw * tp, h: 0.75, fontSize: 18, bold: true, color: P.white, align: "center", valign: "middle" });
  txt(s, "145 get a closer look, then clear", { x: 6.8 + rw * tp, y: ry, w: rw * (1 - tp), h: 0.75, fontSize: 15, bold: true, color: P.violet, align: "center", valign: "middle" });
  const sc = [[P.green, "0.984", "of negative screens are truly negative"], [P.pink, "0.18", "PPV, normal for 6 to 8% prevalence"]];
  for (let i = 0; i < 2; i++) {
    const x = 6.8 + i * 3.05;
    card(s, x, 3.3, 2.85, 2.1, sc[i][0], "screen stat " + (i + 1));
    txt(s, sc[i][1], { x: x + 0.25, y: 3.45, w: 2.4, h: 0.85, fontFace: HF, fontSize: 36, color: P.white, valign: "middle" });
    txt(s, sc[i][2], { x: x + 0.25, y: 4.35, w: 2.4, h: 0.9, fontSize: 15, color: P.white, bold: true });
  }
  s.addShape(S.roundRect, { x: 6.8, y: 5.7, w: 5.9, h: 1.05, fill: { color: P.ink }, line: { color: P.ink }, rectRadius: 0.15, objectName: "pathway callout" });
  txt(s, [{ text: "Stage one of a stepped pathway. ", options: { bold: true, color: P.yellow } }, { text: "Rule out, prioritise, then specialists diagnose.", options: { color: P.white } }],
    { x: 7.05, y: 5.7, w: 5.5, h: 1.05, fontSize: 16, valign: "middle" });
  s.addNotes("Let me make this concrete. In a school of 500 children, about 40 will have a given disorder. Each star is one of those children. SwarSetu's refer tier finds 34 of them. It does this with about 180 referrals, so roughly 145 children get a closer look and are then cleared. A PPV of 0.18 sounds low, but at 6 to 8 percent prevalence every screen behaves this way; school vision screens do too. What matters is that a negative screen is 98 percent reliable. SwarSetu is a first-stage rule-out screen, not a diagnosis.");

  // ================= 16. Limits & roadmap =================
  pres.addSection({ title: "Close" });
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Close" });
  head(s, "Next steps", "Honest limits and the road ahead");
  card(s, 0.6, 1.8, 5.4, 4.95, P.tPink, "limits panel", false);
  txt(s, "What we have not shown yet", { x: 0.9, y: 2.0, w: 4.9, h: 0.4, fontSize: 17, bold: true, color: P.pink });
  const lim = ["Results are on a synthetic cohort, not yet real children", "TrOCR cannot read Devanagari handwriting", "Reading fluency norms are US English", "Speech model untested on child or Hindi speech"];
  for (let i = 0; i < 4; i++) {
    const y = 2.6 + i * 1.0;
    await iconCircle(s, "FaExclamation", 0.9, y, 0.6, P.pink);
    txt(s, lim[i], { x: 1.7, y: y - 0.05, w: 4.1, h: 0.7, fontSize: 15, valign: "middle" });
  }
  const road = [[P.violet, "FaClipboardList", "Ethics-approved school pilot", "Parental consent, blinded specialist diagnosis"], [P.cyan, "FaChartBar", "Re-fit norms on Indian children", "Age, language and device norms from real data"], [P.orange, "FaGlobeAsia", "More languages, offline mode", "Devanagari handwriting, child-speech ASR"]];
  s.addShape(S.line, { x: 6.85, y: 2.3, w: 0, h: 3.0, line: { color: "DDD6FE", width: 4 } });
  for (let i = 0; i < 3; i++) {
    const y = 1.85 + i * 1.45;
    await iconCircle(s, road[i][1], 6.4, y, 0.9, road[i][0]);
    pill(s, "STEP " + (i + 1), 7.55, y, 1.1, 0.34, road[i][0], P.white, 11);
    txt(s, road[i][2], { x: 7.55, y: y + 0.38, w: 5.2, h: 0.4, fontSize: 18, bold: true });
    txt(s, road[i][3], { x: 7.55, y: y + 0.78, w: 5.2, h: 0.35, fontSize: 14, color: P.muted });
  }
  card(s, 6.4, 6.15, 6.3, 0.6, P.lav, "logging note", false);
  txt(s, "Ready now: every result is logged with its model version and accepts a confirmed diagnosis.", { x: 6.6, y: 6.15, w: 6.0, h: 0.6, fontSize: 13, valign: "middle", color: P.violet, bold: true });
  s.addNotes("I want to be clear about the limits. All accuracy numbers come from a realistic synthetic cohort, not real children. TrOCR cannot read Devanagari, our reading fluency norms are US English, and the speech model has not been validated on child or Hindi speech. The road ahead: an ethics-approved school pilot with parental consent and blinded specialist diagnosis, then re-fitting the norms on Indian children, then more languages and an offline mode. The app already logs each result with its model version and accepts a confirmed diagnosis, so pilot data flows straight into validation.");

  // ================= 17. Close =================
  s = pres.addSlide({ masterName: "HERO", sectionTitle: "Close" });
  txt(s, "Every child is special.", { x: 0.7, y: 1.3, w: 7.5, h: 0.9, fontFace: HF, fontSize: 40, color: P.white, valign: "middle" });
  txt(s, "SwarSetu helps find them early.", { x: 0.7, y: 2.2, w: 7.5, h: 0.7, fontFace: HF, fontSize: 28, color: P.yellow, valign: "middle" });
  const take = [["FaLayerGroup", P.cyan, "One session screens all three disorders"], ["FaBalanceScale", P.orange, "Norming for age and language drives the gain"], ["FaSearch", P.pink, "We audit the deployed system, not just the notebook"]];
  for (let i = 0; i < 3; i++) {
    const y = 3.3 + i * 0.85;
    await iconCircle(s, take[i][0], 0.7, y, 0.65, P.white, take[i][1]);
    txt(s, take[i][2], { x: 1.55, y, w: 6.4, h: 0.65, fontSize: 18, color: P.white, valign: "middle", bold: true });
  }
  card(s, 8.6, 2.0, 4.1, 3.6, P.white, "thank you card");
  star(s, 10.15, 2.3, 1.0, P.yellow);
  txt(s, "Thank you!", { x: 8.8, y: 3.4, w: 3.7, h: 0.6, fontFace: HF, fontSize: 26, color: P.violet, align: "center", valign: "middle" });
  txt(s, "Questions welcome", { x: 8.8, y: 4.0, w: 3.7, h: 0.4, fontSize: 16, color: P.muted, align: "center" });
  txt(s, AUTHOR, { x: 8.8, y: 4.55, w: 3.7, h: 0.4, fontSize: 18, bold: true, color: P.ink, align: "center" });
  txt(s, EMAIL, { x: 8.8, y: 4.95, w: 3.7, h: 0.4, fontSize: 15, color: P.pink, align: "center" });
  star(s, 12.2, 6.2, 0.5, P.yellow); star(s, 7.8, 6.4, 0.35, P.white);
  s.addNotes("To close, I'll borrow the tagline of Taare Zameen Par: every child is special. SwarSetu helps find them early. Three takeaways. One session screens all three disorders, which is the only way to catch comorbidity. Norming for age and language, not a bigger model, drives the gain. And we audit the deployed system, because ours was silently flagging no one. Thank you. I am happy to take questions, and you can reach me at ahaanluther@gmail.com.");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
