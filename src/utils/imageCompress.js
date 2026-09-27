// Client-side image compression shared by anything that needs to keep an
// upload small — resizes to fit within maxSize on the longest edge, then
// steps JPEG quality down until under targetBytes (or gives up at a floor
// quality rather than looping forever).
export function compressImageFile(file, { maxSize = 1280, targetBytes = 300 * 1024, minQuality = 0.4 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

        let quality = 0.85;
        let blob = null;
        const tryQuality = () => {
          canvas.toBlob((result) => {
            blob = result;
            if (!blob) { reject(new Error('Compression failed')); return; }
            if (blob.size <= targetBytes || quality <= minQuality) {
              resolve(blob);
            } else {
              quality = Math.max(minQuality, quality - 0.15);
              tryQuality();
            }
          }, 'image/jpeg', quality);
        };
        tryQuality();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
