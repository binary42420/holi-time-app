"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useUser } from "@/hooks/use-user"
import { useCompanies } from "@/hooks/use-api"
import {
  Card,
  Button,
  TextInput,
  Textarea,
  Select,
  Group,
  Stack,
  Title,
  Text,
  Container,
  Grid,
} from "@mantine/core"
import { ArrowLeft, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { withAuth } from "@/lib/withAuth"

import { JobStatus } from "@prisma/client";

const jobSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  description: z.string().optional(),
  companyId: z.string().min(1, "Client is required"),
  location: z.string().min(1, "Location is required"),
  status: z.nativeEnum(JobStatus),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  notes: z.string().optional(),
})

type JobFormData = z.infer<typeof jobSchema>

import { UserRole } from '@prisma/client';

function NewJobPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { data: companiesData } = useCompanies()
  const clients = companiesData?.companies || []

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      status: "Active",
    },
  })

  // Redirect if not admin
  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const onSubmit = async (data: JobFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create job')
      }

      const result = await response.json()
      
      toast({
        title: "Job Created",
        description: "The job has been created successfully.",
      })

      router.push(`/jobs/${result.job.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Group justify="space-between">
          <Stack gap={0}>
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={16} />}
              onClick={() => router.push('/admin/jobs')}
              size="sm"
              styles={{ inner: { justifyContent: 'left' }, root: { paddingLeft: 0 } }}
            >
              Back to Jobs
            </Button>
            <Title order={1}>Create New Job</Title>
            <Text c="dimmed">Add a new job to the system</Text>
          </Stack>
        </Group>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack gap="lg">
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="sm">
                <Title order={4}>Job Information</Title>
                <Text size="sm" c="dimmed">Enter the basic details for the new job</Text>
              </Card.Section>
              <Card.Section inheritPadding py="md">
                <Stack>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Job Name"
                        placeholder="Enter job name"
                        required
                        {...form.register("name")}
                        error={form.formState.errors.name?.message}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="Client"
                        placeholder="Select a client"
                        required
                        data={clients.map(client => ({ value: client.id, label: client.name }))}
                        {...form.register("companyId")}
                        onChange={(value) => form.setValue("companyId", value || "")}
                        error={form.formState.errors.companyId?.message}
                        searchable
                      />
                    </Grid.Col>
                  </Grid>
                  <Textarea
                    label="Description"
                    placeholder="Enter job description"
                    {...form.register("description")}
                    rows={3}
                  />
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Location"
                        placeholder="Enter job location"
                        required
                        {...form.register("location")}
                        error={form.formState.errors.location?.message}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="Status"
                        placeholder="Select status"
                        data={Object.values(JobStatus)}
                        {...form.register("status")}
                        onChange={(value) => form.setValue("status", value as any)}
                      />
                    </Grid.Col>
                  </Grid>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput
                        label="Start Date"
                        type="date"
                        {...form.register("startDate")}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput
                        label="End Date"
                        type="date"
                        {...form.register("endDate")}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput
                        label="Budget"
                        placeholder="$0.00"
                        {...form.register("budget")}
                      />
                    </Grid.Col>
                  </Grid>
                  <Textarea
                    label="Notes"
                    placeholder="Additional notes or requirements"
                    {...form.register("notes")}
                    rows={3}
                  />
                </Stack>
              </Card.Section>
            </Card>

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => router.push('/admin/jobs')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting} leftSection={<Save size={16} />}>
                Create Job
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Container>
  )
}

export default withAuth(NewJobPage, "Admin")
