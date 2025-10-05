import React, { useState, useEffect } from 'react';
import { resourcesApi } from '../services/api';

const NamespaceSelector = ({ value, onChange, includeAllOption = false }) => {
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
          if (includeAllOption) {
            onChange('all');
          } else {
            const defaultNs = data.find(ns => ns.name === 'default') || data[0];
            onChange(defaultNs.name);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNamespaces();
  }, [includeAllOption]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-secondary-400">Namespace:</label>
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-secondary-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-secondary-400">Namespace:</label>
        <div className="text-sm text-error-400">Error loading namespaces</div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium text-secondary-400">Namespace:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      >
        {includeAllOption && (
          <option value="all">📁 All Namespaces</option>
        )}
        {namespaces.map((namespace) => (
          <option 
            key={namespace.name} 
            value={namespace.name}
          >
            📁 {namespace.name}
            {namespace.status && namespace.status !== 'Active' && (
              <span> ({namespace.status})</span>
            )}
          </option>
        ))}
      </select>
    </div>
  );
};

export default NamespaceSelector;

