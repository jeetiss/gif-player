import { parseGIF, decompressFrames } from "gifuct-js";

export const isOffscreenCanvasSupported =
  typeof OffscreenCanvas !== "undefined";

export const canUseOffscreenCanvas =
  typeof HTMLElement === "undefined" && isOffscreenCanvasSupported;

export const parse = (buff) =>
  Promise.resolve()
    .then(() => parseGIF(buff))
    .then((gif) =>
      Promise.all([
        decompressFrames(gif, true),
        { width: gif.lsd.width, height: gif.lsd.height },
      ])
    );

const createCanvas = ({ width, height }) => {
  const canvas = canUseOffscreenCanvas
    ? new OffscreenCanvas(width, height)
    : document.createElement("canvas");

  const ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  if (ctx) {
    return [canvas, ctx];
  }

  throw Error("uups");
};

const getImageBitmap = (canvas) => {
  if (typeof createImageBitmap === "undefined") {
    return new Promise((resolve) => {
      const dataURL = canvas.toDataURL();
      const img = document.createElement("img");
      img.addEventListener("load", function () {
        resolve(this);
      });
      img.src = dataURL;
    });
  } else {
    return createImageBitmap(canvas);
  }
};

export const genearate = ([frames, options], { signal } = {}) => {
  const [temp, tempCtx] = createCanvas(options);
  const [canvas, ctx] = createCanvas(options);
  const delays = frames.map((frame) => frame.delay);
  let imageData;

  return frames
    .reduce(
      (promise, frame) =>
        promise
          .then((framesAsImageBitmap) => {
            const { width, height, top, left } = frame.dims;

            if (
              !imageData ||
              imageData.width !== width ||
              imageData.height !== height
            ) {
              imageData = new ImageData(width, height);
            }

            imageData.data.set(
              canUseOffscreenCanvas
                ? frame.patch
                : new Uint8ClampedArray(frame.patch)
            );

            tempCtx.putImageData(imageData, left, top);

            if (frame.disposalType === 2) {
              ctx.clearRect(0, 0, options.width, options.height);
            }

            ctx.drawImage(temp, 0, 0);

            return Promise.all([framesAsImageBitmap, getImageBitmap(canvas)]);
          })

          .then(([framesAsImageBitmap, bitmap]) => {
            framesAsImageBitmap.push(bitmap);

            return framesAsImageBitmap;
          }),
      Promise.resolve([])
    )
    .then((framesAsImageBitmap) => ({
      ...options,
      delays,
      frames: framesAsImageBitmap,
    }));
};

export default (arrayBuffer) =>
  parse(arrayBuffer).then((raw) => genearate(raw));
