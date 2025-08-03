import React, { useState } from 'react';
import { User } from '@/lib/types';
import { ChevronDown } from 'lucide-react';
import { Avatar } from './Avatar';

interface WorkerSelectorProps {
  users: User[];
  selectedUserId: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
  showQuestionMark?: boolean;
}

const WorkerSelector: React.FC<WorkerSelectorProps> = ({ users, selectedUserId, onChange, disabled, showQuestionMark }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedUser = users.find(u => u.id === selectedUserId);

  const handleSelect = (user: User | null) => {
    onChange(user ? user.id : null);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full flex items-center justify-between rounded-md border border-gray-600 bg-gray-900/50 px-3 py-2 text-left text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selectedUser ? (
          <span className="truncate">{selectedUser.name}</span>
        ) : (
          <div className="flex items-center">
            {showQuestionMark && <span className="mr-2 text-gray-400">?</span>}
            <span className="text-gray-400">-- Unassigned --</span>
          </div>
        )}
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 border border-gray-600">
          <ul className="max-h-60 overflow-auto rounded-md py-1 text-base focus:outline-none sm:text-sm">
            <li
              onClick={() => handleSelect(null)}
              className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-300 hover:bg-gray-700"
            >
              -- Unassigned --
            </li>
            {users.map(user => (
              <li
                key={user.id}
                onClick={() => handleSelect(user)}
                className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-white hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  <Avatar src={user.avatarUrl} name={user.name} className="w-6 h-6" />
                  <span className="truncate">{user.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default WorkerSelector;