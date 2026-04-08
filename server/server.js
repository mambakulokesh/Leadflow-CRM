const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route files
const auth = require('./routes/authRoutes');
const leads = require('./routes/leadRoutes');
const customers = require('./routes/customerRoutes');
const users = require('./routes/userRoutes');
const roles = require('./routes/roleRoutes');
const dashboard = require('./routes/dashboardRoutes');

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Mount routers
app.use('/api/auth', auth);
app.use('/api/leads', leads);
app.use('/api/customers', customers);
app.use('/api/users', users);
app.use('/api/roles', roles);
app.use('/api/dashboard', dashboard);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to CRM SaaS API' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
