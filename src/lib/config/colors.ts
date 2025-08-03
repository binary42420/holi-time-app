import { WorkerRole } from '@/lib/types';

export const roleColors: Record<WorkerRole, string> = {
  CC: 'indigo',
  SH: 'cyan',
  FO: 'purple',
  RFO: 'pink',
  RG: 'teal',
  GL: 'gray',
  default: 'gray',
};

export const roleTextColor: Record<WorkerRole, string> = {
  CC: 'text-white',
  SH: 'text-white',
  FO: 'text-white',
  RFO: 'text-white',
  RG: 'text-white',
  GL: 'text-white',
  default: 'text-white',
};