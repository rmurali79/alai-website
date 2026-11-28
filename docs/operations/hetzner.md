# O1: Hosting on Hetzner Cloud

The site is plain files, so one small server is enough. It runs Caddy, which serves the files and gets and renews the HTTPS certificate on its own. GitHub publishes each change after the checks pass on `main`.

What is in the repository:

| File | What it does |
| --- | --- |
| `deploy/Caddyfile` | Web server config: HTTPS, `www` to bare domain redirect, security headers, caching, the 404 page |
| `deploy/cloud-init.yaml` | Sets the server up on first start: Caddy, firewall, a `deploy` user, automatic security updates. Generated from the Caddyfile by `npm run deploy:cloud-init` |
| `.github/workflows/deploy.yml` | Publishes `dist/` to the server after "Checks" passes on `main`. Does nothing until the secrets below exist |

The domain stays where it is until step 6. Steps 1 to 5 change nothing on the current site.

## 1. Make a deploy key (on your computer, once)

```sh
ssh-keygen -t ed25519 -f alai_deploy -N "" -C "alai-website deploy"
```

This makes two files: `alai_deploy` (private, goes into GitHub in step 4) and `alai_deploy.pub` (public, goes onto the server in step 2). Keep your own personal SSH key separate; it is the one for logging in yourself.

## 2. Create the server (Hetzner Cloud Console)

1. Create a project, for example "Alai website", then **Add Server**.
2. **Location**: Singapore, closest to most visitors. **Image**: Ubuntu 24.04.
3. **Type**: the smallest shared vCPU plan is plenty for a static site. Check the current price on the page.
4. **Networking**: keep public IPv4 and IPv6.
5. **SSH keys**: add your *personal* public key. This is how you log in as `root` if you ever need to.
6. **Cloud config**: paste the whole of `deploy/cloud-init.yaml`, and replace `PASTE_DEPLOY_PUBLIC_KEY_HERE` with the one line from `alai_deploy.pub`.
7. Optional: tick **Backups**.
8. Create, and note the server's IPv4 and IPv6 addresses.

Setup takes a few minutes after the server starts. To confirm it finished: `ssh root@<IPv4> cloud-init status` should say `done`.

## 3. Point a test address at it

At the company that hosts the alai-labs.com DNS, add records for a test address. This does not touch the live site.

| Name | Type | Value |
| --- | --- | --- |
| `staging` | A | server IPv4 |
| `staging` | AAAA | server IPv6 |
| `www.staging` | A | server IPv4 |

Within a few minutes Caddy gets a certificate and https://staging.alai-labs.com shows "The site is being set up."

## 4. Connect GitHub

Get the server's fingerprint line from your computer:

```sh
ssh-keyscan -t ed25519 <IPv4>
```

Check it matches what the server reports: `ssh root@<IPv4> ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` gives the same `SHA256:` value as `ssh-keygen -lf <(ssh-keyscan -t ed25519 <IPv4>)`.

In GitHub, open the repository's **Settings > Secrets and variables > Actions** and add:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | the server's IPv4 |
| `DEPLOY_SSH_KEY` | the whole of the private file `alai_deploy` |
| `DEPLOY_KNOWN_HOSTS` | the line `ssh-keyscan` printed |

Optional, under the **Variables** tab: `SITE_URL` = `https://staging.alai-labs.com`. With it, each deploy checks the live site answers.

Then delete `alai_deploy` from your computer, or keep it somewhere safe. Never commit it.

## 5. First publish and review

In **Actions > Deploy**, choose **Run workflow**. After that, every merge to `main` that passes the checks is published on its own. Review https://staging.alai-labs.com. It is the real site on the real server.

Deploys only publish; they never restart or reconfigure the server. Each version keeps its own folder, and the last five are kept. To roll back by hand:

```sh
ssh deploy@<IPv4> 'cd /var/www/alai && ls releases'   # pick the version before
ssh deploy@<IPv4> 'cd /var/www/alai && ln -sfn releases/<version> current.new && mv -Tf current.new current'
```

## 6. Move the domain (go-live, needs the Alai team's go-ahead)

Do this only after sign-off, the form service and the privacy review (see `docs/aidlc/construction/qa.md`), and after O2's redirects for the old addresses are in place.

1. A day before, lower the TTL of the `alai-labs.com` and `www` records to 300 seconds so the change spreads quickly.
2. On the server, switch the address Caddy answers on:
   ```sh
   ssh root@<IPv4>
   sed -i 's/SITE_DOMAIN=.*/SITE_DOMAIN=alai-labs.com/' /etc/systemd/system/caddy.service.d/site.conf
   systemctl daemon-reload && systemctl restart caddy
   ```
3. Change the `@` (alai-labs.com) and `www` A records to the server's IPv4, and add AAAA records with its IPv6. Remove any old AAAA records that point elsewhere.
4. Caddy gets the certificate once the records reach it, usually within minutes. Check https://alai-labs.com and that https://www.alai-labs.com goes to it.
5. Set the GitHub variable `SITE_URL` to `https://alai-labs.com`, and remove the `staging` records.

## Changing the web server config

After editing `deploy/Caddyfile`, run `npm run deploy:cloud-init` so the setup file stays in step (`npm run check` fails otherwise), then put it on the server:

```sh
scp deploy/Caddyfile root@<IPv4>:/etc/caddy/Caddyfile
ssh root@<IPv4> 'caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy'
```

When a form service is chosen, add its address to `connect-src` in the Caddyfile's public policy, or the Contact form cannot send.

## What the server is set up with

- Firewall open only for SSH, HTTP and HTTPS (including HTTP/3). Password login is off; keys only.
- fail2ban against repeated SSH login attempts, and automatic security updates.
- Security headers: HSTS (one year, this domain only), a strict Content-Security-Policy for public pages (only the site's own files, plus the one inline line that adds the `js` class), no framing, no sniffing, a strict referrer policy. `/admin/` gets a looser policy because it talks to GitHub, and is never cached or indexed.
- Caching: pages, CSS and scripts are revalidated on every visit, images keep a day, fonts a year.
