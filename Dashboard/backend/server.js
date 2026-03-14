import express from "express"
import aiRoute from "./routes/aiRoute.js"

const app = express()

app.use(express.json())

app.use("/api", aiRoute)

app.listen(5000,()=>{
console.log("Server running")
})