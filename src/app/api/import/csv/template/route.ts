import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { CSV_HEADERS } from '../../../../../lib/types/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Create sample CSV content
    const headers = CSV_HEADERS.join(',')
    const sampleRows = [
      [
        'Acme Construction',           // client_name
        'John Smith',                 // contact_name
        '555-0123',                   // contact_phone
        'Downtown Office Building',   // job_name
        '2024-01-15',                // job_start_date
        '2024-01-20',                // shift_date
        '08:00',                     // shift_start_time
        '17:00',                     // shift_end_time
        'Jane Doe',                  // employee_name
        'jane.doe@email.com',        // employee_email
        '555-0456',                  // employee_phone
        'SH',                        // worker_type
        '08:00',                     // clock_in_1
        '12:00',                     // clock_out_1
        '13:00',                     // clock_in_2
        '17:00',                     // clock_out_2
        '',                          // clock_in_3
        ''                           // clock_out_3
      ],
      [
        'Acme Construction',           // client_name
        'John Smith',                 // contact_name
        '555-0123',                   // contact_phone
        'Downtown Office Building',   // job_name
        '2024-01-15',                // job_start_date
        '2024-01-20',                // shift_date
        '08:00',                     // shift_start_time
        '17:00',                     // shift_end_time
        'Bob Wilson',                // employee_name
        'bob.wilson@email.com',      // employee_email
        '555-0789',                  // employee_phone
        'FO',                        // worker_type
        '08:00',                     // clock_in_1
        '17:00',                     // clock_out_1
        '',                          // clock_in_2
        '',                          // clock_out_2
        '',                          // clock_in_3
        ''                           // clock_out_3
      ],
      [
        'Tech Solutions Inc',         // client_name
        'Sarah Johnson',              // contact_name
        '555-0321',                   // contact_phone
        'Server Room Setup',          // job_name
        '2024-01-22',                // job_start_date
        '2024-01-25',                // shift_date
        '09:00',                     // shift_start_time
        '18:00',                     // shift_end_time
        'Mike Chen',                 // employee_name
        'mike.chen@email.com',       // employee_email
        '555-0654',                  // employee_phone
        'CC',                        // worker_type
        '09:00',                     // clock_in_1
        '12:30',                     // clock_out_1
        '13:30',                     // clock_in_2
        '18:00',                     // clock_out_2
        '',                          // clock_in_3
        ''                           // clock_out_3
      ]
    ]

    const csvContent = [
      headers,
      ...sampleRows.map(row => row.join(','))
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="holitime_import_template.csv"'
      }
    })

  } catch (error) {
    console.error('Error generating CSV template:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSV template' },
      { status: 500 }
    )
  }
}
