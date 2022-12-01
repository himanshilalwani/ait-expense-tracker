import './db.mjs'
import express from 'express'
import path from 'path'
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

const app = express();
const Wallet = mongoose.model('Wallets');
const Budget = mongoose.model('Budgets');
const User = mongoose.model('Users');
const Token = mongoose.model('Tokens');

app.set('view engine', 'hbs');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
// console.log(path.join(__dirname, 'public'));
app.use(express.urlencoded({ extended: false }));

// app.use(session({
//     secret: 'keyboard cat',
//     resave: false,
//     saveUninitialized: true,
// }));

app.get('/', (req, res) => {
    res.render('login');
})
app.get('/sign-up', (req, res) => {
    res.render('signup');
})

app.post('/sign-up', (req, res) => {
    // console.log(req.body);
    User.findOne({ email: req.body.email }, (err, user) => {
        if (err) {
            return res.status(500).send({ msg: err.message });
        }
        else if (user) {
            return res.status(400).send({ msg: 'This email address is already associated with another account.' });
        }
        else {
            const pass = bcrypt.hashSync(req.body.password, 10)
            let curr;
            if (req.body.currency !== 'Select Currency') {
                curr = req.body.currency;
            }
            else {
                curr = None;
            }
            const newUser = new User({
                email: req.body.email,
                password: pass,
                currency: curr,
                budget: [],
                wallets: []
            })
            newUser.save((err) => {
                if (err) {
                    return res.status(500).send({ msg: err.message });
                }
                const newToken = new Token({
                    _userId: newUser._id,
                    token: crypto.randomBytes(16).toString('hex')
                })

                newToken.save(function (err) {
                    if (err) {
                        return res.status(500).send({ msg: err.message })
                    }

                    sgMail.setApiKey("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");
                    const mailOptions = {
                        from: 'moneylover.ait@gmail.com',
                        to: newUser.email,
                        subject: 'Account Verification Link',
                        text: 'Hello' + ',\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + newUser.email + '\/' + newToken.token + '\n\nThank You!\n'
                    };

                    sgMail
                        .send(mailOptions)
                        .then(() => {
                            const successMsg = 'A verification email has been sent to ' + newUser.email + '. It will expire after 24 hours. Make sure to check your spam folder as well.'
                            // return res.status(200).send('A verification email has been sent to ' + newUser.email + '. It will be expire after one day. If you have not got the verification Email, check your spam folder or click on resend token.');
                            res.render('signup', { 'success': successMsg });
                        }, err => {
                            // console.error(err);
                            // if (err.response) {
                            //     console.error(err.response.body);
                            // }
                            res.render('signup', { 'failure': 'There was some issue sending the verification email. Please try again later.' })
                        });
                })
            })
        }
    })
})

app.get('/confirmation/:email/:token', (req, res) => {
    Token.findOne(
        { token: req.params.token }, function (err, token) {
            if (!token) {
                res.render('signup', { 'expired': 'Your verification link may have expired. Please try again.' })
            }
            else {
                User.findOne(
                    { _id: token._userId, email: req.params.email }, function (err, user) {
                        if (!user) {
                            res.render('signup', { 'verFailed': 'Verification failed. Please try again.' })
                        }
                        else if (user.isVerified) {
                            res.render('login', { 'alreadyVerified': 'Account already verified!! Please log in.' });
                        }
                        else {
                            user.isVerified = true;
                            user.save((err) => {
                                if (err) {
                                    res.render('signup', { 'verFailed': 'Verification failed. Please try again.' });
                                }
                                else {
                                    res.render('login', { 'verified': 'Account Verified!! You can log in now.' })
                                }
                            })
                        }
                    }
                )
            }
        }
    )
})

app.post('/', (req, res) => {
    User.findOne(
        { email: req.body.email }, function (err, user) {
            if (err) {
                res.render('login', { 'unexpected': 'Sorry :( An unexpected error occur. Please try again.' });
            }
            else if (!user || !bcrypt.compareSync(req.body.password, user.password)) {
                res.render('login', { 'Incorrect': 'Email and Password do not match' });
            }
            else if (!user.isVerified) {
                res.render('login', { 'Unverified': 'Please verify your account first' });
            }
            else {
                res.render('add-wallet');
            }
        }
    )
})
app.get('/wallet/add', (req, res) => {
    res.render('add-wallet');
})

app.get('/budget/add', (req, res) => {
    res.render('add-budget');
})

app.post('/budget/add', (req, res) => {
    // console.log(req.body);
    // const obj = {}
    // obj['budgetName'] = req.body.name;
    const obj2 = {};
    if (Array.isArray(req.body.category)) {
        req.body.category.forEach((element, index) => {
            obj2[element] = req.body.amount[index];
        });
    }
    else {
        obj2[req.body.category] = req.body.amount;
    }

    // obj['setCategories'] = obj2;
    const newBudget = new Budget({
        name: req.body.name,
        categories: obj2
    })

    newBudget.save((err, savedBudget) => {
        if (savedBudget) {
            console.log(savedBudget);
            res.redirect('/budgets')
        }
        else {
            console.log(err);
            res.render('add-budget', { message: "Try Again!" });
        }
    })

})

app.post('/wallet/add', (req, res) => {
    const newWallet = new Wallet({
        name: req.body.name,
        amount: req.body.amount
    });

    newWallet.save((err, savedWallet) => {
        if (savedWallet) {
            console.log(savedWallet);
            res.redirect('/home')
        }
        else {
            console.log(err);
            res.render('add-wallet', { message: "Try Again!" });
        }
    })
})

app.get('/home', (req, res) => {
    Wallet.find({}).exec((err, wallets) => {
        if (wallets.length === 0) {
            res.render('home', { error: true })
        }
        else {
            res.render('home', { error: false, wallets: wallets })
        }
    })
})

app.get('/budgets', (req, res) => {
    Budget.find({}).exec((err, budgets) => {
        if (budgets.length === 0) {
            res.render('budgets', { error: true })
        }
        else {
            const newBudget = JSON.parse(JSON.stringify(budgets));
            // console.log(JSON.stringify(newBudget));
            newBudget.forEach((budget) => {
                budget['categories'] = JSON.stringify(budget['categories']);
            })
            res.render('budgets', { error: false, budgets: newBudget })
        }
    })
})

app.listen(process.env.PORT || 3000);


