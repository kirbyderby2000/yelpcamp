import mongoose from "mongoose";
import appConfig from "../config/appConfig.js";
import crypto from 'crypto';
import { createTokenSchema } from "./token.js";

const Schema = mongoose.Schema;

const verificationTokenExpiration = appConfig.emailVerificationOptions.verificationTokenExpiration;
const maxEmailsSentInInterval = appConfig.emailVerificationOptions.maxEmailsSentInInterval;
const maxEmailTimeInterval = appConfig.emailVerificationOptions.maxEmailTimeInterval;

const verificationTokensSchema = createTokenSchema(verificationTokenExpiration, maxEmailsSentInInterval, maxEmailTimeInterval, '/verifyEmail');



const VerificationTokens = mongoose.model('VerificationTokens', verificationTokensSchema);


export default VerificationTokens;