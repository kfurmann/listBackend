/**
 * Created by kihu on 2015-06-11.
 */
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');


var UserSchema = new mongoose.Schema({
    name: String,
    password: String,
    token: String,
    invitations: [{
        fromUser: String
    }],
    accessedUsers: [
        {
            userName: String
        }
    ]
});

UserSchema.pre('save', function (next) {
    var user = this;
    if (!user.isModified('password')) return next();

    bcrypt.genSalt(10, function (err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, null, function (err, hash) {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });
});

UserSchema.methods.comparePassword = function (candidatePassword, callback) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if(err) return callback(err);
        callback(null, isMatch);
    });
};

module.exports = mongoose.model('User', UserSchema);

