# GoaFYI Mobile App

A React Native mobile application for the GoaFYI event vendor marketplace platform.

## Features

- **Supabase Integration**: Full authentication and database support
- **NativeWind**: Tailwind CSS for React Native styling
- **TypeScript**: Type-safe development
- **Expo**: Cross-platform development

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

## Project Structure

- `src/components/` - Reusable UI components
- `src/screens/` - Screen components
- `src/services/` - API and business logic
- `src/context/` - React context providers
- `src/lib/` - Utility libraries
- `src/constants/` - App constants

## Converting from Next.js

This project has been converted from a Next.js web application while preserving:
- All UI components and styling
- Supabase backend integration
- Authentication flow
- Database schema and types
- Business logic and services

The main changes:
- Next.js pages → React Native screens
- Web-specific components → Mobile-optimized components
- CSS → NativeWind (Tailwind for React Native)
- Web navigation → React Navigation
