export default {
    resetExpires: 30000, //Time in milliseconds after which a password reset request is no longer valid
    cleanupInterval: 5000, //How often in milliseconds the server should check for expired password requests
    removeAfter: 300000 //Remove inactive games after 5 minutes
};