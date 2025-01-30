import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";
import UsersRoute from "./route/Overnight/Users.js";
import TransactionOverNight from "./route/Overnight/TransactionOverNight.js";
import Dashboard from "./route/Overnight/Dashboard.js";
import path from "path";

const app = express();

app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "https://dashboard-on.skyparking.online"],
  })
);

const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cookieParser());
app.use(bodyParser.json());
app.use("/api/auth", UsersRoute);
app.use("/api", TransactionOverNight);
app.use("/api", Dashboard);

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
