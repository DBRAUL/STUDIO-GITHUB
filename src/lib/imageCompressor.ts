/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compresses a base64 image URL using HTML5 Canvas.
 * Resizes the image to fit within maxWidth/maxHeight and compresses it as a JPEG.
 */
export function compressBase64Image(input: string | File | Blob, maxWidth = 1020, maxHeight = 1020, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    if (!input) {
      resolve('');
      return;
    }

    const processBase64 = (base64Str: string) => {
      if (!base64Str || !base64Str.startsWith('data:image')) {
        resolve(base64Str);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = base64Str;
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions preserving aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
          } else {
            resolve(base64Str);
          }
        } catch (err) {
          console.error('Error during image canvas compression:', err);
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    };

    if (input instanceof File || input instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          processBase64(result);
        } else {
          resolve('');
        }
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(input);
    } else {
      processBase64(input);
    }
  });
}
