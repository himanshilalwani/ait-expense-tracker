import './db.mjs'
import express from 'express'
import session from 'express-session';
import path from 'path'
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as auth from './auth.mjs';
import sgMail from '@sendgrid/mail';
import hbs from 'hbs';
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

const app = express();
const Wallet = mongoose.model('Wallets');
const Budget = mongoose.model('Budgets');
const Expense = mongoose.model('Expenses');
const User = mongoose.model('Users');
const Token = mongoose.model('Tokens');

app.set('view engine', 'hbs');
hbs.registerHelper('json', function (content) {
    return JSON.stringify(content);
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
// console.log(path.join(__dirname, 'public'));
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
}));

// require authenticated user for /wallet/add path
app.use(auth.authRequired(['/add-wallet']));
app.use(auth.authRequired(['/budgets']));
app.use(auth.authRequired(['/add-budget']));
app.use(auth.authRequired(['/home']));
app.use(auth.authRequired(['/expenses']));
app.use(auth.authRequired(['/add-expense']));

// make {{user}} variable available for all paths
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

app.get('/', (req, res) => {
    res.render('login');
})
app.get('/sign-up', (req, res) => {
    res.render('signup');
})

app.post('/sign-up', (req, res) => {
    User.findOne({ email: req.body.email }, (err, user) => {
        if (err) {
            return res.status(500).send({ msg: err.message });
        }
        else if (user) {
            res.render('signup', { 'AlreadyAssociated': 'This email address is already associated with another account.' });
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

                    sgMail.setApiKey(process.env.SENDGRID_API);
                    const mailOptions = {
                        from: process.env.SENDGRID_EMAIL,
                        to: newUser.email,
                        subject: 'Account Verification Link',
                        text: 'Hello' + ',\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + newUser.email + '\/' + newToken.token + '\n\nThank You!\n'
                    };

                    sgMail
                        .send(mailOptions)
                        .then(() => {
                            const successMsg = 'A verification email has been sent to ' + newUser.email + '. It will expire after 24 hours. Make sure to check your spam folder as well.'

                            res.render('signup', { 'success': successMsg });
                        }, err => {

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

app.post('/confirmation/:email/:token', (req, res) => {
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
                auth.startAuthenticatedSession(req, user, (err) => {
                    if (!err) {
                        res.redirect('/home');
                    } else {
                        res.render('login', { 'unexpected': 'Sorry :( An unexpected error occur. Please try again.' })
                    }
                })
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
                auth.startAuthenticatedSession(req, user, (err) => {
                    if (!err) {
                        res.redirect('/home');
                    } else {
                        res.render('login', { 'unexpected': 'Sorry :( An unexpected error occur. Please try again.' })
                    }
                })
            }
        }
    )
})

app.get('/add-wallet', (req, res) => {
    User.
        findOne({ _id: req.session.user._id }).
        populate('wallets').
        exec(function (err, wallets) {
            if (err) {
                console.log(err);
            }
            if (wallets) {
                const userWallets = wallets['wallets'];
                const filteredWallets = userWallets.map(wallet => {
                    return { 'name': wallet.name, 'amount': wallet.amount };
                })

                // console.log(filteredWallets);
                User.findOne({ _id: req.session.user._id }).
                    populate('expenses').
                    exec(function (err, expenses) {
                        if (expenses['expenses']) {
                            const recent = expenses['expenses']['recent'];
                            const recentMap = recent.map(
                                (transaction) => {
                                    const obj = {};
                                    obj['category'] = Object.keys(transaction)[0]
                                    obj['amount'] = Object.values(transaction)[0]
                                    return obj;
                                }
                            )
                            res.render('add-wallet', { wallet: filteredWallets, recent: recentMap, currency: req.session.user.currency });

                        }
                        else {
                            res.render('add-wallet', { wallet: filteredWallets, currency: req.session.user.currency });

                        }
                    })
            }
        })
}
)

app.get('/add-budget', (req, res) => {
    res.render('add-budget', { currency: req.session.user.currency });
})

app.post('/add-budget', (req, res) => {
    User.findOne({ _id: req.session.user._id }, function (err, user) {
        if (user) {
            const obj2 = {};
            if (Array.isArray(req.body.category)) {
                req.body.category.forEach((element, index) => {
                    obj2[element] = req.body.amount[index];
                });
            }
            else {
                obj2[req.body.category] = req.body.amount;
            }
            const newBudget = new Budget({
                name: req.body.name,
                categories: obj2
            });
            newBudget.save((err, savedBudget) => {
                if (savedBudget) {
                    console.log(savedBudget);
                    user.budget.push(savedBudget._id);
                    user.save((err, savedUser) => {
                        if (savedUser) {
                            res.redirect('/budgets')
                        }
                        else {
                            console.log(err);
                            res.redirect('/budgets');

                        }
                    })

                }
                else {
                    console.log(err)
                    res.redirect('/budgets');
                }
            })
        }
    })

})

app.post('/budgets', function (req, res) {
    User.findOne({ _id: req.session.user._id })
        .populate('budget')
        .exec(function (err, budget) {
            if (budget) {
                const budgets = budget['budget'];
                const budgetNames = budgets.map(b => b.name);
                const filteredBudget = budgets.filter(b => b.name == req.body.budget)[0];
                User.findOne({ _id: req.session.user._id })
                    .populate('expenses')
                    .exec(function (err, user) {
                        if (user) {
                            const budgetExpenses = user['expenses']['budgetExpenses'];
                            let filteredExpenses = budgetExpenses.filter(b => Object.keys(b)[0] == req.body.budget).map(b => Object.values(b)[0])
                            filteredExpenses = filteredExpenses.map(
                                (transaction) => {
                                    const obj = {};
                                    obj['category'] = Object.keys(transaction)[0]
                                    obj['amount'] = Object.values(transaction)[0]
                                    return obj;
                                }
                            )
                            res.render('budgets', { currency: req.session.user.currency, names: budgetNames, bN: req.body.budget, bC: filteredBudget['categories'], expC: filteredExpenses });

                        }
                    })

            }
        })
})
app.post('/home', function (req, res) {
    User.findOne({ _id: req.session.user._id }, function (err, user) {
        if (user) {
            const newWallet = new Wallet({
                name: req.body.name,
                amount: req.body.amount
            });
            newWallet.save((err, savedWallet) => {
                if (savedWallet) {
                    // console.log(savedWallet);
                    user.wallets.push(savedWallet._id);
                    user.save((err, savedUser) => {
                        if (savedUser) {
                            res.redirect('/home')
                        }
                        else {
                            console.log(err);
                            res.redirect('/home');

                        }
                    })

                }
                else {
                    console.log(err)
                    res.redirect('/home');
                }
            })
        }
    })
})

app.get('/expenses', (req, res) => {
    res.render('expense', { currency: req.session.user.currency })
})

app.get('/add-expense', (req, res) => {
    User.findOne({ _id: req.session.user._id })
        .populate('budget')
        .exec(function (err, user) {
            if (user) {
                if (user['budget'].length > 0) {
                    const budgetNames = user['budget'].map(b => b.name);
                    res.render('add-expense', { bC: budgetNames });
                }
                else {
                    res.render('add-expense');
                }
            }
        })
})

app.post('/add-expense', (req, res) => {
    User.findOne({ _id: req.session.user._id }, function (err, user) {
        if (user) {
            if (user.expenses === undefined) {
                const newExpense = new Expense({});
                const obj1 = {};
                obj1[req.body.category] = req.body.amount;
                newExpense.recent.push(obj1);

                const obj2 = {}
                obj2[req.body['date-add']] = obj1;

                newExpense.dailyExpenses.push(obj2);
                if (Object.hasOwn(req.body, 'budget')) {
                    if (req.body.budget != 'None') {
                        const obj3 = {};
                        obj3[req.body.budget] = obj1;
                        newExpense.budgetExpenses.push(obj3);
                    }
                }

                newExpense.save(function (err, savedExpense) {
                    if (savedExpense) {
                        user.expenses = savedExpense._id;
                        user.save(function (err, savedUser) {
                            if (savedUser) {
                                res.redirect('/expenses');
                            }
                            else {
                                console.log(err);
                                res.redirect('/expenses');
                            }
                        })

                    }
                    else {
                        console.log(err)
                        res.redirect('/expenses');
                    }
                })
            }
            else {
                Expense.findOne({ _id: user.expenses }, (err, expense) => {
                    if (expense) {
                        if (expense.recent.length > 3) {
                            const last = expense.recent.pop();
                            expense.save(function (err, savedExp) {
                                const obj1 = {};
                                obj1[req.body.category] = req.body.amount;
                                expense.recent.unshift(obj1);
                                expense.save((err, saved) => {
                                    if (saved) {
                                        const obj2 = {}
                                        obj2[req.body['date-add']] = obj1;

                                        expense.dailyExpenses.push(obj2);
                                        expense.save(function (err, saved) {
                                            if (err) {
                                                console.log(err);
                                                // res.redirect('/expenses');
                                            }
                                            else {
                                                if (Object.hasOwn(req.body, 'budget')) {
                                                    if (req.body.budget != 'None') {
                                                        const obj3 = {};
                                                        obj3[req.body.budget] = obj1;
                                                        expense.budgetExpenses.push(obj3);
                                                        expense.save(function (err, saved) {
                                                            if (err) {
                                                                console.log(err);
                                                            }
                                                            else {
                                                                res.redirect('/expenses')
                                                            }

                                                        })
                                                    }
                                                    else {
                                                        res.redirect('/expenses');
                                                    }
                                                }
                                                else {
                                                    res.redirect('/expenses');
                                                }
                                            }
                                        })

                                    }
                                    else {
                                        res.redirect('/expenses');
                                    }
                                })
                            })
                        }
                        else {
                            const obj1 = {};
                            obj1[req.body.category] = req.body.amount;
                            expense.recent.unshift(obj1);
                            expense.save(function (err, saved) {
                                if (saved) {
                                    const obj2 = {}
                                    obj2[req.body['date-add']] = obj1;

                                    expense.dailyExpenses.push(obj2);
                                    expense.save(function (err, saved) {
                                        if (saved) {
                                            if (Object.hasOwn(req.body, 'budget')) {
                                                if (req.body.budget != 'None') {
                                                    const obj3 = {};
                                                    obj3[req.body.budget] = obj1;
                                                    expense.budgetExpenses.push(obj3);
                                                    expense.save(function (err, saved) {
                                                        if (err) {
                                                            console.log(err);
                                                        }
                                                        res.redirect('/expenses');
                                                    })
                                                }
                                                else {
                                                    res.redirect('/expenses')
                                                }
                                            }
                                            else {
                                                res.redirect('/expenses')
                                            }
                                        }
                                    })
                                }
                                else {
                                    res.redirect('/expenses')
                                }

                            })

                        }
                    };

                }
                )
            }
        }
    }
    )
    // res.redirect('/expenses');
}
);

app.get('/home', (req, res) => {
    User.
        findOne({ _id: req.session.user._id }).
        populate('wallets').
        exec(function (err, wallets) {
            if (err) {
                console.log(err);
            }
            if (wallets) {
                const userWallets = wallets['wallets'];
                const filteredWallets = userWallets.map(wallet => {
                    return { 'name': wallet.name, 'amount': wallet.amount };
                })
                // console.log(filteredWallets);
                User.findOne({ _id: req.session.user._id }).
                    populate('expenses').
                    exec(function (err, expenses) {

                        if (expenses['expenses']) {

                            const recent = expenses['expenses']['recent'];
                            const recentMap = recent.map(
                                (transaction) => {
                                    const obj = {};
                                    obj['category'] = Object.keys(transaction)[0]
                                    obj['amount'] = Object.values(transaction)[0]
                                    return obj;
                                }
                            )

                            const de = expenses['expenses']['dailyExpenses'];

                            const jan = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '01')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const feb = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '02')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const march = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '03')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const april = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '04')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const may = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '05')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const june = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '06')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const july = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '07')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const aug = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '08')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const sept = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '09')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const oct = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '10')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const nov = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '11')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const dec = de
                                .filter(obj => Object.keys(obj)[0].slice(5, 7) == '12')
                                .map(obj => Object.values(obj)[0])
                                .map(obj => Object.values(obj)[0])
                                .reduce((accumulator, value) => {
                                    return accumulator + parseInt(value);
                                }, 0);

                            const sumArray = [jan, feb, march, april, may, june, july, aug, sept, oct, nov, dec];

                            res.render('home', { wallet: filteredWallets, recent: recentMap, currency: req.session.user.currency, sumArray: sumArray });
                        }

                        else {
                            res.render('home', { wallet: filteredWallets, currency: req.session.user.currency, sumArray: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
                        }

                    })

            }
        })

}
)

