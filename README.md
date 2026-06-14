# 🚀 CiviTrack

### See a Problem. Report It. Track the Fix.

CiviTrack is a modern civic issue reporting platform that enables citizens to report public infrastructure and community issues using photos, descriptions, and precise GPS locations. The platform helps authorities efficiently manage, track, and resolve complaints while maintaining transparency throughout the resolution process.

---

## 🌟 Features

### 👥 Citizen Features

* User Registration & Authentication
* Report Public Issues
* Upload Multiple Images
* Automatic GPS Location Detection
* View Exact Complaint Location
* Get Directions to Complaint Location
* Real-Time Complaint Tracking
* Anonymous Complaint Submission
* Complaint History
* Status Updates & Notifications

### 🛠️ Admin Features

* Centralized Complaint Dashboard
* View Complaint Details
* Access Uploaded Evidence Images
* View Exact Complaint Location
* Navigate to Complaint Location
* Update Complaint Status
* Add Resolution Notes
* Upload Resolution Images
* Track Complaint Progress
* Generate Reports & Analytics

---

## 📍 Complaint Categories

* Road Damage
* Potholes
* Garbage Issues
* Water Leakage
* Street Light Problems
* Drainage Issues
* Public Property Damage
* Tourist Place Issues
* Traffic Signal Problems
* Environmental Concerns
* Public Safety Issues
* Other Civic Problems

---

## 📱 Core Functionality

### Complaint Submission

Users can submit:

* Complaint Title
* Description
* Images
* Exact GPS Location
* Address Details
* Category Selection
* Anonymous Reports

### Location & Navigation

* Live GPS Location Detection
* Google Maps Integration
* Individual Complaint Location View
* Open in Google Maps
* Get Directions Feature
* Real-Time Route Navigation

### Complaint Tracking

* Pending
* Under Review
* Assigned
* In Progress
* Resolved
* Closed

---

## 🏗️ Tech Stack

### Frontend

* React Native (Expo)
* React.js
* Redux Toolkit

### Backend

* Node.js
* Express.js

### Database

* MongoDB Atlas

### Storage

* Cloudinary

### Authentication

* JWT Authentication
* Bcrypt

### Maps & Location

* Google Maps API
* Google Places API
* Google Directions API
* Google Geocoding API

### AI Features

* Google Gemini API

### Notifications

* Firebase Cloud Messaging (FCM)

---

## 🔒 Security Features

* JWT Authentication
* Password Hashing
* Protected Routes
* Input Validation
* Role-Based Access Control
* Secure API Endpoints

---

## 📂 Project Structure

```bash
CiviTrack/
│
├── client/
│   ├── mobile-app/
│   └── web-app/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── services/
│   └── utils/
│
├── docs/
│
└── README.md
```

## ⚙️ Environment Variables

Create a `.env` file inside the backend directory:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GOOGLE_MAPS_API_KEY=your_google_maps_api_key

GEMINI_API_KEY=your_gemini_api_key
```

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/your-username/civitrack.git

cd civitrack
```

### Install Backend Dependencies

```bash
cd backend

npm install
```

### Start Backend Server

```bash
npm run dev
```

### Install Frontend Dependencies

```bash
cd client

npm install
```

### Run Application

```bash
npm start
```

---

## 📊 Future Enhancements

* AI-Based Complaint Classification
* Duplicate Complaint Detection
* Community Voting System
* Government Department Assignment
* Real-Time Chat Support
* Complaint Heatmaps
* Multi-Language Support
* Progressive Web App (PWA)
* iOS Application Support

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

Fork the repository, create a new branch, and submit a pull request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Developer

**Naveenkumar**

Full Stack Web Developer

Building technology solutions that create positive social impact.

---

### ⭐ If you find this project useful, don't forget to star the repository!
