/**
 * ModelSelector Component
 * 
 * This is a wrapper around the UnifiedModelSelector for backward compatibility.
 */

import React from 'react';
import { UnifiedModelSelector } from './UnifiedModelSelector';

interface ModelSelectorProps {
  compact?: boolean;
  onModelChange?: (modelName: string) => void;
  showStatus?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = (props) => {
  return <UnifiedModelSelector {...props} />;
};

export default ModelSelector;