<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/989fb36d-13cd-449e-9da5-b451387e4f67

## Run Locally

**Prerequisites:** Node.js and MySQL 8+


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local`, then fill `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE`.
3. Optional: set `VITE_GEMINI_API_KEY` for Gemini helper buttons.
4. Run frontend and backend together:
   `npm run dev`

Open `http://localhost:3000`. Backend health is available at `http://localhost:4100/api/health`.

On first start, backend creates strict MySQL tables from `server/schema.sql`. If `data/uppm.sqlite` contains an old snapshot and MySQL is empty, backend imports it once. SQLite remains unchanged as rollback data.
