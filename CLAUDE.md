# CLAUDE.md — HappyLive Report

This file provides context and conventions for AI assistants working in this project.

---

## Project Overview

Internal web app replacing a manual weekly reporting workflow:
export Excel from Shopee → calculate in Excel → screenshot → compile report for management.

**Users**: A few internal staff (admin/editor roles), others are view-only.
**Data sensitivity**: Company revenue data — sensitive. RLS must be added before production.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + **Options API** + TypeScript |
| UI Library | Naive UI |
| Icons | `@vicons/carbon` |
| CSS | Less |
| Charts | ECharts + vue-echarts |
| State | Pinia |
| Router | Vue Router |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Backend | None — FE connects directly to Supabase |
| Code style | Prettier + ESLint |

---

## Coding Conventions

- **Always use Options API** — do not use Composition API or `<script setup>`. User prefers Options API for readability.
- Use **Less** for component styles (`<style lang="less">`)
- TypeScript for all logic
- English for: code, comments, variable names, function names, file names, documentation
- Vietnamese for: UI display text only (labels, titles, messages shown to users)
- Prettier + ESLint enforced

---

## Features

### 1. Auth & Permissions
- Login with email/password via Supabase Auth
- `user_permissions` table stores permission keys per user
- Fetch permissions after login, cache in Pinia store
- Access control enforced at **UI level** (show/hide, disable)
- **TODO (post-MVP):** Add Supabase RLS policies for DB-level protection — revenue data is sensitive

### 2. Data Import
- Support uploading **multiple xlsx files** at once
- Parse files client-side using the `xlsx` library
- Merge data from all files into a single review table
- Allow editing data before saving
- Validate: duplicate dates, wrong format, missing columns, etc.
- Confirm → batch INSERT into Supabase
- **Do not store original files** — only save parsed data
- Currently supports **Shopee** template; TikTok Shop planned

### 3. Dashboard & Reports
Charts based on existing report templates:
- Total revenue by sales channel (horizontal bar chart)
- Top 10 best-selling products
- Revenue heatmap by product and channel
- Revenue share by channel (pie chart)
- Top products — revenue breakdown by channel (stacked bar)
- Confirmed revenue vs. total across 3 channels (comparison chart)

Shopee sales channels: **Thẻ SP**, **Video**, **Affiliate**

---

## Folder Structure

```
src/
├── assets/
│   └── data/raw/shopee/     # Sample xlsx files (dev only, do not commit real data)
├── components/
│   ├── common/              # Shared components
│   └── charts/              # Chart components
├── layouts/
│   ├── AuthLayout.vue
│   └── MainLayout.vue
├── pages/
│   ├── LoginPage.vue
│   ├── DashboardPage.vue
│   ├── ImportPage.vue
│   └── UsersPage.vue        # Admin only
├── router/
│   └── index.ts
├── stores/
│   ├── auth.ts
│   └── permissions.ts
├── services/
│   ├── supabase.ts          # Supabase client
│   └── shopee-parser.ts     # Shopee xlsx parser
└── types/
    └── index.ts
```

---

## Database

Schema is designed incrementally as features are built. Confirmed tables:
- `user_permissions` — permission keys per user
- Shopee stats table — details TBD after xlsx analysis

---

## Permission Keys

| Key | Description |
|---|---|
| `import_data` | Can import xlsx files |
| `manage_users` | Can manage users and permissions |
| `view_reports` | Can view reports (default for all) |

---

## Important Notes

- Revenue data is **sensitive** — RLS policies must be added before production deployment
- Sample xlsx files in `src/assets/data/raw/shopee/` are for development only
- Supabase anon key will be exposed in the browser — **RLS is required** before going live
