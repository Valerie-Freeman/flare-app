import { queryKeys } from '../../src/lib/queryKeys';

describe('queryKeys', () => {
  describe('reference data keys', () => {
    it('symptomCategories.all returns correct key', () => {
      expect(queryKeys.symptomCategories.all).toEqual(['symptomCategories']);
    });

    it('symptomCategories.byParent returns parameterized key', () => {
      const parentId = 'abc-123';
      expect(queryKeys.symptomCategories.byParent(parentId)).toEqual([
        'symptomCategories', 'byParent', 'abc-123',
      ]);
    });

    it('symptomTypes.all returns correct key', () => {
      expect(queryKeys.symptomTypes.all).toEqual(['symptomTypes']);
    });

    it('symptomTypes.byCategory returns parameterized key', () => {
      const categoryId = 'cat-456';
      expect(queryKeys.symptomTypes.byCategory(categoryId)).toEqual([
        'symptomTypes', 'byCategory', 'cat-456',
      ]);
    });

    it('metricTypes.all returns correct key', () => {
      expect(queryKeys.metricTypes.all).toEqual(['metricTypes']);
    });

    it('metricCategories.all returns correct key', () => {
      expect(queryKeys.metricCategories.all).toEqual(['metricCategories']);
    });

    it('practiceCategories.all returns correct key', () => {
      expect(queryKeys.practiceCategories.all).toEqual(['practiceCategories']);
    });

    it('bodyLocations.all returns correct key', () => {
      expect(queryKeys.bodyLocations.all).toEqual(['bodyLocations']);
    });

    it('bodyLocations.byRegion returns parameterized key', () => {
      expect(queryKeys.bodyLocations.byRegion('Head/Face')).toEqual([
        'bodyLocations', 'byRegion', 'Head/Face',
      ]);
    });
  });

  describe('user data keys', () => {
    it('symptomLogs.list returns parameterized key', () => {
      const userId = 'user-1';
      expect(queryKeys.symptomLogs.list(userId)).toEqual([
        'symptomLogs', 'list', 'user-1',
      ]);
    });

    it('practices.active returns parameterized key', () => {
      expect(queryKeys.practices.active('user-1')).toEqual([
        'practices', 'active', 'user-1',
      ]);
    });

    it('medications.active returns parameterized key', () => {
      expect(queryKeys.medications.active('user-1')).toEqual([
        'medications', 'active', 'user-1',
      ]);
    });

    it('practiceCompletions.today returns parameterized key', () => {
      expect(queryKeys.practiceCompletions.today('user-1', 'practice-1')).toEqual([
        'practiceCompletions', 'today', 'user-1', 'practice-1',
      ]);
    });

    it('medicationLogs.today returns parameterized key', () => {
      expect(queryKeys.medicationLogs.today('user-1', 'med-1')).toEqual([
        'medicationLogs', 'today', 'user-1', 'med-1',
      ]);
    });

    it('metrics.range returns parameterized key', () => {
      const start = '2026-01-01';
      const end = '2026-01-31';
      expect(queryKeys.metrics.range('user-1', start, end)).toEqual([
        'metrics', 'range', 'user-1', '2026-01-01', '2026-01-31',
      ]);
    });
  });

  describe('all entity types have keys', () => {
    const expectedEntities = [
      'symptomCategories', 'symptomTypes', 'metricTypes', 'metricCategories',
      'practiceCategories', 'bodyLocations', 'symptomLogs', 'practices',
      'medications', 'practiceCompletions', 'medicationLogs', 'metrics',
    ];

    expectedEntities.forEach((entity) => {
      it(`has keys for ${entity}`, () => {
        expect(queryKeys[entity]).toBeDefined();
      });
    });
  });

  describe('key structure', () => {
    it('all static keys are arrays', () => {
      expect(Array.isArray(queryKeys.symptomCategories.all)).toBe(true);
      expect(Array.isArray(queryKeys.metricTypes.all)).toBe(true);
      expect(Array.isArray(queryKeys.bodyLocations.all)).toBe(true);
    });

    it('all parameterized keys return arrays', () => {
      expect(Array.isArray(queryKeys.symptomCategories.byParent('id'))).toBe(true);
      expect(Array.isArray(queryKeys.symptomLogs.list('id'))).toBe(true);
      expect(Array.isArray(queryKeys.metrics.range('id', 'start', 'end'))).toBe(true);
    });
  });
});
