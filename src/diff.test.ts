import { spawnSync } from 'child_process';
import computeSignificantLines from './diff';

it('Empty diff has 0 lines of change.', () => expect(computeSignificantLines('')).toBe(0));

const testOnRepo = (commit1: string, commit2: string, expected: number): void => {
  it(`Can compute against real diffs ${commit1} <- ${commit2}.`, () => {
    const diffString = spawnSync('git', ['diff', commit1, commit2]).stdout.toString();
    expect(computeSignificantLines(diffString)).toBe(expected);
  });
};

testOnRepo(
  'ebdffbe230e3a98cc2383fe09c8fbb853e6784fd',
  '26af977281bb05191206e477ddb4fbf80d9e750b',
  8
);

testOnRepo(
  '26af977281bb05191206e477ddb4fbf80d9e750b',
  '557ae1bac01009919feaf615489d14c3a818c8db',
  26
);
