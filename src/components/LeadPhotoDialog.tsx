import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface LeadPhotoDialogProps {
  url?: string | null;
  name: string;
}

const LeadPhotoDialog = ({ url, name }: LeadPhotoDialogProps) => {
  if (!url) return <span className="text-muted-foreground">—</span>;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-12 w-12 overflow-hidden p-0" aria-label={`Enlarge ${name}'s selfie`}>
          <img src={url} alt={`${name}'s age-verification selfie`} className="h-full w-full object-cover" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card p-3 sm:p-5">
        <DialogTitle className="flex items-center gap-2 px-1">
          <Camera className="h-5 w-5" />
          {name}
        </DialogTitle>
        <DialogDescription className="sr-only">Enlarged age-verification selfie</DialogDescription>
        <img src={url} alt={`${name}'s enlarged age-verification selfie`} className="max-h-[75vh] w-full rounded-md object-contain" />
      </DialogContent>
    </Dialog>
  );
};

export default LeadPhotoDialog;