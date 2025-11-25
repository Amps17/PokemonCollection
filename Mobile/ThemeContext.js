import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const lightTheme = {
  primary: '#667eea',
  primaryDark: '#5568d3',
  secondary: '#764ba2',
  background: '#f8f9fa',
  backgroundAlt: '#ffffff',
  text: '#333',
  textSecondary: '#666',
  textTertiary: '#999',
  border: '#e0e0e0',
  cardBg: '#ffffff',
  success: '#4caf50',
  successBg: '#f1f8f4',
  error: '#f44336',
  shadow: 'rgba(0,0,0,0.2)',
};

export const darkTheme = {
  primary: '#7c8aff',
  primaryDark: '#6b7aee',
  secondary: '#9d6bc9',
  background: '#1a1a2e',
  backgroundAlt: '#16213e',
  text: '#e0e0e0',
  textSecondary: '#b0b0b0',
  textTertiary: '#808080',
  border: '#2d2d44',
  cardBg: '#252541',
  success: '#66bb6a',
  successBg: '#1e3a1f',
  error: '#ef5350',
  shadow: 'rgba(0,0,0,0.5)',
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};