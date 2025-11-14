🎯 Quick Answer
You need to modify exactly 4 files:

.env - Add the new service URL
src/config/env.ts - Add Zod validation for the URL
src/routes/api.routes.ts - Add proxy routes for the service
