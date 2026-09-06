import React, { useState } from "react";
import { Shield, Scale, Rocket } from "lucide-react";

const InvestmentAssistant = () => {

const [risk,setRisk] = useState("Low");
const [income,setIncome] = useState("");
const [period,setPeriod] = useState("");
const [recording,setRecording] = useState(false);

const [responses,setResponses] = useState([]);

const startRecording = () => {
setRecording(true);
console.log("Recording started");

// Fake AI questions + answers
setResponses([
{
question: "Where should I invest if I have low risk?",
answer: "You can invest in Fixed Deposits, Public Provident Fund (PPF), or Post Office Saving Schemes. These options provide stable returns and are safe for beginners."
},
{
question: "Are there any government schemes for small investors?",
answer: "Yes. You can consider schemes like Pradhan Mantri Jan Dhan Yojana, Sukanya Samriddhi Yojana, and Atal Pension Yojana which are designed for small investors."
}
]);

};

const stopRecording = () => {
setRecording(false);
console.log("Recording stopped");
};

const savePreferences = () => {
console.log("Saved", {risk,income,period});
};

const getRecommendations = () => {

setResponses([
{
question: "What is the best low risk investment?",
answer: "Public Provident Fund (PPF) and Fixed Deposits are good low-risk investments with guaranteed returns."
},
{
question: "How can I start investing with small income?",
answer: "You can start SIP in mutual funds with as low as ₹500 per month or invest in government schemes."
}
]);

};

const getSchemeRecommendations = () => {

setResponses([
{
question: "Which government scheme is good for farmers?",
answer: "PM Kisan Samman Nidhi provides ₹6000 per year financial support to eligible farmers."
},
{
question: "Which scheme helps with retirement savings?",
answer: "Atal Pension Yojana helps individuals save for retirement with guaranteed pension benefits."
}
]);

};

return (

<div className="min-h-screen bg-black text-yellow-400 p-6">

<h1 className="text-2xl font-semibold mb-6">
Micro Investment & Government Scheme Recommendations
</h1>

<div className="grid lg:grid-cols-2 gap-6">

{/* LEFT SECTION */}

<div className="border border-yellow-500 bg-[#07150f] p-6 rounded-xl shadow-lg">

<h2 className="mb-4 font-semibold">
Micro Investment Suggestions
</h2>

<p className="mb-3 text-sm text-yellow-300">
Risk Level
</p>

<div className="grid grid-cols-3 gap-4 mb-6">

<div
onClick={()=>setRisk("Low")}
className={`p-4 rounded-lg border cursor-pointer flex flex-col items-center
${risk==="Low" ? "bg-yellow-400 text-black border-yellow-400" : "border-yellow-500 hover:bg-black"}
`}
>
<Shield size={30}/>
<p className="mt-2 font-semibold">Low Risk</p>
<p className="text-xs">Safe & Steady</p>
</div>

<div
onClick={()=>setRisk("Medium")}
className={`p-4 rounded-lg border cursor-pointer flex flex-col items-center
${risk==="Medium" ? "bg-yellow-400 text-black border-yellow-400" : "border-yellow-500 hover:bg-black"}
`}
>
<Scale size={30}/>
<p className="mt-2 font-semibold">Medium Risk</p>
<p className="text-xs">Balanced Growth</p>
</div>

<div
onClick={()=>setRisk("High")}
className={`p-4 rounded-lg border cursor-pointer flex flex-col items-center
${risk==="High" ? "bg-yellow-400 text-black border-yellow-400" : "border-yellow-500 hover:bg-black"}
`}
>
<Rocket size={30}/>
<p className="mt-2 font-semibold">High Risk</p>
<p className="text-xs">Maximum Returns</p>
</div>

</div>

<div className="grid md:grid-cols-2 gap-4 mb-4">

<div>
<p className="text-sm mb-1">Investment Income (INR)</p>
<input
value={income}
onChange={(e)=>setIncome(e.target.value)}
placeholder="Enter your monthly income"
className="w-full bg-black border border-yellow-500 rounded p-2 text-white"
/>
</div>

<div>
<p className="text-sm mb-1">Investment Period (years)</p>
<input
value={period}
onChange={(e)=>setPeriod(e.target.value)}
placeholder="Enter investment duration"
className="w-full bg-black border border-yellow-500 rounded p-2 text-white"
/>
</div>

</div>

<div className="grid grid-cols-2 gap-4">

<button
onClick={startRecording}
className="bg-yellow-400 text-black py-2 rounded font-semibold hover:bg-yellow-300"
>
🎤 Start Recording
</button>

<button
onClick={savePreferences}
className="bg-yellow-400 text-black py-2 rounded font-semibold hover:bg-yellow-300"
>
Save Preferences
</button>

</div>

<button
onClick={getRecommendations}
className="mt-4 w-full bg-yellow-400 text-black py-2 rounded font-semibold hover:bg-yellow-300"
>
Get Investment Recommendations
</button>

</div>

{/* RIGHT SECTION */}

<div className="border border-yellow-500 bg-[#07150f] p-6 rounded-xl shadow-lg">

<h2 className="mb-4 font-semibold">
Government Scheme Recommendations
</h2>

<div className="grid grid-cols-2 gap-4 mb-4">

<button
onClick={startRecording}
className="bg-yellow-400 text-black py-2 rounded font-semibold hover:bg-yellow-300"
>
🎤 Start Recording
</button>

<button
onClick={stopRecording}
className="bg-red-500 text-white py-2 rounded font-semibold hover:bg-red-400"
>
⏹ Stop Recording
</button>

</div>

<button
onClick={getSchemeRecommendations}
className="w-full bg-yellow-400 text-black py-2 rounded font-semibold hover:bg-yellow-300"
>
Get Scheme Recommendation
</button>

{/* Fake AI Responses */}

<div className="mt-6 space-y-4">

{responses.map((item,index)=>(
<div key={index} className="border border-yellow-500 p-4 rounded-lg bg-black">

<p className="font-semibold text-yellow-300">
🎤 User: {item.question}
</p>

<p className="mt-2 text-white">
🤖 AI SAATHI: {item.answer}
</p>

</div>
))}

</div>

</div>

</div>

</div>

);
};

export default InvestmentAssistant;