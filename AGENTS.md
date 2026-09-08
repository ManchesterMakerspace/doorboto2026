# Dependency changes

Whenever a dependency or dependency version changes in `package.json`, rebuild
and commit the corresponding `package-lock.json` with the repository's supported
npm version. Verify the lockfile by running `npm ci`; never delete the lockfile
without committing its regenerated replacement in the same change.
