import { createClient } from 'redis';

class RedisClient {
    constructor() {
        this.client = createClient();
        
        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        this.client.connect().catch((err) => {
            console.error('Error connecting to Redis:', err);
        });
    }

    isAlive() {
        return this.client.isOpen;
    }

    async get(key) {
        try {
            return await this.client.get(key);
        } catch (err) {
            console.error('Error getting key from Redis:', err);
            return null;
        }
    }

    async set(key, value, duration) {
        try {
            await this.client.setEx(key, duration, value);
        } catch (err) {
            console.error('Error setting key in Redis:', err);
        }
    }

    async del(key) {
        try {
            await this.client.del(key);
        } catch (err) {
            console.error('Error deleting key from Redis:', err);
        }
    }
}

const redisClient = new RedisClient();
export default redisClient;
