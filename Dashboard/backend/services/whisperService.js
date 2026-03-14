import axios from "axios"

export async function speechToText(audioFile){

const response = await axios.post(
"https://api.whisperapi.com/transcribe",
{
file:audioFile
})

return response.data.text

}