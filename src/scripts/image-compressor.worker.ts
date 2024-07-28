interface WorkerInput {
  imageData: ImageData
  minQuality: number
  maxQuality: number
  format: 'jpeg' | 'webp'
}

interface CompressResult {
  blob: Blob
  quality: number
}

self.onmessage = async function (e: MessageEvent<WorkerInput>) {
  const { imageData, minQuality, maxQuality, format } = e.data

  const compressImage = async (imgData: ImageData): Promise<CompressResult> => {
    const img = await createImageBitmap(imgData)
    const canvas = new OffscreenCanvas(img.width, img.height)
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    ctx.drawImage(img, 0, 0, img.width, img.height)

    const quality = Math.random() * (maxQuality - minQuality) + minQuality
    const blob = await canvas.convertToBlob({ type: 'image/' + format, quality })

    return { blob, quality }
  }

  try {
    const result = await compressImage(imageData)
    self.postMessage(
      {
        status: 'success' as const,
        compressedBlob: result.blob,
        quality: result.quality,
      },
      // [result.blob],
    )
  } catch (error) {
    self.postMessage({
      status: 'error' as const,
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
