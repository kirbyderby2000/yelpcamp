import express from 'express';
import resetPasswordController from '../controllers/resetPasswordController.js';

const resetPasswordRouter = express.Router();


resetPasswordRouter.get('/', resetPasswordController.resetPasswordRequestDisplay);

resetPasswordRouter.post('/', resetPasswordController.resetPasswordRequest);

resetPasswordRouter.get('/:userId/:tokenId', resetPasswordController.displayPasswordResetForm);

resetPasswordRouter.post('/:userId/:tokenId', resetPasswordController.resetPassword);



export default resetPasswordRouter;