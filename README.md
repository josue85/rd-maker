This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Variables

To run this application locally, you will need to create a `.env.local` file in the root of the project with the following environment variables:

### Authentication (NextAuth & Google OAuth)
*   **`NEXTAUTH_SECRET`**: A random string used to hash tokens, sign/encrypt cookies, and generate cryptographic keys within NextAuth.js.
*   **`GOOGLE_CLIENT_ID`**: The OAuth Client ID from your Google Cloud Console. Used to authenticate users so they can log in.
*   **`GOOGLE_CLIENT_SECRET`**: The OAuth Client Secret from your Google Cloud Console. Pairs with the Client ID to authorize the application.

### Google APIs & AI
*   **`GEMINI_API_KEY`**: Your API key from Google AI Studio. This is required for the application to use the Gemini model (`@google/genai`) to parse and extract requirements from the source texts.
*   **`NEXT_PUBLIC_GOOGLE_API_KEY`**: (Optional/Client-Side) Your public Google API key. Used by the Google Drive Picker component on the frontend to allow users to select SOWs and BRDs from their Google Drive.

### Atlassian Integrations (Jira & Confluence)
*   **`JIRA_DOMAIN`**: The base domain for your Jira instance (e.g., `enova.atlassian.net` or `https://enova.atlassian.net`).
*   **`JIRA_EMAIL`**: The email address of the service account or user that will be used to authenticate with the Jira API.
*   **`JIRA_API_TOKEN`**: The API token generated from your Atlassian account settings. Used to authenticate API requests to fetch Epic and Subtask data.
*   **`CONFLUENCE_PAT`**: A Personal Access Token for Confluence. Used to scrape Wiki page contents to provide additional context to the AI model.

---

## Getting Started
First, install dependancies
```bash
npm install
```

Next, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
