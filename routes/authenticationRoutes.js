import express from 'express';
import usersController from '../controllers/usersController.js';



const authenticationRoutes = express.Router();


// Display the registration page
authenticationRoutes.get('/register', usersController.showRegistrationPage);


// Register a user
authenticationRoutes.post('/register', usersController.registerUser);

// Display the login page
authenticationRoutes.get('/login', usersController.showLoginPage);

// Login the user
authenticationRoutes.post('/login', usersController.login);


// Logout GET request
authenticationRoutes.get('/logout', usersController.logout);

/**
 * Send the user to Google to log in
 */
authenticationRoutes.get('/auth/google', usersController.authenticateWithGoogle)

/**
 * Google redirects the user back here upon authentication with Google (from '/auth/google')
 */
authenticationRoutes.get('/auth/google/redirect', usersController.googleAuthenticationRedirect)



export default authenticationRoutes;