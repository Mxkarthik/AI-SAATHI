import { useState } from "react";
import {
  Home,
  Newspaper,
  Wallet,
  Banknote,
  TrendingUp,
  Users
} from "lucide-react";

export default function Sidebar() {

  const [active, setActive] = useState("Home");

  const menuItems = [
    { name: "Home", icon: Home },
    { name: "Financial News", icon: Newspaper },
    { name: "Budget Assistant", icon: Wallet },
    { name: "Loan Assistant", icon: Banknote },
    { name: "Investment Assistant", icon: TrendingUp },
    { name: "Community", icon: Users }
  ];

  return (
    <div className="h-screen w-64 bg-gray-950 text-gray-300 flex flex-col border-r border-gray-800">

      {/* Logo / Title */}
{/* Logo / Title */}
<div className="p-6 text-2xl font-extrabold border-b border-gray-800">
  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
    AI SAATHI
  </span>
</div>

      {/* Menu Items */}
      <div className="flex flex-col gap-2 p-4">

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              onClick={() => setActive(item.name)}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200
              
              ${
                active === item.name
                  ? "bg-gray-800 text-yellow-400"
                  : "hover:bg-gray-800 hover:text-white"
              }
              
              `}
            >
              <Icon size={22} />
              <span className="font-medium text-sm">{item.name}</span>
            </button>
          );
        })}

      </div>

    </div>
  );
}