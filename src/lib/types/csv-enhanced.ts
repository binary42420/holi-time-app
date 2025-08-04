// Enhanced CSV import types for flexible data import

// Comprehensive timesheet format matching the provided image
export const TIMESHEET_CSV_HEADERS = [
  'client_name',
  'location',
  'date_time',
  'employee_name',
  'in_time',
  'out_time',
  'in_time_2',
  'out_time_2',
  'in_time_3',
  'out_time_3',
  'in_time_4',
  'out_time_4',
  'total_hours',
  'reg_hours',
  'ot_hours',
  'dt_hours',
  'ta' // Time Adjustment or other notes
] as const;

// Individual table import types
export const EMPLOYEE_CSV_HEADERS = [
  'name',
  'email',
  'phone',
  'role',
  'company_name',
  'crew_chief_eligible',
  'fork_operator_eligible',
  'OSHA_10_Certifications',
  'OSHA_10_Certifications',
  'certifications',
  'location'
] as const;

export const COMPANY_CSV_HEADERS = [
  'name',
  'address',
  'phone',
  'email',
  'website',
  'description',
  'contact_name'
] as const;

export const JOB_CSV_HEADERS = [
  'name',
  'company_name',
  'description',
  'location',
  'start_date',
  'end_date',
  'budget',
  'status',
  'notes'
] as const;

export const SHIFT_CSV_HEADERS = [
  'job_name',
  'company_name',
  'date',
  'start_time',
  'end_time',
  'location',
  'description',
  'notes',
  'requested_workers',
  'required_crew_chiefs',
  'required_stagehands',
  'required_fork_operators',
  'required_reach_fork_operators',
  'required_riggers',
  'required_general_laborers'
] as const;

export const ASSIGNMENT_CSV_HEADERS = [
  'shift_id',
  'employee_name',
  'employee_email',
  'role_code',
  'status'
] as const;

// Timesheet Template format (parsed from formatted timesheet)
export const TIMESHEET_TEMPLATE_CSV_HEADERS = [
  'client_name',
  'client_po',
  'hands_on_job_number',
  'location',
  'date_time',
  'employee_name',
  'employee_initials',
  'in_time',
  'out_time',
  'in_time_2',
  'out_time_2',
  'in_time_3',
  'out_time_3',
  'in_time_4',
  'out_time_4',
  'total_hours',
  'reg_hours',
  'ot_hours',
  'dt_hours',
  'ta'
] as const;

// Original comprehensive format (existing)
export const COMPREHENSIVE_CSV_HEADERS = [
  'client_name',
  'contact_name', 
  'contact_phone',
  'job_name',
  'job_start_date',
  'shift_date',
  'shift_start_time',
  'shift_end_time',
  'employee_name',
  'employee_email',
  'employee_phone',
  'worker_type',
  'clock_in_1',
  'clock_out_1',
  'clock_in_2',
  'clock_out_2',
  'clock_in_3',
  'clock_out_3'
] as const;

export type ImportType = 
  | 'comprehensive'
  | 'timesheet'
  | 'timesheet_template'
  | 'employees'
  | 'companies'
  | 'jobs'
  | 'shifts'
  | 'assignments';

export type TimesheetCSVRow = {
  [K in typeof TIMESHEET_CSV_HEADERS[number]]: string;
} & {
  _rowNumber: number;
  _errors: string[];
};

export type EmployeeCSVRow = {
  [K in typeof EMPLOYEE_CSV_HEADERS[number]]: string;
} & {
  _rowNumber: number;
  _errors: string[];
};

export type CompanyCSVRow = {
  [K in typeof COMPANY_CSV_HEADERS[number]]: string;
} & {
  _rowNumber: number;
  _errors: string[];
};

export type JobCSVRow = {
  [K in typeof JOB_CSV_HEADERS[number]]: string;
} & {
  _rowNumber: number;
  _errors: string[];
};

export type ShiftCSVRow = {
  [K in typeof SHIFT_CSV_HEADERS[number]]: string;
} & {
  _rowNumber: number;
  _errors: string[];
};

export type AssignmentCSVRow = {
  [K in typeof ASSIGNMENT_CSV_HEADERS[number]]: string;
} & {
  _rowNumber: number;
  _errors: string[];
};

export type TimesheetTemplateCSVRow = {
  [K in typeof TIMESHEET_TEMPLATE_CSV_HEADERS[number]]: string;
} & {
  _rowNumber: number;
  _errors: string[];
};

export type ComprehensiveCSVRow = {
  [K in typeof COMPREHENSIVE_CSV_HEADERS[number]]: string;
} & {
  _rowNumber: number;
  _errors: string[];
};

export type CSVRow = 
  | TimesheetCSVRow
  | TimesheetTemplateCSVRow
  | EmployeeCSVRow
  | CompanyCSVRow
  | JobCSVRow
  | ShiftCSVRow
  | AssignmentCSVRow
  | ComprehensiveCSVRow;

