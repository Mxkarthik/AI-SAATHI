import React from "react";
import { Building2, Landmark, PiggyBank } from "lucide-react";
import andhraBank from "../assets/andhrabank.png";
const LoanAssistant = () => {
  return (
    <div className="min-h-screen bg-black text-yellow-400 p-6">

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT SIDE */}
        <div className="border border-yellow-500 rounded-xl p-6 bg-[#07150f] shadow-lg">

          <h2 className="text-xl font-semibold mb-6">
            Select Your Bank
          </h2>

          {/* Bank Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

            <div className="border border-yellow-500 rounded-lg p-6 flex flex-col items-center hover:bg-black transition">
            <img
            src={andhraBank}
            alt="Andhra Bank"
            className="w-12 h-12 object-contain"
            />
              <p className="mt-3">Andhra Bank</p>
            </div>

            <div className="border border-yellow-500 rounded-lg p-6 flex flex-col items-center hover:bg-black transition">
              <Building2 size={40} />
              <p className="mt-3">Bank of Baroda</p>
            </div>

            <div className="border border-yellow-500 rounded-lg p-6 flex flex-col items-center hover:bg-black transition">
              <Landmark size={40} />
              <p className="mt-3">Punjab National Bank</p>
            </div>

          </div>

          <p className="mb-4 text-yellow-300">
            Bank Contact
          </p>

          <div className="flex gap-4">

            <button className="bg-yellow-400 text-black px-5 py-2 rounded font-semibold hover:bg-yellow-300">
              🎤 Start Recording
            </button>

            <button className="bg-yellow-400 text-black px-5 py-2 rounded font-semibold hover:bg-yellow-300">
              ▶ Play Response
            </button>

          </div>

        </div>


        {/* RIGHT SIDE */}

        <div className="space-y-6">

          {/* Chat History */}
          <div className="border border-yellow-500 rounded-xl p-4 bg-[#07150f]">
            <h3 className="mb-3 font-semibold">
              Chat History
            </h3>

            <div className="bg-black border border-yellow-500 rounded-lg h-12"></div>
          </div>


          {/* Extracted Data */}

          <div className="border border-yellow-500 rounded-xl p-6 bg-[#07150f]">

            <h3 className="mb-3 font-semibold">
              Extracted Data
            </h3>

            <div className="text-gray-400 text-sm">
              No data extracted yet. Upload an image or use the webcam.
            </div>

          </div>

        </div>

      </div>


      {/* Bottom Section */}

      <div className="grid md:grid-cols-2 gap-6 mt-8">

        {/* Webcam */}
        <div className="border border-yellow-500 rounded-xl p-6 bg-[#07150f]">

          <h3 className="mb-4 font-semibold">
            Capture Using Webcam
          </h3>

          <button className="bg-yellow-400 text-black px-6 py-2 rounded font-semibold hover:bg-yellow-300">
            Show Webcam
          </button>

        </div>


        {/* Upload Document */}

        <div className="border border-yellow-500 rounded-xl p-6 bg-[#07150f]">

          <h3 className="mb-4 font-semibold">
            Upload Document
          </h3>

          <div className="flex items-center gap-3 mb-4">

            <input
              type="file"
              className="bg-black border border-yellow-500 text-white rounded px-2 py-1"
            />

          </div>

          <button className="bg-yellow-400 text-black px-6 py-2 rounded font-semibold hover:bg-yellow-300">
            Upload Document
          </button>

        </div>

      </div>

    </div>
  );
};

export default LoanAssistant;