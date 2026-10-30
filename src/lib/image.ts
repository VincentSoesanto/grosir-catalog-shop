// Shrinks a picture in the browser before uploading, so it fits in a Firestore document (max 1 MB)
// and we don't need paid file storage. Screenshots stay readable.

/** Returns a data: URL (WebP) no bigger than `maxBytes`, lowering the quality step by step if needed. */
export async function shrinkImage(file: Blob, maxSide = 1400, maxBytes = 450_000): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Bukan file gambar')
  const bitmap = await createImageBitmap(file)
  let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))

  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Browser tidak bisa memproses gambar')
    ctx.fillStyle = '#fff' // transparent parts become white
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const quality = Math.max(0.5, 0.82 - attempt * 0.08)
    const url = canvas.toDataURL('image/webp', quality)
    // Some old browsers can't make WebP and return PNG: fall back to JPEG
    const data = url.startsWith('data:image/webp') ? url : canvas.toDataURL('image/jpeg', quality)
    if (data.length * 0.75 <= maxBytes) return data
    if (quality <= 0.5) scale *= 0.8 // still too big: make it smaller too
  }
  throw new Error('Gambar terlalu besar, coba gambar lain')
}

/** Same, for a picture that is already on the website or in the database (path or data: URL) */
export async function shrinkUrl(src: string, maxSide: number, maxBytes: number): Promise<string> {
  const blob = await (await fetch(src)).blob()
  return shrinkImage(blob, maxSide, maxBytes)
}
