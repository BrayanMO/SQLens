# SQLens MVP

A REST API for Support Level 3 analysts to store, search, and reuse SQL queries during incident troubleshooting.

## 🚀 Deployment Instructions

### 1. Database Setup (Neon)
1. Log into your [Neon](https://neon.tech/) account.
2. Create a new project.
3. Obtain the connection string from the Neon dashboard.
4. Connect to your database using a tool like pgAdmin, DBeaver, or `psql` and execute the contents of `schema.sql` to create the required tables and indexes.

### 2. Hosting Web Service (Render)
1. Create a free account on [Render](https://render.com/).
2. Create a new "Web Service".
3. Connect your GitHub repository containing this project.
4. Set the following details:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Go to "Environment Variables" and set the following:
   - `DATABASE_URL`: Your Neon connection string (add `?sslmode=require` if not present)
   - `OPENROUTER_API_KEY`: Your OpenRouter API key.
   - `NODE_ENV`: `production`
6. Click "Create Web Service" and wait for the auto-deployment to finish.

### 3. Verification

Once deployed, verify the API health by running the following `curl` command (replace `<YOUR_RENDER_URL>` with your actual Render URL):

```bash
curl -X GET https://<YOUR_RENDER_URL>/health
```

**Expected output:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "db": "connected"
  }
}
```
