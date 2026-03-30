Manual Netlify deploy (no Git branch picker)

Use this flow if Netlify is not showing GitHub branches.

1) Open terminal in the project root:
   `C:\Users\audre\OneDrive\Desktop\Chamber-Speakers`

2) Install dependencies and build:
   `npm install`
   `npm run build`

3) Login and link site:
   `npx netlify login`
   `npx netlify init`

   - Choose "Link to existing site" if you already created one.
   - Otherwise create a new site.

4) Deploy production with functions:
   `npm run deploy:netlify`

5) In Netlify UI, set these environment variables on that same site:
   - `MONDAY_API_TOKEN`
   - `MONDAY_BOARD_ID`

6) Trigger a new deploy after env vars are set:
   `npm run deploy:netlify`

7) Verify function is live:
   `https://YOUR-SITE.netlify.app/.netlify/functions/monday-connection`

Expected quick checks:
- 404 => functions were not deployed to that site
- missing token error => env vars not set on that site/environment
- connected true => backend is working
