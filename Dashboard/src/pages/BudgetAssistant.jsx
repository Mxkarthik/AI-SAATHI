import React, { useState } from "react";
import { Pencil } from "lucide-react";

const BudgetAssistant = () => {

const [expenses,setExpenses] = useState(0);
const [earnings,setEarnings] = useState(0);

const net = earnings - expenses;

const recordTransaction = () => {
console.log("Recording transaction...");
};

const openExpenseHistory = () => {
console.log("Opening expense chat history");
};

const openEarningHistory = () => {
console.log("Opening earning chat history");
};

return (

<div className="min-h-screen bg-black text-yellow-400 p-6">

<div className="grid lg:grid-cols-3 gap-6">

{/* LEFT MAIN PANEL */}

<div className="lg:col-span-2 space-y-6">

{/* TOP PANEL */}

<div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6 shadow-lg">

<div className="grid grid-cols-4 gap-6 items-center">

{/* Record Transaction */}

<div className="flex flex-col items-center">

<p className="text-sm mb-2">Record Your Transaction</p>

<button
onClick={recordTransaction}
className="w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center hover:bg-yellow-300"
>
<Pencil size={22}/>
</button>

</div>

{/* Expenses */}

<div className="text-center">

<p className="font-semibold">Expenses</p>

<p className="text-sm mt-2">
Total Expenditure:
</p>

<p className="font-bold">
₹ {expenses}
</p>

</div>

{/* Earnings */}

<div className="text-center">

<p className="font-semibold">Earnings</p>

<p className="text-sm mt-2">
Total Earnings:
</p>

<p className="font-bold">
₹ {earnings}
</p>

</div>

{/* Net */}

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


{/* TRANSACTION AREA */}

<div className="border border-yellow-500 bg-[#07150f] rounded-xl p-10 h-40">

<p className="text-gray-400 text-center">
Transaction records will appear here
</p>

</div>

</div>


{/* RIGHT SIDE */}

<div className="space-y-6">

{/* Expense Chat History */}

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


{/* Earnings Chat History */}

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