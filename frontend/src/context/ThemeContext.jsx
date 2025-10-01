import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Theme context
const ThemeContext = createContext();

// Theme actions
const THEME_ACTIONS = {
  TOGGLE_THEME: 'TOGGLE_THEME',
  SET_THEME: 'SET_THEME',
  SET_SYSTEM_THEME: 'SET_SYSTEM_THEME'
};

// Initial state
const initialState = {
  isDark: false,
  theme: 'light', // 'light', 'dark', 'system'
  systemTheme: 'light'
};

// Theme reducer
function themeReducer(state, action) {
  switch (action.type) {
    case THEME_ACTIONS.TOGGLE_THEME:
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      return {
        ...state,
        theme: newTheme,
        isDark: newTheme === 'dark'
      };
      
    case THEME_ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload,
        isDark: action.payload === 'dark' || (action.payload === 'system' && state.systemTheme === 'dark')
      };
      
    case THEME_ACTIONS.SET_SYSTEM_THEME:
      return {
        ...state,
        systemTheme: action.payload,
        isDark: state.theme === 'dark' || (state.theme === 'system' && action.payload === 'dark')
      };
      
    default:
      return state;
  }
}

// Theme provider component
export function ThemeProvider({ children }) {
  const [state, dispatch] = useReducer(themeReducer, initialState);
  
  // Initialize theme from localStorage and system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    dispatch({
      type: THEME_ACTIONS.SET_SYSTEM_THEME,
      payload: systemTheme
    });
    
    if (savedTheme) {
      dispatch({
        type: THEME_ACTIONS.SET_THEME,
        payload: savedTheme
      });
    } else {
      // Default to system theme
      dispatch({
        type: THEME_ACTIONS.SET_THEME,
        payload: 'system'
      });
    }
  }, []);
  
  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      dispatch({
        type: THEME_ACTIONS.SET_SYSTEM_THEME,
        payload: e.matches ? 'dark' : 'light'
      });
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);
  
  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('theme', state.theme);
  }, [state.theme]);
  
  // Theme actions
  const toggleTheme = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_THEME });
  };
  
  const setTheme = (theme) => {
    dispatch({
      type: THEME_ACTIONS.SET_THEME,
      payload: theme
    });
  };
  
  const value = {
    ...state,
    toggleTheme,
    setTheme
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}