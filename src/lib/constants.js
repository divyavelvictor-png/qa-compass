export const PRIORITIES    = ['High', 'Medium', 'Low'];
export const TC_TYPES      = ['UI', 'Functional', 'Accessibility'];
export const EXEC_STATUSES = ['Pass', 'Fail', 'Rerun - Pass', 'Rerun - Fail'];
export const PER_PAGE      = 50;

export const STATUS_ROW = {
  Pass:           'bg-green-50',
  Fail:           'bg-red-50',
  'Rerun - Pass': 'bg-amber-50',
  'Rerun - Fail': 'bg-red-50',
};

export const STATUS_BADGE = {
  Pass:           'bg-green-100 text-green-800',
  Fail:           'bg-red-100 text-red-800',
  'Rerun - Pass': 'bg-amber-100 text-amber-800',
  'Rerun - Fail': 'bg-red-100 text-red-800',
};

export const PRIORITY_BADGE = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low:    'bg-blue-100 text-blue-700',
};

export const CHART_COLORS = {
  Pass:           '#16a34a',
  Fail:           '#dc2626',
  'Rerun - Pass': '#d97706',
  'Rerun - Fail': '#b91c1c',
  UI:             '#6366f1',
  Functional:     '#0ea5e9',
  Accessibility:  '#8b5cf6',
  High:           '#ef4444',
  Medium:         '#f59e0b',
  Low:            '#22c55e',
};

export const FALLBACK_CLR = ['#6366f1', '#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e', '#f43f5e'];
