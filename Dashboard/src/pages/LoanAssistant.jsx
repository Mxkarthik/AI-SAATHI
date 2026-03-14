import React, { useState, useRef } from "react";
import { Building2, Landmark, Mic } from "lucide-react";
import andhraBank from "../assets/andhrabank.png";

const LoanAssistant = () => {

const [query,setQuery] = useState("")
const [submitted,setSubmitted] = useState(false)
const recognitionRef = useRef(null)

const startRecording = () => {

const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition

if(!SpeechRecognition){
alert("Speech recognition not supported in this browser")
return
}

const recognition = new SpeechRecognition()

recognition.lang = "te-IN" // Telugu
recognition.continuous = false
recognition.interimResults = false

recognition.onresult = (event) => {

const transcript = event.results[0][0].transcript

setQuery(transcript)
setSubmitted(true)

}

recognition.start()

recognitionRef.current = recognition
}

const handleSubmit = () => {
setSubmitted(true)
}

const sendToWhatsApp = () => {

const message = `
AI-SAATHI Loan Application

Loan Type: Agriculture Tractor Loan
Monthly Income: ₹7000
Suggested Bank: Andhra Bank
Eligible Loan Amount: ₹2L - ₹4L
`

const phone = "919876543210"

const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`

window.open(url,"_blank")
}

return (

<div className="min-h-screen bg-black text-yellow-400 p-6">

<div className="grid lg:grid-cols-2 gap-6">

{/* LEFT */}

<div className="border border-yellow-500 rounded-xl p-6 bg-[#07150f]">

<h2 className="text-xl font-semibold mb-6">
Select Your Bank
</h2>

<div className="grid grid-cols-3 gap-4 mb-6">

<div className="border border-yellow-500 rounded-lg p-6 flex flex-col items-center">

<img
src={andhraBank}
alt="Andhra Bank"
className="w-12 h-12 object-contain"
/>

<p className="mt-3">Andhra Bank</p>

</div>

<div className="border border-yellow-500 rounded-lg p-6 flex flex-col items-center">

<Building2 size={40}/>
<p className="mt-3">Bank of Baroda</p>

</div>

<div className="border border-yellow-500 rounded-lg p-6 flex flex-col items-center">

<Landmark size={40}/>
<p className="mt-3">Punjab National Bank</p>

</div>

</div>

<input
type="text"
placeholder="Ask about loan..."
className="bg-black border border-yellow-500 text-white rounded px-3 py-2 w-full mb-4"
value={query}
onChange={(e)=>setQuery(e.target.value)}
/>

<div className="flex gap-4">

<button
onClick={handleSubmit}
className="bg-yellow-400 text-black px-5 py-2 rounded font-semibold hover:bg-yellow-300"
>

Submit Query

</button>

<button
onClick={startRecording}
className="bg-red-500 text-white px-5 py-2 rounded font-semibold flex items-center gap-2"
>

<Mic size={18}/> Start Recording

</button>

</div>

</div>


{/* RIGHT */}

<div className="space-y-6">

<div className="border border-yellow-500 rounded-xl p-4 bg-[#07150f]">

<h3 className="mb-3 font-semibold">
Chat History
</h3>

<div className="bg-black border border-yellow-500 rounded-lg p-3 text-sm">

{submitted ? query : "No conversation yet"}

</div>

</div>


<div className="border border-yellow-500 rounded-xl p-6 bg-[#07150f]">

<h3 className="mb-3 font-semibold">
Loan Application Result
</h3>

{submitted ? (

<div className="text-white text-sm space-y-2">

<p>Loan Type: Agriculture Tractor Loan</p>

<p>Monthly Income: ₹7000</p>

<p>Suggested Bank: Andhra Bank</p>

<p>Eligible Loan Amount: ₹2L - ₹4L</p>

<button
onClick={sendToWhatsApp}
className="mt-4 bg-green-500 text-white px-5 py-2 rounded font-semibold hover:bg-green-400"
>

Send to Bank on WhatsApp

</button>

</div>

) : (

<div className="text-gray-400 text-sm">
Speak or type a query to see results.
</div>

)}

</div>

</div>

</div>

</div>

)

}

export default LoanAssistant