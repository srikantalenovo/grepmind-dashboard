import React from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';

function Header({ onMenuClick }) {
  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow">
      <button
        type="button"
        className="px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>
      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1 flex">
          <div className="w-full flex lg:ml-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              GrepMind Dashboard
            </h1>
          </div>
        </div>
        <div className="ml-4 flex items-center lg:ml-6">
          {/* User menu and other header items can be added here */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Kubernetes Monitoring
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;