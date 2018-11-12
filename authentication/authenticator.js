/**   region_recommender_api - 12.11.2018
 *    Created by Florian Haimerl (florian.haimerl@tum.de)
 */
const passport = require("passport");
const passportJWT = require("passport-jwt");

const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;
const params = {
    secretOrKey: process.env.API_SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
    credentialsRequired: false

};

module.exports = function () {
    let strategy = new JwtStrategy(params, function (payload, done) {
        /*check version*/
        console.log("vor check", payload.version);
        if (payload.version.toString() === process.env.API_SECRET_VERSION) {
            console.log("nach check", process.env.API_SECRET_VERSION);

            return done(null, true);
        } else {
            return done(null, false);
        }
    });
    passport.use(strategy);
    return {
        initialize: function () {
            return passport.initialize();
        },
        authenticate: function () {
            return passport.authenticate("jwt", {session: false});
        }
    };
};