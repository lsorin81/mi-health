# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- **Start development server**: `npm start` or `npx expo start`
- **Platform-specific development**:
  - iOS: `npm run ios`
  - Android: `npm run android`
  - Web: `npm run web`
- **Linting**: `npm run lint`
- **Install dependencies**: `npm install`
- **Reset to blank project**: `npm run reset-project` (moves starter code to app-example/)

### Development Workflow
- After starting the dev server with `npm start`, press:
  - `i` for iOS simulator
  - `a` for Android emulator
  - `w` for web browser
  - `r` to reload the app
  - `m` to toggle menu

## Architecture Overview

### Project Structure
This is an Expo React Native project using TypeScript and file-based routing:

- **`/app`** - Main application with Expo Router file-based routing
  - `(tabs)/` - Tab navigation screens
  - `_layout.tsx` - Root layout with theme provider
- **`/components`** - Reusable UI components
  - Themed components that adapt to light/dark mode
  - Platform-specific implementations (`.ios.tsx` files)
- **`/constants`** - App constants, especially `Colors.ts` for theming
- **`/hooks`** - Custom React hooks for theme and color scheme

### Key Technologies
- **Expo SDK 53** with React Native 0.79.4
- **Expo Router** for file-based navigation
- **TypeScript** with strict mode enabled
- **React Navigation** for bottom tab navigation
- **Theme System** with automatic light/dark mode support

### Important Patterns
1. **File-based routing**: New screens are created by adding files to `/app`
2. **Themed components**: Use `ThemedText` and `ThemedView` from `/components` for automatic theme support
3. **Platform-specific code**: Use `.ios.tsx` extensions for iOS-specific implementations
4. **Absolute imports**: Use `@/` prefix for imports (configured in tsconfig.json)
5. **Theme colors**: Access via `useThemeColor` hook or `Colors` constant

### Development Notes
- The project uses the new React Native architecture
- Portrait orientation only (configured in app.json)
- Deep linking scheme: "mihealth"
- No test framework is currently configured