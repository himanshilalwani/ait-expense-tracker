import { mongoose } from 'mongoose'

// budgets
const Budgets = new mongoose.Schema({
    budgets: Array,
})

// expenses
const Expenses = new mongoose.Schema({
    recent: Object, // recent expenses
    dailyExpenses: Array, // daily expenses, array of objects
    budgetExpenses: Array // array of expenses for a particular budget
})

// wallets
const Wallets = new mongoose.Schema({
    wallets: Object
})

const Users = new mongoose.Schema({
    username: String,
    // hash: // a password hash,
    currecncy: String,
    budget: [Budgets], // reference to a budget object
    expenses: [Expenses], // reference to an expense object
    wallets: [Wallets] // reference to a wallet object
})

mongoose.model('Users', Users);
mongoose.model('Budgets', Budgets);
mongoose.model('Expenses', Expenses);
mongoose.model('Wallets', Wallets);