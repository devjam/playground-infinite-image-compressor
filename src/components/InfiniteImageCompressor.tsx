import defaultImg from '../assets/kaminaly.jpg'
import { button, Leva, useControls } from 'leva'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { isMobile } from 'react-device-detect'

interface WorkerMessage {
  status: 'success' | 'error'
  compressedBlob?: Blob
  quality?: number
  message?: string
}

const InfiniteImageCompressor: React.FC = () => {
  const [{ quality, format, isCompressing, _count }, set, get] = useControls(() => ({
    image: {
      // value: '',
      image: defaultImg.src,
      onChange: (value) => {
        if (value) handleImageChange(value)
      },
    },
    quality: { value: [0.3, 0.8], min: 0, max: 1, step: 0.01 },
    format: {
      value: 'jpeg',
      options: ['jpeg', 'webp', 'random'],
    },
    isCompressing: {
      value: false,
      label: 'compressing',
    },
    clear: button(() => {
      if (workerProssesingRef.current) cleardRef.current = true
      setLatestCompressedImage(null)
      set({ _count: 0, _quality: 0 })
    }),
    _count: {
      value: 0,
      step: 1,
      editable: false,
      label: 'log count',
    },
    _quality: {
      value: 0,
      step: 0.01,
      editable: false,
      label: 'log quality',
    },
    note: {
      value: `画像を圧縮し続けて画像の劣化を楽しむだけのもの。同じクオリティだと劣化しなくなるのでクオリティは変化させる。圧縮はcanvas.convertToBlobで行っているのでブラウザの実装によってwebpの対応がなかったり劣化具合が違ったりする。`,
      editable: false,
      // disabled: true,
    },
  }))

  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [latestCompressedImage, setLatestCompressedImage] = useState<HTMLImageElement | null>(null)
  const [sliderPosition, setSliderPosition] = useState<number>(50)
  const compressingRef = useRef<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const countRef = useRef<number>(_count)

  const workerProssesingRef = useRef<boolean>(false)
  const cleardRef = useRef<boolean>(false)

  useEffect(() => {
    countRef.current = _count
  }, [_count])

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../scripts/image-compressor.worker.ts', import.meta.url),
    )
    workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
      workerProssesingRef.current = false

      if (cleardRef.current) {
        cleardRef.current = false
        return
      }
      if (e.data.status === 'success' && e.data.compressedBlob && e.data.quality) {
        const img = new Image()
        img.onload = () => {
          setLatestCompressedImage(img)
        }
        img.src = URL.createObjectURL(e.data.compressedBlob)

        set({
          _count: countRef.current + 1,
          _quality: e.data.quality,
        })
      } else {
        console.error('Compression failed:', e.data.message)
      }
    }

    setTimeout(() => {
      set({ isCompressing: true })
    }, 300)

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  const handleImageChange = (file: string) => {
    if (!file) return

    const _isCompressing = get('isCompressing')
    set({ isCompressing: false })

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX_WIDTH = 1280
      let width = img.width
      let height = img.height

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width
        width = MAX_WIDTH
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)

        const resizedImg = new Image()
        resizedImg.onload = () => {
          setOriginalImage(resizedImg)
          setLatestCompressedImage(null)
          set({ _count: 0, _quality: 0 })
          if (_isCompressing) set({ isCompressing: true })
        }
        resizedImg.src = canvas.toDataURL('image/jpeg')
      }
    }
    img.src = file
  }

  const compressNextImage = useCallback(
    async (image: HTMLImageElement, format: string, quality: [number, number]) => {
      if (!image || !compressingRef.current || !workerRef.current) return

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = image.width
      canvas.height = image.height
      ctx.drawImage(image, 0, 0, image.width, image.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      workerRef.current.postMessage(
        {
          imageData,
          minQuality: quality[0],
          maxQuality: quality[1],
          format,
        },
        [imageData.data.buffer],
      )
      workerProssesingRef.current = true
    },
    [],
  )

  useEffect(() => {
    let timeoutId: number
    if (isCompressing) {
      compressingRef.current = true

      timeoutId = window.setTimeout(() => {
        const image = latestCompressedImage || originalImage
        if (image)
          compressNextImage(
            image,
            format === 'random' ? (Math.random() > 0.5 ? 'jpeg' : 'webp') : format,
            quality,
          )
      }, 1000 / 60)
    } else {
      compressingRef.current = false
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isCompressing, latestCompressedImage])

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x =
      (e.type === 'mousemove'
        ? (e as React.MouseEvent<HTMLDivElement>).clientX
        : (e as React.TouchEvent<HTMLDivElement>).touches[0]!.clientX) - rect.left

    const newPosition = (x / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, newPosition)))
  }

  return (
    <>
      <Leva
        hideCopyButton={true}
        collapsed={isMobile}
        titleBar={isMobile ? { position: { x: 10, y: -10 } } : true}
      />
      <div className="relative h-screen w-screen overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-col-resize"
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
        >
          {originalImage && (
            <img
              src={originalImage.src}
              alt="Original"
              className="absolute left-0 top-0 h-full w-full object-cover"
            />
          )}
          {latestCompressedImage && (
            <div
              className="absolute right-0 top-0 h-full w-full overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
              <img
                src={latestCompressedImage.src}
                alt="Compressed"
                className="absolute left-0 top-0 h-full w-full object-cover"
              />
            </div>
          )}
          <div
            className="absolute bottom-0 top-0 w-1 bg-white mix-blend-difference"
            style={{ left: `${sliderPosition}%` }}
          />
        </div>
      </div>
    </>
  )
}

export default InfiniteImageCompressor
