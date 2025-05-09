import { createStyles } from '@mantine/styles';

/**
 * Styles hook for EventRow component
 * 
 * Handles all styling for the event row with proper theming support
 */
export const useRowStyles = createStyles((theme) => ({
  row: {
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' 
        ? theme.colors.dark[6] 
        : theme.colors.gray[0],
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.colors.blue[5]}`,
    }
  },
  selected: {
    backgroundColor: theme.colorScheme === 'dark' 
      ? theme.colors.blue[9] + '!important' 
      : theme.colors.blue[0] + '!important',
  },
  active: {
    backgroundColor: theme.colorScheme === 'dark' 
      ? theme.colors.dark[5] 
      : theme.colors.gray[1],
  },
  checkbox: {
    cursor: 'pointer',
    '&:disabled': {
      backgroundColor: 'transparent'
    }
  },
  checkboxCell: {
    width: 40,
    paddingRight: 0
  },
  titleCell: {
    minWidth: 200,
    maxWidth: '40%'
  },
  title: {
    maxWidth: 200,
  },
  impactCell: {
    width: 150
  },
  sparklineCell: {
    width: 120
  },
  dateCell: {
    width: 160
  },
  actionsCell: {
    width: 100
  },
  infoIcon: {
    color: theme.colorScheme === 'dark' 
      ? theme.colors.gray[6] 
      : theme.colors.gray[5],
    '&:hover': {
      color: theme.colors.blue[5]
    }
  },
  actionIcon: {
    '&:hover': {
      backgroundColor: 'transparent',
      color: theme.colors.blue[5]
    }
  }
}));

export default useRowStyles;