import * as Comlink from 'comlink';

export interface TerrainDecodeArgs {
  buffer: ArrayBuffer;
  encoding: 'uint16' | 'float32';
  width: number;
  height: number;
  minElevationM: number;
  maxElevationM: number;
}

export interface TerrainDecodeResult {
  heights: Float32Array;
  centerElevation: number;
}

export interface TerrainWorkerApi {
  decodeHeights(args: TerrainDecodeArgs): TerrainDecodeResult;
}

const api: TerrainWorkerApi = {
  decodeHeights(args: TerrainDecodeArgs): TerrainDecodeResult {
    const { buffer, encoding, width, height, minElevationM, maxElevationM } = args;
    const count = width * height;
    const heights = new Float32Array(count);

    if (encoding === 'uint16') {
      const u16 = new Uint16Array(buffer);
      const range = maxElevationM - minElevationM;
      const scale = range > 0 ? range / 65535.0 : 0;
      for (let i = 0; i < count; i++) {
        heights[i] = minElevationM + u16[i] * scale;
      }
    } else {
      const f32 = new Float32Array(buffer);
      heights.set(f32);
    }

    const centerIdx = Math.floor(height / 2) * width + Math.floor(width / 2);
    const centerElevation = heights[centerIdx] ?? (minElevationM + maxElevationM) / 2;

    return Comlink.transfer({ heights, centerElevation }, [heights.buffer]);
  }
};

Comlink.expose(api);
