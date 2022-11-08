import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';


// assumes that User was registered in `./db.mjs`
const User = mongoose.model('Users');

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


const register = (username, email, password, errorCallback, successCallback) => {
    // TODO: implement register
    if (username.length < 8 || password.length < 8) {
        console.log("Error: Username or password is too short");
        errorCallback({ message: 'USERNAME PASSWORD TOO SHORT' });
    }
    else {
        User.findOne({ username: username }, (err, result) => {
            if (result) {
                console.log("Error: Username already exists");
                errorCallback({ message: 'USERNAME ALREADY EXISTS' });
            }
            else {
                const saltRounds = 10;
                bcrypt.hash(password, saltRounds, function (err, hash) {
                    if (!err) {
                        const newUser = new User({
                            // _id: new mongoose.Schema.Types.ObjectId(),
                            username: username,
                            email: email,
                            password: hash
                        });
                        newUser.save((err, savedUser) => {
                            if (savedUser) {
                                successCallback(newUser);
                            }
                            else if (err) {
                                // console.log(err)
                                errorCallback({ message: "DOCUMENT SAVE ERROR" });
                            }
                        });
                    }
                    else {
                        console.log(err);
                        errorCallback({ message: "HASHING FAILED" });
                    }
                });
            }
        });
    }
};

const login = (username, password, errorCallback, successCallback) => {
    // TODO: implement login
    User.findOne({ username: username }, (err, user) => {
        if (!err && user) {
            // compare with form password!
            bcrypt.compare(password, user.password, (err, passwordMatch) => {
                // regenerate session if passwordMatch is true
                if (!passwordMatch) {
                    console.log('Error: Incorrect Password');
                    errorCallback({ message: 'PASSWORDS DO NOT MATCH' });
                }
                else if (passwordMatch) {
                    successCallback(user);
                }
                else if (err) {
                    console.log(err);
                }
            });
        }
        else if (!user) {
            console.log('Error: User not found');
            errorCallback({ message: 'USER NOT FOUND' });
        }
        else if (err) {
            console.log(err);
        }
    });
};

// creates middleware that redirects to login if path is included in authRequiredPaths
const authRequired = authRequiredPaths => {
    return (req, res, next) => {
        if (authRequiredPaths.includes(req.path)) {
            if (!req.session.user) {
                res.redirect('/login');
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
    register,
    login,
    authRequired
};
