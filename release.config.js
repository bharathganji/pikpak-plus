/* eslint-disable no-undef */
module.exports = {
  branches: [
    "main",
    { name: "beta", prerelease: "beta" },
    { name: "alpha", prerelease: "alpha" },
  ],

  plugins: [
    // Analyze commits
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
      },
    ],

    // Generate changelog notes
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
      },
    ],

    // Publish GitHub Release
    [
      "@semantic-release/github",
      {
        assets: [
          { path: "dist/**", label: "Build Output" },
          { path: "pikpak-plus-client/dist/**", label: "Client Build" },
          { path: "pikpak-plus-server/*.whl", label: "Python Wheel" },
        ],

        releasedLabels: ["Status: Released"],
      },
    ],

    // Publish NPM package (client)
    [
      "@semantic-release/npm",
      {
        pkgRoot: "pikpak-plus-client",
      },
    ],

    // Python Server — package + release
    [
      "@semantic-release/exec",
      {
        // Build Python wheel correctly
        prepareCmd:
          "cd pikpak-plus-server && python setup.py sdist bdist_wheel && cd ..",

        // Upload the wheel via GitHub asset (already handled in assets)
        publishCmd: 'echo "Server package v${nextRelease.version} created"',
      },
    ],
  ],
};
