/**
 * Utility functions for ARIA attributes and accessibility
 */

/**
 * ARIA role values
 */
export type AriaRole =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'cell'
  | 'checkbox'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'feed'
  | 'figure'
  | 'form'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem';

/**
 * ARIA live region politeness values
 */
export type AriaLive = 'off' | 'polite' | 'assertive';

/**
 * Create ARIA props for a button that controls a tab panel
 */
export function getTabProps(
  id: string,
  panelId: string,
  isSelected: boolean
): Record<string, unknown> {
  return {
    role: 'tab',
    id: `tab-${id}`,
    'aria-controls': `panel-${panelId}`,
    'aria-selected': isSelected,
    tabIndex: isSelected ? 0 : -1,
  };
}

/**
 * Create ARIA props for a tab panel
 */
export function getTabPanelProps(
  id: string,
  tabId: string
): Record<string, unknown> {
  return {
    role: 'tabpanel',
    id: `panel-${id}`,
    'aria-labelledby': `tab-${tabId}`,
    tabIndex: 0,
  };
}

/**
 * Create ARIA props for a modal dialog
 */
export function getDialogProps(
  id: string,
  titleId: string,
  descriptionId?: string
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
  };

  if (descriptionId) {
    props['aria-describedby'] = descriptionId;
  }

  return props;
}

/**
 * Create ARIA props for a tooltip
 */
export function getTooltipProps(
  id: string,
  triggerId: string
): Record<string, unknown> {
  return {
    role: 'tooltip',
    id: `tooltip-${id}`,
    'aria-hidden': true,
  };
}

/**
 * Create ARIA props for an element that triggers a tooltip
 */
export function getTooltipTriggerProps(
  tooltipId: string
): Record<string, unknown> {
  return {
    'aria-describedby': `tooltip-${tooltipId}`,
  };
}

/**
 * Create ARIA props for a menu
 */
export function getMenuProps(
  id: string,
  triggerId: string
): Record<string, unknown> {
  return {
    role: 'menu',
    id: `menu-${id}`,
    'aria-labelledby': triggerId,
  };
}

/**
 * Create ARIA props for a menu item
 */
export function getMenuItemProps(
  index: number
): Record<string, unknown> {
  return {
    role: 'menuitem',
    tabIndex: -1,
  };
}

/**
 * Create ARIA props for a button that opens a menu
 */
export function getMenuButtonProps(
  menuId: string,
  isOpen: boolean
): Record<string, unknown> {
  return {
    'aria-haspopup': 'true',
    'aria-expanded': isOpen,
    'aria-controls': `menu-${menuId}`,
  };
}

/**
 * Create ARIA props for an alert
 */
export function getAlertProps(): Record<string, unknown> {
  return {
    role: 'alert',
    'aria-live': 'assertive',
    'aria-atomic': true,
  };
}

/**
 * Create ARIA props for a status message
 */
export function getStatusProps(): Record<string, unknown> {
  return {
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': true,
  };
}

/**
 * Create ARIA props for a group that contains a set of controls
 */
export function getGroupProps(
  label: string,
  labelledBy?: string
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    role: 'group',
  };

  if (labelledBy) {
    props['aria-labelledby'] = labelledBy;
  } else {
    props['aria-label'] = label;
  }

  return props;
}

/**
 * Create ARIA props for a live region that updates with application statuses
 */
export function getLiveRegionProps(
  politeness: AriaLive = 'polite'
): Record<string, unknown> {
  return {
    'aria-live': politeness,
    'aria-atomic': true,
    'aria-relevant': 'additions text',
  };
}

/**
 * Create ARIA props for a checkbox
 */
export function getCheckboxProps(
  checked: boolean,
  indeterminate?: boolean
): Record<string, unknown> {
  return {
    role: 'checkbox',
    'aria-checked': indeterminate ? 'mixed' : checked,
  };
}

/**
 * Create ARIA props for a collapsible section
 */
export function getDisclosureProps(
  expanded: boolean,
  controlsId: string
): Record<string, unknown> {
  return {
    'aria-expanded': expanded,
    'aria-controls': controlsId,
  };
}

/**
 * Create ARIA props for a section controlled by a disclosure button
 */
export function getDisclosurePanelProps(
  triggerId: string
): Record<string, unknown> {
  return {
    id: triggerId,
    role: 'region',
    'aria-labelledby': triggerId,
  };
}

/**
 * Create ARIA props for a slider
 */
export function getSliderProps(
  value: number,
  min: number,
  max: number,
  label: string,
  labelledBy?: string
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    role: 'slider',
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': value,
  };

  if (labelledBy) {
    props['aria-labelledby'] = labelledBy;
  } else {
    props['aria-label'] = label;
  }

  return props;
}

/**
 * Create ARIA props for a progress indicator
 */
export function getProgressProps(
  value: number,
  max: number = 100,
  label?: string,
  labelledBy?: string
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    role: 'progressbar',
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-valuenow': value,
  };

  if (labelledBy) {
    props['aria-labelledby'] = labelledBy;
  } else if (label) {
    props['aria-label'] = label;
  }

  return props;
}

/**
 * Create ARIA props for a button that controls a sorting action
 */
export function getSortButtonProps(
  column: string,
  direction: 'asc' | 'desc' | null
): Record<string, unknown> {
  return {
    'aria-sort': direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none',
    'aria-label': `Sort by ${column} ${direction === 'asc' ? 'descending' : 'ascending'}`,
  };
}

/**
 * Create visually hidden text style object for screen reader accessible content
 */
export const visuallyHiddenStyle = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute' as const,
  width: '1px',
  whiteSpace: 'nowrap' as const,
  wordWrap: 'normal' as const
};

export default {
  getTabProps,
  getTabPanelProps,
  getDialogProps,
  getTooltipProps,
  getTooltipTriggerProps,
  getMenuProps,
  getMenuItemProps,
  getMenuButtonProps,
  getAlertProps,
  getStatusProps,
  getGroupProps,
  getLiveRegionProps,
  getCheckboxProps,
  getDisclosureProps,
  getDisclosurePanelProps,
  getSliderProps,
  getProgressProps,
  getSortButtonProps,
  visuallyHiddenStyle,
};