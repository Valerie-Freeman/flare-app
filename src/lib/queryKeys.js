export const queryKeys = {
  // Reference data (cacheable for longer periods)
  symptomCategories: {
    all: ['symptomCategories'],
    byParent: (parentId) => ['symptomCategories', 'byParent', parentId],
  },
  symptomTypes: {
    all: ['symptomTypes'],
    byCategory: (categoryId) => ['symptomTypes', 'byCategory', categoryId],
  },
  metricTypes: {
    all: ['metricTypes'],
  },
  metricCategories: {
    all: ['metricCategories'],
  },
  practiceCategories: {
    all: ['practiceCategories'],
  },
  bodyLocations: {
    all: ['bodyLocations'],
    byRegion: (region) => ['bodyLocations', 'byRegion', region],
  },

  // User data (filtered by RLS, shorter cache appropriate)
  symptomLogs: {
    list: (userId) => ['symptomLogs', 'list', userId],
  },
  practices: {
    active: (userId) => ['practices', 'active', userId],
  },
  medications: {
    active: (userId) => ['medications', 'active', userId],
  },
  practiceCompletions: {
    today: (userId, practiceId) => ['practiceCompletions', 'today', userId, practiceId],
  },
  medicationLogs: {
    today: (userId, medicationId) => ['medicationLogs', 'today', userId, medicationId],
  },
  metrics: {
    range: (userId, start, end) => ['metrics', 'range', userId, start, end],
  },
};
