"use client"

import React, { useState, useEffect } from "react"
import { Button, Card, Badge, Select, Avatar, Group, Text, ActionIcon, Grid, Stack, Title, ComboboxItem } from "@mantine/core"
import { Users, Plus, Minus, UserPlus, X, Crown, Shield, User as UserIcon, ShieldCheck, Truck } from "lucide-react"
import { notifications } from "@mantine/notifications"
import { RoleCode, User } from "@/lib/types"
import { useApiQuery, useUsers, useApiMutation } from "@/hooks/use-api"
import { apiService } from "@/lib/services/api"
import { ROLE_DEFINITIONS } from "@/lib/color-utils"

interface WorkerRequirement {
  roleCode: RoleCode;
  requiredCount: number;
}

interface AssignedWorker {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  roleOnShift: string;
  roleCode: string;
  status: string;
  isPlaceholder?: boolean;
}

interface WorkerAssignmentDisplayProps {
  shiftId: string;
  assignedPersonnel: AssignedWorker[];
  onUpdate: () => void;
}

type WorkerSlot =
  | { type: 'assigned'; worker: AssignedWorker }
  | { type: 'placeholder'; worker: AssignedWorker }
  | { type: 'empty'; roleCode: RoleCode }

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'Admin':
      return <Crown size={16} className="text-yellow-500" />;
    case 'CrewChief':
      return <Shield size={16} className="text-purple-500" />;
    default:
      return <UserIcon size={16} className="text-blue-500" />;
  }
}

