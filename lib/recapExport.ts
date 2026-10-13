/**
 * Delebilde av en kveld: collage (≤ 9 bilder, stedsnavn nederst i hvert bilde)
 * + gjennomførte utfordringer. Rendres på klienten med canvas → PNG 1080×1920.
 * Se specs/04-features.md → «Eksport av kveld» og specs/05-design.md.
 */

export type ExportPhoto = { url: string; barName: string | null };
export type ExportChallenge = { text: string };

export type RecapExportInput = {
  name: string;
  photos: ExportPhoto[];
  challenges: ExportChallenge[];
  /** Antall hukede utfordringer utover de som vises (viser «+ N utfordringer»). */
  moreChallengesCount?: number;
};

export const MAX_EXPORT_PHOTOS = 9;
export const MAX_EXPORT_CHALLENGES = 4;

const W = 1080;
const H = 1920;
const PAD = 64;
const GAP = 8;
const PHOTO_RADIUS = 16;
const FOOTER_H = 120;
const MORE_H = 44;

const BG = "#121212";
const SURFACE = "#1A1A1A";
const BRAND = "#CC3F0C";
const TEXT = "#F5F5F5";
const MUTED = "#9A9A9A";

type Rect = { x: number; y: number; w: number; h: number };
type Drawable = { src: CanvasImageSource; w: number; h: number };

/** Rader (antall bilder per rad) + relativ radhøyde per antall bilder. */
const ROW_LAYOUTS: Record<number, { rows: number[]; weights?: number[] }> = {
  1: { rows: [1] },
  2: { rows: [2] },
  4: { rows: [2, 2] },
  5: { rows: [2, 3], weights: [1.15, 1] },
  6: { rows: [3, 3] },
  7: { rows: [2, 2, 3] },
  8: { rows: [3, 2, 3], weights: [1, 1.2, 1] },
  9: { rows: [3, 3, 3] },
};

/** Ønsket collage-høyde (px) per antall bilder, ved bredde W - 2·PAD. */
const IDEAL_COLLAGE_H: Record<number, number> = {
  1: 1100,
  2: 760,
  3: 880,
  4: 952,
  5: 940,
  6: 800,
  7: 1000,
  8: 1000,
  9: 952,
};

