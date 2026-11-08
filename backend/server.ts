import { app } from "./app";
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(` Servidor backend escuchando en http://localhost:${PORT}`);
});
