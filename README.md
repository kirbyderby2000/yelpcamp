# YelpCamp 🏕️

A feature-rich, full-stack web application designed to demonstrate proficiency in modern web architecture, security, and third-party API integration. This project serves as a capstone implementation of the YelpCamp curriculum, enhanced with production-ready security and user features.

## 🚀 Key Features
- **Secure Authentication:** Local strategy combined with Google OAuth2.
- **Account Security:** Custom token-based system for password resets and email verification using SHA256 hashing.
- **Geospatial Mapping:** Interactive campground visualization powered by MapBox.
- **Image Management:** Asynchronous handling and storage via Cloudinary.
- **Performance:** Async pagination for large campground and review datasets.
- **Transactional Comms:** Automated email notifications via Resend.

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Frontend:** EJS (Templating), Bootstrap (Responsive UI)
- **Database:** MongoDB, Mongoose
- **Security:** Joi (Validation), Helmet (HTTP Headers), Passport.js (Auth)
- **External Services:** MapBox (Geocoding), Cloudinary (Images), Resend (Email)

## 💡 Challenges & Solutions
*Detailed breakdown of technical hurdles, such as securing email tokens and implementing fuzzy search with MongoDB native indexing, can be found on my project About page: [http://yelpcampproject.com/about](http://yelpcampproject.com/about)

## ⚙️ Setup Instructions
1. Clone the repository: `git clone https://github.com/yourusername/yelpcamp-project.git`
2. Install dependencies: `npm install`
3. Configure environment variables (refer to `.env.example`):
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `SESSION_SECRET`
   - `MAPBOX_TOKEN_PUBLIC_CLIENT`, `MAPBOX_TOKEN_PRIVATE_SERVER`
   - `GOOGLE_CLIENT_SECRET',`GOOGLE_CLIENT_ID`
   - `RESEND_API_KEY`
4. Start the server: `node app.js`
