/**
 * Created by kihu on 2015-06-11.
 */
var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
    name: String,
    //token: String
    invitations: [{
        fromUser: String
    }],
    accessedUsers: [
        {
            userName: String
        }
    ]
});

module.exports = mongoose.model('User', UserSchema);

