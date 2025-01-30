import dotenv from "dotenv";
import { Sequelize } from "sequelize";
dotenv.config();

const dbUnikas = new Sequelize(
  process.env.DB_NAME_UNIKAS,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
    // timezone: "+07:00",
    pool: {
      max: 5, // Maksimum koneksi yang aktif
      min: 0, // Minimum koneksi yang aktif
      acquire: 30000, // Waktu maksimal (ms) untuk mencoba mendapatkan koneksi sebelum timeout
      idle: 10000, // Waktu (ms) sebelum koneksi idle dilepaskan
    },
  }
);

export default dbUnikas;
