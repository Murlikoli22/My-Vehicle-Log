# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running Your Application

This application is configured for deployment with Firebase App Hosting and Cloud Functions for Firebase.

### Prerequisites

Before you can deploy, you need to have the Firebase CLI (Command Line Interface) installed. If you don't have it, run the following command in your terminal:

```bash
npm install -g firebase-tools
```

### Deployment Steps

1.  **Login to Firebase**:
    Open your terminal and run:
    ```bash
    firebase login
    ```
    This will open a browser window for you to log into your Google account.

2.  **Deploy the Web Application (App Hosting)**:
    To deploy your Next.js frontend, run the following command from your project's root directory:
    ```bash
    firebase deploy --only apphosting
    ```
    After deployment, the Firebase CLI will give you a public URL for your live application.

3.  **Deploy Backend Cloud Functions**:
    This project includes a backend Cloud Function for sending notifications. To deploy it, you need to install its dependencies and then deploy it.

    Run the following commands from your project's root directory:

    ```bash
    # Install dependencies for the functions
    npm install --prefix functions

    # Deploy only the functions
    firebase deploy --only functions
    ```
    
    You can also deploy both the app and the functions at the same time by running:
    ```bash
    firebase deploy
    ```
