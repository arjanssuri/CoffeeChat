# CoffeeChat

CoffeeChat is a comprehensive college application management platform that helps students track their applications, write essays with AI assistance, and manage deadlines. The platform integrates with Supabase for authentication and Foundry for AI-powered essay analysis and feedback.

## Quick Start

1. **Install frontend dependencies:**

   ```bash
   cd frontend && npm install
   ```
2. **Set up environment variables:**

   ```bash
   # Add to frontend/.env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```
3. **Run the database setup:**

   - Copy contents of `supabase-schema.sql`
   - Paste into Supabase Dashboard í SQL Editor í Run
4. **Start the development server:**

   ```bash
   npm run dev
   ```
5. **Open http://localhost:3000** and sign up to access the dashboard

## Features

- = **Authentication**: Secure login with Supabase (email/password + Google OAuth)
- =  **Dashboard**: User profile with Google avatar integration
- =› **Applications**: Create and manage college applications
- 

 **Essay Editor**: Write essays with AI chatbot assistance

- >  **AI Integration**: Foundry pipeline for advanced essay analysis
  >
- =Ò **Responsive Design**: Works on desktop and mobile

## Project Structure

```
ùù frontend/                 # Next.js React application
   ùù app/                 # Pages (dashboard, applications, editor)
   ùù components/ui/       # Reusable UI components
   ùù hooks/               # Custom React hooks (useAuth)
   ùù lib/                 # Utilities (Supabase client, API)
ùù backend/                 # Python backend (optional for AI)
   ùù src/                 # Foundry integration scripts
ùù supabase-schema.sql      # Database setup
```

## Database Schema

The app uses two main tables:

- `applications`: Store college application details
- `essays`: Store individual essays for each application

Both tables include Row Level Security (RLS) policies to ensure users only see their own data.

## AI Integration (Advanced)

For AI-powered essay feedback, the platform can integrate with Foundry:

1. **Backend Setup** (optional):

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. **Foundry Configuration**:

   ```bash
   # Add to backend/.env
   FOUNDRY_HOSTNAME=your_foundry_host
   FOUNDRY_TOKEN=your_foundry_token
   EVENT_JOB_RID=your_job_rid
   ```
3. **Pipeline Flow**:

   ```
   Essay Content í Foundry Pipeline í AI Analysis í Chatbot Response
   ```

## Development

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Supabase PostgreSQL with RLS
- **AI**: Foundry pipeline integration (optional)
- **State Management**: React hooks and context

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
