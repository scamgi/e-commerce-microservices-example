import express from 'express';
import { createProxyMiddleware, type Options } from 'http-proxy-middleware';

const app = express();
const port = 8080; // This will be the main entry point for our app

app.use(express.json());

// --- Define Routes and Proxies for each Microservice ---

// By removing the explicit type annotation, TypeScript can infer the precise shape
// of the object, eliminating the possibility of a property being 'undefined'.
const serviceOptions = {
    users: {
        target: 'http://users-service:8081', // The internal Docker service name
        changeOrigin: true,
        pathRewrite: { '^/api/users': '' }, // Remove the prefix
    },
    products: {
        target: 'http://products-service:8082',
        changeOrigin: true,
        pathRewrite: { '^/api/products': '' },
    },
    inventory: {
        target: 'http://inventory-service:8083',
        changeOrigin: true,
        pathRewrite: { '^/api/inventory': '' },
    },
    cart: {
        target: 'http://cart-service:8084',
        changeOrigin: true,
        pathRewrite: { '^/api/cart': '' },
    },
    orders: {
        target: 'http://orders-service:8085',
        changeOrigin: true,
        pathRewrite: { '^/api/orders': '' },
    },
};

// --- Authentication Middleware (A Simple Example) ---
// This is where you would validate the JWT from the users-service
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // For now, we'll just check for the header.
    // In a real app, you'd decode and verify the JWT here.
    const publicPaths = ['/api/users/register', '/api/users/login', '/api/products'];
    
    if (publicPaths.some(path => req.path.startsWith(path)) || req.method === 'GET') {
         return next(); // Skip auth for public routes (login, register, viewing products)
    }

    if (req.headers.authorization) {
        console.log('Auth header found:', req.headers.authorization);
        // Add JWT verification logic here
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
    }
};

// Apply the authentication middleware to all routes
app.use(authMiddleware);

// --- Create the Proxies ---
app.use('/api/users', createProxyMiddleware(serviceOptions.users));
app.use('/api/products', createProxyMiddleware(serviceOptions.products));
app.use('/api/inventory', createProxyMiddleware(serviceOptions.inventory));
app.use('/api/cart', createProxyMiddleware(serviceOptions.cart));
app.use('/api/orders', createProxyMiddleware(serviceOptions.orders));

// --- Health Check for the Gateway ---
app.get('/health', (req, res) => {
    res.status(200).send('API Gateway is running');
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`API Gateway starting on port ${port}...`);
});