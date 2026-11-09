// A squash merge takes the pull request's Markdown description as its body: tables, trees and
// links there run past any line limit, so only the subject line is held to one.
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};

export default config;
