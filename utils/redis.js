import { promisify } from 'util';
import { createClient } from 'redis';

/**
 * Reps redis cliente.
 */
class RedisClient {
  /**
   * Creates a new Redis instance.
   */
  constructor() {
    this.client = createClient();
    this.isClientConnected = true;
    this.client.on('error', (err) => {
      console.error('Redis client failed to connect:', err.message || err.toString());
      this.isClientConnected = false;
    });
    this.client.on('connect', () => {
      this.isClientConnected = true;
    });
  }

  /**
   * Checks connection to the Redis server is active.
   * @returns {boolean}
   */
  isAlive() {
    return this.isClientConnected;
  }

  /**
   * Retrievesvalue of given key.
   * @param {String} key The key of the item to retrieve.
   * @returns {String | Object}
   */
  async get(key) {
    return promisify(this.client.GET).bind(this.client)(key);
  }

  /**
   * Stores key and its value.
   * @param {String} key The key of the item to store.
   * @param {String | Number | Boolean} value store item
   * @param {Number} duration The expiration time in scs
   * @returns {Promise<void>}
   */
  async set(key, value, duration) {
    await promisify(this.client.SETEX)
      .bind(this.client)(key, duration, value);
  }

  /**
   * Removes the value key.
   * @param {String} key The key item to remove.
   * @returns {Promise<void>}
   */
  async del(key) {
    await promisify(this.client.DEL).bind(this.client)(key);
  }
}

export const redisClient = new RedisClient();
export default redisClient;
