/** BTC Liquidator brand tokens */
export const BTC_ORANGE = "#f7931a";
export const BTC_ORANGE_BRIGHT = "#ffb84d";
export const BTC_ORANGE_DARK = "#c45e00";
export const BTC_GOLD = "#ffd54f";
export const FIRE_RED = "#ff4500";
export const FIRE_YELLOW = "#ffcc00";

const BTC_LOGO_SRC = "/btc-logo.png";

let logoImage: HTMLImageElement | null = null;
let processedCanvas: HTMLCanvasElement | null = null;

export function getBtcLogoImage(): HTMLImageElement {
  if (!logoImage) {
    logoImage = new Image();
    logoImage.onload = () => {
      processedCanvas = null;
    };
    logoImage.src = BTC_LOGO_SRC;
    logoImage.crossOrigin = "anonymous";
  }
  return logoImage;
}

/** Strip black/near-black pixels so only the orange coin remains. */
function buildProcessedLogo(img: HTMLImageElement): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;

  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d");
  if (!sctx) return null;
  sctx.drawImage(img, 0, 0);

  const data = sctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    if (r < 55 && g < 55 && b < 55) {
      px[i + 3] = 0;
    } else {
      px[i + 3] = 255;
    }
  }
  sctx.putImageData(data, 0, 0);
  return src;
}

function getProcessedLogo(img: HTMLImageElement): HTMLCanvasElement | null {
  if (processedCanvas) return processedCanvas;
  if (!img.complete || !img.naturalWidth) return null;
  processedCanvas = buildProcessedLogo(img);
  return processedCanvas;
}

/** User BTC logo — transparent outside the orange coin. */
export function drawBtcCoin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
) {
  const img = getBtcLogoImage();
  const size = radius * 2.15;

  ctx.save();
  ctx.shadowColor = "rgba(247, 147, 26, 0.45)";
  ctx.shadowBlur = radius * 0.35;

  const processed = getProcessedLogo(img);
  if (processed) {
    ctx.drawImage(processed, cx - size / 2, cy - size / 2, size, size);
  } else if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  } else {
    ctx.fillStyle = BTC_ORANGE;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
