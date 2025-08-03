import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Workforce management dashboard'
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Gradient background container */}
        <div 
          className="absolute inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-0 h-[80%] w-full -translate-x-1/2 bg-gradient-to-b from-primary/10 via-primary/10 to-transparent opacity-30" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        </div>

        <div className="space-y-8">
          {/* Stats cards row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Stats cards will go here */}
          </div>

          {/* Main content area */}
          <div className="bg-card/50 backdrop-blur-lg rounded-xl border p-6">

            {/* Page content will be inserted here */}
            <div className="mt-6">
              {/* Content will be injected by child routes */}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
