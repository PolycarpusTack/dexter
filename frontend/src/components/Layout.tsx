import React, { useEffect } from 'react';
import { AppShell, Box } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Header } from './Header';
import KeyboardShortcutsGuide from './UI/KeyboardShortcutsGuide';
import { useGlobalShortcuts, globalShortcuts } from '../hooks/useGlobalShortcuts';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // Define application-specific shortcuts
  const appShortcuts = [
    ...globalShortcuts, // Use the predefined global shortcuts
    {
      key: 'g',
      ctrl: true,
      action: () => navigate('/'),
      description: 'Go to dashboard',
      scope: 'global',
      preventDefault: true
    },
    {
      key: 'i',
      ctrl: true,
      action: () => navigate('/issues'),
      description: 'Go to issues',
      scope: 'global',
      preventDefault: true
    },
    {
      key: 'e',
      ctrl: true,
      action: () => navigate('/events'),
      description: 'Go to events',
      scope: 'global',
      preventDefault: true
    },
    {
      key: 'd',
      ctrl: true,
      action: () => navigate('/discover'),
      description: 'Go to discover',
      scope: 'global',
      preventDefault: true
    },
    {
      key: 'r',
      ctrl: true,
      action: () => window.location.reload(),
      description: 'Refresh page',
      scope: 'global',
      preventDefault: true
    }
  ];
  
  // Initialize global shortcuts
  const shortcuts = useGlobalShortcuts(appShortcuts, [location.pathname]);
  
  // Set application-specific keyboard event listeners
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Close any open modals
        const closeButtons = document.querySelectorAll('[aria-label="Close modal"]');
        if (closeButtons.length > 0 && closeButtons[0] instanceof HTMLElement) {
          closeButtons[0].click();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);
  
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      <AppShell.Navbar>
        <Navbar />
      </AppShell.Navbar>
      <AppShell.Main>
        <Box>{children}</Box>
      </AppShell.Main>
      
      {/* Keyboard shortcuts guide (opened via ? key) */}
      <KeyboardShortcutsGuide isMac={isMac} />
    </AppShell>
  );
}
