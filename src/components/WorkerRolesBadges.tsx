import { WorkerRequirement } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { roleColors, roleTextColor } from "@/lib/config/colors";

interface WorkerRolesBadgesProps {
  requirements: WorkerRequirement[];
}

export function WorkerRolesBadges({ requirements }: WorkerRolesBadgesProps) {
  if (!requirements || requirements.length === 0) {
    return <p className="text-sm text-gray-500">No workers needed.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {requirements
        .filter((req): req is WorkerRequirement => !!req)
        .map((req) => (
          <Badge
            key={req.id}
            variant={roleColors[req.roleCode] || 'gray'}
            className={roleTextColor[req.roleCode] || 'text-white'}
          >
            {req.requiredCount} {req.roleName}
          </Badge>
        ))}
    </div>
  );
}