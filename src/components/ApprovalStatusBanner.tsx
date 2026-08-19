import React from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { usePageVideo } from "@/hooks/usePageVideo";

interface ApprovalStatusBannerProps {
  status?: string | null;
  userType?: string | null;
}

const normalize = (status?: string | null) => {
  const s = (status || "pending").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "denied" || s === "not_approved" || s === "rejected") return "denied";
  return "pending";
};

// Only performer accounts go through an approval review
const REQUIRES_APPROVAL = ["stripper", "exotic"];

const ApprovalStatusBanner: React.FC<ApprovalStatusBannerProps> = ({ status, userType }) => {
  const state = normalize(status);
  const { videoUrl: approvedVideo } = usePageVideo("approval_approved");
  const { videoUrl: deniedVideo } = usePageVideo("approval_denied");

  if (!REQUIRES_APPROVAL.includes((userType || "").toLowerCase())) return null;


  const config = {
    pending: {
      label: "Pending Approval",
      description: "Your application is being reviewed by our team.",
      Icon: Clock,
      wrapper: "border-amber-400/50 bg-amber-500/10",
      text: "text-amber-300",
      video: null as string | null,
    },
    approved: {
      label: "Approved",
      description: "Congratulations — your application has been approved.",
      Icon: CheckCircle2,
      wrapper: "border-emerald-400/50 bg-emerald-500/10",
      text: "text-emerald-300",
      video: approvedVideo,
    },
    denied: {
      label: "Application Denied",
      description: "Your application was not approved at this time.",
      Icon: XCircle,
      wrapper: "border-red-400/50 bg-red-500/10",
      text: "text-red-300",
      video: deniedVideo,
    },
  }[state];

  const { Icon } = config;

  return (
    <div className={`w-full rounded-xl border ${config.wrapper} px-4 py-4 sm:px-6 mb-6`}>
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
        <Icon className={`h-6 w-6 shrink-0 ${config.text}`} aria-hidden="true" />
        <div>
          <p className={`text-lg font-semibold tracking-wide sm:text-xl ${config.text}`}>
            {config.label}
          </p>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {config.video && (
        <div className="mt-4 overflow-hidden rounded-lg bg-black/40">
          import React from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { usePageVideo } from "@/hooks/usePageVideo";

interface ApprovalStatusBannerProps {
  status?: string | null;
  userType?: string | null;
}

const normalize = (status?: string | null) => {
  const s = (status || "pending").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "denied" || s === "not_approved" || s === "rejected") return "denied";
  return "pending";
};

// Only performer accounts go through an approval review
const REQUIRES_APPROVAL = ["stripper", "exotic"];

const ApprovalStatusBanner: React.FC<ApprovalStatusBannerProps> = ({ status, userType }) => {
  const state = normalize(status);
  const { videoUrl: approvedVideo } = usePageVideo("approval_approved");
  const { videoUrl: deniedVideo } = usePageVideo("approval_denied");

  if (!REQUIRES_APPROVAL.includes((userType || "").toLowerCase())) return null;


  const config = {
    pending: {
      label: "Pending Approval",
      description: "Your application is being reviewed by our team.",
      Icon: Clock,
      wrapper: "border-amber-400/50 bg-amber-500/10",
      text: "text-amber-300",
      video: null as string | null,
    },
    approved: {
      label: "Approved",
      description: "Congratulations — your application has been approved.",
      Icon: CheckCircle2,
      wrapper: "border-emerald-400/50 bg-emerald-500/10",
      text: "text-emerald-300",
      video: approvedVideo,
    },
    denied: {
      label: "Application Denied",
      description: "Your application was not approved at this time.",
      Icon: XCircle,
      wrapper: "border-red-400/50 bg-red-500/10",
      text: "text-red-300",
      video: deniedVideo,
    },
  }[state];

  const { Icon } = config;

  return (
    <div className={`w-full rounded-xl border ${config.wrapper} px-4 py-4 sm:px-6 mb-6`}>
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
        <Icon className={`h-6 w-6 shrink-0 ${config.text}`} aria-hidden="true" />
        <div>
          <p className={`text-lg font-semibold tracking-wide sm:text-xl ${config.text}`}>
            {config.label}
          </p>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {config.video && (
        <div className="mt-4 overflow-hidden rounded-lg bg-black/40">
          <video
            key={config.video}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full object-contain"
           controlsList="nodownload" disablePictureInPicture disableRemotePlayback>
            <source src={config.video} />
          </video>
        </div>
      )}
    </div>
  );
};

export default ApprovalStatusBanner;

            <source src={config.video} />
          </video>
        </div>
      )}
    </div>
  );
};

export default ApprovalStatusBanner;
