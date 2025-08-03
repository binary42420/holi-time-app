"use client"

import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button'
;
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Download } from "lucide-react";

interface SignaturePadProps {
  penColor?: string;
  backgroundColor?: string;
  width?: number;
  height?: number;
  showControls?: boolean;
  label?: string;
  required?: boolean;
}

export interface SignaturePadRef {
  clear: () => void;
  getTrimmedCanvas: () => HTMLCanvasElement;
  isEmpty: () => boolean;
  fromDataURL: (dataURL: string) => void;
  toDataURL: (type?: string, encoderOptions?: number) => string;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>((props, ref) => {
  const {
    penColor = 'black',
    backgroundColor = 'transparent',
    width,
    height = 200,
    showControls = true,
    label,
    required = false,
    ...canvasProps
  } = props;

  const sigCanvas = useRef<SignatureCanvas>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useImperativeHandle(ref, () => ({
    clear: () => {
      sigCanvas.current?.clear();
      setHasSignature(false);
    },
    getTrimmedCanvas: () => {
      if (!sigCanvas.current) {
        throw new Error("Signature canvas not available");
      }
      return sigCanvas.current.getTrimmedCanvas();
    },
    isEmpty: () => {
      return sigCanvas.current?.isEmpty() ?? true;
    },
    fromDataURL: (dataURL: string) => {
      sigCanvas.current?.fromDataURL(dataURL);
      setHasSignature(true);
    },
    toDataURL: (type?: string, encoderOptions?: number) => {
      if (!sigCanvas.current) {
        throw new Error("Signature canvas not available");
      }
      return sigCanvas.current.toDataURL(type, encoderOptions);
    }
  }));

  const handleBegin = () => {
    setHasSignature(true);
  };

  const handleClear = () => {
    sigCanvas.current?.clear();
    setHasSignature(false);
  };

  const handleDownload = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'signature.png';
      link.href = dataURL;
      link.click();
    }
  };

  return (
    <div className="space-y-4">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div
        className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg bg-background hover:border-muted-foreground/50 transition-colors"
        style={{ height: height }}
      >
        <SignatureCanvas
          ref={sigCanvas}
          penColor={penColor}
          backgroundColor={backgroundColor}
          onBegin={handleBegin}
          canvasProps={{
            className: 'w-full h-full rounded-lg',
            width: width,
            height: height,
            ...canvasProps
          }}
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm">
              Sign here with your mouse or finger
            </p>
          </div>
        )}
      </div>

      {showControls && (
        <>
          <Separator />
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={!hasSignature}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!hasSignature}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {hasSignature ? 'Signature captured' : 'No signature'}
            </p>
          </div>
        </>
      )}
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
