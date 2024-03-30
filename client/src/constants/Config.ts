export default (true/*process.env.NODE_ENV && process.env.NODE_ENV === 'development'*/) ? {
    apiRoot: 'http://localhost:3001/',
    socketRoot: 'http://localhost:3002/',
    recaptchaSiteKey: '6LeeaRMlAAAAAI_egLHzCjhNnwdy2mNem7901WX_'
} : {
    apiRoot: 'http://www.death-card-game.com:443/',
    socketRoot: 'http://www.death-card-game.com:7102/',
    recaptchaSiteKey: '6LccShIlAAAAAJ-wu1karIB5BDfFXe1NPv49_UwJ'
};
