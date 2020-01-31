import computeSignificantLines from './diff';

it('Empty diff has 0 lines of change.', () => expect(computeSignificantLines('')).toBe(0));
