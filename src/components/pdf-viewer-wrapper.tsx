"use client"

import dynamic from 'next/dynamic'
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"

// Dynamically import PDFViewer with no SSR to avoid DOMMatrix errors
const PDFViewer = dynamic(() => import('./pdf-viewer'), {
  ssr: false,
  loading: () => (
    <Card>
      <CardContent className="flex items-center justify-center py-8">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold mb-2">Loading PDF Viewer</h3>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </CardContent>
    </Card>
  )
})

export default PDFViewer
