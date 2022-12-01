import mongoose from 'mongoose';


import './db.mjs';
// assumes that User was registered in `./db.mjs`
const User = mongoose.model('Users');
const Token = mongoose.model('Tokens');

const startAuthenticatedSession = (req, user, cb) => {
    // TODO: implement startAuthenticatedSession
    req.session.regenerate((err) => {
        if (!err) {
            // set a property on req.session that represents the user
            req.session.user = user;
        } else {
            // log out error
            console.log(err);
        }
        // call callback with error
        cb(err);
    });
};

const endAuthenticatedSession = (req, cb) => {
    // TODO: implement endAuthenticatedSession
    req.session.destroy((err) => { cb(err); });
};



// creates middleware that redirects to login if path is included in authRequiredPaths
const authRequired = authRequiredPaths => {
    return (req, res, next) => {
        if (authRequiredPaths.includes(req.path)) {
            if (!req.session.user) {
                res.redirect('/');
            } else {
                next();
            }
        } else {
            next();
        }
    };
};

export {
    startAuthenticatedSession,
    endAuthenticatedSession,
    authRequired
};
