import * as github from '@actions/github';
import Octokit from '@octokit/rest';

const USER_LOGIN = 'dti-github-bot';

type PullRequest = {
  readonly number: number;
  readonly owner: string;
  readonly repo: string;
  readonly authorLogin: string;
};

const getPullRequest = (): PullRequest => {
  const pullRequest = github.context.payload.pull_request;
  if (pullRequest == null) {
    throw new Error('The action must be used in a PR context!');
  }
  return {
    number: pullRequest.number,
    owner: pullRequest.head.repo.owner.login,
    repo: pullRequest.head.repo.name,
    authorLogin: pullRequest.user.login
  };
};

const getOctokit = (githubToken: string): Octokit =>
  new Octokit({
    auth: `token ${githubToken}`,
    userAgent: 'cornell-dti/big-diff-warning'
  });

export const getDiff = async (githubToken: string): Promise<string> => {
  const { owner, repo, number } = getPullRequest();
  const octokit = getOctokit(githubToken);
  const { data: diff } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: number,
    headers: { accept: 'application/vnd.github.v3.diff' }
  });
  // The type definition cannot understand using `vnd.github.v3.diff` will return a diff string.
  return (diff as any) as string;
};

export const commentOnPullRequest = async (
  githubToken: string,
  prefix: string,
  comment: string
): Promise<void> => {
  const { owner, repo, number } = getPullRequest();
  const octokit = getOctokit(githubToken);
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: number
  });
  const existingComment = comments.find(
    comment => comment.user.login === USER_LOGIN && comment.body.startsWith(prefix)
  );
  const body = `${prefix} ${comment}`;
  if (existingComment == null) {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body
    });
    return;
  }
  await octokit.issues.updateComment({
    owner,
    repo,
    comment_id: existingComment.id,
    body
  });
};

const getReviewers = (): string[] => {
  const { authorLogin } = getPullRequest();
  return ['dti-github-bot', 'SamChou19815', 'JBoss925', 'lsizemore8'].filter(
    id => id != authorLogin
  );
};

export const requestReview = async (githubToken: string): Promise<void> => {
  const { owner, repo, number } = getPullRequest();
  const octokit = getOctokit(githubToken);
  const promises = getReviewers().map(async reviewer => {
    try {
      await octokit.pulls.createReviewRequest({
        owner,
        repo,
        pull_number: number,
        reviewers: [reviewer]
      });
    } catch (error) {
      console.warn(error.message);
    }
  });
  await Promise.all(promises);
};
