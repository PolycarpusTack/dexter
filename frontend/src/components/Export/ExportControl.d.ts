import React from 'react';

export interface ExportControlProps {
  data: any[];
  filename: string;
  onExport?: (data: any[]) => void;
  disabled?: boolean;
  buttonProps?: any;
}

declare const ExportControl: React.FC<ExportControlProps>;

export default ExportControl;
