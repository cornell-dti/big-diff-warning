import * as core from '@actions/core';
import { getDiff, commentOnPullRequest, requestReview } from './github';
import computeSignificantLines from './diff';

const THRESHOLD = 1;

const main = async (): Promise<void> => {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    throw new Error('Environment variable BOT_TOKEN must be set!');
  }
  const diff = await getDiff(BOT_TOKEN);
  // The type definition cannot understand using `vnd.github.v3.diff` will return a diff string.
  let significantChangedLines = computeSignificantLines((diff as any) as string);
  let comment = `Significant lines: ${significantChangedLines}.`;
  if (significantChangedLines > THRESHOLD) {
    comment += ' This diff might be too big! Developer leads are invited to review the code.';
    requestReview(BOT_TOKEN);
  }
  commentOnPullRequest(BOT_TOKEN, '[diff-counting]', comment);
};

(async () => {
  try {
    await main();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
