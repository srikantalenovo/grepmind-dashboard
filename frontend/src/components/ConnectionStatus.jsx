import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function ConnectionStatus() {
  return (
    <div className="bg-red-50 dark:bg-red-900/50 border-l-4 border-red-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700 dark:text-red-200">
            Connection to server lost. Attempting to reconnect...
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConnectionStatus;