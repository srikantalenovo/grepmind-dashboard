import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <UserIcon className="h-8 w-8 text-primary-600 mr-3" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <p className="text-gray-500 dark:text-gray-400">
          User profile management functionality will be implemented here.
        </p>
      </div>
    </div>
  );
}

export default ProfilePage;