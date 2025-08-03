import { EmployeeManagement } from "@/components/EmployeeManagement"
import { getUsers } from "@/lib/api"

export default async function AdminEmployeesPage() {
  const initialData = await getUsers()

  return <EmployeeManagement initialData={initialData} />
}
