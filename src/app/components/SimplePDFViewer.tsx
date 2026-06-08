import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AlertCircle, Brush, Loader2, Save, Trash2, Type } from 'lucide-react'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { toast } from 'react-toastify'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

interface SimplePDFViewerProps {
  fileUrl?: string
  submissionId?: string | number
  onFetchFileBlob?: (fileUrl: string) => Promise<Blob>
  title?: string
  onAnnotatedPdfReady?: (blob: Blob) => void
}

type ToolMode = 'draw' | 'text'

type Point = {
  x: number
  y: number
}

type StrokeAnnotation = {
  id: string
  color: string
  size: number
  points: Point[]
}

type TextAnnotation = {
  id: string
  x: number
  y: number
  text: string
  color: string
  size: number
}

type PageAnnotations = {
  strokes: StrokeAnnotation[]
  texts: TextAnnotation[]
}

type PageMetrics = {
  width: number
  height: number
  scale: number
}

const EMPTY_PAGE_ANNOTATIONS: PageAnnotations = {
  strokes: [],
  texts: []
}

const DEFAULT_PEN_COLOR = '#2563eb'
const DEFAULT_TEXT_COLOR = '#111827'

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'annotated-document'

const getCanvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
  const canvas = event.currentTarget
  const rect = canvas.getBoundingClientRect()

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

const drawStroke = (ctx: CanvasRenderingContext2D, stroke: StrokeAnnotation) => {
  if (!stroke.points.length) {
    return
  }

  ctx.save()
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = stroke.size

  const [firstPoint, ...remainingPoints] = stroke.points
  ctx.beginPath()
  ctx.moveTo(firstPoint.x, firstPoint.y)

  if (remainingPoints.length === 0) {
    ctx.arc(firstPoint.x, firstPoint.y, Math.max(1.5, stroke.size / 2), 0, Math.PI * 2)
    ctx.fill()
  } else {
    for (const point of remainingPoints) {
      ctx.lineTo(point.x, point.y)
    }

    ctx.stroke()
  }

  ctx.restore()
}

const drawText = (ctx: CanvasRenderingContext2D, textAnnotation: TextAnnotation) => {
  ctx.save()
  ctx.font = `600 ${textAnnotation.size}px sans-serif`
  ctx.textBaseline = 'top'
  ctx.fillStyle = textAnnotation.color
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = Math.max(2, Math.ceil(textAnnotation.size / 8))
  ctx.strokeText(textAnnotation.text, textAnnotation.x, textAnnotation.y)
  ctx.fillText(textAnnotation.text, textAnnotation.x, textAnnotation.y)
  ctx.restore()
}

