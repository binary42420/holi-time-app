"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useUser } from "@/hooks/use-user"
import { UserRole } from "@prisma/client"
import {
  Card,
  Button,
  TextInput,
  Textarea,
  Select,
  Checkbox,
  Group,
  Stack,
  Title,
  Text,
  Container,
  Grid,
  SimpleGrid,
} from "@mantine/core"
import { ArrowLeft, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  role: z.enum(["Employee", "Crew Chief", "Admin"]),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  hourlyRate: z.string().optional(),
  startDate: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

const availableSkills = [
  "Forklift Operation",
  "Heavy Lifting",
  "Construction Experience",
  "Safety Certification",
  "Customer Service",
  "Event Experience",
  "Security License",
  "Warehouse Operations",
  "Equipment Maintenance",
  "Team Leadership"
]

const availableCertifications = [
  "OSHA 10",
  "OSHA 30",
  "Forklift Certification",
  "First Aid/CPR",
  "Safety Training",
  "Construction Safety",
  "Hazmat Certification",
  "Security License",
  "Food Safety",
  "Equipment Operation"
]

function NewEmployeePage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([])

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      role: "Employee",
      isActive: true,
      skills: [],
      certifications: [],
    },
  })

  // Redirect if not admin
  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true)
    try {
      const formData = {
        ...data,
        skills: selectedSkills,
        certifications: selectedCertifications,
        isActive: data.isActive ?? true,
      }

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to create employee')
      }

      await response.json()
      
      toast({
        title: "Employee Created",
        description: "The employee has been added successfully.",
      })

      router.push('/admin/employees')
    } catch {
      toast({
        title: "Error",
        description: "Failed to create employee. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkillChange = (skill: string, checked: boolean) => {
    if (checked) {
      setSelectedSkills([...selectedSkills, skill])
    } else {
      setSelectedSkills(selectedSkills.filter(s => s !== skill))
    }
  }

  const handleCertificationChange = (cert: string, checked: boolean) => {
    if (checked) {
      setSelectedCertifications([...selectedCertifications, cert])
    } else {
      setSelectedCertifications(selectedCertifications.filter(c => c !== cert))
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
              onClick={() => router.push('/admin/employees')}
              size="sm"
              styles={{ inner: { justifyContent: 'left' }, root: { paddingLeft: 0 } }}
            >
              Back to Employees
            </Button>
            <Title order={1}>Add New Employee</Title>
            <Text c="dimmed">Create a new employee record</Text>
          </Stack>
        </Group>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack gap="lg">
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="sm">
                <Title order={4}>Personal Information</Title>
                <Text size="sm" c="dimmed">Enter the employee's basic personal details</Text>
              </Card.Section>
              <Card.Section inheritPadding py="md">
                <Stack>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Full Name"
                        placeholder="Enter full name"
                        required
                        {...form.register("name")}
                        error={form.formState.errors.name?.message}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Email"
                        placeholder="Enter email address"
                        type="email"
                        required
                        {...form.register("email")}
                        error={form.formState.errors.email?.message}
                      />
                    </Grid.Col>
                  </Grid>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Phone Number"
                        placeholder="Enter phone number"
                        {...form.register("phone")}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="Role"
                        placeholder="Select role"
                        required
                        data={["Employee", "Crew Chief", "Admin"]}
                        {...form.register("role")}
                        onChange={(value) => form.setValue("role", value as "Employee" | "Crew Chief" | "Admin")}
                        error={form.formState.errors.role?.message}
                      />
                    </Grid.Col>
                  </Grid>
                  <Textarea
                    label="Address"
                    placeholder="Enter home address"
                    {...form.register("address")}
                    rows={2}
                  />
                </Stack>
              </Card.Section>
            </Card>

            <Card withBorder>
              <Card.Section withBorder inheritPadding py="sm">
                <Title order={4}>Emergency Contact</Title>
                <Text size="sm" c="dimmed">Emergency contact information</Text>
              </Card.Section>
              <Card.Section inheritPadding py="md">
                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Emergency Contact Name"
                      placeholder="Enter emergency contact name"
                      {...form.register("emergencyContact")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Emergency Contact Phone"
                      placeholder="Enter emergency contact phone"
                      {...form.register("emergencyPhone")}
                    />
                  </Grid.Col>
                </Grid>
              </Card.Section>
            </Card>

            <Card withBorder>
              <Card.Section withBorder inheritPadding py="sm">
                <Title order={4}>Skills & Certifications</Title>
                <Text size="sm" c="dimmed">Select the employee's skills and certifications</Text>
              </Card.Section>
              <Card.Section inheritPadding py="md">
                <Stack>
                  <Stack gap="xs">
                    <Text fw={500}>Skills</Text>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                      {availableSkills.map((skill) => (
                        <Checkbox
                          key={skill}
                          label={skill}
                          checked={selectedSkills.includes(skill)}
                          onChange={(event) => handleSkillChange(skill, event.currentTarget.checked)}
                        />
                      ))}
                    </SimpleGrid>
                  </Stack>
                  <Stack gap="xs">
                    <Text fw={500}>Certifications</Text>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                      {availableCertifications.map((cert) => (
                        <Checkbox
                          key={cert}
                          label={cert}
                          checked={selectedCertifications.includes(cert)}
                          onChange={(event) => handleCertificationChange(cert, event.currentTarget.checked)}
                        />
                      ))}
                    </SimpleGrid>
                  </Stack>
                </Stack>
              </Card.Section>
            </Card>

            <Card withBorder>
              <Card.Section withBorder inheritPadding py="sm">
                <Title order={4}>Employment Details</Title>
                <Text size="sm" c="dimmed">Employment-related information</Text>
              </Card.Section>
              <Card.Section inheritPadding py="md">
                <Stack>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Hourly Rate"
                        placeholder="$0.00"
                        {...form.register("hourlyRate")}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Start Date"
                        type="date"
                        {...form.register("startDate")}
                      />
                    </Grid.Col>
                  </Grid>
                  <Textarea
                    label="Notes"
                    placeholder="Additional notes about the employee"
                    {...form.register("notes")}
                    rows={3}
                  />
                  <Checkbox
                    label="Active Employee"
                    {...form.register("isActive")}
                    checked={form.watch("isActive")}
                    onChange={(event) => form.setValue("isActive", event.currentTarget.checked)}
                  />
                </Stack>
              </Card.Section>
            </Card>

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => router.push('/admin/employees')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting} leftSection={<Save size={16} />}>
                Create Employee
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Container>
  )
}

export default NewEmployeePage;