/** Fyller flaten uten tomrom for 1–9 bilder. */
export function collageRects(n: number, box: Rect, gap = GAP): Rect[] {
  if (n <= 0) return [];
  if (n === 3) {
    const colW = Math.floor((box.w - gap) / 2);
    const rightH = Math.floor((box.h - gap) / 2);
    return [
      { x: box.x, y: box.y, w: colW, h: box.h },
      { x: box.x + colW + gap, y: box.y, w: box.w - colW - gap, h: rightH },
      {
        x: box.x + colW + gap,
        y: box.y + rightH + gap,
        w: box.w - colW - gap,
        h: box.h - rightH - gap,
      },
    ];
  }
  const spec = ROW_LAYOUTS[n];
  if (!spec) return [];
  const weights = spec.weights ?? spec.rows.map(() => 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const available = box.h - gap * (spec.rows.length - 1);
  const rects: Rect[] = [];
  let y = box.y;
  spec.rows.forEach((count, rowIndex) => {
    const isLastRow = rowIndex === spec.rows.length - 1;
    const rowH = isLastRow
      ? box.y + box.h - y
      : Math.floor((available * (weights[rowIndex] ?? 1)) / totalWeight);
    const cellW = (box.w - gap * (count - 1)) / count;
    for (let i = 0; i < count; i++) {
      const x = box.x + Math.round(i * (cellW + gap));
      const nextX =
        i === count - 1
          ? box.x + box.w
          : box.x + Math.round((i + 1) * (cellW + gap)) - gap;
      rects.push({ x, y, w: nextX - x, h: rowH });
    }
    y += rowH + gap;
  });
  return rects;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let truncated = false;
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(test).width <= maxWidth) {
      current = test;
      continue;
    }
    lines.push(current);
    if (lines.length === maxLines) {
      truncated = true;
      current = "";
      break;
    }
    current = word;
  }
  if (current && lines.length < maxLines) lines.push(current);

  const ellipsize = (line: string): string => {
    let out = line;
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out.trimEnd()}…`;
  };
  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = ellipsize(lines[lines.length - 1]!);
  }
  // Ett veldig langt ord uten mellomrom
  return lines.map((line) =>
    ctx.measureText(line).width > maxWidth ? ellipsize(line) : line,
  );
}

async function loadPhoto(url: string): Promise<Drawable> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Kunne ikke hente bilde");
  const blob = await res.blob();
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(blob);
    return { src: bmp, w: bmp.width, h: bmp.height };
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(objectUrl);
    return { src: img, w: img.naturalWidth, h: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Kunne ikke laste bilde"));
    img.src = src;
  });
}

function cssFontFamily(variable: string, fallback: string): string {
  const raw = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return raw ? `${raw}, ${fallback}` : fallback;
}

function drawCover(ctx: CanvasRenderingContext2D, photo: Drawable, rect: Rect) {
  const scale = Math.max(rect.w / photo.w, rect.h / photo.h);
  const dw = photo.w * scale;
  const dh = photo.h * scale;
  ctx.drawImage(
    photo.src,
    rect.x + (rect.w - dw) / 2,
    rect.y + (rect.h - dh) / 2,
    dw,
    dh,
  );
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  text: string,
  displayFamily: string,
) {
  const fontSize = rect.w >= 700 ? 44 : rect.w >= 440 ? 36 : 28;
  const lineH = Math.round(fontSize * 1.15);
  const inset = rect.w >= 440 ? 24 : 18;
  ctx.font = `700 ${fontSize}px ${displayFamily}`;
  const lines = wrapText(ctx, text, rect.w - inset * 2, 2);
  const textBlockH = lines.length * lineH;
  const gradH = Math.min(rect.h, textBlockH + inset + 56);

  const grad = ctx.createLinearGradient(
    0,
    rect.y + rect.h - gradH,
    0,
    rect.y + rect.h,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y + rect.h - gradH, rect.w, gradH);

  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, i) => {
    ctx.fillText(
      line,
      rect.x + inset,
      rect.y +
        rect.h -
        inset -
        (lines.length - 1 - i) * lineH -
        Math.round(fontSize * 0.2),
    );
  });
}

type ChallengeRowLayout = {
  lines: string[];
  height: number;
};

const ROW_PAD_Y = 24;
const ROW_PAD_X = 24;
const BADGE = 52;
const ROW_TEXT_SIZE = 32;
const ROW_LINE_H = 42;
const ROW_GAP = 14;
const SECTION_TITLE_H = 76;

function drawCheck(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy + 1);
  ctx.lineTo(cx - 3, cy + 8);
  ctx.lineTo(cx + 11, cy - 8);
  ctx.stroke();
  ctx.restore();
}

/** Render delebilde som PNG-blob. Kaster hvis bilder ikke kan hentes. */
export async function renderRecapImage(input: RecapExportInput): Promise<Blob> {
  const photos = input.photos.slice(0, MAX_EXPORT_PHOTOS);
  if (photos.length === 0) {
    throw new Error("Ingen bilder å eksportere");
  }

  const displayFamily = cssFontFamily("--font-display", "sans-serif");
  const bodyFamily = cssFontFamily("--font-body", "sans-serif");
  try {
    await Promise.all([
      document.fonts.load(`700 44px ${displayFamily}`),
      document.fonts.load(`600 32px ${bodyFamily}`),
      document.fonts.load(`400 26px ${bodyFamily}`),
    ]);
  } catch {
    // Fall back to whatever is available.
  }

  const [loaded, brandMark] = await Promise.all([
    Promise.all(photos.map((p) => loadPhoto(p.url))),
    loadImageElement("/logo.png").catch(() => null),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke lage bilde");

  // Bakgrunn + svak brand-gradient nederst
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W, H, 0, W, H, 1000);
  glow.addColorStop(0, "rgba(204,63,12,0.30)");
  glow.addColorStop(1, "rgba(204,63,12,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Header: kveldsnavn øverst til venstre, merke (n-bue + o) øverst til høyre
  let y = PAD;
  const nameSize = 76;
  const wmH = 72;
  const wmW = brandMark
    ? Math.round((brandMark.naturalWidth / brandMark.naturalHeight) * wmH)
    : 0;
  // Midtstill merket på første linje av navnet
  const wmY = PAD + Math.round(nameSize * 0.5 - wmH / 2);
  if (brandMark) {
    ctx.drawImage(brandMark, W - PAD - wmW, wmY, wmW, wmH);
  }

  ctx.fillStyle = TEXT;
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${nameSize}px ${displayFamily}`;
  const nameMaxW = W - PAD * 2 - (wmW > 0 ? wmW + 40 : 0);
  const nameLines = wrapText(ctx, input.name || "Min kveld", nameMaxW, 3);
  nameLines.forEach((line, i) => {
    ctx.fillText(
      line,
      PAD,
      y + nameSize * 0.85 + i * Math.round(nameSize * 1.08),
    );
  });
  y += nameLines.length * Math.round(nameSize * 1.08) + 8;

  // Utfordringer: mål radhøyder
  const rowTextX = PAD + ROW_PAD_X + BADGE + 22;
  const rowTextW = W - PAD - ROW_PAD_X - rowTextX;
  ctx.font = `600 ${ROW_TEXT_SIZE}px ${bodyFamily}`;
  const challengeList = input.challenges.slice(0, MAX_EXPORT_CHALLENGES);
  const rows: ChallengeRowLayout[] = challengeList.map((c) => {
    const lines = wrapText(ctx, c.text, rowTextW, 3);
    const height = ROW_PAD_Y * 2 + lines.length * ROW_LINE_H;
    return { lines, height };
  });
  const neededRowsH = rows.reduce(
    (sum, r, i) => sum + r.height + (i > 0 ? ROW_GAP : 0),
    0,
  );
  const hasChallenges = rows.length > 0;
  const moreCount = Math.max(0, input.moreChallengesCount ?? 0);
  const neededChallengeBlock = hasChallenges
    ? SECTION_TITLE_H + neededRowsH + (moreCount > 0 ? MORE_H + ROW_GAP : 0)
    : 0;

  // Fordel plass: collage vs. utfordringer
  const sectionGap = 44;
  const areaTop = y + 36;
  const areaH = H - FOOTER_H - 24 - areaTop;
  const idealH = IDEAL_COLLAGE_H[photos.length] ?? 952;
  const minH = Math.round(idealH * 0.6);
  const collageH = Math.max(
    minH,
    Math.min(
      hasChallenges ? idealH : Math.round(idealH * 1.25),
      areaH - (hasChallenges ? neededChallengeBlock + sectionGap : 0),
    ),
  );

  // Uten utfordringer: sentrer collagen i ledig plass
  const collageTop = hasChallenges
    ? areaTop
    : areaTop + Math.max(0, Math.round((areaH - collageH) / 2));

  const box: Rect = { x: PAD, y: collageTop, w: W - PAD * 2, h: collageH };
  const rects = collageRects(photos.length, box);

  rects.forEach((rect, i) => {
    const photo = loaded[i];
    const meta = photos[i];
    if (!photo || !meta) return;
    ctx.save();
    roundedRectPath(ctx, rect.x, rect.y, rect.w, rect.h, PHOTO_RADIUS);
    ctx.clip();
    ctx.fillStyle = SURFACE;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    drawCover(ctx, photo, rect);
    if (meta.barName) drawCaption(ctx, rect, meta.barName, displayFamily);
    ctx.restore();
  });

  // Utfordringer
  if (hasChallenges) {
    let cy = collageTop + collageH + sectionGap;
    ctx.fillStyle = TEXT;
    ctx.font = `700 44px ${displayFamily}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Utfordringer", PAD, cy + 40);
    cy += SECTION_TITLE_H;

    const fit = rows.length;

    for (let i = 0; i < fit; i++) {
      const row = rows[i]!;
      const rowW = W - PAD * 2;
      ctx.fillStyle = SURFACE;
      roundedRectPath(ctx, PAD, cy, rowW, row.height, 22);
      ctx.fill();

      const cx = PAD + ROW_PAD_X + BADGE / 2;
      const cyBadge = cy + row.height / 2;
      ctx.fillStyle = BRAND;
      ctx.beginPath();
      ctx.arc(cx, cyBadge, BADGE / 2, 0, Math.PI * 2);
      ctx.fill();
      drawCheck(ctx, cx, cyBadge);

      ctx.fillStyle = TEXT;
      ctx.font = `600 ${ROW_TEXT_SIZE}px ${bodyFamily}`;
      ctx.textBaseline = "alphabetic";
      row.lines.forEach((line, li) => {
        ctx.fillText(
          line,
          rowTextX,
          cy + ROW_PAD_Y + ROW_LINE_H * li + ROW_TEXT_SIZE + 2,
        );
      });
      cy += row.height + ROW_GAP;
    }

    if (moreCount > 0) {
      ctx.fillStyle = MUTED;
      ctx.font = `600 28px ${bodyFamily}`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(
        `+ ${moreCount} utfordring${moreCount === 1 ? "" : "er"}`,
        PAD + 4,
        cy + 30,
      );
    }
  }

  // Footer
  const footerY = H - PAD + 4;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = MUTED;
  ctx.font = `400 30px ${bodyFamily}`;
  ctx.fillText("nextround.no", PAD, footerY);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Kunne ikke lage bilde")),
      "image/png",
    );
  });
}

export function exportFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `nextround-${slug || "kveld"}.png`;
}
