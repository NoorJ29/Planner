# Setting up your Nova app

This takes about 30 minutes, and you only do it once. Do it on your laptop. Everything is free.

You'll do three things:

1. Create a free Firebase database so your phone and laptop can sync.
2. Put the app online for free with GitHub Pages.
3. Install it on your laptop and your phone.

Before you start, unzip `planner.zip` into a folder. You'll need these files:
`index.html`, `config.js`, `manifest.webmanifest`, `sw.js`, the icon files (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and the four `sc-….png` quick-action icons), and `firestore.rules`.

---

## Step 1: Create your Firebase database

1. Go to **console.firebase.google.com** and sign in with a Google account.
2. Click **Create a project** (it may say **Add project**). Name it `planner`. When asked about Google Analytics, switch it off, then click **Create project**.
3. **Turn on sign-in:**
   1. In the left menu, open **Build → Authentication**, then click **Get started**.
   2. Under **Sign-in method**, click **Email/Password**.
   3. Switch on the first toggle only, then click **Save**.
4. **Create the database:**
   1. In the left menu, open **Build → Firestore Database**, then click **Create database**.
   2. Pick a location near you.
   3. Choose **Start in production mode**, then click **Create**.
5. **Protect your data:**
   1. Open the **Rules** tab of Firestore.
   2. Delete everything in the box.
   3. Open `firestore.rules` from the zip in any text editor, copy all of it, and paste it into the box.
   4. Click **Publish**.

   These rules mean only you can see your own tasks.

## Step 2: Connect the app to your database

1. In Firebase, click the **gear icon** (top left, next to "Project Overview") and choose **Project settings**.
2. Scroll down to **Your apps** and click the **`</>`** (Web) icon.
3. Name the app `Nova`. Leave "Firebase Hosting" unticked, then click **Register app**.
4. Firebase shows a block of code containing `const firebaseConfig = { apiKey: "...", ... }`. Keep that page open.
5. Open `config.js` in a text editor such as Notepad or TextEdit.
6. Replace each `PASTE_...` value with the matching value from Firebase. Keep the quote marks. It should end up looking like this, with your own values:

   ```js
   window.PLANNER_FIREBASE_CONFIG = {
     apiKey: "AIzaSyB...",
     authDomain: "planner-1a2b3.firebaseapp.com",
     projectId: "planner-1a2b3",
     storageBucket: "planner-1a2b3.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

7. Save the file.

It's fine for these values to be public. The rules you set in Step 1 are what keep your data private.

## Step 3: Put the app online with GitHub Pages

1. Go to **github.com** and create a free account if you don't have one. Your username becomes part of your app's address.
2. Click **+** (top right), then **New repository**.
   1. Name it `planner` and set it to **Public**.
   2. Click **Create repository**.
3. On the next page, click the link **uploading an existing file**.
4. Drag in all the files except `SETUP.md`. That includes the `config.js` you just edited.
5. Click **Commit changes**.
6. Turn on hosting:
   1. Go to the repository's **Settings → Pages**.
   2. Under **Branch**, choose **main** and **/ (root)**, then click **Save**.
7. Wait 1–2 minutes and refresh the page. It will show your address, for example:
   **https://yourname.github.io/planner/**

## Step 4: Allow your address in Firebase

1. Back in Firebase, go to **Authentication → Settings → Authorized domains**.
2. Click **Add domain** and enter `yourname.github.io`, using your own GitHub username.
3. Click **Add**.

## Step 5: Install it

**On your laptop (Chrome or Edge):**

1. Open your app's address.
2. Tap **Create account** and choose an email and password.
3. Click the **install icon** at the right end of the address bar (a small screen with an arrow). You can also use **⋮ → Cast, save and share → Install page as app**.

**On your Android phone (Chrome):**

1. Open the same address.
2. Tap **Sign in** and use the same email and password.
3. Tap **⋮ → Install app**. On some phones it says **Add to Home screen → Install**.

The Nova icon now appears in your app drawer. It opens full-screen and works offline. Anything you change on one device appears on the other within a few seconds.

---

## Step 6 (optional): Connect Google Calendar

This lets Nova show your Google Calendar events and add tasks to your calendar, so you get Google's reliable phone alarms. It takes about 10 minutes and is free. Skip it if you don't need it.

1. Go to **console.cloud.google.com** and sign in with the Google account whose calendar you use.
2. At the top, click the project picker, then **New project**. Name it `planner` and click **Create**. Make sure it's selected afterwards.
3. **Turn on the Calendar API:** search the top bar for **Google Calendar API**, open it, and click **Enable**.
4. **Set up the consent screen:**
   1. Go to **APIs & Services → OAuth consent screen** (it may be called **Google Auth Platform → Branding**). Click **Get started**.
   2. App name: `Nova`. Support email: your email. Audience: **External**. Contact email: your email. Finish and **Create**.
   3. Open **Audience** (or **Test users**) and click **Add users**. Add your own email, plus any family members who want to connect their calendars.
5. **Create the client ID:**
   1. Go to **APIs & Services → Credentials** (or **Clients**) and click **Create credentials → OAuth client ID**.
   2. Application type: **Web application**. Name: `Nova`.
   3. Under **Authorized JavaScript origins**, click **Add URI** and enter `https://yourname.github.io` (your GitHub Pages address without `/planner/`).
   4. Click **Create**, then copy the **Client ID**. It ends in `.apps.googleusercontent.com`.
