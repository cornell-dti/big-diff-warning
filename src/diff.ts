import * as Diff from 'diff';

const ignores: readonly string[] = [
  'yarn.lock',
  'package.json',
  'package-lock.json',
  'pubspec.lock',
  'Podfile',
  'Podfile.lock',
  'build.gradle',
  'Pods/',
  '.snap',
  'tsconfig.json',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc',
  '.gitignore',
];

const shouldBeIgnored = (path: string): boolean =>
  ignores.find((ignore) => path.includes(ignore)) != null;

const shouldDiffBeIgnored = ({ oldFileName, newFileName }: Diff.ParsedDiff): boolean =>
  (oldFileName != null && shouldBeIgnored(oldFileName)) ||
  (newFileName != null && shouldBeIgnored(newFileName));

type ChangeStatistics = {
  readonly oldFileName: string;
  readonly newFileName: string;
  readonly addStatistics: Map<string, number>;
  readonly deleteStatistics: Map<string, number>;
};

const getDiffStatistics = ({
  oldFileName: oldFilenameOptional,
  newFileName: newFilenameOptional,
  hunks,
}: Diff.ParsedDiff): ChangeStatistics => {
  const oldFileName = oldFilenameOptional ?? '/dev/null';
  const newFileName = newFilenameOptional ?? '/dev/null';
  const addStatistics = new Map<string, number>();
  const deleteStatistics = new Map<string, number>();

  if (newFileName === '/dev/null') {
    console.log(`Detected deleted file: ${oldFileName} => ${newFileName}`);
    // Ignore diff that deletes an entire file.
    return { oldFileName, newFileName, addStatistics, deleteStatistics };
  }

  const lines = hunks.flatMap((hunk) => hunk.lines);
  const addedLines: string[] = [];
  const deletedLines: string[] = [];
  lines.forEach((line) => {
    switch (line[0]) {
      case '+':
        addedLines.push(line.substring(1).trim().replace(/\s/g, ''));
        break;
      case '-':
        deletedLines.push(line.substring(1).trim().replace(/\s/g, ''));
        break;
      default:
        break;
    }
  });
  addedLines.forEach((line) => {
    addStatistics.set(line, (addStatistics.get(line) ?? 0) + 1);
  });
  deletedLines.forEach((line) => {
    deleteStatistics.set(line, (deleteStatistics.get(line) ?? 0) + 1);
  });
  const { added, deleted } = countLines({
    addStatistics,
    deleteStatistics,
  });
  console.log(
    `Changed file (${oldFileName} => ${newFileName}): added: ${added}, deleted: ${deleted}`
  );
  return { oldFileName, newFileName, addStatistics, deleteStatistics };
};

type MergedChangeStatistics = {
  readonly addStatistics: Map<string, number>;
  readonly deleteStatistics: Map<string, number>;
};

// Exposed for testing.
export const mergeDiffStatistics = (
  statisticsList: readonly ChangeStatistics[]
): MergedChangeStatistics => {
  const totalAddStatistics = new Map<string, number>();
  const totalDeleteStatistics = new Map<string, number>();
  statisticsList.forEach(({ addStatistics, deleteStatistics }) => {
    addStatistics.forEach((count, line) => {
      totalAddStatistics.set(line, (totalAddStatistics.get(line) ?? 0) + count);
    });
    deleteStatistics.forEach((count, line) => {
      totalDeleteStatistics.set(line, (totalDeleteStatistics.get(line) ?? 0) + count);
    });
  });
  return { addStatistics: totalAddStatistics, deleteStatistics: totalDeleteStatistics };
};

// Exposed for testing.
export const reduceMergedLines = ({
  addStatistics,
  deleteStatistics,
}: MergedChangeStatistics): MergedChangeStatistics => {
  const reducedAddStatistics = new Map<string, number>();
  const reducedDeleteStatistics = new Map<string, number>(deleteStatistics);
  addStatistics.forEach((addCount, line) => {
    const deleteCount = reducedDeleteStatistics.get(line);
    if (deleteCount == null) {
      reducedAddStatistics.set(line, addCount);
      return;
    }
    if (addCount === deleteCount) {
      // They completely cancel out.
      reducedDeleteStatistics.delete(line);
    } else if (addCount > deleteCount) {
      // Add is more than delete. Update add, remove from delete.
      reducedAddStatistics.set(line, addCount - deleteCount);
      reducedDeleteStatistics.delete(line);
    } else {
      // Delete is more than add. Do not add, add delete.
      reducedDeleteStatistics.set(line, deleteCount - addCount);
    }
  });
  return { addStatistics: reducedAddStatistics, deleteStatistics: reducedDeleteStatistics };
};

type AggregatedStatistics = { readonly added: number; readonly deleted: number };

const countLines = ({
  addStatistics,
  deleteStatistics,
}: MergedChangeStatistics): AggregatedStatistics => ({
  added: Array.from(addStatistics.values()).reduce((accumulator, count) => accumulator + count, 0),
  deleted: Array.from(deleteStatistics.values()).reduce(
    (accumulator, count) => accumulator + count,
    0
  ),
});

export default (diffString: string): number => {
  const parsedDiff = Diff.parsePatch(diffString);
  const statisticsList = parsedDiff
    .filter((diff) => !shouldDiffBeIgnored(diff))
    .map(getDiffStatistics);
  const mergedStatistics = mergeDiffStatistics(statisticsList);
  const { added: mergedAdded, deleted: mergedDeleted } = countLines(mergedStatistics);
  console.log(`[including-moved] total added: ${mergedAdded}, total deleted: ${mergedDeleted}.`);
  const { added: reducedAdded, deleted: reducedDeleted } = countLines(
    reduceMergedLines(mergedStatistics)
  );
  console.log(`[excluding-moved] Total added: ${reducedAdded}, total deleted: ${reducedDeleted}.`);
  return reducedAdded + reducedDeleted;
};
