import React, { useState, useEffect, useRef } from "react";
import { Pencil, Mic, MicOff } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

const BudgetAssistant = () => {

const [expenses,setExpenses] = useState(0);
const [earnings,setEarnings] = useState(0);
const [recording,setRecording] = useState(false);

const recognitionRef = useRef(null);

const [transactions,setTransactions] = useState([]);
const [expenseHistory,setExpenseHistory] = useState([]);
const [earningHistory,setEarningHistory] = useState([]);

const net = earnings - expenses;


const parseTransaction = (text) => {

const lowerText = text.toLowerCase();

let type = "";
let amount = 0;

const expenseWords = [
"expense",
"spent",
"kharche",
"karchu",
"ఖర్చు"
];

const earningWords = [
"earning",
"income",
"earned",
"sampadhana",
"సంపాదన"
];

if(expenseWords.some(word => lowerText.includes(word))){
type = "expense";
}

if(earningWords.some(word => lowerText.includes(word))){
type = "earning";
}

const numberMatch = text.match(/\d+/);

if(numberMatch){
amount = parseInt(numberMatch[0]);
}

if(type && amount > 0){

if(type === "expense"){

setExpenses(prev => prev + amount);

setExpenseHistory(prev => [
...prev,
{
amount,
time:new Date().toLocaleTimeString()
}
]);

}

if(type === "earning"){

setEarnings(prev => prev + amount);

setEarningHistory(prev => [
...prev,
{
amount,
time:new Date().toLocaleTimeString()
}
]);

}

setTransactions(prev => [
...prev,
{
type,
amount,
desc: type === "expense"
? `ఖర్చు ₹${amount}`
: `సంపాదన ₹${amount}`
}
]);

}

};


useEffect(()=>{

if("webkitSpeechRecognition" in window || "SpeechRecognition" in window){

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const rec = new SpeechRecognition();

rec.continuous = false;
rec.interimResults = false;

rec.lang = "te-IN";

rec.onresult = (event)=>{

const speechResult = event.results[0][0].transcript;

parseTransaction(speechResult);

};

rec.onend = ()=>{

setRecording(false);

};

recognitionRef.current = rec;

}

},[]);


const recordTransaction = ()=>{

if(recognitionRef.current && !recording){

setRecording(true);

recognitionRef.current.start();

}

};


const stopRecording = ()=>{

if(recognitionRef.current && recording){

recognitionRef.current.stop();

}

};


const openExpenseHistory = ()=>{

alert(
expenseHistory
.map(e => `₹${e.amount} at ${e.time}`)
.join("\n")
);

};


const openEarningHistory = ()=>{

alert(
earningHistory
.map(e => `₹${e.amount} at ${e.time}`)
.join("\n")
);

};


const chartData = [
{ name:"Expenses", value:expenses },
{ name:"Earnings", value:earnings }
];


return(

<div className="min-h-screen bg-black text-yellow-400 p-6">

<div className="grid lg:grid-cols-3 gap-6">


{/* LEFT PANEL */}

<div className="lg:col-span-2 space-y-6">


{/* TOP PANEL */}

<div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6 shadow-lg">

<div className="grid grid-cols-4 gap-6 items-center">


{/* RECORD BUTTON */}

<div className="flex flex-col items-center">

<p className="text-sm mb-2">Record Transaction</p>

<button
onClick={recording ? stopRecording : recordTransaction}
className="w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center hover:bg-yellow-300"
>

{recording ? <MicOff size={22}/> : <Mic size={22}/>}

</button>

{recording && <p className="text-xs mt-1">Listening...</p>}

</div>


{/* EXPENSE */}

<div className="text-center">

<p className="font-semibold">Expenses</p>

<p className="text-sm mt-2">
Total Expenditure:
</p>

<p className="font-bold">
₹ {expenses}
</p>

</div>


{/* EARNINGS */}

<div className="text-center">

<p className="font-semibold">Earnings</p>

<p className="text-sm mt-2">
Total Earnings:
</p>

<p className="font-bold">
₹ {earnings}
</p>

</div>


{/* NET */}

<div className="text-center">

<p className="font-semibold">Net</p>

<p className="text-sm mt-2">
Profit/Loss:
</p>

<p className="font-bold">
₹ {net}
</p>

</div>

</div>

</div>


{/* TRANSACTION LOG */}

<div className="border border-yellow-500 bg-[#07150f] rounded-xl p-10 h-40 overflow-y-auto">

{transactions.length === 0 ? (

<p className="text-gray-400 text-center">
Transaction records will appear here
</p>

) : (

<div className="space-y-2">

{transactions.map((t,index)=>(
<div key={index} className="text-yellow-400">
{t.desc}
</div>
))}

</div>

)}

</div>


{/* PIE CHART */}

<div className="border border-yellow-500 rounded-xl p-6 flex flex-col items-center">

<p className="mb-4 text-center">Finance Overview</p>

<PieChart width={260} height={260}>

<Pie
data={chartData}
dataKey="value"
cx="50%"
cy="50%"
innerRadius={50}
outerRadius={90}
paddingAngle={4}
>

<Cell fill="#ff4d4d" />   {/* Expenses */}
<Cell fill="#00e676" />   {/* Earnings */}

</Pie>

<Tooltip />

</PieChart>

<div className="flex gap-6 mt-4 text-sm">

<div className="flex items-center gap-2">
<div className="w-3 h-3 bg-red-500 rounded-full"></div>
<span>Expenses</span>
</div>

<div className="flex items-center gap-2">
<div className="w-3 h-3 bg-green-400 rounded-full"></div>
<span>Earnings</span>
</div>

</div>

</div>
</div>


{/* RIGHT PANEL */}

<div className="space-y-6">


{/* EXPENSE HISTORY */}

<div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6 text-center">

<p className="mb-4">
Expense Chat History
</p>

<button
onClick={openExpenseHistory}
className="w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center mx-auto hover:bg-yellow-300"
>

<Pencil size={20}/>

</button>

</div>


{/* EARNING HISTORY */}

<div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6 text-center">

<p className="mb-4">
Earnings Chat History
</p>

<button
onClick={openEarningHistory}
className="w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center mx-auto hover:bg-yellow-300"
>

<Pencil size={20}/>

</button>

</div>

</div>

</div>

</div>

);

};

export default BudgetAssistant;