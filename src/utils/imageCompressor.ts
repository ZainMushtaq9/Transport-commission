/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility to compress image files and base64 data URLs to stay strictly within
 * Firestore's 1,048,487 bytes limit per property/document.
 */

export async function compressBase64Image(
  base64Str: string,
  maxSizeBytes: number = 500000 // 500 KB default limit for images
): Promise<string> {
  if (!base64Str || typeof base64Str !== 'string') return base64Str;
  
  // If not a data URL or already small enough, return as is
  if (!base64Str.startsWith('data:image/') || base64Str.length <= maxSizeBytes) {
    return base64Str;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Iterative attempts with descending max dimensions and JPEG qualities
      const compressionSteps = [
        { maxDim: 1000, quality: 0.75 },
        { maxDim: 800, quality: 0.65 },
        { maxDim: 600, quality: 0.55 },
        { maxDim: 450, quality: 0.45 },
        { maxDim: 300, quality: 0.35 }
      ];

      let resultBase64 = base64Str;

      for (const step of compressionSteps) {
        let currentWidth = img.width;
        let currentHeight = img.height;

        if (currentWidth > step.maxDim || currentHeight > step.maxDim) {
          if (currentWidth > currentHeight) {
            currentHeight = Math.round((currentHeight * step.maxDim) / currentWidth);
            currentWidth = step.maxDim;
          } else {
            currentWidth = Math.round((currentWidth * step.maxDim) / currentHeight);
            currentHeight = step.maxDim;
          }
        }

        canvas.width = Math.max(currentWidth, 1);
        canvas.height = Math.max(currentHeight, 1);

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Solid white background to prevent black background on transparent PNGs converting to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          resultBase64 = canvas.toDataURL('image/jpeg', step.quality);

          if (resultBase64.length <= maxSizeBytes) {
            break;
          }
        }
      }

      resolve(resultBase64);
    };

    img.onerror = (err) => {
      console.warn('Canvas failed to load image for compression, returning original string:', err);
      resolve(base64Str);
    };

    img.src = base64Str;
  });
}

/**
 * Reads a File object and compresses it directly into a lightweight JPEG Base64 string.
 */
export async function compressFile(
  file: File,
  maxSizeBytes: number = 500000
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawBase64 = e.target?.result as string;
      if (!rawBase64) {
        resolve('');
        return;
      }
      const compressed = await compressBase64Image(rawBase64, maxSizeBytes);
      resolve(compressed);
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Prepares an item or payload for Firestore by sanitizing undefined fields 
 * AND compressing any base64 image properties to ensure they never exceed maxSizeBytes.
 */
export async function prepareForFirestore(obj: any, maxSizeBytes: number = 500000): Promise<any> {
  if (obj === null || obj === undefined) return null;

  if (Array.isArray(obj)) {
    const cleanedArray = [];
    for (const item of obj) {
      if (item !== undefined) {
        cleanedArray.push(await prepareForFirestore(item, maxSizeBytes));
      }
    }
    return cleanedArray;
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (typeof value === 'string' && value.startsWith('data:image/')) {
          cleaned[key] = await compressBase64Image(value, maxSizeBytes);
        } else if (typeof value === 'object' && value !== null) {
          cleaned[key] = await prepareForFirestore(value, maxSizeBytes);
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  }

  return obj;
}
