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
            userName:String
        }
    ],
    tasks: [
        {
            body: String,
            dateAdded: {type: Date, default: Date.now},
            dateStart: {type: Date, default: Date.now},
            dateDeadline: {type: Date, default: Date.now}
        }
    ]
});

module.exports = mongoose.model('User', UserSchema);

