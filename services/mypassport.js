/**
 * Created by kihu on 2015-06-16.
 */
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;

var User = require('../models/User');

passport.use(new LocalStrategy({
        usernameField: 'name',
        session: false
    },
    function (username, password, done) {
        User.findOne({name: username}, function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, {message: 'Incorrect username.'});
            }
            user.comparePassword(password, function (err, isMatch) {
                if (err) return done(err);
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, {message: 'Invalid password'});
                }
            });
        });
    }
));

passport.use(new BearerStrategy(
    function (token, done) {
        User.findOne({token: token}, function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false);
            }
            return done(null, user, {scope: 'all'});
        });
    }
));

module.exports = passport;