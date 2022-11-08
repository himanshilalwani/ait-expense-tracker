import { mongoose } from 'mongoose'

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
    username: { type: String, required: true },
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

mongoose.connect('mongodb://localhost/final');