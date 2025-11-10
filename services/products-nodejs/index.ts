// services/products-nodejs/index.ts
import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';

const app = express();
const port = 8082; // Different port from the users service

app.use(express.json());

// --- MongoDB Connection ---
const mongoHost = process.env.DB_HOST || 'localhost';
const mongoUser = process.env.DB_USER;
const mongoPassword = process.env.DB_PASSWORD;
const dbName = 'products'; // The database name

// Construct the URL with credentials if they exist
const mongoUrl = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:27017/${dbName}?authSource=admin`;

mongoose.connect(mongoUrl)
    .then(() => console.log('Successfully connected to MongoDB!'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

// --- Mongoose Schema & Model for Product ---
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: String,
    stock: { type: Number, default: 0 },
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// --- API Routes ---

// GET all products
app.get('/products', async (req: Request, res: Response) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve products' });
    }
});

// GET a single product by ID
app.get('/products/:id', async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve the product' });
    }
});

// POST a new product
app.post('/products', async (req: Request, res: Response) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create product', details: error });
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Products service starting on port ${port}...`);
});