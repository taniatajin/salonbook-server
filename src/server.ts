import app from "./app";
import { getDb } from "./config/db";
import { ensureIndexes } from "./config/indexes";

const port = process.env.PORT || 5000;

getDb()
  .then(async () => {
    await ensureIndexes();
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });