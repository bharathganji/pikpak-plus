module.exports = {
  branches: [
    "main",
    {
      name: "beta",
      prerelease: true
    },
    {
      name: "alpha",
      prerelease: true
    }
  ],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits"
      }
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits"
      }
    ],
    [
      "@semantic-release/github",
      {
        assets: ["dist/**", "pikpak-plus-client/**", "pikpak-plus-server/**"],
        releasedLabels: ["Status: Released"],
        releasedMilestones: ["Next"],
        releasedLabels: ["Status: Released"]
      }
    ]
  ]
};