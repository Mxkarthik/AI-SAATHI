import { UserRound } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

function getInitials(name) {
  if (!name?.trim()) return "";
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function UserParticipant({ user }) {
  const { t } = useLanguage();
  const displayName = user?.name?.trim() || t("schemeAI", "you");
  const initials = getInitials(user?.name);

  return (
    <article className="flex min-h-[16rem] flex-1 flex-col items-center justify-center rounded-2xl border border-gray-800 bg-[#111827]/90 p-6 text-center sm:min-h-[28rem]" aria-label={t("schemeAI", "userParticipant")}>
      <div className="flex h-28 w-28 items-center justify-center rounded-full border border-gray-700 bg-gray-950 text-3xl font-semibold text-gray-300 sm:h-36 sm:w-36">
        {user?.picture ? <img src={user.picture} alt="" className="h-full w-full rounded-full object-cover" /> : initials || <UserRound className="h-12 w-12 text-gray-500" aria-hidden="true" />}
      </div>
      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{displayName}</p>
      <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-gray-300">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-500" aria-hidden="true" />
        {t("schemeAI", "callConnected")}
      </span>
    </article>
  );
}
