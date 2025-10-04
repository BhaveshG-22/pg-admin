# PixelGlow Admin Panel

Admin panel for managing PixelGlow presets. Built with Next.js, TypeScript, Prisma, and shadcn/ui.

## Features

### MVP (v0) - Shipped ✅

- **Preset List** (`/admin/presets`)
  - Search by title/slug (client-side fuzzy)
  - Filter by status (Active/Inactive) and provider
  - Sort by Newest, Oldest, Title A–Z
  - Table view with thumbnail, title, slug, provider, credits, status toggle, created date
  - Quick actions: Edit, Delete

- **Create Preset** (`/admin/presets/create`)
  - All core fields: title, slug, description, category, provider, credits, status, badge, thumbnailUrl, prompt
  - Auto-generate slug from title
  - Save & Publish

- **Edit Preset** (`/admin/presets/:id/edit`)
  - Update all fields
  - View read-only stats: totalGenerations, totalCreditsUsed
  - Delete preset
  - Export single preset JSON
  - Inline test interface (run test with input JSON)

- **Preset Detail** (`/admin/presets/:id`)
  - Overview card with all preset fields
  - Mini metrics: totalGenerations, totalCreditsUsed (lifetime)
  - Open in Studio link

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database

Update `.env` with your database credentials (same database as pg-dashboard):

```env
DATABASE_URL="your-database-url"
DIRECT_URL="your-direct-url"
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Push Schema to Database

```bash
npm run db:push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - redirects to `/admin/presets`.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Icons**: Lucide React

## API Routes

- `GET /api/admin/presets` - List presets (with search/filter/sort)
- `POST /api/admin/presets` - Create preset
- `GET /api/admin/presets/:id` - Get preset
- `PUT /api/admin/presets/:id` - Update preset
- `DELETE /api/admin/presets/:id` - Delete preset
- `PATCH /api/admin/presets/:id/toggle` - Toggle status
- `POST /api/admin/presets/:id/duplicate` - Duplicate preset
- `GET /api/admin/presets/:id/export` - Export JSON
- `POST /api/admin/presets/:id/test` - Test preset (mock)

## Database Schema

```prisma
model Preset {
  id               String   @id @default(cuid())
  title            String
  slug             String   @unique
  description      String?
  category         String?
  provider         String
  credits          Int      @default(1)
  status           Boolean  @default(true)
  badge            String?
  badgeColor       String?
  thumbnailUrl     String?
  prompt           String   @db.Text
  totalGenerations Int      @default(0)
  totalCreditsUsed Int      @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

## Future Enhancements (Post-MVP)

- Bulk actions
- Rich analytics (7/30/90d charts)
- Gallery view
- Audit logs
- Templates hub
- CSV export
- Advanced filters (credit range, badge color)
- Card/grid view toggle
- Revenue calculations

## Development

```bash
# Start dev server
npm run dev

# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Build for production
npm run build

# Start production server
npm start
```

## Notes

- Admin panel shares the same database as pg-dashboard
- Stats (totalGenerations, totalCreditsUsed) are updated externally when generations complete
- Test interface uses mock data - integrate with actual provider in production
