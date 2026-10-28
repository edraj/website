dmart is one program, `dmart`: the server, the admin UIs it serves (cxb at `/cxb/`, catalog at `/cat/`) and the [CLI](/cli). There are four ways to install it. The csdmart repository on GitHub is not public for now, so release files and the source are not open to everyone; the package repositories and the container are.

| Way | What you get | Upgrades |
|---|---|---|
| [Package repositories](#package-repositories) (dnf, apt, apk) | a systemd (or OpenRC) service on SQLite, ready to start | through the package manager |
| [The container](#the-container) | one container on port 8000, on SQLite | pull a newer image |
| [Release files](#release-files) | the binary in a tarball, or a package file to install by hand | replace the file |
| [From source](#from-source) | a build of your own | rebuild |

Every way can run on SQLite, with nothing else to install. PostgreSQL is optional, for several nodes or a larger instance: see [Database & Storage](/settings#database--storage). After installing, see [Upgrading](/upgrading) for later releases.

## Package repositories

The package repositories at `packages.imx.sh` are signed and carry the five most recent releases. Prefer them to a downloaded file: upgrades arrive through the package manager, and the index is signed, so a tampered mirror fails instead of installing.

**Fedora and RHEL 9 (dnf):**

```bash
sudo rpm --import https://packages.imx.sh/dmart.asc
sudo tee /etc/yum.repos.d/dmart.repo >/dev/null <<'EOF'
[dmart]
name=dmart
baseurl=https://packages.imx.sh/rpm/fc44/x86_64
gpgcheck=1
gpgkey=https://packages.imx.sh/dmart.asc
EOF
sudo dnf install dmart
```

On RHEL 9, Alma or Rocky, use `baseurl=https://packages.imx.sh/rpm/el9/x86_64`. The two builds are not interchangeable: they link against different glibc versions.

**Debian and Ubuntu (apt):**

```bash
sudo install -d /etc/apt/keyrings
curl -fsSL https://packages.imx.sh/dmart.asc | sudo tee /etc/apt/keyrings/dmart.asc >/dev/null
echo "deb [signed-by=/etc/apt/keyrings/dmart.asc] https://packages.imx.sh/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/dmart.list >/dev/null
sudo apt update && sudo apt install dmart
```

**Alpine (apk):**

```bash
sudo curl -fsSL -o /etc/apk/keys/packages@imx.sh-6ab6757d.rsa.pub \
  https://packages.imx.sh/alpine/packages@imx.sh-6ab6757d.rsa.pub
echo "https://packages.imx.sh/alpine/v3.24/main" | sudo tee -a /etc/apk/repositories
sudo apk update && sudo apk add dmart
```

The RPM and DEB packages are for x86-64; the APK for x86-64 and aarch64.

### First start

The package writes `/etc/dmart/config.env` on the first install only, so an upgrade keeps your edits. It runs on SQLite at `/var/lib/dmart/dmart.db`, and the file explains how to switch to PostgreSQL. dmart will not start until `JWT_SECRET` holds a secret of at least 32 bytes that does not contain `change-me`. The first start creates the database, the `management` space with its `users`, `roles`, `groups`, `permissions` and `schema` folders, and the built-in `dmart` admin, with no password; every start creates any of these that is missing.

```bash
sudo vi /etc/dmart/config.env      # set JWT_SECRET, e.g. from: openssl rand -base64 48
sudo systemctl enable --now dmart  # Alpine: rc-update add dmart && rc-service dmart start
sudo dmart passwd dmart            # once it has started: set the admin's password
```

In that order, and as root: `/etc/dmart/config.env` is readable by root and the `dmart` group only. Run before the first start, `dmart passwd` finds no account, changes nothing and exits with status 1; see [passwd](/cli#8-passwd). The package's install message gives the same steps.

Then open `http://<host>:8282/cxb/` and sign in as `dmart`. Set the password before the server is reachable from anywhere else.

### The packaged service

- **User:** runs as the `dmart` system user, with `WorkingDirectory=/var/lib/dmart` and `BACKEND_ENV=/etc/dmart/config.env`.
- **Logs:** go to journald (`journalctl -u dmart -f`). On Alpine, OpenRC runs `/etc/init.d/dmart` and logs to `/var/log/dmart/dmart.log`.
- **Restarts:** `Restart=on-failure`, after 5 seconds.
- **Changes:** an upgrade replaces the unit file, so change it with a drop-in (`sudo systemctl edit dmart`). For example, to serve a CXB config:

  ```ini
  [Service]
  ExecStart=
  ExecStart=/usr/bin/dmart serve --cxb-config /etc/dmart/config.json
  ```

- **Completions:** bash and fish completions for `dmart` are installed with it.
- **Removing it:** removing the package stops and disables the service, and leaves `/etc/dmart`, `/var/lib/dmart` and the `dmart` user in place.

## The container

```bash
podman run --name dmart -p 8000:8000 -v dmart-data:/root/.dmart -d ghcr.io/edraj/csdmart:latest
podman exec -it dmart dmart passwd dmart   # once it is up: its first start creates the admin
# then open http://localhost:8000/cxb/ or http://localhost:8000/cat/
```

- **Port:** 8000, not 8282.
- **Storage:** `config.env`, the `dmart.db` database, the UIs' `config.json` and the first-run marker all live in `/root/.dmart`. Mount a volume there, or a new container starts empty.
- **First run:** writes a random `JWT_SECRET`, `DATABASE_DRIVER=sqlite` and `SQLITE_PATH=/root/.dmart/dmart.db`. It also sets `IS_SMPP_ENABLED=true` and `MOCK_SMPP_API=true`: SMS codes are not sent, and each appears only in `podman logs <container>`. For real delivery, set `SEND_SMS_OTP_API` and `SMPP_AUTH_KEY` and turn the mock off (`MOCK_SMPP_API=false`).
- **Admin password:** the `dmart` admin has none until you run `dmart passwd dmart` in the container, as above. Do it before the container is reachable.
- **PostgreSQL:** `config.env` pins the driver, so to move to PostgreSQL change the `DATABASE_DRIVER` line to `postgresql` as well as adding `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_USERNAME` and `DATABASE_PASSWORD`.
- **Tags:** `latest` and `<version>` cover amd64 and arm64; `<version>-amd64` and `<version>-arm64` name one architecture.

## Release files

Each release also carries the files below, on the releases page of csdmart's GitHub repository. That repository is not public for now; until it is, install from the [package repositories](#package-repositories), whose packages are the same builds, or use [the container](#the-container).

| Files | Runs on |
|---|---|
| `dmart-<v>-linux-x64.tar.gz`, `dmart-<v>-linux-arm64.tar.gz` | glibc 2.34 or newer (RHEL 9 and later), with `libe_sqlite3.so` and `libargon2.so.1` beside the binary |
| `dmart-<v>-linux-musl-x64.tar.gz`, `dmart-<v>-linux-musl-arm64.tar.gz` | any Linux of that architecture: fully static |
| RPM (`el9`, `fc44`) and DEB | x86-64 only |
| APK | x86-64 and aarch64 |
| `dmart-<v>-win-x64.zip`, `dmart-<v>-osx-arm64.zip` | Windows x64 and macOS arm64; only in releases built while the repository is public |
| container image | amd64 and arm64 |
| `cxb-<v>.tar.gz`, `catalog-<v>.tar.gz` | the two admin UIs as static files; the binary already serves them |
| `Dmart.*.nupkg` | the .NET libraries; see [Drivers & SDKs](/drivers) |

- **libargon2:** the Linux builds hash passwords with libargon2, so a missing one is a server that starts and signs nobody in. The packages depend on it (`libargon2`, `libargon2-1`, `argon2-libs`); the RHEL 9 RPM bundles its own copy in `/usr/lib64/dmart/`, because RHEL carries libargon2 only in EPEL. The Windows and macOS builds use a managed Argon2 with the same output and need no library.
- **The static musl build** links OpenSSL, SQLite and libargon2 into the binary, so distro security updates do not reach them: a fix in any of them needs a new dmart release. On the glibc builds, a distro OpenSSL update fixes the binary in place.

A package file installs as one from the repositories does (`sudo dnf install ./dmart-*.rpm`), then starts as in [First start](#first-start). A tarball holds the `dmart` binary with `config.env.sample` beside it. Unpack it and, from the directory that holds the binary:

```bash
./dmart init           # writes ~/.dmart/config.env, the UIs' config.json and cli.ini
vi ~/.dmart/config.env # choose the database (see below)
./dmart serve          # the first start creates the database and the admin
./dmart passwd dmart   # in another terminal, once it is up
```

`dmart init` copies the sample, which selects PostgreSQL, and gives it a fresh random `JWT_SECRET`. For SQLite, set `DATABASE_DRIVER="sqlite"` and `SQLITE_PATH` instead of the `DATABASE_*` connection settings; see [Database & Storage](/settings#database--storage). The server reads `~/.dmart/config.env` when `BACKEND_ENV` names no other file; a `config.env` in the current directory is never read. The server listens on port 8282 unless `LISTENING_PORT` says otherwise.

## From source

The source is in csdmart's GitHub repository, which is not public for now. Building needs the .NET 10 SDK, and the server needs your distro's argon2 runtime package (`libargon2`, `libargon2-1` or `argon2-libs`).

```bash
git clone https://github.com/edraj/csdmart
cd csdmart
cp config.env.sample config.env
vi config.env                                  # set the database
BACKEND_ENV=./config.env dotnet run -- serve   # ./config.env is never read implicitly
# in another terminal, once it is up (its first start creates the admin):
BACKEND_ENV=./config.env dotnet run --no-build -- passwd dmart
```

`./build.sh` makes a quick JIT build at `bin/dmart`; `./build.sh --aot` makes the self-contained native binary that the releases ship.

## Verifying a release

`scripts/verify-release.sh`, taken from the tag you deploy, checks every asset's checksum, its cosign keyless signature (made by one of csdmart's release workflows at that tag, and logged in Rekor), its SLSA build provenance and its CycloneDX SBOM attestation. It exits 0 only when every check passes, and needs `cosign` and `gh` 2.49 or later. The script and the release files are in csdmart's GitHub repository, which is not public for now. Until it is, the package managers' own checks are what verifies a package: `dnf` checks each package against the repository's key, and `apt` and `apk` check the repository's signed index.

```bash
TAG=vX.Y.Z                       # the release you deploy
git clone --depth 1 --branch "$TAG" https://github.com/edraj/csdmart
csdmart/scripts/verify-release.sh --tag "$TAG"
```

| Flag | Effect |
|---|---|
| `--require-hosted` | fail any artifact built on a self-hosted runner, as most of the distro packages are |
| `--commit <sha>` | also require the provenance and every signing certificate to name this commit |
| `--offline` | read the attestations from the release's `.attestation.jsonl` files instead of GitHub's API; the signature checks still contact Rekor |
| `--no-attestations` | for a release built while the repository was private: checksums and signatures only |

What it does not cover:

- **The container image** is neither signed nor attested.
- **RPMs from the package repository** are re-signed with the repository's key, so they no longer match the release checksums or verify against them; `rpm` checks the repository's signature instead. DEBs and APKs from the repositories are the release files byte for byte, and verify.

## Checking it works

- **Readiness:** `curl -s http://localhost:8282/health/ready` answers `200` once the database answers a query, and `503` with the reason (`database unreachable`, say) until then. `/health/live` answers `200` whenever the process is up.
- **A smoke test:** `sudo dmart selfcheck` checks readiness, signs in as the `dmart` admin, prints the server's version, lists spaces, and creates, queries, updates and deletes a test entry. On the server's own host it needs no password; see [selfcheck](/cli#10-selfcheck).
- **The startup log** names the dmart version and the database driver, and says whether the driver was set or inferred.

## Next steps

- **Configure it:** every `config.env` key is in [Settings](/settings).
- **Add people:** users, roles and permissions are in [Access Control](/access-control).
- **Run several nodes** on one PostgreSQL database: [Running several nodes](/technical#running-several-nodes).
- **A small board:** [Small devices and diagnostics](/technical#small-devices-and-diagnostics).
- **Later releases:** [Upgrading](/upgrading).
