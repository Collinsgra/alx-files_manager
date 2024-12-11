import { MongoClient } from 'mongodb';

/**
 * Represents a MongoDB client.
 */
class DBClient {
    /**
     * Creates a new DBClient instance.
     */
    constructor() {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || '27017';
        const database = process.env.DB_DATABASE || 'files_manager';
        const url = `mongodb://${host}:${port}`;

        this.client = new MongoClient(url, { useUnifiedTopology: true });
        this.database = database;
        
        this.client.connect().catch((err) => {
            console.error('Error connecting to MongoDB:', err);
        });
    }

    /**
     * Checks if the MongoDB client is connected.
     * @returns {boolean} True if the client is connected, false otherwise.
     */
    isAlive() {
        return this.client && this.client.isConnected();
    }

    /**
     * Retrieves the number of documents in the "users" collection.
     * @returns {Promise<number>} The number of documents in the "users" collection.
     */
    async nbUsers() {
        try {
            const db = this.client.db(this.database);
            return await db.collection('users').countDocuments();
        } catch (err) {
            console.error('Error fetching user count:', err);
            return 0;
        }
    }

    /**
     * Retrieves the number of documents in the "files" collection.
     * @returns {Promise<number>} The number of documents in the "files" collection.
     */
    async nbFiles() {
        try {
            const db = this.client.db(this.database);
            return await db.collection('files').countDocuments();
        } catch (err) {
            console.error('Error fetching file count:', err);
            return 0;
        }
    }
}

/**
 * An instance of the DBClient class.
 */
const dbClient = new DBClient();
export default dbClient;
