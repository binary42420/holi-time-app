import React from 'react';
import { Users, Building2, CalendarDays, X, Calendar, Clock, Plus, Pencil, MoreHorizontal, Eye, Trash2, Briefcase, ArrowLeft, Copy, ClockIcon as LucideClockIcon, CheckCircle, LucideProps, Sparkles, Users as UsersGroup, FileText as DocumentText, Settings as Cog, Search } from 'lucide-react';

const createIcon = (IconComponent: React.FC<LucideProps>, defaultClassName: string) => {
  const Component: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <IconComponent {...props} className={`${defaultClassName} ${props.className || ''}`} />
  );
  Component.displayName = `Icon(${IconComponent.displayName || IconComponent.name})`;
  return Component;
};

export const UsersIcon = createIcon(Users, "h-5 w-5");
export const BuildingOfficeIcon = createIcon(Building2, "h-5 w-5");
export const CalendarDaysIcon = createIcon(CalendarDays, "h-5 w-5");
export const XIcon = createIcon(X, "h-6 w-6");
export const CalendarIcon = createIcon(Calendar, "h-5 w-5");
export const ClockIcon = createIcon(LucideClockIcon, "h-5 w-5");
export const PlusIcon = createIcon(Plus, "h-5 w-5");
export const PencilIcon = createIcon(Pencil, "h-4 w-4");
export const ClockInIcon = createIcon(LucideClockIcon, "h-4 w-4"); // Placeholder
export const ClockOutIcon = createIcon(LucideClockIcon, "h-4 w-4"); // Placeholder
export const CheckCircleIcon = createIcon(CheckCircle, "h-5 w-5");
export const SparklesIcon = createIcon(Sparkles, "h-5 w-5");
export const UsersGroupIcon = createIcon(UsersGroup, "h-5 w-5");
export const DocumentTextIcon = createIcon(DocumentText, "h-5 w-5");
export const CogIcon = createIcon(Cog, "h-5 w-5");
export const SearchIcon = createIcon(Search, "h-5 w-5");

// Existing icons for re-use
export const MoreHorizontalIcon = MoreHorizontal;
export const EyeIcon = Eye;
export const Trash2Icon = Trash2;
export const BriefcaseIcon = Briefcase;
export const ArrowLeftIcon = ArrowLeft;
export const CopyIcon = Copy;
export const Building2Icon = Building2;
