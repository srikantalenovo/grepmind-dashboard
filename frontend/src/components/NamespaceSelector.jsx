import React, { useState, useEffect } from 'react';
import { resourcesApi } from '../services/api';

const NamespaceSelector = ({ value, onChange }) => {
  const [namespaces, setNamespaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        setLoading(true);
        const data = await resourcesApi.getNamespaces();
        setNamespaces(data);
        
        // Set default namespace if none selected
        if (!value && data.length > 0) {
          const defaultNs = data.find(ns => ns.name === 'default') || data[0];
          onChange(defaultNs.name);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNamespaces();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Namespace:</label>
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Namespace:</label>
        <div className="text-sm text-red-600">Error loading namespaces</div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium text-gray-700">Namespace:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        {namespaces.map((namespace) => (
          <option key={namespace.name} value={namespace.name}>
            📁 {namespace.name}
            {namespace.status && namespace.status !== 'Active' && (
              <span className="text-gray-500"> ({namespace.status})</span>
            )}
          </option>
        ))}
      </select>
    </div>
  );
};

export default NamespaceSelector;
