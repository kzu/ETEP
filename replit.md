# Overview

**El Tiempo Es Plata** is a family task management application that gamifies household chores by allowing parents to create paid tasks for their children. The system tracks task completion, manages earnings, and handles payment processing between family members. Built with a modern full-stack architecture, the application uses React for the frontend, Express.js for the backend, and PostgreSQL for data persistence.

## Recent Updates (January 2025)
- Added role selection system: Users now choose their role (Parent or Child) after first login
- Implemented family invitation system: Parents can invite children via email
- Enhanced user onboarding with pending invitations display
- Added role-based access control for all features
- Implemented real-time notification system with WebSocket support
- Added notification icon with dropdown panel for real-time updates
- Enhanced notification management with mark-as-read functionality (✓ icon)
- Added accept/reject actions for family invitations with parent notifications
- Real-time family updates when invitations are accepted or rejected
- Enhanced time-block system for recurring tasks with clear block visualization
- Improved payment calculation display showing price per block and total amount
- Replaced task creation panel with task list view for parents
- Added "Nueva Tarea" button with modal popup for task creation
- Implemented optional multiple child assignment for tasks (tasks can be assigned to all children or specific ones)
- Updated database schema to use assignedToIds array instead of single assignedToId
- Changed recurring tasks from time-based (30-minute blocks) to unit-based system
- Tasks now use "units" instead of "time minutes" with flexible unit pricing
- Updated UI to show "price per unit" for recurring tasks instead of "price per 30min"
- Enhanced child interface to select number of units completed for recurring tasks

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design system
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Session-based authentication with automatic redirection handling

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: OpenID Connect (OIDC) with Replit Auth integration using Passport.js
- **Session Management**: Express sessions with PostgreSQL storage via connect-pg-simple
- **API Design**: RESTful endpoints with proper error handling and request logging middleware
- **Real-time Communication**: WebSocket server integrated with Express for live notifications
- **Notification Broadcasting**: User-based connection management for targeted real-time updates

## Database Design
- **Database**: PostgreSQL with Neon serverless connection pooling
- **ORM**: Drizzle ORM with TypeScript support
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Key Tables**:
  - Users (parents and children with role-based access, role nullable for new users)
  - Tasks (one-time and recurring with status tracking)
  - Task submissions (approval workflow)
  - Balances (accumulated and pending earnings)
  - Payments and notifications
  - Family invitations (parent-child relationship establishment)

## Authentication & Authorization
- **Provider**: Replit's OpenID Connect service
- **Strategy**: Passport.js with session persistence
- **Security**: HTTP-only cookies with secure flags and CSRF protection
- **Role-based Access**: Parent/child role differentiation with appropriate permissions

## External Dependencies

- **Database Hosting**: Neon PostgreSQL serverless
- **Authentication Provider**: Replit OIDC service
- **Development Platform**: Replit with live reload and error overlay
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Build Tools**: Vite for frontend bundling and esbuild for backend compilation
- **Session Storage**: PostgreSQL-backed session store for scalability