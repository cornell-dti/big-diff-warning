import { spawnSync } from 'child_process';
import computeSignificantLines, { mergeDiffStatistics, reduceMergedLines } from './diff';

it('mergeDiffStatistics with empty input works.', () => {
  const result = mergeDiffStatistics([]);
  const addStatistics = Array.from(result.addStatistics.entries());
  const deleteStatistics = Array.from(result.deleteStatistics.entries());
  expect(addStatistics).toEqual([]);
  expect(deleteStatistics).toEqual([]);
});

it('mergeDiffStatistics with dummy list works.', () => {
  const result = mergeDiffStatistics([
    { oldFileName: '', newFileName: '', addStatistics: new Map(), deleteStatistics: new Map() },
    { oldFileName: '', newFileName: '', addStatistics: new Map(), deleteStatistics: new Map() },
    { oldFileName: '', newFileName: '', addStatistics: new Map(), deleteStatistics: new Map() },
    { oldFileName: '', newFileName: '', addStatistics: new Map(), deleteStatistics: new Map() },
  ]);
  const addStatistics = Array.from(result.addStatistics.entries());
  const deleteStatistics = Array.from(result.deleteStatistics.entries());
  expect(addStatistics).toEqual([]);
  expect(deleteStatistics).toEqual([]);
});

it('mergeDiffStatistics with singleton input works.', () => {
  const result = mergeDiffStatistics([
    {
      oldFileName: '',
      newFileName: '',
      addStatistics: new Map([
        ['a', 3],
        ['b', 4],
      ]),
      deleteStatistics: new Map([
        ['e', 4],
        ['f', 5],
      ]),
    },
  ]);
  const addStatistics = Array.from(result.addStatistics.entries());
  const deleteStatistics = Array.from(result.deleteStatistics.entries());
  expect(addStatistics).toEqual([
    ['a', 3],
    ['b', 4],
  ]);
  expect(deleteStatistics).toEqual([
    ['e', 4],
    ['f', 5],
  ]);
});

it('mergeDiffStatistics with simple input works.', () => {
  const result = mergeDiffStatistics([
    {
      oldFileName: '',
      newFileName: '',
      addStatistics: new Map([
        ['a', 3],
        ['b', 4],
      ]),
      deleteStatistics: new Map([
        ['e', 4],
        ['f', 5],
      ]),
    },
    {
      oldFileName: '',
      newFileName: '',
      addStatistics: new Map([
        ['a', 4],
        ['b', 5],
        ['c', 4],
      ]),
      deleteStatistics: new Map([
        ['g', 7],
        ['f', 5],
      ]),
    },
  ]);
  const addStatistics = Array.from(result.addStatistics.entries());
  const deleteStatistics = Array.from(result.deleteStatistics.entries());
  expect(addStatistics).toEqual([
    ['a', 7],
    ['b', 9],
    ['c', 4],
  ]);
  expect(deleteStatistics).toEqual([
    ['e', 4],
    ['f', 10],
    ['g', 7],
  ]);
});

it('reduceMergedLines works', () => {
  const result = reduceMergedLines({
    addStatistics: new Map([
      ['a', 3],
      ['b', 3],
      ['c', 3],
      ['d', 5],
    ]),
    deleteStatistics: new Map([
      ['a', 3],
      ['b', 2],
      ['c', 4],
      ['e', 6],
    ]),
  });
  const addStatistics = Array.from(result.addStatistics.entries());
  const deleteStatistics = Array.from(result.deleteStatistics.entries());
  expect(addStatistics).toEqual([
    ['b', 1],
    ['d', 5],
  ]);
  expect(deleteStatistics).toEqual([
    ['c', 1],
    ['e', 6],
  ]);
});

it('Empty diff has 0 lines of change.', () => expect(computeSignificantLines('')).toBe(0));

const testOnRepo = (commit1: string, commit2: string, expected: number): void => {
  it(`Can compute against real diffs ${commit1} -> ${commit2}.`, () => {
    const diffString = spawnSync('git', ['diff', commit1, commit2]).stdout.toString();
    expect(computeSignificantLines(diffString)).toBe(expected);
  });
};

testOnRepo(
  'caacb1aeb2be692fe8803ac91ca7c04493830fcd',
  '79fc97d7a9dd644914e3942170b8fd5a4d7f27fb',
  11
);

testOnRepo(
  'ebdffbe230e3a98cc2383fe09c8fbb853e6784fd',
  'caacb1aeb2be692fe8803ac91ca7c04493830fcd',
  22
);

testOnRepo(
  '26af977281bb05191206e477ddb4fbf80d9e750b',
  'ebdffbe230e3a98cc2383fe09c8fbb853e6784fd',
  8
);

testOnRepo(
  '557ae1bac01009919feaf615489d14c3a818c8db',
  '26af977281bb05191206e477ddb4fbf80d9e750b',
  17
);
