# VPS Deployment Guide

## Quick deploy (webapp only)
```bash
cd /root/cultivation-scraper/webapp
git pull origin master
npm run build
pm2 restart cultivationai
pm2 reload ecosystem.config.js --update-env
```

## First-time: start the monitor process
```bash
cd /root/cultivation-scraper/webapp
pm2 start ecosystem.config.js
pm2 save
```

## Update scraper files (after pulling latest from this machine)
The scraper fixes are NOT in git — upload them with scp or paste the content directly:

### novelbin (already had 3-strategy pagination; added retry logic + reduced default workers to 2)
### novellive (CRITICAL FIX: changed network_idle=False → True for chapter fetch)
### novelbuddy (CRITICAL FIX: same network_idle fix + retry logic)

Copy updated files to VPS:
```bash
scp cultivation-scraper/sites/novellive_scrape.py root@<VPS_IP>:/root/cultivation-scraper/cultivation-scraper/sites/
scp cultivation-scraper/sites/novelbuddy_scrape.py root@<VPS_IP>:/root/cultivation-scraper/cultivation-scraper/sites/
scp cultivation-scraper/sites/novelbin_scrape.py root@<VPS_IP>:/root/cultivation-scraper/cultivation-scraper/sites/
scp cultivation-scraper/vps_api/main.py root@<VPS_IP>:/root/cultivation-scraper/cultivation-scraper/vps_api/
scp cultivation-scraper/monitor_vps.py root@<VPS_IP>:/root/cultivation-scraper/cultivation-scraper/
```

Then restart FastAPI to pick up vps_api/main.py changes:
```bash
pm2 restart fastapi
```

## Verify everything is running
```bash
pm2 list
curl http://localhost:3000         # webapp health
curl http://localhost:8000/health  # fastapi health
```

## Check monitor log
```bash
tail -f /root/cultivation-scraper/cultivation-scraper/output/monitor.log
```

## Run scrapers (with fixed settings)
```bash
cd /root/cultivation-scraper/cultivation-scraper
# novellive (was 100% failing due to network_idle bug — now fixed)
python3 sites/novellive_scrape.py scrape --workers 2

# novelbuddy  
python3 sites/novelbuddy_scrape.py scrape --workers 2

# novelbin
python3 sites/novelbin_scrape.py scrape --workers 2
```

## URGENT: Rotate credentials
The following were exposed in git history (commit 3d81d60):
1. OpenAI API key → https://platform.openai.com/api-keys
2. Supabase service key → Supabase Dashboard > Project Settings > API
3. VPS root password → `passwd root` on VPS

After rotating: update `/root/cultivation-scraper/webapp/.env.local` and `pm2 restart all`.
