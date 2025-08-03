import { prisma } from '@/lib/prisma';

export async function updateWorkerRequirements(shiftId: string, requirements: any) {
  try {
    console.log('updateWorkerRequirements called with:', { shiftId, requirements });

    // Ensure crew chief is always set to 1
    const processedRequirements = Array.isArray(requirements) ? requirements : requirements.requestedWorkers || [];

    console.log('Processed requirements:', processedRequirements);

    // Convert requirements array to individual field values
    const updateData: any = {
      requiredCrewChiefs: 1, // Always fixed at 1
      requiredStagehands: 0,
      requiredForkOperators: 0,
      requiredReachForkOperators: 0,
      requiredRiggers: 0,
      requiredGeneralLaborers: 0
    };

    // Map role codes to field names
    const roleFieldMap: Record<string, string> = {
      'CC': 'requiredCrewChiefs',
      'SH': 'requiredStagehands',
      'FO': 'requiredForkOperators',
      'RFO': 'requiredReachForkOperators',
      'RG': 'requiredRiggers',
      'GL': 'requiredGeneralLaborers'
    };

    // Process requirements and update field values
    processedRequirements.forEach((req: any) => {
      const fieldName = roleFieldMap[req.roleCode];
      if (fieldName) {
        // Crew chief is always 1, others use the provided count
        updateData[fieldName] = req.roleCode === 'CC' ? 1 : (req.requiredCount || 0);
      }
    });

    console.log('Final update data:', updateData);

    // Update the shift with new worker requirements
    const updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: updateData
    });

    console.log('Shift updated successfully:', updatedShift.id);

    // Fetch updated shift data
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        job: {
          include: {
            company: true
          }
        },
        assignedPersonnel: true
      }
    });

    return shift;
  } catch (error) {
    console.error('Error updating worker requirements:', error);
    throw error;
  }
}

// Helper function to get role name from code
function getRoleNameFromCode(roleCode: string): string {
  const roleMap: Record<string, string> = {
    'CC': 'Crew Chief',
    'SH': 'Stage Hand',
    'FO': 'Fork Operator',
    'RFO': 'Reach Fork Operator',
    'RG': 'Rigger',
    'GL': 'General Labor'
  };
  return roleMap[roleCode] || roleCode;
}

// Helper function to get role color from code
function getRoleColorFromCode(roleCode: string): string {
  const colorMap: Record<string, string> = {
    'CC': 'purple',
    'SH': 'blue',
    'FO': 'green',
    'RFO': 'yellow',
    'RG': 'red',
    'GL': 'gray'
  };
  return colorMap[roleCode] || 'gray';
}