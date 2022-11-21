import './db.mjs'
import express from 'express'
import path from 'path'
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const app = express();
const Wallet = mongoose.model('Wallets');
const Budget = mongoose.model('Budgets');

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


