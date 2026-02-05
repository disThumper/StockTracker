# StockTracker

A real-time investment portfolio tracker built with React, Supabase, and Polygon.io API.

## Features

- Track multiple stock investments with real-time pricing
- Portfolio performance analytics and charts
- Historical data visualization with TradingView charts
- Secure authentication with Supabase
- Real-time price updates from Polygon.io

## Tech Stack

- **Frontend:** React (via CDN), TailwindCSS
- **Backend:** Supabase (PostgreSQL, Authentication, Real-time)
- **Market Data:** Polygon.io API
- **Charts:** Lightweight Charts library
- **Hosting:** Netlify

## Getting Started

### Prerequisites

- [Supabase account](https://supabase.com)
- [Polygon.io API key](https://polygon.io) (free tier available)
- [Netlify account](https://netlify.com) (for deployment)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/StockTracker.git
   cd StockTracker
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your credentials:
   - `SUPABASE_URL` - From your Supabase project settings
   - `SUPABASE_ANON_KEY` - From your Supabase project settings
   - `POLYGON_API_KEY` - From your Polygon.io dashboard

4. Open `index.html` in your browser or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx http-server
   ```

5. Navigate to `http://localhost:8000`

## Deployment to Netlify

### Automated Deployment (Recommended)

1. **Connect to Netlify:**
   - Log in to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub account
   - Select the `StockTracker` repository

2. **Configure build settings:**
   - Build command: (leave empty)
   - Publish directory: `.` (root directory)

3. **Set environment variables in Netlify:**
   - Go to Site settings → Environment variables
   - Add the following variables:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `POLYGON_API_KEY`

4. **Deploy:**
   - Click "Deploy site"
   - Netlify will automatically deploy on every push to `main`

### Manual Deployment

You can also drag and drop the project folder directly into Netlify.

## Supabase Setup

### Database Schema

Create the following tables in your Supabase project:

```sql
-- Investments table
CREATE TABLE investments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  purchase_price DECIMAL NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own investments"
  ON investments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investments"
  ON investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments"
  ON investments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments"
  ON investments FOR DELETE
  USING (auth.uid() = user_id);
```

## Project Structure

```
StockTracker/
├── index.html              # Main application (React component)
├── supabase-config.js      # Supabase configuration (not used currently)
├── package.json            # Node dependencies
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── netlify.toml            # Netlify deployment configuration
└── README.md               # This file
```

## Roadmap

- [ ] Migrate to React + Vite for better performance and development experience
- [ ] Add TypeScript support
- [ ] Implement server-side API key protection with Netlify Edge Functions
- [ ] Add portfolio analytics and reporting features
- [ ] Support for multiple asset types (crypto, bonds, etc.)

## Security Notes

⚠️ **Current Version:** API keys are embedded in the HTML file. This is acceptable for demo purposes with Supabase's Row Level Security, but not recommended for production.

🔒 **Coming Soon:** After migration to React/Vite, API keys will be properly secured using environment variables and server-side functions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC
