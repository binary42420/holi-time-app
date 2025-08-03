"use client"

import React, { useState, use } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useUser } from "@/hooks/use-user"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Edit, 
  Share2, 
  Clock,
  User,
  Building2,
  Tag,
  Calendar,
  PenTool,
  Eye
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import dynamic from 'next/dynamic'

const PDFViewer = dynamic(() => import('@/components/pdf-viewer-wrapper'), {
  ssr: false,
  loading: () => <p>Loading PDF viewer...</p>
})

interface DocumentDetailPageProps {
  params: { id: string }
}

export default function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { id } = params

  // Mock document data - in a real app, this would come from an API
  const documentData = {
    id: id,
    name: "Equipment Inspection Form",
    description: "Daily equipment safety checklist and inspection form",
    category: "Safety",
    type: "Form",
    status: "Requires Signature",
    fileUrl: "/documents/sample-form.pdf", // This would be a real PDF URL
    size: "1.8 MB",
    createdAt: "2024-01-10T12:00:00Z",
    updatedAt: "2024-01-14T15:30:00Z",
    ownerName: "Maria Garcia",
    ownerId: "user-2",
    version: "1.2",
    tags: ["safety", "equipment", "daily", "inspection"],
    permissions: {
      canView: true,
      canEdit: user?.role === 'Admin',
      canApprove: user?.role === 'Admin' || user?.role === 'CrewChief',
      canDelete: user?.role === 'Admin',
      canShare: user?.role === 'Admin'
    }
  }

  const [activeTab, setActiveTab] = useState("view")

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default">Active</Badge>
      case 'Draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'Pending Review':
        return <Badge variant="outline">Pending Review</Badge>
      case 'Requires Signature':
        return <Badge variant="destructive">Requires Signature</Badge>
      case 'Archived':
        return <Badge variant="outline">Archived</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleSaveForm = async (formData: any) => {
    // In a real app, this would save to the backend
    console.log('Saving form data:', formData)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast({
      title: "Form Saved",
      description: "Your form has been saved successfully.",
    })
  }

  const handleShare = () => {
    // In a real app, this would open a sharing dialog
    toast({
      title: "Share Document",
      description: "Sharing functionality would be implemented here.",
    })
  }

  const handleDownload = () => {
    const link = window.document.createElement('a')
    link.href = documentData.fileUrl
    link.download = documentData.name
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Documents
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">{documentData.name}</h1>
          <p className="text-muted-foreground">{documentData.description}</p>
        </div>
        <div className="flex gap-2">
          {documentData.permissions.canShare && (
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          )}
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          {documentData.permissions.canEdit && (
            <Button onClick={() => setActiveTab("edit")}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Form
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">{getStatusBadge(documentData.status)}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <div className="mt-1 flex items-center gap-1">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span>{documentData.category}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <div className="mt-1 flex items-center gap-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{documentData.type}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Owner</label>
                <div className="mt-1 flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{documentData.ownerName}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Size</label>
                <div className="mt-1">{documentData.size}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Version</label>
                <div className="mt-1">{documentData.version}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <div className="mt-1 flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(documentData.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Modified</label>
                <div className="mt-1 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(documentData.updatedAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Tags</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {documentData.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="view" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View Document
              </TabsTrigger>
              {documentData.permissions.canEdit && (
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Fill Form
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="view" className="mt-4">
              <PDFViewer
                documentUrl={documentData.fileUrl}
                documentName={documentData.name}
                canEdit={false}
              />
            </TabsContent>

            {documentData.permissions.canEdit && (
              <TabsContent value="edit" className="mt-4">
                <PDFViewer
                  documentUrl={documentData.fileUrl}
                  documentName={documentData.name}
                  canEdit={true}
                  onSave={handleSaveForm}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
