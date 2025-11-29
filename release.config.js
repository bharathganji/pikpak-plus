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
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: ["dist/**"],
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
