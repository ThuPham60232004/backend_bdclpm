import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || "",
});

export const saveSession = async (userId, data) => {
  await redis.set(`session:${userId}`, JSON.stringify(data), "EX", 300); 
};

export const getSession = async (userId) => {
  const data = await redis.get(`session:${userId}`);
  return data ? JSON.parse(data) : null;
};

export const deleteSession = async (userId) => {
  await redis.del(`session:${userId}`);
};
