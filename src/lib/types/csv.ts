export const CSV_HEADERS = [
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

export type CSVRow = {
  [K in typeof CSV_HEADERS[number]]: string;
} & {
  _rowNumber: number;
  _errors: string[];
};