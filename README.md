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

Run these in this project folder on your computer:

```bash
npm install -g eas-cli
eas login
eas init                                  # links this folder to your Expo project
eas integrations:supabase:connect         # creates a Supabase project (or add --link <project-ref> to use one you made)
npm run setup                             # installs everything at versions matching the Expo SDK
```

`connect` saves the Supabase URL and publishable key to `.env.local` and to your Expo project, so cloud builds get them too.

Then in Supabase (`eas integrations:supabase:dashboard` opens it):
1. **SQL Editor → New query**, paste all of `supabase/schema.sql`, press **Run**.
2. **Authentication → Sign In / Providers → Email**, turn off **Confirm email** so friends can sign up without an email link.

Start the app with `npx expo start` and scan the QR code with Expo Go.