export const CSV_TEMPLATES = {
  comprehensive: {
    name: 'Comprehensive Import',
    description: 'Import companies, jobs, shifts, employees, and time entries all in one file',
    headers: COMPREHENSIVE_CSV_HEADERS,
    sampleData: [
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
      ]
    ]
  },
  timesheet: {
    name: 'Timesheet Import',
    description: 'Import time tracking data from traditional timesheet format',
    headers: TIMESHEET_CSV_HEADERS,
    sampleData: [
      [
        'Acme Construction',     // client_name
        'Downtown Office',       // location
        '2024-01-15',           // date_time
        'Jane Doe',             // employee_name
        '08:00',                // in_time
        '17:00',                // out_time
        '08:00',                // in_time_2
        '12:00',                // out_time_2
        '13:00',                // in_time_3
        '17:00',                // out_time_3
        '',                     // in_time_4
        '',                     // out_time_4
        '8.0',                  // total_hours
        '8.0',                  // reg_hours
        '0.0',                  // ot_hours
        '0.0',                  // dt_hours
        ''                      // ta
      ]
    ]
  },
  timesheet_template: {
    name: 'Timesheet Template',
    description: 'Import from formatted timesheet template (automatically parses structured format)',
    headers: TIMESHEET_TEMPLATE_CSV_HEADERS,
    sampleData: [
      [
        'Maktive',              // client_name
        'ClientPO23523525',     // client_po
        'HO43433',              // hands_on_job_number
        'Waterfront Park San Diego, CA 92122', // location
        '5/5/25 8:00 AM',       // date_time
        'Robert flores',        // employee_name
        'cc',                   // employee_initials
        '9:00 AM',              // in_time
        '12:00 PM',             // out_time
        '',                     // in_time_2
        '',                     // out_time_2
        '',                     // in_time_3
        '',                     // out_time_3
        '',                     // in_time_4
        '',                     // out_time_4
        '',                     // total_hours
        '',                     // reg_hours
        '',                     // ot_hours
        '',                     // dt_hours
        ''                      // ta
      ]
    ]
  },
  employees: {
    name: 'Employee Import',
    description: 'Import employee/user data only',
    headers: EMPLOYEE_CSV_HEADERS,
    sampleData: [
      [
        'Jane Doe',                    // name
        'jane.doe@email.com',         // email
        '555-0456',                   // phone
        'Staff',                      // role
        'Acme Construction',          // company_name
        'false',                      // crew_chief_eligible
        'false',                      // fork_operator_eligible
        'true',                       // OSHA_10_Certifications
        'true',                       // OSHA_10_Certifications
        'Safety Training,First Aid',   // certifications
        'Downtown Office'             // location
      ],
      [
        'Bob Wilson',                 // name
        'bob.wilson@email.com',       // email
        '555-0789',                   // phone
        'CrewChief',                  // role
        'Acme Construction',          // company_name
        'true',                       // crew_chief_eligible
        'true',                       // fork_operator_eligible
        'true',                       // OSHA_10_Certifications
        'true',                       // OSHA_10_Certifications
        'Forklift Certified,OSHA 30', // certifications
        'Warehouse District'          // location
      ]
    ]
  },
  companies: {
    name: 'Company Import',
    description: 'Import company/client data only',
    headers: COMPANY_CSV_HEADERS,
    sampleData: [
      [
        'Acme Construction',          // name
        '123 Main St, City, ST 12345', // address
        '555-0123',                   // phone
        'info@acme.com',             // email
        'www.acme.com',              // website
        'Construction and renovation services', // description
        'John Smith'                  // contact_name
      ]
    ]
  },
  jobs: {
    name: 'Job Import',
    description: 'Import job/project data only',
    headers: JOB_CSV_HEADERS,
    sampleData: [
      [
        'Downtown Office Building',   // name
        'Acme Construction',          // company_name
        'Office building renovation', // description
        '123 Business Ave',           // location
        '2024-01-15',                // start_date
        '2024-02-15',                // end_date
        '$50000',                    // budget
        'Active',                    // status
        'High priority project'       // notes
      ]
    ]
  },
  shifts: {
    name: 'Shift Import', 
    description: 'Import shift/schedule data only',
    headers: SHIFT_CSV_HEADERS,
    sampleData: [
      [
        'Downtown Office Building',   // job_name
        'Acme Construction',          // company_name
        '2024-01-20',                // date
        '08:00',                     // start_time
        '17:00',                     // end_time
        '123 Business Ave',           // location
        'Daily construction work',    // description
        'Bring safety equipment',     // notes
        '5',                         // requested_workers
        '1',                         // required_crew_chiefs
        '3',                         // required_stagehands
        '1',                         // required_fork_operators
        '0',                         // required_reach_fork_operators
        '0',                         // required_riggers
        '0'                          // required_general_laborers
      ]
    ]
  },
  assignments: {
    name: 'Assignment Import',
    description: 'Import worker assignments to shifts',
    headers: ASSIGNMENT_CSV_HEADERS,
    sampleData: [
      [
        'shift_123',                  // shift_id
        'Jane Doe',                   // employee_name
        'jane.doe@email.com',         // employee_email
        'WR',                         // role_code
        'Assigned'                    // status
      ]
    ]
  }
} as const;