# Doorboto (Onsite Node Server)

Doorboto is responsible for authorizing member access to a Makerspace.

This is accomplished by gathering input from an Arduino power RFID reader.

Then comparing uid of NFC band cards to cache entries in the server.

The server's cache entries are updated on a daily basis.

Authorized members are parsed from a central online database.

This database is kept up to date with the organization's CRM and payment system.

## Hardware

Doorboto's current primary target hardware is a RaspPi 3b.

It is wired to ethernet. That is connected to a modem and router that has a UPS.

It has its own UPS for power outages. (As well as the electronic door strike that the reader can trigger)

In this way Doorboto is independently network and power tolerant.

It is wired via USB to a Arduino based RFID reader.

## Operations

The Doorboto process is kept running regardless of system restart via PM2.

Doorboto's Logs are tracked via PM2.

Doorboto's private config is tracked and held with Jitploy (to be deprecated, also optional if one knows the config)

`LENIENCY` may optionally specify, in milliseconds, how long an expired
membership remains authorized. It is disabled when unset. For example, the
previous three-day grace period can be enabled with `LENIENCY=259200000`.

Application logs are emitted to stdout as newline-delimited JSON using Pino.
Set `LOG_LEVEL` to adjust verbosity. PM2 captures stdout and stderr in
`logs/doorboto.out.log` and `logs/doorboto.error.log`; it only prefixes each
line with a timestamp and does not reformat Pino's JSON. Install and configure
the optional `pm2-logrotate` module onsite if size- or time-based rotation is
required, then verify retention and disk usage on the target device.

Serial reconnects use exponential backoff capped at 30 seconds. If the port
remains offline for `USB_SERIAL_RECOVERY_AFTER_SECONDS` (300 by default), the
server runs `hardware_interface/usb-serial-recover.py`, passing the configured
port as its first argument. Set `USB_SERIAL_RECOVERY_SCRIPT` to use a
site-specific executable instead. Recovery helpers are forcibly stopped after
`USB_SERIAL_RECOVERY_TIMEOUT_SECONDS` (30 seconds by default), after which
normal serial reconnect attempts resume.

## Install and PM2 operations

Node 24 and npm 11 are required. From this directory, `npm run setup` installs
the exact dependency graph in `package-lock.json`, starts the project-local PM2
release, and saves the process list. PM2 is an application dependency; do not
install or invoke a separate global copy.

PM2 prints a host-specific privileged command when startup integration is
generated. Run the following **as the application user**, then execute the
printed `sudo` command verbatim so systemd retains the application user's home
directory and the active Node 24 binary path:

```sh
env PATH="$(dirname "$(command -v node)"):$PATH" npm exec -- pm2 startup systemd -u "$USER" --hp "$HOME"
npm exec -- pm2 save
```

Routine commands, run from `onsite_auth_server`, are:

```sh
npm start                  # start the ecosystem after loading prod.sh
npm exec -- pm2 status     # inspect process and restart state
npm run show-logs          # stream timestamped stdout/stderr
npm run restart            # restart and refresh environment variables
npm run shutdown           # remove Doorboto from the PM2 process list
npm exec -- pm2 save       # persist any intentional process-list change
```

After a shutdown, use `npm start` followed by `npm exec -- pm2 save` to restore
the service. Prefer `npm run restart` over reload: Doorboto deliberately uses a
single fork because one serial device cannot safely be shared by clustered
workers.

Before deployment, validate start, environment-refresh restart, crash/backoff
recovery, system startup restoration, SIGINT/SIGTERM shutdown, serial unplug
and reconnect recovery, and log rotation on representative onsite hardware.
Database credentials and the configured Arduino device are required for that
acceptance test and are intentionally not stored in this repository.

## Automatic deployment

Every push to `master` runs the unit tests, ESLint, and Prettier check in GitHub
Actions using Node 24 and npm 11. After those checks pass, the protected
`onsite-production` environment connects to the onsite host over SSH, resets
its existing checkout to the exact commit that passed CI and environment
approval, first validates that revision with a locked install and unit-test run
in a temporary Git worktree on the target architecture, and only then replaces
the live checkout and restarts Doorboto. A failed target-side validation leaves
the live checkout and running PM2 process untouched.

Configure these GitHub environment secrets:

- `DEPLOY_HOST`: hostname or IP address of the onsite host.
- `DEPLOY_USER`: unprivileged application account with serial-device access.
- `DEPLOY_PATH`: absolute path to the existing Doorboto Git checkout.
- `DEPLOY_PORT`: SSH port; omit it to use port 22.
- `DEPLOY_SSH_KEY`: private key dedicated to the deployment account.
- `DEPLOY_KNOWN_HOSTS`: pinned `known_hosts` entry for the deployment host.

The deployment account must be able to fetch the repository and manage the
same user-owned PM2 process list used during initial setup. Keep production
configuration in `prod.sh` on the host; it remains untracked. Configure required
reviewers on the `onsite-production` GitHub environment if deployments need
manual approval after CI passes.
