"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Download,
  Eye,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  FileCheck,
  FilePenLine,
  FileImage,
  FileSpreadsheet,
  Plus,
  Folder,
  Clock,
  User,
  PenTool
} from "lucide-react"
import Header from "@/components/Header"

export default function DocumentsPage() {
  const { user } = useUser()
  const router = useRouter()

  const documents = [
    {
      id: "1",
      name: "Safety Training Certificate",
      description: "Required safety training documentation",
      category: "Training",
      type: "PDF",
      status: "Active",
      updatedAt: "2024-01-15T10:00:00Z",
      ownerName: "John Smith"
    },
    {
      id: "2",
      name: "Equipment Inspection Form",
      description: "Daily equipment safety checklist",
      category: "Safety",
      type: "Form",
      status: "Requires Signature",
      updatedAt: "2024-01-14T15:30:00Z",
      ownerName: "Maria Garcia"
    },
  ]

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const canManage = user?.role === 'Admin'

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    const matchesType = typeFilter === 'all' || doc.type === typeFilter

    return matchesSearch && matchesCategory && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-green-600 text-white"><FileCheck className="mr-1 h-3 w-3" />Active</Badge>
      case 'Requires Signature':
        return <Badge variant="destructive"><PenTool className="mr-1 h-3 w-3" />Needs Signature</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />
      case 'form':
        return <FilePenLine className="h-4 w-4 text-blue-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const uniqueCategories = Array.from(new Set(documents.map(d => d.category))).filter(Boolean)
  const uniqueTypes = Array.from(new Set(documents.map(d => d.type))).filter(Boolean)

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Documents</h1>
              <p className="text-gray-400">Manage and access important documents, forms, and files.</p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/documents/templates')} className="bg-gray-800 border-gray-700 hover:bg-gray-700">
                  <Folder className="mr-2 h-4 w-4" />
                  Templates
                </Button>
                <Button onClick={() => router.push('/documents/upload')} className="bg-indigo-600 hover:bg-indigo-700">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            )}
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Requires Signature">Requires Signature</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">All Documents</CardTitle>
              <CardDescription>{filteredDocuments.length} of {documents.length} documents shown</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-white">Document</TableHead>
                    <TableHead className="text-white">Category</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Last Modified</TableHead>
                    <TableHead className="text-white">Owner</TableHead>
                    <TableHead className="text-right text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="cursor-pointer border-gray-700 hover:bg-gray-750"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getTypeIcon(doc.type)}
                          <div>
                            <div className="font-medium text-white">{doc.name}</div>
                            <div className="text-sm text-gray-400">{doc.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doc.category}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell className="text-gray-400">
                        {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-gray-400">{doc.ownerName}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white">
                            <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}`)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}}>
                              <Download className="mr-2 h-4 w-4" /> Download
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}/edit`)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}