export default function WorkerAssignmentDisplay({
  shiftId, 
  assignedPersonnel, 
  onUpdate 
}: WorkerAssignmentDisplayProps) {
  const [workerRequirements, setWorkerRequirements] = useState<WorkerRequirement[]>([])

  const { data: requirementsData, isLoading: requirementsLoading, refetch: refetchRequirements } = useApiQuery(
    ['workerRequirements', shiftId],
    () => apiService.getWorkerRequirements(shiftId),
    { enabled: !!shiftId }
  );

  const { data: usersData } = useUsers();
  const availableEmployees = usersData?.filter(user =>
    user.role === 'Employee' || user.role === 'CrewChief' || user.role === 'Admin'
  ) || [];

  useEffect(() => {
    if (requirementsData) {
      setWorkerRequirements(requirementsData as WorkerRequirement[])
    }
  }, [requirementsData])

  const updateRequirementsMutation = useApiMutation<void, WorkerRequirement[]>(
    (updatedRequirements) => apiService.updateWorkerRequirements(shiftId, updatedRequirements),
    {
      onSuccess: () => {
        notifications.show({ title: "Requirements Updated", message: "Worker requirements have been successfully updated.", color: 'green' });
        refetchRequirements();
      },
      onError: (error: any) => notifications.show({ title: "Error", message: error.message || "Failed to update requirements.", color: 'red' }),
    }
  );

  const assignWorkerMutation = useApiMutation<void, { employeeId: string; roleCode: RoleCode }>(
    ({ employeeId, roleCode }) => apiService.assignWorker(shiftId, employeeId, roleCode),
    {
      onSuccess: (data, variables) => {
        const employee = availableEmployees.find(emp => emp.id === variables.employeeId);
        notifications.show({ title: "Worker Assigned", message: `${employee?.name} assigned as ${ROLE_DEFINITIONS[variables.roleCode].name}`, color: 'green' });
        onUpdate();
      },
      onError: (error: any) => notifications.show({ title: "Error", message: error.message || "Failed to assign worker.", color: 'red' }),
    }
  );

  const unassignWorkerMutation = useApiMutation<void, string>(
    (assignmentId) => apiService.unassignWorker(shiftId, assignmentId),
    {
      onSuccess: (data, assignmentId) => {
        const workerName = assignedPersonnel.find(p => p.id === assignmentId)?.employeeName || 'Worker';
        notifications.show({ title: "Worker Unassigned", message: `${workerName} has been unassigned.`, color: 'blue' });
        onUpdate();
      },
      onError: (error: any) => notifications.show({ title: "Error", message: error.message || "Failed to unassign worker.", color: 'red' }),
    }
  );

  const updateWorkerRequirement = (roleCode: RoleCode, newCount: number) => {
    if (updateRequirementsMutation.isPending || newCount < 0) return;
    const allRoleTypes: RoleCode[] = ['CC', 'SH', 'FO', 'RFO', 'RG', 'GL'];
    const updatedRequirements: WorkerRequirement[] = allRoleTypes.map(role => {
      if (role === roleCode) return { roleCode: role, requiredCount: newCount };
      return workerRequirements.find(req => req.roleCode === role) || { roleCode: role, requiredCount: 0 };
    });
    updateRequirementsMutation.mutate(updatedRequirements as any);
  };

  const assignWorker = (employeeId: string | null, roleCode: RoleCode) => {
    if (!employeeId) return;
    assignWorkerMutation.mutate({ employeeId, roleCode });
  };

  const unassignWorker = (assignmentId: string, workerName: string) => {
    unassignWorkerMutation.mutate(assignmentId);
  };

  const getRequiredCount = (roleCode: RoleCode): number => {
    return workerRequirements.find(req => req.roleCode === roleCode)?.requiredCount || 0
  }

  const getAssignedWorkers = (roleCode: RoleCode): AssignedWorker[] => {
    return assignedPersonnel.filter(worker => worker.roleCode === roleCode)
  }

  const generateWorkerSlots = (roleCode: RoleCode): WorkerSlot[] => {
    const requiredCount = getRequiredCount(roleCode);
    const allAssigned = getAssignedWorkers(roleCode);
    const assignedWorkers = allAssigned.filter(w => !w.isPlaceholder);
    const placeholderWorkers = allAssigned.filter(w => w.isPlaceholder);
    const slots: WorkerSlot[] = [];

    assignedWorkers.forEach(worker => {
      slots.push({ type: 'assigned', worker });
    });

    const openSlots = Math.max(0, requiredCount - assignedWorkers.length);

    for (let i = 0; i < openSlots; i++) {
      if (i < placeholderWorkers.length) {
        slots.push({ type: 'placeholder', worker: placeholderWorkers[i] });
      } else {
        slots.push({ type: 'empty', roleCode });
      }
    }

    return slots;
  }

  if (requirementsLoading) {
    return <Text>Loading worker requirements...</Text>
  }

  return (
    <Stack gap="lg">
      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <Users size={20} />
            <Title order={4}>Worker Requirements</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Configure how many workers of each type are needed for this shift
          </Text>
        </Card.Section>
        <Card.Section inheritPadding py="md">
          <Grid>
            {(Object.entries(ROLE_DEFINITIONS) as [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][]).map(([roleCode, roleDef]) => {
              const currentCount = getRequiredCount(roleCode)
              return (
                <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={roleCode}>
                  <Card withBorder radius="md" p="sm">
                    <Group justify="space-between" mb="sm">
                      <Group>
                        <Badge color={roleDef.color} variant="light">{roleCode}</Badge>
                        <Text fw={500}>{roleDef.name}</Text>
                      </Group>
                    </Group>
                    <Group justify="flex-end">
                      <ActionIcon variant="default" onClick={() => updateWorkerRequirement(roleCode, currentCount - 5)} disabled={currentCount < 5 || updateRequirementsMutation.isPending}>-5</ActionIcon>
                      <ActionIcon variant="default" onClick={() => updateWorkerRequirement(roleCode, currentCount - 1)} disabled={currentCount === 0 || updateRequirementsMutation.isPending}><Minus size={16} /></ActionIcon>
                      <Text w={40} ta="center" fw={700} size="xl">{currentCount}</Text>
                      <ActionIcon variant="default" onClick={() => updateWorkerRequirement(roleCode, currentCount + 1)} disabled={updateRequirementsMutation.isPending}><Plus size={16} /></ActionIcon>
                      <ActionIcon variant="default" onClick={() => updateWorkerRequirement(roleCode, currentCount + 5)} disabled={updateRequirementsMutation.isPending}>+5</ActionIcon>
                    </Group>
                  </Card>
                </Grid.Col>
              )
            })}
          </Grid>
        </Card.Section>
      </Card>

      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <UserPlus size={20} />
            <Title order={4}>Worker Assignments</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Assign specific workers to each required position
          </Text>
        </Card.Section>
        <Card.Section inheritPadding py="md">
          <Stack gap="md">
            {(Object.entries(ROLE_DEFINITIONS) as [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][]).map(([roleCode, roleDef]) => {
              const slots = generateWorkerSlots(roleCode)
              if (slots.length === 0) return null
              return (
                <div key={roleCode}>
                  <Group mb="xs">
                    <Badge color={roleDef.color} variant="filled">{roleCode}</Badge>
                    <Text fw={500}>{roleDef.name}</Text>
                    <Text size="sm" c="dimmed">
                      ({getAssignedWorkers(roleCode).length}/{getRequiredCount(roleCode)} assigned)
                    </Text>
                  </Group>
                  <Grid>
                    {slots.map((slot, index) => (
                      <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={`${roleCode}-${index}`}>
                        <Card withBorder radius="md" p="xs">
                          {slot.type === 'assigned' ? (
                            <Group justify="space-between">
                              <Group>
                                <Avatar src={slot.worker.employeeAvatar} radius="xl">
                                  {slot.worker.employeeName.split(' ').map((n: string) => n[0]).join('')}
                                </Avatar>
                                <div>
                                  <Text size="sm" fw={500}>{slot.worker.employeeName}</Text>
                                  <Text size="xs" c={roleDef.color}>{slot.worker.roleOnShift}</Text>
                                </div>
                              </Group>
                              <ActionIcon variant="subtle" color="red" onClick={() => unassignWorker(slot.worker.id, slot.worker.employeeName)}>
                                <X size={16} />
                              </ActionIcon>
                            </Group>
                          ) : (
                            <Select
                              placeholder="Select worker..."
                              onChange={(value) => assignWorker(value, roleCode)}
                              data={availableEmployees
                                .filter(emp => emp.id && !assignedPersonnel.some(assigned => assigned.employeeId === emp.id))
                                .map(employee => ({
                                  value: employee.id,
                                  label: employee.name,
                                  role: employee.role,
                                  isCrewChiefEligible: employee.crew_chief_eligible,
                                  isForkliftCertified: employee.forklift_certified,
                                }))
                              }
                              renderOption={(item) => {
                                const optionWithRole = item.option as ComboboxItem & { role: string, isCrewChiefEligible?: boolean, isForkliftCertified?: boolean };
                                return (
                                  <Group justify="space-between">
                                    <Group gap="xs">
                                      {getRoleIcon(optionWithRole.role)}
                                      <Text>{optionWithRole.label}</Text>
                                    </Group>
                                    <Group gap="xs">
                                      {optionWithRole.isCrewChiefEligible && <ShieldCheck size={16} className="text-green-500" />}
                                      {optionWithRole.isForkliftCertified && <Truck size={16} className="text-orange-500" />}
                                    </Group>
                                  </Group>
                                );
                              }}
                            />
                          )}
                        </Card>
                      </Grid.Col>
                    ))}
                  </Grid>
                </div>
              )
            })}
          </Stack>
        </Card.Section>
      </Card>
    </Stack>
  )
}
