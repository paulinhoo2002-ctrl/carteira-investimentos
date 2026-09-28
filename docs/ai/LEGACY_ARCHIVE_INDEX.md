# Legacy Git history recovery

Committed project work is recovered from the canonical Git remote whenever
the required branch or commit remains available there.

Some retired local histories may additionally be preserved as verified Git
bundles. Their exact filenames, storage locations, SHA-256 values, refs and
recovery commands are private operational metadata maintained in the private
local recovery manifest; they are intentionally not published here.

## Recovery policy

1. Confirm the correct repository and identify the missing branch/ref.
2. Prefer the canonical remote; do not rewrite remote history.
3. If remote recovery is insufficient, consult the private recovery manifest
   and verify the selected bundle before using it.
4. Recover into an isolated location and verify the expected commit/ref.
5. Never treat a bundle as a source for personal financial records or as
   authorization to restore/import data.

`LEGACY_HISTORY=VERIFIED_PRIVATE_GIT_BUNDLES` is a recovery capability, not a
public inventory. Preserve uncertain histories and do not run garbage
collection or pruning as part of routine recovery.
