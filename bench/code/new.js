import { parseGIF, decompressFrames } from "gifuct-js";

const parse = (buff) =>
  Promise.resolve()
    .then(() => parseGIF(buff))
    .then((gif) =>
      Promise.all([
        decompressFrames(gif, false),
        { width: gif.lsd.width, height: gif.lsd.height },
      ])
    )
    .then(([frames, options]) => {
      let readyFrames = [];

      for (let i = 0; i < frames.length; ++i) {
        const frame = frames[i];
        let typedArray =
          frame.disposalType === 2 || i === 0
            ? new Uint8ClampedArray(options.width * options.height * 4)
            : readyFrames[i - 1].slice();

        readyFrames.push(putPixels(typedArray, frame, options));
      }

      return [readyFrames, options];
    });

const putPixels = (typedArray, frame, gifSize) => {
  const { width, height, top: dy, left: dx } = frame.dims;
  const offset = dy * gifSize.width + dx;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pPos = y * width + x;
      const colorIndex = frame.pixels[pPos];
      if (colorIndex !== frame.transparentIndex) {
        const taPos = offset + y * gifSize.width + x;
        const color = frame.colorTable[colorIndex] || [0, 0, 0];
        typedArray[taPos * 4] = color[0];
        typedArray[taPos * 4 + 1] = color[1];
        typedArray[taPos * 4 + 2] = color[2];
        typedArray[taPos * 4 + 3] = 255;
      }
    }
  }

  return typedArray;
};

export default parse;
