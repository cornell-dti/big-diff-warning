import * as Diff from 'diff';

const ignores: readonly string[] = ['yarn.lock', 'package-lock.json', 'Pods/', '.snap'];

const shouldBeIgnored = (path: string): boolean =>
  ignores.find(ignore => path.includes(ignore)) != null;

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
  hunks
}: Diff.ParsedDiff): ChangeStatistics => {
  const oldFileName = oldFilenameOptional ?? '';
  const newFileName = newFilenameOptional ?? '';
  const addStatistics = new Map<string, number>();
  const deleteStatistics = new Map<string, number>();
  hunks
    .flatMap(hunk => hunk.lines)
    .forEach(line => {
      switch (line[0]) {
        case '+': {
          const whiteSpaceStrippedLine = line.substring(1).trim();
          const existingCount = addStatistics.get(whiteSpaceStrippedLine) ?? 0;
          addStatistics.set(whiteSpaceStrippedLine, existingCount + 1);
          break;
        }
        case '-': {
          const whiteSpaceStrippedLine = line.substring(1).trim();
          const existingCount = deleteStatistics.get(whiteSpaceStrippedLine) ?? 0;
          deleteStatistics.set(whiteSpaceStrippedLine, existingCount + 1);
          break;
        }
        default:
          break;
      }
    });
  return { oldFileName, newFileName, addStatistics, deleteStatistics };
};

type MergedChangeStatistics = {
  readonly addStatistics: Map<string, number>;
  readonly deleteStatistics: Map<string, number>;
};

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

export default (diffString: string): number => {
  const parsedDiff = Diff.parsePatch(diffString);
  const statisticsList = parsedDiff
    .filter(diff => !shouldDiffBeIgnored(diff))
    .map(diff => {
      const diffStatistics = getDiffStatistics(diff);
      const { oldFileName, newFileName, addStatistics, deleteStatistics } = diffStatistics;
      const signficantLinesForOneFile =
        Array.from(addStatistics.values()).reduce((accumulator, count) => accumulator + count, 0) +
        Array.from(deleteStatistics.values()).reduce(
          (accumulator, count) => accumulator + count,
          0
        );
      console.log(
        `Change ${oldFileName} => ${newFileName} has ${signficantLinesForOneFile} lines diff.`
      );
      return diffStatistics;
    });
  const { addStatistics, deleteStatistics } = mergeDiffStatistics(statisticsList);
  const signficantLinesForAllFiles =
    Array.from(addStatistics.values()).reduce((accumulator, count) => accumulator + count, 0) +
    Array.from(deleteStatistics.values()).reduce((accumulator, count) => accumulator + count, 0);
  return signficantLinesForAllFiles;
};
