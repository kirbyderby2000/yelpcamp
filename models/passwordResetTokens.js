import mongoose from "mongoose";
import appConfig from "../config/appConfig.js";
import crypto from 'crypto';
import { createTokenSchema } from "./token.js";

const resetExpiration = appConfig.passwordResetOptions.resetExpiration;
const maxResetsCount = appConfig.passwordResetOptions.maxResetsCount;
const maxResetsTimeInterval = appConfig.passwordResetOptions.maxResetsTimeInterval;

const passwordResetTokensSchema = createTokenSchema(resetExpiration, maxResetsCount, maxResetsTimeInterval, '/resetpassword');

const PasswordResetTokens = mongoose.model('PasswordResetTokens', passwordResetTokensSchema);


export default PasswordResetTokens;