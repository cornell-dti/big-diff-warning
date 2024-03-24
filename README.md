# big-diff-warning

Automatically warn against big diffs for Cornell DTI repos.

## Usage

```yml
on: pull_request

jobs:
  warn-if-big:
    runs-on: ubuntu-latest
    name: Warn if the PR is too big
    steps:
      - uses: actions/checkout@master
      - uses: cornell-dti/big-diff-warning@master
        env:
          BOT_TOKEN: '${{ secrets.BOT_TOKEN }}'
```

## Development

GitHub Actions require the repository to be self-contained. Therefore, the compiled
[`index.js`](./compiled/index.js) must be checked into repository.

1. Run `yarn`
2. Run `yarn test`
3. Run `yarn compile` 

before commit to ensure that [`index.js`](./compiled/index.js) is in
sync with sources.
