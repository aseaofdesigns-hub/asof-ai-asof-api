# ASOF AI Automation Platform

## Overview

This is an AI-powered automation platform called "As-of AI Automation" that allows users to run AI agents with configurable payloads and receive insights with confidence scores. The application features a dashboard for monitoring automation signals, visualizing confidence trends, and managing payment-gated access to run automations.

The platform follows a pay-per-use model with three tiers (Lite, Pro, Max) processed through Stripe payments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for smooth transitions
- **Charts**: Recharts for data visualization
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: REST endpoints defined in `shared/routes.ts` with Zod schemas for validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)
- **Schema Location**: `shared/schema.ts`
- **Tables**:
  - `signals`: Stores automation run results (agentId, payload, insight, confidence, timestamp)
  - `payments`: Tracks Stripe payment sessions and status

### API Structure
All API routes are defined with type-safe schemas in `shared/routes.ts`:
- `POST /api/create-payment`: Create Stripe checkout session
- `GET /api/verify-payment/:sessionId`: Verify payment status
- `POST /api/run`: Execute automation (requires valid payment session)
- `GET /api/signals`: Retrieve signal history

### Key Design Patterns
- **Shared Types**: Schema and route definitions in `shared/` folder are used by both client and server
- **Type-Safe API**: Zod schemas define request/response types with runtime validation
- **Path Aliases**: `@/` for client code, `@shared/` for shared code

## External Dependencies

### Payment Processing
- **Stripe**: Payment gateway for checkout sessions (requires `STRIPE_SECRET_KEY` environment variable)
- Payment flow: Create session → Redirect to Stripe → Verify on return

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **Drizzle Kit**: Database migrations via `npm run db:push`

### UI Component Library
- **shadcn/ui**: Pre-built accessible components using Radix UI primitives
- Configuration in `components.json` with New York style variant

### Fonts
- Google Fonts: Outfit (display), Plus Jakarta Sans (body), DM Sans, Fira Code, Geist Mono