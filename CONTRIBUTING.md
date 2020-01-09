# Contributing

Thank you for your interest in contributing! We welcome all contributions no matter their size. Please read along to learn how to get started. More information can be found in each of the README.md as well as  https://docs.airswap.io/ about the individual repos.

Set up:
First fork airswap-protocols repository and then clone the project. 

Example:

$ git clone https://github.com/airswap/airswap-protocols

This project uses lerna to handle managing the mono-repo. Lerna is a tool for managing JavaScript projects with multiple packages.

Run the below command from the root directory to start downloading necessary packages:

`yarn install `


Running the tests
A great way to explore the code base is to run the tests.

We can run all tests with:

`yarn test`


Code Style
When multiple people are working on the same body of code, it is important that they write code that conforms to a similar style. It often doesn’t matter as much which style, but rather that they conform to one style.

To ensure your contribution conforms to the style being used in this project, we require that a linter is run prior to committing to ensure styling

Run:

yarn lint (linting for the Javascript)
yarn hint (linting for the Solidity code)

Pull Requests
It’s a good idea to make pull requests early on. A pull request represents the start of a discussion, and doesn’t necessarily need to be the final, finished submission. Make it a [draft PR](https://github.blog/2019-02-14-introducing-draft-pull-requests/) if you're looking for feedback but not ready for a final review.

GitHub’s documentation for working on pull requests is available [here]( https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests).


Once you’ve made a pull request take a look at the Circle CI build status in the GitHub interface and make sure all tests are passing. In general pull requests that do not pass the CI build yet won’t get approved.