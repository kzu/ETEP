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
- Implemented unified task management with 4-tab system: Pendientes, Aprobadas, Rechazadas, Disponibles
- Added automatic tab switching when tasks are approved/rejected for better UX
- Enhanced task cards with status-specific styling (green for approved, red for rejected)
- Added edit functionality for available tasks with hover-based edit buttons
- Improved task submission display to show unit quantities and better formatting
- Added "Marcar todas como leídas" button to notification panel
- **CRITICAL**: Removed all currency conversion logic - amounts are stored and displayed as whole numbers (ARS) without cents conversion
- **NEW**: Implemented multi-parent family system with role-based permissions (Administrador/Colaborador)
- **NEW**: Added families and family_memberships database tables for scalable family management
- **NEW**: Enhanced invitation system to support parent-to-parent invitations with role specification
- **NEW**: Created comprehensive family management interface with member role management
- **NEW**: Only Administrador parents can remove family members and change roles
- **NEW**: Added family management page accessible via "Gestionar Familia" button in parent dashboard
- **UPDATED**: Colaborador (Collaborator) role now has full administrative permissions for all family operations except removing administrators from the family
- **UPDATED**: Collaborators can now invite children, create and manage tasks, approve/reject task submissions, manage payments, and receive real-time notifications about task activities
- **CRITICAL ARCHITECTURE CHANGE**: Removed foreign key constraint between task_submissions and tasks tables (January 3, 2025)
- **NEW SUBMISSION MODEL**: Task submissions now copy task data (title, description, type, payment amount) at submission time
- **TEMPLATE SYSTEM**: Tasks now serve exclusively as templates - modifications to tasks don't affect past submissions
- **PAYMENT PRESERVATION**: Historical submissions maintain their original payment amounts even when task templates are updated
- **AUTHENTICATION MIGRATION**: Successfully switched from Replit Auth to Auth0 with enhanced security and custom domain support (January 4, 2025)
- **STORAGE MIGRATION**: Completely migrated from PostgreSQL to Azure Table Storage exclusively - no database dependencies (January 4, 2025)
- **SESSION MANAGEMENT**: Switched from PostgreSQL-based sessions to in-memory storage for Auth0 compatibility (January 4, 2025)

# User Preferences

Preferred communication style: Simple, everyday language.
Currency: All amounts are in ARS (Argentine Pesos) as whole numbers - never convert to/from cents or assume USD conversion.

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
  - Tasks (serve as templates only - no foreign key relationship to submissions)
  - Task submissions (copy task data at submission time, independent of tasks table)
  - Balances (accumulated and pending earnings)
  - Payments and notifications
  - Family invitations (parent-child relationship establishment)
  - Families and family_memberships (multi-parent support with role-based access)

## Authentication & Authorization
- **Provider**: Auth0 authentication service (successfully migrated from Replit Auth)
- **Strategy**: Passport.js with Auth0 strategy and in-memory session storage
- **Security**: HTTP-only cookies with secure flags and CSRF protection
- **Role-based Access**: Parent/child role differentiation with appropriate permissions
- **Custom Domain Support**: Fully configured for both custom domains and Replit hosting
- **Session Storage**: In-memory storage using memorystore (no PostgreSQL dependency)

## External Dependencies

- **Data Storage**: Azure Table Storage (completely replaced PostgreSQL)
- **Authentication Provider**: Auth0 authentication service (replaced Replit OIDC)
- **Development Platform**: Replit with live reload and error overlay
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Build Tools**: Vite for frontend bundling and esbuild for backend compilation
- **Session Storage**: In-memory storage using memorystore (no database dependency)