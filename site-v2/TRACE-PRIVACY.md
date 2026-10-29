# Private trace archive

The viewer lives at `/traces/ipd/`. Only the generic viewer and encrypted files
are published. Task names, scores, the file manifest, all source files, and the
combined viewer records are encrypted. Large `.npz` binary prediction arrays
remain local-only to fit GitHub Pages' 1 GB site limit; the viewer marks them
accordingly. All original files remain untouched in `private/`.
Decryption uses the browser's Web Crypto
API and requires HTTPS (or localhost) and a browser with DecompressionStream.

## Local files

- `private/` is ignored by Git and lives outside Astro's public directory.
- The original run folder contents live in `private/traces/`. Back them up privately.
  Its `agent_summary.json` supplies the run name; no real run identity is hardcoded
  in the published viewer or encryption scripts.
- `private/traces-password.txt` contains the initial randomly generated password.
  Read it locally and share it through your preferred private channel. Do not
  commit it or paste it into an issue, command argument, or build log.
- `public/trace-vault/` contains the encrypted package. Commit this directory.
  Public builds need neither the original data nor a password.

## Change the password or refresh the data

From `site-v2`, run:

```powershell
npm run traces:encrypt
```

Enter and confirm a password of at least 20 characters at the hidden prompts.
Choose a long randomly generated password. The script updates the local password
file if one already exists. It generates fresh salts, random filenames, nonces,
and share-link handles each time. Old shared links need to be replaced.

To refresh data with the existing ignored local password instead:

```powershell
node scripts/encrypt-traces.mjs --use-local-password
```

For initial setup on a machine with no local password file:

```powershell
node scripts/encrypt-traces.mjs --generate-password
```

Then run `npm run traces:test`, `npm run check`, and `npm run build`. Commit only
the application changes and encrypted output. Never force-add `private/`.

## Format and behavior

`vault.json` contains only the format version, algorithm choices, random salt,
PBKDF2 iteration count, and opaque encrypted manifest filename. PBKDF2-HMAC-SHA256
uses 600,000 iterations and derives an AES-256 key from the NFC-normalized UTF-8
password. Each `.enc` file contains a fresh 12-byte nonce, gzip-compressed and
encrypted ciphertext, and a 16-byte GCM tag. Its random filename is authenticated
as additional data (`trace-vault:v1:<filename>`). Identical source files share a
single ciphertext; the deduplication map and source filenames stay encrypted.

The key is non-extractable and held only in tab memory. There is no password
check hash, localStorage/sessionStorage key, server login, or plaintext fallback.
The encrypted manifest authenticates password correctness. Images decrypt when
scrolled into view; other downloads decrypt when clicked. Locking aborts pending
fetches, removes decrypted DOM content, drops the key, and revokes blob URLs.
Refreshing or navigating away locks the archive. Shared links use random handles
and still require the password. Downloaded files and copied text remain with the
person who unlocked them.

Build guards reject the legacy public plaintext folder and generated task routes.
Post-build checks reject raw execution payloads and known plaintext trace filenames. They supplement
the main protection: the production build has no access to `private/` at all.

Anyone can download the ciphertext and attempt offline password guesses. Access
is shared by everyone who knows the password. Re-encryption cannot revoke old
copies, Git history, or data already decrypted or downloaded. A password change
protects the new package but cannot make a previously published package disappear.
File sizes, file count, and archive updates are public metadata.

The script compresses before encrypting and refuses vaults over 800 MiB to leave
room for the rest of the GitHub Pages site. It uses only Node.js built-ins.