app.post('/expenses', (req, res) => {
    User.findOne({ _id: req.session.user._id })
        .populate('expenses')
        .exec(function (err, expenses) {
            if (expenses['expenses']) {
                const de = expenses['expenses']['dailyExpenses'];
                const filteredDates = de
                    .filter(obj => Object.keys(obj)[0] == req.body.date)
                    .map(obj => Object.values(obj)[0])
                if (filteredDates.length != 0) {
                    const filteredMap = filteredDates.map(
                        (transaction) => {
                            const obj = {};
                            obj['category'] = Object.keys(transaction)[0]
                            obj['amount'] = Object.values(transaction)[0]
                            return obj;
                        }
                    )

                    res.render('expense', { exp: filteredMap, dt: req.body.date, exp2: JSON.stringify(filteredMap), currency: req.session.user.currency });

                }
                else {
                    res.render('expense', { message: 'You do not have any expenses tracked for the selected date.', dt: req.body.date, currency: req.session.user.currency })
                }

            }
            else {
                res.render('expense', { message: 'You do not have any expenses tracked for the selected date.', dt: req.body.date, currency: req.session.user.currency })
            }
        })
})


app.get('/budgets', (req, res) => {
    User.findOne({ _id: req.session.user._id })
        .populate('budget')
        .exec(function (err, budgets) {
            if (budgets['budget'].length > 0) {
                const budgetNames = budgets['budget'].map(b => b.name);
                res.render('budgets', { currency: req.session.user.currency, names: budgetNames });
            }
            else {
                res.render('budgets', { currency: req.session.user.currency, nbc: 'No Budgets Created' });
            }

        })
})

app.get('/logout', (req, res) => {
    auth.endAuthenticatedSession(req, (err) => {
        if (!err) {
            res.redirect('/');
        }
        else {
            res.redirect('/home')
        }
    })
})

app.listen(process.env.PORT || 3000);


