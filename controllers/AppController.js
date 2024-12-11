import redisClient from '../utils/redis';
import dbClient from '../utils/db';

/**
 * Controller for handling application-level routes.
 */
class AppController {
    /**
     * Returns the status of Redis and MongoDB.
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     */
    static getStatus(req, res) {
        res.status(200).json({
            redis: redisClient.isAlive(),
            db: dbClient.isAlive(),
        });
    }

    /**
     * Returns statistics about users and files in the database.
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     */
    static async getStats(req, res) {
        const users = await dbClient.nbUsers();
        const files = await dbClient.nbFiles();

        res.status(200).json({
            users,
            files,
        });
    }
}

export default AppController;
