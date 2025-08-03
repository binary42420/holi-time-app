"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Card, Button, Textarea, Progress, Alert, Group, Text, Title, Stack, FileInput } from "@mantine/core"
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Building2
} from "lucide-react"
import { notifications } from "@mantine/notifications"
import { UserRole } from "@prisma/client"

function ImportClientsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importResults, setImportResults] = useState<{ successful: number; failed: number; total: number; errors: string[] } | null>(null)
  const [csvData, setCsvData] = useState("")
  const [file, setFile] = useState<File | null>(null);

  if (!user || user.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const handleFileUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/companies/import', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error('Failed to import clients')
      }

      const result = await response.json()
      setImportResults(result)

      notifications.show({
        title: "Import Completed",
        message: `Successfully imported ${result.successful} clients.`,
        color: 'green'
      })

    } catch {
      notifications.show({
        title: "Import Failed",
        message: "Failed to import clients. Please check your file format.",
        color: 'red'
      })
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleCsvImport = async () => {
    if (!csvData.trim()) {
      notifications.show({
        title: "No Data",
        message: "Please enter CSV data to import.",
        color: 'red'
      })
      return
    }

    setIsUploading(true)
    try {
      const response = await fetch('/api/companies/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData }),
      })

      if (!response.ok) {
        throw new Error('Failed to import clients')
      }

      const result = await response.json()
      setImportResults(result)

      notifications.show({
        title: "Import Completed",
        message: `Successfully imported ${result.successful} clients.`,
        color: 'green'
      })

    } catch {
      notifications.show({
        title: "Import Failed",
        message: "Failed to import clients. Please check your data format.",
        color: 'red'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    if (typeof window === 'undefined') return;

    const csvTemplate = `name,contactPerson,contactEmail,contactPhone,address,notes
"ABC Construction","John Smith","john@abcconstruction.com","555-0123","123 Main St, City, State 12345","Primary contractor for downtown projects"
"XYZ Logistics","Jane Doe","jane@xyzlogistics.com","555-0456","456 Oak Ave, City, State 12345","Warehouse and distribution services"`

    const blob = new Blob([csvTemplate], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'client_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <Stack gap="lg">
      <Group>
        <Button variant="subtle" onClick={() => router.push('/admin/clients')} leftSection={<ArrowLeft size={16} />}>
          Back to Clients
        </Button>
        <div>
          <Title order={1}>Import Clients</Title>
          <Text c="dimmed">Bulk import client data from CSV files</Text>
        </div>
      </Group>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1rem' }}>
        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Group>
              <Upload size={20} />
              <Title order={4}>File Upload</Title>
            </Group>
            <Text size="sm" c="dimmed">
              Upload a CSV file containing client data
            </Text>
          </Card.Section>
          <Card.Section p="md">
            <Stack>
              <FileInput
                label="CSV File"
                placeholder="Select a CSV file"
                accept=".csv"
                value={file}
                onChange={setFile}
                disabled={isUploading}
              />
              <Button onClick={handleFileUpload} disabled={isUploading || !file}>
                Upload and Import
              </Button>
              {isUploading && uploadProgress > 0 && (
                <Stack>
                  <Group justify="space-between">
                    <Text size="sm">Uploading...</Text>
                    <Text size="sm">{uploadProgress}%</Text>
                  </Group>
                  <Progress value={uploadProgress} />
                </Stack>
              )}
              <Button
                variant="outline"
                onClick={downloadTemplate}
                fullWidth
                leftSection={<Download size={16} />}
              >
                Download CSV Template
              </Button>
            </Stack>
          </Card.Section>
        </Card>

        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Group>
              <FileText size={20} />
              <Title order={4}>Manual Entry</Title>
            </Group>
            <Text size="sm" c="dimmed">
              Paste CSV data directly into the text area
            </Text>
          </Card.Section>
          <Card.Section p="md">
            <Stack>
              <Textarea
                label="CSV Data"
                placeholder="name,contactPerson,contactEmail,contactPhone,address,notes&#10;ABC Construction,John Smith,john@abc.com,555-0123,123 Main St,Notes here"
                value={csvData}
                onChange={(e) => setCsvData(e.currentTarget.value)}
                rows={8}
                disabled={isUploading}
              />
              <Button
                onClick={handleCsvImport}
                disabled={isUploading || !csvData.trim()}
                fullWidth
                leftSection={<Upload size={16} />}
              >
                {isUploading ? 'Importing...' : 'Import Data'}
              </Button>
            </Stack>
          </Card.Section>
        </Card>
      </div>

      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Title order={4}>CSV Format Requirements</Title>
          <Text size="sm" c="dimmed">
            Your CSV file must include the following columns
          </Text>
        </Card.Section>
        <Card.Section p="md">
          <Stack>
            <Alert color="blue" icon={<AlertCircle size={16} />}>
              <strong>Required columns:</strong> name, email
            </Alert>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.5rem', alignItems: 'center' }}>
              <Text fw={500}>Column Name</Text>
              <Text fw={500}>Required</Text>
              <Text fw={500}>Description</Text>
              
              <Text>name</Text>
              <Text c="red">Yes</Text>
              <Text>Company name</Text>

              <Text>email</Text>
              <Text c="orange">Optional</Text>
              <Text>Company email address</Text>

              <Text>phone</Text>
              <Text c="orange">Optional</Text>
              <Text>Company phone number</Text>

              <Text>contactEmail</Text>
              <Text c="red">Yes</Text>
              <Text>Contact email address</Text>

              <Text>contactPhone</Text>
              <Text c="dimmed">No</Text>
              <Text>Contact phone number</Text>

              <Text>address</Text>
              <Text c="dimmed">No</Text>
              <Text>Company address</Text>

              <Text>notes</Text>
              <Text c="dimmed">No</Text>
              <Text>Additional notes</Text>
            </div>
          </Stack>
        </Card.Section>
      </Card>

      {importResults && (
        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Group>
              <CheckCircle size={20} color="green" />
              <Title order={4}>Import Results</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Group>
              <Stack align="center">
                <Text size="xl" fw={700} c="green">{importResults.successful}</Text>
                <Text size="sm" c="dimmed">Successful</Text>
              </Stack>
              <Stack align="center">
                <Text size="xl" fw={700} c="red">{importResults.failed}</Text>
                <Text size="sm" c="dimmed">Failed</Text>
              </Stack>
              <Stack align="center">
                <Text size="xl" fw={700}>{importResults.total}</Text>
                <Text size="sm" c="dimmed">Total Processed</Text>
              </Stack>
            </Group>

            {importResults.errors && importResults.errors.length > 0 && (
              <Stack mt="md">
                <Title order={5}>Errors:</Title>
                {importResults.errors.map((error: string, index: number) => (
                  <Alert key={index} color="red" icon={<AlertCircle size={16} />}>
                    {error}
                  </Alert>
                ))}
              </Stack>
            )}

            <Group mt="md">
              <Button onClick={() => router.push('/admin/clients')} leftSection={<Building2 size={16} />}>
                View Clients
              </Button>
              <Button variant="outline" onClick={() => setImportResults(null)}>
                Import More
              </Button>
            </Group>
          </Card.Section>
        </Card>
      )}
    </Stack>
  )
}

export default ImportClientsPage;