6. Open `config.js` and paste it between the quotes on the last line:

   ```js
   window.PLANNER_GOOGLE_CLIENT_ID = "1234567890-abc123.apps.googleusercontent.com";
   ```

7. Upload `config.js` to GitHub again (see "Updating the app" below).
8. In Nova, go to **More → Settings → Calendar → Connect**. Google shows a warning that the app isn't verified. That's expected for your own personal app: tap **Continue**, then allow access.

**Good to know about Google Calendar:**
- For security, browsers only keep Google's permission for about an hour. After that, Plan and Home show a **Tap to refresh Google Calendar** button. Your events stay visible in the meantime.
- Each person connects their own calendar on their own devices.

## Step 7: Shared family lists

Shared lists use extra security rules. If you set up Nova before this feature existed, update the rules once:

1. In Firebase, go to **Firestore Database → Rules**.
2. Replace everything with the contents of the new `firestore.rules` file and click **Publish**.

Then, to share:
- **You:** More → Shared lists → New shared list → **Invite**. Send the code or link.
- **Family:** install Nova from the same address (yourname.github.io/planner), create their own account, then open your link, or go to More → Shared lists → **Join with a code**.

Everyone only sees the lists they've joined. Their personal tasks, notes and money stay private.

## Good to know

- **Smart quick add:** type naturally in Plan, like “Gym tomorrow 6pm for 1h #personal !”. Chips above the bar show what was understood.
- **App lock:** set a PIN in More → Settings → Privacy. If you forget it, sign in with your account password to reset it.
- **Quick actions:** long-press the Nova icon on your phone to add a task, log an expense, write a note or open today's journal.
- **Share to Nova:** in any app, tap **Share** and choose **Nova** to save text or a link as a note.
- **Reminders:** switch them on in **More → Settings → Notifications** on each device. They arrive while the app is open or was used recently. For alarms you can't miss, open a task and tap **Add to Google Calendar**.
- **Exporting:** notes and journal entries export to PDF or Word from the **Export** button. The exporter downloads the first time you use it, so do that once while online.

- **Any tasks you made before signing in** are moved into your account automatically the first time you sign in on that device.
- **Offline:** you can keep adding and ticking off tasks. The label at the top right shows "Offline", and your changes sync when you reconnect.
- **Forgot your password?** Type your email on the sign-in screen and tap **Forgot password?**
- **Updating the app later:**
  1. Upload the changed files to your GitHub repository.
  2. Open `sw.js` and raise the number in `planner-v7` (to v8, then v9, and so on), then upload it too.
  3. Close the app fully and reopen it, twice if needed.
- **Free limits:** Firebase's free plan allows tens of thousands of reads and writes a day. That's far more than one person's planner will use.

## If something goes wrong

| What you see | What to do |
|---|---|
| "Sync isn't set up yet" | `config.js` still has `PASTE_...` values, or it wasn't uploaded. Recheck Step 2 and upload it again. |
| "Email sign-in isn't switched on" | Redo Step 1, part 3. |
| "Sync was refused" | The rules weren't published. Redo Step 1, part 5. |
| No "Install app" option | Make sure you're in Chrome and the address starts with `https://`. Reload the page once, then check the ⋮ menu again. |
| The site shows a 404 page | Wait a few minutes after turning on Pages, and check that `index.html` is at the top level of the repository, not inside a folder. |
