import './db.mjs'
import express from 'express'
import path from 'path'
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const app = express();
const Wallet = mongoose.model('Wallets');

app.set('view engine', 'hbs');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: false }));

// app.use(session({
//     secret: 'keyboard cat',
//     resave: false,
//     saveUninitialized: true,
// }));

app.get('/wallet/add', (req, res) => {
    res.render('add-wallet');
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

app.listen(process.env.PORT || 3000);


