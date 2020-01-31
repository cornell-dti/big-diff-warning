import * as Diff from 'diff';

const ignores: readonly string[] = ['yarn.lock', 'package-lock.json', 'Pods/', '.snap'];

const shouldBeIgnored = (path: string): boolean =>
  ignores.find(ignore => path.includes(ignore)) != null;

const shouldDiffBeIgnored = ({ oldFileName, newFileName }: Diff.ParsedDiff): boolean =>
  (oldFileName != null && shouldBeIgnored(oldFileName)) ||
  (newFileName != null && shouldBeIgnored(newFileName));

export default (diffString: string): number => {
  const parsedDiff = Diff.parsePatch(diffString);
  let significantChangedLines = 0;
  parsedDiff.forEach(diff => {
    if (shouldDiffBeIgnored(diff)) {
      return;
    }
    const { oldFileName, newFileName, hunks } = diff;
    const signficantLinesForOneFile = hunks
      .flatMap(hunk => hunk.lines)
      .filter(line => line[0] === '+' || line[0] === '-').length;
    console.log(
      `Change ${oldFileName} => ${newFileName} has ${signficantLinesForOneFile} lines diff.`
    );
    significantChangedLines += signficantLinesForOneFile;
  });
  return significantChangedLines;
};
