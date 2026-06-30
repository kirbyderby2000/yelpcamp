# YelpCamp 🏕️

A feature-rich, full-stack web application designed to demonstrate proficiency in modern web architecture, security, and third-party API integration. This project serves as a capstone implementation of the YelpCamp curriculum, enhanced with production-ready security and user features.

Visit [https://yelpcampproject.com/](https://yelpcampproject.com/) for the live application.

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
1. Clone the repository: `git clone https://github.com/kirbyderby2000/yelpcamp.git`
2. Install dependencies: `npm install`
3. Configure environment variables (refer to `.env.example`):
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `SESSION_SECRET`
   - `MAPBOX_TOKEN_PUBLIC_CLIENT`, `MAPBOX_TOKEN_PRIVATE_SERVER`
   - `GOOGLE_CLIENT_SECRET`,`GOOGLE_CLIENT_ID`
   - `RESEND_API_KEY`
   - `MONGO_DB_ATLAS_URL`
5. Configure appConfig.js:
   - `port`, `devDomain`
7. Start the server: `node app.js`

## 🔑 Admin Dashboard Instructions
There is an administrative dashboard and admin user feature in this project. The admin dashboard allows you to lockdown the website from updates and suspend user accounts from write / delete / update activity. Admin users also have access to delete / update any campground entry.

Here's how to setup the admin feature:
1. Configure admin email addresses in `appConfig.js` under `adminEmailAddresses`
2. Create a user account with an email address in your `adminEmailAddresses` list (Google OAuth is fine as long as the Gmail account is the email address)
3. Visit the administrative dashboard link from the site navbar.


## 🌱 Seeding Instructions
There is a seeding feature to seed the database with campgrounds to play around with. Note that seed images cannot be deleted from Cloudinary because it would break reseeding the application on future seeds.

Here's how to setup the seed feature:
1. Configure the seed config in `appConfig.js` under `seedConfig`
   - `seedUserEmailAddress` : This is the email address that will be linked as the user account of the seed data. The account created with this email address will be injected the `seedUserId` as its ID, forcing an associated link between the seed data and the created user account.
2. In the project root, run `npm run seed`. Note that this will seed your database but also clear all campgrounds in it as well. It's essentially a fresh reset.
