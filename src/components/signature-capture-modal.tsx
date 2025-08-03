'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

import { Separator } from '@/components/ui/separator'
import { RotateCcw, Check, X } from "lucide-react"

interface SignatureCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onSignatureSubmit: (signatureData: string) => void
  title?: string
  description?: string
  loading?: boolean
}

export function SignatureCaptureModal({
  isOpen,
  onClose,
  onSignatureSubmit,
  title = "Digital Signature",
  description = "Please sign below to approve this timesheet",
  loading = false
}: SignatureCaptureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
    }
  }

  const handleClose = () => {
    clearSignature()
    onClose()
  }

  const checkSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasSignature = imageData.data.some(channel => channel !== 0);
      setHasSignature(hasSignature);
    }
  }

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      const { x, y } = getCoordinates(event);
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setLastPoint({ x, y });
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const { x, y } = getCoordinates(event);
      ctx.lineTo(x, y);
      ctx.stroke();
      setLastPoint({ x, y });
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
    checkSignature();
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000000';
    }
    
    clearSignature();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-solid border-gray-300 rounded-lg p-4 bg-white">
<canvas
  ref={canvasRef} 
  className="w-full h-[300px] cursor-crosshair touch-none"
  onMouseDown={startDrawing}
  onMouseMove={draw}
  onMouseUp={stopDrawing}
  onMouseLeave={stopDrawing}
  onTouchStart={startDrawing}
  onTouchMove={draw}
  onTouchEnd={stopDrawing}
/>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            <p>Sign above using your mouse or finger on touch devices</p>
          </div>

          <Separator />

          <div className="flex justify-between">
            <Button variant="outline" onClick={clearSignature}>
              Clear
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  onSignatureSubmit(canvas.toDataURL());
                }
              }} disabled={!hasSignature}>
                Submit Signature
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SignatureCaptureModal
