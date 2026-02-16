export default {
    resetExpires: 30000, //Time in milliseconds after which a password reset request is no longer valid
    verificationTokenExpires: 24 * 60 * 60 * 1000, //Email verification link valid for 24 hours
    cleanupInterval: 5000, //How often in milliseconds the server should check for expired password requests
    removeAfter: 300000, //Remove inactive games after 5 minutes (when all disconnected)
    inactiveActionTimeout: 30 * 60 * 1000 //Consider game inactive after 30 minutes with no socket activity
};