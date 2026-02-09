
# PROJECT SYNOPSIS

### TITLE
My Vehicle Log (An Android Application for Vehicle Maintenance and Safety Management).

### INTRODUCTION
With the rapid growth in vehicle ownership, managing vehicle-related information such as maintenance records, service history, important documents, and emergency details has become a significant challenge for vehicle owners. Traditional methods like physical files, handwritten service books, or locally stored digital data are inefficient, insecure, and prone to loss or damage. Moreover, during emergencies or breakdown situations, the lack of immediate access to critical information such as emergency contacts and medical details can increase risk.

The proposed project, My Vehicle Log, is an Android-based application designed to provide a centralized, secure, and cloud-based platform for managing vehicle maintenance and safety information. The application allows users to store and access vehicle details, maintenance logs, documents, expenses, and emergency information anytime and from anywhere.

This project focuses on the practical application of cloud computing and mobile application development to create a real-world solution that improves vehicle management efficiency and enhances user safety.

### OBJECTIVES
- To design and develop an Android application for vehicle maintenance and safety management.
- To provide secure cloud-based storage for vehicle details and important documents using Firebase Firestore.
- To maintain a digital maintenance logbook including service history and expenses.
- To offer an emergency and breakdown mode with quick access to essential information.
- To implement automated reminders for vehicle servicing and document renewals via Firebase Cloud Messaging.
- To demonstrate the effective use of cloud-based backend services (Firebase) in mobile applications.
- To develop a scalable, reliable, and user-friendly system suitable for real-world use.

### SCOPE OF THE PROJECT
The scope of My Vehicle Log includes:
- User authentication (Email, Google, Anonymous) and secure access control.
- Management of multiple vehicles under a single user account.
- Cloud storage of vehicle documents such as registration, insurance, and pollution certificates.
- Maintenance log and expense tracking for each vehicle.
- Emergency support features including emergency contacts, medical details, and live location sharing.
- Notification and reminder services for maintenance and document expiry.
- Centralized cloud-based data storage and retrieval using Firebase Firestore.

This project is intended for academic and practical demonstration purposes. While it simulates real-world vehicle management, it does not integrate with government databases. The system design allows future enhancements and integrations.

### METHODOLOGY

#### 4.1 Requirement Analysis
- Study of existing vehicle maintenance systems.
- Identification of user needs and functional requirements.
- Analysis of cloud-based backend architecture (Firebase).

#### 4.2 System Design
- Designing application architecture using Android best practices (ViewModel, LiveData, Repositories).
- Structuring cloud database collections in Firebase Firestore.
- Planning secure document storage in Firebase.
- Designing a simple and intuitive user interface based on Material Design principles.

#### 4.3 Development
- **User Authentication**: Implementing login and registration using the Firebase Authentication for Android SDK.
- **Vehicle & Profile Management**: Developing Activities and Fragments with RecyclerViews to display and manage vehicle and user profile data.
- **Maintenance & Document Tracking**: Creating modules for logging maintenance records and uploading document images, storing data in Firestore.
- **Emergency Features**: Integrating Android's location services for live tracking and using Intents to initiate phone calls to emergency contacts.
- **Reminders and Notifications**: Implementing Firebase Cloud Messaging (FCM) on the client and deploying a Firebase Cloud Function for scheduled, automated reminder notifications.

#### 4.4 Testing
- Unit testing of business logic using JUnit.
- UI testing of Activities and Fragments using Espresso.
- Functional testing of all application modules, including data storage/retrieval from Firestore.
- Testing document upload, download, and viewing.
- Testing the end-to-end flow of notification and reminder services.

#### 4.5 Deployment
- Deploying the Firebase backend (Firestore rules, Cloud Functions).
- Applying data security and access rules in Firestore.
- Preparing the final application package (APK/AAB) for demonstration and evaluation, with potential for Google Play Store submission.
