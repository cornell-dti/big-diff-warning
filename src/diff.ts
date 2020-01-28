import * as Diff from 'diff';

const ignores: readonly string[] = ['yarn.lock', 'package-lock.json', 'Pods/', '.snap'];

const shouldBeIgnored = (path: string): boolean =>
  ignores.find(ignore => path.includes(ignore)) != null;

export default (diffString: string): number => {
  const parsedDiff = Diff.parsePatch(diffString);
  let significantChangedLines = 0;
  parsedDiff.forEach(({ oldFileName, newFileName, hunks }) => {
    if (
      (oldFileName != null && shouldBeIgnored(oldFileName)) ||
      (newFileName != null && shouldBeIgnored(newFileName))
    ) {
      console.log(`Change ${oldFileName} => ${newFileName} is not significant.`);
      return;
    }
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