export const SimplePDFViewer = forwardRef(function SimplePDFViewer(
  { fileUrl, onFetchFileBlob, title = 'Student Submission', onAnnotatedPdfReady }: SimplePDFViewerProps,
  ref
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [activePage, setActivePage] = useState(1)
  const [containerWidth, setContainerWidth] = useState(0)
  const [toolMode, setToolMode] = useState<ToolMode>('draw')
  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR)
  const [penSize, setPenSize] = useState(3)
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR)
  const [textSize, setTextSize] = useState(18)
  const [textValue, setTextValue] = useState('')
  const [annotationsByPage, setAnnotationsByPage] = useState<Record<number, PageAnnotations>>({})

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const baseCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const overlayCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const pageMetricsRef = useRef<Record<number, PageMetrics>>({})
  const annotationsRef = useRef<Record<number, PageAnnotations>>({})
  const currentStrokeRef = useRef<{ pageNumber: number; stroke: StrokeAnnotation } | null>(null)
  const sourceBlobRef = useRef<Blob | null>(null)

  const getCurrentAnnotations = () =>
    Object.entries(annotationsRef.current).flatMap(([pageNumber, pageAnnotations]) => {
      const page = Number(pageNumber)

      return [
        ...pageAnnotations.strokes.map((stroke) => ({
          id: stroke.id,
          points: stroke.points,
          color: stroke.color,
          width: stroke.size,
          pageNumber: page
        })),
        ...pageAnnotations.texts.map((textAnnotation) => ({
          id: textAnnotation.id,
          points: [{ x: textAnnotation.x, y: textAnnotation.y }],
          color: textAnnotation.color,
          width: textAnnotation.size,
          pageNumber: page,
          text: textAnnotation.text
        }))
      ]
    })

  useEffect(() => {
    annotationsRef.current = annotationsByPage
  }, [annotationsByPage])

  useEffect(() => {
    let isCancelled = false

    const loadPDF = async () => {
      if (!fileUrl) {
        setError('No file URL provided')
        setPdfDocument(null)
        setPageCount(0)
        return
      }
      // renderPages will manage render tasks and cancellation (handled in separate effect)
      setIsLoading(true)
      setError(null)
      setPdfDocument(null)
      setPageCount(0)
      setAnnotationsByPage({})
      pageMetricsRef.current = {}
      sourceBlobRef.current = null

      try {
        const blob = onFetchFileBlob
          ? await onFetchFileBlob(fileUrl)
          : await fetch(fileUrl).then((response) => {
              if (!response.ok) {
                throw new Error(`Failed to fetch PDF (${response.status})`)
              }

              return response.blob()
            })

        if (isCancelled) {
          return
        }

        sourceBlobRef.current = blob

        const pdfBytes = new Uint8Array(await blob.arrayBuffer())
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes })
        const documentProxy = await loadingTask.promise

        if (isCancelled) {
          await documentProxy.destroy()
          return
        }

        setPdfDocument(documentProxy)
        setPageCount(documentProxy.numPages)
        setActivePage(1)
      } catch (err) {
        if (isCancelled) {
          return
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF'
        console.error('[SimplePDFViewer] Error:', err)
        setError(errorMessage)
        toast.error('Failed to load PDF file: ' + errorMessage)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPDF()

    return () => {
      isCancelled = true
    }
  }, [fileUrl, onFetchFileBlob])

  useEffect(() => {
    const element = wrapperRef.current

    if (!element) {
      return
    }

    const updateWidth = () => {
      setContainerWidth(element.clientWidth)
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const drawPageAnnotations = (pageNumber: number) => {
    const overlayCanvas = overlayCanvasRefs.current[pageNumber]
    const metrics = pageMetricsRef.current[pageNumber]

    if (!overlayCanvas || !metrics) {
      return
    }

    const context = overlayCanvas.getContext('2d')

    if (!context) {
      return
    }

    const currentAnnotations = annotationsRef.current[pageNumber] ?? EMPTY_PAGE_ANNOTATIONS

    context.clearRect(0, 0, metrics.width, metrics.height)

    for (const stroke of currentAnnotations.strokes) {
      drawStroke(context, stroke)
    }

    for (const textAnnotation of currentAnnotations.texts) {
      drawText(context, textAnnotation)
    }

    if (currentStrokeRef.current?.pageNumber === pageNumber) {
      drawStroke(context, currentStrokeRef.current.stroke)
    }
  }

  useEffect(() => {
    if (!pdfDocument || pageCount === 0 || containerWidth === 0) {
      return
    }

    let isCancelled = false
    const renderTasks: Array<any> = []

    const renderPages = async () => {
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        if (isCancelled) {
          return
        }

        const pdfPage = await pdfDocument.getPage(pageNumber)
        const baseCanvas = baseCanvasRefs.current[pageNumber]
        const overlayCanvas = overlayCanvasRefs.current[pageNumber]

        if (!baseCanvas || !overlayCanvas) {
          continue
        }

        const baseViewport = pdfPage.getViewport({ scale: 1 })
        const availableWidth = Math.max(containerWidth - 48, 320)
        const scale = clampNumber(availableWidth / baseViewport.width, 0.75, 1.7)
        const viewport = pdfPage.getViewport({ scale })

        baseCanvas.width = viewport.width
        baseCanvas.height = viewport.height
        baseCanvas.style.width = `${viewport.width}px`
        baseCanvas.style.height = `${viewport.height}px`

        overlayCanvas.width = viewport.width
        overlayCanvas.height = viewport.height
        overlayCanvas.style.width = `${viewport.width}px`
        overlayCanvas.style.height = `${viewport.height}px`

        pageMetricsRef.current[pageNumber] = {
          width: viewport.width,
          height: viewport.height,
          scale
        }

        const context = baseCanvas.getContext('2d')

        if (!context) {
          continue
        }

        context.clearRect(0, 0, viewport.width, viewport.height)

        const renderTask = pdfPage.render({ canvasContext: context, viewport })
        renderTasks.push(renderTask)

        try {
          await renderTask.promise
        } catch (err) {
          if (isCancelled) return
          console.error('[SimplePDFViewer] Page render failed:', err)
          continue
        }

        drawPageAnnotations(pageNumber)
      }
    }

    renderPages().catch((renderError) => {
      console.error('[SimplePDFViewer] Render error:', renderError)
      toast.error('Failed to render PDF pages.')
    })

    return () => {
      isCancelled = true
      for (const rt of renderTasks) {
        if (rt && typeof rt.cancel === 'function') {
          try {
            rt.cancel()
          } catch (e) {
            // ignore
          }
        }
      }
    }
  }, [containerWidth, pageCount, pdfDocument])

  useEffect(() => {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      drawPageAnnotations(pageNumber)
    }
  }, [annotationsByPage, pageCount])

  const updatePenSize = (value: string) => {
    const nextSize = Number(value)
    if (Number.isFinite(nextSize)) {
      setPenSize(clampNumber(nextSize, 1, 24))
    }
  }

  const updateTextSize = (value: string) => {
    const nextSize = Number(value)
    if (Number.isFinite(nextSize)) {
      setTextSize(clampNumber(nextSize, 10, 64))
    }
  }

  const commitStroke = (pageNumber: number) => {
    const activeStroke = currentStrokeRef.current

    if (!activeStroke || activeStroke.pageNumber !== pageNumber) {
      return
    }

    setAnnotationsByPage((current) => {
      const pageAnnotations = current[pageNumber] ?? { strokes: [], texts: [] }

      return {
        ...current,
        [pageNumber]: {
          ...pageAnnotations,
          strokes: [...pageAnnotations.strokes, activeStroke.stroke]
        }
      }
    })

    currentStrokeRef.current = null
    drawPageAnnotations(pageNumber)
  }

  const handlePointerDown = (pageNumber: number, event: ReactPointerEvent<HTMLCanvasElement>) => {
    const overlayCanvas = overlayCanvasRefs.current[pageNumber]

    if (!overlayCanvas) {
      return
    }

    event.preventDefault()
    setActivePage(pageNumber)

    if (toolMode === 'text') {
      const trimmedText = textValue.trim()

      if (!trimmedText) {
        toast.info('Enter text before placing a text annotation.')
        return
      }

      const point = getCanvasPoint(event)
      const textAnnotation: TextAnnotation = {
        id: createId(),
        x: point.x,
        y: point.y,
        text: trimmedText,
        color: textColor,
        size: textSize
      }

      setAnnotationsByPage((current) => {
        const pageAnnotations = current[pageNumber] ?? { strokes: [], texts: [] }

        return {
          ...current,
          [pageNumber]: {
            ...pageAnnotations,
            texts: [...pageAnnotations.texts, textAnnotation]
          }
        }
      })

      drawPageAnnotations(pageNumber)
      return
    }

    const point = getCanvasPoint(event)
    const stroke: StrokeAnnotation = {
      id: createId(),
      color: penColor,
      size: penSize,
      points: [point]
    }

    currentStrokeRef.current = {
      pageNumber,
      stroke
    }

    overlayCanvas.setPointerCapture(event.pointerId)
    drawPageAnnotations(pageNumber)
  }

  const handlePointerMove = (pageNumber: number, event: ReactPointerEvent<HTMLCanvasElement>) => {
    const activeStroke = currentStrokeRef.current

    if (!activeStroke || activeStroke.pageNumber !== pageNumber) {
      return
    }

    const overlayCanvas = overlayCanvasRefs.current[pageNumber]
    const context = overlayCanvas?.getContext('2d')

    if (!overlayCanvas || !context) {
      return
    }

    const nextPoint = getCanvasPoint(event)
    const previousPoint = activeStroke.stroke.points[activeStroke.stroke.points.length - 1]

    activeStroke.stroke.points.push(nextPoint)

    context.save()
    context.strokeStyle = activeStroke.stroke.color
    context.lineWidth = activeStroke.stroke.size
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(previousPoint.x, previousPoint.y)
    context.lineTo(nextPoint.x, nextPoint.y)
    context.stroke()
    context.restore()
  }

  const handlePointerUp = (pageNumber: number, event: ReactPointerEvent<HTMLCanvasElement>) => {
    const overlayCanvas = overlayCanvasRefs.current[pageNumber]

    if (overlayCanvas?.hasPointerCapture(event.pointerId)) {
      overlayCanvas.releasePointerCapture(event.pointerId)
    }

    commitStroke(pageNumber)
  }

  const handlePointerLeave = (pageNumber: number, event: ReactPointerEvent<HTMLCanvasElement>) => {
    const overlayCanvas = overlayCanvasRefs.current[pageNumber]

    if (overlayCanvas?.hasPointerCapture(event.pointerId)) {
      overlayCanvas.releasePointerCapture(event.pointerId)
    }

    commitStroke(pageNumber)
  }

  const clearPageAnnotations = (pageNumber: number) => {
    setAnnotationsByPage((current) => ({
      ...current,
      [pageNumber]: { strokes: [], texts: [] }
    }))

    drawPageAnnotations(pageNumber)
  }

  const clearAllAnnotations = () => {
    setAnnotationsByPage({})

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      drawPageAnnotations(pageNumber)
    }
  }

  const exportAnnotatedPdf = async () => {
    const blob = sourceBlobRef.current

    if (!blob || !pdfDocument) {
      toast.error('No PDF is loaded for export.')
      return
    }

    setIsExporting(true)

    try {
      const pdfBytes = await blob.arrayBuffer()
      const annotatedDocument = await PDFDocument.load(pdfBytes)
      const pdfPages = annotatedDocument.getPages()

      for (let pageIndex = 0; pageIndex < pdfPages.length; pageIndex += 1) {
        const pageNumber = pageIndex + 1
        const metrics = pageMetricsRef.current[pageNumber]
        const pageAnnotations = annotationsRef.current[pageNumber] ?? EMPTY_PAGE_ANNOTATIONS

        if (!metrics || (pageAnnotations.strokes.length === 0 && pageAnnotations.texts.length === 0)) {
          continue
        }

        const canvas = document.createElement('canvas')
        canvas.width = metrics.width
        canvas.height = metrics.height

        const context = canvas.getContext('2d')

        if (!context) {
          continue
        }

        for (const stroke of pageAnnotations.strokes) {
          drawStroke(context, stroke)
        }

        for (const textAnnotation of pageAnnotations.texts) {
          drawText(context, textAnnotation)
        }

        const imageBytes = canvas.toDataURL('image/png')
        const pngImage = await annotatedDocument.embedPng(imageBytes)
        const page = pdfPages[pageIndex]

        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: page.getWidth(),
          height: page.getHeight()
        })
      }

      const output = await annotatedDocument.save()
      const outputBuffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer
      const annotatedBlob = new Blob([outputBuffer], { type: 'application/pdf' })

      // trigger download
      const downloadUrl = URL.createObjectURL(annotatedBlob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${sanitizeFileName(title)}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)

      onAnnotatedPdfReady?.(annotatedBlob)
      toast.success('Annotated PDF exported successfully.')
    } catch (exportError) {
      console.error('[SimplePDFViewer] Export error:', exportError)
      toast.error('Failed to export annotated PDF.')
    } finally {
      setIsExporting(false)
    }
  }

  const buildAnnotatedPdfBlob = async (): Promise<Blob | null> => {
    const blob = sourceBlobRef.current

    if (!blob || !pdfDocument) {
      return null
    }

    const pdfBytes = await blob.arrayBuffer()
    const annotatedDocument = await PDFDocument.load(pdfBytes)
    const pdfPages = annotatedDocument.getPages()

    for (let pageIndex = 0; pageIndex < pdfPages.length; pageIndex += 1) {
      const pageNumber = pageIndex + 1
      const metrics = pageMetricsRef.current[pageNumber]
      const pageAnnotations = annotationsRef.current[pageNumber] ?? EMPTY_PAGE_ANNOTATIONS

      if (!metrics || (pageAnnotations.strokes.length === 0 && pageAnnotations.texts.length === 0)) {
        continue
      }

      const canvas = document.createElement('canvas')
      canvas.width = metrics.width
      canvas.height = metrics.height

      const context = canvas.getContext('2d')
      if (!context) continue

      for (const stroke of pageAnnotations.strokes) {
        drawStroke(context, stroke)
      }

      for (const textAnnotation of pageAnnotations.texts) {
        drawText(context, textAnnotation)
      }

      const imageBytes = canvas.toDataURL('image/png')
      const pngImage = await annotatedDocument.embedPng(imageBytes)
      const page = pdfPages[pageIndex]

      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight()
      })
    }

    const output = await annotatedDocument.save()
    const outputBuffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer
    const annotatedBlob = new Blob([outputBuffer], { type: 'application/pdf' })
    return annotatedBlob
  }

  useImperativeHandle(ref, () => ({
    exportAnnotatedPdf: async () => {
      const blob = await buildAnnotatedPdfBlob()
      if (blob) {
        // also trigger download and callback to keep existing behavior
        const downloadUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `${sanitizeFileName(title)}.pdf`
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
        onAnnotatedPdfReady?.(blob)
      }
      return blob
    },
    getAnnotatedPdfBlob: async () => buildAnnotatedPdfBlob(),
    getAnnotations: () => getCurrentAnnotations()
  }))

  return (
    <Card className='flex h-[200vh] min-h-160 flex-col overflow-hidden bg-white'>
      <CardHeader className='shrink-0 border-b border-gray-200'>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-gray-50 p-4'>
        <div className='flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant={toolMode === 'draw' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setToolMode('draw')}
            >
              <Brush className='h-4 w-4' />
              Draw
            </Button>
            <Button
              type='button'
              variant={toolMode === 'text' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setToolMode('text')}
            >
              <Type className='h-4 w-4' />
              Text
            </Button>
          </div>

          <div className='flex items-center gap-2'>
            <span className='text-xs font-medium uppercase tracking-wide text-gray-500'>Ink</span>
            <Input
              type='color'
              value={penColor}
              onChange={(event) => setPenColor(event.target.value)}
              className='h-9 w-12 cursor-pointer p-1'
              aria-label='Pen color'
            />
            <Input
              type='number'
              min={1}
              max={24}
              value={penSize}
              onChange={(event) => updatePenSize(event.target.value)}
              className='h-9 w-20'
              aria-label='Pen size'
            />
          </div>

          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <span className='text-xs font-medium uppercase tracking-wide text-gray-500'>Text</span>
            <Input
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              placeholder='Type annotation text'
              className='h-9 min-w-0 flex-1'
              disabled={toolMode !== 'text'}
              aria-label='Annotation text'
            />
            <Input
              type='number'
              min={10}
              max={64}
              value={textSize}
              onChange={(event) => updateTextSize(event.target.value)}
              className='h-9 w-20'
              aria-label='Text size'
              disabled={toolMode !== 'text'}
            />
            <Input
              type='color'
              value={textColor}
              onChange={(event) => setTextColor(event.target.value)}
              className='h-9 w-12 cursor-pointer p-1'
              aria-label='Text color'
              disabled={toolMode !== 'text'}
            />
          </div>

          <div className='ml-auto flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => clearPageAnnotations(activePage)}
              disabled={pageCount === 0}
            >
              <Trash2 className='h-4 w-4' />
              Clear page
            </Button>
            <Button type='button' variant='outline' size='sm' onClick={clearAllAnnotations} disabled={pageCount === 0}>
              <Trash2 className='h-4 w-4' />
              Clear all
            </Button>
            <Button
              type='button'
              size='sm'
              onClick={exportAnnotatedPdf}
              disabled={isLoading || isExporting || !pdfDocument}
            >
              {isExporting ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}
              Export annotated PDF
            </Button>
          </div>
        </div>

        <div className='text-xs text-gray-500'>
          {toolMode === 'text'
            ? 'Click on a page to place the current text annotation.'
            : 'Draw directly on top of the PDF page using the selected ink settings.'}
        </div>

        <div
          ref={wrapperRef}
          className='flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white p-4 scroll-smooth snap-y snap-mandatory'
        >
          {isLoading && (
            <div className='flex flex-col items-center gap-2 text-gray-500'>
              <Loader2 className='h-8 w-8 animate-spin' />
              <p>Loading PDF...</p>
            </div>
          )}

          {error && (
            <div className='flex flex-col items-center gap-2 px-4 text-center text-red-500'>
              <AlertCircle className='h-8 w-8' />
              <p className='text-sm'>{error}</p>
              <p className='text-xs text-gray-500'>Check the file URL and try again.</p>
            </div>
          )}

          {!isLoading && !error && pageCount > 0 && (
            <div className='space-y-6'>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <div
                  key={pageNumber}
                  className='snap-start overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'
                >
                  <div className='flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600'>
                    <span>Page {pageNumber}</span>
                    <span>
                      {pageMetricsRef.current[pageNumber]?.scale
                        ? `${Math.round(pageMetricsRef.current[pageNumber].scale * 100)}%`
                        : 'Rendering...'}
                    </span>
                  </div>
                  <div className='relative inline-block bg-white'>
                    <canvas
                      ref={(element) => {
                        baseCanvasRefs.current[pageNumber] = element
                      }}
                      className='block max-w-none'
                    />
                    <canvas
                      ref={(element) => {
                        overlayCanvasRefs.current[pageNumber] = element
                      }}
                      className='absolute inset-0 block max-w-none'
                      style={{ cursor: toolMode === 'text' ? 'text' : 'crosshair', touchAction: 'none' }}
                      onPointerDown={(event) => handlePointerDown(pageNumber, event)}
                      onPointerMove={(event) => handlePointerMove(pageNumber, event)}
                      onPointerUp={(event) => handlePointerUp(pageNumber, event)}
                      onPointerLeave={(event) => handlePointerLeave(pageNumber, event)}
                      aria-label={`Annotation layer for page ${pageNumber}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && pageCount === 0 && <div className='text-gray-500'>No PDF file available</div>}
        </div>
      </CardContent>
    </Card>
  )
})
