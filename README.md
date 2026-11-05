# Spot Mates

Post your meals and workouts, track calories, macros and water, and keep your crew honest.

Built with Expo (React Native) and Supabase.

## What's in this first version

- Accounts (email and password) and crews: start a crew or join one with a 6-letter code
- **Macros:** calorie ring (goal − food = remaining), protein / carbs / fat bars, water tracker with quick-add, today's meals
- **Meals** and **Workouts:** your own posts with photos, macros, exercises; workouts start collapsed and open on tap
- **Friends:** your crew's meals and workouts, with props and comments
- **Settings:** name, calorie goal, macros by percent or grams, water and workout goals, crew invite code
- Meal posts disappear from feeds after 3 days and all photos are deleted after 3 days to save space

Coming next: PRs, Progress (calendar, streaks, goal weight), color schemes, AI macro estimates.

## One-time setup

### 1. Supabase
1. Create a project at supabase.com.
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and press **Run**.
3. For easy testing: **Authentication → Sign In / Providers → Email**, turn off **Confirm email** (otherwise new accounts must click an email link first).
4. Copy **Project URL** and the **anon public** key from **Project Settings → API**.

### 2. App
```bash
cp .env.example .env      # paste the two Supabase values in
npm run setup             # installs everything at versions matching the Expo SDK
npx expo start            # scan the QR code with Expo Go
```

### 3. Expo builds
```bash
npx eas-cli init          # links this folder to your Expo project
npx eas-cli build --profile preview --platform all
```
Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as environment variables on your Expo project (expo.dev → project → Environment variables) so cloud builds get them.
