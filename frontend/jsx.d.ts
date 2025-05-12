// Global declaration for JSX files
declare module "*.jsx" {
  import * as React from "react";
  const ReactComponent: React.ComponentType<any>;
  export default ReactComponent;
}
