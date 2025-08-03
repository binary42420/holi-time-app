import React from 'react';
import { Company } from '@/lib/types';
import { Building2, MoreHorizontal, Edit, Trash2, Eye, Briefcase } from "lucide-react";
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';

import { CompanyWithJobs } from '@/lib/types';

interface CompanyCardProps {
  company: Company | CompanyWithJobs;
  onView: (company: Company | CompanyWithJobs) => void;
  onEdit: (company: Company | CompanyWithJobs) => void;
  onDelete: (company: Company | CompanyWithJobs) => void;
}

const getStatusClasses = (status: string | undefined) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-500 text-green-50 ring-1 ring-inset ring-green-600/20';
    case 'INACTIVE':
      return 'bg-gray-500 text-gray-100 ring-1 ring-inset ring-gray-500/20';
    case 'PENDING_VERIFICATION':
      return 'bg-yellow-500 text-yellow-900 ring-1 ring-inset ring-yellow-600/20';
    case 'UNKNOWN':
      return 'bg-red-500 text-red-50 ring-1 ring-inset ring-red-600/20';
    case undefined:
    case null:
      return 'bg-green-500 text-green-50 ring-1 ring-inset ring-green-600/20'; // Default to ACTIVE
    default:
      return 'bg-gray-600 text-white ring-1 ring-inset ring-gray-500/20';
  }
};

const CompanyCard: React.FC<CompanyCardProps> = ({ company, onView, onEdit, onDelete }) => {
  return (
    <div 
      className="group bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-indigo-500/20 hover:ring-2 hover:ring-indigo-500"
    >
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex justify-between items-start">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2 leading-tight pr-2">
            {company.name}
          </h2>
          <span className={`flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-full ${getStatusClasses(company.status)}`}>
            {company.status ? company.status.replace('_', ' ') : 'ACTIVE'}
          </span>
        </div>
        
        {company.industry && (
          <div className="flex items-center text-gray-400 mt-2 mb-4 transition-colors group-hover:text-gray-200">
            <Building2 className="h-4 w-4" />
            <span className="ml-2 text-sm">{company.industry}</span>
          </div>
        )}

        <div className="text-gray-300 text-sm mb-4">
          <p className="line-clamp-2">{company.description || 'No description provided'}</p>
        </div>

        {'jobs' in company && (
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4" />
              <span>{company.jobs?.length || 0} Jobs</span>
              <span>•</span>
              <span>
                {company.jobs?.reduce((sum, job) => sum + (job.shifts?.length || 0), 0) || 0} Shifts
              </span>
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-gray-700 flex justify-between items-center gap-2">
          <Button 
            variant="outline" 
            className="text-xs p-1.5 h-auto" 
            onClick={() => onView(company)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(company)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={() => onDelete(company)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default CompanyCard;
