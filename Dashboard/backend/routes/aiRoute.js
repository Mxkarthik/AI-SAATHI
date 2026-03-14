import express from "express"
import { speechToText } from "../services/whisperService.js"

const router = express.Router()

router.post("/voice", async (req,res)=>{

const audioFile = req.body.audio

const text = await speechToText(audioFile)

res.json({
text:text
})

})

export default router