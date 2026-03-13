import React, { useState } from "react";
import { Shield, Scale, Rocket } from "lucide-react";

const InvestmentAssistant = () => {

const [risk,setRisk] = useState("Low");
const [income,setIncome] = useState("");
const [period,setPeriod] = useState("");
const [recording,setRecording] = useState(false);

const startRecording = () => {
setRecording(true);
console.log("Recording started");
};

const stopRecording = () => {
setRecording(false);
console.log("Recording stopped");
};

const savePreferences = () => {
console.log("Saved", {risk,income,period});
};

const getRecommendations = () => {
console.log("Getting investment recommendations");
};

const getSchemeRecommendations = () => {
console.log("Getting government schemes");
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


{/* Risk Cards */}

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


{/* Inputs */}

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


{/* Buttons */}

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

</div>

</div>

</div>
);
};

export default InvestmentAssistant;