// services/cart-nodejs/index.ts
import express, { type Request, type Response } from 'express';
import { createClient } from 'redis';

const app = express();
const port = 8084; // New port for the cart service

app.use(express.json());

// --- Redis Connection ---
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisClient = createClient({
    url: `redis://${redisHost}:6379`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// --- Helper Function to get cart key ---
const getCartKey = (userId: string): string => `cart:${userId}`;

// --- API Routes ---

// GET /cart/{userId} - Get a user's cart
app.get('/cart/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const cartKey = getCartKey(userId);
        const cart = await redisClient.hGetAll(cartKey);

        if (Object.keys(cart).length === 0) {
            return res.status(200).json({ userId, items: [] });
        }
        
        // Convert the Redis hash map to a more friendly array of items
        const items = Object.entries(cart).map(([productId, quantity]) => ({
            productId,
            quantity: parseInt(quantity, 10)
        }));

        res.status(200).json({ userId, items });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve cart' });
    }
});

// POST /cart/{userId}/items - Add an item to the cart
app.post('/cart/:userId/items', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { productId, quantity } = req.body;

        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'ProductId and a positive quantity are required.' });
        }

        const cartKey = getCartKey(userId);
        // HINCRBY atomically increments the quantity of the product in the user's cart hash
        await redisClient.hIncrBy(cartKey, productId, quantity);

        res.status(200).json({ message: 'Item added to cart.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// DELETE /cart/{userId}/items/{productId} - Remove an item from the cart
app.delete('/cart/:userId/items/:productId', async (req: Request, res: Response) => {
    try {
        const { userId, productId } = req.params;
        const cartKey = getCartKey(userId);
        
        // HDEL removes the product field from the user's cart hash
        const result = await redisClient.hDel(cartKey, productId);

        if (result === 0) {
             return res.status(404).json({ error: 'Item not found in cart.' });
        }

        res.status(200).json({ message: 'Item removed from cart.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});


// --- Start Server ---
const startServer = async () => {
    await redisClient.connect();
    console.log('Successfully connected to Redis!');
    
    app.listen(port, () => {
        console.log(`Cart service starting on port ${port}...`);
    });
};

startServer();