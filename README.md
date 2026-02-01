# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running Your Application

This application is configured for deployment with Firebase App Hosting, which is a service designed to run web applications like this one. GitHub is used for storing your code, but a hosting service is needed to make it live.

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

2.  **Deploy the Application**:
    Once you are logged in, run the following command from your project's root directory:
    ```bash
    firebase deploy --only apphosting
    ```

After the deployment is complete, the Firebase CLI will give you a public URL where your live application can be accessed.
