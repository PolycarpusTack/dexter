// Declaration file for JSX modules
declare module '*.jsx' {
  import React from 'react';
  const Component: React.ComponentType<any>;
  export default Component;
}

// Make the path to DashboardPage explicitly importable
declare module '../pages/DashboardPage' {
  import React from 'react';
  const DashboardPage: React.ComponentType<any>;
  export default DashboardPage;
}
