import express from 'express';
import emailVerificationController from '../controllers/emailVerificationController.js';

const verifyEmailRouter = express.Router();


verifyEmailRouter.get('/', emailVerificationController.emailVerificationPromptDisplay);

verifyEmailRouter.post('/resend', emailVerificationController.resendVerificationEmail);

verifyEmailRouter.get('/:userId/:tokenId', emailVerificationController.verifyEmailAddressLink);




export default verifyEmailRouter;