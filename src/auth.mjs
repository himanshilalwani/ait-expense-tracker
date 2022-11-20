import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as sendgridTransport from 'nodemailer-sendgrid-transport';
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

// https://slgupta022.medium.com/email-verification-using-sendgrid-in-node-js-express-js-mongodb-c5803f643e09
const signup = (req, res, next) => {
    User.findOne({ email: req.body.email }, function (err, user) {
        // error occurs
        if (err) {
            return res.status(500).send({ msg: err.message });
        }
        // if email exists in the database i.e. email is associated with another user.
        else if (user) {
            return res.status(400).send({ msg: 'This email address is already associated with another account.' });
        }
        // if user does not exist into database then save the user into database for register account
        else {
            // password hashing for save into databse
            req.body.password = bcrypt.hashSync(req.body.password, 10);
            // create and save user
            user = new User({ email: req.body.email, password: req.body.password });
            user.save(function (err) {
                if (err) {
                    return res.status(500).send({ msg: err.message });
                }

                // generate token and save
                const token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
                token.save(function (err) {
                    if (err) {
                        return res.status(500).send({ msg: err.message });
                    }

                    // Send email (use verified sender's email address & generated API_KEY on SendGrid)
                    const transporter = nodemailer.createTransport(
                        sendgridTransport({
                            auth: {
                                api_key: process.env.SENDGRID_APIKEY,
                            }
                        })
                    )
                    var mailOptions = { from: 'no-reply@example.com', to: user.email, subject: 'Account Verification Link', text: 'Hello ' + req.body.email + ',\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + user.email + '\/' + token.token + '\n\nThank You!\n' };
                    transporter.sendMail(mailOptions, function (err) {
                        if (err) {
                            return res.status(500).send({ msg: 'Technical Issue!, Please click on resend for verify your Email.' });
                        }
                        return res.status(200).send('A verification email has been sent to ' + user.email + '. It will be expire after one day. If you not get verification Email click on resend token.');
                    });
                });
            });
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

// export {
//     startAuthenticatedSession,
//     endAuthenticatedSession,
//     register,
//     login,
//     authRequired
// };
