// React import required for JSX
import React from 'react';
import { Stack, NavLink } from '@mantine/core';
import { IconDashboard, IconBug, IconBell, IconSearch } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { label: 'Dashboard', icon: IconDashboard, path: '/' },
    { label: 'Issues', icon: IconBug, path: '/issues' },
    { label: 'Discover', icon: IconSearch, path: '/discover' },
    { label: 'Alert Rules', icon: IconBell, path: '/alert-rules' },
  ];

  return (
    <Stack gap={0}>
      {links.map((link) => (
        <NavLink
          key={link.path}
          label={link.label}
          leftSection={<link.icon size={20} />}
          onClick={() => navigate(link.path)}
          active={location.pathname === link.path}
        />
      ))}
    </Stack>
  );
}
