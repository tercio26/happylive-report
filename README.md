# HappyLive Report

Internal web app for sales revenue statistics, analysis, and reporting from e-commerce platforms.

## Features

- **Dashboard**: Revenue charts by channel, product, and week
- **Data Import**: Upload multiple Excel files from Shopee → review → save to database
- **Access Control**: User management with role-based permissions
- **Multi-platform**: Shopee support (TikTok Shop planned)

## Tech Stack

- **Frontend**: Vue 3 + Options API + TypeScript + Naive UI + Less
- **Charts**: ECharts + vue-echarts
- **State**: Pinia
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

## Getting Started

```bash
npm install
npm run dev
```

## Documentation

See [`CLAUDE.md`](./CLAUDE.md) for architecture details, coding conventions, and design decisions.
