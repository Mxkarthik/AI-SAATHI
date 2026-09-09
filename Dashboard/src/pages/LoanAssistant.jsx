import React, { useState, useRef, useEffect } from "react";
import { Building2, Landmark, Mic } from "lucide-react";
import andhraBank from "../assets/andhrabank.png";
import { useLanguage } from "../i18n/LanguageContext";
import { getLoanSummary } from "../utils/transactionApi";
import { uploadLoanDocumentForOcr } from "../utils/transactionApi";
import {
	BANKS,
	LOAN_TYPES,
	documentRequirementNotice,
	getDocumentRequirements,
} from "../utils/documentRequirements";

const LoanAssistant = () => {

const formatCurrency = (amount) => `₹${Math.round(amount ?? 0).toLocaleString("en-IN")}`

const { t } = useLanguage();
const [query,setQuery] = useState("")
const [submitted,setSubmitted] = useState(false)
const [financialData,setFinancialData] = useState(null)
const [selectedBank, setSelectedBank] = useState(BANKS.andhraBank.id)
const [selectedLoanType, setSelectedLoanType] = useState(LOAN_TYPES.agricultureTractor.id)
const [documentUploads, setDocumentUploads] = useState({})
const [reviewConfirmed, setReviewConfirmed] = useState(false)
const recognitionRef = useRef(null)

const selectedBankName = BANKS[selectedBank].name
const selectedLoanTypeName = LOAN_TYPES[selectedLoanType].name
const documentRequirements = getDocumentRequirements(selectedBank, selectedLoanType)
const documentReviewRequired = Object.values(documentUploads).some((upload) =>
	upload.status === "success" || upload.status === "unclear"
)

const handleDocumentUpload = async (documentId, file) => {
	if (!file) return

	setReviewConfirmed(false)
	setDocumentUploads((current) => ({
		...current,
		[documentId]: { fileName: file.name, status: "processing" },
	}))

	try {
		const result = await uploadLoanDocumentForOcr(documentId, file)
		setDocumentUploads((current) => ({
			...current,
			[documentId]: { fileName: file.name, ...result },
		}))
	} catch (error) {
		setDocumentUploads((current) => ({
			...current,
			[documentId]: { fileName: file.name, status: "failure", message: error.message },
		}))
	}
}

useEffect(() => {
	let active = true

	getLoanSummary()
		.then((data) => {
			if (active) setFinancialData(data)
		})
		.catch((error) => {
			console.error("Failed to load loan financial data:", error)
		})

	return () => {
		active = false
	}
}, [])

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

Loan Type: ${selectedLoanTypeName}
Monthly Income: ₹${Math.round(financialData?.monthlyIncome ?? 0)}
Suggested Bank: ${selectedBankName}
Recommended Loan Range: ${formatCurrency(financialData?.suggestedLoanAmount?.min)} - ${formatCurrency(financialData?.suggestedLoanAmount?.max)}
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
{t("loanAssistant", "selectBank")}
</h2>

<div className="grid grid-cols-3 gap-4 mb-6">

<div
onClick={() => setSelectedBank(BANKS.andhraBank.id)}
className="border border-yellow-500 rounded-lg p-6 flex flex-col items-center cursor-pointer"
>

<img
src={andhraBank}
alt="Andhra Bank"
className="w-12 h-12 object-contain"
/>

<p className="mt-3">Andhra Bank</p>

</div>

<div
onClick={() => setSelectedBank(BANKS.bankOfBaroda.id)}
className="border border-yellow-500 rounded-lg p-6 flex flex-col items-center cursor-pointer"
>

<Building2 size={40}/>
<p className="mt-3">Bank of Baroda</p>

</div>

<div
onClick={() => setSelectedBank(BANKS.punjabNationalBank.id)}
className="border border-yellow-500 rounded-lg p-6 flex flex-col items-center cursor-pointer"
>

<Landmark size={40}/>
<p className="mt-3">Punjab National Bank</p>

</div>

</div>

<select
value={selectedLoanType}
onChange={(e) => setSelectedLoanType(e.target.value)}
className="bg-black border border-yellow-500 text-white rounded px-3 py-2 w-full mb-4"
>
{Object.values(LOAN_TYPES).map((loanType) => (
<option key={loanType.id} value={loanType.id}>{loanType.name}</option>
))}
</select>

<input
type="text"
placeholder={t("loanAssistant", "askPlaceholder")}
className="bg-black border border-yellow-500 text-white rounded px-3 py-2 w-full mb-4"
value={query}
onChange={(e)=>setQuery(e.target.value)}
/>

<div className="flex gap-4">

<button
onClick={handleSubmit}
className="bg-yellow-400 text-black px-5 py-2 rounded font-semibold hover:bg-yellow-300"
>

{t("loanAssistant", "submitQuery")}

</button>

<button
onClick={startRecording}
className="bg-red-500 text-white px-5 py-2 rounded font-semibold flex items-center gap-2"
>

<Mic size={18}/> {t("loanAssistant", "startRecording")}

</button>

</div>

</div>


{/* RIGHT */}

<div className="space-y-6">

<div className="border border-yellow-500 rounded-xl p-4 bg-[#07150f]">

<h3 className="mb-3 font-semibold">
{t("loanAssistant", "chatHistory")}
</h3>

<div className="bg-black border border-yellow-500 rounded-lg p-3 text-sm">

{submitted ? query : t("loanAssistant", "noConversation")}

</div>

</div>


<div className="border border-yellow-500 rounded-xl p-6 bg-[#07150f]">

<h3 className="mb-3 font-semibold">
Loan Application Result
</h3>

{submitted ? (

<div className="text-white text-sm space-y-2">

<p>Loan Type: {selectedLoanTypeName}</p>

<p>Total Earnings: {formatCurrency(financialData?.totalEarnings)}</p>

<p>Total Expenditure: {formatCurrency(financialData?.totalExpenditure)}</p>

<p>Net Balance: {formatCurrency(financialData?.netBalance)}</p>

<p>Monthly Income: {formatCurrency(financialData?.monthlyIncome)}</p>

<p>Monthly Expenditure: {formatCurrency(financialData?.monthlyExpenditure)}</p>

<p>Disposable Income: {formatCurrency(financialData?.disposableIncome)}</p>

<p>Suggested Affordable EMI: {formatCurrency(financialData?.suggestedEmi?.min)} - {formatCurrency(financialData?.suggestedEmi?.max)}</p>

<p>Estimated Repayment Capacity: {formatCurrency(financialData?.estimatedRepaymentCapacity)} per month</p>

<p>Recommended Loan Range: {formatCurrency(financialData?.suggestedLoanAmount?.min)} - {formatCurrency(financialData?.suggestedLoanAmount?.max)}</p>

<p>Suggested Repayment Period: {financialData?.suggestedRepaymentPeriod?.min ?? 12} - {financialData?.suggestedRepaymentPeriod?.max ?? 36} months</p>

<p>Based on {financialData?.transactionHistoryMonths ?? 0} month(s) of transaction history</p>

<p>Suggested Bank: {selectedBankName}</p>

<div className="pt-2">
<p>Application Document Checklist</p>
{documentRequirements.map((document) => (
<div key={document.id} className="pt-1">
<p>- {document.category}: {document.description}</p>
<input
type="file"
accept="image/jpeg,image/png,image/webp"
className="bg-black border border-yellow-500 text-white rounded px-3 py-2 w-full"
onChange={(event) => handleDocumentUpload(document.id, event.target.files?.[0])}
/>
{documentUploads[document.id] && (
<div className="text-gray-300">
<p>OCR status: {documentUploads[document.id].status}</p>
{documentUploads[document.id].fileName && <p>File: {documentUploads[document.id].fileName}</p>}
{documentUploads[document.id].message && <p>{documentUploads[document.id].message}</p>}
{documentUploads[document.id].fields && Object.entries(documentUploads[document.id].fields).map(([field, value]) => (
<p key={field}>{field}: {value}</p>
))}
</div>
)}
</div>
))}
<p className="text-yellow-300">{documentRequirementNotice}</p>
{documentReviewRequired && (
<label className="flex items-start gap-2 pt-2">
<input
type="checkbox"
checked={reviewConfirmed}
onChange={(event) => setReviewConfirmed(event.target.checked)}
/>
<span>I reviewed the extracted information and confirm it is ready for the application workflow.</span>
</label>
)}
</div>

<p className="text-yellow-300">Financial guidance only. This is not loan approval or eligibility confirmation.</p>

<button
onClick={sendToWhatsApp}
disabled={documentReviewRequired && !reviewConfirmed}
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