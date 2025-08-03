"use client"

import React from 'react';
import { 
  BriefcaseIcon, 
  CalendarDaysIcon, 
  UsersGroupIcon, 
  BuildingOfficeIcon, 
  ClockIcon, 
  DocumentTextIcon, 
  SparklesIcon 
} from './IconComponents';

export type TabName = 'jobs' | 'shifts' | 'users' | 'companies' | 'timesheets' | 'import-export' | 'docs';

interface TabButtonProps {
  tabName: TabName;
  icon: React.ReactNode;
  children: React.ReactNode;
  activeTab: TabName;
  onClick: (tabName: TabName) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tabName, icon, children, activeTab, onClick }) => (
  <button
    onClick={() => onClick(tabName)}
    className={`sample-tab-button ${
      activeTab === tabName
        ? 'sample-tab-active'
        : 'sample-tab-inactive'
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{children}</span>
  </button>
);

interface TabNavigationProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  availableTabs?: TabName[];
}

const TabNavigation: React.FC<TabNavigationProps> = ({ 
  activeTab, 
  onTabChange,
  availableTabs = ['jobs', 'shifts', 'users', 'companies', 'timesheets', 'import-export', 'docs']
}) => {
  const tabConfig = {
    jobs: { icon: <BriefcaseIcon className="h-5 w-5" />, label: 'Jobs' },
    shifts: { icon: <CalendarDaysIcon className="h-5 w-5" />, label: 'Shifts' },
    users: { icon: <UsersGroupIcon className="h-5 w-5" />, label: 'Users' },
    companies: { icon: <BuildingOfficeIcon className="h-5 w-5" />, label: 'Companies' },
    timesheets: { icon: <ClockIcon className="h-5 w-5" />, label: 'Timesheets' },
    'import-export': { icon: <DocumentTextIcon className="h-5 w-5" />, label: 'Import/Export' },
    docs: { icon: <SparklesIcon className="h-5 w-5" />, label: 'Docs' },
  };

  return (
    <div className="border-b border-gray-700">
      <nav className="-mb-px flex flex-wrap" aria-label="Tabs">
        {availableTabs.map((tabName) => {
          const config = tabConfig[tabName];
          if (!config) return null;
          
          return (
            <TabButton
              key={tabName}
              tabName={tabName}
              icon={config.icon}
              activeTab={activeTab}
              onClick={onTabChange}
            >
              {config.label}
            </TabButton>
          );
        })}
      </nav>
    </div>
  );
};

export default TabNavigation;
