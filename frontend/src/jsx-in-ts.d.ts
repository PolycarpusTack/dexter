// This declaration file allows JSX syntax in .ts files
// It essentially makes TypeScript treat .ts files like .tsx files for JSX parsing

import React from 'react';

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> { }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};