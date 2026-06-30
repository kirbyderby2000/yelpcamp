import Joi from 'joi';
import sanitizeHtml from 'sanitize-html';

// Our HTML JOI Extension function
const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML!' // Here we define our own error message when one is encountered
    },
    rules: {
        // Here we're creating our own custom validation rule called .escapeHTML()
        escapeHTML: {
            // This is called by JOI to validate values
            validate(value, helpers) {

                const clean = sanitizeHtml(value, {
                    allowedTags: [], // Strips all HTML tags
                    allowedAttributes: {}, // We can specify attributes we want allows in our HTML
                });

                // If the value was actually sanitized, then it contained html
                if (clean !== value) {
                    return helpers.error('string.escapeHTML', { value });
                }
                return clean;
            }
        }
    }
});


// Create your custom Joi instance
/**
 * Custom JOI instance with an extension to .escapeHTML() on string type input
 */
const CustomJoi = Joi.extend(extension);

export default CustomJoi;