import { useSearchParams } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";

const ReferrerProfile = () => {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");

  return (
    <section id="referrer-section" className="py-16 bg-background">
      <div className="container mx-auto px-4 text-center">
        {ref ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-28 h-28 rounded-full border-2 border-primary overflow-hidden">
              <img src={defaultAvatar} alt={`@${ref} profile`} className="w-full h-full object-cover" />
            </div>
            <p className="text-xl font-semibold text-foreground">@{ref}</p>
            <p className="text-muted-foreground text-sm">invited you to join Dimes Only Network</p>
          </div>
        ) : (
          <h2 className="text-4xl md:text-5xl font-black tracking-wider text-foreground">
            DIMES ONLY WORLD
          </h2>
        )}
      </div>
    </section>
  );
};

export default ReferrerProfile;
