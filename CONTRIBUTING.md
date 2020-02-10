# Contributing

Thank you for your interest in contributing! We welcome all contributions no matter their size. Please read this guide to learn how to get started. More information about the individual sub-repos can be found in the relevant README.md, as well as on the [airswap docs site](https://docs.airswap.io/).

## Set up:

First fork airswap-protocols repository and then clone the project.

Example of clone command after forking with https:

`git clone https://github.com/<YOUR-GITHUB-USER>/airswap-protocols`

This project has multiple sub-repos found within `source` and `tools`. We use lerna to handle managing the mono-repo. [Lerna](https://lerna.js.org/) is a tool for managing JavaScript projects with multiple packages.

Run the below command from the root directory to start downloading necessary packages:

`yarn install`

## Running the tests

A great way to explore the code base is to run the tests.

We can run all tests from the root with:

`yarn test`

If you want to run the tests of just 1 sub-repo, then run the same command inside the sub-repo.

```
cd source/swap
yarn test
```

## Code Style

When multiple people are working on the same body of code, it is important that everyone conforms to a similar style. It often doesn’t matter as much which style, but rather that they conform to one style.

To ensure your contribution conforms to the style being used in this project, we require that a linter is run prior to committing to ensure styling. We have also documented our [Solidity style guide](SOLIDITY_STYLE_GUIDE.md) in the repo as well.

Run:

```
yarn lint (linting for the Javascript)
yarn hint (linting for the Solidity code)
```

## Pull Requests

It’s a good idea to make pull requests early on. A pull request represents the start of a discussion, and doesn’t necessarily need to be the final, finished submission. Make it a [draft PR](https://github.blog/2019-02-14-introducing-draft-pull-requests/) if you're looking for feedback but not ready for a final review. If the PR is in response to a Github issue, make sure to notate the issue as well.

GitHub’s documentation for working on pull requests is available [here](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests).

Once you’ve made a pull request take a look at the Circle CI build status in the GitHub interface and make sure all tests are passing. In general pull requests that do not pass the CI build yet won’t get approved.
