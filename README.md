# StockTracker - Investment Portfolio Tracker

A modern React/TypeScript application for tracking your investment portfolio with real-time stock data, technical analysis, and performance metrics.

## Features

- **Portfolio Management**: Track multiple stocks with cost basis and share counts
- **Real-time Data**: Live stock prices via Polygon.io API
- **Market Indexes**: Monitor Dow Jones, S&P 500, and NASDAQ
- **Technical Analysis**: RSI, moving averages, support/resistance levels
- **Financial Metrics**: Revenue growth, margins, and fundamental data
- **Interactive Charts**: Historical price charts with technical indicators
- **AI Recommendations**: Buy/Sell/Hold signals based on technical and fundamental analysis
- **User Authentication**: Secure login with Supabase Auth
- **Cloud Database**: Portfolio data stored securely in Supabase

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Lightweight Charts
- **API**: Polygon.io for stock market data

## Setup

### Prerequisites

- Node.js (v18 or higher)
- A Supabase account and project
- A Polygon.io API key (free tier available)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd StockTracker
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your credentials:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
     - `VITE_POLYGON_API_KEY`: Your Polygon.io API key

4. Set up Supabase database:
   - Create a `portfolios` table with the following schema:
   ```sql
   CREATE TABLE portfolios (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     symbol TEXT NOT NULL,
     shares DECIMAL NOT NULL,
     avg_price DECIMAL NOT NULL,
     name TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Add RLS policies
   ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view their own portfolios"
     ON portfolios FOR SELECT
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert their own portfolios"
     ON portfolios FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update their own portfolios"
     ON portfolios FOR UPDATE
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can delete their own portfolios"
     ON portfolios FOR DELETE
     USING (auth.uid() = user_id);
   ```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Production Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Deployment

### Deploy to Netlify

#### Option 1: Connect GitHub Repository (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Migration to React/Vite complete"
   git push origin main
   ```

2. **Connect to Netlify**:
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Select your repository
   - Netlify will auto-detect the settings from `netlify.toml`

3. **Configure Environment Variables**:
   - In Netlify dashboard, go to: Site settings → Environment variables
   - Add the following variables:
     - `VITE_SUPABASE_URL` = your Supabase URL
     - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
     - `VITE_POLYGON_API_KEY` = your Polygon.io API key

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will automatically build and deploy
   - Future pushes to `main` branch will auto-deploy

#### Option 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Build and deploy
npm run build
netlify deploy --prod
```

#### Build Configuration

The `netlify.toml` file is pre-configured with:
- Build command: `npm run build`
- Publish directory: `dist`
- Node.js version: 18
- SPA redirect rules
- Security headers
- Asset caching

## Project Structure

```
src/
├── components/
│   └── Icons.tsx          # SVG icon components
├── lib/
│   ├── api.ts            # API configuration (Polygon.io)
│   └── supabase.ts       # Supabase client setup
├── types/
│   └── index.ts          # TypeScript type definitions
├── App.tsx               # Main application component
├── main.tsx              # Application entry point
├── index.css             # Global styles (Tailwind)
└── vite-env.d.ts         # Vite environment type definitions
```

## Environment Variables

All environment variables must be prefixed with `VITE_` to be accessible in the browser:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key
- `VITE_POLYGON_API_KEY`: Your Polygon.io API key

**Security Notes:**
- Never commit `.env` file to version control
- The Supabase anon key is safe to expose (protected by RLS policies)
- Use Row Level Security (RLS) policies in Supabase for data protection
- Rotate API keys if they are accidentally exposed

## Migration Notes

This project was migrated from a single-file HTML/React application to a modern React/TypeScript/Vite setup.

### Key Improvements:

1. **Better Performance**
   - Vite's fast HMR (Hot Module Replacement)
   - Optimized production builds with code splitting
   - ES modules for faster development

2. **Environment Variable Security**
   - API keys moved from source code to `.env` file
   - `.env` excluded from version control
   - `.env.example` template for other developers

3. **Modern Development Workflow**
   - TypeScript for type safety
   - Component-based architecture
   - Modular file structure
   - Better developer experience with Vite

4. **TypeScript Support**
   - Full type safety across the application
   - Better IDE autocomplete and error detection
   - Improved code maintainability

### Breaking Changes:

None - all functionality from the original application has been preserved.

### Legacy Files:

The old HTML-based files have been preserved:
- `index-OLD.html` - Original single-file app
- `index-OLD-2.html` - Pre-migration backup
- `supabase-config.js` - Old config file (no longer used)

## API Rate Limits

- **Polygon.io Free Tier**: 5 API calls per minute
- The app caches stock data and refreshes every 5 minutes
- Market indexes and portfolio data are fetched separately to optimize API usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC
