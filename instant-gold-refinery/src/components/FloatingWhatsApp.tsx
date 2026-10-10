import { WhatsAppIcon } from "./Icons";
import { site, whatsappLink } from "@/lib/site";

export default function FloatingWhatsApp() {
  return (
    <a
      href={whatsappLink(`Hello ${site.name}!`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with ${site.name} on WhatsApp`}
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-[#25D366] p-4 text-white shadow-[0_10px_40px_-6px_#25D366] transition hover:scale-105 sm:bottom-8 sm:right-8"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-30" />
      <WhatsAppIcon className="h-7 w-7" />
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap font-semibold transition-all duration-500 group-hover:max-w-40 sm:inline">
        Chat with us
      </span>
    </a>
  );
}
