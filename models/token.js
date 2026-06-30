import mongoose from "mongoose";
import crypto from 'crypto';

const Schema = mongoose.Schema;

/**
 * Creates a random 32 byte hex code string. Raw token.
 * Example output: Gx8_mK9zXwQ4v2PjL1a7bC3dE5fG7hIiJk_LmNoPpQr
 * @returns 
 */
function createRandomTokenId() {
    return crypto.randomBytes(32).toString('hex');
}


/**
 * Creates a set of tokens: a raw token and a hashed token
 * @returns  a tokens object: \{ rawToken, hashedToken }
 */
function createTokens() {
    const rawToken = createRandomTokenId();
    const hashedToken = hashToken(rawToken);

    return { rawToken, hashedToken };
}

/**
 * Hashes a raw token before database storage
 * @param {*} token 
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}


/**
 * Returns true if the hashed token is derived from a hash of the raw token
 * @param {*} rawToken 
 * @param {*} hashedToken 
 * @returns 
 */
function tokensMatch(rawToken, hashedToken) {
    return hashedToken === hashToken(rawToken);
}


/**
 * Converts milliseconds to hours
 * @param {*} ms 
 * @returns 
 */
function msToHours(ms) {
    const seconds = ms / 1000;
    const minutes = seconds / 60;

    const hours = minutes / 60;

    return hours;
}

/**
 * Creates a token schema
 * @param {*} tokenExpiryLifetime The token's expiration lifetime (in hours)
 * @param {*} maxTokensCount How many tokens can be refreshed for the user in a given time interval
 * @param {*} maxTokensTimeInterval The time interval for hitting the max token refresh
 * @param {*} tokenUrlPrefix the token URL prefix {prefixURL}/:tokenUserName/:tokenId
 * @returns Returns a custom token schema
 */
function createTokenSchema(tokenExpiryLifetime, maxTokensCount, maxTokensTimeInterval, tokenUrlPrefix) {
    const tokenSchema = new Schema({
        userId: {
            type: Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        tokenId: {
            type: String,
            required: true,
            unique: true,
        },
        /**
         * The time which this token was generated (or most up-to-date time) (server UTC timestamp in MS)
         */
        generated: {
            type: Number,
            default: Date.now,
            required: true,
        },
        /**
         * History of previously generated verification tokens (generated server UTC timestamp in MS)
         */
        previouslyGenerated: {
            type: [Number],
            default: [],
        },
    });

    // --- AUTOMATIC CLEANUP ---
    // Automatically drops the document from MongoDB after its expiry lifetime passes
    tokenSchema.index({ generated: 1 }, { expireAfterSeconds: tokenExpiryLifetime * 60 * 60 });


    /**
     * Returns true if this generated token has expired
     */
    tokenSchema.virtual('expired').get(function () {
        const msSinceGenerated = Date.now() - this.generated;

        const hoursSinceGenerated = msToHours(msSinceGenerated);

        return hoursSinceGenerated >= tokenExpiryLifetime;
    });


    /**
     * Returns true if the user has generated more than the allowed email verifications in the restricted time
     */
    tokenSchema.virtual('maxGenerated').get(function () {
        let flaggedGenerations = 0;

        const generations = [this.generated, ...this.previouslyGenerated];

        for (const generatedTimeStamp of generations) {
            const msSinceGenerated = Date.now() - generatedTimeStamp;

            const hoursSinceGenerated = msToHours(msSinceGenerated);

            if (hoursSinceGenerated < maxTokensTimeInterval) {
                flaggedGenerations++;
                if (flaggedGenerations >= maxTokensCount) {
                    return true;
                }
            }
        }

        return false;

    });

    tokenSchema.virtual('expirationTimeInHours').get(function () {
        return tokenExpiryLifetime;
    });



    /**
     * Refreshes the token and pushes the last generated timestamp into the previouslyGenerated list
     */
    tokenSchema.methods.refreshToken = function () {

        const currentGenerated = this.generated;

        this.previouslyGenerated.push(currentGenerated);

        this.generated = Date.now();

        const { rawToken, hashedToken } = createTokens();

        this.tokenId = hashedToken;

        const tokenUrl = this.tokenUrl(rawToken);

        return {
            token: this,
            rawToken,
            tokenUrl
        };
    }

    /**
     * Returns the token URL using the raw token ID
     * @param {*} rawToken 
     * @returns 
     */
    tokenSchema.methods.tokenUrl = function (rawToken) {
        return `${tokenUrlPrefix}/${this.userId}/${rawToken}`;
    }


    /**
     * Finds a token document using the raw unhashed token ID
     * @param {*} rawTokenId 
     * @returns 
     */
    tokenSchema.statics.findTokenByRawId = async function (rawTokenId) {
        const hashedTokenId = hashToken(rawTokenId);

        const foundToken = await this.findOne({ tokenId: hashedTokenId });

        return foundToken;
    }


    /**
     * Creates a token for the user provided
     */
    tokenSchema.statics.createToken = function (user) {
        const { rawToken, hashedToken } = createTokens();
        const token = new this({
            userId: user._id,
            tokenId: hashedToken,
        });

        const tokenUrl = token.tokenUrl(rawToken);

        return {
            token,
            tokenUrl,
            rawToken,
        }
    }

    return tokenSchema;

}


export { createTokenSchema };