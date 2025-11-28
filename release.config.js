/* eslint-disable no-undef */
module.exports = {
  branches: [
    "main",
    { name: "beta", prerelease: "beta" },
    { name: "alpha", prerelease: "alpha" },
  ],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        transform: (commit) => {
          try {
            if (!commit.date || Number.isNaN(Date.parse(commit.date))) {
              commit.date = new Date().toISOString();
            }
          } catch (err) {
            commit.date = new Date().toISOString();
          }
          return commit;
        },
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: ["dist/**", "pikpak-plus-client/**", "pikpak-plus-server/**"],
        releasedLabels: ["Status: Released"],
      },
    ],
    // Client (npm)
    [
      "@semantic-release/npm",
      {
        pkgRoot: "pikpak-plus-client",
      },
    ],
    // Server (Python) - optional GitHub release asset
    [
      "@semantic-release/exec",
      {
        // Build or package your server
        prepareCmd: "echo 'Preparing server version ${nextRelease.version}'",
        publishCmd:
          'echo "Server version ${nextRelease.version} ready for release"',
      },
    ],
  ],
};
