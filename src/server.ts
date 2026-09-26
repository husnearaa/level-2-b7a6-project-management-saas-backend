import app from "./app";
import config from "./config";

if (config.NODE_ENV !== "production") {
  app.listen(5000, () => {
    console.log(`Server is running on http://localhost:5000`);
  });
}

export default app;