// This is a fix for JSX runtime in TypeScript files
// It ensures that React and JSX are correctly imported in the TypeScript files

import * as React from 'react';
import * as _jsx_runtime from 'react/jsx-runtime';

// This makes React available in the global scope
(window as any).React = React;

// Export JSX runtime for TypeScript files that use JSX
export const jsx = _jsx_runtime.jsx;
export const jsxs = _jsx_runtime.jsxs;
export const Fragment = _jsx_runtime.Fragment;

export default React;