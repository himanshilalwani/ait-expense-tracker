import { mongoose } from 'mongoose'
import fs from 'fs';
import path from 'path';
import url from 'url';

// budgets
const BudgetSchema = new mongoose.Schema({
    budgets: Array,
})

// expenses
const ExpenseSchema = new mongoose.Schema({
    recent: Object, // recent expenses
    dailyExpenses: Array, // daily expenses, array of objects
    budgetExpenses: Array // array of expenses for a particular budget
})

// wallets
const WalletSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true }
})

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String },
    currency: String,
    budget: { type: mongoose.Schema.Types.ObjectId, ref: 'Budgets' }, // reference to a budget object
    expenses: { type: mongoose.Schema.Types.ObjectId, ref: 'Expenses' }, // reference to an expense object
    wallets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Wallets' }] // reference to a wallet object
})

mongoose.model('Users', UserSchema);
mongoose.model('Budgets', BudgetSchema);
mongoose.model('Expenses', ExpenseSchema);
mongoose.model('Wallets', WalletSchema);

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
let dbconf;
if (process.env.NODE_ENV === 'PRODUCTION') {
    // if we're in PRODUCTION mode, then read the configration from a file
    // use blocking file io to do this...
    const fn = path.join(__dirname, 'config.json');
    const data = fs.readFileSync(fn);

    // our configuration file will be in json, so parse it and set the
    // conenction string appropriately!
    const conf = JSON.parse(data);
    dbconf = conf.dbconf;
} else {
    // if we're not in PRODUCTION mode, then use
    dbconf = 'mongodb://localhost/hl3937';
}

mongoose.connect(dbconf);